/**
 * RAG Pipeline Orchestrator
 * Implements two-stage retrieval: Vector Search → Reranking → Response Generation
 */

import { VectorSearchService } from './VectorSearchService.js';
import { CohereReranker, RerankResult } from './CohereReranker.js';
import { ResponseGenerator } from './ResponseGenerator.js';
import { QueryResponse, QueryMetadata } from '../../types/api.types.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';

/**
 * Options for RAG pipeline execution
 */
export interface RAGOptions {
  k?: number | undefined; // Number of final results (default: RERANK_TOP_K from env)
  candidatesK?: number | undefined; // Number of candidates from Stage 1 (default: VECTOR_SEARCH_K from env)
  withReranking?: boolean | undefined; // Enable/disable Stage 2 reranking (default: true)
  temperature?: number | undefined; // LLM temperature for response generation
}

/**
 * RAGPipeline orchestrates the complete two-stage retrieval process
 */
export class RAGPipeline {
  private readonly vectorSearch: VectorSearchService;
  private readonly reranker: CohereReranker;
  private readonly responseGenerator: ResponseGenerator;

  constructor() {
    this.vectorSearch = new VectorSearchService();
    this.reranker = new CohereReranker();
    this.responseGenerator = new ResponseGenerator();

    logger.info('RAGPipeline initialized');
    logger.info(`  Stage 1 (Vector Search): k=${env.VECTOR_SEARCH_K}`);
    logger.info(`  Stage 2 (Reranking): ${this.reranker.isEnabled() ? 'ENABLED' : 'DISABLED'}, k=${env.RERANK_TOP_K}`);
  }

  /**
   * Execute the complete RAG pipeline
   * @param query User's natural language question
   * @param options Pipeline execution options
   * @returns Query response with answer and citations
   */
  async query(query: string, options: RAGOptions = {}): Promise<QueryResponse> {
    const pipelineStartTime = Date.now();

    logger.info('========================================');
    logger.info(`RAG Pipeline Query: "${query}"`);
    logger.info('========================================');

    // Default options
    const candidatesK = options.candidatesK || env.VECTOR_SEARCH_K;
    const finalK = options.k || env.RERANK_TOP_K;
    const withReranking = options.withReranking !== false; // Default: true

    const metadata: QueryMetadata = {
      retrievalTimeMs: 0,
      rerankTimeMs: undefined,
      generationTimeMs: 0,
      totalTimeMs: 0,
      candidateCount: 0,
      finalCount: 0,
      modelUsed: env.CHAT_MODEL,
    };

    try {
      // ============================================
      // Stage 1: Vector Similarity Search
      // ============================================
      const stage1Start = Date.now();
      const candidates = await this.vectorSearch.search(query, { k: candidatesK });
      metadata.retrievalTimeMs = Date.now() - stage1Start;
      metadata.candidateCount = candidates.length;

      if (candidates.length === 0) {
        logger.warn('No candidates found in vector search');
        return {
          answer: 'I could not find any relevant papers to answer your question. Please try rephrasing or asking about a different topic.',
          sources: [],
          metadata: {
            ...metadata,
            totalTimeMs: Date.now() - pipelineStartTime,
          },
        };
      }

      logger.info(`[Pipeline] Stage 1 complete: ${candidates.length} candidates`);

      // ============================================
      // Stage 2: Reranking (Optional)
      // ============================================
      let finalResults: RerankResult[];

      if (withReranking && this.reranker.isEnabled()) {
        const stage2Start = Date.now();
        finalResults = await this.reranker.rerank(query, candidates, { topK: finalK });
        metadata.rerankTimeMs = Date.now() - stage2Start;
        logger.info(`[Pipeline] Stage 2 complete: ${finalResults.length} results after reranking`);
      } else {
        // Skip reranking, use top K from vector search
        if (!withReranking) {
          logger.info('[Pipeline] Stage 2 skipped: reranking disabled');
        } else {
          logger.warn('[Pipeline] Stage 2 skipped: Cohere not available');
        }

        finalResults = candidates.slice(0, finalK).map(candidate => ({
          ...candidate,
          rerankScore: candidate.score,
          originalScore: candidate.score,
        }));
      }

      metadata.finalCount = finalResults.length;

      // ============================================
      // Stage 3: Response Generation with Citations
      // ============================================
      const stage3Start = Date.now();
      const generatedResponse = await this.responseGenerator.generate(query, finalResults);
      metadata.generationTimeMs = Date.now() - stage3Start;
      metadata.modelUsed = generatedResponse.modelUsed;

      metadata.totalTimeMs = Date.now() - pipelineStartTime;

      logger.info('========================================');
      logger.info('[Pipeline] Complete!');
      logger.info(`  Total time: ${metadata.totalTimeMs}ms`);
      logger.info(`  - Stage 1 (Vector Search): ${metadata.retrievalTimeMs}ms`);
      if (metadata.rerankTimeMs) {
        logger.info(`  - Stage 2 (Reranking): ${metadata.rerankTimeMs}ms`);
      }
      logger.info(`  - Stage 3 (Generation): ${metadata.generationTimeMs}ms`);
      logger.info(`  Sources: ${finalResults.length}`);
      logger.info('========================================');

      return {
        answer: generatedResponse.answer,
        sources: generatedResponse.sources,
        metadata,
      };
    } catch (error) {
      logger.error('[Pipeline] Failed:', error);
      throw new Error(
        `RAG pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute pipeline with comparison between with/without reranking
   * Useful for evaluating reranking effectiveness
   */
  async queryWithComparison(query: string): Promise<{
    withReranking: QueryResponse;
    withoutReranking: QueryResponse;
    improvement: {
      latencyDiff: number;
      sourcesChanged: boolean;
      avgScoreImprovement: number;
    };
  }> {
    logger.info('[Pipeline] Running comparison: with vs without reranking');

    const [withReranking, withoutReranking] = await Promise.all([
      this.query(query, { withReranking: true }),
      this.query(query, { withReranking: false }),
    ]);

    // Calculate improvement metrics
    const latencyDiff = withReranking.metadata.totalTimeMs - withoutReranking.metadata.totalTimeMs;

    const sourcesChanged =
      withReranking.sources[0]?.title !== withoutReranking.sources[0]?.title;

    const avgScoreWith =
      withReranking.sources.reduce((sum, s) => sum + s.relevanceScore, 0) /
      withReranking.sources.length;

    const avgScoreWithout =
      withoutReranking.sources.reduce((sum, s) => sum + s.relevanceScore, 0) /
      withoutReranking.sources.length;

    const avgScoreImprovement = avgScoreWith - avgScoreWithout;

    logger.info('[Pipeline] Comparison complete:');
    logger.info(`  Latency difference: +${latencyDiff}ms (reranking overhead)`);
    logger.info(`  Top source changed: ${sourcesChanged}`);
    logger.info(`  Avg score improvement: +${avgScoreImprovement.toFixed(3)}`);

    return {
      withReranking,
      withoutReranking,
      improvement: {
        latencyDiff,
        sourcesChanged,
        avgScoreImprovement,
      },
    };
  }

  /**
   * Health check for all pipeline components
   */
  async healthCheck(): Promise<{
    vectorSearch: boolean;
    reranker: boolean;
    overall: boolean;
  }> {
    logger.info('[Pipeline] Running health checks...');

    const [vectorSearchOk, rerankerOk] = await Promise.all([
      this.vectorSearch.healthCheck(),
      this.reranker.healthCheck(),
    ]);

    const overall = vectorSearchOk; // Vector search is critical, reranker is optional

    logger.info(`[Pipeline] Health check results:`);
    logger.info(`  Vector Search: ${vectorSearchOk ? '✓' : '✗'}`);
    logger.info(`  Reranker: ${rerankerOk ? '✓' : '✗ (optional)'}`);
    logger.info(`  Overall: ${overall ? '✓' : '✗'}`);

    return {
      vectorSearch: vectorSearchOk,
      reranker: rerankerOk,
      overall,
    };
  }
}
