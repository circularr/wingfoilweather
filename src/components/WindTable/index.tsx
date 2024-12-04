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
  const timeMap = new Map<
    number,
    {
      timestamp: number;
      historical?: WeatherData;
      forecast?: WeatherData;
      prediction?: PredictionChunk;
    }
  >();

  // Add historical data
  historicalData.forEach((d) => {
    if (!timeMap.has(d.timestamp)) {
      timeMap.set(d.timestamp, { timestamp: d.timestamp, historical: d });
    } else {
      timeMap.get(d.timestamp)!.historical = d;
    }
  });

  // Add forecast data
  forecastData.forEach((d) => {
    if (!timeMap.has(d.timestamp)) {
      timeMap.set(d.timestamp, { timestamp: d.timestamp, forecast: d });
    } else {
      timeMap.get(d.timestamp)!.forecast = d;
    }
  });

  // Add prediction data
  predictions.forEach((p) => {
    if (!timeMap.has(p.startTime)) {
      timeMap.set(p.startTime, { timestamp: p.startTime, prediction: p });
    } else {
      timeMap.get(p.startTime)!.prediction = p;
    }
  });

  // Convert map to sorted array
  const allData = Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  // Prepare data for charts
  const chartData = {
    windSpeed: allData.map((d) => ({
      timestamp: d.timestamp,
      historical: d.historical?.windSpeed,
      forecast: d.forecast?.windSpeed,
      prediction: d.prediction?.windSpeed
    })),
    windDirection: allData.map((d) => ({
      timestamp: d.timestamp,
      historical: d.historical?.windDirection,
      forecast: d.forecast?.windDirection,
      prediction: d.prediction?.windDirection
    })),
    waveHeight: allData.map((d) => ({
      timestamp: d.timestamp,
      historical: d.historical?.waveHeight,
      forecast: d.forecast?.waveHeight,
      prediction: d.prediction?.waveHeight
    }))
  };

  return (
    <div className="mt-8 bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-800/50">
      <div className="p-5 border-b border-slate-800/50">
        <h2 className="text-xl font-semibold text-slate-100 tracking-tight">
          Wind and Wave Data Analysis
        </h2>
      </div>

      {/* Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-5 p-5">
        <div className="bg-slate-900/30 backdrop-blur-sm p-4 rounded-xl border border-slate-800/30">
          <h3 className="text-base font-medium mb-3 text-slate-300">Wind Speed</h3>
          <div className="h-64">
            <Chart
              data={chartData.windSpeed}
              yLabel="Wind Speed (m/s)"
              historicalLabel="Historical Data"
              forecastLabel="OpenMeteo Forecast"
              predictionLabel="AI Prediction"
              id="wind-speed-chart"
            />
          </div>
        </div>
        <div className="bg-slate-900/30 backdrop-blur-sm p-4 rounded-xl border border-slate-800/30">
          <h3 className="text-base font-medium mb-3 text-slate-300">Wind Direction</h3>
          <div className="h-64">
            <Chart
              data={chartData.windDirection}
              yLabel="Wind Direction (°)"
              historicalLabel="Historical Data"
              forecastLabel="OpenMeteo Forecast"
              predictionLabel="AI Prediction"
              id="wind-direction-chart"
            />
          </div>
        </div>
        <div className="bg-slate-900/30 backdrop-blur-sm p-4 rounded-xl border border-slate-800/30">
          <h3 className="text-base font-medium mb-3 text-slate-300">Wave Height</h3>
          <div className="h-64">
            <Chart
              data={chartData.waveHeight}
              yLabel="Wave Height (m)"
              historicalLabel="Historical Data"
              forecastLabel="OpenMeteo Forecast"
              predictionLabel="AI Prediction"
              id="wave-height-chart"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
  