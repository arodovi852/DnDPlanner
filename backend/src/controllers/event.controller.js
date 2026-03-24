const { Event, Chapter, Campaign } = require('../models');
const { ApiError } = require('../middlewares');

// Get events by chapter
const getEvents = async (req, res, next) => {
  try {
    const chapter = await Chapter.findById(req.params.chapterId);

    if (!chapter) {
      throw new ApiError(404, 'Chapter not found');
    }

    const campaign = await Campaign.findById(chapter.campaignId);

    if (!campaign || !campaign.hasAccess(req.user.id)) {
      throw new ApiError(403, 'Access denied');
    }

    const userRole = campaign.getUserRole(req.user.id);

    // Check chapter visibility for players
    if (userRole === 'Player' && !chapter.isVisibleToUser(req.user.id, userRole)) {
      throw new ApiError(403, 'This chapter is not visible to you');
    }

    let query = { chapterId: req.params.chapterId };

    // Filter visibility for players
    if (userRole === 'Player') {
      query.$or = [{ isVisible: true }, { visibleTo: req.user.id }];
    }

    const events = await Event.find(query).sort({ order: 1 });

    res.json({
      success: true,
      data: { events },
    });
  } catch (error) {
    next(error);
  }
};

// Get single event
const getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    const chapter = await Chapter.findById(event.chapterId);
    const campaign = await Campaign.findById(chapter.campaignId);

    if (!campaign || !campaign.hasAccess(req.user.id)) {
      throw new ApiError(403, 'Access denied');
    }

    const userRole = campaign.getUserRole(req.user.id);

    // Check visibility for players
    if (userRole === 'Player' && !event.isVisibleToUser(req.user.id, userRole)) {
      throw new ApiError(403, 'This event is not visible to you');
    }

    res.json({
      success: true,
      data: { event, userRole },
    });
  } catch (error) {
    next(error);
  }
};

// Create event
const createEvent = async (req, res, next) => {
  try {
    const chapter = await Chapter.findById(req.params.chapterId);

    if (!chapter) {
      throw new ApiError(404, 'Chapter not found');
    }

    const campaign = await Campaign.findById(chapter.campaignId);

    if (!campaign || campaign.getUserRole(req.user.id) !== 'DM') {
      throw new ApiError(403, 'Only the DM can create events');
    }

    const { title, type, mode, content, canvasData, order, isVisible } = req.body;

    // Get highest order if not provided
    let eventOrder = order;
    if (eventOrder === undefined) {
      const lastEvent = await Event.findOne({
        chapterId: req.params.chapterId,
      }).sort({ order: -1 });
      eventOrder = lastEvent ? lastEvent.order + 1 : 0;
    }

    const event = await Event.create({
      chapterId: req.params.chapterId,
      title,
      type,
      mode: mode || 'notes',
      content,
      canvasData,
      order: eventOrder,
      isVisible: isVisible || false,
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: { event },
    });
  } catch (error) {
    next(error);
  }
};

// Update event
const updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    const chapter = await Chapter.findById(event.chapterId);
    const campaign = await Campaign.findById(chapter.campaignId);

    if (!campaign || campaign.getUserRole(req.user.id) !== 'DM') {
      throw new ApiError(403, 'Only the DM can update events');
    }

    const {
      title,
      type,
      mode,
      content,
      canvasData,
      order,
      isVisible,
      visibleTo,
      chronologicalOrder,
      revelationOrder,
    } = req.body;

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      {
        title,
        type,
        mode,
        content,
        canvasData,
        order,
        isVisible,
        visibleTo,
        chronologicalOrder,
        revelationOrder,
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: { event: updatedEvent },
    });
  } catch (error) {
    next(error);
  }
};

// Delete event
const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    const chapter = await Chapter.findById(event.chapterId);
    const campaign = await Campaign.findById(chapter.campaignId);

    if (!campaign || campaign.getUserRole(req.user.id) !== 'DM') {
      throw new ApiError(403, 'Only the DM can delete events');
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Reorder events
const reorderEvents = async (req, res, next) => {
  try {
    const { events } = req.body; // Array of { id, order }

    const chapter = await Chapter.findById(req.params.chapterId);

    if (!chapter) {
      throw new ApiError(404, 'Chapter not found');
    }

    const campaign = await Campaign.findById(chapter.campaignId);

    if (!campaign || campaign.getUserRole(req.user.id) !== 'DM') {
      throw new ApiError(403, 'Only the DM can reorder events');
    }

    await Promise.all(
      events.map(({ id, order }) => Event.findByIdAndUpdate(id, { order }))
    );

    const updatedEvents = await Event.find({
      chapterId: req.params.chapterId,
    }).sort({ order: 1 });

    res.json({
      success: true,
      message: 'Events reordered successfully',
      data: { events: updatedEvents },
    });
  } catch (error) {
    next(error);
  }
};

// Toggle event visibility
const toggleVisibility = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    const chapter = await Chapter.findById(event.chapterId);
    const campaign = await Campaign.findById(chapter.campaignId);

    if (!campaign || campaign.getUserRole(req.user.id) !== 'DM') {
      throw new ApiError(403, 'Only the DM can toggle visibility');
    }

    event.isVisible = !event.isVisible;
    await event.save();

    res.json({
      success: true,
      message: `Event is now ${event.isVisible ? 'visible' : 'hidden'}`,
      data: { event },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  reorderEvents,
  toggleVisibility,
};
