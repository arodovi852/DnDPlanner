/**
 * Database seeder.
 *
 * Creates seed data that must be present in every environment
 * (development, staging, production). Called automatically by
 * server.js after the DB connection is established, so it always
 * runs on startup — every operation is idempotent (upsert / findOrCreate).
 *
 * Current seeds
 * ─────────────
 *  • "Testing" user  — presentation fallback account.
 *    Credentials: username=Testing  password=1234QWer
 *    The User pre-save hook hashes the password automatically.
 *    Uses findOneAndUpdate + upsert so re-runs are safe.
 */

const User = require('../models/User');

async function seedTestingUser() {
  const username = 'Testing';
  const existing = await User.findOne({ username });
  if (existing) {
    // Already seeded — nothing to do.
    return;
  }

  await User.create({
    username,
    email: 'testing@dndplanner.local',
    password: '1234QWer',
    description: 'Cuenta de prueba para presentaciones.',
  });

  console.log('[seed] Testing user created (testing@dndplanner.local / 1234QWer)');
}

async function runSeed() {
  try {
    await seedTestingUser();
  } catch (err) {
    // Log but never crash the server over a seed failure.
    console.error('[seed] Seed failed (non-fatal):', err.message);
  }
}

module.exports = runSeed;
