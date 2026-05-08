const mongoose = require('mongoose');

/**
 * Follow schema.
 *
 * Directed edge in the social graph: `follower` follows `followed`.
 *
 * The compound unique index prevents duplicates (you can't follow the same
 * user twice) and the per-side indexes accelerate the two main lookups:
 *   - "Who do I follow?"      → query by follower
 *   - "Who follows this user?" → query by followed
 *
 * Self-follows are forbidden via a pre-validate hook.
 */
const followSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    followed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

followSchema.index({ follower: 1, followed: 1 }, { unique: true });

followSchema.pre('validate', function (next) {
  if (this.follower.equals(this.followed)) {
    return next(new Error('A user cannot follow themselves'));
  }
  next();
});

module.exports = mongoose.model('Follow', followSchema);
