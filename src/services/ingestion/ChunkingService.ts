/**
 * Document chunking service using LangChain's text splitters
 * Implements semantic chunking strategy for optimal RAG retrieval
 */

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';
import { Paper, ChunkMetadata } from '../../types/paper.types.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

/**
 * ChunkingService handles document splitting for vector embedding
 */
export class ChunkingService {
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    // Initialize RecursiveCharacterTextSplitter with optimal parameters
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: env.CHUNK_SIZE, // 500 tokens (approximate)
      chunkOverlap: env.CHUNK_OVERLAP, // 50 tokens overlap
      separators: ['\n\n', '\n', '. ', ' ', ''], // Prioritize semantic boundaries
      keepSeparator: false,
    });

    logger.info(
      `ChunkingService initialized (chunkSize: ${env.CHUNK_SIZE}, overlap: ${env.CHUNK_OVERLAP})`
    );
  }

  /**
   * Convert a Paper into a document string suitable for embedding
   * @param paper The paper to convert
   * @returns Formatted document text
   */
  private paperToDocumentText(paper: Paper): string {
    const sections: string[] = [];

    // Title (most important for retrieval)
    sections.push(`Title: ${paper.title}`);

    // Authors
    sections.push(`Authors: ${paper.authors}`);

    // Year and volume
    sections.push(`Year: ${paper.year}`);
    if (paper.volume) {
      sections.push(`Volume: ${paper.volume}`);
    }

    // Pages
    sections.push(`Pages: ${paper.pages}`);

    // Abstract (if available)
    if (paper.abstract && paper.abstract.length > 0) {
      sections.push(`Abstract: ${paper.abstract}`);
    }

    // Code availability
    if (paper.code && paper.code.length > 0) {
      sections.push(`Code: Available at ${paper.code}`);
    } else {
      sections.push('Code: Not available');
    }

    return sections.join('\n\n');
  }

  /**
   * Create document chunks from a paper
   * For JMLR papers (metadata records), most will be single chunks
   * @param paper The paper to chunk
   * @returns Array of LangChain Document objects with metadata
   */
  async chunkPaper(paper: Paper): Promise<Document<ChunkMetadata>[]> {
    const documentText = this.paperToDocumentText(paper);

    // Split text into chunks
    const chunks = await this.textSplitter.splitText(documentText);

    // Create metadata for each chunk
    const documents = chunks.map((chunk, index) => {
      const metadata: ChunkMetadata = {
        paperId: `${paper.year}-${paper.title.substring(0, 50).replace(/\s+/g, '-')}`,
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
        pages: paper.pages,
        link: paper.link,
        code: paper.code,
        chunkIndex: index,
        totalChunks: chunks.length,
      };

      return new Document({
        pageContent: chunk,
        metadata,
      });
    });

    return documents;
  }

  /**
   * Batch process multiple papers into chunks
   * @param papers Array of papers to process
   * @returns Array of all document chunks
   */
  async chunkPapers(papers: Paper[]): Promise<Document<ChunkMetadata>[]> {
    logger.info(`Chunking ${papers.length} papers...`);

    const allDocuments: Document<ChunkMetadata>[] = [];

    for (const paper of papers) {
      try {
        const docs = await this.chunkPaper(paper);
        allDocuments.push(...docs);
      } catch (error) {
        logger.warn(`Failed to chunk paper "${paper.title}":`, error);
        // Continue processing other papers
      }
    }

    logger.info(`Created ${allDocuments.length} chunks from ${papers.length} papers`);
    logger.info(`Average chunks per paper: ${(allDocuments.length / papers.length).toFixed(2)}`);

    return allDocuments;
  }

  /**
   * Get statistics about chunking for a set of papers
   */
  async getChunkingStats(papers: Paper[]): Promise<{
    totalPapers: number;
    totalChunks: number;
    avgChunksPerPaper: number;
    minChunksPerPaper: number;
    maxChunksPerPaper: number;
  }> {
    const documents = await this.chunkPapers(papers);

    // Group chunks by paper ID
    const chunksByPaper = new Map<string, number>();

    documents.forEach(doc => {
      const paperId = doc.metadata.paperId;
      chunksByPaper.set(paperId, (chunksByPaper.get(paperId) || 0) + 1);
    });

    const chunkCounts = Array.from(chunksByPaper.values());

    return {
      totalPapers: papers.length,
      totalChunks: documents.length,
      avgChunksPerPaper: documents.length / papers.length,
      minChunksPerPaper: Math.min(...chunkCounts),
      maxChunksPerPaper: Math.max(...chunkCounts),
    };
  }
}
