/**
 * API Client for backend communication
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  QueryRequest,
  QueryResponse,
  VisualizationResponse,
  PublicationTrendsData,
  AuthorNetworkData,
  TopicDistributionData,
  PaperLengthData,
  CodeAvailabilityData,
  TopAuthorsData,
  HealthResponse,
} from '../types/api.types';

/**
 * API Client class
 */
class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api', // Proxied by Vite to http://localhost:3000/api
      timeout: 60000, // 60 seconds (RAG queries can be slow)
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          // Server responded with error status
          console.error('API Error:', error.response.data);
        } else if (error.request) {
          // Request made but no response
          console.error('Network Error:', error.message);
        } else {
          // Something else happened
          console.error('Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthResponse> {
    const response = await this.client.get<HealthResponse>('/health');
    return response.data;
  }

  /**
   * Execute RAG query
   */
  async query(request: QueryRequest): Promise<QueryResponse> {
    const response = await this.client.post<QueryResponse>('/query', request);
    return response.data;
  }

  /**
   * Compare query with and without reranking
   */
  async compareQuery(query: string): Promise<{
    withReranking: QueryResponse;
    withoutReranking: QueryResponse;
    improvement: {
      latencyDiff: number;
      sourcesChanged: boolean;
      avgScoreImprovement: number;
    };
  }> {
    const response = await this.client.post('/query/compare', { query });
    return response.data;
  }

  /**
   * Get publication trends data
   */
  async getPublicationTrends(): Promise<PublicationTrendsData> {
    const response = await this.client.get<VisualizationResponse<PublicationTrendsData>>(
      '/visualizations/publication-trends'
    );
    return response.data.data;
  }

  /**
   * Get author network data
   */
  async getAuthorNetwork(topN: number = 50): Promise<AuthorNetworkData> {
    const response = await this.client.get<VisualizationResponse<AuthorNetworkData>>(
      '/visualizations/author-network',
      { params: { topN } }
    );
    return response.data.data;
  }

  /**
   * Get topic distribution data
   */
  async getTopicDistribution(): Promise<TopicDistributionData> {
    const response = await this.client.get<VisualizationResponse<TopicDistributionData>>(
      '/visualizations/topics'
    );
    return response.data.data;
  }

  /**
   * Get paper length distribution data
   */
  async getPaperLengthDistribution(): Promise<PaperLengthData> {
    const response = await this.client.get<VisualizationResponse<PaperLengthData>>(
      '/visualizations/paper-length'
    );
    return response.data.data;
  }

  /**
   * Get code availability data
   */
  async getCodeAvailability(): Promise<CodeAvailabilityData> {
    const response = await this.client.get<VisualizationResponse<CodeAvailabilityData>>(
      '/visualizations/code-availability'
    );
    return response.data.data;
  }

  /**
   * Get top authors data
   */
  async getTopAuthors(topN: number = 20): Promise<TopAuthorsData> {
    const response = await this.client.get<VisualizationResponse<TopAuthorsData>>(
      '/visualizations/top-authors',
      { params: { topN } }
    );
    return response.data.data;
  }
}

// Export singleton instance
export const apiClient = new APIClient();
