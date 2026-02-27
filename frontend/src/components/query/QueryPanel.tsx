/**
 * Query Panel Component
 * User interface for submitting RAG queries
 */

import { useState, FormEvent } from 'react';
import { apiClient } from '../../services/api.client';
import { QueryResponse } from '../../types/api.types';
import { ResultsDisplay } from './ResultsDisplay';

export function QueryPanel() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [withReranking, setWithReranking] = useState(true);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      setError('Please enter a question');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiClient.query({
        query: query.trim(),
        k: 5,
        withReranking,
      });

      setResult(response);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch results. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const exampleQueries = [
    'What are the main contributions of attention mechanisms?',
    'Which papers discuss reinforcement learning policy gradients?',
    'What are recent advances in generative models?',
    'Papers about explainable AI in healthcare',
  ];

  const handleExampleClick = (exampleQuery: string) => {
    setQuery(exampleQuery);
    setResult(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Query Form */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Ask About ML Research Papers
        </h2>
        <p className="text-gray-600 mb-6">
          Search through 2,500+ papers from the Journal of Machine Learning Research
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What would you like to know about ML research?"
              className="input-field resize-none h-24"
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="reranking"
                checked={withReranking}
                onChange={(e) => setWithReranking(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                disabled={loading}
              />
              <label htmlFor="reranking" className="text-sm text-gray-700">
                Enable two-stage retrieval (reranking)
              </label>
              <span className="text-xs text-gray-500">
                +10% precision, +150ms latency
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="btn-primary flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span>Ask</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Example Queries */}
        {!result && !loading && (
          <div className="mt-6">
            <p className="text-sm text-gray-600 mb-3">Try these examples:</p>
            <div className="flex flex-wrap gap-2">
              {exampleQueries.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(example)}
                  className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-6 card bg-red-50 border-red-200">
          <div className="flex items-start space-x-3">
            <svg
              className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-medium text-red-900">Error</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && <ResultsDisplay result={result} query={query} />}
    </div>
  );
}
