import type { WeatherData } from '../components/WeatherPredictor/types';

export async function fetchHistoricalWeather(lat: number, lon: number, hours: number = 120): Promise<WeatherData[]> {
  console.log('Fetching weather data for:', { lat, lon, hours });
  
  try {
    // Calculate dates within allowed range
    const now = new Date();
    const startDate = new Date(now.getTime() - (hours * 60 * 60 * 1000));
    
    // Format dates as YYYY-MM-DD
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000)) // 2 days ahead max
      .toISOString().split('T')[0];
    
    console.log('Requesting data for date range:', { startDateStr, endDateStr });
    
    // Get both past data and forecast
    const url = `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lon}&` +
      `hourly=temperature_2m,relative_humidity_2m,windspeed_10m,winddirection_10m,windgusts_10m&` +
      `past_days=${Math.ceil(hours/24)}&` + // Include past days
      `forecast_days=2&` + // 2 days of forecast
      `timezone=auto&windspeed_unit=kn`;

    console.log('Fetching from URL:', url);
    
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`Weather API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Validate data structure
    if (!data.hourly?.time?.length) {
      console.error('Invalid data structure received:', data);
      throw new Error('Invalid weather data format - missing hourly data');
    }

    console.log('Received weather data:', {
      requestedLocation: { lat, lon },
      receivedLocation: { lat: data.latitude, lon: data.longitude },
      timeRange: { start: startDateStr, end: endDateStr },
      dataPoints: data.hourly.time.length,
      sampleData: {
        firstTimestamp: data.hourly.time[0],
        lastTimestamp: data.hourly.time[data.hourly.time.length - 1]
      }
    });

    // Data is already in knots due to windspeed_unit=kn parameter
    const weatherData = data.hourly.time.map((timestamp: string, i: number) => {
      const entry = {
        timestamp: new Date(timestamp).getTime(),
        temperature: data.hourly.temperature_2m[i],
        windSpeed: data.hourly.windspeed_10m[i],
        windGusts: data.hourly.windgusts_10m[i],
        windDirection: data.hourly.winddirection_10m[i],
        humidity: data.hourly.relative_humidity_2m[i],
        isForecast: new Date(timestamp).getTime() > now.getTime() // Add flag for forecast data
      };

      // Validate each entry
      if (Object.values(entry).some(v => v === undefined || v === null || isNaN(v))) {
        console.warn('Invalid entry found:', { timestamp, entry });
      }

      return entry;
    });

    // Filter out any invalid entries
    const validData = weatherData.filter(d => 
      !isNaN(d.timestamp) && 
      !isNaN(d.windSpeed) && 
      !isNaN(d.windDirection) &&
      d.windDirection >= 0 && 
      d.windDirection <= 360
    );

    const stats = {
      total: validData.length,
      historical: validData.filter(d => !d.isForecast).length,
      forecast: validData.filter(d => d.isForecast).length,
      timeRange: {
        start: format(Math.min(...validData.map(d => d.timestamp)), 'yyyy-MM-dd HH:mm'),
        end: format(Math.max(...validData.map(d => d.timestamp)), 'yyyy-MM-dd HH:mm')
      }
    };

    console.log('Processed weather data:', stats);
    
    if (stats.total === 0) {
      throw new Error('No valid weather data found after processing');
    }
    
    return validData;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
}

// Helper function to format dates
function format(timestamp: number, pattern: string): string {
  const date = new Date(timestamp);
  return pattern
    .replace('yyyy', date.getFullYear().toString())
    .replace('MM', (date.getMonth() + 1).toString().padStart(2, '0'))
    .replace('dd', date.getDate().toString().padStart(2, '0'))
    .replace('HH', date.getHours().toString().padStart(2, '0'))
    .replace('mm', date.getMinutes().toString().padStart(2, '0'));
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
