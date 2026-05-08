const { Campaign } = require('../models');

/**
 * Role-based access control middleware.
 *
 * `campaignAccessMiddleware` loads the campaign by id (from `req.params.id`
 * or `req.params.campaignId`), verifies the requester has access (owner
 * or member), and attaches `req.campaign` and `req.userRole` for the
 * downstream handler. Unauthorized requests get a 403 / 404 immediately.
 */

const campaignAccessMiddleware = async (req, res, next) => {
  try {
    const campaignId = req.params.campaignId || req.params.id;
    if (!campaignId) {
      return res.status(400).json({
        success: false,
        message: 'Campaign ID is required.',
      });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found.',
      });
    }

    if (!campaign.hasAccess(req.user.id) && campaign.visibility !== 'public') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have access to this campaign.',
      });
    }

    req.campaign = campaign;
    req.userRole = campaign.getMemberRole(req.user.id);
    next();
  } catch (error) {
    next(error);
  }
};

/** Route guard: only DM and co-DM proceed. */
const dmOnlyMiddleware = (req, res, next) => {
  if (req.userRole !== 'dm' && req.userRole !== 'co-dm') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only the DM or co-DM can perform this action.',
    });
  }
  next();
};

/** Route guard: only the campaign owner proceeds. */
const ownerOnlyMiddleware = (req, res, next) => {
  if (String(req.campaign.ownerId) !== String(req.user.id)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only the owner can perform this action.',
    });
  }
  next();
};

module.exports = {
  campaignAccessMiddleware,
  dmOnlyMiddleware,
  ownerOnlyMiddleware,
};
