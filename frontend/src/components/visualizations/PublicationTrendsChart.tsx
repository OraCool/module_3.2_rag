/**
 * Publication Trends Chart (Line Chart)
 * Shows publication counts over time
 */

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { apiClient } from '../../services/api.client';
import { PublicationTrendsData } from '../../types/api.types';

export function PublicationTrendsChart() {
  const [data, setData] = useState<PublicationTrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await apiClient.getPublicationTrends();
      setData(result);
    } catch (err) {
      setError('Failed to load publication trends');
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
          <p className="text-gray-600 mt-4">Loading chart...</p>
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

  // Transform data for Recharts
  const chartData = data.labels.map((year, index) => ({
    year,
    papers: data.data[index],
  }));

  return (
    <div className="card">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">Publication Trends</h3>
        <p className="text-sm text-gray-600">
          Total papers: {data.totalPapers} ({data.yearRange.min}-{data.yearRange.max})
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="year"
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
            label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
            label={{ value: 'Papers', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="papers"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
            name="Publications"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
