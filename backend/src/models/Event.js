const mongoose = require('mongoose');

const canvasBlockSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'shape', 'connection'],
      required: true,
    },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    size: {
      width: { type: Number, default: 200 },
      height: { type: Number, default: 100 },
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
    },
    style: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chapter',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    type: {
      type: String,
      enum: [
        'Mission',
        'Combat',
        'MainStory',
        'CharacterArc',
        'Exploration',
        'Social',
        'Rest',
        'Other',
      ],
      default: 'Other',
    },
    mode: {
      type: String,
      enum: ['notes', 'canvas'],
      default: 'notes',
    },
    // For notes mode
    content: {
      type: String,
      maxlength: [50000, 'Content cannot exceed 50000 characters'],
    },
    // For canvas mode
    canvasData: {
      blocks: [canvasBlockSchema],
      viewport: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        zoom: { type: Number, default: 1 },
      },
    },
    order: {
      type: Number,
      default: 0,
    },
    isVisible: {
      type: Boolean,
      default: false,
    },
    visibleTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // For timeline feature (post-MVP)
    chronologicalOrder: {
      type: Number,
      default: null,
    },
    revelationOrder: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
eventSchema.index({ chapterId: 1, order: 1 });

// Check visibility for user
eventSchema.methods.isVisibleToUser = function (userId, userRole) {
  if (userRole === 'DM') return true;
  if (this.isVisible) return true;
  return this.visibleTo.some((id) => id.toString() === userId.toString());
};

module.exports = mongoose.model('Event', eventSchema);
