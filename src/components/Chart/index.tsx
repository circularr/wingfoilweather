import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { PredictionChunk, WeatherData } from '../WeatherPredictor/types';

interface ChartProps {
  historicalData: WeatherData[];
  predictions: PredictionChunk[];
  dataKey: 'temperature' | 'windSpeed' | 'windDirection';
  color: string;
  unit: string;
}

interface CombinedDataPoint {
  timestamp: number;
  actual: number | undefined;
  predicted: number | undefined;
}

export function PredictionChart({ historicalData, predictions, dataKey, color, unit }: ChartProps) {
  const formatTime = (timestamp: number) => {
    if (!timestamp || isNaN(timestamp)) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatTooltipTime = (timestamp: number) => {
    if (!timestamp || isNaN(timestamp)) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatValue = (value: number | undefined) => {
    if (typeof value !== 'number' || isNaN(value)) return '0' + unit;
    return Math.round(value) + unit;
  };

  // Combine historical and prediction data
  const combinedData: CombinedDataPoint[] = [...historicalData].map(data => ({
    timestamp: data.timestamp,
    actual: data[dataKey],
    predicted: undefined
  }));

  // Add predictions
  predictions.forEach(pred => {
    const existingIndex = combinedData.findIndex(d => Math.abs(d.timestamp - pred.startTime) < 1800000);
    if (existingIndex >= 0) {
      combinedData[existingIndex].predicted = pred[dataKey];
    } else {
      combinedData.push({
        timestamp: pred.startTime,
        actual: undefined,
        predicted: pred[dataKey]
      });
    }
  });

  // Sort by timestamp
  combinedData.sort((a, b) => a.timestamp - b.timestamp);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="text-sm text-gray-600 mb-1">{formatTooltipTime(label)}</p>
          {payload.map((entry: any, index: number) => (
            entry.value !== undefined && (
              <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
                {entry.name}: {formatValue(entry.value)}
              </p>
            )
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[300px] bg-white p-4 rounded-lg shadow">
      <ResponsiveContainer>
        <AreaChart data={combinedData}>
          <defs>
            <linearGradient id={`gradient-actual`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={color} stopOpacity={0.2}/>
            </linearGradient>
            <linearGradient id={`gradient-predicted`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4299e1" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#4299e1" stopOpacity={0.2}/>
            </linearGradient>
          </defs>
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
            interval="preserveStartEnd"
            minTickGap={60}
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tickFormatter={formatValue}
            domain={dataKey === 'windDirection' ? [0, 360] : ['auto', 'auto']}
            width={60}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="actual"
            name={`Actual ${dataKey.charAt(0).toUpperCase() + dataKey.slice(1)} ${unit}`}
            stroke={color}
            fill={`url(#gradient-actual)`}
            isAnimationActive={false}
            strokeWidth={2}
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="predicted"
            name={`Predicted ${dataKey.charAt(0).toUpperCase() + dataKey.slice(1)} ${unit}`}
            stroke="#4299e1"
            fill={`url(#gradient-predicted)`}
            isAnimationActive={false}
            strokeWidth={2}
            strokeDasharray="5 5"
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
