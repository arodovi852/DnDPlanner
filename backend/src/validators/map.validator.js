const { body, param } = require('express-validator');

const gridThemes = [
  'dungeon',
  'forest',
  'desert',
  'snow',
  'underwater',
  'castle',
  'cave',
  'custom',
];

const createMapValidation = [
  param('campaignId').isMongoId().withMessage('Invalid campaign ID'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('gridConfig.cellSize')
    .optional()
    .isInt({ min: 20, max: 100 })
    .withMessage('Cell size must be between 20 and 100'),

  body('gridConfig.shape')
    .optional()
    .isIn(['square', 'hexagon'])
    .withMessage('Shape must be square or hexagon'),

  body('gridConfig.theme')
    .optional()
    .isIn(gridThemes)
    .withMessage(`Theme must be one of: ${gridThemes.join(', ')}`),

  body('gridConfig.showGrid')
    .optional()
    .isBoolean()
    .withMessage('showGrid must be a boolean'),

  body('dimensions.width')
    .optional()
    .isInt({ min: 5, max: 100 })
    .withMessage('Width must be between 5 and 100'),

  body('dimensions.height')
    .optional()
    .isInt({ min: 5, max: 100 })
    .withMessage('Height must be between 5 and 100'),

  body('isVisible')
    .optional()
    .isBoolean()
    .withMessage('isVisible must be a boolean'),
];

const updateMapValidation = [
  param('id').isMongoId().withMessage('Invalid map ID'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('gridConfig.cellSize')
    .optional()
    .isInt({ min: 20, max: 100 })
    .withMessage('Cell size must be between 20 and 100'),

  body('gridConfig.shape')
    .optional()
    .isIn(['square', 'hexagon'])
    .withMessage('Shape must be square or hexagon'),

  body('gridConfig.theme')
    .optional()
    .isIn(gridThemes)
    .withMessage(`Theme must be one of: ${gridThemes.join(', ')}`),

  body('blocks')
    .optional()
    .isArray()
    .withMessage('Blocks must be an array'),

  body('isVisible')
    .optional()
    .isBoolean()
    .withMessage('isVisible must be a boolean'),
];

const mapIdValidation = [param('id').isMongoId().withMessage('Invalid map ID')];

module.exports = {
  createMapValidation,
  updateMapValidation,
  mapIdValidation,
};
