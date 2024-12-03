import React from 'react';
import type { WeatherData, PredictionChunk } from '../WeatherPredictor/types';
import './styles.css';

interface WindTableProps {
  rawData: WeatherData[];
  predictions: PredictionChunk[];
}

const formatDate = (timestamp: number) => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (e) {
    console.error('Error formatting date:', e);
    return 'Invalid Date';
  }
};

const formatNumber = (value: number | undefined, decimals: number = 1): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '-';
  }
  return value.toFixed(decimals);
};

export const WindTable: React.FC<WindTableProps> = ({ rawData = [], predictions = [] }) => {
  // Debug logging
  console.log('WindTable received predictions:', predictions.length, 'predictions');

  if (!Array.isArray(rawData) || !Array.isArray(predictions)) {
    console.error('Invalid data type:', { rawData, predictions });
    return <div>No data available</div>;
  }

  if (rawData.length === 0) {
    return <div>No weather data available</div>;
  }

  // Get the current timestamp
  const now = Date.now();

  // Filter and sort raw data to show only future data
  const futureRawData = rawData
    .filter(data => data.timestamp >= now)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Sort predictions by timestamp
  const sortedPredictions = [...predictions].sort((a, b) => a.startTime - b.startTime);

  // Create a map of raw data timestamps for lookup
  const rawDataTimestamps = new Set(futureRawData.map(d => d.timestamp));

  // Create a combined array of all future timestamps
  const allTimestamps = new Set([
    ...futureRawData.map(d => d.timestamp),
    ...sortedPredictions.map(p => p.startTime)
  ]);

  // Convert to array and sort
  const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

  // Create lookup maps
  const rawDataMap = new Map(futureRawData.map(d => [d.timestamp, d]));
  const predictionMap = new Map(sortedPredictions.map(p => [p.startTime, p]));

  return (
    <div className="wind-table-container">
      <h3>Hourly Wind Data Comparison</h3>
      <div className="table-scroll">
        <table className="wind-table">
          <thead>
            <tr>
              <th>Time</th>
              <th colSpan={4}>Raw Data</th>
              <th colSpan={4}>AI Prediction</th>
            </tr>
            <tr>
              <th></th>
              <th>Wind Speed (kts)</th>
              <th>Gusts (kts)</th>
              <th>Direction</th>
              <th>Temp (°C)</th>
              <th>Wind Speed (kts)</th>
              <th>Gusts (kts)</th>
              <th>Direction</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {sortedTimestamps.map((timestamp, index) => {
              const rawData = rawDataMap.get(timestamp);
              const prediction = predictionMap.get(timestamp);

              return (
                <tr key={index} className={prediction ? 'has-prediction' : ''}>
                  <td>{formatDate(timestamp)}</td>
                  {rawData ? (
                    <>
                      <td>{formatNumber(rawData.windSpeed)}</td>
                      <td>{formatNumber(rawData.windGusts)}</td>
                      <td>{formatNumber(rawData.windDirection, 0)}°</td>
                      <td>{formatNumber(rawData.temperature)}</td>
                    </>
                  ) : (
                    <td colSpan={4}>No raw data</td>
                  )}
                  {prediction ? (
                    <>
                      <td>{formatNumber(prediction.windSpeed)}</td>
                      <td>{formatNumber(prediction.windGusts)}</td>
                      <td>{formatNumber(prediction.windDirection, 0)}°</td>
                      <td>{formatNumber(prediction.confidence ? prediction.confidence * 100 : undefined, 0)}%</td>
                    </>
                  ) : (
                    <td colSpan={4}>No prediction</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="text-sm text-gray-600 mt-2">
        Showing {sortedTimestamps.length} hours of data • 
        {predictions.length} predictions • 
        {futureRawData.length} raw data points
      </div>
    </div>
  );
};
