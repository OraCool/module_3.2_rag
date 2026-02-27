/**
 * Code Availability Pie Chart
 * Shows percentage of papers with/without code
 */

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { apiClient } from '../../services/api.client';
import { CodeAvailabilityData } from '../../types/api.types';

export function CodeAvailabilityPie() {
  const [data, setData] = useState<CodeAvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await apiClient.getCodeAvailability();
      setData(result);
    } catch (err) {
      setError('Failed to load code availability data');
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

  const chartData = [
    { name: 'With Code', value: data.withCode, color: '#10b981' },
    { name: 'Without Code', value: data.withoutCode, color: '#ef4444' },
  ];

  const renderLabel = (entry: any) => {
    return `${entry.name}: ${entry.value} (${((entry.value / data.total) * 100).toFixed(1)}%)`;
  };

  return (
    <div className="card">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">Code Availability</h3>
        <p className="text-sm text-gray-600">
          Papers with publicly available code implementations
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 gap-4 text-center">
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-700">{data.withCode}</div>
          <div className="text-sm text-green-600">With Code</div>
          <div className="text-xs text-gray-500">{data.percentage.withCode.toFixed(1)}%</div>
        </div>
        <div className="p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-700">{data.withoutCode}</div>
          <div className="text-sm text-red-600">Without Code</div>
          <div className="text-xs text-gray-500">{data.percentage.withoutCode.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
}
