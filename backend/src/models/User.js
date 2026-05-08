const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * User schema.
 *
 * Stores authentication credentials and profile data. The `password` field
 * is hashed via bcrypt in a pre-save hook and excluded from queries by
 * default (`select: false`). The `refreshToken` is also excluded by default
 * to keep it out of accidental responses.
 *
 * Profile-related fields (`description`, `isPrivate`, `avatar`) drive the
 * public profile page and the privacy gate that hides this user from
 * search results / public lookups.
 */
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    avatar: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    /**
     * If `true`, this user does not appear in user search and their public
     * profile responds with a "private profile" payload — except when the
     * viewer is a DM/co-DM of a campaign in which the target is a player.
     * That exception is enforced in the controller, not here.
     */
    isPrivate: {
      type: Boolean,
      default: false,
    },
    /**
     * Application-level role. `admin` is reserved for moderators who can
     * see/delete content beyond their ownership; regular users are `user`.
     */
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookups (username/email uniqueness already implies them,
// but making them explicit also covers case-insensitive search patterns).
userSchema.index({ username: 'text', email: 'text' });

// Hash password before saving when it has been modified.
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare a plain-text password against the stored hash.
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Strip sensitive fields when serialising to JSON (responses, logs).
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.refreshToken;
  return user;
};

// Public projection (used when returning a user as part of a list of
// "other users" to a different viewer — e.g. follow lists, search).
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    username: this.username,
    avatar: this.avatar,
    description: this.description,
    isPrivate: this.isPrivate,
  };
};

module.exports = mongoose.model('User', userSchema);
