// src/components/WeatherPredictor/ModelMetrics.tsx

import React, { useState } from 'react';
import type { ModelMetricsType, TimeSeriesDataPoint } from './types';
import { Chart } from '../Chart';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface ModelMetricsProps {
  metrics: ModelMetricsType;
}

interface ExpandableDescriptionProps {
  title: string;
  children: React.ReactNode;
}

function ExpandableDescription({ title, children }: ExpandableDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="mt-2 text-sm">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-indigo-300 hover:text-indigo-200 transition-colors"
      >
        {isExpanded ? (
          <ChevronUpIcon className="w-4 h-4" />
        ) : (
          <ChevronDownIcon className="w-4 h-4" />
        )}
        {title}
      </button>
      {isExpanded && (
        <div className="mt-2 p-3 bg-slate-800/50 rounded-lg text-gray-300">
          {children}
        </div>
      )}
    </div>
  );
}

export function ModelMetrics({ metrics }: ModelMetricsProps) {
  if (!metrics) {
    return null;
  }

  // Helper function to safely map time series data
  const mapTimeSeriesData = (data: TimeSeriesDataPoint[] | undefined) => {
    if (!data || !Array.isArray(data)) {
      return [];
    }
    return data.map((d) => ({
      timestamp: d.timestamp,
      historical: d.actual ?? null,
      forecast: d.predicted ?? null
    }));
  };

  // Safely get the latest training loss
  const getLatestTrainingLoss = () => {
    if (!metrics.trainingLoss?.length) return 0;
    return metrics.trainingLoss[metrics.trainingLoss.length - 1];
  };

  // Prepare data for loss charts with null checks
  const epochs = Array.from({ length: metrics.trainingLoss?.length || 0 }, (_, i) => i + 1);
  const lossData = epochs.map((epoch, index) => ({
    timestamp: epoch,
    training: metrics.trainingLoss?.[index] ?? null,
    validation: metrics.validationLoss?.[index] ?? null
  })).filter(d => d.training !== null || d.validation !== null);

  // Prepare scatter plot data with null checks and calculate regression line
  const scatterData = (metrics.actuals || []).map((actual, index) => ({
    x: actual,
    y: metrics.predictions?.[index] ?? actual
  })).filter(d => d.x != null && d.y != null);

  // Calculate linear regression for best fit line
  const calculateLinearRegression = (data: { x: number; y: number }[]) => {
    if (data.length < 2) return null;

    const n = data.length;
    const sumX = data.reduce((acc, p) => acc + p.x, 0);
    const sumY = data.reduce((acc, p) => acc + p.y, 0);
    const sumXY = data.reduce((acc, p) => acc + p.x * p.y, 0);
    const sumXX = data.reduce((acc, p) => acc + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  };

  const regression = calculateLinearRegression(scatterData);

  // Create reference and regression lines
  const minVal = Math.min(...scatterData.map(d => d.x));
  const maxVal = Math.max(...scatterData.map(d => d.x));
  const referenceLine = [
    { x: minVal, y: minVal },
    { x: maxVal, y: maxVal }
  ];

  const regressionLine = regression ? [
    { x: minVal, y: regression.slope * minVal + regression.intercept },
    { x: maxVal, y: regression.slope * maxVal + regression.intercept }
  ] : [];

  // Calculate error distribution
  const calculateErrorDistribution = (actuals: number[], predictions: number[], binCount: number = 20) => {
    const validPairs = actuals.map((actual, index) => ({
      actual,
      predicted: predictions[index]
    })).filter(pair => pair.actual != null && pair.predicted != null);

    if (!validPairs.length) {
      return {
        distribution: [],
        minError: 0,
        maxError: 0,
        binSize: 0,
        errors: [],
        mean: 0,
        stdDev: 0
      };
    }

    const errors = validPairs.map(pair => pair.actual - pair.predicted);
    const mean = errors.reduce((sum, err) => sum + err, 0) / errors.length;
    const variance = errors.reduce((sum, err) => sum + Math.pow(err - mean, 2), 0) / errors.length;
    const stdDev = Math.sqrt(variance);

    const minError = mean - 3 * stdDev;
    const maxError = mean + 3 * stdDev;
    const binSize = (maxError - minError) / binCount;
    const distribution = Array(binCount).fill(0);
    
    errors.forEach(error => {
      const binIndex = Math.min(
        Math.floor((error - minError) / binSize),
        binCount - 1
      );
      if (binIndex >= 0 && binIndex < binCount) {
        distribution[binIndex]++;
      }
    });

    return {
      distribution,
      minError,
      maxError,
      binSize,
      errors,
      mean,
      stdDev
    };
  };

  // Calculate error metrics
  const errorStats = calculateErrorDistribution(
    metrics.actuals || [],
    metrics.predictions || []
  );

  // Safe timestamp formatting
  const formatTimestamp = (timestamp: string | number | undefined) => {
    try {
      if (!timestamp) return 'N/A';
      const date = typeof timestamp === 'string' ? new Date(parseInt(timestamp)) : new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-8 max-w-full">
      <div>
        <h3 className="text-xl font-semibold text-white">Model Performance Metrics</h3>
        <p className="text-sm text-gray-400 mt-2">
          Statistical analysis of the model's prediction accuracy
        </p>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400 ring-4 ring-blue-400/10"></div>
            <span className="text-sm font-medium text-blue-100">RMSE</span>
          </div>
          <div className="font-mono text-2xl text-white">{(metrics.rmse ?? 0).toFixed(2)}</div>
          <p className="text-xs text-gray-400 mt-1">Root Mean Square Error</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 ring-4 ring-indigo-400/10"></div>
            <span className="text-sm font-medium text-indigo-100">MAE</span>
          </div>
          <div className="font-mono text-2xl text-white">{(metrics.mae ?? 0).toFixed(2)}</div>
          <p className="text-xs text-gray-400 mt-1">Mean Absolute Error</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-violet-400 ring-4 ring-violet-400/10"></div>
            <span className="text-sm font-medium text-violet-100">R² Score</span>
          </div>
          <div className="font-mono text-2xl text-white">{((metrics.r2Score ?? 0) * 100).toFixed(1)}%</div>
          <p className="text-xs text-gray-400 mt-1">Coefficient of Determination</p>
        </div>
      </div>

      {/* Loss Chart */}
      {lossData.length > 0 && (
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
          <h4 className="text-lg font-medium text-white mb-4">Training and Validation Loss</h4>
          <div className="h-80">
            <Chart
              data={lossData}
              yLabel="Mean Squared Error (MSE)"
              xLabel="Epoch"
              historicalLabel="Training Loss"
              forecastLabel="Validation Loss"
              id="loss-chart"
              isTimeSeries={false}
              showXAxis={true}
            />
          </div>
          <ExpandableDescription title="Understanding the Loss Chart">
            <div className="space-y-2">
              <p><strong>What it shows:</strong> The model's learning progress over training iterations (epochs).</p>
              <p><strong>Training Loss:</strong> Error on data the model learns from.</p>
              <p><strong>Validation Loss:</strong> Error on unseen data, testing true performance.</p>
              <p><strong>Good patterns:</strong></p>
              <ul className="list-disc list-inside ml-2">
                <li>Both lines trending downward (learning is happening)</li>
                <li>Lines converging (model generalizes well)</li>
                <li>Smooth curves without sharp spikes</li>
              </ul>
              <p><strong>Warning signs:</strong></p>
              <ul className="list-disc list-inside ml-2">
                <li>Validation loss increasing while training loss decreases (overfitting)</li>
                <li>Both lines staying flat and high (underfitting)</li>
                <li>Erratic changes in validation loss (unstable learning)</li>
              </ul>
            </div>
          </ExpandableDescription>
        </div>
      )}

      {/* Prediction Accuracy Scatter Plot */}
      {scatterData.length > 0 && (
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
          <h4 className="text-lg font-medium text-white mb-4">Prediction Accuracy Analysis</h4>
          <div className="h-80">
            <Chart
              data={[
                // Scatter points
                ...scatterData.map(point => ({
                  timestamp: point.x,
                  scatter: point.y,
                  type: 'scatter' as const
                })),
                // Perfect prediction line (y=x)
                ...referenceLine.map(point => ({
                  timestamp: point.x,
                  reference: point.y,
                  type: 'reference' as const
                })),
                // Regression line
                ...regressionLine.map(point => ({
                  timestamp: point.x,
                  regression: point.y,
                  type: 'regression' as const
                }))
              ]}
              yLabel="Predicted Values"
              xLabel="Actual Values"
              historicalLabel="Predictions"
              forecastLabel="Perfect Prediction (y=x)"
              predictionLabel="Best Fit Line"
              id="prediction-accuracy-plot"
              isTimeSeries={false}
              showXAxis={true}
            />
          </div>
          <ExpandableDescription title="Understanding the Prediction Accuracy Plot">
            <div className="space-y-2">
              <p><strong>What it shows:</strong> How well predicted values match actual values</p>
              <p><strong>Lines and Points:</strong></p>
              <ul className="list-disc list-inside ml-2">
                <li>Blue dots: Individual predictions</li>
                <li>Dashed line: Perfect predictions (y=x)</li>
                <li>Solid line: Best fit trend</li>
              </ul>
              <p><strong>Interpretation:</strong></p>
              <ul className="list-disc list-inside ml-2">
                <li>Best fit line above diagonal: Model tends to overpredict</li>
                <li>Best fit line below diagonal: Model tends to underpredict</li>
                <li>Scattered points: High prediction variance</li>
                <li>Tight clustering: Consistent predictions</li>
              </ul>
              {regression && (
                <p><strong>Current bias:</strong> Model tends to {regression.slope > 1 ? 'overpredict' : 'underpredict'} 
                  by approximately {Math.abs((regression.slope - 1) * 100).toFixed(1)}%
                  {regression.intercept !== 0 && ` with a base offset of ${Math.abs(regression.intercept).toFixed(2)}`}
                </p>
              )}
            </div>
          </ExpandableDescription>
        </div>
      )}

      {/* Error Distribution */}
      {errorStats.errors.length > 0 && (
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
          <h4 className="text-lg font-medium text-white mb-4">Error Distribution</h4>
          <div className="h-80">
            <Chart
              data={errorStats.distribution.map((count, index) => ({
                timestamp: errorStats.minError + (index + 0.5) * errorStats.binSize,
                value: count / errorStats.errors.length * 100
              }))}
              yLabel="Percentage of Predictions (%)"
              xLabel="Prediction Error"
              historicalLabel="Error Distribution"
              id="error-distribution-chart"
              isBarChart={true}
              isTimeSeries={false}
              showXAxis={true}
            />
          </div>
          <ExpandableDescription title="Understanding the Error Distribution">
            <div className="space-y-2">
              <p><strong>What it shows:</strong> Distribution of prediction errors (actual - predicted)</p>
              <p><strong>Key statistics:</strong></p>
              <ul className="list-disc list-inside ml-2">
                <li>Mean error: {errorStats.mean.toFixed(2)} (closer to 0 is better)</li>
                <li>Standard deviation: {errorStats.stdDev.toFixed(2)}</li>
                <li>68% of errors within ±{errorStats.stdDev.toFixed(2)}</li>
                <li>95% of errors within ±{(2 * errorStats.stdDev).toFixed(2)}</li>
              </ul>
              <p><strong>Distribution shape:</strong></p>
              <ul className="list-disc list-inside ml-2">
                <li>Centered at 0: Unbiased predictions</li>
                <li>Narrow spread: Consistent predictions</li>
                <li>Symmetric: Equal chance of over/under prediction</li>
              </ul>
            </div>
          </ExpandableDescription>
        </div>
      )}

      <div className="text-xs text-gray-400">
        Last updated: {formatTimestamp(metrics.timestamp)}
      </div>
    </div>
  );
}
