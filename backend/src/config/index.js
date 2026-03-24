const connectDB = require('./database');
const jwtConfig = require('./jwt');
const cloudinary = require('./cloudinary');

module.exports = {
  connectDB,
  jwtConfig,
  cloudinary,

  // Server config
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // CORS config
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

  // External APIs
  dndApiBaseUrl: process.env.DND_API_BASE_URL || 'https://www.dnd5eapi.co/api',
};
