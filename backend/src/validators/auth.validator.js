const { body, oneOf } = require('express-validator');

/**
 * Validators for the `/api/auth` routes.
 *
 * These are lightweight wrappers around express-validator that the routes
 * compose with the `validate` middleware. Validators only perform shape
 * checks; the controller is still responsible for business rules
 * (uniqueness, identity, etc.).
 */

const registerValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

// Accept either `identifier` (email or username) or `email` for backwards
// compatibility — the controller normalises this.
const loginValidation = [
  oneOf(
    [
      body('identifier').trim().notEmpty(),
      body('email').trim().notEmpty(),
    ],
    'Email or username is required'
  ),
  body('password').notEmpty().withMessage('Password is required'),
];

const updateProfileValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  // Avatar can be a remote URL or a data URL (base64). Validate as string
  // with a max length to avoid abuse.
  body('avatar')
    .optional({ nullable: true })
    .isString()
    .withMessage('Avatar must be a string')
    .isLength({ max: 2_000_000 })
    .withMessage('Avatar payload too large'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
];

module.exports = {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
};
