require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

const config = require('./config');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares');

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});
app.use('/api', limiter);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api', routes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join campaign room
  socket.on('join:campaign', (campaignId) => {
    socket.join(`campaign:${campaignId}`);
    console.log(`Socket ${socket.id} joined campaign ${campaignId}`);
  });

  // Leave campaign room
  socket.on('leave:campaign', (campaignId) => {
    socket.leave(`campaign:${campaignId}`);
    console.log(`Socket ${socket.id} left campaign ${campaignId}`);
  });

  // Map updates
  socket.on('map:update', (data) => {
    socket.to(`campaign:${data.campaignId}`).emit('map:updated', data);
  });

  // Combat updates
  socket.on('combat:update', (data) => {
    socket.to(`campaign:${data.campaignId}`).emit('combat:updated', data);
  });

  // Chapter/Event visibility toggle
  socket.on('visibility:toggle', (data) => {
    socket.to(`campaign:${data.campaignId}`).emit('visibility:changed', data);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Make io accessible in routes
app.set('io', io);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await config.connectDB();

    // Start HTTP server
    httpServer.listen(config.port, () => {
      console.log(`
========================================
  DnDPlanner API Server
========================================
  Environment: ${config.nodeEnv}
  Port: ${config.port}
  API URL: http://localhost:${config.port}/api
  Health Check: http://localhost:${config.port}/api/health
========================================
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  httpServer.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => {
    console.log('Process terminated.');
    process.exit(0);
  });
});

// Start the server
startServer();

module.exports = { app, httpServer, io };
