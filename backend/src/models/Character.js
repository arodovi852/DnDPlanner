const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema(
  {
    strength: { type: Number, min: 1, max: 30, default: 10 },
    dexterity: { type: Number, min: 1, max: 30, default: 10 },
    constitution: { type: Number, min: 1, max: 30, default: 10 },
    intelligence: { type: Number, min: 1, max: 30, default: 10 },
    wisdom: { type: Number, min: 1, max: 30, default: 10 },
    charisma: { type: Number, min: 1, max: 30, default: 10 },
  },
  { _id: false }
);

const combatStatsSchema = new mongoose.Schema(
  {
    maxHitPoints: { type: Number, min: 1, default: 10 },
    currentHitPoints: { type: Number, default: 10 },
    temporaryHitPoints: { type: Number, default: 0 },
    armorClass: { type: Number, min: 0, default: 10 },
    initiative: { type: Number, default: 0 },
    speed: { type: Number, min: 0, default: 30 },
    proficiencyBonus: { type: Number, min: 0, default: 2 },
  },
  { _id: false }
);

const picrewConfigSchema = new mongoose.Schema(
  {
    skinTone: { type: String },
    hairStyle: { type: String },
    hairColor: { type: String },
    eyeColor: { type: String },
    facialFeatures: { type: String },
    accessories: [{ type: String }],
    outfit: { type: String },
  },
  { _id: false }
);

const characterSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Character name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    race: {
      type: String,
      trim: true,
      maxlength: [50, 'Race cannot exceed 50 characters'],
    },
    class: {
      type: String,
      trim: true,
      maxlength: [50, 'Class cannot exceed 50 characters'],
    },
    subclass: {
      type: String,
      trim: true,
      maxlength: [50, 'Subclass cannot exceed 50 characters'],
    },
    level: {
      type: Number,
      min: 1,
      max: 20,
      default: 1,
    },
    background: {
      type: String,
      trim: true,
      maxlength: [100, 'Background cannot exceed 100 characters'],
    },
    alignment: {
      type: String,
      enum: [
        'Lawful Good',
        'Neutral Good',
        'Chaotic Good',
        'Lawful Neutral',
        'True Neutral',
        'Chaotic Neutral',
        'Lawful Evil',
        'Neutral Evil',
        'Chaotic Evil',
        'Unaligned',
      ],
      default: 'True Neutral',
    },
    stats: {
      type: statsSchema,
      default: () => ({}),
    },
    combatStats: {
      type: combatStatsSchema,
      default: () => ({}),
    },
    imageUrl: {
      type: String,
      default: null,
    },
    picrewConfig: {
      type: picrewConfigSchema,
      default: null,
    },
    isNPC: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    backstory: {
      type: String,
      maxlength: [5000, 'Backstory cannot exceed 5000 characters'],
    },
    notes: {
      type: String,
      maxlength: [5000, 'Notes cannot exceed 5000 characters'],
    },
    // For DM visibility control
    isVisible: {
      type: Boolean,
      default: true,
    },
    visibleTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Link to D&D API for NPCs/monsters
    dndApiIndex: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
characterSchema.index({ campaignId: 1 });
characterSchema.index({ createdBy: 1 });

// Calculate ability modifier
characterSchema.methods.getAbilityModifier = function (ability) {
  const score = this.stats[ability];
  return Math.floor((score - 10) / 2);
};

// Check visibility for user
characterSchema.methods.isVisibleToUser = function (userId, userRole) {
  if (userRole === 'DM') return true;
  if (this.isVisible) return true;
  if (this.createdBy.toString() === userId.toString()) return true;
  return this.visibleTo.some((id) => id.toString() === userId.toString());
};

module.exports = mongoose.model('Character', characterSchema);
