import React from 'react';
import type { WeatherData, PredictionChunk } from '../WeatherPredictor/types';
import { Chart } from '../Chart';
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

  // Prepare data for charts
  const chartData = {
    temperature: allData.map(d => ({
      timestamp: d.timestamp,
      forecast: d.forecast?.temperature,
      prediction: d.prediction?.temperature
    })).filter(d => d.forecast !== undefined || d.prediction !== undefined),
    windSpeed: allData.map(d => ({
      timestamp: d.timestamp,
      forecast: d.forecast?.windSpeed,
      prediction: d.prediction?.windSpeed
    })).filter(d => d.forecast !== undefined || d.prediction !== undefined),
    windGusts: allData.map(d => ({
      timestamp: d.timestamp,
      forecast: d.forecast?.windGusts,
      prediction: d.prediction?.windGusts
    })).filter(d => d.forecast !== undefined || d.prediction !== undefined),
    windDirection: allData.map(d => ({
      timestamp: d.timestamp,
      forecast: d.forecast?.windDirection,
      prediction: d.prediction?.windDirection
    })).filter(d => d.forecast !== undefined || d.prediction !== undefined),
    waveHeight: allData.map(d => ({
      timestamp: d.timestamp,
      forecast: d.forecast?.waveHeight,
      prediction: d.prediction?.waveHeight
    })).filter(d => d.forecast !== undefined || d.prediction !== undefined),
    wavePeriod: allData.map(d => ({
      timestamp: d.timestamp,
      forecast: d.forecast?.wavePeriod,
      prediction: d.prediction?.wavePeriod
    })).filter(d => d.forecast !== undefined || d.prediction !== undefined),
    swellDirection: allData.map(d => ({
      timestamp: d.timestamp,
      forecast: d.forecast?.swellDirection,
      prediction: d.prediction?.swellDirection
    })).filter(d => d.forecast !== undefined || d.prediction !== undefined)
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

      {/* Comparison Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Temperature Comparison</h3>
          <Chart 
            data={chartData.temperature}
            yLabel="Temperature (°C)"
            forecastLabel="OpenMeteo Forecast"
            predictionLabel="AI Prediction"
            id="temperature-chart"
          />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Wind Speed Comparison</h3>
          <Chart 
            data={chartData.windSpeed}
            yLabel="Wind Speed (m/s)"
            forecastLabel="OpenMeteo Forecast"
            predictionLabel="AI Prediction"
            id="wind-speed-chart"
          />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Wind Gusts Comparison</h3>
          <Chart 
            data={chartData.windGusts}
            yLabel="Wind Gusts (m/s)"
            forecastLabel="OpenMeteo Forecast"
            predictionLabel="AI Prediction"
            id="wind-gusts-chart"
          />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Wind Direction Comparison</h3>
          <Chart 
            data={chartData.windDirection}
            yLabel="Wind Direction (°)"
            forecastLabel="OpenMeteo Forecast"
            predictionLabel="AI Prediction"
            id="wind-direction-chart"
          />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Wave Height Comparison</h3>
          <Chart 
            data={chartData.waveHeight}
            yLabel="Wave Height (m)"
            forecastLabel="OpenMeteo Forecast"
            predictionLabel="AI Prediction"
            id="wave-height-chart"
          />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Wave Period Comparison</h3>
          <Chart 
            data={chartData.wavePeriod}
            yLabel="Wave Period (s)"
            forecastLabel="OpenMeteo Forecast"
            predictionLabel="AI Prediction"
            id="wave-period-chart"
          />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Swell Direction Comparison</h3>
          <Chart 
            data={chartData.swellDirection}
            yLabel="Swell Direction (°)"
            forecastLabel="OpenMeteo Forecast"
            predictionLabel="AI Prediction"
            id="swell-direction-chart"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow">
        <div className="max-h-[600px] overflow-y-auto">
          <table className="min-w-full bg-white">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 z-20 bg-gray-50 px-4 py-2 border-b border-r text-left">Date & Time</th>
                <th className="px-4 py-2 border-b text-center" colSpan={3}>Temperature (°C)</th>
                <th className="px-4 py-2 border-b text-center" colSpan={3}>Wind Speed (m/s)</th>
                <th className="px-4 py-2 border-b text-center" colSpan={3}>Wind Gusts (m/s)</th>
                <th className="px-4 py-2 border-b text-center" colSpan={3}>Wind Direction (°)</th>
                <th className="px-4 py-2 border-b text-center" colSpan={3}>Wave Height (m)</th>
                <th className="px-4 py-2 border-b text-center" colSpan={3}>Wave Period (s)</th>
                <th className="px-4 py-2 border-b text-center" colSpan={3}>Swell Direction (°)</th>
              </tr>
              <tr className="bg-gray-100 text-sm">
                <th className="sticky left-0 z-20 bg-gray-100 px-4 py-1 border-b border-r"></th>
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

                    {/* Wave Height */}
                    <td className={getCellStyle(row.historical?.waveHeight, 'historical')}>
                      {row.historical?.waveHeight?.toFixed(1) || '-'}
                    </td>
                    <td className={getCellStyle(row.forecast?.waveHeight, 'forecast')}>
                      {row.forecast?.waveHeight?.toFixed(1) || '-'}
                    </td>
                    <td className={getCellStyle(row.prediction?.waveHeight, 'prediction')}>
                      {row.prediction?.waveHeight?.toFixed(1) || '-'}
                    </td>

                    {/* Wave Period */}
                    <td className={getCellStyle(row.historical?.wavePeriod, 'historical')}>
                      {row.historical?.wavePeriod?.toFixed(1) || '-'}
                    </td>
                    <td className={getCellStyle(row.forecast?.wavePeriod, 'forecast')}>
                      {row.forecast?.wavePeriod?.toFixed(1) || '-'}
                    </td>
                    <td className={getCellStyle(row.prediction?.wavePeriod, 'prediction')}>
                      {row.prediction?.wavePeriod?.toFixed(1) || '-'}
                    </td>

                    {/* Swell Direction */}
                    <td className={getCellStyle(row.historical?.swellDirection, 'historical')}>
                      {row.historical?.swellDirection?.toFixed(0) || '-'}°
                    </td>
                    <td className={getCellStyle(row.forecast?.swellDirection, 'forecast')}>
                      {row.forecast?.swellDirection?.toFixed(0) || '-'}°
                    </td>
                    <td className={getCellStyle(row.prediction?.swellDirection, 'prediction')}>
                      {row.prediction?.swellDirection?.toFixed(0) || '-'}°
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
