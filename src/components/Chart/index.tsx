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
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.4,
            fill: false
          },
          {
            label: predictionLabel,
            data: predictionData,
            borderColor: 'rgb(168, 85, 247)',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.4,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              title: (items) => {
                if (items.length > 0) {
                  const index = items[0].dataIndex;
                  return formatTime(data[index].timestamp);
                }
                return '';
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Time'
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: yLabel
            }
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
