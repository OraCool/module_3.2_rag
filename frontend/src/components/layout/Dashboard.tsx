/**
 * Dashboard Component
 * Container for all visualizations
 */

import { PublicationTrendsChart } from '../visualizations/PublicationTrendsChart';
import { AuthorNetworkGraph } from '../visualizations/AuthorNetworkGraph';
import { TopicWordCloud } from '../visualizations/TopicWordCloud';
import { PaperLengthHistogram } from '../visualizations/PaperLengthHistogram';
import { CodeAvailabilityPie } from '../visualizations/CodeAvailabilityPie';
import { TopAuthorsBarChart } from '../visualizations/TopAuthorsBarChart';

export function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Research Analytics Dashboard
        </h1>
        <p className="mt-2 text-gray-600">
          Explore 2,500+ machine learning papers from JMLR
        </p>
      </div>

      <div className="space-y-6">
        {/* Row 1: Publication Trends */}
        <div className="grid grid-cols-1 gap-6">
          <PublicationTrendsChart />
        </div>

        {/* Row 2: Author Network (full width for better visibility) */}
        <div className="grid grid-cols-1 gap-6">
          <AuthorNetworkGraph />
        </div>

        {/* Row 3: Topic Distribution & Code Availability */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopicWordCloud />
          <CodeAvailabilityPie />
        </div>

        {/* Row 4: Paper Length Distribution & Top Authors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PaperLengthHistogram />
          <TopAuthorsBarChart />
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <svg
            className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">About this dataset</p>
            <p>
              This dashboard analyzes papers from the Journal of Machine Learning Research (JMLR),
              one of the most prestigious venues for ML research. Data is cached and updated periodically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
