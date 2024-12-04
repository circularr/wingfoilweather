import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, ChevronUpIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { ModelMetricsType } from './types';
import Chart from 'chart.js/auto';
import { Chart as ChartJS } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

ChartJS.register(annotationPlugin);

interface ModelMetricsProps {
  metrics: ModelMetricsType;
}

export function ModelMetrics({ metrics }: ModelMetricsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'metrics' | 'analysis'>('metrics');
  const fitChartRef = useRef<HTMLCanvasElement>(null);
  const errorChartRef = useRef<HTMLCanvasElement>(null);
  const scatterChartRef = useRef<HTMLCanvasElement>(null);
  const [fitChart, setFitChart] = useState<Chart | null>(null);
  const [errorChart, setErrorChart] = useState<Chart | null>(null);
  const [scatterChart, setScatterChart] = useState<Chart | null>(null);

  useEffect(() => {
    // Cleanup function
    return () => {
      if (fitChart) fitChart.destroy();
      if (errorChart) errorChart.destroy();
      if (scatterChart) scatterChart.destroy();
    };
  }, []);

  useEffect(() => {
    if (!isExpanded || activeTab !== 'analysis') return;

    // Cleanup previous charts
    if (fitChart) fitChart.destroy();
    if (errorChart) errorChart.destroy();
    if (scatterChart) scatterChart.destroy();

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
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#818cf8',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 1,
                tension: 0.3
              },
              {
                label: 'Validation Loss',
                data: metrics.validationLoss,
                borderColor: '#34d399',
                backgroundColor: 'rgba(52, 211, 153, 0.1)',
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#34d399',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 1,
                tension: 0.3
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
                color: '#e5e7eb',
                font: { size: 14, weight: 'bold' }
              },
              legend: {
                labels: { 
                  color: '#e5e7eb',
                  usePointStyle: true,
                  pointStyle: 'circle'
                }
              }
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'Epoch',
                  color: '#e5e7eb'
                },
                ticks: { color: '#e5e7eb' },
                grid: { color: 'rgba(75, 85, 99, 0.2)' }
              },
              y: {
                title: {
                  display: true,
                  text: 'Loss',
                  color: '#e5e7eb'
                },
                ticks: { color: '#e5e7eb' },
                grid: { color: 'rgba(75, 85, 99, 0.2)' }
              }
            }
          }
        });
        setFitChart(newChart);
      }
    }

    // Create scatter plot for underfitting/overfitting visualization
    if (scatterChartRef.current) {
      const ctx = scatterChartRef.current.getContext('2d');
      if (ctx) {
        // Generate some sample predicted vs actual data points
        const predictedVsActual = metrics.trainingLoss.map((_, i) => ({
          x: metrics.trainingLoss[i],
          y: metrics.validationLoss[i]
        }));

        const newChart = new Chart(ctx, {
          type: 'scatter',
          data: {
            datasets: [{
              label: 'Model Fit',
              data: predictedVsActual,
              backgroundColor: '#818cf8',
              pointRadius: 6,
              pointHoverRadius: 8
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'Model Fit Analysis',
                color: '#e5e7eb',
                font: { size: 14, weight: 'bold' }
              },
              annotation: {
                annotations: {
                  line1: {
                    type: 'line',
                    xMin: 0,
                    xMax: Math.max(...metrics.trainingLoss),
                    yMin: 0,
                    yMax: Math.max(...metrics.trainingLoss),
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    borderWidth: 2,
                    borderDash: [6, 6],
                    label: {
                      content: 'Perfect Fit',
                      display: true,
                      color: '#e5e7eb',
                      position: 'start'
                    }
                  },
                  underfitRegion: {
                    type: 'box',
                    xMin: Math.min(...metrics.trainingLoss),
                    xMax: Math.max(...metrics.trainingLoss) * 0.4,
                    yMin: Math.min(...metrics.validationLoss),
                    yMax: Math.max(...metrics.validationLoss),
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.5)',
                    borderWidth: 1,
                    label: {
                      content: 'Underfitting',
                      display: true,
                      color: 'rgba(239, 68, 68, 0.9)',
                      position: 'start'
                    }
                  },
                  overfitRegion: {
                    type: 'box',
                    xMin: Math.max(...metrics.trainingLoss) * 0.6,
                    xMax: Math.max(...metrics.trainingLoss),
                    yMin: Math.min(...metrics.validationLoss),
                    yMax: Math.max(...metrics.validationLoss),
                    backgroundColor: 'rgba(234, 179, 8, 0.1)',
                    borderColor: 'rgba(234, 179, 8, 0.5)',
                    borderWidth: 1,
                    label: {
                      content: 'Overfitting',
                      display: true,
                      color: 'rgba(234, 179, 8, 0.9)',
                      position: 'end'
                    }
                  }
                }
              }
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'Training Loss',
                  color: '#e5e7eb'
                },
                ticks: { color: '#e5e7eb' },
                grid: { color: 'rgba(75, 85, 99, 0.2)' }
              },
              y: {
                title: {
                  display: true,
                  text: 'Validation Loss',
                  color: '#e5e7eb'
                },
                ticks: { color: '#e5e7eb' },
                grid: { color: 'rgba(75, 85, 99, 0.2)' }
              }
            }
          }
        });
        setScatterChart(newChart);
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
              borderWidth: 1,
              borderRadius: 4,
              barPercentage: 0.9,
              categoryPercentage: 0.9
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'Error Distribution',
                color: '#e5e7eb',
                font: { size: 14, weight: 'bold' }
              },
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                titleColor: '#e5e7eb',
                bodyColor: '#e5e7eb',
                borderColor: 'rgba(75, 85, 99, 0.3)',
                borderWidth: 1,
                padding: 10,
                callbacks: {
                  label: (context) => `Frequency: ${context.parsed.y.toFixed(1)}%`
                }
              }
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'Error Range (kts)',
                  color: '#e5e7eb'
                },
                ticks: { 
                  color: '#e5e7eb',
                  maxRotation: 45,
                  minRotation: 45
                },
                grid: {
                  display: false
                }
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
                },
                grid: {
                  color: 'rgba(75, 85, 99, 0.2)'
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
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Model Fit Analysis</h4>
                  <div className="bg-gray-800 rounded-md p-4 border border-gray-700" style={{ height: '300px' }}>
                    <canvas ref={scatterChartRef} />
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
