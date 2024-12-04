import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, ChevronUpIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { ModelMetricsType } from './types';
import Chart from 'chart.js/auto';

interface ModelMetricsProps {
  metrics: ModelMetricsType;
}

export function ModelMetrics({ metrics }: ModelMetricsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'metrics' | 'analysis'>('metrics');
  const fitChartRef = useRef<HTMLCanvasElement>(null);
  const errorChartRef = useRef<HTMLCanvasElement>(null);
  const [fitChart, setFitChart] = useState<Chart | null>(null);
  const [errorChart, setErrorChart] = useState<Chart | null>(null);

  useEffect(() => {
    // Cleanup function
    return () => {
      if (fitChart) fitChart.destroy();
      if (errorChart) errorChart.destroy();
    };
  }, []);

  useEffect(() => {
    if (!isExpanded || activeTab !== 'analysis') return;

    // Cleanup previous charts
    if (fitChart) fitChart.destroy();
    if (errorChart) errorChart.destroy();

    // Create training progress chart
    if (fitChartRef.current) {
      const ctx = fitChartRef.current.getContext('2d');
      if (ctx) {
        const newChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: Array.from({ length: metrics.trainingLoss.length }, (_, i) => i + 1),
            datasets: [
              {
                label: 'Training Loss',
                data: metrics.trainingLoss,
                borderColor: '#818cf8',
                backgroundColor: 'rgba(129, 140, 248, 0.1)',
                fill: true
              },
              {
                label: 'Validation Loss',
                data: metrics.validationLoss,
                borderColor: '#34d399',
                backgroundColor: 'rgba(52, 211, 153, 0.1)',
                fill: true
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'Training Progress',
                color: '#e5e7eb'
              },
              legend: {
                labels: { color: '#e5e7eb' }
              }
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'Epoch',
                  color: '#e5e7eb'
                },
                ticks: { color: '#e5e7eb' }
              },
              y: {
                title: {
                  display: true,
                  text: 'Loss',
                  color: '#e5e7eb'
                },
                ticks: { color: '#e5e7eb' }
              }
            }
          }
        });
        setFitChart(newChart);
      }
    }

    // Create error distribution chart
    if (errorChartRef.current) {
      const ctx = errorChartRef.current.getContext('2d');
      if (ctx) {
        const newChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: Array.from(
              { length: metrics.errorDistribution.length },
              (_, i) => `${(i * 0.5).toFixed(1)}-${((i + 1) * 0.5).toFixed(1)}`
            ),
            datasets: [{
              label: 'Frequency (%)',
              data: metrics.errorDistribution,
              backgroundColor: 'rgba(129, 140, 248, 0.6)',
              borderColor: '#818cf8',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'Error Distribution',
                color: '#e5e7eb'
              },
              legend: { display: false }
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'Error Range (kts)',
                  color: '#e5e7eb'
                },
                ticks: { color: '#e5e7eb' }
              },
              y: {
                title: {
                  display: true,
                  text: 'Frequency (%)',
                  color: '#e5e7eb'
                },
                ticks: {
                  color: '#e5e7eb',
                  callback: (value) => `${value}%`
                }
              }
            }
          }
        });
        setErrorChart(newChart);
      }
    }
  }, [isExpanded, activeTab, metrics]);

  return (
    <div className="bg-gray-800/50 backdrop-blur rounded-lg border border-gray-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center space-x-3">
          <AcademicCapIcon className="h-5 w-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-medium text-gray-200">Model Performance Metrics</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {isExpanded ? 'Click to collapse' : 'Click to view metrics and analysis'}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="border-t border-gray-700 pt-4">
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => setActiveTab('metrics')}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  activeTab === 'metrics'
                    ? 'bg-indigo-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                Metrics
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  activeTab === 'analysis'
                    ? 'bg-indigo-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                Analysis
              </button>
            </div>

            {activeTab === 'metrics' ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Error Metrics</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-800 rounded-md p-3 border border-gray-700">
                      <p className="text-xs text-gray-400">RMSE</p>
                      <p className="text-sm font-mono text-gray-200 mt-1">
                        {metrics.rmse.toFixed(3)}
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded-md p-3 border border-gray-700">
                      <p className="text-xs text-gray-400">MAE</p>
                      <p className="text-sm font-mono text-gray-200 mt-1">
                        {metrics.mae.toFixed(3)}
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded-md p-3 border border-gray-700">
                      <p className="text-xs text-gray-400">R² Score</p>
                      <p className="text-sm font-mono text-gray-200 mt-1">
                        {metrics.r2Score.toFixed(3)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">95% Confidence Intervals (±)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-800 rounded-md p-3 border border-gray-700">
                      <p className="text-xs text-gray-400">Wind Speed</p>
                      <p className="text-sm font-mono text-gray-200 mt-1">
                        ±{metrics.confidenceIntervals.wind.toFixed(1)} kts
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded-md p-3 border border-gray-700">
                      <p className="text-xs text-gray-400">Direction</p>
                      <p className="text-sm font-mono text-gray-200 mt-1">
                        ±{metrics.confidenceIntervals.direction.toFixed(1)}°
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded-md p-3 border border-gray-700">
                      <p className="text-xs text-gray-400">Temperature</p>
                      <p className="text-sm font-mono text-gray-200 mt-1">
                        ±{metrics.confidenceIntervals.temperature.toFixed(1)}°C
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-700">
                  <div>
                    <p className="text-xs text-gray-400">Sample Size</p>
                    <p className="text-sm font-mono text-gray-200 mt-1">
                      {metrics.sampleSize.toLocaleString()} observations
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Generated At</p>
                    <p className="text-sm font-mono text-gray-200 mt-1">
                      {new Date(metrics.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Training Progress</h4>
                  <div className="bg-gray-800 rounded-md p-4 border border-gray-700" style={{ height: '300px' }}>
                    <canvas ref={fitChartRef} />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Error Distribution</h4>
                  <div className="bg-gray-800 rounded-md p-4 border border-gray-700" style={{ height: '300px' }}>
                    <canvas ref={errorChartRef} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
