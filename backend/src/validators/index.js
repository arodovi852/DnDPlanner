/**
 * Validators barrel.
 *
 * NOTE: Chapter / Event / Map / Character validators have been removed
 * because those entities are now embedded inside the Campaign document
 * and validated by Mongoose schema rules in `models/Campaign.js`.
 */
const authValidators = require('./auth.validator');
const campaignValidators = require('./campaign.validator');

module.exports = {
  ...authValidators,
  ...campaignValidators,
};
