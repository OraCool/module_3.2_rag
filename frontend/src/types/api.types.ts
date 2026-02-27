/**
 * API types (synced with backend)
 */

export interface QueryRequest {
  query: string;
  k?: number;
  withReranking?: boolean;
}

export interface QueryResponse {
  answer: string;
  sources: SourceReference[];
  metadata: QueryMetadata;
}

export interface SourceReference {
  title: string;
  authors: string;
  year: number;
  link: string;
  pages?: number;
  relevanceScore: number;
  excerpt?: string;
}

export interface QueryMetadata {
  retrievalTimeMs: number;
  rerankTimeMs?: number;
  generationTimeMs: number;
  totalTimeMs: number;
  candidateCount: number;
  finalCount: number;
  modelUsed: string;
}

export interface VisualizationResponse<T = unknown> {
  type: string;
  data: T;
  generatedAt: string;
  cached: boolean;
}

export interface PublicationTrendsData {
  labels: number[];
  data: number[];
  totalPapers: number;
  yearRange: { min: number; max: number };
}

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
  id: string;
  name: string;
  papers: number;
  group?: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  papers?: string[];
}

export interface TopicDistributionData {
  words: WordFrequency[];
  totalWords: number;
  topTopics: string[];
}

export interface WordFrequency {
  text: string;
  value: number;
  percentage: number;
}

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
  range: string;
  count: number;
  percentage: number;
}

export interface CodeAvailabilityData {
  withCode: number;
  withoutCode: number;
  total: number;
  percentage: {
    withCode: number;
    withoutCode: number;
  };
}

export interface TopAuthorsData {
  authors: AuthorStat[];
  totalAuthors: number;
  displayCount: number;
}

export interface AuthorStat {
  name: string;
  papers: number;
  recentPapers: string[];
}

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
