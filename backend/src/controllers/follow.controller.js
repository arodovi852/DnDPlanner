const { Follow, User } = require('../models');
const { ApiError } = require('../middlewares');

/**
 * Follow controller.
 *
 * Handles the social-graph endpoints (follow / unfollow / list followers
 * / list following). All write operations are scoped to the authenticated
 * user — you can only modify your own follow edges.
 */

/**
 * Follow another user.
 *
 * Idempotent: returning the existing edge when the user already follows the
 * target avoids the noisy 409 from the unique-index error and matches what
 * the UI expects (a follow button that "settles" on the followed state).
 */
const followUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === req.user.id.toString()) {
      throw new ApiError(400, 'You cannot follow yourself');
    }
    const target = await User.findById(id);
    if (!target) throw new ApiError(404, 'User not found');

    const existing = await Follow.findOne({
      follower: req.user.id,
      followed: id,
    });
    if (existing) {
      return res.json({
        success: true,
        message: 'Already following',
        data: { follow: existing },
      });
    }
    const follow = await Follow.create({
      follower: req.user.id,
      followed: id,
    });
    res.status(201).json({
      success: true,
      message: 'Followed successfully',
      data: { follow },
    });
  } catch (error) {
    next(error);
  }
};

const unfollowUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Follow.deleteOne({ follower: req.user.id, followed: id });
    res.json({ success: true, message: 'Unfollowed successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * List the users the current user follows.
 * Optionally accepts `?userId=` to inspect another user's following list.
 */
const getFollowing = async (req, res, next) => {
  try {
    const userId = req.query.userId || req.user.id;
    const edges = await Follow.find({ follower: userId }).populate(
      'followed',
      'username avatar description isPrivate'
    );
    res.json({
      success: true,
      data: { users: edges.map((e) => e.followed).filter(Boolean) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List the followers of a user (current user by default).
 */
const getFollowers = async (req, res, next) => {
  try {
    const userId = req.query.userId || req.user.id;
    const edges = await Follow.find({ followed: userId }).populate(
      'follower',
      'username avatar description isPrivate'
    );
    res.json({
      success: true,
      data: { users: edges.map((e) => e.follower).filter(Boolean) },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
};
