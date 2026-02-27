/**
 * API request and response type definitions
 */

import { Paper } from './paper.types.js';

/**
 * Request body for RAG query endpoint
 */
export interface QueryRequest {
  query: string; // User's natural language question
  k?: number; // Number of results to return (default: 5)
  withReranking?: boolean; // Enable/disable Stage 2 reranking (default: true)
}

/**
 * Response from RAG query endpoint
 */
export interface QueryResponse {
  answer: string; // Generated answer with citations
  sources: SourceReference[]; // Papers used to generate the answer
  metadata: QueryMetadata; // Performance metrics
}

/**
 * Reference to a source paper with relevance score
 */
export interface SourceReference {
  title: string;
  authors: string;
  year: number;
  link: string;
  pages?: number;
  relevanceScore: number; // 0-1 confidence score
  excerpt?: string; // Relevant excerpt from the paper
}

/**
 * Performance and debug metadata for queries
 */
export interface QueryMetadata {
  retrievalTimeMs: number; // Stage 1: Vector search time
  rerankTimeMs?: number; // Stage 2: Rerank time (if enabled)
  generationTimeMs: number; // LLM response generation time
  totalTimeMs: number; // End-to-end latency
  candidateCount: number; // Number of candidates from Stage 1
  finalCount: number; // Number of results after Stage 2
  modelUsed: string; // LLM model name (e.g., "gpt-4o-mini")
}

/**
 * Base response for visualization endpoints
 */
export interface VisualizationResponse<T = unknown> {
  type: string; // Chart type (e.g., "line", "bar", "network")
  data: T;
  generatedAt: string; // ISO timestamp
  cached: boolean; // Whether this response was served from cache
}

/**
 * Publication trends visualization data (line chart)
 */
export interface PublicationTrendsData {
  labels: number[]; // Years (e.g., [2000, 2001, ...])
  data: number[]; // Paper counts per year
  totalPapers: number;
  yearRange: { min: number; max: number };
}

/**
 * Author network visualization data (force-directed graph)
 */
export interface AuthorNetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  statistics: {
    totalAuthors: number;
    totalCollaborations: number;
    avgCollaborationsPerAuthor: number;
  };
}

export interface NetworkNode {
  id: string; // Author name
  name: string; // Display name
  papers: number; // Publication count
  group?: number; // Optional clustering/community detection
}

export interface NetworkEdge {
  source: string; // Author 1 ID
  target: string; // Author 2 ID
  weight: number; // Number of co-authored papers
  papers?: string[]; // Optional: titles of co-authored papers
}

/**
 * Topic distribution visualization data (word cloud)
 */
export interface TopicDistributionData {
  words: WordFrequency[];
  totalWords: number;
  topTopics: string[]; // Top 10 most common topics
}

export interface WordFrequency {
  text: string; // The word/topic
  value: number; // Frequency count
  percentage: number; // Percentage of total
}

/**
 * Paper length distribution data (histogram)
 */
export interface PaperLengthData {
  bins: HistogramBin[];
  statistics: {
    min: number;
    max: number;
    mean: number;
    median: number;
  };
}

export interface HistogramBin {
  range: string; // e.g., "10-20 pages"
  count: number;
  percentage: number;
}

/**
 * Code availability data (pie chart)
 */
export interface CodeAvailabilityData {
  withCode: number;
  withoutCode: number;
  total: number;
  percentage: {
    withCode: number;
    withoutCode: number;
  };
}

/**
 * Top authors data (bar chart)
 */
export interface TopAuthorsData {
  authors: AuthorStat[];
  totalAuthors: number;
  displayCount: number; // Number of authors shown (e.g., top 20)
}

export interface AuthorStat {
  name: string;
  papers: number;
  recentPapers: string[]; // Titles of 3 most recent papers
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    chromadb: 'connected' | 'disconnected';
    openai: 'connected' | 'disconnected';
    cohere: 'connected' | 'disconnected' | 'unavailable';
  };
  version: string;
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
}
