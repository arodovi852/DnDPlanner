// Async handler wrapper to avoid try-catch in every controller
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Generate random string
const generateRandomString = (length = 32) => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Slugify string
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

// Paginate results
const paginate = (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return { skip, limit: parseInt(limit) };
};

// Format pagination response
const paginationResponse = (data, page, limit, total) => {
  return {
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

// Calculate ability modifier (D&D)
const calculateAbilityModifier = (score) => {
  return Math.floor((score - 10) / 2);
};

// Format modifier string
const formatModifier = (modifier) => {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
};

// Roll dice (e.g., "2d6+3")
const rollDice = (notation) => {
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return null;

  const count = parseInt(match[1]);
  const sides = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;

  let total = 0;
  const rolls = [];

  for (let i = 0; i < count; i++) {
    const roll = Math.floor(Math.random() * sides) + 1;
    rolls.push(roll);
    total += roll;
  }

  return {
    notation,
    rolls,
    modifier,
    total: total + modifier,
  };
};

module.exports = {
  asyncHandler,
  generateRandomString,
  slugify,
  paginate,
  paginationResponse,
  calculateAbilityModifier,
  formatModifier,
  rollDice,
};
