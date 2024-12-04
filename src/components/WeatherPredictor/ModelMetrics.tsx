// src/components/WeatherPredictor/ModelMetrics.tsx

import React from 'react';
import type { ModelMetricsType } from './types';
import { Chart } from '../Chart';

interface ModelMetricsProps {
  metrics: ModelMetricsType;
}

export function ModelMetrics({ metrics }: ModelMetricsProps) {
  // Prepare data for loss charts
  const epochs = Array.from({ length: metrics.trainingLoss.length }, (_, i) => i + 1);
  const lossData = epochs.map((epoch, index) => ({
    timestamp: epoch,
    training: metrics.trainingLoss[index],
    validation: metrics.validationLoss[index]
  }));

  // Prepare data for overfit/underfit scatter plot
  const scatterData = metrics.actuals.map((actual, index) => ({
    timestamp: index,
    actual,
    predicted: metrics.predictions[index]
  }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white">Model Performance Metrics</h3>
        <p className="text-sm text-gray-400 mt-2">
          Statistical analysis of the model's prediction accuracy
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400 ring-4 ring-blue-400/10"></div>
            <span className="text-sm font-medium text-blue-100">RMSE</span>
          </div>
          <div className="font-mono text-2xl text-white">{metrics.rmse.toFixed(2)}</div>
          <p className="text-xs text-gray-400 mt-1">Root Mean Square Error</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 ring-4 ring-indigo-400/10"></div>
            <span className="text-sm font-medium text-indigo-100">MAE</span>
          </div>
          <div className="font-mono text-2xl text-white">{metrics.mae.toFixed(2)}</div>
          <p className="text-xs text-gray-400 mt-1">Mean Absolute Error</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-violet-400 ring-4 ring-violet-400/10"></div>
            <span className="text-sm font-medium text-violet-100">R² Score</span>
          </div>
          <div className="font-mono text-2xl text-white">{(metrics.r2Score * 100).toFixed(1)}%</div>
          <p className="text-xs text-gray-400 mt-1">Coefficient of Determination</p>
        </div>
      </div>

      {/* Loss Chart */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
        <h4 className="text-lg font-medium text-white mb-4">Training and Validation Loss</h4>
        <div className="h-64">
          <Chart
            data={epochs.map((epoch, index) => ({
              timestamp: epoch,
              training: metrics.trainingLoss[index],
              validation: metrics.validationLoss[index]
            }))}
            yLabel="Loss"
            historicalLabel="Training Loss"
            forecastLabel="Validation Loss"
            id="loss-chart"
            isTimeSeries={false}
          />
        </div>
      </div>

      {/* Overfit/Underfit Scatter Plot */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
        <h4 className="text-lg font-medium text-white mb-4">Overfit/Underfit Analysis</h4>
        <div className="h-64">
          <Chart
            data={scatterData}
            yLabel="Predicted Values"
            historicalLabel="Actual vs Predicted"
            id="overfit-scatter-plot"
            isTimeSeries={false}
          />
        </div>
      </div>

      {/* Error Distribution Chart */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
        <h4 className="text-lg font-medium text-white mb-4">Error Distribution</h4>
        <div className="h-64">
          <Chart
            data={metrics.errorDistribution.map((value, index) => ({
              timestamp: index * 0.5,
              value
            }))}
            yLabel="Percentage of Errors"
            historicalLabel="Error Distribution"
            id="error-distribution-chart"
            isBarChart={true}
          />
        </div>
      </div>

      <div className="text-xs text-gray-400">
        Last updated: {new Date(metrics.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
