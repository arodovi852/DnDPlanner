const { body, param } = require('express-validator');

const eventTypes = [
  'Mission',
  'Combat',
  'MainStory',
  'CharacterArc',
  'Exploration',
  'Social',
  'Rest',
  'Other',
];

const createEventValidation = [
  param('chapterId').isMongoId().withMessage('Invalid chapter ID'),

  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),

  body('type')
    .optional()
    .isIn(eventTypes)
    .withMessage(`Type must be one of: ${eventTypes.join(', ')}`),

  body('mode')
    .optional()
    .isIn(['notes', 'canvas'])
    .withMessage('Mode must be notes or canvas'),

  body('content')
    .optional()
    .isLength({ max: 50000 })
    .withMessage('Content cannot exceed 50000 characters'),

  body('canvasData')
    .optional()
    .isObject()
    .withMessage('Canvas data must be an object'),

  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a positive integer'),

  body('isVisible')
    .optional()
    .isBoolean()
    .withMessage('isVisible must be a boolean'),
];

const updateEventValidation = [
  param('id').isMongoId().withMessage('Invalid event ID'),

  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),

  body('type')
    .optional()
    .isIn(eventTypes)
    .withMessage(`Type must be one of: ${eventTypes.join(', ')}`),

  body('mode')
    .optional()
    .isIn(['notes', 'canvas'])
    .withMessage('Mode must be notes or canvas'),

  body('content')
    .optional()
    .isLength({ max: 50000 })
    .withMessage('Content cannot exceed 50000 characters'),

  body('canvasData')
    .optional()
    .isObject()
    .withMessage('Canvas data must be an object'),

  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a positive integer'),

  body('isVisible')
    .optional()
    .isBoolean()
    .withMessage('isVisible must be a boolean'),
];

const eventIdValidation = [
  param('id').isMongoId().withMessage('Invalid event ID'),
];

module.exports = {
  createEventValidation,
  updateEventValidation,
  eventIdValidation,
};
