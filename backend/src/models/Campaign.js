const mongoose = require('mongoose');

const sharedUserSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['DM', 'Player'],
      default: 'Player',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Campaign title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    coverImage: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sharedWith: [sharedUserSchema],
    visibility: {
      type: String,
      enum: ['private', 'shared', 'public'],
      default: 'private',
    },
    isTemplate: {
      type: Boolean,
      default: false,
    },
    templateSource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      default: null,
    },
    settings: {
      gameSystem: {
        type: String,
        default: 'D&D 5e',
      },
      language: {
        type: String,
        enum: ['es', 'en'],
        default: 'es',
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for chapters
campaignSchema.virtual('chapters', {
  ref: 'Chapter',
  localField: '_id',
  foreignField: 'campaignId',
});

// Virtual for characters
campaignSchema.virtual('characters', {
  ref: 'Character',
  localField: '_id',
  foreignField: 'campaignId',
});

// Virtual for maps
campaignSchema.virtual('maps', {
  ref: 'Map',
  localField: '_id',
  foreignField: 'campaignId',
});

// Index for faster queries
campaignSchema.index({ createdBy: 1 });
campaignSchema.index({ 'sharedWith.userId': 1 });
campaignSchema.index({ visibility: 1 });

// Check if user has access to campaign
campaignSchema.methods.hasAccess = function (userId) {
  const userIdStr = userId.toString();
  if (this.createdBy.toString() === userIdStr) return true;
  return this.sharedWith.some((share) => share.userId.toString() === userIdStr);
};

// Get user role in campaign
campaignSchema.methods.getUserRole = function (userId) {
  const userIdStr = userId.toString();
  if (this.createdBy.toString() === userIdStr) return 'DM';
  const sharedUser = this.sharedWith.find(
    (share) => share.userId.toString() === userIdStr
  );
  return sharedUser ? sharedUser.role : null;
};

module.exports = mongoose.model('Campaign', campaignSchema);
