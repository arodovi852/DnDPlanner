const { body, param } = require('express-validator');

const createChapterValidation = [
  param('campaignId').isMongoId().withMessage('Invalid campaign ID'),

  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a positive integer'),

  body('isVisible')
    .optional()
    .isBoolean()
    .withMessage('isVisible must be a boolean'),
];

const updateChapterValidation = [
  param('id').isMongoId().withMessage('Invalid chapter ID'),

  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a positive integer'),

  body('isVisible')
    .optional()
    .isBoolean()
    .withMessage('isVisible must be a boolean'),
];

const chapterIdValidation = [
  param('id').isMongoId().withMessage('Invalid chapter ID'),
];

module.exports = {
  createChapterValidation,
  updateChapterValidation,
  chapterIdValidation,
};
