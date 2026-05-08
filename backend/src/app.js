/**
 * Express app factory.
 *
 * Building the app via a function (rather than as a side-effect of
 * loading server.js) lets the test suite mount it without spinning up
 * the HTTP server, MongoDB connection or Socket.IO. server.js is the
 * production entry point that starts the database and HTTP listener.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const config = require('./config');
const swaggerSpec = require('./config/swagger');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares');

function buildApp({ enableRateLimit = true } = {}) {
  const app = express();

  app.use(helmet());

  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );

  if (enableRateLimit) {
    const limiter = rateLimit({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMaxRequests,
      message: {
        success: false,
        message: 'Too many requests, please try again later.',
      },
    });
    app.use('/api', limiter);
  }

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // OpenAPI documentation.
  app.get('/api/docs/openapi.json', (req, res) => res.json(swaggerSpec));
  app.use(
    '/api/docs',
    (req, res, next) => {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self' 'unsafe-inline' data:"
      );
      next();
    },
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, { customSiteTitle: 'DnDPlanner API Docs' })
  );

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = buildApp;
