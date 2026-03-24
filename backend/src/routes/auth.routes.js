const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const { authMiddleware, validate } = require('../middlewares');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
} = require('../validators');

// Public routes
router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.use(authMiddleware);

router.post('/logout', authController.logout);
router.get('/me', authController.getMe);
router.put('/me', updateProfileValidation, validate, authController.updateProfile);
router.put(
  '/change-password',
  changePasswordValidation,
  validate,
  authController.changePassword
);
router.delete('/account', authController.deleteAccount);
router.get('/users/search', authController.searchUsers);

module.exports = router;
