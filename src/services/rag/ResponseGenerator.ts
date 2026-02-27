/**
 * Response Generator Service
 * Generates natural language responses with citations using LLM
 */

import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RerankResult } from './CohereReranker.js';
import { SourceReference } from '../../types/api.types.js';
import { createChatModel } from '../../config/langchain.config.js';
import { logger, logPerformance } from '../../utils/logger.js';

/**
 * Options for response generation
 */
export interface GenerateOptions {
  includeAbstracts?: boolean; // Include paper abstracts in context
  maxSources?: number; // Maximum number of sources to cite
  temperature?: number; // LLM temperature (0-1)
}

/**
 * Generated response with citations
 */
export interface GeneratedResponse {
  answer: string; // Natural language answer with citation markers [1], [2]
  sources: SourceReference[]; // Source papers referenced
  modelUsed: string; // Model name
  tokensUsed?: number; // Tokens used (if available)
}

/**
 * ResponseGenerator creates answers with citations
 */
export class ResponseGenerator {
  private chatModel: ChatOpenAI;

  private static readonly SYSTEM_PROMPT = `You are an expert research assistant specializing in machine learning and artificial intelligence research. Your task is to answer questions about academic papers from the Journal of Machine Learning Research (JMLR).

Guidelines:
1. Base your answer ONLY on the provided paper contexts
2. Cite sources using [1], [2] format in your answer
3. Be concise but informative (2-3 paragraphs)
4. If multiple papers discuss the topic, synthesize their contributions
5. If the provided papers don't contain relevant information, say so clearly
6. Use technical terminology appropriately
7. Highlight key contributions and findings

Answer format:
- Start with a direct answer to the question
- Support claims with citations [1], [2]
- End with a brief summary if multiple papers are cited`;

  private static readonly ANSWER_TEMPLATE = `Question: {query}

Relevant Papers:

{context}

Please provide a comprehensive answer to the question, citing the papers using [1], [2] format. Focus on the key findings and contributions from these papers.`;

  constructor() {
    this.chatModel = createChatModel();
    logger.info('ResponseGenerator initialized');
  }

  /**
   * Generate a response with citations
   * @param query User's original question
   * @param sources Reranked source papers
   * @param options Generation options
   */
  async generate(
    query: string,
    sources: RerankResult[],
    options: GenerateOptions = {}
  ): Promise<GeneratedResponse> {
    const startTime = Date.now();
    logger.info(`[Response Generation] Generating answer for: "${query}"`);

    if (sources.length === 0) {
      return {
        answer: 'I could not find any relevant papers to answer your question. Please try rephrasing or asking about a different topic.',
        sources: [],
        modelUsed: this.chatModel.modelName,
      };
    }

    try {
      // Prepare context from sources
      const context = this.buildContext(sources);

      // Create prompt
      const prompt = PromptTemplate.fromTemplate(ResponseGenerator.ANSWER_TEMPLATE);
      const formattedPrompt = await prompt.format({ query, context });

      // Generate response
      const response = await this.chatModel.invoke([
        { role: 'system', content: ResponseGenerator.SYSTEM_PROMPT },
        { role: 'user', content: formattedPrompt },
      ]);

      const answer = response.content.toString();

      // Convert sources to SourceReference format
      const sourceReferences: SourceReference[] = sources.map((source, index) => ({
        title: source.paper.title,
        authors: source.paper.authors,
        year: source.paper.year,
        link: source.paper.link,
        pages: source.paper.pages,
        relevanceScore: source.rerankScore || source.score,
        excerpt: this.extractExcerpt(source.chunkContent),
      }));

      const durationMs = Date.now() - startTime;
      logPerformance('Response Generation', durationMs);
      logger.info(`[Response Generation] Generated answer (${answer.length} chars)`);

      return {
        answer,
        sources: sourceReferences,
        modelUsed: this.chatModel.modelName,
        tokensUsed: response.response_metadata?.estimatedTokenUsage,
      };
    } catch (error) {
      logger.error('[Response Generation] Failed:', error);
      throw new Error(`Response generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build context string from sources for the LLM prompt
   */
  private buildContext(sources: RerankResult[]): string {
    return sources
      .map((source, index) => {
        const citation = `[${index + 1}]`;
        return [
          `${citation} Title: ${source.paper.title}`,
          `    Authors: ${source.paper.authors}`,
          `    Year: ${source.paper.year}`,
          `    Relevant content: ${source.chunkContent.substring(0, 500)}...`,
          '',
        ].join('\n');
      })
      .join('\n');
  }

  /**
   * Extract a concise excerpt from chunk content (for UI display)
   */
  private extractExcerpt(content: string, maxLength: number = 200): string {
    if (content.length <= maxLength) {
      return content;
    }

    // Try to cut at a sentence boundary
    const excerpt = content.substring(0, maxLength);
    const lastPeriod = excerpt.lastIndexOf('.');

    if (lastPeriod > maxLength * 0.7) {
      return excerpt.substring(0, lastPeriod + 1);
    }

    return excerpt + '...';
  }

  /**
   * Generate a streaming response (for real-time UI updates)
   * Note: This would require frontend support for Server-Sent Events
   */
  async generateStream(
    query: string,
    sources: RerankResult[],
    onChunk: (chunk: string) => void
  ): Promise<void> {
    logger.info(`[Response Generation] Streaming answer for: "${query}"`);

    const context = this.buildContext(sources);
    const prompt = PromptTemplate.fromTemplate(ResponseGenerator.ANSWER_TEMPLATE);
    const formattedPrompt = await prompt.format({ query, context });

    const stream = await this.chatModel.stream([
      { role: 'system', content: ResponseGenerator.SYSTEM_PROMPT },
      { role: 'user', content: formattedPrompt },
    ]);

    for await (const chunk of stream) {
      const text = chunk.content.toString();
      onChunk(text);
    }
  }
}
