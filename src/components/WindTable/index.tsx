import React from 'react';
import { format } from 'date-fns';
import type { WeatherData, PredictionChunk } from '../WeatherPredictor/types';

interface WindTableProps {
  historicalData: WeatherData[];
  predictions: PredictionChunk[];
}

function getConfidenceClass(confidence: number): string {
  if (confidence >= 0.7) return 'confidence-high';
  if (confidence >= 0.4) return 'confidence-medium';
  return 'confidence-low';
}

function getWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                     'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

function getAccuracyClass(predicted: number, actual: number, threshold: number): string {
  const diff = Math.abs(predicted - actual);
  const percentDiff = (diff / actual) * 100;
  if (percentDiff <= threshold) return 'accuracy-high';
  if (percentDiff <= threshold * 2) return 'accuracy-medium';
  return 'accuracy-low';
}

export function WindTable({ historicalData, predictions }: WindTableProps) {
  // Sort data chronologically
  const sortedHistorical = [...historicalData].sort((a, b) => a.timestamp - b.timestamp);
  const sortedPredictions = [...predictions].sort((a, b) => a.startTime - b.startTime);

  return (
    <div className="wind-table-container">
      <div className="section-header training-data-header">
        Historical Data (Last 24 Hours)
      </div>
      <table className="wind-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Wind Speed</th>
            <th>Wind Gusts</th>
            <th>Direction</th>
            <th>Temperature</th>
            <th>Humidity</th>
          </tr>
        </thead>
        <tbody>
          {sortedHistorical.map(data => (
            <tr key={data.timestamp} className="historical-row">
              <td>{format(data.timestamp, 'HH:mm')}</td>
              <td>{data.windSpeed.toFixed(1)} kts</td>
              <td>{data.windGusts.toFixed(1)} kts</td>
              <td>
                <div className="wind-direction">
                  <span className="wind-arrow" style={{ transform: `rotate(${data.windDirection}deg)` }}>↑</span>
                  <span>{getWindDirection(data.windDirection)}</span>
                </div>
              </td>
              <td>{data.temperature.toFixed(1)}°C</td>
              <td>{data.humidity.toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="section-header prediction-header">
        Predictions (Next 24 Hours)
      </div>
      <table className="wind-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Wind Speed</th>
            <th>Wind Gusts</th>
            <th>Direction</th>
            <th>Temperature</th>
            <th>Humidity</th>
            <th>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {sortedPredictions.map(prediction => (
            <tr key={prediction.startTime} className="prediction-row">
              <td>{format(prediction.startTime, 'HH:mm')}</td>
              <td>{prediction.windSpeed.toFixed(1)} kts</td>
              <td>{prediction.windGusts.toFixed(1)} kts</td>
              <td>
                <div className="wind-direction">
                  <span className="wind-arrow" style={{ transform: `rotate(${prediction.windDirection}deg)` }}>↑</span>
                  <span>{getWindDirection(prediction.windDirection)}</span>
                </div>
              </td>
              <td>{prediction.temperature.toFixed(1)}°C</td>
              <td>{prediction.humidity.toFixed(0)}%</td>
              <td className={getConfidenceClass(prediction.confidence)}>
                {(prediction.confidence * 100).toFixed(0)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
