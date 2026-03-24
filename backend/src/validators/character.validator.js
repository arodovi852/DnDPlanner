const { body, param } = require('express-validator');

const alignments = [
  'Lawful Good',
  'Neutral Good',
  'Chaotic Good',
  'Lawful Neutral',
  'True Neutral',
  'Chaotic Neutral',
  'Lawful Evil',
  'Neutral Evil',
  'Chaotic Evil',
  'Unaligned',
];

const createCharacterValidation = [
  param('campaignId').isMongoId().withMessage('Invalid campaign ID'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),

  body('race')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Race cannot exceed 50 characters'),

  body('class')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Class cannot exceed 50 characters'),

  body('subclass')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Subclass cannot exceed 50 characters'),

  body('level')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Level must be between 1 and 20'),

  body('alignment')
    .optional()
    .isIn(alignments)
    .withMessage(`Alignment must be one of: ${alignments.join(', ')}`),

  body('stats.strength')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Strength must be between 1 and 30'),

  body('stats.dexterity')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Dexterity must be between 1 and 30'),

  body('stats.constitution')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Constitution must be between 1 and 30'),

  body('stats.intelligence')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Intelligence must be between 1 and 30'),

  body('stats.wisdom')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Wisdom must be between 1 and 30'),

  body('stats.charisma')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Charisma must be between 1 and 30'),

  body('isNPC')
    .optional()
    .isBoolean()
    .withMessage('isNPC must be a boolean'),

  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),

  body('backstory')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Backstory cannot exceed 5000 characters'),
];

const updateCharacterValidation = [
  param('id').isMongoId().withMessage('Invalid character ID'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),

  body('race')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Race cannot exceed 50 characters'),

  body('class')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Class cannot exceed 50 characters'),

  body('level')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Level must be between 1 and 20'),

  body('alignment')
    .optional()
    .isIn(alignments)
    .withMessage(`Alignment must be one of: ${alignments.join(', ')}`),

  body('stats')
    .optional()
    .isObject()
    .withMessage('Stats must be an object'),

  body('combatStats')
    .optional()
    .isObject()
    .withMessage('Combat stats must be an object'),

  body('isVisible')
    .optional()
    .isBoolean()
    .withMessage('isVisible must be a boolean'),
];

const characterIdValidation = [
  param('id').isMongoId().withMessage('Invalid character ID'),
];

module.exports = {
  createCharacterValidation,
  updateCharacterValidation,
  characterIdValidation,
};
