import React, { useState, useCallback } from 'react';
import { WeatherPredictor as Model } from './model';
import { fetchHistoricalWeather } from '../../lib/weather';
import { PredictionChart } from '../Chart';
import { Map } from '../Map';
import { WindTable } from '../WindTable';
import type { PredictionChunk, WeatherData } from './types';

export const WeatherPredictor: React.FC = () => {
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<PredictionChunk[]>([]);
  const [rawData, setRawData] = useState<WeatherData[]>([]);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [progress, setProgress] = useState<{ epoch: number; loss: number } | null>(null);

  const handleLocationSelect = useCallback(async (lat: number, lon: number) => {
    setLocation({ lat, lon });
    setError(null);
    setPredictions([]);
    setProgress(null);
    
    try {
      setIsTraining(true);
      const weatherData = await fetchHistoricalWeather(lat, lon);
      setRawData(weatherData);
      
      const model = new Model();
      await model.train(weatherData, (status) => {
        setProgress(status);
      });
      
      const newPredictions = await model.predict(weatherData.slice(-16));
      setPredictions(newPredictions);
      model.dispose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsTraining(false);
    }
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Select Location</h2>
        <Map onLocationSelect={handleLocationSelect} selectedLocation={location} />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isTraining && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          Training model... {progress && `Epoch ${progress.epoch + 1}, Loss: ${progress.loss.toFixed(4)}`}
        </div>
      )}

      {predictions.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Raw Wind Speed</h2>
              <PredictionChart 
                data={rawData.slice(-16)} 
                dataKey="windSpeed" 
                color="#60A5FA"
                unit=" knots"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4">Predicted Wind Speed</h2>
              <PredictionChart 
                data={predictions} 
                dataKey="windSpeed" 
                color="#34D399"
                unit=" knots"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Raw Wind Direction</h2>
              <PredictionChart 
                data={rawData.slice(-16)} 
                dataKey="windDirection" 
                color="#F59E0B"
                unit="°"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4">Predicted Wind Direction</h2>
              <PredictionChart 
                data={predictions} 
                dataKey="windDirection" 
                color="#EC4899"
                unit="°"
              />
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Detailed Comparison</h2>
            <WindTable predictions={predictions} rawData={rawData} />
          </div>
        </>
      )}
    </div>
  );
};
