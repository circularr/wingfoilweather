import * as tf from '@tensorflow/tfjs';
import type { WeatherData } from '../components/WeatherPredictor/types';

export interface NormalizationStats {
  min: number;
  max: number;
}

export interface DataStats {
  temperature: NormalizationStats;
  windSpeed: NormalizationStats;
  windDirection: NormalizationStats;
  humidity: NormalizationStats;
}

export function calculateStats(data: WeatherData[]): DataStats {
  return {
    temperature: {
      min: Math.min(...data.map(d => d.temperature)),
      max: Math.max(...data.map(d => d.temperature)),
    },
    windSpeed: {
      min: Math.min(...data.map(d => d.windSpeed)),
      max: Math.max(...data.map(d => d.windSpeed)),
    },
    windDirection: { min: 0, max: 360 },
    humidity: { min: 0, max: 100 },
  };
}

export function normalizeData(data: WeatherData[], stats: DataStats): tf.Tensor2D {
  return tf.tidy(() => {
    const normalizedData = data.map(d => [
      normalize(d.temperature, stats.temperature.min, stats.temperature.max),
      normalize(d.windSpeed, stats.windSpeed.min, stats.windSpeed.max),
      normalize(d.windDirection, stats.windDirection.min, stats.windDirection.max),
      normalize(d.humidity, stats.humidity.min, stats.humidity.max),
    ]);
    return tf.tensor2d(normalizedData);
  });
}

export function denormalizeData(
  tensor: tf.Tensor2D,
  stats: DataStats
): WeatherData[] {
  const data = tensor.arraySync() as number[][];
  return data.map((row, i) => ({
    timestamp: Date.now() + i * 3600 * 1000, // 1 hour intervals
    temperature: denormalize(row[0], stats.temperature.min, stats.temperature.max),
    windSpeed: denormalize(row[1], stats.windSpeed.min, stats.windSpeed.max),
    windDirection: denormalize(row[2], stats.windDirection.min, stats.windDirection.max),
    humidity: denormalize(row[3], stats.humidity.min, stats.humidity.max),
  }));
}

function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}

function denormalize(value: number, min: number, max: number): number {
  return value * (max - min) + min;
} 