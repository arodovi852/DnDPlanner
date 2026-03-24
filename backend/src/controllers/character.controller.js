const { Character, Campaign } = require('../models');
const { ApiError } = require('../middlewares');

// Get characters by campaign
const getCharacters = async (req, res, next) => {
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
      query.$or = [
        { isVisible: true },
        { visibleTo: req.user.id },
        { createdBy: req.user.id },
      ];
    }

    const characters = await Character.find(query)
      .populate('createdBy', 'username avatar')
      .sort({ isNPC: 1, name: 1 });

    res.json({
      success: true,
      data: { characters },
    });
  } catch (error) {
    next(error);
  }
};

// Get single character
const getCharacter = async (req, res, next) => {
  try {
    const character = await Character.findById(req.params.id).populate(
      'createdBy',
      'username avatar'
    );

    if (!character) {
      throw new ApiError(404, 'Character not found');
    }

    const campaign = await Campaign.findById(character.campaignId);

    if (!campaign || !campaign.hasAccess(req.user.id)) {
      throw new ApiError(403, 'Access denied');
    }

    const userRole = campaign.getUserRole(req.user.id);

    // Check visibility for players
    if (
      userRole === 'Player' &&
      !character.isVisibleToUser(req.user.id, userRole)
    ) {
      throw new ApiError(403, 'This character is not visible to you');
    }

    res.json({
      success: true,
      data: { character, userRole },
    });
  } catch (error) {
    next(error);
  }
};

// Create character
const createCharacter = async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);

    if (!campaign) {
      throw new ApiError(404, 'Campaign not found');
    }

    if (!campaign.hasAccess(req.user.id)) {
      throw new ApiError(403, 'Access denied');
    }

    const userRole = campaign.getUserRole(req.user.id);

    const {
      name,
      race,
      class: charClass,
      subclass,
      level,
      background,
      alignment,
      stats,
      combatStats,
      imageUrl,
      picrewConfig,
      isNPC,
      description,
      backstory,
      notes,
      dndApiIndex,
    } = req.body;

    // Players can only create non-NPC characters
    if (userRole === 'Player' && isNPC) {
      throw new ApiError(403, 'Only the DM can create NPCs');
    }

    const character = await Character.create({
      campaignId: req.params.campaignId,
      createdBy: req.user.id,
      name,
      race,
      class: charClass,
      subclass,
      level,
      background,
      alignment,
      stats,
      combatStats,
      imageUrl,
      picrewConfig,
      isNPC: userRole === 'DM' ? isNPC : false,
      description,
      backstory,
      notes,
      isVisible: userRole === 'DM' ? false : true, // Player characters are visible by default
      dndApiIndex,
    });

    const populatedCharacter = await Character.findById(character._id).populate(
      'createdBy',
      'username avatar'
    );

    res.status(201).json({
      success: true,
      message: 'Character created successfully',
      data: { character: populatedCharacter },
    });
  } catch (error) {
    next(error);
  }
};

// Update character
const updateCharacter = async (req, res, next) => {
  try {
    const character = await Character.findById(req.params.id);

    if (!character) {
      throw new ApiError(404, 'Character not found');
    }

    const campaign = await Campaign.findById(character.campaignId);

    if (!campaign || !campaign.hasAccess(req.user.id)) {
      throw new ApiError(403, 'Access denied');
    }

    const userRole = campaign.getUserRole(req.user.id);

    // Players can only update their own characters
    if (
      userRole === 'Player' &&
      character.createdBy.toString() !== req.user.id.toString()
    ) {
      throw new ApiError(403, 'You can only update your own characters');
    }

    const {
      name,
      race,
      class: charClass,
      subclass,
      level,
      background,
      alignment,
      stats,
      combatStats,
      imageUrl,
      picrewConfig,
      isNPC,
      description,
      backstory,
      notes,
      isVisible,
      visibleTo,
      dndApiIndex,
    } = req.body;

    // Players cannot change isNPC or visibility settings
    let updateData = {
      name,
      race,
      class: charClass,
      subclass,
      level,
      background,
      alignment,
      stats,
      combatStats,
      imageUrl,
      picrewConfig,
      description,
      backstory,
      notes,
      dndApiIndex,
    };

    if (userRole === 'DM') {
      updateData.isNPC = isNPC;
      updateData.isVisible = isVisible;
      updateData.visibleTo = visibleTo;
    }

    const updatedCharacter = await Character.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username avatar');

    res.json({
      success: true,
      message: 'Character updated successfully',
      data: { character: updatedCharacter },
    });
  } catch (error) {
    next(error);
  }
};

// Delete character
const deleteCharacter = async (req, res, next) => {
  try {
    const character = await Character.findById(req.params.id);

    if (!character) {
      throw new ApiError(404, 'Character not found');
    }

    const campaign = await Campaign.findById(character.campaignId);

    if (!campaign || !campaign.hasAccess(req.user.id)) {
      throw new ApiError(403, 'Access denied');
    }

    const userRole = campaign.getUserRole(req.user.id);

    // Players can only delete their own characters
    if (
      userRole === 'Player' &&
      character.createdBy.toString() !== req.user.id.toString()
    ) {
      throw new ApiError(403, 'You can only delete your own characters');
    }

    await Character.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Character deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Update combat stats (for real-time combat)
const updateCombatStats = async (req, res, next) => {
  try {
    const character = await Character.findById(req.params.id);

    if (!character) {
      throw new ApiError(404, 'Character not found');
    }

    const campaign = await Campaign.findById(character.campaignId);

    if (!campaign || campaign.getUserRole(req.user.id) !== 'DM') {
      throw new ApiError(403, 'Only the DM can update combat stats');
    }

    const { combatStats } = req.body;

    character.combatStats = { ...character.combatStats, ...combatStats };
    await character.save();

    res.json({
      success: true,
      message: 'Combat stats updated successfully',
      data: { character },
    });
  } catch (error) {
    next(error);
  }
};

// Toggle character visibility
const toggleVisibility = async (req, res, next) => {
  try {
    const character = await Character.findById(req.params.id);

    if (!character) {
      throw new ApiError(404, 'Character not found');
    }

    const campaign = await Campaign.findById(character.campaignId);

    if (!campaign || campaign.getUserRole(req.user.id) !== 'DM') {
      throw new ApiError(403, 'Only the DM can toggle visibility');
    }

    character.isVisible = !character.isVisible;
    await character.save();

    res.json({
      success: true,
      message: `Character is now ${character.isVisible ? 'visible' : 'hidden'}`,
      data: { character },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCharacters,
  getCharacter,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  updateCombatStats,
  toggleVisibility,
};
