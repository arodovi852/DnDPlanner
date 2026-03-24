const { body, param } = require('express-validator');

const createCampaignValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),

  body('visibility')
    .optional()
    .isIn(['private', 'shared', 'public'])
    .withMessage('Visibility must be private, shared, or public'),

  body('settings.gameSystem')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Game system cannot exceed 50 characters'),

  body('settings.language')
    .optional()
    .isIn(['es', 'en'])
    .withMessage('Language must be es or en'),
];

const updateCampaignValidation = [
  param('id').isMongoId().withMessage('Invalid campaign ID'),
  ...createCampaignValidation,
];

const shareCampaignValidation = [
  param('id').isMongoId().withMessage('Invalid campaign ID'),

  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),

  body('role')
    .optional()
    .isIn(['DM', 'Player'])
    .withMessage('Role must be DM or Player'),
];

const campaignIdValidation = [
  param('id').isMongoId().withMessage('Invalid campaign ID'),
];

module.exports = {
  createCampaignValidation,
  updateCampaignValidation,
  shareCampaignValidation,
  campaignIdValidation,
};
