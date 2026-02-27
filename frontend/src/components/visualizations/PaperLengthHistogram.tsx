/**
 * Paper Length Histogram
 * Shows distribution of paper lengths
 */

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { apiClient } from '../../services/api.client';
import { PaperLengthData } from '../../types/api.types';

export function PaperLengthHistogram() {
  const [data, setData] = useState<PaperLengthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await apiClient.getPaperLengthDistribution();
      setData(result);
    } catch (err) {
      setError('Failed to load paper length distribution');
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

  // Transform data for Recharts (filter out empty bins)
  const chartData = data.bins.filter(bin => bin.count > 0);

  return (
    <div className="card">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">Paper Length Distribution</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Mean: {data.statistics.mean.toFixed(1)} pages</p>
          <p>Median: {data.statistics.median} pages</p>
          <p>Range: {data.statistics.min}-{data.statistics.max} pages</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="range"
            stroke="#6b7280"
            tick={{ fontSize: 11, angle: -45, textAnchor: 'end' }}
            label={{ value: 'Page Range', position: 'insideBottom', offset: -30 }}
          />
          <YAxis
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
            label={{ value: 'Number of Papers', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string, props: any) => [
              `${value} papers (${props.payload.percentage.toFixed(1)}%)`,
              'Count',
            ]}
          />
          <Legend />
          <Bar
            dataKey="count"
            fill="#3b82f6"
            radius={[8, 8, 0, 0]}
            name="Papers"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
