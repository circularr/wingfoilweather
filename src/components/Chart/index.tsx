import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { PredictionChunk } from '../WeatherPredictor/types';

interface ChartProps {
  data: PredictionChunk[];
  dataKey: 'temperature' | 'windSpeed' | 'windDirection';
  color: string;
  unit: string;
}

export function PredictionChart({ data, dataKey, color, unit }: ChartProps) {
  const formatTime = (timestamp: number) => {
    if (!timestamp || isNaN(timestamp)) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
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
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatValue = (value: number) => {
    if (isNaN(value)) return '0' + unit;
    return Math.round(value) + unit;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="text-sm text-gray-600 mb-1">{formatTooltipTime(label)}</p>
          <p className="text-sm font-semibold">
            {dataKey.charAt(0).toUpperCase() + dataKey.slice(1)}: {formatValue(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[300px] bg-white p-4 rounded-lg shadow">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={color} stopOpacity={0.2}/>
            </linearGradient>
          </defs>
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
            interval="preserveStartEnd"
            minTickGap={60}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tickFormatter={formatValue}
            domain={dataKey === 'windDirection' ? [0, 360] : ['auto', 'auto']}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fillOpacity={1}
            fill={`url(#gradient-${dataKey})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
