const jwt = require('jsonwebtoken');
const { User, Follow, Campaign } = require('../models');
const { jwtConfig } = require('../config');
const { ApiError } = require('../middlewares');

/**
 * Auth controller.
 *
 * Implements the user-facing authentication and profile flows:
 *   - register / login / refresh / logout
 *   - getMe / updateProfile / changePassword / deleteAccount
 *   - searchUsers (with privacy gating)
 *   - getPublicProfile (with DM-of-player exception for private profiles)
 *
 * Tokens: a short-lived access token (default 15m) and a long-lived
 * refresh token (default 7d). Refresh tokens are stored on the user
 * document so they can be revoked on logout/password-change.
 */

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, jwtConfig.jwtSecret, {
    expiresIn: jwtConfig.jwtExpiresIn,
  });
  const refreshToken = jwt.sign({ userId }, jwtConfig.jwtRefreshSecret, {
    expiresIn: jwtConfig.jwtRefreshExpiresIn,
  });
  return { accessToken, refreshToken };
};

const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      throw new ApiError(
        400,
        existingUser.email === email
          ? 'Email already registered'
          : 'Username already taken'
      );
    }

    const user = await User.create({ username, email, password });

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user: user.toJSON(), accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { identifier, email, password } = req.body;
    // Accept either `identifier` (email or username) or `email` for compatibility.
    const lookup = identifier || email;
    if (!lookup) throw new ApiError(400, 'Email or username is required');

    const user = await User.findOne({
      $or: [{ email: lookup.toLowerCase() }, { username: lookup }],
    }).select('+password');

    if (!user) throw new ApiError(401, 'Invalid credentials');

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) throw new ApiError(401, 'Invalid credentials');

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: user.toJSON(), accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) throw new ApiError(400, 'Refresh token is required');

    const decoded = jwt.verify(token, jwtConfig.jwtRefreshSecret);
    const user = await User.findById(decoded.userId).select('+refreshToken');

    if (!user || user.refreshToken !== token) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: tokens,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Refresh token expired'));
    }
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) throw new ApiError(404, 'User not found');
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { username, avatar, description, isPrivate } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) throw new ApiError(404, 'User not found');

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) throw new ApiError(400, 'Username already taken');
      user.username = username;
    }
    if (avatar !== undefined) user.avatar = avatar;
    if (description !== undefined) user.description = description;
    if (isPrivate !== undefined) user.isPrivate = !!isPrivate;

    await user.save();
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');
    if (!user) throw new ApiError(404, 'User not found');

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) throw new ApiError(401, 'Current password is incorrect');

    user.password = newPassword;
    await user.save();

    // Re-issue tokens after a password change so old tokens can't be used.
    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
      data: tokens,
    });
  } catch (error) {
    next(error);
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id).select('+password');
    if (!user) throw new ApiError(404, 'User not found');

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) throw new ApiError(401, 'Password is incorrect');

    // Cascade: drop follow edges and orphan-delete owned campaigns.
    await Follow.deleteMany({
      $or: [{ follower: req.user.id }, { followed: req.user.id }],
    });
    await Campaign.deleteMany({ ownerId: req.user.id });
    await User.findByIdAndDelete(req.user.id);

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Search users.
 *
 * Excludes private users (`isPrivate: true`) UNLESS the requester is a
 * DM/co-DM in a campaign in which the target is a player. That exception
 * lets a DM still discover their own player base even after privacy is on.
 */
const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ success: true, data: { users: [] } });
    }

    // Pre-compute the set of players in campaigns where the requester is
    // DM/co-DM. Those users can be returned regardless of `isPrivate`.
    const myCampaigns = await Campaign.find({
      'members.userId': req.user.id,
      $or: [
        { 'members.role': 'dm' },
        { 'members.role': 'co-dm' },
      ],
    }).select('members');
    const myPlayersSet = new Set();
    for (const c of myCampaigns) {
      const me = c.members.find(
        (m) => m.userId.toString() === req.user.id.toString()
      );
      if (me && (me.role === 'dm' || me.role === 'co-dm')) {
        for (const m of c.members) {
          if (m.role === 'player') myPlayersSet.add(m.userId.toString());
        }
      }
    }
    const myPlayerIds = Array.from(myPlayersSet);

    const users = await User.find({
      _id: { $ne: req.user.id },
      $and: [
        {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
          ],
        },
        {
          $or: [
            { isPrivate: { $ne: true } },
            { _id: { $in: myPlayerIds } },
          ],
        },
      ],
    })
      .select('username email avatar description isPrivate')
      .limit(20);

    res.json({ success: true, data: { users } });
  } catch (error) {
    next(error);
  }
};

/**
 * Public profile lookup.
 *
 * Returns the target user's profile if:
 *   - The profile is public, or
 *   - The viewer is the target themselves, or
 *   - The viewer is a DM/co-DM of a campaign in which the target is a player.
 *
 * Otherwise returns 403 with `code: 'PRIVATE_PROFILE'` so the UI can
 * render the "private profile" screen.
 */
const getPublicProfile = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) throw new ApiError(404, 'User not found');

    const viewerId = req.user ? req.user.id.toString() : null;
    const targetId = target._id.toString();

    let canView = !target.isPrivate;
    if (!canView && viewerId === targetId) canView = true;
    if (!canView && viewerId) {
      // DM-of-player exception.
      const dmCampaign = await Campaign.findOne({
        members: {
          $all: [
            { $elemMatch: { userId: viewerId, role: { $in: ['dm', 'co-dm'] } } },
            { $elemMatch: { userId: target._id, role: 'player' } },
          ],
        },
      });
      if (dmCampaign) canView = true;
    }

    if (!canView) {
      return res.status(403).json({
        success: false,
        code: 'PRIVATE_PROFILE',
        message: 'This profile is private',
        data: { user: { id: target._id, username: target.username, isPrivate: true } },
      });
    }

    res.json({ success: true, data: { user: target } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
  searchUsers,
  getPublicProfile,
};
