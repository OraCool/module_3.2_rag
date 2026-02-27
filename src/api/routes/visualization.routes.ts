/**
 * Visualization data routes
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { VisualizationService } from '../../services/visualization/VisualizationService.js';
import { VisualizationResponse } from '../../types/api.types.js';
import { asyncHandler, APIError } from '../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// Singleton visualization service
let visualizationService: VisualizationService | null = null;

function getVisualizationService(): VisualizationService {
  if (!visualizationService) {
    visualizationService = new VisualizationService();
  }
  return visualizationService;
}

/**
 * GET /api/visualizations/publication-trends
 * Publication trends over time (line chart)
 */
router.get(
  '/publication-trends',
  asyncHandler(async (_req: Request, res: Response) => {
    logger.info('[Viz API] Publication trends requested');

    const service = getVisualizationService();
    const data = await service.getPublicationTrends();

    const response: VisualizationResponse = {
      type: 'line',
      data,
      generatedAt: new Date().toISOString(),
      cached: true, // Service handles caching internally
    };

    res.json(response);
  })
);

/**
 * GET /api/visualizations/author-network
 * Author collaboration network (force-directed graph)
 * Query param: topN (default: 50)
 */
router.get(
  '/author-network',
  asyncHandler(async (req: Request, res: Response) => {
    const { topN } = z.object({
      topN: z.string().optional().transform(val => val ? parseInt(val, 10) : 50),
    }).parse({ topN: req.query.topN });

    logger.info(`[Viz API] Author network requested (topN=${topN})`);

    const service = getVisualizationService();
    const data = await service.getAuthorCollaborations(topN);

    const response: VisualizationResponse = {
      type: 'network',
      data,
      generatedAt: new Date().toISOString(),
      cached: true,
    };

    res.json(response);
  })
);

/**
 * GET /api/visualizations/topics
 * Topic distribution (word cloud)
 */
router.get(
  '/topics',
  asyncHandler(async (_req: Request, res: Response) => {
    logger.info('[Viz API] Topic distribution requested');

    const service = getVisualizationService();
    const data = await service.getTopicDistribution();

    const response: VisualizationResponse = {
      type: 'wordcloud',
      data,
      generatedAt: new Date().toISOString(),
      cached: true,
    };

    res.json(response);
  })
);

/**
 * GET /api/visualizations/paper-length
 * Paper length distribution (histogram)
 */
router.get(
  '/paper-length',
  asyncHandler(async (_req: Request, res: Response) => {
    logger.info('[Viz API] Paper length distribution requested');

    const service = getVisualizationService();
    const data = await service.getPaperLengthDistribution();

    const response: VisualizationResponse = {
      type: 'histogram',
      data,
      generatedAt: new Date().toISOString(),
      cached: true,
    };

    res.json(response);
  })
);

/**
 * GET /api/visualizations/code-availability
 * Code availability statistics (pie chart)
 */
router.get(
  '/code-availability',
  asyncHandler(async (_req: Request, res: Response) => {
    logger.info('[Viz API] Code availability requested');

    const service = getVisualizationService();
    const data = await service.getCodeAvailability();

    const response: VisualizationResponse = {
      type: 'pie',
      data,
      generatedAt: new Date().toISOString(),
      cached: true,
    };

    res.json(response);
  })
);

/**
 * GET /api/visualizations/top-authors
 * Top authors by publication count (bar chart)
 * Query param: topN (default: 20)
 */
router.get(
  '/top-authors',
  asyncHandler(async (req: Request, res: Response) => {
    const { topN } = z.object({
      topN: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
    }).parse({ topN: req.query.topN });

    logger.info(`[Viz API] Top authors requested (topN=${topN})`);

    const service = getVisualizationService();
    const data = await service.getTopAuthors(topN);

    const response: VisualizationResponse = {
      type: 'bar',
      data,
      generatedAt: new Date().toISOString(),
      cached: true,
    };

    res.json(response);
  })
);

/**
 * POST /api/visualizations/clear-cache
 * Clear visualization cache (admin endpoint)
 */
router.post(
  '/clear-cache',
  asyncHandler(async (_req: Request, res: Response) => {
    logger.info('[Viz API] Cache clear requested');

    const service = getVisualizationService();
    service.clearCache();

    res.json({
      message: 'Visualization cache cleared',
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
