/**
 * CSV parsing utilities for JMLR papers dataset
 */

import Papa from 'papaparse';
import { readFileSync } from 'fs';
import { Paper } from '../types/paper.types.js';
import { logger } from './logger.js';

/**
 * Raw CSV row structure from JMLR dataset
 *
 * Expected CSV columns (order doesn't matter, papaparse maps by name):
 * - title: Paper title
 * - volume: JMLR volume number
 * - authors: Comma-separated list of authors
 * - year: Publication year
 * - pages: Number of pages
 * - link: URL to paper
 * - code: URL to code repository (empty if not available)
 * - abstract: Paper abstract (optional, may not be in all datasets)
 */
interface RawCSVRow {
  title: string;
  authors: string;
  year: string;
  pages: string;
  link: string;
  code: string;
  abstract?: string;
  volume?: string;
}

/**
 * Parse JMLR papers CSV file
 * @param filePath Path to the CSV file
 * @returns Array of parsed Paper objects
 */
export function parseJMLRPapers(filePath: string): Paper[] {
  logger.info(`Parsing CSV file: ${filePath}`);

  try {
    const fileContent = readFileSync(filePath, 'utf-8');

    const parseResult = Papa.parse<RawCSVRow>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim().toLowerCase(),
    });

    if (parseResult.errors.length > 0) {
      logger.warn(`CSV parsing encountered ${parseResult.errors.length} errors:`);
      parseResult.errors.slice(0, 5).forEach(error => {
        logger.warn(`  Row ${error.row}: ${error.message}`);
      });
    }

    const papers: Paper[] = [];
    const skippedRows: number[] = [];

    parseResult.data.forEach((row, index) => {
      try {
        const paper = validateAndTransformRow(row, index);
        if (paper) {
          papers.push(paper);
        } else {
          skippedRows.push(index);
        }
      } catch (error) {
        logger.warn(`Skipping invalid row ${index}:`, error);
        skippedRows.push(index);
      }
    });

    logger.info(`Successfully parsed ${papers.length} papers`);
    if (skippedRows.length > 0) {
      logger.warn(`Skipped ${skippedRows.length} invalid rows`);
    }

    return papers;
  } catch (error) {
    logger.error('Failed to parse CSV file:', error);
    throw new Error(`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate and transform a CSV row into a Paper object
 */
function validateAndTransformRow(row: RawCSVRow, index: number): Paper | null {
  // Required fields validation
  if (!row.title || row.title.trim().length === 0) {
    logger.debug(`Row ${index}: Missing title`);
    return null;
  }

  if (!row.authors || row.authors.trim().length === 0) {
    logger.debug(`Row ${index}: Missing authors`);
    return null;
  }

  // Parse numeric fields with defaults
  const year = parseInt(row.year, 10);
  if (isNaN(year) || year < 1900 || year > 2030) {
    logger.debug(`Row ${index}: Invalid year: ${row.year}`);
    return null;
  }

  const pages = parseInt(row.pages, 10);
  if (isNaN(pages) || pages < 0) {
    logger.debug(`Row ${index}: Invalid pages: ${row.pages}`);
    // Use 0 as default for missing/invalid pages
  }

  // Optional fields
  const volume = row.volume ? parseInt(row.volume, 10) : undefined;

  return {
    title: row.title.trim(),
    authors: row.authors.trim(),
    year,
    pages: isNaN(pages) ? 0 : pages,
    link: row.link?.trim() || '',
    code: row.code?.trim() || '',
    abstract: row.abstract?.trim(),
    volume: volume && !isNaN(volume) ? volume : undefined,
  };
}

/**
 * Extract unique authors from papers
 */
export function extractAuthors(papers: Paper[]): string[] {
  const authorSet = new Set<string>();

  papers.forEach(paper => {
    // Split authors by comma and clean up
    const authors = paper.authors
      .split(',')
      .map(author => author.trim())
      .filter(author => author.length > 0);

    authors.forEach(author => authorSet.add(author));
  });

  return Array.from(authorSet).sort();
}

/**
 * Group papers by year
 */
export function groupByYear(papers: Paper[]): Record<number, Paper[]> {
  const grouped: Record<number, Paper[]> = {};

  papers.forEach(paper => {
    if (!grouped[paper.year]) {
      grouped[paper.year] = [];
    }
    grouped[paper.year]!.push(paper);
  });

  return grouped;
}

/**
 * Calculate dataset statistics
 */
export function calculateStats(papers: Paper[]): {
  totalPapers: number;
  yearRange: { min: number; max: number };
  avgPages: number;
  withCode: number;
  withoutCode: number;
} {
  if (papers.length === 0) {
    return {
      totalPapers: 0,
      yearRange: { min: 0, max: 0 },
      avgPages: 0,
      withCode: 0,
      withoutCode: 0,
    };
  }

  const years = papers.map(p => p.year);
  const avgPages = papers.reduce((sum, p) => sum + p.pages, 0) / papers.length;
  const withCode = papers.filter(p => p.code && p.code.length > 0).length;

  return {
    totalPapers: papers.length,
    yearRange: {
      min: Math.min(...years),
      max: Math.max(...years),
    },
    avgPages: Math.round(avgPages * 10) / 10,
    withCode,
    withoutCode: papers.length - withCode,
  };
}
