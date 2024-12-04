import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  LineController
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend
);

interface ChartProps {
  data: Array<{
    timestamp: number;
    forecast?: number;
    prediction?: number;
  }>;
  yLabel: string;
  forecastLabel: string;
  predictionLabel: string;
  id: string;
}

export function Chart({ data, yLabel, forecastLabel, predictionLabel, id }: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    // Cleanup previous chart instance
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const formatTime = (timestamp: number) => {
      return new Date(timestamp).toLocaleString('en-GB', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    };

    // Transform undefined values to null for Chart.js
    const forecastData = data.map(d => d.forecast ?? null);
    const predictionData = data.map(d => d.prediction ?? null);

    // Create new chart instance
    chartRef.current = new ChartJS(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => formatTime(d.timestamp)),
        datasets: [
          {
            label: forecastLabel,
            data: forecastData,
            borderColor: 'rgb(165 180 252)',  // text-indigo-300
            backgroundColor: 'rgba(165 180 252, 0.1)',
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.4,
            fill: false
          },
          {
            label: predictionLabel,
            data: predictionData,
            borderColor: 'rgb(240 171 252)',  // text-fuchsia-300
            backgroundColor: 'rgba(240 171 252, 0.1)',
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.4,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'start',
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              padding: 15,
              font: {
                family: "'Inter', system-ui, sans-serif",
                size: 12,
                weight: '500'
              },
              color: 'rgb(226, 232, 240)' // slate-200
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleFont: {
              family: "'Inter', system-ui, sans-serif",
              size: 12,
              weight: '600'
            },
            bodyFont: {
              family: "'Inter', system-ui, sans-serif",
              size: 12,
              weight: '400'
            },
            padding: 12,
            cornerRadius: 8,
            boxPadding: 4,
            borderColor: 'rgba(51, 65, 85, 0.5)',
            borderWidth: 1,
            displayColors: false,
            callbacks: {
              title: (tooltipItems) => {
                return tooltipItems[0].label;
              },
              label: (context) => {
                const value = context.parsed.y;
                if (value === null) return '';
                return `${context.dataset.label}: ${value.toFixed(1)} ${yLabel.replace('(', '').replace(')', '')}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: true,
              color: 'rgba(51, 65, 85, 0.1)',
              tickLength: 0
            },
            ticks: {
              maxRotation: 0,
              font: {
                family: "'Inter', system-ui, sans-serif",
                size: 11
              },
              color: 'rgb(148, 163, 184)', // slate-400
              maxTicksLimit: 8,
              callback: function(value, index, values) {
                const label = this.getLabelForValue(value as number);
                return label.split(',')[0]; // Show only date, not time
              }
            },
            border: {
              color: 'rgba(51, 65, 85, 0.2)'
            }
          },
          y: {
            grid: {
              display: true,
              color: 'rgba(51, 65, 85, 0.1)',
              tickLength: 0
            },
            border: {
              color: 'rgba(51, 65, 85, 0.2)'
            },
            ticks: {
              font: {
                family: "'Inter', system-ui, sans-serif",
                size: 11
              },
              color: 'rgb(148, 163, 184)', // slate-400
              padding: 8,
              maxTicksLimit: 6
            },
            title: {
              display: true,
              text: yLabel,
              font: {
                family: "'Inter', system-ui, sans-serif",
                size: 12,
                weight: '500'
              },
              color: 'rgb(148, 163, 184)', // slate-400
              padding: {
                bottom: 8
              }
            }
          }
        },
        layout: {
          padding: {
            top: 8,
            right: 8,
            bottom: 8,
            left: 8
          }
        }
      }
    });

    // Cleanup function
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data, yLabel, forecastLabel, predictionLabel, id]);

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <canvas ref={canvasRef} id={id}></canvas>
    </div>
  );
}
