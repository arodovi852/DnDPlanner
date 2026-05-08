/**
 * Model registry.
 *
 * NOTE: Chapters, Characters, Maps and Events live *embedded* inside the
 * `Campaign` document — they don't have their own collection. Importing
 * them here is intentional (their schemas are still referenced by tests
 * and migrations) but they're not exported as part of the public API.
 */
const User = require('./User');
const Campaign = require('./Campaign');
const Follow = require('./Follow');

module.exports = {
  User,
  Campaign,
  Follow,
};
