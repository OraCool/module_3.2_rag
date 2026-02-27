/**
 * Main Express server
 * Entry point for the JMLR RAG API
 */

import express, { Express } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './api/middleware/errorHandler.js';
import { requestLogger } from './api/middleware/requestLogger.js';

// Import routes
import healthRoutes from './api/routes/health.routes.js';
import queryRoutes from './api/routes/query.routes.js';
import visualizationRoutes from './api/routes/visualization.routes.js';

/**
 * Create and configure Express application
 */
function createApp(): Express {
  const app = express();

  // ============================================
  // Global Middleware
  // ============================================

  // Enable CORS for frontend
  app.use(cors({
    origin: env.NODE_ENV === 'development'
      ? ['http://localhost:5173', 'http://localhost:3000']
      : [], // Add production origins here
    credentials: true,
  }));

  // Parse JSON request bodies
  app.use(express.json({ limit: '10mb' }));

  // Parse URL-encoded request bodies
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use(requestLogger);

  // ============================================
  // API Routes
  // ============================================

  // Health check routes
  app.use('/api', healthRoutes);

  // Query routes (RAG pipeline)
  app.use('/api', queryRoutes);

  // Visualization routes
  app.use('/api/visualizations', visualizationRoutes);

  // ============================================
  // Error Handling
  // ============================================

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
async function startServer() {
  try {
    logger.info('========================================');
    logger.info('JMLR RAG API Server');
    logger.info('========================================');
    logger.info(`Environment: ${env.NODE_ENV}`);
    logger.info(`Port: ${env.PORT}`);
    logger.info(`OpenAI Model: ${env.CHAT_MODEL}`);
    logger.info(`Embedding Model: ${env.EMBEDDING_MODEL}`);
    logger.info(`Cohere Enabled: ${env.COHERE_API_KEY ? 'Yes' : 'No'}`);
    logger.info('========================================\n');

    // Create Express app
    const app = createApp();

    // Start listening
    app.listen(env.PORT, () => {
      logger.info(`✓ Server started successfully`);
      logger.info(`✓ Listening on http://localhost:${env.PORT}`);
      logger.info(`\nAPI Endpoints:`);
      logger.info(`  GET  /api/health`);
      logger.info(`  GET  /api/ping`);
      logger.info(`  POST /api/query`);
      logger.info(`  POST /api/query/compare`);
      logger.info(`  POST /api/query/batch`);
      logger.info(`  GET  /api/visualizations/publication-trends`);
      logger.info(`  GET  /api/visualizations/author-network`);
      logger.info(`  GET  /api/visualizations/topics`);
      logger.info(`  GET  /api/visualizations/paper-length`);
      logger.info(`  GET  /api/visualizations/code-availability`);
      logger.info(`  GET  /api/visualizations/top-authors`);
      logger.info('\nReady to accept requests! 🚀');
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('\nGracefully shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('\nGracefully shutting down...');
  process.exit(0);
});

// Start the server
startServer();
