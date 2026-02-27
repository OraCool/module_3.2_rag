/**
 * Results Display Component
 * Shows answer with citations and source papers
 */

import { useState } from 'react';
import { QueryResponse } from '../../types/api.types';

interface ResultsDisplayProps {
  result: QueryResponse;
  query: string;
}

export function ResultsDisplay({ result, query }: ResultsDisplayProps) {
  const [showMetadata, setShowMetadata] = useState(false);
  const [expandedSource, setExpandedSource] = useState<number | null>(null);

  // Format answer with citation highlighting
  const formatAnswer = (text: string) => {
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, index) => {
      if (part.match(/\[\d+\]/)) {
        return (
          <span key={index} className="citation">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Answer Section */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Answer</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{result.metadata.totalTimeMs}ms</span>
          </div>
        </div>

        <div className="prose max-w-none">
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {formatAnswer(result.answer)}
          </p>
        </div>

        {/* Metadata Toggle */}
        <button
          onClick={() => setShowMetadata(!showMetadata)}
          className="mt-4 text-sm text-primary-600 hover:text-primary-700 flex items-center space-x-1"
        >
          <span>{showMetadata ? 'Hide' : 'Show'} performance metrics</span>
          <svg
            className={`w-4 h-4 transform transition-transform ${showMetadata ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Performance Metadata */}
        {showMetadata && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600">Stage 1 (Vector Search):</span>
                <span className="font-medium ml-2">{result.metadata.retrievalTimeMs}ms</span>
              </div>
              {result.metadata.rerankTimeMs && (
                <div>
                  <span className="text-gray-600">Stage 2 (Reranking):</span>
                  <span className="font-medium ml-2">{result.metadata.rerankTimeMs}ms</span>
                </div>
              )}
              <div>
                <span className="text-gray-600">Response Generation:</span>
                <span className="font-medium ml-2">{result.metadata.generationTimeMs}ms</span>
              </div>
              <div>
                <span className="text-gray-600">Total Time:</span>
                <span className="font-medium ml-2">{result.metadata.totalTimeMs}ms</span>
              </div>
              <div>
                <span className="text-gray-600">Candidates Retrieved:</span>
                <span className="font-medium ml-2">{result.metadata.candidateCount}</span>
              </div>
              <div>
                <span className="text-gray-600">Final Results:</span>
                <span className="font-medium ml-2">{result.metadata.finalCount}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <span className="text-gray-600">Model:</span>
              <span className="font-medium ml-2">{result.metadata.modelUsed}</span>
            </div>
          </div>
        )}
      </div>

      {/* Sources Section */}
      <div className="card">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Sources ({result.sources.length})
        </h3>

        <div className="space-y-4">
          {result.sources.map((source, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start space-x-3">
                    <span className="citation">[{index + 1}]</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {source.title}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {source.authors} ({source.year})
                      </p>

                      {/* Relevance Score */}
                      <div className="flex items-center space-x-4 mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Relevance:</span>
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500"
                              style={{ width: `${source.relevanceScore * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700">
                            {(source.relevanceScore * 100).toFixed(0)}%
                          </span>
                        </div>
                        {source.pages && (
                          <span className="text-xs text-gray-500">
                            {source.pages} pages
                          </span>
                        )}
                      </div>

                      {/* Excerpt (expandable) */}
                      {source.excerpt && (
                        <>
                          <button
                            onClick={() =>
                              setExpandedSource(expandedSource === index ? null : index)
                            }
                            className="text-sm text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                          >
                            <span>{expandedSource === index ? 'Hide' : 'Show'} excerpt</span>
                            <svg
                              className={`w-3 h-3 transform transition-transform ${
                                expandedSource === index ? 'rotate-180' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {expandedSource === index && (
                            <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700 italic">
                              "{source.excerpt}"
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Link to Paper */}
                <a
                  href={source.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-4 flex-shrink-0 text-primary-600 hover:text-primary-700"
                  title="Open paper"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
