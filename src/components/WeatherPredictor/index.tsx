import React, { useState, useEffect } from 'react';
import { Map } from '../Map';
import { WindTable } from '../WindTable';
import { fetchHistoricalWeather } from '../../lib/weather';
import { trainModel, predictNextHours } from './model';
import type { WeatherData, PredictionChunk, PerformancePreset, TrainingProgress, ModelMetricsType } from './types';
import { PerformanceControls } from './PerformanceControls';
import { ModelMetrics } from './ModelMetrics';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import * as tf from '@tensorflow/tfjs';
import './styles.css';

interface TrainingHistory {
  loss: number[];
  valLoss: number[];
  epoch: number;
}

export function WeatherPredictor() {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number; } | null>(null);
  const [historicalData, setHistoricalData] = useState<WeatherData[]>([]);
  const [forecastData, setForecastData] = useState<WeatherData[]>([]);
  const [predictions, setPredictions] = useState<PredictionChunk[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [performancePreset, setPerformancePreset] = useState<PerformancePreset>('balanced');
  const [useLightModel, setUseLightModel] = useState(false);
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [smoothedLoss, setSmoothedLoss] = useState(0);
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [metrics, setMetrics] = useState<ModelMetricsType>({
    validationStrategy: '10-fold cross-validation with 80/20 train-test split',
    rmse: 0,
    mae: 0,
    r2Score: 0,
    confidenceIntervals: {
      wind: 0,
      direction: 0,
      temperature: 0
    },
    sampleSize: 0,
    timestamp: new Date().toISOString(),
    trainingLoss: [],
    validationLoss: [],
    errorDistribution: []
  });
  const [trainingLoss, setTrainingLoss] = useState<number[]>([]);
  const [validationLoss, setValidationLoss] = useState<number[]>([]);

  useEffect(() => {
    if (selectedLocation) {
      setIsLoading(true);
      setError(null);
      setPredictions([]); // Clear previous predictions
      setTrainingLoss([]); // Clear previous training data
      setValidationLoss([]); // Clear previous validation data
      setProgress(null); // Reset progress
      setMetrics(prev => ({ ...prev, trainingLoss: [], validationLoss: [], errorDistribution: [] })); // Reset metrics

      fetchHistoricalWeather(selectedLocation.lat, selectedLocation.lon)
        .then(async (data) => {
          // Split data into historical and forecast
          const now = Date.now();
          const historical = data.filter(d => d.timestamp <= now);
          const forecast = data.filter(d => d.timestamp > now);
          
          // Sort both arrays chronologically
          const sortedHistorical = [...historical].sort((a, b) => a.timestamp - b.timestamp);
          const sortedForecast = [...forecast].sort((a, b) => a.timestamp - b.timestamp);

          setHistoricalData(sortedHistorical);
          setForecastData(sortedForecast);
          
          try {
            const newTrainingLoss: number[] = [];
            const newValidationLoss: number[] = [];

            // Train model and generate predictions using only historical data
            const newModel = await trainModel(sortedHistorical, { 
              performancePreset, 
              useLightModel,
              callbacks: {
                onProgress: (progress) => {
                  setProgress(progress);
                  if (progress.loss !== undefined) {
                    setSmoothedLoss(prev => {
                      const alpha = 0.1; // Smoothing factor
                      return prev * (1 - alpha) + progress.loss * alpha;
                    });
                  }
                },
                onModelUpdate: setModel,
                onTrainingLoss: (loss) => {
                  newTrainingLoss.push(loss);
                  setTrainingLoss([...newTrainingLoss]);
                  // Update metrics immediately with new loss data
                  setMetrics(prev => ({
                    ...prev,
                    trainingLoss: [...newTrainingLoss]
                  }));
                },
                onValidationLoss: (loss) => {
                  newValidationLoss.push(loss);
                  setValidationLoss([...newValidationLoss]);
                  // Update metrics immediately with new validation data
                  setMetrics(prev => ({
                    ...prev,
                    validationLoss: [...newValidationLoss]
                  }));
                }
              }
            });

            const nextHours = await predictNextHours(newModel, sortedHistorical);
            setPredictions(nextHours);

            // Calculate final metrics
            // Since we don't have actual future data, we can compute errors on validation data
            const errors = newValidationLoss.map((valLoss) => Math.sqrt(valLoss));

            const mse = errors.reduce((acc, err) => acc + err * err, 0) / errors.length;
            const mae = errors.reduce((acc, err) => acc + err, 0) / errors.length;
            const rmse = Math.sqrt(mse);

            // Since we don't have actual R² calculation without true values, we'll set it to NaN
            const r2Score = NaN;

            // Update metrics with all data
            setMetrics(prevMetrics => ({
              ...prevMetrics,
              rmse,
              mae,
              r2Score,
              sampleSize: sortedHistorical.length,
              errorDistribution: calculateErrorDistribution(errors)
            }));

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
  }, [selectedLocation, performancePreset, useLightModel]);

  const calculateErrorDistribution = (errors: number[]) => {
    const maxError = Math.ceil(Math.max(...errors));
    const binSize = 0.5;
    const numBins = Math.ceil(maxError / binSize);
    const distribution = new Array(numBins).fill(0);
    
    errors.forEach(error => {
      const binIndex = Math.min(Math.floor(error / binSize), numBins - 1);
      distribution[binIndex]++;
    });

    // Normalize to percentages
    const total = errors.length;
    return distribution.map(count => (count / total) * 100);
  };

  const handleLocationSelect = (lat: number, lon: number) => {
    setSelectedLocation({ lat, lon });
  };

  const resetLocation = () => {
    // Refresh the entire site
    window.location.reload();
  };

  // Calculate overall progress percentage
  const getProgressPercentage = () => {
    if (!progress) return 0;
    
    switch (progress.stage) {
      case 'initializing':
        return 5;
      case 'training':
        return 5 + ((progress.currentEpoch / progress.totalEpochs) * 85);
      case 'predicting':
        return 100;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800">
            <div className="p-8">
              <div className="flex items-center justify-between gap-3 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 bg-indigo-500 rounded-full"></div>
                  <h2 className="text-xl text-white font-medium">Performance Settings</h2>
                </div>
                {(selectedLocation || isLoading) && (
                  <button
                    onClick={resetLocation}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      bg-gray-800 text-gray-100 hover:bg-gray-700 hover:text-white
                      border border-gray-700/50 hover:border-gray-600
                      flex items-center gap-2"
                  >
                    <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                      />
                    </svg>
                    {isLoading ? 'Stop Analysis' : 'Reset Location'}
                  </button>
                )}
              </div>
              
              <div className="text-gray-100 space-y-4 mb-8">
                <p className="text-sm leading-relaxed">
                  Fine-tune your prediction accuracy and speed. Choose between quick results 
                  for exploration or detailed analysis for precise planning.
                </p>
                <PerformanceControls
                  performancePreset={performancePreset}
                  useLightModel={useLightModel}
                  onPresetChange={setPerformancePreset}
                  onModelTypeChange={setUseLightModel}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-gray-800 mb-8">
          <Map onLocationSelect={handleLocationSelect} selectedLocation={selectedLocation} />
        </div>
        
        {error && (
          <div className="mb-8 rounded-xl p-4 bg-red-950/50 border border-red-500/30">
            <div className="flex gap-3 items-center text-red-200">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {selectedLocation && !isLoading && predictions.length > 0 && (
          <div className="mb-8">
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
              <div className="space-y-6">
                <div className="flex flex-col space-y-4">
                  <h3 className="text-xl font-semibold text-white">Weather Data Analysis</h3>
                  <div className="grid gap-3 bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-400 ring-4 ring-blue-400/10"></div>
                      <span className="text-blue-100 font-medium">Historical Data</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 ring-4 ring-indigo-400/10"></div>
                      <span className="text-indigo-100 font-medium">OpenMeteo Forecast</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-violet-400 ring-4 ring-violet-400/10"></div>
                      <span className="text-violet-100 font-medium">AI Prediction</span>
                    </div>
                  </div>
                </div>

                {/* Wind Table Component */}
                <WindTable 
                  historicalData={historicalData}
                  forecastData={forecastData}
                  predictions={predictions}
                />
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="mb-8">
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
              <div className="space-y-6">
                <div className="flex flex-col space-y-4">
                  <h3 className="text-xl font-semibold text-white">Analysis Progress</h3>
                  <div className="grid gap-3 bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-400 ring-4 ring-blue-400/10"></div>
                      <span className="text-blue-100 font-medium">Historical Data</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 ring-4 ring-indigo-400/10"></div>
                      <span className="text-indigo-100 font-medium">OpenMeteo Forecast</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-violet-400 ring-4 ring-violet-400/10"></div>
                      <span className="text-violet-100 font-medium">AI Prediction</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="font-medium text-white">
                      {progress?.stage === 'initializing' && 'Initializing model...'}
                      {progress?.stage === 'training' && `Training model (${progress.currentEpoch}/${progress.totalEpochs})`}
                      {progress?.stage === 'predicting' && 'Generating predictions...'}
                      {!progress && 'Preparing analysis...'}
                    </div>
                    {progress?.stage === 'training' && progress.loss !== undefined && (
                      <div className="flex items-center gap-3 bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-700 shadow-lg">
                        <div className="flex flex-col">
                          <span className="text-xs uppercase tracking-wider text-slate-100">Loss</span>
                          <span className="font-mono text-lg text-white tabular-nums transition-all duration-1000">
                            {smoothedLoss.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Progress bar with smooth animation */}
                <div className="relative">
                  <div className="overflow-hidden h-2.5 rounded-full bg-slate-900 border border-slate-700">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 transition-all duration-300 ease-out relative"
                      style={{
                        width: `${getProgressPercentage()}%`,
                      }}
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.3)_50%,transparent_100%)] animate-shine"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {metrics && !error && (
          <div className="mb-8">
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
              <ModelMetrics metrics={metrics} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
