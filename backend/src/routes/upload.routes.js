const express = require('express');
const router = express.Router();
const { uploadService } = require('../services');
const { authMiddleware, ApiError } = require('../middlewares');

// All routes require authentication
router.use(authMiddleware);

// Upload general image
router.post(
  '/image',
  uploadService.upload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ApiError(400, 'No image file provided');
      }

      const result = await uploadService.uploadToCloudinary(req.file.buffer);

      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Upload avatar
router.post(
  '/avatar',
  uploadService.upload.single('avatar'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ApiError(400, 'No avatar file provided');
      }

      const result = await uploadService.uploadAvatar(req.file.buffer);

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Upload character image
router.post(
  '/character',
  uploadService.upload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ApiError(400, 'No image file provided');
      }

      const result = await uploadService.uploadCharacterImage(req.file.buffer);

      res.json({
        success: true,
        message: 'Character image uploaded successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Upload map background
router.post(
  '/map',
  uploadService.upload.single('background'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ApiError(400, 'No background file provided');
      }

      const result = await uploadService.uploadMapBackground(req.file.buffer);

      res.json({
        success: true,
        message: 'Map background uploaded successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete image
router.delete('/:publicId', async (req, res, next) => {
  try {
    const { publicId } = req.params;

    // Reconstruct full publicId (with folder path)
    const fullPublicId = decodeURIComponent(publicId);

    await uploadService.deleteFromCloudinary(fullPublicId);

    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
