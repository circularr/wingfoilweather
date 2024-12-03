import type { WeatherData } from '../components/WeatherPredictor/types';

export async function fetchHistoricalWeather(lat: number, lon: number, hours: number = 48): Promise<WeatherData[]> {
  console.log('Fetching weather data for:', { lat, lon, hours });
  
  try {
    // Get both past data and forecast
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lon}&` +
      `hourly=temperature_2m,relative_humidity_2m,windspeed_10m,winddirection_10m,windgusts_10m&` +
      `past_hours=${hours}&forecast_hours=24&` +
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
      windSpeed: data.hourly.windspeed_10m[i] * msToKnots, // Sustained wind speed
      windGusts: data.hourly.windgusts_10m[i] * msToKnots, // Gust speed
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
  // Wind speed ranges for wing foiling (in knots)
  if (windSpeed >= 15 && windSpeed <= 25) {
    return { quality: 'excellent', confidence: 0.9 };
  } else if (windSpeed >= 12 && windSpeed <= 30) {
    return { quality: 'good', confidence: 0.8 };
  } else if (windSpeed >= 10 && windSpeed <= 35) {
    return { quality: 'fair', confidence: 0.6 };
  } else {
    return { quality: 'poor', confidence: 0.4 };
  }
}

export function formatWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                     'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}
