require('dotenv').config();

const { createServer } = require('http');
const { Server } = require('socket.io');

const config = require('./config');
const buildApp = require('./app');

/**
 * Production entry point.
 *
 * Boots the Express app (from `app.js`), wraps it in an HTTP server,
 * attaches Socket.IO for real-time events, and connects to MongoDB.
 * The Express app itself is built in `app.js` so that the test suite
 * can mount it without DB/HTTP side effects.
 */

const app = buildApp();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join:campaign', (campaignId) => {
    socket.join(`campaign:${campaignId}`);
    console.log(`Socket ${socket.id} joined campaign ${campaignId}`);
  });

  socket.on('leave:campaign', (campaignId) => {
    socket.leave(`campaign:${campaignId}`);
    console.log(`Socket ${socket.id} left campaign ${campaignId}`);
  });

  socket.on('map:update', (data) => {
    socket.to(`campaign:${data.campaignId}`).emit('map:updated', data);
  });

  socket.on('combat:update', (data) => {
    socket.to(`campaign:${data.campaignId}`).emit('combat:updated', data);
  });

  socket.on('visibility:toggle', (data) => {
    socket.to(`campaign:${data.campaignId}`).emit('visibility:changed', data);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

app.set('io', io);

const startServer = async () => {
  try {
    await config.connectDB();
    httpServer.listen(config.port, () => {
      console.log(`
========================================
  DnDPlanner API Server
========================================
  Environment: ${config.nodeEnv}
  Port: ${config.port}
  API URL: http://localhost:${config.port}/api
  Health Check: http://localhost:${config.port}/api/health
  API Docs: http://localhost:${config.port}/api/docs
========================================
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  httpServer.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => {
    console.log('Process terminated.');
    process.exit(0);
  });
});

startServer();

module.exports = { app, httpServer, io };
