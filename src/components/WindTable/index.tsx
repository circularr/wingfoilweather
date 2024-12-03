import React from 'react';
import { format } from 'date-fns';
import type { WeatherData, PredictionChunk } from '../WeatherPredictor/types';
import './styles.css';

interface WindTableProps {
  rawData: WeatherData[];
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

export function WindTable({ rawData, predictions }: WindTableProps) {
  return (
    <div className="wind-table-container">
      <table className="wind-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Wind Speed</th>
            <th>Direction</th>
            <th>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {/* Historical Data */}
          {rawData.slice(-4).map((data) => (
            <tr key={data.timestamp}>
              <td>{format(data.timestamp, 'HH:mm')}</td>
              <td>{data.windSpeed.toFixed(1)} km/h</td>
              <td>
                <div className="wind-direction">
                  <span className="wind-arrow" style={{ transform: `rotate(${data.windDirection}deg)` }}>
                    ↑
                  </span>
                  <span>{getWindDirection(data.windDirection)}</span>
                </div>
              </td>
              <td className="confidence-high">Historical</td>
            </tr>
          ))}

          {/* Predictions */}
          {predictions.map((pred) => (
            <tr key={pred.startTime}>
              <td>{format(pred.startTime, 'HH:mm')}</td>
              <td>{pred.windSpeed.toFixed(1)} km/h</td>
              <td>
                <div className="wind-direction">
                  <span className="wind-arrow" style={{ transform: `rotate(${pred.windDirection}deg)` }}>
                    ↑
                  </span>
                  <span>{getWindDirection(pred.windDirection)}</span>
                </div>
              </td>
              <td className={getConfidenceClass(pred.confidence)}>
                {(pred.confidence * 100).toFixed(0)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 