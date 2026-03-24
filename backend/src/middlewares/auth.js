const jwt = require('jsonwebtoken');
const { jwtConfig } = require('../config');
const { User } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, jwtConfig.jwtSecret);

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
      });
    }

    req.user = {
      id: user._id,
      username: user.username,
      email: user.email,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

// Optional auth - doesn't fail if no token, but attaches user if present
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtConfig.jwtSecret);
    const user = await User.findById(decoded.userId);

    req.user = user
      ? {
          id: user._id,
          username: user.username,
          email: user.email,
        }
      : null;

    next();
  } catch {
    req.user = null;
    next();
  }
};

module.exports = { authMiddleware, optionalAuthMiddleware };
