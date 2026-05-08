const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

/**
 * OpenAPI 3.0 specification builder.
 *
 * The spec is assembled from JSDoc `@openapi` comments in route files. The
 * resulting object is served at `/api/docs/openapi.json` and rendered by
 * swagger-ui-express at `/api/docs`.
 */
const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'DnDPlanner API',
      version: '1.0.0',
      description:
        'REST API powering the DnDPlanner campaign manager. ' +
        'All write operations require a Bearer JWT in the Authorization header.',
      contact: {
        name: 'Alberto Rodríguez',
      },
      license: {
        name: 'ISC',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'Default server (current host)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            code: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            avatar: { type: 'string', nullable: true },
            description: { type: 'string' },
            isPrivate: { type: 'boolean' },
            role: { type: 'string', enum: ['user', 'admin'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
      },
    },
  },
  apis: [
    path.join(__dirname, '..', 'routes', '*.js'),
    path.join(__dirname, '..', 'controllers', '*.js'),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
