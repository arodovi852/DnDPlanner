/**
 * Seeds the database with ~10 demo accounts and a handful of public /
 * shared campaigns, for use during live presentations.
 *
 * Usage:
 *   node scripts/seedDemoAccounts.js
 *
 * Idempotent: accounts are looked up by username and reused if present;
 * campaigns are looked up by (ownerId, name) and reused if present. Re-runs
 * therefore won't create duplicates.
 *
 * All accounts share the password "1234QWer". They are intended for
 * demonstrations only — DO NOT enable in production environments.
 */
require('dotenv').config();
// Force the Node DNS resolver to use Google's public DNS (8.8.8.8, 8.8.4.4).
// Some local networks/ISPs block SRV record lookups against the system
// resolver, which prevents the `mongodb+srv://` connection string from
// finding the Atlas replica set. Overriding here is purely a development
// workaround — it doesn't affect production (where DO already resolves SRVs).
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const mongoose = require('mongoose');
const { User, Campaign } = require('../src/models');

const PASSWORD = '1234QWer';

// --- Demo users -------------------------------------------------------------
// English names + descriptions, varied "personas" so the presenter can show
// off the user directory and follow/unfollow flows without ambiguity.
const USERS = [
  {
    username: 'AriaStoneheart',
    email: 'aria.stoneheart@dndplanner.demo',
    description: 'Veteran DM. Long, brooding campaigns set in dark fantasy worlds.',
  },
  {
    username: 'CassiusWren',
    email: 'cassius.wren@dndplanner.demo',
    description: 'Curious player who lives for stealth, deception and trap-spotting.',
  },
  {
    username: 'MiraVexley',
    email: 'mira.vexley@dndplanner.demo',
    description: 'Storyteller specialising in horror one-shots with twist endings.',
  },
  {
    username: 'BramQuill',
    email: 'bram.quill@dndplanner.demo',
    description: 'System tinkerer and homebrew enthusiast — never satisfied with RAW.',
  },
  {
    username: 'LyraFellfern',
    email: 'lyra.fellfern@dndplanner.demo',
    description: 'Theatre-kid bard. Always in character, always negotiating.',
  },
  {
    username: 'OrinHollow',
    email: 'orin.hollow@dndplanner.demo',
    description: 'Map artist and worldbuilder. Hand-drawn battle maps and lore docs.',
  },
  {
    username: 'SeleneDrosk',
    email: 'selene.drosk@dndplanner.demo',
    description: 'Rules-lawyer wizard. Has memorised every Counterspell ruling since 2014.',
  },
  {
    username: 'TheoMossgrave',
    email: 'theo.mossgrave@dndplanner.demo',
    description: 'Forever-DM running a five-year megacampaign every Sunday.',
  },
  {
    username: 'NaraIolan',
    email: 'nara.iolan@dndplanner.demo',
    description: 'Cleric main. Solves most problems with a shovel and divine intervention.',
  },
  {
    username: 'KadeYorrick',
    email: 'kade.yorrick@dndplanner.demo',
    description: 'New to the table. Brings snacks and asks excellent questions.',
  },
];

// --- Demo campaigns ---------------------------------------------------------
// Each campaign references users by their username; the script resolves
// these to ObjectIds at insert time. Members are listed without the owner
// (the owner is implicit).
const CAMPAIGNS = [
  {
    name: 'Embers of Pronubis',
    ownerUsername: 'AriaStoneheart',
    templateId: 'campollano',
    visibility: 'public',
    chapters: [
      'Chapter 1: Outbreak',
      'Chapter 2: Between Worlds',
      'Chapter 3: The Mansion',
      'Chapter 4: Origins',
      'Chapter 5: The Citadel',
      'Chapter 6: Necromancer',
      'Chapter 7: Betrayal',
      'Chapter 8: Outer Rim',
      'Chapter 9: Past, Present and Future',
      'Chapter 10: As heaven in hell',
      'Chapter 11: Pronubis',
      'Chapter 12: The World Beyond',
    ],
    members: [
      { username: 'SeleneDrosk', role: 'co-dm' },
      { username: 'CassiusWren', role: 'player' },
      { username: 'LyraFellfern', role: 'player' },
      { username: 'NaraIolan', role: 'player' },
    ],
  },
  {
    name: 'Coast City Heist',
    ownerUsername: 'CassiusWren',
    templateId: 'resacon',
    visibility: 'public',
    chapters: [
      'Chapter 1: The Party',
      'Chapter 2: Coast City',
      'Chapter 3: Wrestling',
      'Chapter 4: China',
      'Chapter 5: Afterparty',
    ],
    members: [
      { username: 'OrinHollow', role: 'player' },
      { username: 'KadeYorrick', role: 'player' },
    ],
  },
  {
    name: 'The Mansion',
    ownerUsername: 'MiraVexley',
    templateId: 'campollano',
    visibility: 'public',
    chapters: [
      'Chapter 1: Arrival',
      'Chapter 2: The East Wing',
      'Chapter 3: Whispers',
      'Chapter 4: The Cellar',
    ],
    members: [
      { username: 'AriaStoneheart', role: 'player' },
      { username: 'TheoMossgrave', role: 'player' },
      { username: 'BramQuill', role: 'player' },
    ],
  },
  {
    name: 'The Endless War',
    ownerUsername: 'TheoMossgrave',
    templateId: 'guerra',
    visibility: 'public',
    chapters: [
      'Chapter 1: War begins',
      'Chapter 2: War continues',
      'Chapter 3: War just… ends?',
      'Chapter 4: War actually ends',
    ],
    members: [
      { username: 'BramQuill', role: 'co-dm' },
      { username: 'OrinHollow', role: 'player' },
      { username: 'NaraIolan', role: 'player' },
      { username: 'KadeYorrick', role: 'player' },
      { username: 'LyraFellfern', role: 'player' },
    ],
  },
  {
    name: 'Crossed Fates',
    ownerUsername: 'OrinHollow',
    templateId: 'destinos-cruzados',
    visibility: 'public',
    chapters: [
      'Chapter 1: Loss',
      'Chapter 2: Underground',
      'Chapter 3: Stux',
      'Chapter 4: Secret Laboratory',
      'Chapter 5: Across the Sea',
      'Chapter 6: Ouroboros',
      'Chapter 7: Destiny',
    ],
    members: [
      { username: 'MiraVexley', role: 'co-dm' },
      { username: 'CassiusWren', role: 'player' },
      { username: 'SeleneDrosk', role: 'player' },
    ],
  },
  // Private campaign so the presenter can also show the visibility toggle.
  {
    name: 'Bram\'s Homebrew Sandbox',
    ownerUsername: 'BramQuill',
    templateId: 'blank',
    visibility: 'private',
    chapters: [],
    members: [
      { username: 'TheoMossgrave', role: 'player' },
    ],
  },
];

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildChapters(titles) {
  return titles.map((title) => ({
    id: generateId('ch'),
    title,
    events: { blocks: [], connections: [] },
    map: { cells: new Map(), cols: 15, rows: 15 },
  }));
}

async function upsertUser(spec) {
  const existing = await User.findOne({ username: spec.username });
  if (existing) {
    console.log(`  · user exists: ${spec.username}`);
    return existing;
  }
  // The User pre-save hook hashes the password — let it.
  const user = await User.create({
    username: spec.username,
    email: spec.email,
    password: PASSWORD,
    description: spec.description,
    isPrivate: false,
  });
  console.log(`  ✓ created user: ${spec.username}`);
  return user;
}

async function upsertCampaign(spec, usersByUsername) {
  const owner = usersByUsername.get(spec.ownerUsername);
  if (!owner) {
    console.warn(`  ! skipped campaign "${spec.name}": owner not found`);
    return null;
  }
  const existing = await Campaign.findOne({
    ownerId: owner._id,
    name: spec.name,
  });
  if (existing) {
    console.log(`  · campaign exists: ${spec.name}`);
    return existing;
  }
  const members = spec.members
    .map((m) => {
      const u = usersByUsername.get(m.username);
      if (!u) {
        console.warn(`    ! member skipped (user not found): ${m.username}`);
        return null;
      }
      return {
        userId: u._id,
        role: m.role,
        joinedAt: new Date(),
      };
    })
    .filter(Boolean);

  const campaign = await Campaign.create({
    name: spec.name,
    ownerId: owner._id,
    templateId: spec.templateId,
    visibility: spec.visibility,
    chapters: buildChapters(spec.chapters),
    characters: [],
    members,
    annotations: [],
    revealedSpoilers: [],
  });
  console.log(`  ✓ created campaign: ${spec.name} (owner ${spec.ownerUsername}, ${spec.visibility})`);
  return campaign;
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set. Aborting.');
    process.exit(1);
  }
  console.log('Connecting to MongoDB…');
  await mongoose.connect(uri);
  console.log('Connected.\n');

  try {
    console.log('Seeding users:');
    const usersByUsername = new Map();
    for (const spec of USERS) {
      const u = await upsertUser(spec);
      usersByUsername.set(spec.username, u);
    }

    console.log('\nSeeding campaigns:');
    for (const spec of CAMPAIGNS) {
      await upsertCampaign(spec, usersByUsername);
    }

    console.log('\nDone.');
    console.log(`Demo password for every account: ${PASSWORD}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
