import type { WeatherData } from '../components/WeatherPredictor/types';

export async function fetchHistoricalWeather(lat: number, lon: number, hours: number = 120): Promise<WeatherData[]> {
  console.log('Fetching weather data for:', { lat, lon, hours });
  
  try {
    // Get both past data and forecast
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lon}&` +
      `hourly=temperature_2m,relative_humidity_2m,windspeed_10m,winddirection_10m,windgusts_10m&` +
      `past_hours=${hours}&forecast_hours=48&` + // Get 5 days of historical data
      `timezone=auto`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received weather data:', data);

    if (!data.hourly || !Array.isArray(data.hourly.time)) {
      throw new Error('Invalid weather data format');
    }

    // Convert wind speed from m/s to knots
    const msToKnots = 1.94384;
    
    const weatherData = data.hourly.time.map((timestamp: string, i: number) => ({
      timestamp: new Date(timestamp).getTime(),
      temperature: data.hourly.temperature_2m[i],
      windSpeed: data.hourly.windspeed_10m[i] * msToKnots,
      windGusts: data.hourly.windgusts_10m[i] * msToKnots,
      windDirection: data.hourly.winddirection_10m[i],
      humidity: data.hourly.relative_humidity_2m[i]
    }));

    // Filter out any invalid entries
    const validData = weatherData.filter(d => 
      !isNaN(d.timestamp) && 
      !isNaN(d.windSpeed) && 
      !isNaN(d.windDirection) &&
      d.windDirection >= 0 && 
      d.windDirection <= 360
    );

    console.log('Processed weather data:', validData.length, 'valid records');
    return validData;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
}

export function calculateWindQuality(windSpeed: number): {
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  confidence: number;
} {
  // Convert to knots if not already
  const speed = windSpeed;
  
  if (speed < 8) return { quality: 'poor', confidence: 0.8 };
  if (speed < 12) return { quality: 'fair', confidence: 0.9 };
  if (speed < 25) return { quality: 'good', confidence: 1.0 };
  if (speed < 35) return { quality: 'excellent', confidence: 0.9 };
  return { quality: 'poor', confidence: 0.8 }; // Too strong
}

export function formatWindDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}
