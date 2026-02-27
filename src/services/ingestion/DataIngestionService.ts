/**
 * Data ingestion service
 * Orchestrates the pipeline: CSV → Chunks → Embeddings → ChromaDB
 */

import { Document } from '@langchain/core/documents';
import { ChunkingService } from './ChunkingService.js';
import { createVectorStore, createEmbeddingsModel } from '../../config/langchain.config.js';
import { parseJMLRPapers, calculateStats } from '../../utils/csv-parser.js';
import { ChunkMetadata } from '../../types/paper.types.js';
import { logger, logProgress, logPerformance } from '../../utils/logger.js';

/**
 * Configuration for data ingestion
 */
export interface IngestionConfig {
  csvPath: string;
  batchSize?: number; // Number of documents to process at once (default: 100)
  skipExisting?: boolean; // Skip if collection already exists (default: false)
}

/**
 * Result of ingestion operation
 */
export interface IngestionResult {
  success: boolean;
  totalPapers: number;
  totalChunks: number;
  avgChunksPerPaper: number;
  durationMs: number;
  errors: string[];
}

/**
 * DataIngestionService handles the complete ingestion pipeline
 */
export class DataIngestionService {
  private chunkingService: ChunkingService;

  constructor() {
    this.chunkingService = new ChunkingService();
    logger.info('DataIngestionService initialized');
  }

  /**
   * Run the complete ingestion pipeline
   * @param config Ingestion configuration
   * @returns Result of the ingestion operation
   */
  async ingest(config: IngestionConfig): Promise<IngestionResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    logger.info('========================================');
    logger.info('Starting JMLR Papers Ingestion Pipeline');
    logger.info('========================================');
    logger.info(`CSV Path: ${config.csvPath}`);
    logger.info(`Batch Size: ${config.batchSize || 100}`);

    try {
      // Step 1: Parse CSV
      logger.info('\n[Step 1/3] Parsing CSV file...');
      const papers = parseJMLRPapers(config.csvPath);

      if (papers.length === 0) {
        throw new Error('No papers found in CSV file');
      }

      // Log dataset statistics
      const stats = calculateStats(papers);
      logger.info('\nDataset Statistics:');
      logger.info(`  Total papers: ${stats.totalPapers}`);
      logger.info(`  Year range: ${stats.yearRange.min} - ${stats.yearRange.max}`);
      logger.info(`  Average pages: ${stats.avgPages}`);
      logger.info(`  Papers with code: ${stats.withCode} (${((stats.withCode / stats.totalPapers) * 100).toFixed(1)}%)`);

      // Step 2: Chunk papers
      logger.info('\n[Step 2/3] Chunking papers into documents...');
      const chunkStartTime = Date.now();
      const documents = await this.chunkingService.chunkPapers(papers);
      logPerformance('Chunking', Date.now() - chunkStartTime);

      if (documents.length === 0) {
        throw new Error('No document chunks created');
      }

      logger.info(`  Created ${documents.length} chunks`);
      logger.info(`  Average chunks per paper: ${(documents.length / papers.length).toFixed(2)}`);

      // Step 3: Embed and store documents in batches
      logger.info('\n[Step 3/3] Embedding and storing documents...');
      await this.embedAndStoreDocuments(documents, config.batchSize || 100);

      const durationMs = Date.now() - startTime;
      const durationMinutes = (durationMs / 1000 / 60).toFixed(2);

      logger.info('\n========================================');
      logger.info('Ingestion Complete!');
      logger.info('========================================');
      logger.info(`Total time: ${durationMinutes} minutes`);
      logger.info(`Total papers: ${papers.length}`);
      logger.info(`Total chunks: ${documents.length}`);
      logger.info(`Errors: ${errors.length}`);

      return {
        success: true,
        totalPapers: papers.length,
        totalChunks: documents.length,
        avgChunksPerPaper: documents.length / papers.length,
        durationMs,
        errors,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Ingestion failed:', error);
      errors.push(errorMsg);

      return {
        success: false,
        totalPapers: 0,
        totalChunks: 0,
        avgChunksPerPaper: 0,
        durationMs: Date.now() - startTime,
        errors,
      };
    }
  }

  /**
   * Embed and store documents in batches to avoid rate limits
   * @param documents All document chunks to process
   * @param batchSize Number of documents per batch
   */
  private async embedAndStoreDocuments(
    documents: Document<ChunkMetadata>[],
    batchSize: number
  ): Promise<void> {
    // Vector store includes embeddings model internally
    const vectorStore = await createVectorStore();

    const totalBatches = Math.ceil(documents.length / batchSize);
    logger.info(`Processing ${documents.length} documents in ${totalBatches} batches...`);

    for (let i = 0; i < documents.length; i += batchSize) {
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batch = documents.slice(i, i + batchSize);

      logger.info(`\nBatch ${batchNumber}/${totalBatches}:`);
      logger.info(`  Documents: ${batch.length}`);

      try {
        const batchStartTime = Date.now();

        // Add documents to vector store (includes embedding)
        await vectorStore.addDocuments(batch);

        const batchDuration = Date.now() - batchStartTime;
        logPerformance(`Batch ${batchNumber}`, batchDuration);
        logProgress(i + batch.length, documents.length, 'Ingestion');

        // Small delay to avoid rate limits (OpenAI allows 3000 RPM)
        if (batchNumber < totalBatches) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        logger.error(`Failed to process batch ${batchNumber}:`, error);
        throw error;
      }
    }

    logger.info('\n✓ All documents embedded and stored successfully');
  }

  /**
   * Verify that the ingestion was successful
   * @returns True if vector store is accessible and contains documents
   */
  async verifyIngestion(): Promise<boolean> {
    try {
      const vectorStore = await createVectorStore();

      // Try a simple similarity search
      const results = await vectorStore.similaritySearch('machine learning', 1);

      logger.info(`Verification successful: Found ${results.length} document(s)`);
      return results.length > 0;
    } catch (error) {
      logger.error('Verification failed:', error);
      return false;
    }
  }
}
