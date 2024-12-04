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
    const date = new Date(timestamp);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let dayStr = '';
    if (date.toDateString() === today.toDateString()) {
      dayStr = 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      dayStr = 'Tomorrow';
    } else {
      dayStr = date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
    }

    const timeStr = date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
        <span className="font-medium text-slate-200">{dayStr}</span>
        <span className="text-slate-400 tabular-nums">{timeStr}</span>
      </div>
    );
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
    if (value === undefined) return 'text-slate-500 font-normal px-3 py-2 whitespace-nowrap';
    const baseStyle = 'px-3 py-2 font-medium tabular-nums whitespace-nowrap tracking-tight';
    switch (source) {
      case 'historical':
        return `${baseStyle} text-sky-200`;
      case 'forecast':
        return `${baseStyle} text-indigo-300`;
      case 'prediction':
        return `${baseStyle} text-fuchsia-300`;
      default:
        return baseStyle;
    }
  };

  // Prepare data for charts
  const chartData = {
    temperature: allData.map(d => ({
      timestamp: d.timestamp,
      historical: d.historical?.temperature,
      forecast: d.forecast?.temperature,
      prediction: d.prediction?.temperature
    })).filter(d => d.historical !== undefined || d.forecast !== undefined || d.prediction !== undefined),
    windSpeed: allData.map(d => ({
      timestamp: d.timestamp,
      historical: d.historical?.windSpeed,
      forecast: d.forecast?.windSpeed,
      prediction: d.prediction?.windSpeed
    })).filter(d => d.historical !== undefined || d.forecast !== undefined || d.prediction !== undefined),
    windGusts: allData.map(d => ({
      timestamp: d.timestamp,
      historical: d.historical?.windGusts,
      forecast: d.forecast?.windGusts,
      prediction: d.prediction?.windGusts
    })).filter(d => d.historical !== undefined || d.forecast !== undefined || d.prediction !== undefined),
    windDirection: allData.map(d => ({
      timestamp: d.timestamp,
      historical: d.historical?.windDirection,
      forecast: d.forecast?.windDirection,
      prediction: d.prediction?.windDirection
    })).filter(d => d.historical !== undefined || d.forecast !== undefined || d.prediction !== undefined),
    waveHeight: allData.map(d => ({
      timestamp: d.timestamp,
      historical: d.historical?.waveHeight,
      forecast: d.forecast?.waveHeight,
      prediction: d.prediction?.waveHeight
    })).filter(d => d.historical !== undefined || d.forecast !== undefined || d.prediction !== undefined),
    wavePeriod: allData.map(d => ({
      timestamp: d.timestamp,
      historical: d.historical?.wavePeriod,
      forecast: d.forecast?.wavePeriod,
      prediction: d.prediction?.wavePeriod
    })).filter(d => d.historical !== undefined || d.forecast !== undefined || d.prediction !== undefined),
    swellDirection: allData.map(d => ({
      timestamp: d.timestamp,
      historical: d.historical?.swellDirection,
      forecast: d.forecast?.swellDirection,
      prediction: d.prediction?.swellDirection
    })).filter(d => d.historical !== undefined || d.forecast !== undefined || d.prediction !== undefined)
  };

  return (
    <div className="mt-8 bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-800/50">
      <div className="p-5 border-b border-slate-800/50">
        <h2 className="text-xl font-semibold text-slate-100 tracking-tight">Complete Weather Data Analysis</h2>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 px-5 py-3 text-sm border-b border-slate-800/50">
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-sky-400/90 ring-2 ring-sky-400/20 mr-2"></div>
          <span className="text-sky-200 font-medium">Historical Data</span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-indigo-400/90 ring-2 ring-indigo-400/20 mr-2"></div>
          <span className="text-indigo-300 font-medium">OpenMeteo Forecast</span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-fuchsia-400/90 ring-2 ring-fuchsia-400/20 mr-2"></div>
          <span className="text-fuchsia-300 font-medium">AI Prediction</span>
        </div>
      </div>

      {/* Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-5 p-5">
        <div className="bg-slate-900/30 backdrop-blur-sm p-4 rounded-xl border border-slate-800/30">
          <h3 className="text-base font-medium mb-3 text-slate-300">Temperature</h3>
          <Chart 
            data={chartData.temperature}
            yLabel="Temperature (°C)"
            historicalLabel="Historical Data"
            forecastLabel="OpenMeteo Forecast"
            predictionLabel="AI Prediction"
            id="temperature-chart"
          />
        </div>
        <div className="bg-slate-900/30 backdrop-blur-sm p-4 rounded-xl border border-slate-800/30">
          <h3 className="text-base font-medium mb-3 text-slate-300">Wind Speed</h3>
          <Chart 
            data={chartData.windSpeed}
            yLabel="Wind Speed (m/s)"
            historicalLabel="Historical Data"
            forecastLabel="OpenMeteo Forecast"
            predictionLabel="AI Prediction"
            id="wind-speed-chart"
          />
        </div>
        <div className="bg-slate-900/30 backdrop-blur-sm p-4 rounded-xl border border-slate-800/30">
          <h3 className="text-base font-medium mb-3 text-slate-300">Wind Gusts</h3>
          <Chart 
            data={chartData.windGusts}
            yLabel="Wind Gusts (m/s)"
            historicalLabel="Historical Data"
            forecastLabel="OpenMeteo Forecast"
            predictionLabel="AI Prediction"
            id="wind-gusts-chart"
          />
        </div>
        <div className="bg-slate-900/30 backdrop-blur-sm p-4 rounded-xl border border-slate-800/30">
          <h3 className="text-base font-medium mb-3 text-slate-300">Wind Direction</h3>
          <Chart 
            data={chartData.windDirection}
            yLabel="Wind Direction (°)"
            historicalLabel="Historical Data"
            forecastLabel="OpenMeteo Forecast"
            predictionLabel="AI Prediction"
            id="wind-direction-chart"
          />
        </div>
        <div className="bg-slate-900/30 backdrop-blur-sm p-4 rounded-xl border border-slate-800/30">
          <h3 className="text-base font-medium mb-3 text-slate-300">Wave Height</h3>
          <Chart 
            data={chartData.waveHeight}
            yLabel="Wave Height (m)"
            historicalLabel="Historical Data"
            forecastLabel="OpenMeteo Forecast"
            predictionLabel="AI Prediction"
            id="wave-height-chart"
          />
        </div>
        <div className="bg-slate-900/30 backdrop-blur-sm p-4 rounded-xl border border-slate-800/30">
          <h3 className="text-base font-medium mb-3 text-slate-300">Wave Period</h3>
          <Chart 
            data={chartData.wavePeriod}
            yLabel="Wave Period (s)"
            historicalLabel="Historical Data"
            forecastLabel="OpenMeteo Forecast"
            predictionLabel="AI Prediction"
            id="wave-period-chart"
          />
        </div>
        <div className="bg-slate-900/30 backdrop-blur-sm p-4 rounded-xl border border-slate-800/30">
          <h3 className="text-base font-medium mb-3 text-slate-300">Swell Direction</h3>
          <Chart 
            data={chartData.swellDirection}
            yLabel="Swell Direction (°)"
            historicalLabel="Historical Data"
            forecastLabel="OpenMeteo Forecast"
            predictionLabel="AI Prediction"
            id="swell-direction-chart"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50">
          <table className="min-w-full">
            <thead className="sticky top-0 z-10">
              {/* Table headers */}
              {/* ... (remaining code for the table) */}
            </thead>
            <tbody className="text-sm divide-y divide-slate-800">
              {allData.map((row) => {
                const isPastTime = isPast(row.timestamp);
                return (
                  <tr key={row.timestamp} 
                      className={`${isPastTime ? 'opacity-90' : ''} hover:bg-slate-800/30 transition-colors duration-150`}>
                    <td className="sticky left-0 z-10 bg-slate-900 px-3 py-2 whitespace-nowrap border-r border-slate-700">
                      {formatDateTime(row.timestamp)}
                    </td>
                    {/* ... (remaining code for the table cells) */}
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
