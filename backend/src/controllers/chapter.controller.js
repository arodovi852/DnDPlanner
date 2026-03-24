const { Chapter, Event, Campaign } = require('../models');
const { ApiError } = require('../middlewares');

// Get chapters by campaign
const getChapters = async (req, res, next) => {
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

    const chapters = await Chapter.find(query)
      .populate({
        path: 'events',
        options: { sort: { order: 1 } },
      })
      .sort({ order: 1 });

    // Filter events visibility for players
    let responseChapters = chapters.map((ch) => {
      const chObj = ch.toObject();
      if (userRole === 'Player' && chObj.events) {
        chObj.events = chObj.events.filter(
          (ev) => ev.isVisible || ev.visibleTo?.includes(req.user.id)
        );
      }
      return chObj;
    });

    res.json({
      success: true,
      data: { chapters: responseChapters },
    });
  } catch (error) {
    next(error);
  }
};

// Get single chapter
const getChapter = async (req, res, next) => {
  try {
    const chapter = await Chapter.findById(req.params.id).populate({
      path: 'events',
      options: { sort: { order: 1 } },
    });

    if (!chapter) {
      throw new ApiError(404, 'Chapter not found');
    }

    const campaign = await Campaign.findById(chapter.campaignId);

    if (!campaign || !campaign.hasAccess(req.user.id)) {
      throw new ApiError(403, 'Access denied');
    }

    const userRole = campaign.getUserRole(req.user.id);

    // Check visibility
    if (userRole === 'Player' && !chapter.isVisibleToUser(req.user.id, userRole)) {
      throw new ApiError(403, 'This chapter is not visible to you');
    }

    // Filter events for players
    let responseChapter = chapter.toObject();
    if (userRole === 'Player' && responseChapter.events) {
      responseChapter.events = responseChapter.events.filter(
        (ev) => ev.isVisible || ev.visibleTo?.includes(req.user.id)
      );
    }

    res.json({
      success: true,
      data: { chapter: responseChapter, userRole },
    });
  } catch (error) {
    next(error);
  }
};

// Create chapter
const createChapter = async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);

    if (!campaign) {
      throw new ApiError(404, 'Campaign not found');
    }

    if (!campaign.hasAccess(req.user.id)) {
      throw new ApiError(403, 'Access denied');
    }

    // Only DM can create chapters
    if (campaign.getUserRole(req.user.id) !== 'DM') {
      throw new ApiError(403, 'Only the DM can create chapters');
    }

    const { title, description, order, isVisible } = req.body;

    // Get highest order if not provided
    let chapterOrder = order;
    if (chapterOrder === undefined) {
      const lastChapter = await Chapter.findOne({
        campaignId: req.params.campaignId,
      }).sort({ order: -1 });
      chapterOrder = lastChapter ? lastChapter.order + 1 : 0;
    }

    const chapter = await Chapter.create({
      campaignId: req.params.campaignId,
      title,
      description,
      order: chapterOrder,
      isVisible: isVisible || false,
    });

    res.status(201).json({
      success: true,
      message: 'Chapter created successfully',
      data: { chapter },
    });
  } catch (error) {
    next(error);
  }
};

// Update chapter
const updateChapter = async (req, res, next) => {
  try {
    const chapter = await Chapter.findById(req.params.id);

    if (!chapter) {
      throw new ApiError(404, 'Chapter not found');
    }

    const campaign = await Campaign.findById(chapter.campaignId);

    if (!campaign || campaign.getUserRole(req.user.id) !== 'DM') {
      throw new ApiError(403, 'Only the DM can update chapters');
    }

    const { title, description, order, isVisible, visibleTo } = req.body;

    const updatedChapter = await Chapter.findByIdAndUpdate(
      req.params.id,
      { title, description, order, isVisible, visibleTo },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Chapter updated successfully',
      data: { chapter: updatedChapter },
    });
  } catch (error) {
    next(error);
  }
};

// Delete chapter
const deleteChapter = async (req, res, next) => {
  try {
    const chapter = await Chapter.findById(req.params.id);

    if (!chapter) {
      throw new ApiError(404, 'Chapter not found');
    }

    const campaign = await Campaign.findById(chapter.campaignId);

    if (!campaign || campaign.getUserRole(req.user.id) !== 'DM') {
      throw new ApiError(403, 'Only the DM can delete chapters');
    }

    // Delete associated events
    await Event.deleteMany({ chapterId: req.params.id });

    await Chapter.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Chapter deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Reorder chapters
const reorderChapters = async (req, res, next) => {
  try {
    const { chapters } = req.body; // Array of { id, order }

    const campaign = await Campaign.findById(req.params.campaignId);

    if (!campaign || campaign.getUserRole(req.user.id) !== 'DM') {
      throw new ApiError(403, 'Only the DM can reorder chapters');
    }

    // Update each chapter's order
    await Promise.all(
      chapters.map(({ id, order }) =>
        Chapter.findByIdAndUpdate(id, { order })
      )
    );

    const updatedChapters = await Chapter.find({
      campaignId: req.params.campaignId,
    }).sort({ order: 1 });

    res.json({
      success: true,
      message: 'Chapters reordered successfully',
      data: { chapters: updatedChapters },
    });
  } catch (error) {
    next(error);
  }
};

// Toggle chapter visibility
const toggleVisibility = async (req, res, next) => {
  try {
    const chapter = await Chapter.findById(req.params.id);

    if (!chapter) {
      throw new ApiError(404, 'Chapter not found');
    }

    const campaign = await Campaign.findById(chapter.campaignId);

    if (!campaign || campaign.getUserRole(req.user.id) !== 'DM') {
      throw new ApiError(403, 'Only the DM can toggle visibility');
    }

    chapter.isVisible = !chapter.isVisible;
    await chapter.save();

    res.json({
      success: true,
      message: `Chapter is now ${chapter.isVisible ? 'visible' : 'hidden'}`,
      data: { chapter },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChapters,
  getChapter,
  createChapter,
  updateChapter,
  deleteChapter,
  reorderChapters,
  toggleVisibility,
};
