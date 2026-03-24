const express = require('express');
const router = express.Router();
const { mapController } = require('../controllers');
const { authMiddleware, validate } = require('../middlewares');
const {
  createMapValidation,
  updateMapValidation,
  mapIdValidation,
} = require('../validators');

// All routes require authentication
router.use(authMiddleware);

// Maps by campaign
router.get('/campaign/:campaignId', mapController.getMaps);
router.post(
  '/campaign/:campaignId',
  createMapValidation,
  validate,
  mapController.createMap
);

// Single map operations
router.get('/:id', mapIdValidation, validate, mapController.getMap);
router.put('/:id', updateMapValidation, validate, mapController.updateMap);
router.delete('/:id', mapIdValidation, validate, mapController.deleteMap);
router.patch(
  '/:id/visibility',
  mapIdValidation,
  validate,
  mapController.toggleVisibility
);

// Block operations
router.put('/:id/blocks', mapIdValidation, validate, mapController.updateBlocks);
router.post('/:id/blocks', mapIdValidation, validate, mapController.addBlock);
router.delete(
  '/:id/blocks/:blockId',
  mapIdValidation,
  validate,
  mapController.removeBlock
);

module.exports = router;
