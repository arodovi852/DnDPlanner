const { Campaign } = require('../models');

// Check if user has access to campaign
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

    const hasAccess = campaign.hasAccess(req.user.id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have access to this campaign.',
      });
    }

    req.campaign = campaign;
    req.userRole = campaign.getUserRole(req.user.id);

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

// Check if user is DM of campaign
const dmOnlyMiddleware = (req, res, next) => {
  if (req.userRole !== 'DM') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only the DM can perform this action.',
    });
  }
  next();
};

// Check if user is owner of campaign
const ownerOnlyMiddleware = (req, res, next) => {
  if (req.campaign.createdBy.toString() !== req.user.id.toString()) {
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
