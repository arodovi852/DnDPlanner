const authValidators = require('./auth.validator');
const campaignValidators = require('./campaign.validator');
const chapterValidators = require('./chapter.validator');
const eventValidators = require('./event.validator');
const mapValidators = require('./map.validator');
const characterValidators = require('./character.validator');

module.exports = {
  ...authValidators,
  ...campaignValidators,
  ...chapterValidators,
  ...eventValidators,
  ...mapValidators,
  ...characterValidators,
};
