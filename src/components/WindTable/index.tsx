import React from 'react';
import type { WeatherData, PredictionChunk } from '../WeatherPredictor/types';
import './styles.css';

interface WindTableProps {
  historicalData: WeatherData[];
  predictions: PredictionChunk[];
  forecastData: WeatherData[];
}

export function WindTable({ historicalData, predictions, forecastData }: WindTableProps) {
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

  // Create a map to deduplicate entries with the same timestamp
  const timeMap = new Map<number, {
    timestamp: number;
    historical?: WeatherData;
    forecast?: WeatherData;
    prediction?: PredictionChunk;
  }>();

  // Add historical data
  historicalData.forEach(d => {
    if (!timeMap.has(d.timestamp)) {
      timeMap.set(d.timestamp, { timestamp: d.timestamp, historical: d });
    } else {
      timeMap.get(d.timestamp)!.historical = d;
    }
  });

  // Add forecast data
  forecastData.forEach(d => {
    if (!timeMap.has(d.timestamp)) {
      timeMap.set(d.timestamp, { timestamp: d.timestamp, forecast: d });
    } else {
      timeMap.get(d.timestamp)!.forecast = d;
    }
  });

  // Add prediction data
  predictions.forEach(p => {
    if (!timeMap.has(p.startTime)) {
      timeMap.set(p.startTime, { timestamp: p.startTime, prediction: p });
    } else {
      timeMap.get(p.startTime)!.prediction = p;
    }
  });

  // Convert map to sorted array
  const allData = Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  // Helper function to determine if a timestamp is in the past
  const isPast = (timestamp: number) => timestamp < Date.now();

  // Helper function to style the cells based on data source
  const getCellStyle = (value: number | undefined, source: 'historical' | 'forecast' | 'prediction') => {
    if (value === undefined) return 'text-gray-300';
    const baseStyle = 'px-4 py-2 border-b';
    switch (source) {
      case 'historical':
        return `${baseStyle} bg-blue-50`;
      case 'forecast':
        return `${baseStyle} bg-green-50`;
      case 'prediction':
        return `${baseStyle} bg-purple-50`;
      default:
        return baseStyle;
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Complete Weather Data Analysis</h2>
      
      {/* Legend */}
      <div className="flex gap-4 mb-4 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-50 border border-blue-200 mr-2"></div>
          <span>Historical Data</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-50 border border-green-200 mr-2"></div>
          <span>OpenMeteo Forecast</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-purple-50 border border-purple-200 mr-2"></div>
          <span>AI Prediction</span>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="sticky left-0 bg-gray-50 px-4 py-2 border-b border-r text-left">Date & Time</th>
              <th className="px-4 py-2 border-b text-center" colSpan={3}>Temperature (°C)</th>
              <th className="px-4 py-2 border-b text-center" colSpan={3}>Wind Speed (m/s)</th>
              <th className="px-4 py-2 border-b text-center" colSpan={3}>Wind Gusts (m/s)</th>
              <th className="px-4 py-2 border-b text-center" colSpan={3}>Wind Direction (°)</th>
            </tr>
            <tr className="bg-gray-100 text-sm">
              <th className="sticky left-0 bg-gray-100 px-4 py-1 border-b border-r"></th>
              <th className="px-4 py-1 border-b bg-blue-50">Hist</th>
              <th className="px-4 py-1 border-b bg-green-50">Forecast</th>
              <th className="px-4 py-1 border-b bg-purple-50">AI</th>
              <th className="px-4 py-1 border-b bg-blue-50">Hist</th>
              <th className="px-4 py-1 border-b bg-green-50">Forecast</th>
              <th className="px-4 py-1 border-b bg-purple-50">AI</th>
              <th className="px-4 py-1 border-b bg-blue-50">Hist</th>
              <th className="px-4 py-1 border-b bg-green-50">Forecast</th>
              <th className="px-4 py-1 border-b bg-purple-50">AI</th>
              <th className="px-4 py-1 border-b bg-blue-50">Hist</th>
              <th className="px-4 py-1 border-b bg-green-50">Forecast</th>
              <th className="px-4 py-1 border-b bg-purple-50">AI</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {allData.map((row) => {
              const isPastTime = isPast(row.timestamp);
              return (
                <tr key={`${row.timestamp}-${row.historical ? 'h' : ''}${row.forecast ? 'f' : ''}${row.prediction ? 'p' : ''}`} 
                    className={`hover:bg-gray-50 ${isPastTime ? 'bg-opacity-60' : ''}`}>
                  <td className="sticky left-0 bg-white px-4 py-2 border-b border-r font-medium whitespace-nowrap">
                    {formatDateTime(row.timestamp)}
                  </td>
                  
                  {/* Temperature */}
                  <td className={getCellStyle(row.historical?.temperature, 'historical')}>
                    {row.historical?.temperature.toFixed(1) || '-'}
                  </td>
                  <td className={getCellStyle(row.forecast?.temperature, 'forecast')}>
                    {row.forecast?.temperature.toFixed(1) || '-'}
                  </td>
                  <td className={getCellStyle(row.prediction?.temperature, 'prediction')}>
                    {row.prediction?.temperature.toFixed(1) || '-'}
                  </td>

                  {/* Wind Speed */}
                  <td className={getCellStyle(row.historical?.windSpeed, 'historical')}>
                    {row.historical?.windSpeed.toFixed(1) || '-'}
                  </td>
                  <td className={getCellStyle(row.forecast?.windSpeed, 'forecast')}>
                    {row.forecast?.windSpeed.toFixed(1) || '-'}
                  </td>
                  <td className={getCellStyle(row.prediction?.windSpeed, 'prediction')}>
                    {row.prediction?.windSpeed.toFixed(1) || '-'}
                  </td>

                  {/* Wind Gusts */}
                  <td className={getCellStyle(row.historical?.windGusts, 'historical')}>
                    {row.historical?.windGusts.toFixed(1) || '-'}
                  </td>
                  <td className={getCellStyle(row.forecast?.windGusts, 'forecast')}>
                    {row.forecast?.windGusts.toFixed(1) || '-'}
                  </td>
                  <td className={getCellStyle(row.prediction?.windGusts, 'prediction')}>
                    {row.prediction?.windGusts.toFixed(1) || '-'}
                  </td>

                  {/* Wind Direction */}
                  <td className={getCellStyle(row.historical?.windDirection, 'historical')}>
                    {row.historical?.windDirection.toFixed(0) || '-'}°
                  </td>
                  <td className={getCellStyle(row.forecast?.windDirection, 'forecast')}>
                    {row.forecast?.windDirection.toFixed(0) || '-'}°
                  </td>
                  <td className={getCellStyle(row.prediction?.windDirection, 'prediction')}>
                    {row.prediction?.windDirection.toFixed(0) || '-'}°
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-600">
        <p>Total Entries: {allData.length}</p>
        <p>Historical Records: {historicalData.length}</p>
        <p>Forecast Records: {forecastData.length}</p>
        <p>AI Predictions: {predictions.length}</p>
        <p>Time Range: {formatDateTime(allData[0]?.timestamp)} to {formatDateTime(allData[allData.length - 1]?.timestamp)}</p>
      </div>
    </div>
  );
}
