import React from 'react';
import { PredictionChunk, WeatherData } from '../WeatherPredictor/types';

interface WindTableProps {
  predictions: PredictionChunk[];
  rawData: WeatherData[];
}

export const WindTable: React.FC<WindTableProps> = ({ predictions, rawData }) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatWindDirection = (degrees: number) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(((degrees + 360) % 360) / 22.5) % 16;
    return `${directions[index]} (${Math.round(degrees)}°)`;
  };

  // Get the latest 4 raw data points (last hour)
  const latestRawData = rawData.slice(-4);

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-2 gap-8">
        {/* Raw Data Table */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Raw OpenMeteo Data</h3>
          <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Time</th>
                <th className="px-4 py-2 text-left">Wind Speed (knots)</th>
                <th className="px-4 py-2 text-left">Wind Direction</th>
              </tr>
            </thead>
            <tbody>
              {latestRawData.map((data, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="px-4 py-2">
                    {formatTime(data.timestamp)}
                  </td>
                  <td className="px-4 py-2">
                    {Math.round(data.windSpeed)}
                  </td>
                  <td className="px-4 py-2">
                    {formatWindDirection(data.windDirection)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Predictions Table */}
        <div>
          <h3 className="text-xl font-semibold mb-4">AI Predictions</h3>
          <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Time Range</th>
                <th className="px-4 py-2 text-left">Wind Speed (knots)</th>
                <th className="px-4 py-2 text-left">Wind Direction</th>
                <th className="px-4 py-2 text-left">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((chunk, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="px-4 py-2">
                    {formatTime(chunk.startTime)} - {formatTime(chunk.endTime)}
                  </td>
                  <td className="px-4 py-2">
                    {Math.round(chunk.windSpeed)}
                  </td>
                  <td className="px-4 py-2">
                    {formatWindDirection(chunk.windDirection)}
                  </td>
                  <td className="px-4 py-2">
                    {Math.round(chunk.confidence * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
