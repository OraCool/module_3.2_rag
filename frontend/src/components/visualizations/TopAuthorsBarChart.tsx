/**
 * Top Authors Bar Chart
 * Shows most prolific authors by publication count
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
  Cell,
} from 'recharts';
import { apiClient } from '../../services/api.client';
import { TopAuthorsData } from '../../types/api.types';

export function TopAuthorsBarChart() {
  const [data, setData] = useState<TopAuthorsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await apiClient.getTopAuthors(20);
      setData(result);
    } catch (err) {
      setError('Failed to load top authors');
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
  const chartData = data.authors.map((author) => ({
    name: author.name.length > 20 ? author.name.substring(0, 20) + '...' : author.name,
    fullName: author.name,
    papers: author.papers,
  }));

  // Color gradient for bars
  const getColor = (index: number) => {
    const colors = [
      '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe',
      '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe',
      '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe',
      '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe',
      '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="card">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">Top Authors</h3>
        <p className="text-sm text-gray-600">
          Top 20 most prolific researchers (out of {data.totalAuthors} total)
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            stroke="#6b7280"
            tick={{ fontSize: 11, angle: -45, textAnchor: 'end' }}
          />
          <YAxis
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
            label={{ value: 'Publications', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            labelFormatter={(value, payload) => {
              if (payload && payload[0]) {
                return payload[0].payload.fullName;
              }
              return value;
            }}
          />
          <Bar dataKey="papers" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
