import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, ChevronUpIcon, AcademicCapIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Chart from 'chart.js/auto';

interface ModelMetricsProps {
  metrics: {
    validationStrategy: string;
    rmse: number;
    mae: number;
    r2Score: number;
    confidenceIntervals: {
      wind: number;
      direction: number;
      temperature: number;
    };
    sampleSize: number;
    timestamp: string;
    trainingLoss: number[];
    validationLoss: number[];
    errorDistribution: number[];
  };
}

export function ModelMetrics({ metrics }: ModelMetricsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'metrics' | 'analysis'>('metrics');
  const fitChartRef = useRef<HTMLCanvasElement>(null);
  const errorChartRef = useRef<HTMLCanvasElement>(null);

  // Determine model fit status
  const getFitStatus = () => {
    const lastTrainingLoss = metrics.trainingLoss[metrics.trainingLoss.length - 1];
    const lastValidationLoss = metrics.validationLoss[metrics.validationLoss.length - 1];
    const ratio = lastValidationLoss / lastTrainingLoss;

    if (ratio > 1.5) return { status: 'Overfitting', color: 'text-yellow-400' };
    if (ratio < 0.8) return { status: 'Underfitting', color: 'text-red-400' };
    return { status: 'Good Fit', color: 'text-green-400' };
  };

  const fitStatus = getFitStatus();

  useEffect(() => {
    if (!isExpanded || activeTab !== 'analysis') return;

    // Create fit visualization chart
    if (fitChartRef.current) {
      const ctx = fitChartRef.current.getContext('2d');
      if (ctx) {
        const chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: Array.from({ length: metrics.trainingLoss.length }, (_, i) => i + 1),
            datasets: [
              {
                label: 'Training Loss',
                data: metrics.trainingLoss,
                borderColor: '#818cf8',
                backgroundColor: 'rgba(129, 140, 248, 0.1)',
                tension: 0.4,
                fill: true
              },
              {
                label: 'Validation Loss',
                data: metrics.validationLoss,
                borderColor: '#34d399',
                backgroundColor: 'rgba(52, 211, 153, 0.1)',
                tension: 0.4,
                fill: true
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
              intersect: false,
              mode: 'index'
            },
            plugins: {
              title: {
                display: true,
                text: 'Training Progress',
                color: '#e5e7eb',
                font: {
                  size: 14,
                  weight: 'normal'
                }
              },
              legend: {
                labels: {
                  color: '#e5e7eb',
                  usePointStyle: true
                }
              },
              tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.8)',
                titleColor: '#e5e7eb',
                bodyColor: '#e5e7eb',
                borderColor: '#374151',
                borderWidth: 1,
                padding: 12,
                displayColors: true
              }
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'Epoch',
                  color: '#e5e7eb'
                },
                grid: {
                  color: '#374151',
                  drawBorder: false
                },
                ticks: {
                  color: '#e5e7eb'
                }
              },
              y: {
                title: {
                  display: true,
                  text: 'Loss',
                  color: '#e5e7eb'
                },
                grid: {
                  color: '#374151',
                  drawBorder: false
                },
                ticks: {
                  color: '#e5e7eb'
                }
              }
            }
          }
        });

        return () => chart.destroy();
      }
    }

    // Create error distribution chart
    if (errorChartRef.current) {
      const ctx = errorChartRef.current.getContext('2d');
      if (ctx) {
        const chart = new Chart(ctx, {
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
              borderRadius: 4
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
                font: {
                  size: 14,
                  weight: 'normal'
                }
              },
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.8)',
                titleColor: '#e5e7eb',
                bodyColor: '#e5e7eb',
                borderColor: '#374151',
                borderWidth: 1,
                padding: 12,
                callbacks: {
                  label: (context: any) => {
                    return `${context.formattedValue}% of predictions`;
                  }
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
                grid: {
                  display: false
                },
                ticks: {
                  color: '#e5e7eb',
                  maxRotation: 45,
                  minRotation: 45
                }
              },
              y: {
                title: {
                  display: true,
                  text: 'Frequency (%)',
                  color: '#e5e7eb'
                },
                grid: {
                  color: '#374151',
                  drawBorder: false
                },
                ticks: {
                  color: '#e5e7eb',
                  callback: (value: any) => `${value}%`
                }
              }
            }
          }
        });

        return () => chart.destroy();
      }
    }
  }, [isExpanded, activeTab, metrics]);

  return (
    <div className="bg-gray-800/50 backdrop-blur rounded-lg border border-gray-700 mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center space-x-3">
          <AcademicCapIcon className="h-5 w-5 text-indigo-400" />
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-medium text-gray-200">Model Performance Metrics</h3>
              <span className={`text-xs font-medium ${fitStatus.color}`}>
                • {fitStatus.status}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {isExpanded ? 'Click to collapse' : 'Click to view validation strategy and error metrics'}
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
                Fit Analysis
              </button>
            </div>

            {activeTab === 'metrics' ? (
              <div className="space-y-4">
                {/* Validation Strategy */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Validation Strategy</h4>
                  <p className="text-sm text-gray-400 bg-gray-800 rounded-md p-3 border border-gray-700">
                    {metrics.validationStrategy}
                  </p>
                </div>

                {/* Error Metrics */}
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

                {/* Confidence Intervals */}
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

                {/* Sample Information */}
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
                {/* Model Fit Status */}
                <div className="bg-gray-800 rounded-md p-4 border border-gray-700">
                  <div className="flex items-start space-x-3">
                    {fitStatus.status === 'Good Fit' ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-400" />
                    ) : (
                      <ExclamationTriangleIcon className={`h-5 w-5 ${fitStatus.color}`} />
                    )}
                    <div>
                      <h4 className={`text-sm font-medium ${fitStatus.color}`}>{fitStatus.status}</h4>
                      <p className="text-sm text-gray-400 mt-1">
                        {fitStatus.status === 'Good Fit' 
                          ? 'The model shows good balance between training and validation performance.'
                          : fitStatus.status === 'Overfitting'
                          ? 'The model may be too complex for the data. Consider reducing epochs or increasing regularization.'
                          : 'The model may be too simple. Consider increasing epochs or model complexity.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Training vs Validation Loss */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Training Progress</h4>
                  <div className="bg-gray-800 rounded-md p-4 border border-gray-700">
                    <canvas ref={fitChartRef} />
                  </div>
                </div>

                {/* Error Distribution */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Error Analysis</h4>
                  <div className="bg-gray-800 rounded-md p-4 border border-gray-700">
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
