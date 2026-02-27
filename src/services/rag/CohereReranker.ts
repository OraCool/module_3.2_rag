/**
 * Cohere Reranker Service (Stage 2 of RAG Pipeline)
 * Re-scores candidates using Cohere's rerank API for improved precision
 */

import { CohereClient } from 'cohere-ai';
import { SearchResult } from '../../types/paper.types.js';
import { logger, logPerformance } from '../../utils/logger.js';
import { env, isCohereEnabled } from '../../config/env.js';

/**
 * Rerank options
 */
export interface RerankOptions {
  topK?: number; // Number of top results to return after reranking
  model?: string; // Cohere rerank model (default: rerank-english-v2.0)
}

/**
 * Reranked result with updated relevance score
 */
export interface RerankResult extends SearchResult {
  rerankScore: number; // Rerank relevance score (0-1)
  originalScore: number; // Original vector search score
}

/**
 * CohereReranker handles Stage 2: reranking for precision
 */
export class CohereReranker {
  private readonly client: CohereClient | null = null;
  private readonly enabled: boolean;

  constructor() {
    this.enabled = isCohereEnabled();

    if (this.enabled) {
      this.client = new CohereClient({
        token: env.COHERE_API_KEY,
      });
      logger.info('CohereReranker initialized');
    } else {
      logger.warn('CohereReranker disabled (no API key provided)');
    }
  }

  /**
   * Rerank search results for improved precision
   * @param query User's original query
   * @param candidates Results from Stage 1 (vector search)
   * @param options Rerank options
   * @returns Reranked and sorted results
   */
  async rerank(
    query: string,
    candidates: SearchResult[],
    options: RerankOptions = {}
  ): Promise<RerankResult[]> {
    const topK = options.topK || env.RERANK_TOP_K;

    // If Cohere is disabled, return original results (fallback)
    if (!this.enabled || !this.client) {
      logger.warn('[Stage 2] Cohere disabled, skipping reranking');
      return this.fallbackToOriginalScores(candidates, topK);
    }

    if (candidates.length === 0) {
      return [];
    }

    const startTime = Date.now();
    logger.info(`[Stage 2] Reranking ${candidates.length} candidates (topK=${topK})`);

    try {
      // Prepare documents for reranking
      // Use paper title + chunk content for best relevance
      const documents = candidates.map(candidate => {
        return `${candidate.paper.title}\n\n${candidate.chunkContent}`;
      });

      // Call Cohere Rerank API
      const response = await this.client.v2.rerank({
        model: options.model || 'rerank-english-v3.0',
        query,
        documents,
        topN: topK,
      });

      // Map rerank results back to original candidates
      const rerankedResults: RerankResult[] = response.results.map(result => {
        const originalCandidate = candidates[result.index];
        if (!originalCandidate) {
          throw new Error(`Invalid rerank result index: ${result.index}`);
        }

        return {
          ...originalCandidate,
          rerankScore: result.relevanceScore,
          originalScore: originalCandidate.score,
          score: result.relevanceScore, // Update main score with rerank score
        };
      });

      // Sort by rerank score (descending)
      rerankedResults.sort((a, b) => b.rerankScore - a.rerankScore);

      const durationMs = Date.now() - startTime;
      logPerformance('Reranking', durationMs);
      logger.info(`[Stage 2] Reranked to top ${rerankedResults.length} results`);

      // Log score improvements
      if (rerankedResults.length > 0) {
        const avgOriginal = rerankedResults.reduce((sum, r) => sum + r.originalScore, 0) / rerankedResults.length;
        const avgRerank = rerankedResults.reduce((sum, r) => sum + r.rerankScore, 0) / rerankedResults.length;
        logger.debug(`[Stage 2] Average score: ${avgOriginal.toFixed(3)} → ${avgRerank.toFixed(3)}`);
      }

      return rerankedResults;
    } catch (error) {
      logger.error('[Stage 2] Reranking failed:', error);

      // Check if it's a rate limit error
      if (error instanceof Error && error.message.includes('rate limit')) {
        logger.warn('[Stage 2] Cohere rate limit reached, falling back to vector search scores');
      } else if (error instanceof Error && error.message.includes('unauthorized')) {
        logger.error('[Stage 2] Cohere API authentication failed, check COHERE_API_KEY');
      }

      // Fallback to original scores
      return this.fallbackToOriginalScores(candidates, topK);
    }
  }

  /**
   * Fallback strategy when reranking fails or is disabled
   * Simply returns top K candidates based on original vector search scores
   */
  private fallbackToOriginalScores(
    candidates: SearchResult[],
    topK: number
  ): RerankResult[] {
    return candidates
      .slice(0, topK)
      .map(candidate => ({
        ...candidate,
        rerankScore: candidate.score,
        originalScore: candidate.score,
      }));
  }

  /**
   * Check if Cohere reranking is available
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Health check: verify Cohere API is accessible
   */
  async healthCheck(): Promise<boolean> {
    if (!this.enabled || !this.client) {
      return false;
    }

    try {
      // Simple rerank test
      await this.client.v2.rerank({
        model: 'rerank-english-v3.0',
        query: 'test',
        documents: ['test document'],
        topN: 1,
      });
      return true;
    } catch (error) {
      logger.error('Cohere health check failed:', error);
      return false;
    }
  }
}
