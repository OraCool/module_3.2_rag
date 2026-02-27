/**
 * Health check routes
 */

import { Router, Request, Response } from 'express';
import { HealthResponse } from '../../types/api.types.js';
import { RAGPipeline } from '../../services/rag/RAGPipeline.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// Package version (in a real app, read from package.json)
const VERSION = '1.0.0';

/**
 * GET /api/health
 * Health check endpoint
 */
router.get(
  '/health',
  asyncHandler(async (_req: Request, res: Response) => {
    logger.info('[Health Check] Checking service health...');

    // Check RAG pipeline components
    const ragPipeline = new RAGPipeline();
    const health = await ragPipeline.healthCheck();

    const response: HealthResponse = {
      status: health.overall ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        chromadb: health.vectorSearch ? 'connected' : 'disconnected',
        openai: health.vectorSearch ? 'connected' : 'disconnected',
        cohere: health.reranker ? 'connected' : 'unavailable',
      },
      version: VERSION,
    };

    const statusCode = health.overall ? 200 : 503;
    res.status(statusCode).json(response);
  })
);

/**
 * GET /api/ping
 * Simple ping endpoint
 */
router.get('/ping', (_req: Request, res: Response) => {
  res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

export default router;
