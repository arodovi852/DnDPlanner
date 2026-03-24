const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const campaignRoutes = require('./campaign.routes');
const chapterRoutes = require('./chapter.routes');
const eventRoutes = require('./event.routes');
const mapRoutes = require('./map.routes');
const characterRoutes = require('./character.routes');
const dndRoutes = require('./dnd.routes');
const uploadRoutes = require('./upload.routes');

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'DnDPlanner API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/chapters', chapterRoutes);
router.use('/events', eventRoutes);
router.use('/maps', mapRoutes);
router.use('/characters', characterRoutes);
router.use('/dnd', dndRoutes);
router.use('/upload', uploadRoutes);

module.exports = router;
