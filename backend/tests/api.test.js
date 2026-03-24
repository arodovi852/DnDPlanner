const request = require('supertest');
const express = require('express');

// Simple app for testing
const app = express();

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'DnDPlanner API is running',
  });
});

describe('Health Check', () => {
  it('should return health status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('DnDPlanner API is running');
  });
});

describe('Utils', () => {
  const { rollDice, calculateAbilityModifier, slugify } = require('../src/utils');

  describe('rollDice', () => {
    it('should roll dice with correct notation', () => {
      const result = rollDice('2d6+3');

      expect(result).toHaveProperty('notation', '2d6+3');
      expect(result).toHaveProperty('rolls');
      expect(result.rolls).toHaveLength(2);
      expect(result).toHaveProperty('modifier', 3);
      expect(result).toHaveProperty('total');
    });

    it('should return null for invalid notation', () => {
      const result = rollDice('invalid');
      expect(result).toBeNull();
    });
  });

  describe('calculateAbilityModifier', () => {
    it('should calculate correct modifiers', () => {
      expect(calculateAbilityModifier(10)).toBe(0);
      expect(calculateAbilityModifier(12)).toBe(1);
      expect(calculateAbilityModifier(8)).toBe(-1);
      expect(calculateAbilityModifier(20)).toBe(5);
    });
  });

  describe('slugify', () => {
    it('should create valid slugs', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Test 123!')).toBe('test-123');
      expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
    });
  });
});
