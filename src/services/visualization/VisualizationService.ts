/**
 * Visualization Service
 * Aggregates data from ChromaDB metadata for interactive charts
 */

import { getVectorStore } from '../../config/langchain.config.js';
import {
  PublicationTrendsData,
  AuthorNetworkData,
  NetworkNode,
  NetworkEdge,
  TopicDistributionData,
  WordFrequency,
  PaperLengthData,
  HistogramBin,
  CodeAvailabilityData,
  TopAuthorsData,
  AuthorStat,
} from '../../types/api.types.js';
import { ChunkMetadata } from '../../types/paper.types.js';
import { logger } from '../../utils/logger.js';

/**
 * Cache entry with timestamp
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * VisualizationService handles data aggregation for all charts
 */
export class VisualizationService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    logger.info('VisualizationService initialized');
  }

  /**
   * Get all paper metadata from vector store
   */
  private async getAllPapers(): Promise<ChunkMetadata[]> {
    const cacheKey = 'all_papers';
    const cached = this.getFromCache<ChunkMetadata[]>(cacheKey);
    if (cached) return cached;

    logger.info('[Visualization] Loading all papers from vector store...');

    const vectorStore = await getVectorStore();

    // Perform a broad similarity search to get all documents
    // This is a workaround since LangChain doesn't expose a "get all" method
    const results = await vectorStore.similaritySearch('machine learning', 10000);

    // Extract unique papers (filter out duplicate chunks)
    const papersMap = new Map<string, ChunkMetadata>();

    results.forEach(doc => {
      const metadata = doc.metadata as ChunkMetadata;
      const key = `${metadata.title}-${metadata.year}`;

      if (!papersMap.has(key)) {
        papersMap.set(key, metadata);
      }
    });

    const papers = Array.from(papersMap.values());
    logger.info(`[Visualization] Loaded ${papers.length} unique papers`);

    this.setCache(cacheKey, papers);
    return papers;
  }

  /**
   * Get publication trends over time (line chart)
   */
  async getPublicationTrends(): Promise<PublicationTrendsData> {
    const cacheKey = 'publication_trends';
    const cached = this.getFromCache<PublicationTrendsData>(cacheKey);
    if (cached) return cached;

    logger.info('[Visualization] Computing publication trends...');

    const papers = await this.getAllPapers();

    // Group papers by year
    const yearCounts = new Map<number, number>();
    papers.forEach(paper => {
      yearCounts.set(paper.year, (yearCounts.get(paper.year) || 0) + 1);
    });

    // Sort years and prepare data
    const years = Array.from(yearCounts.keys()).sort((a, b) => a - b);
    const counts = years.map(year => yearCounts.get(year) || 0);

    const data: PublicationTrendsData = {
      labels: years,
      data: counts,
      totalPapers: papers.length,
      yearRange: {
        min: Math.min(...years),
        max: Math.max(...years),
      },
    };

    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Get author collaboration network (force-directed graph)
   */
  async getAuthorCollaborations(topN: number = 50): Promise<AuthorNetworkData> {
    const cacheKey = `author_network_${topN}`;
    const cached = this.getFromCache<AuthorNetworkData>(cacheKey);
    if (cached) return cached;

    logger.info(`[Visualization] Computing author collaboration network (top ${topN})...`);

    const papers = await this.getAllPapers();

    // Parse all authors and count publications
    const authorPapers = new Map<string, number>();
    const collaborations = new Map<string, Map<string, number>>();

    papers.forEach(paper => {
      const authors = paper.authors
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);

      // Count papers per author
      authors.forEach(author => {
        authorPapers.set(author, (authorPapers.get(author) || 0) + 1);
      });

      // Count co-authorships
      for (let i = 0; i < authors.length; i++) {
        for (let j = i + 1; j < authors.length; j++) {
          const author1 = authors[i]!;
          const author2 = authors[j]!;

          if (!collaborations.has(author1)) {
            collaborations.set(author1, new Map());
          }
          collaborations.get(author1)!.set(author2, (collaborations.get(author1)!.get(author2) || 0) + 1);

          if (!collaborations.has(author2)) {
            collaborations.set(author2, new Map());
          }
          collaborations.get(author2)!.set(author1, (collaborations.get(author2)!.get(author1) || 0) + 1);
        }
      }
    });

    // Get top N authors by publication count
    const topAuthors = Array.from(authorPapers.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([name]) => name);

    const topAuthorsSet = new Set(topAuthors);

    // Create nodes (only top N authors)
    const nodes: NetworkNode[] = topAuthors.map((author, index) => ({
      id: author,
      name: author,
      papers: authorPapers.get(author) || 0,
      group: index % 5, // Simple community detection (just for coloring)
    }));

    // Create edges (only between top N authors)
    const edges: NetworkEdge[] = [];
    topAuthors.forEach(author1 => {
      const coauthors = collaborations.get(author1);
      if (coauthors) {
        coauthors.forEach((count, author2) => {
          if (topAuthorsSet.has(author2) && author1 < author2) {
            // Only add edge once (avoid duplicates)
            edges.push({
              source: author1,
              target: author2,
              weight: count,
            });
          }
        });
      }
    });

    const avgCollaborations = edges.length > 0
      ? edges.reduce((sum, e) => sum + e.weight, 0) / topAuthors.length
      : 0;

    const data: AuthorNetworkData = {
      nodes,
      edges,
      statistics: {
        totalAuthors: topAuthors.length,
        totalCollaborations: edges.length,
        avgCollaborationsPerAuthor: avgCollaborations,
      },
    };

    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Get topic distribution (word cloud)
   */
  async getTopicDistribution(): Promise<TopicDistributionData> {
    const cacheKey = 'topic_distribution';
    const cached = this.getFromCache<TopicDistributionData>(cacheKey);
    if (cached) return cached;

    logger.info('[Visualization] Computing topic distribution...');

    const papers = await this.getAllPapers();

    // TODO: USER IMPLEMENTATION NEEDED
    // Extract and count keywords from paper titles
    // This function should:
    // 1. Extract significant words from titles (filter stopwords)
    // 2. Count word frequencies
    // 3. Return top 50-100 words sorted by frequency
    //
    // Current implementation: Simple word splitting (placeholder)
    const wordCounts = this.extractTopicsFromTitles(papers.map(p => p.title));

    // Convert to WordFrequency array
    const totalWords = Array.from(wordCounts.values()).reduce((sum, count) => sum + count, 0);
    const words: WordFrequency[] = Array.from(wordCounts.entries())
      .map(([text, value]) => ({
        text,
        value,
        percentage: (value / totalWords) * 100,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 100); // Top 100 words

    const data: TopicDistributionData = {
      words,
      totalWords,
      topTopics: words.slice(0, 10).map(w => w.text),
    };

    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Extract topics from paper titles
   * TODO: This is a placeholder implementation that needs enhancement
   *
   * @param titles Array of paper titles
   * @returns Map of word to frequency count
   */
  private extractTopicsFromTitles(titles: string[]): Map<string, number> {
    // TODO: USER CONTRIBUTION OPPORTUNITY
    // Implement robust keyword extraction:
    // - Filter common stopwords (the, a, an, of, for, etc.)
    // - Handle stemming/lemmatization (learning → learn)
    // - Extract meaningful multi-word phrases (deep learning, neural networks)
    // - Consider TF-IDF scoring for better topic identification
    //
    // For now, simple word frequency counting:
    const wordCounts = new Map<string, number>();

    const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during']);

    titles.forEach(title => {
      const words = title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopwords.has(word));

      words.forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
    });

    return wordCounts;
  }

  /**
   * Get paper length distribution (histogram)
   */
  async getPaperLengthDistribution(): Promise<PaperLengthData> {
    const cacheKey = 'paper_length';
    const cached = this.getFromCache<PaperLengthData>(cacheKey);
    if (cached) return cached;

    logger.info('[Visualization] Computing paper length distribution...');

    const papers = await this.getAllPapers();
    const pageCounts = papers.map(p => p.pages);

    // Create histogram bins
    const binSize = 10;
    const maxPages = Math.max(...pageCounts);
    const binCount = Math.ceil(maxPages / binSize);

    const bins: HistogramBin[] = [];
    for (let i = 0; i < binCount; i++) {
      const min = i * binSize;
      const max = (i + 1) * binSize;
      const count = pageCounts.filter(p => p >= min && p < max).length;

      bins.push({
        range: `${min}-${max} pages`,
        count,
        percentage: (count / papers.length) * 100,
      });
    }

    // Calculate statistics
    const sortedPages = [...pageCounts].sort((a, b) => a - b);
    const median = sortedPages[Math.floor(sortedPages.length / 2)] || 0;

    const data: PaperLengthData = {
      bins,
      statistics: {
        min: Math.min(...pageCounts),
        max: Math.max(...pageCounts),
        mean: pageCounts.reduce((sum, p) => sum + p, 0) / papers.length,
        median,
      },
    };

    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Get code availability statistics (pie chart)
   */
  async getCodeAvailability(): Promise<CodeAvailabilityData> {
    const cacheKey = 'code_availability';
    const cached = this.getFromCache<CodeAvailabilityData>(cacheKey);
    if (cached) return cached;

    logger.info('[Visualization] Computing code availability...');

    const papers = await this.getAllPapers();
    const withCode = papers.filter(p => p.code && p.code.length > 0).length;
    const withoutCode = papers.length - withCode;

    const data: CodeAvailabilityData = {
      withCode,
      withoutCode,
      total: papers.length,
      percentage: {
        withCode: (withCode / papers.length) * 100,
        withoutCode: (withoutCode / papers.length) * 100,
      },
    };

    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Get top authors by publication count (bar chart)
   */
  async getTopAuthors(topN: number = 20): Promise<TopAuthorsData> {
    const cacheKey = `top_authors_${topN}`;
    const cached = this.getFromCache<TopAuthorsData>(cacheKey);
    if (cached) return cached;

    logger.info(`[Visualization] Computing top ${topN} authors...`);

    const papers = await this.getAllPapers();

    // Count papers per author
    const authorPapers = new Map<string, string[]>();

    papers.forEach(paper => {
      const authors = paper.authors
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);

      authors.forEach(author => {
        if (!authorPapers.has(author)) {
          authorPapers.set(author, []);
        }
        authorPapers.get(author)!.push(paper.title);
      });
    });

    // Sort and get top N
    const topAuthorsData: AuthorStat[] = Array.from(authorPapers.entries())
      .map(([name, titles]) => ({
        name,
        papers: titles.length,
        recentPapers: titles.slice(-3), // Last 3 papers
      }))
      .sort((a, b) => b.papers - a.papers)
      .slice(0, topN);

    const data: TopAuthorsData = {
      authors: topAuthorsData,
      totalAuthors: authorPapers.size,
      displayCount: topN,
    };

    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Get data from cache if not expired
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }

    logger.debug(`[Visualization] Cache hit: ${key}`);
    return entry.data as T;
  }

  /**
   * Store data in cache
   */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
    logger.debug(`[Visualization] Cached: ${key}`);
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('[Visualization] Cache cleared');
  }
}
