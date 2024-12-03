import React, { useState, useEffect } from 'react';
import { Map } from '../Map';
import { WindTable } from '../WindTable';
import { fetchHistoricalWeather } from '../../lib/weather';
import { trainModel, predictNextHours } from './model';
import type { WeatherData, PredictionChunk } from './types';

export function WeatherPredictor() {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number; } | null>(null);
  const [historicalData, setHistoricalData] = useState<WeatherData[]>([]);
  const [forecastData, setForecastData] = useState<WeatherData[]>([]);
  const [predictions, setPredictions] = useState<PredictionChunk[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedLocation) {
      setIsLoading(true);
      setError(null);
      setPredictions([]); // Clear previous predictions

      fetchHistoricalWeather(selectedLocation.lat, selectedLocation.lon)
        .then(async (data) => {
          // Split data into historical and forecast
          const now = Date.now();
          const historical = data.filter(d => d.timestamp <= now);
          const forecast = data.filter(d => d.timestamp > now);
          
          // Sort both arrays chronologically
          const sortedHistorical = [...historical].sort((a, b) => a.timestamp - b.timestamp);
          const sortedForecast = [...forecast].sort((a, b) => a.timestamp - b.timestamp);
          
          console.log('Processed data:', {
            total: data.length,
            historical: sortedHistorical.length,
            forecast: sortedForecast.length,
            timeRange: {
              start: new Date(sortedHistorical[0].timestamp).toISOString(),
              end: new Date(sortedForecast[sortedForecast.length - 1].timestamp).toISOString()
            }
          });

          setHistoricalData(sortedHistorical);
          setForecastData(sortedForecast);
          
          try {
            // Train model and generate predictions using only historical data
            const model = await trainModel(sortedHistorical);
            const nextHours = await predictNextHours(model, sortedHistorical);
            
            console.log('Generated predictions:', {
              count: nextHours.length,
              sample: nextHours[0],
              timeRange: {
                start: new Date(nextHours[0].startTime).toISOString(),
                end: new Date(nextHours[nextHours.length - 1].startTime).toISOString()
              }
            });

            setPredictions(nextHours);
          } catch (err) {
            console.error('Prediction error:', err);
            setError(err instanceof Error ? err.message : 'Unknown error during prediction');
          }
        })
        .catch(err => {
          console.error('Data fetch error:', err);
          setError(err instanceof Error ? err.message : 'Unknown error fetching data');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [selectedLocation]);

  const handleLocationSelect = (lat: number, lon: number) => {
    setSelectedLocation({ lat, lon });
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      <Map onLocationSelect={handleLocationSelect} selectedLocation={selectedLocation} />
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <div className="text-lg text-gray-600">Loading and analyzing weather data...</div>
        </div>
      )}

      {!isLoading && selectedLocation && historicalData.length > 0 && (
        <WindTable 
          historicalData={historicalData}
          forecastData={forecastData}
          predictions={predictions}
        />
      )}
    </div>
  );
}
