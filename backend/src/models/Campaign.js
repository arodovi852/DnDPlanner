const mongoose = require('mongoose');

/**
 * Campaign + Chapter + Character + Map + Events models, all embedded.
 *
 * Why one big model? The frontend already operates on a denormalised tree
 * (a `Campaign` carries its `chapters[]`, `characters[]`, `members[]`,
 * `annotations[]` etc.). Mirroring that on the server keeps the API and
 * the React contexts in sync without translation layers, and a single
 * `findById(campaignId)` hydrates everything the editor needs.
 *
 * Trade-off: a campaign document can grow large with many chapters and
 * map cells. We accept that — typical campaigns are well under MongoDB's
 * 16MB document limit, and chapters are atomic units of editing anyway.
 */

// ---------------------------------------------------------------------------
// Members (sharing)
// ---------------------------------------------------------------------------

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['dm', 'co-dm', 'player'],
      default: 'player',
    },
    /** Only meaningful for `player`: id of the assigned `Character`. */
    characterId: {
      type: String,
      default: null,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Annotations and spoilers
// ---------------------------------------------------------------------------

const annotationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: { type: String, enum: ['character', 'chapter'], required: true },
    targetId: { type: String, required: true },
    text: { type: String, required: true, maxlength: 4000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Character (playable / enemy)
// ---------------------------------------------------------------------------

const characterStatsSchema = new mongoose.Schema(
  {
    str: { type: Number, default: 10 },
    dex: { type: Number, default: 10 },
    con: { type: Number, default: 10 },
    int: { type: Number, default: 10 },
    wis: { type: Number, default: 10 },
    cha: { type: Number, default: 10 },
  },
  { _id: false }
);

const characterAttackSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    attackBonus: { type: Number },
    damage: { type: String },
  },
  { _id: false }
);

const characterSlotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number },
  },
  { _id: false }
);

const characterSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, default: '' },
    kind: { type: String, enum: ['playable', 'enemy'], required: true },
    image: { type: String, default: null },
    /** Slug del monstruo en dnd5eapi (sólo enemigos vinculados al API). */
    apiIndex: { type: String, default: null },
    className: { type: String, default: null },
    level: { type: Number, default: 1 },
    race: { type: String, default: null },
    alignment: { type: String, default: null },
    background: { type: String, default: null },
    armor: { type: Number, default: 10 },
    hp: { type: Number, default: 10 },
    maxHp: { type: Number, default: 10 },
    movement: { type: Number, default: 30 },
    damageDice: { type: String, default: '1d6' },
    initiative: { type: Number, default: 0 },
    stats: { type: characterStatsSchema, default: () => ({}) },
    savingThrows: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    inventory: { type: [characterSlotSchema], default: [] },
    inventorySlots: { type: Number, default: 12 },
    spells: { type: [String], default: [] },
    features: { type: [String], default: [] },
    attacks: { type: [characterAttackSchema], default: [] },
    description: { type: String, default: '' },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Chapter (events graph + tactical map)
// ---------------------------------------------------------------------------

const eventBlockSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    text: { type: String, default: '' },
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
    // Tamaño persistido cuando el usuario redimensiona el bloque a mano.
    // Si están ausentes el frontend usa BLOCK_WIDTH/BLOCK_HEIGHT por defecto.
    width: { type: Number },
    height: { type: Number },
  },
  { _id: false }
);

const eventConnectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
  },
  { _id: false }
);

const mapEntitySchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['character', 'terrain', 'enemy'],
      required: true,
    },
    subtype: { type: String, required: true },
  },
  { _id: false }
);

const chapterMapSchema = new mongoose.Schema(
  {
    /** Sparse map: key is `"x-y"`, value is the entity at that cell. */
    cells: {
      type: Map,
      of: mapEntitySchema,
      default: () => new Map(),
    },
    cols: { type: Number, default: 15 },
    rows: { type: Number, default: 15 },
  },
  { _id: false }
);

const chapterSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, default: '' },
    events: {
      blocks: { type: [eventBlockSchema], default: [] },
      connections: { type: [eventConnectionSchema], default: [] },
    },
    map: { type: chapterMapSchema, default: () => ({}) },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Campaign
// ---------------------------------------------------------------------------

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    /** Local template the campaign was built from (e.g. 'destinos-cruzados'). */
    templateId: { type: String, default: null },
    /** Origin campaign (when this one was cloned from a public template). */
    templateSource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      default: null,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    chapters: { type: [chapterSchema], default: [] },
    characters: { type: [characterSchema], default: [] },
    members: { type: [memberSchema], default: [] },
    annotations: { type: [annotationSchema], default: [] },
    revealedSpoilers: { type: [String], default: [] },
    /** Opaque token for invitation links (joins as player). */
    shareToken: { type: String, default: null, index: true, sparse: true },
    /** Opaque token for read-only view links. */
    viewToken: { type: String, default: null, index: true, sparse: true },
    /** Cover image (data URL or external URL). */
    image: { type: String, default: null },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'private',
    },
  },
  {
    timestamps: true,
  }
);

// Lookups by member or owner — both are common.
campaignSchema.index({ ownerId: 1 });
campaignSchema.index({ 'members.userId': 1 });
campaignSchema.index({ visibility: 1 });

/** True when `userId` is owner or any kind of member. */
campaignSchema.methods.hasAccess = function (userId) {
  const id = String(userId);
  if (String(this.ownerId) === id) return true;
  return this.members.some((m) => String(m.userId) === id);
};

/** Returns 'dm' | 'co-dm' | 'player' or null. Owner is always at least 'dm'. */
campaignSchema.methods.getMemberRole = function (userId) {
  const id = String(userId);
  const m = this.members.find((m) => String(m.userId) === id);
  if (m) return m.role;
  if (String(this.ownerId) === id) return 'dm';
  return null;
};

/** True for DM and co-DM (the two roles that can edit). */
campaignSchema.methods.canEdit = function (userId) {
  const role = this.getMemberRole(userId);
  return role === 'dm' || role === 'co-dm';
};

/**
 * Frontend-friendly serialisation.
 *
 * The frontend uses `id` (string) instead of `_id`, and numeric/string
 * primitives instead of ObjectIds for relations. This method produces
 * exactly the shape the React `CampaignContext` expects.
 */
campaignSchema.methods.toFrontendJSON = function () {
  const obj = this.toObject({ flattenMaps: true, versionKey: false });
  const stringify = (v) => (v == null ? null : String(v));
  return {
    id: String(obj._id),
    name: obj.name,
    templateId: obj.templateId ?? undefined,
    ownerId: stringify(obj.ownerId),
    createdAt: obj.createdAt?.toISOString?.() ?? obj.createdAt,
    updatedAt: obj.updatedAt?.toISOString?.() ?? obj.updatedAt,
    chapters: obj.chapters ?? [],
    characters: obj.characters ?? [],
    members: (obj.members ?? []).map((m) => ({
      userId: stringify(m.userId),
      role: m.role,
      characterId: m.characterId ?? undefined,
      joinedAt:
        m.joinedAt instanceof Date
          ? m.joinedAt.toISOString()
          : m.joinedAt ?? new Date().toISOString(),
    })),
    annotations: (obj.annotations ?? []).map((a) => ({
      id: a.id,
      userId: stringify(a.userId),
      targetType: a.targetType,
      targetId: a.targetId,
      text: a.text,
      createdAt:
        a.createdAt instanceof Date
          ? a.createdAt.toISOString()
          : a.createdAt ?? new Date().toISOString(),
    })),
    revealedSpoilers: obj.revealedSpoilers ?? [],
    shareToken: obj.shareToken ?? undefined,
    viewToken: obj.viewToken ?? undefined,
    image: obj.image ?? undefined,
    visibility: obj.visibility ?? 'private',
  };
};

module.exports = mongoose.model('Campaign', campaignSchema);
