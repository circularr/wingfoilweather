// src/components/Chart/index.tsx

import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions,
  ChartData,
  ChartType,
  TooltipItem,
  ScatterDataPoint,
  ChartTypeRegistry,
  ScatterController,
  LineController,
  BarController
} from 'chart.js';
import type { DeepPartial } from 'chart.js/types/utils';
import { enGB } from 'date-fns/locale';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ScatterController,
  LineController,
  BarController
);

type ChartDataPoint = {
  timestamp: number;
  historical?: number;
  forecast?: number;
  prediction?: number;
  training?: number;
  validation?: number;
  value?: number;
  actual?: number;
  predicted?: number;
};

interface ChartProps {
  data: ChartDataPoint[];
  yLabel: string;
  xLabel?: string;
  historicalLabel?: string;
  forecastLabel?: string;
  predictionLabel?: string;
  id: string;
  isTimeSeries?: boolean;
  isBarChart?: boolean;
  showXAxis?: boolean;
}

type ChartTypes = 'line' | 'bar' | 'scatter';

export function Chart({
  data,
  yLabel,
  xLabel,
  historicalLabel,
  forecastLabel,
  predictionLabel,
  id,
  isTimeSeries = true,
  isBarChart = false,
  showXAxis = true
}: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const datasets: ChartData<ChartTypes>['datasets'] = [];

    if (data.some((d) => d.historical !== undefined)) {
      datasets.push({
        type: 'line' as const,
        label: historicalLabel ?? 'Historical Data',
        data: data
          .filter((d): d is ChartDataPoint & { historical: number } => d.historical !== undefined)
          .map((d) => ({ x: d.timestamp, y: d.historical })),
        borderColor: 'rgb(186, 230, 253)',
        backgroundColor: 'rgba(186, 230, 253, 0.1)',
        borderWidth: 1.5,
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: 0.4,
        fill: false
      });
    }

    if (data.some((d) => d.forecast !== undefined)) {
      datasets.push({
        type: 'line' as const,
        label: forecastLabel,
        data: data
          .filter((d): d is ChartDataPoint & { forecast: number } => d.forecast !== undefined)
          .map((d) => ({ x: d.timestamp, y: d.forecast })),
        borderColor: 'rgb(165, 180, 252)',
        backgroundColor: 'rgba(165, 180, 252, 0.1)',
        borderWidth: 1.5,
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: 0.4,
        fill: false
      });
    }

    if (data.some((d) => d.prediction !== undefined)) {
      datasets.push({
        type: 'line' as const,
        label: predictionLabel,
        data: data
          .filter((d): d is ChartDataPoint & { prediction: number } => d.prediction !== undefined)
          .map((d) => ({ x: d.timestamp, y: d.prediction })),
        borderColor: 'rgb(240, 171, 252)',
        backgroundColor: 'rgba(240, 171, 252, 0.1)',
        borderWidth: 1.5,
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: 0.4,
        fill: false
      });
    }

    if (data.some((d) => d.training !== undefined)) {
      datasets.push({
        type: 'line' as const,
        label: historicalLabel ?? 'Training Loss',
        data: data
          .filter((d): d is ChartDataPoint & { training: number } => d.training !== undefined)
          .map((d) => ({ x: d.timestamp, y: d.training })),
        borderColor: 'rgb(129, 140, 248)',
        backgroundColor: 'rgba(129, 140, 248, 0.1)',
        borderWidth: 1.5,
        pointRadius: 3,
        pointHoverRadius: 4,
        tension: 0.0,
        fill: false
      });
    }

    if (data.some((d) => d.validation !== undefined)) {
      datasets.push({
        type: 'line' as const,
        label: forecastLabel ?? 'Validation Loss',
        data: data
          .filter((d): d is ChartDataPoint & { validation: number } => d.validation !== undefined)
          .map((d) => ({ x: d.timestamp, y: d.validation })),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 1.5,
        pointRadius: 3,
        pointHoverRadius: 4,
        tension: 0.0,
        fill: false
      });
    }

    if (data.some((d) => d.value !== undefined)) {
      datasets.push({
        type: 'bar' as const,
        label: historicalLabel ?? 'Data',
        data: data
          .filter((d): d is ChartDataPoint & { value: number } => d.value !== undefined)
          .map((d) => ({ x: d.timestamp, y: d.value })),
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderWidth: 0
      });
    }

    if (data.some((d) => d.actual !== undefined && d.predicted !== undefined)) {
      datasets.push({
        type: 'scatter' as const,
        label: 'Predicted vs Actual',
        data: data
          .filter(
            (d): d is ChartDataPoint & { actual: number; predicted: number } =>
              d.actual !== undefined && d.predicted !== undefined
          )
          .map((d) => ({ x: d.actual, y: d.predicted })),
        borderColor: 'rgb(129, 140, 248)',
        backgroundColor: 'rgba(129, 140, 248, 0.5)',
        pointRadius: 3,
        pointHoverRadius: 5
      });
    }

    const options: DeepPartial<ChartOptions<ChartTypes>> = {
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
              weight: 500
            },
            color: 'rgb(226, 232, 240)'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: {
            family: "'Inter', system-ui, sans-serif",
            size: 12,
            weight: 'bold'
          },
          bodyFont: {
            family: "'Inter', system-ui, sans-serif",
            size: 12,
            weight: 'normal'
          },
          padding: 12,
          cornerRadius: 8,
          boxPadding: 4,
          borderColor: 'rgba(51, 65, 85, 0.5)',
          borderWidth: 1,
          displayColors: false,
          callbacks: {
            title: (tooltipItems: TooltipItem<ChartTypes>[]) => {
              if (isTimeSeries) {
                return new Date(tooltipItems[0].parsed.x).toLocaleString('en-GB', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                });
              }
              return tooltipItems[0].parsed.x.toString();
            },
            label: (context: TooltipItem<ChartTypes>) => {
              const value = context.parsed.y;
              if (value === null) return '';
              return `${context.dataset.label}: ${value.toFixed(2)} ${yLabel.replace('(', '').replace(')', '')}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: isTimeSeries ? 'time' : 'linear',
          adapters: {
            date: {
              locale: enGB
            }
          },
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
            color: 'rgb(148, 163, 184)',
            maxTicksLimit: 8
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
            color: 'rgb(148, 163, 184)',
            padding: 8,
            maxTicksLimit: 6
          },
          title: {
            display: true,
            text: yLabel,
            font: {
              family: "'Inter', system-ui, sans-serif",
              size: 12,
              weight: 500
            },
            color: 'rgb(148, 163, 184)',
            padding: {
              bottom: 8
            }
          }
        }
      }
    };

    const config = {
      type: (isBarChart ? 'bar' : 'line') as ChartTypes,
      data: { datasets },
      options
    };

    chartRef.current = new ChartJS(ctx, {
      type: config.type,
      data: config.data,
      options: config.options
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [
    data,
    yLabel,
    xLabel,
    historicalLabel,
    forecastLabel,
    predictionLabel,
    id,
    isTimeSeries,
    isBarChart,
    showXAxis
  ]);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} id={id}></canvas>
    </div>
  );
}
