const { authMiddleware, optionalAuthMiddleware } = require('./auth');
const {
  campaignAccessMiddleware,
  dmOnlyMiddleware,
  ownerOnlyMiddleware,
} = require('./rbac');
const { validate } = require('./validation');
const { ApiError, notFoundHandler, errorHandler } = require('./errorHandler');

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  campaignAccessMiddleware,
  dmOnlyMiddleware,
  ownerOnlyMiddleware,
  validate,
  ApiError,
  notFoundHandler,
  errorHandler,
};
