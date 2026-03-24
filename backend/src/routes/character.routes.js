const express = require('express');
const router = express.Router();
const { characterController } = require('../controllers');
const { authMiddleware, validate } = require('../middlewares');
const {
  createCharacterValidation,
  updateCharacterValidation,
  characterIdValidation,
} = require('../validators');

// All routes require authentication
router.use(authMiddleware);

// Characters by campaign
router.get('/campaign/:campaignId', characterController.getCharacters);
router.post(
  '/campaign/:campaignId',
  createCharacterValidation,
  validate,
  characterController.createCharacter
);

// Single character operations
router.get('/:id', characterIdValidation, validate, characterController.getCharacter);
router.put(
  '/:id',
  updateCharacterValidation,
  validate,
  characterController.updateCharacter
);
router.delete(
  '/:id',
  characterIdValidation,
  validate,
  characterController.deleteCharacter
);
router.patch(
  '/:id/visibility',
  characterIdValidation,
  validate,
  characterController.toggleVisibility
);

// Combat stats (for real-time combat)
router.patch(
  '/:id/combat-stats',
  characterIdValidation,
  validate,
  characterController.updateCombatStats
);

module.exports = router;
