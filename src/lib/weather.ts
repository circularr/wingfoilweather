import type { WeatherData } from '../components/WeatherPredictor/types';

export async function fetchHistoricalWeather(
  lat: number,
  lon: number,
  hours: number = 120
): Promise<WeatherData[]> {
  console.log('Fetching weather data for:', { lat, lon, hours });

  try {
    // Calculate dates within allowed range
    const now = new Date();
    const startDate = new Date(now.getTime() - hours * 60 * 60 * 1000);

    // Format dates as YYYY-MM-DD
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) // 2 days ahead max
      .toISOString()
      .split('T')[0];

    console.log('Requesting data for date range:', { startDateStr, endDateStr });

    // Use a CORS proxy to avoid CORS issues
    const proxyUrl = 'https://corsproxy.io/?';

    // Fetch wind data
    const weatherUrl =
      proxyUrl +
      encodeURIComponent(
        `https://api.open-meteo.com/v1/forecast?` +
          `latitude=${lat}&longitude=${lon}&` +
          `hourly=windspeed_10m,winddirection_10m,windgusts_10m&` +
          `past_days=${Math.ceil(hours / 24)}&` +
          `forecast_days=2&` +
          `timezone=auto`
      );

    // Fetch marine data
    const marineUrl =
      proxyUrl +
      encodeURIComponent(
        `https://marine-api.open-meteo.com/v1/marine?` +
          `latitude=${lat}&longitude=${lon}&` +
          `hourly=wave_height,wave_period,wave_direction&` +
          `past_days=${Math.ceil(hours / 24)}&` +
          `forecast_days=2&` +
          `timezone=auto`
      );

    console.log('Fetching from URLs:', { weatherUrl, marineUrl });

    // Fetch both APIs in parallel
    const [weatherResponse, marineResponse] = await Promise.all([
      fetch(weatherUrl),
      fetch(marineUrl)
    ]);

    if (!weatherResponse.ok || !marineResponse.ok) {
      const weatherText = await weatherResponse.text();
      const marineText = await marineResponse.text();
      console.error('API Error Response:', { weather: weatherText, marine: marineText });
      throw new Error(`Weather API error: ${weatherResponse.status}/${marineResponse.status}`);
    }

    const [weatherData, marineData] = await Promise.all([
      weatherResponse.json(),
      marineResponse.json()
    ]);

    // Validate data structure
    if (!weatherData.hourly?.time?.length || !marineData.hourly?.time?.length) {
      console.error('Invalid data structure received:', { weatherData, marineData });
      throw new Error('Invalid weather data format - missing hourly data');
    }

    console.log('Received weather data:', {
      requestedLocation: { lat, lon },
      receivedLocation: {
        weather: { lat: weatherData.latitude, lon: weatherData.longitude },
        marine: { lat: marineData.latitude, lon: marineData.longitude }
      },
      timeRange: { start: startDateStr, end: endDateStr },
      dataPoints: {
        weather: weatherData.hourly.time.length,
        marine: marineData.hourly.time.length
      }
    });

    const combinedData = weatherData.hourly.time.map((timestamp: string, i: number) => {
      const now = new Date().getTime();
      const entryTime = new Date(timestamp).getTime();

      // Find matching marine data index
      const marineIndex = marineData.hourly.time.findIndex(
        (t: string) => new Date(t).getTime() === entryTime
      );

      const entry = {
        timestamp: entryTime,
        windSpeed: weatherData.hourly.windspeed_10m[i],
        windGusts: weatherData.hourly.windgusts_10m[i],
        windDirection: weatherData.hourly.winddirection_10m[i],
        waveHeight: marineIndex >= 0 ? marineData.hourly.wave_height[marineIndex] : undefined,
        wavePeriod: marineIndex >= 0 ? marineData.hourly.wave_period[marineIndex] : undefined,
        swellDirection:
          marineIndex >= 0 ? marineData.hourly.wave_direction[marineIndex] : undefined,
        isForecast: entryTime > now
      };

      // Validate each entry
      if (
        Object.values(entry).some(
          (v) =>
            v !== undefined &&
            v !== null &&
            typeof v === 'number' &&
            isNaN(v as number)
        )
      ) {
        console.warn('Invalid entry found:', { timestamp, entry });
      }

      return entry;
    });

    // Filter out any invalid entries
    const validData = combinedData.filter(
      (d) =>
        !isNaN(d.timestamp) &&
        !isNaN(d.windSpeed) &&
        !isNaN(d.windDirection) &&
        d.windDirection >= 0 &&
        d.windDirection <= 360 &&
        (d.waveHeight === undefined || !isNaN(d.waveHeight)) &&
        (d.wavePeriod === undefined || !isNaN(d.wavePeriod)) &&
        (d.swellDirection === undefined ||
          (!isNaN(d.swellDirection) &&
            d.swellDirection >= 0 &&
            d.swellDirection <= 360))
    );

    const stats = {
      total: validData.length,
      historical: validData.filter((d) => !d.isForecast).length,
      forecast: validData.filter((d) => d.isForecast).length,
      withWaveData: validData.filter((d) => d.waveHeight !== undefined).length,
      timeRange: {
        start: format(Math.min(...validData.map((d) => d.timestamp)), 'yyyy-MM-dd HH:mm'),
        end: format(Math.max(...validData.map((d) => d.timestamp)), 'yyyy-MM-dd HH:mm')
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
