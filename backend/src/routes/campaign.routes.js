const express = require('express');
const router = express.Router();
const { campaignController } = require('../controllers');
const {
  authMiddleware,
  campaignAccessMiddleware,
  validate,
} = require('../middlewares');
const {
  createCampaignValidation,
  updateCampaignValidation,
  shareCampaignValidation,
  campaignIdValidation,
} = require('../validators');

// All routes require authentication
router.use(authMiddleware);

// Get template campaigns (public templates)
router.get('/templates', campaignController.getTemplateCampaigns);

// Campaign CRUD
router.get('/', campaignController.getCampaigns);
router.post('/', createCampaignValidation, validate, campaignController.createCampaign);

// Routes with campaign ID
router.get(
  '/:id',
  campaignIdValidation,
  validate,
  campaignController.getCampaign
);

router.put(
  '/:id',
  updateCampaignValidation,
  validate,
  campaignAccessMiddleware,
  campaignController.updateCampaign
);

router.delete(
  '/:id',
  campaignIdValidation,
  validate,
  campaignAccessMiddleware,
  campaignController.deleteCampaign
);

// Sharing routes
router.post(
  '/:id/share',
  shareCampaignValidation,
  validate,
  campaignAccessMiddleware,
  campaignController.shareCampaign
);

router.put(
  '/:id/permissions',
  campaignIdValidation,
  validate,
  campaignAccessMiddleware,
  campaignController.updatePermissions
);

router.delete(
  '/:id/users/:userId',
  campaignIdValidation,
  validate,
  campaignAccessMiddleware,
  campaignController.removeUser
);

module.exports = router;
