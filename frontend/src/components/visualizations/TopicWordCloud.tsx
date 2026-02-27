/**
 * Topic Word Cloud
 * Shows most common topics/keywords from paper titles
 * Simple CSS-based implementation
 */

import { useEffect, useState } from 'react';
import { apiClient } from '../../services/api.client';
import { TopicDistributionData, WordFrequency } from '../../types/api.types';

export function TopicWordCloud() {
  const [data, setData] = useState<TopicDistributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await apiClient.getTopicDistribution();
      setData(result);
    } catch (err) {
      setError('Failed to load topic distribution');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="text-gray-600 mt-4">Loading word cloud...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card h-96 flex items-center justify-center">
        <p className="text-red-600">{error || 'No data available'}</p>
      </div>
    );
  }

  // Get top 50 words for display
  const topWords = data.words.slice(0, 50);

  // Calculate font size based on frequency
  const getFontSize = (word: WordFrequency) => {
    const minSize = 12;
    const maxSize = 48;
    const maxValue = Math.max(...topWords.map(w => w.value));
    const scale = (word.value / maxValue) * (maxSize - minSize) + minSize;
    return `${Math.floor(scale)}px`;
  };

  // Get color based on frequency (darker = more frequent)
  const getColor = (index: number) => {
    const colors = [
      '#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd',
      '#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="card">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">Topic Distribution</h3>
        <p className="text-sm text-gray-600">
          Most common topics in paper titles
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {data.topTopics.slice(0, 5).map((topic, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>

      {/* Word Cloud Display */}
      <div className="bg-gray-50 rounded-lg p-6 min-h-[400px] flex flex-wrap items-center justify-center gap-3">
        {topWords.map((word, index) => (
          <span
            key={index}
            className="inline-block font-bold hover:opacity-70 transition-opacity cursor-default"
            style={{
              fontSize: getFontSize(word),
              color: getColor(index),
              padding: '4px 8px',
            }}
            title={`${word.text}: ${word.value} occurrences (${word.percentage.toFixed(1)}%)`}
          >
            {word.text}
          </span>
        ))}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>Total unique words: {data.words.length}</p>
        <p>Total occurrences: {data.totalWords}</p>
        <p className="text-xs text-gray-500 mt-1">Hover over words to see frequency details</p>
      </div>
    </div>
  );
}
