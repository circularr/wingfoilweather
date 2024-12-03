import React, { useState, useEffect, useCallback } from 'react';
import { WeatherModel } from './model';
import { WeatherChart } from '../Chart';
import { WindTable } from '../WindTable';
import { Map } from '../Map';
import { fetchHistoricalData } from '../../lib/weather';
import { initializeTensorFlow } from '../../lib/tf-init';
import type { WeatherData, PredictionChunk, ModelState } from './types';

const DEFAULT_COORDS = {
  latitude: 37.7749,
  longitude: -122.4194,
};

export function WeatherPredictor() {
  const [predictions, setPredictions] = useState<PredictionChunk[]>([]);
  const [historicalData, setHistoricalData] = useState<WeatherData[]>([]);
  const [modelState, setModelState] = useState<ModelState>({
    isTraining: false,
    isReady: false,
    error: null,
  });
  const [currentLocation, setCurrentLocation] = useState(DEFAULT_COORDS);

  const initModel = useCallback(async (latitude: number, longitude: number) => {
    try {
      setModelState(prev => ({ ...prev, isTraining: true, error: null }));
      
      // Initialize TensorFlow.js
      await initializeTensorFlow();
      
      // Get historical data
      const historicalData = await fetchHistoricalData(latitude, longitude);
      setHistoricalData(historicalData);

      // Initialize and train model
      const model = new WeatherModel();
      await model.initialize();
      await model.train(historicalData);

      // Make initial prediction
      const prediction = await model.predict(historicalData.slice(-16));
      setPredictions(prediction);
      setModelState({ isTraining: false, isReady: true, error: null });
    } catch (error) {
      console.error('Training error:', error);
      setModelState({
        isTraining: false,
        isReady: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, []);

  useEffect(() => {
    initModel(currentLocation.latitude, currentLocation.longitude);
  }, [currentLocation, initModel]);

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setCurrentLocation({
      latitude: lat,
      longitude: lng,
    });
  }, []);

  if (modelState.error) {
    return (
      <div className="error-container">
        <h3>Error</h3>
        <p>{modelState.error}</p>
        <button onClick={() => initModel(currentLocation.latitude, currentLocation.longitude)}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="weather-predictor">
      <h2>Weather Prediction</h2>
      <p>Click on the map to select a location</p>
      
      <Map 
        onLocationSelect={handleLocationSelect}
        initialLocation={{
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
        }}
      />

      {modelState.isTraining ? (
        <div className="loading-container">
          <h3>Training Model</h3>
          <p>Please wait while we analyze the weather patterns...</p>
        </div>
      ) : (
        <>
          <WeatherChart data={predictions} />
          <WindTable rawData={historicalData} predictions={predictions} />
          
          <div className="predictions-grid">
            {predictions.map((chunk, index) => (
              <div key={chunk.startTime} className="prediction-card">
                <h4>{new Date(chunk.startTime).toLocaleTimeString([], { 
                  hour: '2-digit',
                  minute: '2-digit',
                })}</h4>
                <p>Temperature: {chunk.temperature.toFixed(1)}°C</p>
                <p>Wind: {chunk.windSpeed.toFixed(1)} km/h</p>
                <p>Confidence: {(chunk.confidence * 100).toFixed(0)}%</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 