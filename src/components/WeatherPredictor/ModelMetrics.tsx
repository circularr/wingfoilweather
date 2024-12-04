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

  // Cleanup charts on unmount
  useEffect(() => {
    return () => {
      if (fitChart) fitChart.destroy();
      if (errorChart) errorChart.destroy();
      if (scatterChart) scatterChart.destroy();
    };
  }, []);

  // Update charts when metrics change or tab is switched
  useEffect(() => {
    if (!isExpanded || activeTab !== 'analysis') return;

    // Cleanup previous charts
    if (fitChart) fitChart.destroy();
    if (errorChart) errorChart.destroy();
    if (scatterChart) scatterChart.destroy();

    // Create training progress chart
    if (fitChartRef.current && metrics.trainingLoss.length > 0) {
      const ctx = fitChartRef.current.getContext('2d');
      if (ctx) {
        const epochs = Array.from({ length: metrics.trainingLoss.length }, (_, i) => i + 1);
        const newChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: epochs,
            datasets: [
              {
                label: 'Training Loss',
                data: metrics.trainingLoss,
                borderColor: '#818cf8',
                backgroundColor: 'rgba(129, 140, 248, 0.1)',
                fill: true,
                pointRadius: 2,
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
                pointRadius: 2,
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
            animation: {
              duration: 0
            },
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
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                titleColor: '#e5e7eb',
                bodyColor: '#e5e7eb',
                borderColor: 'rgba(75, 85, 99, 0.3)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 4
              }
            },
            interaction: {
              mode: 'nearest',
              axis: 'x',
              intersect: false
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'Epoch',
                  color: '#e5e7eb'
                },
                ticks: { color: '#e5e7eb' },
                grid: { 
                  color: 'rgba(75, 85, 99, 0.2)',
                  lineWidth: 1,
                  display: true
                },
                border: {
                  display: false
                }
              },
              y: {
                title: {
                  display: true,
                  text: 'Loss',
                  color: '#e5e7eb'
                },
                ticks: { color: '#e5e7eb' },
                grid: { 
                  color: 'rgba(75, 85, 99, 0.2)',
                  lineWidth: 1,
                  display: true
                },
                border: {
                  display: false
                },
                min: 0
              }
            }
          }
        });
        setFitChart(newChart);
      }
    }

    // Create scatter plot for model fit analysis
    if (scatterChartRef.current && metrics.trainingLoss.length > 0) {
      const ctx = scatterChartRef.current.getContext('2d');
      if (ctx) {
        const scatterData = metrics.trainingLoss.map((loss, i) => ({
          x: loss,
          y: metrics.validationLoss[i] || 0
        }));

        const maxLoss = Math.max(
          ...metrics.trainingLoss,
          ...metrics.validationLoss.filter(Boolean)
        );

        const newChart = new Chart(ctx, {
          type: 'scatter',
          data: {
            datasets: [{
              label: 'Training vs Validation Loss',
              data: scatterData,
              backgroundColor: '#818cf8',
              pointRadius: 4,
              pointHoverRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 0
            },
            plugins: {
              title: {
                display: true,
                text: 'Model Fit Analysis',
                color: '#e5e7eb',
                font: { size: 14, weight: 'bold' }
              },
              tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                titleColor: '#e5e7eb',
                bodyColor: '#e5e7eb',
                borderColor: 'rgba(75, 85, 99, 0.3)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 4,
                callbacks: {
                  label: (context: any) => {
                    const point = context.raw;
                    return `Training: ${point.x.toFixed(4)}, Validation: ${point.y.toFixed(4)}`;
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
                grid: { 
                  color: 'rgba(75, 85, 99, 0.2)',
                  lineWidth: 1,
                  display: true
                },
                border: {
                  display: false
                },
                min: 0,
                max: maxLoss * 1.1
              },
              y: {
                title: {
                  display: true,
                  text: 'Validation Loss',
                  color: '#e5e7eb'
                },
                ticks: { color: '#e5e7eb' },
                grid: { 
                  color: 'rgba(75, 85, 99, 0.2)',
                  lineWidth: 1,
                  display: true
                },
                border: {
                  display: false
                },
                min: 0,
                max: maxLoss * 1.1
              }
            }
          }
        });
        setScatterChart(newChart);
      }
    }

    // Create error distribution chart
    if (errorChartRef.current && metrics.errorDistribution.length > 0) {
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
            animation: {
              duration: 0
            },
            plugins: {
              title: {
                display: true,
                text: 'Error Distribution',
                color: '#e5e7eb',
                font: { size: 14, weight: 'bold' }
              },
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                titleColor: '#e5e7eb',
                bodyColor: '#e5e7eb',
                borderColor: 'rgba(75, 85, 99, 0.3)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 4
              }
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'Error Range (m/s)',
                  color: '#e5e7eb'
                },
                ticks: { 
                  color: '#e5e7eb',
                  maxRotation: 45,
                  minRotation: 45
                },
                grid: { 
                  display: false
                },
                border: {
                  display: false
                }
              },
              y: {
                title: {
                  display: true,
                  text: 'Frequency (%)',
                  color: '#e5e7eb'
                },
                ticks: { color: '#e5e7eb' },
                grid: { 
                  color: 'rgba(75, 85, 99, 0.2)',
                  lineWidth: 1,
                  display: true
                },
                border: {
                  display: false
                },
                min: 0,
                max: 100
              }
            }
          }
        });
        setErrorChart(newChart);
      }
    }
  }, [metrics, isExpanded, activeTab]);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800/70 transition-colors"
      >
        <div className="flex items-center gap-3">
          <AcademicCapIcon className="w-5 h-5 text-indigo-400" />
          <span className="font-medium text-white">Model Performance Metrics</span>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'metrics'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Key Metrics
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'analysis'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Detailed Analysis
            </button>
          </div>

          {activeTab === 'metrics' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="text-sm text-gray-400">RMSE</div>
                <div className="text-2xl font-semibold text-white mt-1">
                  {metrics.rmse.toFixed(3)}
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="text-sm text-gray-400">MAE</div>
                <div className="text-2xl font-semibold text-white mt-1">
                  {metrics.mae.toFixed(3)}
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="text-sm text-gray-400">R² Score</div>
                <div className="text-2xl font-semibold text-white mt-1">
                  {metrics.r2Score.toFixed(3)}
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="text-sm text-gray-400">Sample Size</div>
                <div className="text-2xl font-semibold text-white mt-1">
                  {metrics.sampleSize}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="h-64">
                  <canvas ref={fitChartRef} />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <div className="h-64">
                    <canvas ref={scatterChartRef} />
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <div className="h-64">
                    <canvas ref={errorChartRef} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
