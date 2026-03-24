const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { jwtConfig } = require('../config');
const { ApiError } = require('../middlewares');

// Generate tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, jwtConfig.jwtSecret, {
    expiresIn: jwtConfig.jwtExpiresIn,
  });

  const refreshToken = jwt.sign({ userId }, jwtConfig.jwtRefreshSecret, {
    expiresIn: jwtConfig.jwtRefreshExpiresIn,
  });

  return { accessToken, refreshToken };
};

// Register new user
const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      throw new ApiError(
        400,
        existingUser.email === email
          ? 'Email already registered'
          : 'Username already taken'
      );
    }

    // Create user
    const user = await User.create({ username, email, password });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Login user
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Refresh token
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      throw new ApiError(400, 'Refresh token is required');
    }

    // Verify refresh token
    const decoded = jwt.verify(token, jwtConfig.jwtRefreshSecret);

    // Find user
    const user = await User.findById(decoded.userId).select('+refreshToken');

    if (!user || user.refreshToken !== token) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    // Generate new tokens
    const tokens = generateTokens(user._id);

    // Save new refresh token
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

// Logout
const logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get current user
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// Update profile
const updateProfile = async (req, res, next) => {
  try {
    const { username, avatar } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check if username is taken
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        throw new ApiError(400, 'Username already taken');
      }
      user.username = username;
    }

    if (avatar !== undefined) {
      user.avatar = avatar;
    }

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

// Change password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check current password
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new tokens
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

// Delete account (RGPD - Right to be forgotten)
const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      throw new ApiError(401, 'Password is incorrect');
    }

    // Delete user and all associated data
    // TODO: Add cascade delete for campaigns, characters, etc.
    await User.findByIdAndDelete(req.user.id);

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Search users (for sharing campaigns)
const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: { users: [] },
      });
    }

    const users = await User.find({
      _id: { $ne: req.user.id },
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    })
      .select('username email avatar')
      .limit(10);

    res.json({
      success: true,
      data: { users },
    });
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
};
