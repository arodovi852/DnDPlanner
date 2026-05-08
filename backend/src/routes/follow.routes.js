const express = require('express');
const router = express.Router();
const { followController } = require('../controllers');
const { authMiddleware } = require('../middlewares');

/**
 * @openapi
 * tags:
 *   name: Follows
 *   description: Social-graph (follow / unfollow) endpoints.
 */

router.use(authMiddleware);

/**
 * @openapi
 * /follows/me/following:
 *   get:
 *     summary: List users the current user follows
 *     tags: [Follows]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: An array of public user objects.
 */
router.get('/me/following', followController.getFollowing);

/**
 * @openapi
 * /follows/me/followers:
 *   get:
 *     summary: List the followers of the current user
 *     tags: [Follows]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: An array of public user objects.
 */
router.get('/me/followers', followController.getFollowers);

/**
 * @openapi
 * /follows/{id}:
 *   post:
 *     summary: Follow another user
 *     tags: [Follows]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *   delete:
 *     summary: Unfollow a user
 *     tags: [Follows]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 */
router.post('/:id', followController.followUser);
router.delete('/:id', followController.unfollowUser);

module.exports = router;
