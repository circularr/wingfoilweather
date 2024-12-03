import React, { useState, useEffect, useCallback } from 'react';
import { WeatherModel } from './model';
import { Map } from '../Map';
import { WindTable } from '../WindTable';
import { PredictionChart } from '../Chart';
import { fetchHistoricalWeather } from '../../lib/weather';
import type { WeatherData, PredictionChunk } from './types';

export function WeatherPredictor() {
  const [location, setLocation] = useState<{ lat: number; lon: number; } | undefined>();
  const [rawData, setRawData] = useState<WeatherData[]>([]);
  const [predictions, setPredictions] = useState<PredictionChunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocationSelect = useCallback(async (lat: number, lon: number) => {
    setLocation({ lat, lon });
    setError(null);
    setIsLoading(true);

    try {
      // Fetch historical data
      const historicalData = await fetchHistoricalWeather(lat, lon);
      setRawData(historicalData);

      // Initialize and train model
      const model = new WeatherModel();
      await model.initialize();
      await model.train(historicalData);

      // Make predictions
      const newPredictions = await model.predict(historicalData.slice(-16));
      setPredictions(newPredictions);

    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Convert WeatherData to PredictionChunk format for charts
  const convertToPredictionChunks = (data: WeatherData[]): PredictionChunk[] => {
    return data.map(d => ({
      startTime: d.timestamp,
      endTime: d.timestamp + 3600000, // 1 hour
      temperature: d.temperature,
      windSpeed: d.windSpeed,
      windGusts: d.windGusts,
      windDirection: d.windDirection,
      humidity: d.humidity,
      confidence: 1.0 // Historical data has full confidence
    }));
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Select Location</h2>
        <Map onLocationSelect={handleLocationSelect} selectedLocation={location} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-lg text-gray-600">Loading and analyzing weather data...</p>
        </div>
      ) : (
        rawData.length > 0 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Raw Wind Speed</h2>
              <PredictionChart 
                data={convertToPredictionChunks(rawData.slice(-24))}
                dataKey="windSpeed" 
                color="#2563EB"
                unit="kts"
              />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Raw Wind Direction</h2>
              <PredictionChart 
                data={convertToPredictionChunks(rawData.slice(-24))}
                dataKey="windDirection" 
                color="#F59E0B"
                unit="°"
              />
            </div>

            {predictions.length > 0 && (
              <>
                <div>
                  <h2 className="text-2xl font-bold mb-4">Predicted Wind Speed</h2>
                  <PredictionChart 
                    data={predictions}
                    dataKey="windSpeed"
                    color="#10B981"
                    unit="kts"
                  />
                </div>

                <div>
                  <h2 className="text-2xl font-bold mb-4">Predicted Wind Direction</h2>
                  <PredictionChart 
                    data={predictions}
                    dataKey="windDirection"
                    color="#8B5CF6"
                    unit="°"
                  />
                </div>

                <div>
                  <h2 className="text-2xl font-bold mb-4">Detailed Forecast</h2>
                  <WindTable 
                    historicalData={rawData.slice(-24)}
                    predictions={predictions}
                  />
                </div>
              </>
            )}
          </div>
        )
      )}
    </div>
  );
}
