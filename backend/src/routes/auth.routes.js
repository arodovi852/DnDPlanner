const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const {
  authMiddleware,
  optionalAuthMiddleware,
  validate,
} = require('../middlewares');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
} = require('../validators');

/**
 * @openapi
 * tags:
 *   name: Auth
 *   description: Registration, login, token refresh and profile.
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username: { type: string }
 *               email:    { type: string, format: email }
 *               password: { type: string, format: password, minLength: 6 }
 *     responses:
 *       201:
 *         description: User created. Returns access + refresh tokens.
 *       400:
 *         description: Validation error or duplicated email/username.
 */
router.post('/register', registerValidation, validate, authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Authenticate with username/email + password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               identifier: { type: string, description: Username or email }
 *               email:      { type: string, format: email }
 *               password:   { type: string, format: password }
 *     responses:
 *       200: { description: Login successful. Returns tokens. }
 *       401: { description: Invalid credentials. }
 */
router.post('/login', loginValidation, validate, authController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Exchange a refresh token for a new pair
 *     tags: [Auth]
 */
router.post('/refresh', authController.refreshToken);

// User search MUST be declared before the parametric `/users/:id` route
// so that "search" isn't captured as an id.
/**
 * @openapi
 * /auth/users/search:
 *   get:
 *     summary: Search users by username or email
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string, minLength: 2 }
 */
router.get('/users/search', authMiddleware, authController.searchUsers);

// Public profile lookup. Uses optional auth so the privacy-gate can grant
// the DM-of-player exception when the viewer is logged in.
/**
 * @openapi
 * /auth/users/{id}:
 *   get:
 *     summary: Public profile of another user
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User found and visible. }
 *       403: { description: Profile is private to the viewer. }
 *       404: { description: User not found. }
 */
router.get('/users/:id', optionalAuthMiddleware, authController.getPublicProfile);

// Routes below require a valid access token.
router.use(authMiddleware);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Revoke the current refresh token
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/logout', authController.logout);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get the current authenticated user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     summary: Update the current user's profile
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/me', authController.getMe);
router.put('/me', updateProfileValidation, validate, authController.updateProfile);

/**
 * @openapi
 * /auth/change-password:
 *   put:
 *     summary: Change the password of the current user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  '/change-password',
  changePasswordValidation,
  validate,
  authController.changePassword
);

/**
 * @openapi
 * /auth/account:
 *   delete:
 *     summary: Delete the current account (RGPD-style erase)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/account', authController.deleteAccount);

module.exports = router;
