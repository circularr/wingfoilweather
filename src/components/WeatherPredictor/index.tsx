import { useState, useEffect, useCallback } from 'react';
import { WeatherPredictor } from './model';
import { PredictionChart } from '../Chart';
import { fetchHistoricalWeather, calculateWindQuality } from '../../lib/weather';
import type { PredictionChunk, TrainingStatus } from './types';

const predictor = new WeatherPredictor();

export function WeatherPrediction() {
  const [predictions, setPredictions] = useState<PredictionChunk[]>([]);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({
    epoch: 0,
    loss: 0,
    status: 'training'
  });
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);

  const updatePredictions = useCallback(async () => {
    if (!location) return;

    try {
      setError(null);
      console.log('Fetching historical data...');
      const historicalData = await fetchHistoricalWeather(location.lat, location.lon);
      
      console.log('Starting model training...');
      if (trainingStatus.status !== 'complete') {
        await predictor.train(historicalData, (status) => {
          console.log('Training progress:', status);
          setTrainingStatus({
            ...status,
            status: status.epoch < 9 ? 'training' : 'complete'
          });
        });
      }

      console.log('Getting predictions...');
      const newPredictions = await predictor.predict(historicalData);
      setPredictions(newPredictions);
    } catch (error) {
      console.error('Prediction error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      setTrainingStatus({ epoch: 0, loss: 0, status: 'error' });
    }
  }, [location, trainingStatus.status]);

  // Get user's location on mount
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Got user location:', position.coords);
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError('Could not get your location. Using default location.');
        // Default to San Francisco
        setLocation({ lat: 37.7749, lon: -122.4194 });
      }
    );
  }, []);

  // Update predictions when location changes or every 15 minutes
  useEffect(() => {
    if (location) {
      updatePredictions();
      const interval = setInterval(updatePredictions, 900000); // 15 minutes
      return () => clearInterval(interval);
    }
  }, [location, updatePredictions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => predictor.dispose();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6 max-w-md">
          <h2 className="text-xl font-medium text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              updatePredictions();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!predictions.length) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-medium mb-4">
            {trainingStatus.status === 'training' 
              ? `Training model... (${trainingStatus.epoch + 1}/10)`
              : 'Loading predictions...'}
          </h2>
          <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ 
                width: `${((trainingStatus.epoch + 1) / 10) * 100}%`
              }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Loss: {trainingStatus.loss.toFixed(4)}
          </p>
        </div>
      </div>
    );
  }

  const bestPrediction = predictions.reduce((best, current) => 
    current.confidence > best.confidence ? current : best
  );
  const windQuality = calculateWindQuality(bestPrediction.windSpeed);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">4×4 Weather Predictor</h1>
        <p className="text-gray-600">
          Predicting the next 16 hours in 4-hour chunks
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-medium mb-4">Best Conditions</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Wind Speed</p>
            <p className="text-2xl font-medium">
              {Math.round(bestPrediction.windSpeed)} km/h
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Temperature</p>
            <p className="text-2xl font-medium">
              {Math.round(bestPrediction.temperature)}°C
            </p>
          </div>
        </div>
        <div className="inline-block px-3 py-1 rounded-full text-sm font-medium"
             style={{
               backgroundColor: {
                 excellent: '#34D399',
                 good: '#60A5FA',
                 fair: '#FBBF24',
                 poor: '#EF4444'
               }[windQuality.quality],
               color: windQuality.quality === 'fair' ? '#1F2937' : 'white'
             }}>
          {windQuality.quality.charAt(0).toUpperCase() + windQuality.quality.slice(1)} Conditions
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-medium mb-4">Wind Speed Forecast</h3>
          <PredictionChart
            data={predictions}
            dataKey="windSpeed"
            color="#60A5FA"
            unit=" km/h"
          />
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-medium mb-4">Temperature Forecast</h3>
          <PredictionChart
            data={predictions}
            dataKey="temperature"
            color="#F87171"
            unit="°C"
          />
        </div>
      </div>
    </div>
  );
}
