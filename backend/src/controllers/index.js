/**
 * Controllers barrel.
 *
 * NOTE: Chapter / Event / Map / Character controllers have been removed
 * because those entities now live inside the Campaign document. Mutations
 * to chapters, characters or maps go through the campaign update
 * endpoint (PUT /api/campaigns/:id) or the dedicated nested members
 * endpoints in `campaign.controller.js`.
 */
const authController = require('./auth.controller');
const campaignController = require('./campaign.controller');
const followController = require('./follow.controller');

module.exports = {
  authController,
  campaignController,
  followController,
};
