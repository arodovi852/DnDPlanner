const axios = require('axios');
const { dndApiBaseUrl } = require('../config');

const dndApi = axios.create({
  baseURL: dndApiBaseUrl,
  timeout: 10000,
});

// Cache for API responses (simple in-memory cache)
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

const getCached = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// Get all monsters
const getMonsters = async (limit = 50, offset = 0) => {
  const cacheKey = `monsters:${limit}:${offset}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const response = await dndApi.get('/monsters');
  const results = response.data.results.slice(offset, offset + limit);

  setCache(cacheKey, { results, count: response.data.count });
  return { results, count: response.data.count };
};

// Get monster by index
const getMonster = async (index) => {
  const cacheKey = `monster:${index}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const response = await dndApi.get(`/monsters/${index}`);
  setCache(cacheKey, response.data);
  return response.data;
};

// Search monsters by name
const searchMonsters = async (query) => {
  const cacheKey = `monsters:search:${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const response = await dndApi.get('/monsters');
  const results = response.data.results.filter((m) =>
    m.name.toLowerCase().includes(query.toLowerCase())
  );

  setCache(cacheKey, results);
  return results;
};

// Get all spells
const getSpells = async (limit = 50, offset = 0) => {
  const cacheKey = `spells:${limit}:${offset}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const response = await dndApi.get('/spells');
  const results = response.data.results.slice(offset, offset + limit);

  setCache(cacheKey, { results, count: response.data.count });
  return { results, count: response.data.count };
};

// Get spell by index
const getSpell = async (index) => {
  const cacheKey = `spell:${index}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const response = await dndApi.get(`/spells/${index}`);
  setCache(cacheKey, response.data);
  return response.data;
};

// Get all equipment
const getEquipment = async (limit = 50, offset = 0) => {
  const cacheKey = `equipment:${limit}:${offset}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const response = await dndApi.get('/equipment');
  const results = response.data.results.slice(offset, offset + limit);

  setCache(cacheKey, { results, count: response.data.count });
  return { results, count: response.data.count };
};

// Get equipment by index
const getEquipmentItem = async (index) => {
  const cacheKey = `equipment:${index}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const response = await dndApi.get(`/equipment/${index}`);
  setCache(cacheKey, response.data);
  return response.data;
};

// Get all classes
const getClasses = async () => {
  const cacheKey = 'classes';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const response = await dndApi.get('/classes');
  setCache(cacheKey, response.data.results);
  return response.data.results;
};

// Get class by index
const getClass = async (index) => {
  const cacheKey = `class:${index}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const response = await dndApi.get(`/classes/${index}`);
  setCache(cacheKey, response.data);
  return response.data;
};

// Get all races
const getRaces = async () => {
  const cacheKey = 'races';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const response = await dndApi.get('/races');
  setCache(cacheKey, response.data.results);
  return response.data.results;
};

// Get race by index
const getRace = async (index) => {
  const cacheKey = `race:${index}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const response = await dndApi.get(`/races/${index}`);
  setCache(cacheKey, response.data);
  return response.data;
};

// Get conditions
const getConditions = async () => {
  const cacheKey = 'conditions';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const response = await dndApi.get('/conditions');
  setCache(cacheKey, response.data.results);
  return response.data.results;
};

// Get condition by index
const getCondition = async (index) => {
  const cacheKey = `condition:${index}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const response = await dndApi.get(`/conditions/${index}`);
  setCache(cacheKey, response.data);
  return response.data;
};

module.exports = {
  getMonsters,
  getMonster,
  searchMonsters,
  getSpells,
  getSpell,
  getEquipment,
  getEquipmentItem,
  getClasses,
  getClass,
  getRaces,
  getRace,
  getConditions,
  getCondition,
};
