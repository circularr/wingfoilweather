import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { PredictionChunk } from '../WeatherPredictor/types';

interface ChartProps {
  data: PredictionChunk[];
}

export function WeatherChart({ data }: ChartProps) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <XAxis
            dataKey="startTime"
            tickFormatter={formatTime}
            interval="preserveStartEnd"
          />
          <YAxis yAxisId="temp" orientation="left" />
          <YAxis yAxisId="wind" orientation="right" />
          
          <Tooltip
            labelFormatter={formatTime}
            formatter={(value: number, name: string) => [
              value.toFixed(1),
              name.charAt(0).toUpperCase() + name.slice(1),
            ]}
          />
          
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="temperature"
            stroke="#ff7300"
            dot={false}
            strokeWidth={2}
          />
          
          <Line
            yAxisId="wind"
            type="monotone"
            dataKey="windSpeed"
            stroke="#82ca9d"
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 