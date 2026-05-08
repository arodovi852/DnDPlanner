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
  campaignIdValidation,
} = require('../validators');

/**
 * @openapi
 * tags:
 *   name: Campaigns
 *   description: Campaign CRUD, sharing, members, tokens and clone.
 */

router.use(authMiddleware);

// --- Public templates listing -------------------------------------------
/**
 * @openapi
 * /campaigns/public:
 *   get:
 *     summary: Public campaigns (templates)
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/public', campaignController.getPublicCampaigns);

// --- Token lookups ------------------------------------------------------
// These come BEFORE `/:id` so the static segment doesn't get parsed as id.

/**
 * @openapi
 * /campaigns/by-share-token/{token}:
 *   get:
 *     summary: Look up a campaign by its share token
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *   post:
 *     summary: Accept a share invitation (join as player)
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 */
router.get('/by-share-token/:token', campaignController.getByShareToken);
router.post('/by-share-token/:token/join', campaignController.acceptInvite);

/**
 * @openapi
 * /campaigns/by-view-token/{token}:
 *   get:
 *     summary: Read-only view of a campaign by its view token
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 */
router.get('/by-view-token/:token', campaignController.getByViewToken);

// --- CRUD ---------------------------------------------------------------
/**
 * @openapi
 * /campaigns:
 *   get:
 *     summary: List campaigns the current user owns or belongs to
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: Create a campaign (current user becomes DM)
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/', campaignController.getCampaigns);
router.post(
  '/',
  createCampaignValidation,
  validate,
  campaignController.createCampaign
);

/**
 * @openapi
 * /campaigns/{id}:
 *   get:
 *     summary: Read a campaign
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     summary: Update a campaign (DM/co-DM only)
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Delete a campaign (owner only)
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 */
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

// --- Tokens (per-campaign) ----------------------------------------------
router.post(
  '/:id/share-token',
  campaignIdValidation,
  validate,
  campaignAccessMiddleware,
  campaignController.generateShareToken
);
router.delete(
  '/:id/share-token',
  campaignIdValidation,
  validate,
  campaignAccessMiddleware,
  campaignController.revokeShareToken
);
router.post(
  '/:id/view-token',
  campaignIdValidation,
  validate,
  campaignAccessMiddleware,
  campaignController.generateViewToken
);
router.delete(
  '/:id/view-token',
  campaignIdValidation,
  validate,
  campaignAccessMiddleware,
  campaignController.revokeViewToken
);

// --- Clone --------------------------------------------------------------
/**
 * @openapi
 * /campaigns/{id}/clone:
 *   post:
 *     summary: Clone a campaign as the current user (deep copy, new owner)
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/:id/clone',
  campaignIdValidation,
  validate,
  campaignController.cloneCampaign
);

// --- Members ------------------------------------------------------------
router.post(
  '/:id/members',
  campaignIdValidation,
  validate,
  campaignAccessMiddleware,
  campaignController.addMember
);
router.put(
  '/:id/members/:userId',
  campaignIdValidation,
  validate,
  campaignAccessMiddleware,
  campaignController.updateMember
);
router.delete(
  '/:id/members/:userId',
  campaignIdValidation,
  validate,
  campaignAccessMiddleware,
  campaignController.removeMember
);

module.exports = router;
