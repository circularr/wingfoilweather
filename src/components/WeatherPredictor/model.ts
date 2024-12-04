import * as tf from '@tensorflow/tfjs';
import type { WeatherData, PredictionChunk, ModelConfig } from './types';

const PERFORMANCE_CONFIGS = {
  fast: {
    epochs: 20,
    batchSize: 64,
    learningRate: 0.002,
    timeSteps: 8,
    predictionSteps: 24
  },
  balanced: {
    epochs: 50,
    batchSize: 32,
    learningRate: 0.001,
    timeSteps: 16,
    predictionSteps: 24
  },
  accurate: {
    epochs: 100,
    batchSize: 16,
    learningRate: 0.0005,
    timeSteps: 24,
    predictionSteps: 24
  }
};

const DEFAULT_CONFIG: ModelConfig = {
  ...PERFORMANCE_CONFIGS.balanced,
  performancePreset: 'balanced',
  useLightModel: false
};

export interface TrainingProgress {
  currentEpoch: number;
  totalEpochs: number;
  loss: number;
  stage: 'initializing' | 'training' | 'predicting';
}

export class WeatherModel {
  private model: tf.LayersModel | null = null;
  private config: ModelConfig;
  private static modelCache: { [key: string]: tf.LayersModel } = {};

  constructor(config: Partial<ModelConfig> = {}) {
    // If a preset is provided, use its values as base
    const baseConfig = config.performancePreset 
      ? PERFORMANCE_CONFIGS[config.performancePreset]
      : PERFORMANCE_CONFIGS.balanced;
    
    this.config = { ...DEFAULT_CONFIG, ...baseConfig, ...config };
  }

  private getCacheKey(): string {
    const { performancePreset, useLightModel } = this.config;
    return `${performancePreset}-${useLightModel}`;
  }

  async initialize() {
    const cacheKey = this.getCacheKey();
    
    // Check if we have a cached model
    if (WeatherModel.modelCache[cacheKey]) {
      this.model = WeatherModel.modelCache[cacheKey];
      return this.model;
    }

    if (this.model) {
      this.model.dispose();
    }

    // Calculate input features: temp, windSpeed, windGusts, windDirSin, windDirCos, waveHeight, wavePeriod, swellDirSin, swellDirCos
    const NUM_FEATURES = 9;

    if (this.config.useLightModel) {
      // Lighter model architecture
      this.model = tf.sequential({
        layers: [
          tf.layers.lstm({
            units: 32,
            inputShape: [this.config.timeSteps, NUM_FEATURES],
            returnSequences: false
          }),
          tf.layers.dense({
            units: 64,
            activation: 'relu'
          }),
          tf.layers.dense({
            units: NUM_FEATURES * 24,
            activation: 'linear'
          }),
          tf.layers.reshape({
            targetShape: [1, 24, NUM_FEATURES]  // Add batch dimension
          })
        ]
      });
    } else {
      // Full model with better capacity
      this.model = tf.sequential({
        layers: [
          tf.layers.lstm({
            units: 64,
            inputShape: [this.config.timeSteps, NUM_FEATURES],
            returnSequences: false
          }),
          tf.layers.dense({
            units: 128,
            activation: 'relu'
          }),
          tf.layers.dense({
            units: 64,
            activation: 'relu'
          }),
          tf.layers.dense({
            units: NUM_FEATURES * 24,
            activation: 'linear'
          }),
          tf.layers.reshape({
            targetShape: [1, 24, NUM_FEATURES]  // Add batch dimension
          })
        ]
      });
    }

    // Compile the model with appropriate loss and optimizer
    const optimizer = tf.train.adam(this.config.learningRate);
    this.model.compile({
      optimizer: optimizer,
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    // Cache the model
    WeatherModel.modelCache[cacheKey] = this.model;

    return this.model;
  }

  async train(data: WeatherData[], onProgress?: (progress: TrainingProgress) => void) {
    try {
      if (!this.model) {
        onProgress?.({
          currentEpoch: 0,
          totalEpochs: this.config.epochs,
          loss: 0,
          stage: 'initializing'
        });
        
        await this.initialize();
      }

      const { inputs, targets } = this.prepareTrainingData(data);
      
      onProgress?.({
        currentEpoch: 0,
        totalEpochs: this.config.epochs,
        loss: 0,
        stage: 'training'
      });

      // Train in smaller chunks to prevent browser freezing
      const CHUNK_SIZE = 5;
      let currentEpoch = 0;

      while (currentEpoch < this.config.epochs) {
        const epochsInChunk = Math.min(CHUNK_SIZE, this.config.epochs - currentEpoch);
        
        await new Promise<void>((resolve, reject) => {
          this.model!.fit(inputs, targets, {
            epochs: epochsInChunk,
            batchSize: this.config.batchSize,
            validationSplit: 0.2,
            shuffle: true,
            yieldEvery: 'batch',
            callbacks: {
              onBatchEnd: async () => {
                // Yield to main thread more frequently
                await tf.nextFrame();
              },
              onEpochBegin: async (epoch) => {
                const globalEpoch = currentEpoch + epoch + 1;
                await tf.nextFrame();
                onProgress?.({
                  currentEpoch: globalEpoch,
                  totalEpochs: this.config.epochs,
                  loss: 0,
                  stage: 'training'
                });
              },
              onEpochEnd: async (epoch, logs) => {
                const globalEpoch = currentEpoch + epoch + 1;
                await tf.nextFrame();
                onProgress?.({
                  currentEpoch: globalEpoch,
                  totalEpochs: this.config.epochs,
                  loss: logs?.loss || 0,
                  stage: 'training'
                });
              },
              onTrainEnd: () => {
                resolve();
              },
              onTrainError: (error) => {
                reject(error);
              }
            }
          });
        });

        currentEpoch += epochsInChunk;
        await tf.nextFrame(); // Extra yield between chunks
      }

      onProgress?.({
        currentEpoch: this.config.epochs,
        totalEpochs: this.config.epochs,
        loss: 0,
        stage: 'predicting'
      });

      // Clean up tensors
      inputs.dispose();
      targets.dispose();
      
    } catch (error) {
      console.error('Training error:', error);
      throw error;
    }
  }

  async predict(recentData: WeatherData[]): Promise<PredictionChunk[]> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    // Get the latest timestamp from the data
    const latestTimestamp = Math.max(...recentData.map(d => d.timestamp));
    console.log('Making predictions starting from:', new Date(latestTimestamp).toISOString());

    // Prepare input data using the last timeSteps hours
    const input = this.prepareInputData(recentData.slice(-this.config.timeSteps));
    
    // Make prediction for next 24 hours in one go
    const prediction = this.model.predict(input) as tf.Tensor;
    const predictionData = await prediction.array() as number[][][][];  // Now 4D array

    // Clean up tensors
    input.dispose();
    prediction.dispose();

    // Format predictions for exactly the next 24 hours
    return this.formatPredictions(predictionData[0][0], latestTimestamp);  // Extract correct dimensions
  }

  private prepareTrainingData(data: WeatherData[]) {
    const X: number[][][] = [];
    const y: number[][][] = [];  // Change back to 3D array
    
    // Slide through the data with overlapping windows
    for (let i = 0; i < data.length - this.config.timeSteps - 24; i++) {
      const inputWindow = data.slice(i, i + this.config.timeSteps);
      const targetWindow = data.slice(i + this.config.timeSteps, i + this.config.timeSteps + 24);
      
      const inputFeatures = inputWindow.map(d => [
        d.temperature,
        d.windSpeed,
        d.windGusts,
        Math.sin(d.windDirection * Math.PI / 180),
        Math.cos(d.windDirection * Math.PI / 180),
        d.waveHeight ?? 0,
        d.wavePeriod ?? 0,
        Math.sin((d.swellDirection ?? 0) * Math.PI / 180),
        Math.cos((d.swellDirection ?? 0) * Math.PI / 180)
      ]);

      const targetFeatures = targetWindow.map(d => [
        d.temperature,
        d.windSpeed,
        d.windGusts,
        Math.sin(d.windDirection * Math.PI / 180),
        Math.cos(d.windDirection * Math.PI / 180),
        d.waveHeight ?? 0,
        d.wavePeriod ?? 0,
        Math.sin((d.swellDirection ?? 0) * Math.PI / 180),
        Math.cos((d.swellDirection ?? 0) * Math.PI / 180)
      ]);

      X.push(inputFeatures);
      y.push([targetFeatures]);  // Wrap in extra array for batch dimension
    }
    
    return {
      inputs: tf.tensor3d(X),
      targets: tf.tensor4d(y)  // Use tensor4d for [batch, 1, timesteps, features]
    };
  }

  private prepareInputData(data: WeatherData[]) {
    const input = data.map(d => [
      d.temperature,
      d.windSpeed,
      d.windGusts,
      Math.sin(d.windDirection * Math.PI / 180),
      Math.cos(d.windDirection * Math.PI / 180),
      d.waveHeight ?? 0,
      d.wavePeriod ?? 0,
      Math.sin((d.swellDirection ?? 0) * Math.PI / 180),
      Math.cos((d.swellDirection ?? 0) * Math.PI / 180)
    ]);
    
    return tf.tensor3d([input]);
  }

  private formatPredictions(predictionData: number[][], lastTimestamp: number): PredictionChunk[] {
    const chunks: PredictionChunk[] = [];
    const HOUR_MS = 3600000;
    
    // Safely get the last prediction if available
    const lastPrediction = predictionData[predictionData.length - 1];
    if (!lastPrediction) {
      console.error('No prediction data available');
      return chunks;
    }

    // Generate predictions for the next 24 hours
    for (let i = 0; i < Math.min(24, predictionData.length); i++) {
      const prediction = predictionData[i];
      if (!prediction) continue;

      const timestamp = lastTimestamp + (i + 1) * HOUR_MS;
      
      chunks.push({
        startTime: timestamp,
        endTime: timestamp + HOUR_MS,
        temperature: prediction[0] || 0,
        windSpeed: Math.max(0, prediction[1] || 0),
        windGusts: Math.max(0, prediction[2] || 0),
        windDirection: (Math.atan2(prediction[3] || 0, prediction[4] || 0) * 180 / Math.PI + 360) % 360,
        humidity: 0, // Not predicted
        waveHeight: Math.max(0, prediction[5] || 0),
        wavePeriod: Math.max(0, prediction[6] || 0),
        swellDirection: (Math.atan2(prediction[7] || 0, prediction[8] || 0) * 180 / Math.PI + 360) % 360,
        confidence: Math.max(0.2, 1 - (i * 0.03))  // Decreasing confidence over time
      });
    }
    
    return chunks;
  }
}

// Helper functions for external use
export async function trainModel(
  data: WeatherData[], 
  config: Partial<ModelConfig> = {}, 
  onProgress?: (progress: TrainingProgress) => void
): Promise<WeatherModel> {
  const model = new WeatherModel(config);
  await model.initialize();
  await model.train(data, onProgress);
  return model;
}

export async function predictNextHours(model: WeatherModel, data: WeatherData[]): Promise<PredictionChunk[]> {
  return model.predict(data);
}
