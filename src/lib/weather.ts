import type { WeatherData } from '../components/WeatherPredictor/types';

const OPEN_METEO_API = 'https://api.open-meteo.com/v1/forecast';

export async function fetchHistoricalData(
  latitude: number,
  longitude: number,
  hours: number = 16
): Promise<WeatherData[]> {
  const now = new Date();
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
  
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: 'temperature_2m,windspeed_10m,winddirection_10m,relativehumidity_2m',
    start_date: start.toISOString().split('T')[0],
    end_date: now.toISOString().split('T')[0],
  });

  const response = await fetch(`${OPEN_METEO_API}?${params}`);
  const data = await response.json();

  return data.hourly.time.map((timestamp: string, index: number) => ({
    timestamp: new Date(timestamp).getTime(),
    temperature: data.hourly.temperature_2m[index],
    windSpeed: data.hourly.windspeed_10m[index],
    windDirection: data.hourly.winddirection_10m[index],
    humidity: data.hourly.relativehumidity_2m[index],
  }));
}

export function normalizeWeatherData(data: WeatherData[]) {
  const fields = ['temperature', 'windSpeed', 'windDirection', 'humidity'];
  const stats = fields.reduce((acc, field) => {
    const values = data.map(d => d[field as keyof WeatherData] as number);
    acc[field] = {
      min: Math.min(...values),
      max: Math.max(...values),
    };
    return acc;
  }, {} as Record<string, { min: number; max: number }>);

  return data.map(item => ({
    ...item,
    temperature: normalize(item.temperature, stats.temperature.min, stats.temperature.max),
    windSpeed: normalize(item.windSpeed, stats.windSpeed.min, stats.windSpeed.max),
    windDirection: normalize(item.windDirection, 0, 360),
    humidity: normalize(item.humidity, 0, 100),
  }));
}

function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}

export function denormalizeWeatherData(
  normalizedData: WeatherData[],
  originalStats: Record<string, { min: number; max: number }>
): WeatherData[] {
  return normalizedData.map(item => ({
    ...item,
    temperature: denormalize(item.temperature, originalStats.temperature.min, originalStats.temperature.max),
    windSpeed: denormalize(item.windSpeed, originalStats.windSpeed.min, originalStats.windSpeed.max),
    windDirection: denormalize(item.windDirection, 0, 360),
    humidity: denormalize(item.humidity, 0, 100),
  }));
}

function denormalize(normalizedValue: number, min: number, max: number): number {
  return normalizedValue * (max - min) + min;
} 