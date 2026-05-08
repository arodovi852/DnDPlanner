const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const campaignRoutes = require('./campaign.routes');
const dndRoutes = require('./dnd.routes');
const uploadRoutes = require('./upload.routes');
const followRoutes = require('./follow.routes');

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Liveness probe
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API is up.
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'DnDPlanner API is running',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/dnd', dndRoutes);
router.use('/upload', uploadRoutes);
router.use('/follows', followRoutes);

module.exports = router;
