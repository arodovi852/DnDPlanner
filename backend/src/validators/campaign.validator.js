const { body, param } = require('express-validator');

/**
 * Validators for the `/api/campaigns` routes.
 *
 * Validation here is intentionally permissive on body shape because the
 * full-document update endpoint accepts the entire denormalised tree.
 * We only enforce the top-level invariants (id format, name length,
 * visibility enum). Nested validation lives in the Mongoose schemas.
 */

const createCampaignValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('templateId').optional({ nullable: true }).isString(),
  body('visibility')
    .optional()
    .isIn(['public', 'private'])
    .withMessage('Visibility must be public or private'),
];

const updateCampaignValidation = [
  param('id').isMongoId().withMessage('Invalid campaign ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('visibility')
    .optional()
    .isIn(['public', 'private'])
    .withMessage('Visibility must be public or private'),
  body('chapters').optional().isArray(),
  body('characters').optional().isArray(),
  body('members').optional().isArray(),
  body('annotations').optional().isArray(),
  body('revealedSpoilers').optional().isArray(),
];

const campaignIdValidation = [
  param('id').isMongoId().withMessage('Invalid campaign ID'),
];

module.exports = {
  createCampaignValidation,
  updateCampaignValidation,
  campaignIdValidation,
};
