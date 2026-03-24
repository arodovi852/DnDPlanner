const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Chapter title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for events
chapterSchema.virtual('events', {
  ref: 'Event',
  localField: '_id',
  foreignField: 'chapterId',
});

// Index for faster queries
chapterSchema.index({ campaignId: 1, order: 1 });

// Check visibility for user
chapterSchema.methods.isVisibleToUser = function (userId, userRole) {
  if (userRole === 'DM') return true;
  if (this.isVisible) return true;
  return this.visibleTo.some((id) => id.toString() === userId.toString());
};

module.exports = mongoose.model('Chapter', chapterSchema);
