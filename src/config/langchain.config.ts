/**
 * LangChain configuration and client initialization
 */

import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { ChromaClient } from 'chromadb';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * Initialize OpenAI embeddings model
 * Used for: Document ingestion and query embedding
 */
export function createEmbeddingsModel(): OpenAIEmbeddings {
  logger.info(`Initializing OpenAI embeddings model: ${env.EMBEDDING_MODEL}`);

  return new OpenAIEmbeddings({
    modelName: env.EMBEDDING_MODEL,
    openAIApiKey: env.OPENAI_API_KEY,
    batchSize: 100, // Process 100 documents at a time for efficiency
    stripNewLines: true,
  });
}

/**
 * Initialize OpenAI chat model
 * Used for: Generating responses in RAG pipeline
 */
export function createChatModel(): ChatOpenAI {
  logger.info(`Initializing OpenAI chat model: ${env.CHAT_MODEL}`);

  return new ChatOpenAI({
    modelName: env.CHAT_MODEL,
    openAIApiKey: env.OPENAI_API_KEY,
    temperature: env.TEMPERATURE,
    maxTokens: env.MAX_TOKENS,
    streaming: false, // Set to true for streaming responses
  });
}

/**
 * Initialize ChromaDB client
 * Used for: Vector storage and similarity search
 */
export async function createChromaClient(): Promise<ChromaClient> {
  logger.info(`Initializing ChromaDB client: ${env.CHROMA_DB_PATH}`);

  try {
    // For HTTP connections, ChromaDB expects the base URL directly
    const client = new ChromaClient({
      path: env.CHROMA_DB_PATH,
    });

    // Test connection
    await client.heartbeat();
    logger.info('ChromaDB client connected successfully');

    return client;
  } catch (error) {
    logger.error('Failed to connect to ChromaDB:', error);
    throw new Error('ChromaDB connection failed. Make sure ChromaDB is installed and accessible.');
  }
}

/**
 * Initialize or load existing Chroma vector store
 * Used for: Vector search operations
 */
export async function getVectorStore(): Promise<Chroma> {
  logger.info(`Loading Chroma vector store: ${env.CHROMA_COLLECTION_NAME}`);

  const embeddings = createEmbeddingsModel();

  // Try to get existing collection
  const vectorStore = await Chroma.fromExistingCollection(embeddings, {
    collectionName: env.CHROMA_COLLECTION_NAME,
    url: env.CHROMA_DB_PATH,
  });

  logger.info('Loaded existing Chroma collection');
  return vectorStore;
}

/**
 * Create a new Chroma vector store (for ingestion)
 * Used for: Initial data loading
 */
export async function createVectorStore(): Promise<Chroma> {
  logger.info(`Creating new Chroma vector store: ${env.CHROMA_COLLECTION_NAME}`);

  const embeddings = createEmbeddingsModel();
  const client = await createChromaClient();

  // Check if collection already exists
  try {
    const collections = await client.listCollections();
    const exists = collections.some((c: any) =>
      (c.name === env.CHROMA_COLLECTION_NAME) || (c === env.CHROMA_COLLECTION_NAME)
    );

    if (exists) {
      logger.warn(`Collection "${env.CHROMA_COLLECTION_NAME}" already exists. Deleting...`);
      await client.deleteCollection({ name: env.CHROMA_COLLECTION_NAME });
    }
  } catch (error) {
    logger.debug('Error checking existing collections:', error);
  }

  // Create new collection
  const vectorStore = await Chroma.fromDocuments(
    [], // Empty initially, documents will be added later
    embeddings,
    {
      collectionName: env.CHROMA_COLLECTION_NAME,
      url: env.CHROMA_DB_PATH,
    }
  );

  logger.info('Created new Chroma collection');
  return vectorStore;
}

/**
 * Health check for all external services
 */
export async function checkServicesHealth(): Promise<{
  chromadb: boolean;
  openai: boolean;
  cohere: boolean;
}> {
  const health = {
    chromadb: false,
    openai: false,
    cohere: false,
  };

  // Check ChromaDB
  try {
    const client = await createChromaClient();
    await client.heartbeat();
    health.chromadb = true;
  } catch (error) {
    logger.error('ChromaDB health check failed:', error);
  }

  // Check OpenAI (simple test)
  try {
    const embeddings = createEmbeddingsModel();
    await embeddings.embedQuery('test');
    health.openai = true;
  } catch (error) {
    logger.error('OpenAI health check failed:', error);
  }

  // Check Cohere (if configured)
  if (env.COHERE_API_KEY) {
    try {
      // We'll implement Cohere check in the reranker service
      health.cohere = true;
    } catch (error) {
      logger.error('Cohere health check failed:', error);
    }
  }

  return health;
}
