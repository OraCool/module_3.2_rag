/**
 * Core type definitions for JMLR papers and related entities
 */

/**
 * Represents a single paper from the JMLR dataset
 */
export interface Paper {
  title: string;
  authors: string; // Comma-separated list of authors
  year: number;
  pages: number;
  link: string; // URL to the paper
  code: string; // URL to code repository (empty if not available)
  abstract?: string | undefined; // Optional abstract text
  volume?: number | undefined; // JMLR volume number
}

/**
 * Individual author extracted from papers
 */
export interface Author {
  name: string;
  paperCount: number;
  papers: string[]; // Array of paper titles
}

/**
 * Co-authorship relationship for network graphs
 */
export interface Collaboration {
  author1: string;
  author2: string;
  paperCount: number; // Number of papers co-authored
  papers: string[]; // Titles of co-authored papers
}

/**
 * Document chunk stored in vector database
 */
export interface DocumentChunk {
  id: string;
  content: string; // The actual text content
  embedding?: number[]; // Vector embedding (1536 dimensions for text-embedding-3-small)
  metadata: ChunkMetadata;
}

/**
 * Metadata associated with each document chunk
 */
export interface ChunkMetadata {
  paperId: string; // Unique identifier for the paper
  title: string;
  authors: string;
  year: number;
  pages: number;
  link: string;
  code: string;
  chunkIndex: number; // Position of this chunk within the document
  totalChunks: number; // Total number of chunks for this document
}

/**
 * Result from vector search with relevance score
 */
export interface SearchResult {
  paper: Paper;
  score: number; // Similarity or relevance score (0-1)
  chunkContent: string; // The specific chunk that matched
}

/**
 * Statistics about the dataset
 */
export interface DatasetStats {
  totalPapers: number;
  yearRange: {
    min: number;
    max: number;
  };
  avgPagesPerPaper: number;
  papersWithCode: number;
  papersWithoutCode: number;
  totalAuthors: number;
  avgAuthorsPerPaper: number;
}
