import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { PredictionChunk } from '../WeatherPredictor/types';

interface ChartProps {
  data: PredictionChunk[];
  dataKey: 'temperature' | 'windSpeed';
  color: string;
  unit: string;
}

export function PredictionChart({ data, dataKey, color, unit }: ChartProps) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatValue = (value: number) => `${Math.round(value)}${unit}`;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={color} stopOpacity={0.2}/>
          </linearGradient>
        </defs>
        <XAxis
          dataKey="startTime"
          tickFormatter={formatTime}
          interval="preserveStartEnd"
          minTickGap={30}
        />
        <YAxis
          tickFormatter={formatValue}
          width={40}
        />
        <Tooltip
          labelFormatter={formatTime}
          formatter={(value: number) => [formatValue(value), dataKey]}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          fillOpacity={1}
          fill={`url(#gradient-${dataKey})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
