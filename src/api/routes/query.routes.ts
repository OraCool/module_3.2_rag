/**
 * Query routes for RAG pipeline
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { RAGPipeline } from "../../services/rag/RAGPipeline.js";
import { QueryResponse } from "../../types/api.types.js";
import { asyncHandler, APIError } from "../middleware/errorHandler.js";
import { logger } from "../../utils/logger.js";

const router = Router();

// Validation schema for query requests
const querySchema = z.object({
  query: z.string().min(1, "Query cannot be empty").max(500, "Query too long"),
  k: z.number().int().positive().max(20).optional(),
  withReranking: z.boolean().optional(),
});

// Singleton RAG pipeline instance
let ragPipeline: RAGPipeline | null = null;

function getRAGPipeline(): RAGPipeline {
  ragPipeline ??= new RAGPipeline();
  return ragPipeline;
}

/**
 * POST /api/query
 * Execute RAG query
 */
router.post(
  "/query",
  asyncHandler(async (req: Request, res: Response) => {
    logger.info("[Query API] Received query request");

    // Validate request body
    const validation = querySchema.safeParse(req.body);

    if (!validation.success) {
      throw new APIError(400, "Invalid request body", validation.error.errors);
    }

    const { query, k, withReranking } = validation.data;

    // Execute RAG pipeline
    const pipeline = getRAGPipeline();
    const result: QueryResponse = await pipeline.query(query, {
      k,
      withReranking,
    });

    res.json(result);
  }),
);

/**
 * POST /api/query/compare
 * Compare results with and without reranking
 * Useful for evaluating reranking effectiveness
 */
router.post(
  "/query/compare",
  asyncHandler(async (req: Request, res: Response) => {
    logger.info("[Query API] Received comparison query request");

    const { query } = z.object({ query: z.string().min(1) }).parse(req.body);

    const pipeline = getRAGPipeline();
    const comparison = await pipeline.queryWithComparison(query);

    res.json(comparison);
  }),
);

/**
 * POST /api/query/batch
 * Execute multiple queries in batch
 * Limited to 10 queries per request
 */
router.post(
  "/query/batch",
  asyncHandler(async (req: Request, res: Response) => {
    logger.info("[Query API] Received batch query request");

    const batchSchema = z.object({
      queries: z
        .array(z.string().min(1))
        .max(10, "Maximum 10 queries per batch"),
      k: z.number().int().positive().max(20).optional(),
      withReranking: z.boolean().optional(),
    });

    const validation = batchSchema.safeParse(req.body);

    if (!validation.success) {
      throw new APIError(400, "Invalid request body", validation.error.errors);
    }

    const { queries, k, withReranking } = validation.data;

    // Execute queries in parallel
    const pipeline = getRAGPipeline();
    const results = await Promise.all(
      queries.map((query) => pipeline.query(query, { k, withReranking })),
    );

    res.json({
      queries: queries.length,
      results,
      totalTimeMs: results.reduce((sum, r) => sum + r.metadata.totalTimeMs, 0),
    });
  }),
);

export default router;
