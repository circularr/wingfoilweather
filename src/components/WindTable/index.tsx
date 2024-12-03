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

  // Get current hour timestamp (rounded down)
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const currentHourTimestamp = now.getTime();

  // Sort all data by timestamp
  const sortedRawData = [...rawData].sort((a, b) => a.timestamp - b.timestamp);

  // Get the last 24 hours of historical data (for training display)
  const trainingData = sortedRawData.filter(
    d => d.timestamp < currentHourTimestamp && 
        d.timestamp >= currentHourTimestamp - 24 * 3600000
  );

  // Get the next 24 hours of forecast data
  const futureData = sortedRawData.filter(
    d => d.timestamp >= currentHourTimestamp && 
        d.timestamp < currentHourTimestamp + 24 * 3600000
  );

  // Create a map for predictions
  const predictionMap = new Map(predictions.map(p => [p.startTime, p]));

  // Combine all timestamps we want to show (last 24h + next 24h)
  const allTimestamps = new Set([
    ...trainingData.map(d => d.timestamp),
    ...futureData.map(d => d.timestamp),
    ...predictions.map(p => p.startTime)
  ]);

  const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

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
              const rawDataPoint = sortedRawData.find(d => d.timestamp === timestamp);
              const prediction = predictionMap.get(timestamp);
              const isTrainingData = timestamp < currentHourTimestamp;
              const isFutureData = timestamp >= currentHourTimestamp;

              return (
                <tr key={index} 
                    className={`
                      ${isTrainingData ? 'training-data' : ''}
                      ${isFutureData ? 'future-data' : ''}
                      ${prediction ? 'has-prediction' : ''}
                    `}>
                  <td>{formatDate(timestamp)}</td>
                  {rawDataPoint ? (
                    <>
                      <td>{formatNumber(rawDataPoint.windSpeed)}</td>
                      <td>{formatNumber(rawDataPoint.windGusts)}</td>
                      <td>{formatNumber(rawDataPoint.windDirection, 0)}°</td>
                      <td>{formatNumber(rawDataPoint.temperature)}</td>
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
        Training data: {trainingData.length} hours • 
        Future data: {futureData.length} hours • 
        Predictions: {predictions.length} hours
      </div>
    </div>
  );
};
