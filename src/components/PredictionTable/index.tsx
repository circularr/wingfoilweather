import React from 'react';
import type { PredictionChunk } from '../WeatherPredictor/types';

interface PredictionTableProps {
  predictions: PredictionChunk[];
}

export function PredictionTable({ predictions }: PredictionTableProps) {
  if (!predictions.length) {
    return null;
  }

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">AI Predictions for Next 24 Hours</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 border-b">Date & Time</th>
              <th className="px-4 py-2 border-b">Temperature (°C)</th>
              <th className="px-4 py-2 border-b">Wind Speed (m/s)</th>
              <th className="px-4 py-2 border-b">Wind Gusts (m/s)</th>
              <th className="px-4 py-2 border-b">Wind Direction</th>
              <th className="px-4 py-2 border-b">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((prediction) => (
              <tr key={prediction.startTime} className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b">
                  {formatDateTime(prediction.startTime)}
                </td>
                <td className="px-4 py-2 border-b">
                  {prediction.temperature.toFixed(1)}
                </td>
                <td className="px-4 py-2 border-b">
                  {prediction.windSpeed.toFixed(1)}
                </td>
                <td className="px-4 py-2 border-b">
                  {prediction.windGusts.toFixed(1)}
                </td>
                <td className="px-4 py-2 border-b">
                  {prediction.windDirection.toFixed(0)}°
                </td>
                <td className="px-4 py-2 border-b">
                  {(prediction.confidence * 100).toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 