const express = require('express');
const router = express.Router();
const { eventController } = require('../controllers');
const { authMiddleware, validate } = require('../middlewares');
const {
  createEventValidation,
  updateEventValidation,
  eventIdValidation,
} = require('../validators');

// All routes require authentication
router.use(authMiddleware);

// Events by chapter
router.get('/chapter/:chapterId', eventController.getEvents);
router.post(
  '/chapter/:chapterId',
  createEventValidation,
  validate,
  eventController.createEvent
);
router.put('/chapter/:chapterId/reorder', eventController.reorderEvents);

// Single event operations
router.get('/:id', eventIdValidation, validate, eventController.getEvent);
router.put('/:id', updateEventValidation, validate, eventController.updateEvent);
router.delete('/:id', eventIdValidation, validate, eventController.deleteEvent);
router.patch(
  '/:id/visibility',
  eventIdValidation,
  validate,
  eventController.toggleVisibility
);

module.exports = router;
