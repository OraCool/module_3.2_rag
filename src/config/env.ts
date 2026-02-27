/**
 * Environment variable validation and configuration
 * Uses Zod for runtime type checking
 */

import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
config();

/**
 * Environment variable schema with validation rules
 */
const envSchema = z.object({
  // OpenAI Configuration
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),

  // Cohere Configuration (optional - app falls back to single-stage if not provided)
  COHERE_API_KEY: z.string().optional(),

  // Server Configuration
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // ChromaDB Configuration
  CHROMA_DB_PATH: z.string().default('./data/chroma_db'),
  CHROMA_COLLECTION_NAME: z.string().default('jmlr_papers'),

  // RAG Configuration
  VECTOR_SEARCH_K: z.string().default('20').transform(Number),
  RERANK_TOP_K: z.string().default('5').transform(Number),
  CHUNK_SIZE: z.string().default('500').transform(Number),
  CHUNK_OVERLAP: z.string().default('50').transform(Number),

  // LLM Configuration
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  CHAT_MODEL: z.string().default('gpt-4o-mini'),
  MAX_TOKENS: z.string().default('2000').transform(Number),
  TEMPERATURE: z.string().default('0.7').transform(Number),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

/**
 * Validated environment configuration
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 * Throws an error if required variables are missing or invalid
 */
function parseEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map(err =>
      `  - ${err.path.join('.')}: ${err.message}`
    ).join('\n');

    throw new Error(`Environment validation failed:\n${errors}\n\nPlease check your .env file.`);
  }

  return result.data;
}

/**
 * Global configuration object
 * Safe to import and use throughout the application
 */
export const env = parseEnv();

/**
 * Check if Cohere API is configured
 */
export function isCohereEnabled(): boolean {
  return !!env.COHERE_API_KEY && env.COHERE_API_KEY.length > 0;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}
