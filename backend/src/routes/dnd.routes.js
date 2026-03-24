const express = require('express');
const router = express.Router();
const { dndService } = require('../services');
const { authMiddleware } = require('../middlewares');

// All routes require authentication
router.use(authMiddleware);

// Monsters
router.get('/monsters', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const data = await dndService.getMonsters(parseInt(limit), parseInt(offset));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/monsters/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ success: true, data: [] });
    }
    const data = await dndService.searchMonsters(q);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/monsters/:index', async (req, res, next) => {
  try {
    const data = await dndService.getMonster(req.params.index);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Spells
router.get('/spells', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const data = await dndService.getSpells(parseInt(limit), parseInt(offset));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/spells/:index', async (req, res, next) => {
  try {
    const data = await dndService.getSpell(req.params.index);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Equipment
router.get('/equipment', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const data = await dndService.getEquipment(parseInt(limit), parseInt(offset));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/equipment/:index', async (req, res, next) => {
  try {
    const data = await dndService.getEquipmentItem(req.params.index);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Classes
router.get('/classes', async (req, res, next) => {
  try {
    const data = await dndService.getClasses();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/classes/:index', async (req, res, next) => {
  try {
    const data = await dndService.getClass(req.params.index);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Races
router.get('/races', async (req, res, next) => {
  try {
    const data = await dndService.getRaces();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/races/:index', async (req, res, next) => {
  try {
    const data = await dndService.getRace(req.params.index);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Conditions
router.get('/conditions', async (req, res, next) => {
  try {
    const data = await dndService.getConditions();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/conditions/:index', async (req, res, next) => {
  try {
    const data = await dndService.getCondition(req.params.index);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
