/**
 * Vector Search Service (Stage 1 of RAG Pipeline)
 * Performs similarity search using ChromaDB
 */

import { Chroma } from '@langchain/community/vectorstores/chroma';
import { getVectorStore } from '../../config/langchain.config.js';
import { SearchResult, ChunkMetadata } from '../../types/paper.types.js';
import { logger, logPerformance } from '../../utils/logger.js';
import { env } from '../../config/env.js';

/**
 * Options for vector search
 */
export interface VectorSearchOptions {
  k?: number; // Number of results to return (default: from env.VECTOR_SEARCH_K)
  filter?: Record<string, any>; // Optional metadata filter (e.g., { year: 2020 })
  includeMetadata?: boolean; // Include full metadata in results (default: true)
}

/**
 * VectorSearchService handles Stage 1: similarity search
 */
export class VectorSearchService {
  private vectorStore: Chroma | null = null;

  constructor() {
    logger.info('VectorSearchService initialized');
  }

  /**
   * Lazy load vector store (only when first needed)
   */
  private async getStore(): Promise<Chroma> {
    if (!this.vectorStore) {
      logger.info('Loading vector store...');
      this.vectorStore = await getVectorStore();
    }
    return this.vectorStore;
  }

  /**
   * Perform similarity search on the query
   * @param query User's natural language query
   * @param options Search options
   * @returns Array of search results with relevance scores
   */
  async search(
    query: string,
    options: VectorSearchOptions = {}
  ): Promise<SearchResult[]> {
    const startTime = Date.now();
    const k = options.k || env.VECTOR_SEARCH_K;

    logger.info(`[Stage 1] Vector search: "${query}" (k=${k})`);

    try {
      const store = await this.getStore();

      // Perform similarity search with scores
      const results = await store.similaritySearchWithScore(query, k, options.filter);

      const searchResults: SearchResult[] = results.map(([doc, score]) => {
        const metadata = doc.metadata as ChunkMetadata;

        return {
          paper: {
            title: metadata.title,
            authors: metadata.authors,
            year: metadata.year,
            pages: metadata.pages,
            link: metadata.link,
            code: metadata.code,
          },
          score: this.normalizeScore(score),
          chunkContent: doc.pageContent,
        };
      });

      const durationMs = Date.now() - startTime;
      logPerformance('Vector Search', durationMs);
      logger.info(`[Stage 1] Found ${searchResults.length} candidates`);

      return searchResults;
    } catch (error) {
      logger.error('[Stage 1] Vector search failed:', error);
      throw new Error(`Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Normalize ChromaDB's distance score to a 0-1 similarity score
   * ChromaDB returns distance (lower is better), we convert to similarity (higher is better)
   * @param distance Distance score from ChromaDB
   * @returns Normalized similarity score (0-1)
   */
  private normalizeScore(distance: number): number {
    // ChromaDB uses cosine distance, convert to cosine similarity
    // Cosine similarity = 1 - cosine distance
    // Clamp between 0 and 1
    const similarity = 1 - distance;
    return Math.max(0, Math.min(1, similarity));
  }

  /**
   * Search with custom filter (e.g., by year, author)
   * @param query User query
   * @param filter Metadata filter
   * @param k Number of results
   */
  async searchWithFilter(
    query: string,
    filter: Record<string, any>,
    k?: number
  ): Promise<SearchResult[]> {
    return this.search(query, { k, filter });
  }

  /**
   * Get similar papers to a given paper title
   * Useful for "related papers" feature
   * @param paperTitle Title of the paper to find similar papers for
   * @param k Number of similar papers to return
   */
  async findSimilarPapers(paperTitle: string, k: number = 5): Promise<SearchResult[]> {
    // Search for the paper title itself
    const results = await this.search(paperTitle, { k: k + 1 });

    // Filter out the exact paper (if found) and return the rest
    return results.filter(result =>
      result.paper.title.toLowerCase() !== paperTitle.toLowerCase()
    ).slice(0, k);
  }

  /**
   * Get papers by year range
   * @param startYear Start year (inclusive)
   * @param endYear End year (inclusive)
   * @param limit Maximum number of papers
   */
  async getPapersByYearRange(
    startYear: number,
    endYear: number,
    limit: number = 100
  ): Promise<SearchResult[]> {
    // This is a workaround since ChromaDB doesn't support range filters directly
    // We'd search with a generic query and filter results
    const results = await this.search('machine learning research', { k: limit });

    return results.filter(result =>
      result.paper.year >= startYear && result.paper.year <= endYear
    );
  }

  /**
   * Health check: verify vector store is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getStore();
      const testResults = await this.search('test', { k: 1 });
      return testResults.length > 0;
    } catch (error) {
      logger.error('Vector store health check failed:', error);
      return false;
    }
  }
}
