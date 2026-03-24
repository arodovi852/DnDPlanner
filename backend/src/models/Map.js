const mongoose = require('mongoose');

const mapBlockSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['player', 'npc', 'enemy', 'terrain', 'object', 'effect'],
      required: true,
    },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    size: {
      width: { type: Number, default: 1 },
      height: { type: Number, default: 1 },
    },
    data: {
      name: { type: String },
      imageUrl: { type: String },
      color: { type: String },
      characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
      // For enemies from D&D API
      dndApiIndex: { type: String },
    },
    // For post-it notes (post-MVP)
    notes: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        content: { type: String, maxlength: 500 },
        color: { type: String, default: '#FFEB3B' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { _id: false }
);

const mapSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Map name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    gridConfig: {
      cellSize: {
        type: Number,
        default: 40,
        min: 20,
        max: 100,
      },
      shape: {
        type: String,
        enum: ['square', 'hexagon'],
        default: 'square',
      },
      theme: {
        type: String,
        enum: ['dungeon', 'forest', 'desert', 'snow', 'underwater', 'castle', 'cave', 'custom'],
        default: 'dungeon',
      },
      backgroundColor: {
        type: String,
        default: '#1a1a2e',
      },
      showGrid: {
        type: Boolean,
        default: true,
      },
    },
    dimensions: {
      width: { type: Number, default: 20 },
      height: { type: Number, default: 20 },
    },
    blocks: [mapBlockSchema],
    backgroundImage: {
      type: String,
      default: null,
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
    // For fog of war (post-MVP)
    fogOfWar: {
      enabled: { type: Boolean, default: false },
      revealedCells: [
        {
          x: Number,
          y: Number,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
mapSchema.index({ campaignId: 1 });

// Check visibility for user
mapSchema.methods.isVisibleToUser = function (userId, userRole) {
  if (userRole === 'DM') return true;
  if (this.isVisible) return true;
  return this.visibleTo.some((id) => id.toString() === userId.toString());
};

module.exports = mongoose.model('Map', mapSchema);
