import React, { useState, useEffect } from 'react';
import { Map } from '../Map';
import { WindTable } from '../WindTable';
import { fetchHistoricalWeather } from '../../lib/weather';
import { trainModel, predictNextHours } from './model';
import type { WeatherData, PredictionChunk, PerformancePreset, TrainingProgress } from './types';
import { PerformanceControls } from './PerformanceControls';
import './styles.css';

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

          setHistoricalData(sortedHistorical);
          setForecastData(sortedForecast);
          
          try {
            // Train model and generate predictions using only historical data
            const model = await trainModel(sortedHistorical, { 
              performancePreset, 
              useLightModel 
            }, setProgress);
            const nextHours = await predictNextHours(model, sortedHistorical);
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
          setProgress(null);
        });
    }
  }, [selectedLocation, performancePreset, useLightModel]);

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
                      bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white
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
              
              <div className="text-gray-300 space-y-4 mb-8">
                <p className="text-sm leading-relaxed">
                  Fine-tune your prediction accuracy and speed. Choose between quick results 
                  for exploration or detailed analysis for precise planning.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {[
                    {
                      mode: 'Fast',
                      icon: '⚡',
                      desc: 'Quick results, perfect for exploring different locations'
                    },
                    {
                      mode: 'Balanced',
                      icon: '⚖️',
                      desc: 'Optimal mix of speed and prediction accuracy'
                    },
                    {
                      mode: 'Accurate',
                      icon: '🎯',
                      desc: 'Highest precision, recommended for detailed planning'
                    }
                  ].map(({ mode, icon, desc }) => (
                    <div key={mode} className="flex gap-3 p-4 rounded-xl bg-gray-800/50">
                      <span className="text-xl">{icon}</span>
                      <div>
                        <h3 className="font-medium text-white">{mode}</h3>
                        <p className="text-gray-400 text-sm mt-1">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <PerformanceControls
                performancePreset={performancePreset}
                useLightModel={useLightModel}
                onPresetChange={setPerformancePreset}
                onModelTypeChange={setUseLightModel}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-gray-800 mb-8">
          <Map onLocationSelect={handleLocationSelect} selectedLocation={selectedLocation} />
        </div>
        
        {error && (
          <div className="mb-8 rounded-xl p-4 bg-red-500/10 border border-red-500/20">
            <div className="flex gap-3 items-center text-red-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="mb-8">
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between text-gray-200">
                  <div className="font-medium">
                    {progress?.stage === 'initializing' && 'Initializing model...'}
                    {progress?.stage === 'training' && `Training model (Epoch ${progress.currentEpoch}/${progress.totalEpochs})`}
                    {progress?.stage === 'predicting' && 'Generating predictions...'}
                    {!progress && 'Preparing analysis...'}
                  </div>
                  <div className="text-sm text-indigo-400/80">
                    {useLightModel ? 'Optimized' : 'Standard'} • {performancePreset}
                  </div>
                </div>
                
                {/* Win 3.1 style progress bar */}
                <div className="relative">
                  <div className="overflow-hidden h-6 rounded bg-gray-800/50 border border-gray-700/50">
                    <div 
                      className="h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#4f46e5_10px,#4f46e5_20px)]"
                      style={{
                        width: `${getProgressPercentage()}%`,
                        transition: 'width 0.5s ease-out',
                      }}
                    />
                  </div>
                  
                  {/* Scanline effect */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Data collection</span>
                      <span className="text-indigo-400">Complete</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Model initialization</span>
                      <span className={progress ? 'text-indigo-400' : 'text-gray-500'}>
                        {progress ? 'Complete' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Training progress</span>
                      <span className={progress?.stage === 'training' ? 'text-white' : 'text-gray-500'}>
                        {progress?.stage === 'training' ? `${Math.round((progress.currentEpoch / progress.totalEpochs) * 100)}%` : 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Prediction generation</span>
                      <span className={progress?.stage === 'predicting' ? 'text-indigo-400' : 'text-gray-500'}>
                        {progress?.stage === 'predicting' ? 'Complete' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {progress?.stage === 'training' && progress.loss > 0 && (
                  <div className="text-sm text-gray-500">
                    Current Loss: {progress.loss.toFixed(4)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!isLoading && selectedLocation && historicalData.length > 0 && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl overflow-hidden">
            <WindTable 
              historicalData={historicalData}
              forecastData={forecastData}
              predictions={predictions}
            />
          </div>
        )}
      </div>
    </div>
  );
}
