/**
 * CLI script for ingesting JMLR papers dataset
 * Usage: npm run ingest
 */

import { join } from 'path';
import { existsSync } from 'fs';
import { DataIngestionService } from '../services/ingestion/DataIngestionService.js';
import { logger } from '../utils/logger.js';

const CSV_PATH = join(process.cwd(), 'data', 'jmlr-papers.csv');

async function main() {
  logger.info('JMLR Papers Data Ingestion Script');
  logger.info('==================================\n');

  // Check if CSV file exists
  if (!existsSync(CSV_PATH)) {
    logger.error(`CSV file not found: ${CSV_PATH}`);
    logger.error('\nPlease download the dataset from Kaggle:');
    logger.error('https://www.kaggle.com/datasets/victorsoeiro/papers-on-journal-of-machine-learning-research');
    logger.error(`Save it as: ${CSV_PATH}`);
    process.exit(1);
  }

  const ingestionService = new DataIngestionService();

  try {
    const result = await ingestionService.ingest({
      csvPath: CSV_PATH,
      batchSize: 100,
    });

    if (result.success) {
      logger.info('\n✓ Ingestion completed successfully!');
      logger.info(`\nYou can now start the application:`);
      logger.info(`  npm run dev`);
      process.exit(0);
    } else {
      logger.error('\n✗ Ingestion failed');
      logger.error(`Errors: ${result.errors.join(', ')}`);
      process.exit(1);
    }
  } catch (error) {
    logger.error('Fatal error during ingestion:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});
