const express = require('express');
const router = express.Router();
const { chapterController } = require('../controllers');
const { authMiddleware, validate } = require('../middlewares');
const {
  createChapterValidation,
  updateChapterValidation,
  chapterIdValidation,
} = require('../validators');

// All routes require authentication
router.use(authMiddleware);

// Chapters by campaign
router.get('/campaign/:campaignId', chapterController.getChapters);
router.post(
  '/campaign/:campaignId',
  createChapterValidation,
  validate,
  chapterController.createChapter
);
router.put(
  '/campaign/:campaignId/reorder',
  chapterController.reorderChapters
);

// Single chapter operations
router.get('/:id', chapterIdValidation, validate, chapterController.getChapter);
router.put(
  '/:id',
  updateChapterValidation,
  validate,
  chapterController.updateChapter
);
router.delete(
  '/:id',
  chapterIdValidation,
  validate,
  chapterController.deleteChapter
);
router.patch(
  '/:id/visibility',
  chapterIdValidation,
  validate,
  chapterController.toggleVisibility
);

module.exports = router;
