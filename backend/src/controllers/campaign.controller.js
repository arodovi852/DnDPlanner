const { Campaign, Chapter, Character, Map } = require('../models');
const { ApiError } = require('../middlewares');

// Get all campaigns for user
const getCampaigns = async (req, res, next) => {
  try {
    const campaigns = await Campaign.find({
      $or: [{ createdBy: req.user.id }, { 'sharedWith.userId': req.user.id }],
    })
      .populate('createdBy', 'username avatar')
      .populate('sharedWith.userId', 'username avatar')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: { campaigns },
    });
  } catch (error) {
    next(error);
  }
};

// Get single campaign
const getCampaign = async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('createdBy', 'username avatar')
      .populate('sharedWith.userId', 'username avatar')
      .populate({
        path: 'chapters',
        options: { sort: { order: 1 } },
      })
      .populate('characters')
      .populate('maps');

    if (!campaign) {
      throw new ApiError(404, 'Campaign not found');
    }

    // Check access
    if (!campaign.hasAccess(req.user.id)) {
      throw new ApiError(403, 'Access denied');
    }

    const userRole = campaign.getUserRole(req.user.id);

    // Filter visibility for players
    let responseData = campaign.toObject();

    if (userRole === 'Player') {
      responseData.chapters = responseData.chapters?.filter(
        (ch) => ch.isVisible || ch.visibleTo?.includes(req.user.id)
      );
      responseData.characters = responseData.characters?.filter(
        (c) => c.isVisible || c.visibleTo?.includes(req.user.id) || c.createdBy.toString() === req.user.id.toString()
      );
      responseData.maps = responseData.maps?.filter(
        (m) => m.isVisible || m.visibleTo?.includes(req.user.id)
      );
    }

    res.json({
      success: true,
      data: {
        campaign: responseData,
        userRole,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create campaign
const createCampaign = async (req, res, next) => {
  try {
    const { title, description, coverImage, visibility, settings, templateId } =
      req.body;

    let campaignData = {
      title,
      description,
      coverImage,
      visibility,
      settings,
      createdBy: req.user.id,
    };

    // If creating from template
    if (templateId) {
      const template = await Campaign.findById(templateId);

      if (!template || !template.isTemplate) {
        throw new ApiError(404, 'Template not found');
      }

      campaignData.templateSource = templateId;
      // Could copy chapters and events from template here
    }

    const campaign = await Campaign.create(campaignData);

    const populatedCampaign = await Campaign.findById(campaign._id).populate(
      'createdBy',
      'username avatar'
    );

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: { campaign: populatedCampaign },
    });
  } catch (error) {
    next(error);
  }
};

// Update campaign
const updateCampaign = async (req, res, next) => {
  try {
    const { title, description, coverImage, visibility, settings } = req.body;

    // Only owner can update campaign settings
    if (req.campaign.createdBy.toString() !== req.user.id.toString()) {
      throw new ApiError(403, 'Only the owner can update campaign settings');
    }

    const updatedCampaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        coverImage,
        visibility,
        settings,
      },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'username avatar')
      .populate('sharedWith.userId', 'username avatar');

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: { campaign: updatedCampaign },
    });
  } catch (error) {
    next(error);
  }
};

// Delete campaign
const deleteCampaign = async (req, res, next) => {
  try {
    // Only owner can delete
    if (req.campaign.createdBy.toString() !== req.user.id.toString()) {
      throw new ApiError(403, 'Only the owner can delete the campaign');
    }

    // Delete associated data
    await Chapter.deleteMany({ campaignId: req.params.id });
    await Character.deleteMany({ campaignId: req.params.id });
    await Map.deleteMany({ campaignId: req.params.id });

    await Campaign.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Share campaign with user
const shareCampaign = async (req, res, next) => {
  try {
    const { userId, role = 'Player' } = req.body;

    // Only owner can share
    if (req.campaign.createdBy.toString() !== req.user.id.toString()) {
      throw new ApiError(403, 'Only the owner can share the campaign');
    }

    // Check if user is already shared with
    const alreadyShared = req.campaign.sharedWith.some(
      (s) => s.userId.toString() === userId
    );

    if (alreadyShared) {
      throw new ApiError(400, 'Campaign already shared with this user');
    }

    req.campaign.sharedWith.push({ userId, role });
    req.campaign.visibility = 'shared';
    await req.campaign.save();

    const updatedCampaign = await Campaign.findById(req.params.id)
      .populate('createdBy', 'username avatar')
      .populate('sharedWith.userId', 'username avatar');

    res.json({
      success: true,
      message: 'Campaign shared successfully',
      data: { campaign: updatedCampaign },
    });
  } catch (error) {
    next(error);
  }
};

// Update user permissions
const updatePermissions = async (req, res, next) => {
  try {
    const { userId, role } = req.body;

    // Only owner can update permissions
    if (req.campaign.createdBy.toString() !== req.user.id.toString()) {
      throw new ApiError(403, 'Only the owner can update permissions');
    }

    const sharedUser = req.campaign.sharedWith.find(
      (s) => s.userId.toString() === userId
    );

    if (!sharedUser) {
      throw new ApiError(404, 'User not found in shared list');
    }

    sharedUser.role = role;
    await req.campaign.save();

    const updatedCampaign = await Campaign.findById(req.params.id)
      .populate('createdBy', 'username avatar')
      .populate('sharedWith.userId', 'username avatar');

    res.json({
      success: true,
      message: 'Permissions updated successfully',
      data: { campaign: updatedCampaign },
    });
  } catch (error) {
    next(error);
  }
};

// Remove user from campaign
const removeUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Owner can remove anyone, or user can remove themselves
    if (
      req.campaign.createdBy.toString() !== req.user.id.toString() &&
      userId !== req.user.id.toString()
    ) {
      throw new ApiError(403, 'Access denied');
    }

    req.campaign.sharedWith = req.campaign.sharedWith.filter(
      (s) => s.userId.toString() !== userId
    );

    if (req.campaign.sharedWith.length === 0) {
      req.campaign.visibility = 'private';
    }

    await req.campaign.save();

    const updatedCampaign = await Campaign.findById(req.params.id)
      .populate('createdBy', 'username avatar')
      .populate('sharedWith.userId', 'username avatar');

    res.json({
      success: true,
      message: 'User removed from campaign',
      data: { campaign: updatedCampaign },
    });
  } catch (error) {
    next(error);
  }
};

// Get public/template campaigns
const getTemplateCampaigns = async (req, res, next) => {
  try {
    const templates = await Campaign.find({ isTemplate: true })
      .populate('createdBy', 'username avatar')
      .select('title description coverImage settings createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { templates },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  shareCampaign,
  updatePermissions,
  removeUser,
  getTemplateCampaigns,
};
