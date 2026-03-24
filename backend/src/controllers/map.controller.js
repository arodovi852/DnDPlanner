const { Map, Campaign } = require('../models');
const { ApiError } = require('../middlewares');

// Get maps by campaign
const getMaps = async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);

    if (!campaign) {
      throw new ApiError(404, 'Campaign not found');
    }

    if (!campaign.hasAccess(req.user.id)) {
      throw new ApiError(403, 'Access denied');
    }

    const userRole = campaign.getUserRole(req.user.id);

    let query = { campaignId: req.params.campaignId };

    // Filter visibility for players
    if (userRole === 'Player') {
      query.$or = [{ isVisible: true }, { visibleTo: req.user.id }];
    }

    const maps = await Map.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { maps },
    });
  } catch (error) {
    next(error);
  }
};

// Get single map
const getMap = async (req, res, next) => {
  try {
    const map = await Map.findById(req.params.id);

    if (!map) {
      throw new ApiError(404, 'Map not found');
    }

    const campaign = await Campaign.findById(map.campaignId);

    if (!campaign || !campaign.hasAccess(req.user.id)) {
      throw new ApiError(403, 'Access denied');
    }

    const userRole = campaign.getUserRole(req.user.id);

    // Check visibility for players
    if (userRole === 'Player' && !map.isVisibleToUser(req.user.id, userRole)) {
      throw new ApiError(403, 'This map is not visible to you');
    }

    // Filter fog of war for players
    let responseMap = map.toObject();
    if (userRole === 'Player' && responseMap.fogOfWar?.enabled) {
      // Only show revealed cells
      // Logic for fog of war filtering would go here
    }

    res.json({
      success: true,
      data: { map: responseMap, userRole },
    });
  } catch (error) {
    next(error);
  }
};

// Create map
const createMap = async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);

    if (!campaign) {
      throw new ApiError(404, 'Campaign not found');
    }

    if (campaign.getUserRole(req.user.id) !== 'DM') {
      throw new ApiError(403, 'Only the DM can create maps');
    }

    const { name, description, gridConfig, dimensions, backgroundImage, isVisible } =
      req.body;

    const map = await Map.create({
      campaignId: req.params.campaignId,
      name,
      description,
      gridConfig,
      dimensions,
      backgroundImage,
      isVisible: isVisible || false,
    });

    res.status(201).json({
      success: true,
      message: 'Map created successfully',
      data: { map },
    });
  } catch (error) {
    next(error);
  }
};

// Update map
const updateMap = async (req, res, next) => {
  try {
    const map = await Map.findById(req.params.id);

    if (!map) {
      throw new ApiError(404, 'Map not found');
    }

    const campaign = await Campaign.findById(map.campaignId);

    if (!campaign || campaign.getUserRole(req.user.id) !== 'DM') {
      throw new ApiError(403, 'Only the DM can update maps');
    }

    const {
      name,
      description,
      gridConfig,
      dimensions,
      blocks,
      backgroundImage,
      isVisible,
      visibleTo,
      fogOfWar,
    } = req.body;

    const updatedMap = await Map.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        gridConfig,
        dimensions,
        blocks,
        backgroundImage,
        isVisible,
        visibleTo,
        fogOfWar,
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Map updated successfully',
      data: { map: updatedMap },
    });
  } catch (error) {
    next(error);
  }
};

// Delete map
const deleteMap = async (req, res, next) => {
  try {
    const map = await Map.findById(req.params.id);

    if (!map) {
      throw new ApiError(404, 'Map not found');
    }

    const campaign = await Campaign.findById(map.campaignId);

    if (!campaign || campaign.getUserRole(req.user.id) !== 'DM') {
      throw new ApiError(403, 'Only the DM can delete maps');
    }

    await Map.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Map deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Update map blocks (for real-time updates)
const updateBlocks = async (req, res, next) => {
  try {
    const map = await Map.findById(req.params.id);

    if (!map) {
      throw new ApiError(404, 'Map not found');
    }

    const campaign = await Campaign.findById(map.campaignId);

    if (!campaign || campaign.getUserRole(req.user.id) !== 'DM') {
      throw new ApiError(403, 'Only the DM can update map blocks');
    }

    const { blocks } = req.body;

    map.blocks = blocks;
    await map.save();

    res.json({
      success: true,
      message: 'Map blocks updated successfully',
      data: { map },
    });
  } catch (error) {
    next(error);
  }
};

// Add block to map
const addBlock = async (req, res, next) => {
  try {
    const map = await Map.findById(req.params.id);

    if (!map) {
      throw new ApiError(404, 'Map not found');
    }

    const campaign = await Campaign.findById(map.campaignId);

    if (!campaign || campaign.getUserRole(req.user.id) !== 'DM') {
      throw new ApiError(403, 'Only the DM can add blocks');
    }

    const { block } = req.body;

    map.blocks.push(block);
    await map.save();

    res.json({
      success: true,
      message: 'Block added successfully',
      data: { map },
    });
  } catch (error) {
    next(error);
  }
};

// Remove block from map
const removeBlock = async (req, res, next) => {
  try {
    const map = await Map.findById(req.params.id);

    if (!map) {
      throw new ApiError(404, 'Map not found');
    }

    const campaign = await Campaign.findById(map.campaignId);

    if (!campaign || campaign.getUserRole(req.user.id) !== 'DM') {
      throw new ApiError(403, 'Only the DM can remove blocks');
    }

    const { blockId } = req.params;

    map.blocks = map.blocks.filter((b) => b.id !== blockId);
    await map.save();

    res.json({
      success: true,
      message: 'Block removed successfully',
      data: { map },
    });
  } catch (error) {
    next(error);
  }
};

// Toggle map visibility
const toggleVisibility = async (req, res, next) => {
  try {
    const map = await Map.findById(req.params.id);

    if (!map) {
      throw new ApiError(404, 'Map not found');
    }

    const campaign = await Campaign.findById(map.campaignId);

    if (!campaign || campaign.getUserRole(req.user.id) !== 'DM') {
      throw new ApiError(403, 'Only the DM can toggle visibility');
    }

    map.isVisible = !map.isVisible;
    await map.save();

    res.json({
      success: true,
      message: `Map is now ${map.isVisible ? 'visible' : 'hidden'}`,
      data: { map },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMaps,
  getMap,
  createMap,
  updateMap,
  deleteMap,
  updateBlocks,
  addBlock,
  removeBlock,
  toggleVisibility,
};
