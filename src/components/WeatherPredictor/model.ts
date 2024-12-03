import * as tf from '@tensorflow/tfjs';
import type { WeatherData, PredictionChunk, ModelConfig } from './types';
import { standardizeData } from '../../lib/tf-setup';

const DEFAULT_CONFIG: ModelConfig = {
  epochs: 50,          // Increased from 20 to 50 for better training
  batchSize: 32,
  learningRate: 0.001,
  timeSteps: 24,       // Reduced to 24 hours (1 day of history)
  predictionSteps: 24  // 24 hours of predictions
};

export class WeatherPredictor {
  private model: tf.LayersModel | null = null;
  private config: ModelConfig;
  private meanStd: { mean: number[]; std: number[] } | null = null;

  constructor(config: Partial<ModelConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private normalize(data: number[][]): number[][] {
    if (!this.meanStd) {
      const features = data[0].length;
      const mean = new Array(features).fill(0);
      const std = new Array(features).fill(0);
      
      // Calculate mean
      for (const row of data) {
        for (let i = 0; i < features; i++) {
          mean[i] += row[i];
        }
      }
      for (let i = 0; i < features; i++) {
        mean[i] /= data.length;
      }
      
      // Calculate std with better numerical stability
      for (const row of data) {
        for (let i = 0; i < features; i++) {
          std[i] += Math.pow(row[i] - mean[i], 2);
        }
      }
      for (let i = 0; i < features; i++) {
        std[i] = Math.sqrt(std[i] / data.length) + 1e-6; // Small epsilon to prevent division by zero
      }
      
      this.meanStd = { mean, std };
    }
    
    return data.map(row => 
      row.map((val, i) => (val - this.meanStd!.mean[i]) / this.meanStd!.std[i])
    );
  }

  private denormalize(data: number[][], featureIndices: number[]): number[][] {
    if (!this.meanStd) return data;
    
    return data.map(row => 
      row.map((val, i) => val * this.meanStd!.std[featureIndices[i]] + this.meanStd!.mean[featureIndices[i]])
    );
  }

  private createModel(): tf.LayersModel {
    return tf.tidy(() => {
      const model = tf.sequential();

      // Larger input layer for increased historical data
      model.add(tf.layers.dense({
        units: 256,
        inputShape: [this.config.timeSteps * 5],
        activation: 'relu'
      }));
      model.add(tf.layers.dropout({ rate: 0.2 }));

      // Additional hidden layers
      model.add(tf.layers.dense({ units: 512, activation: 'relu' }));
      model.add(tf.layers.dropout({ rate: 0.3 }));
      
      model.add(tf.layers.dense({ units: 256, activation: 'relu' }));
      model.add(tf.layers.dropout({ rate: 0.2 }));
      
      model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
      model.add(tf.layers.dropout({ rate: 0.1 }));

      // Output layer
      model.add(tf.layers.dense({
        units: 3,
        activation: 'linear'
      }));

      model.compile({
        optimizer: tf.train.adam(this.config.learningRate),
        loss: 'meanSquaredError'
      });

      return model;
    });
  }

  async train(weatherData: WeatherData[], onProgress?: (status: { epoch: number; loss: number }) => void): Promise<void> {
    if (weatherData.length < this.config.timeSteps + 1) {
      throw new Error(`Insufficient data: need at least ${this.config.timeSteps + 1} points`);
    }

    try {
      // Sort data by timestamp to ensure chronological order
      const sortedData = [...weatherData].sort((a, b) => a.timestamp - b.timestamp);

      // Convert data to arrays for normalization
      const rawData = sortedData.map(d => [
        d.temperature,
        d.windSpeed,
        d.windGusts,
        d.windDirection / 360, // Normalize direction to [0, 1]
        d.humidity || 0
      ]);

      // Normalize the data
      const normalizedData = this.normalize(rawData);

      // Prepare sequences and labels with sliding window
      const sequences: number[][] = [];
      const labels: number[][] = [];

      // Use more data for training by sliding the window
      for (let i = 0; i <= normalizedData.length - this.config.timeSteps - 1; i++) {
        const sequence = normalizedData.slice(i, i + this.config.timeSteps).flat();
        const nextValues = normalizedData[i + this.config.timeSteps];
        
        sequences.push(sequence);
        labels.push([nextValues[1], nextValues[2], nextValues[3]]); // wind speed, gusts, direction
      }

      // Create tensors
      const features = tf.tensor2d(sequences);
      const targets = tf.tensor2d(labels);

      // Create and train model with more epochs and validation
      this.model = this.createModel();
      await this.model.fit(features, targets, {
        epochs: this.config.epochs,
        batchSize: this.config.batchSize,
        shuffle: true,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (onProgress) {
              onProgress({
                epoch,
                loss: logs?.loss || 0
              });
            }
          }
        }
      });

      // Cleanup
      features.dispose();
      targets.dispose();

    } catch (error) {
      console.error('Training error:', error);
      throw error;
    }
  }

  async predict(inputData: WeatherData[]): Promise<PredictionChunk[]> {
    if (!this.model) {
      throw new Error('Model not trained');
    }

    try {
      const predictions: PredictionChunk[] = [];
      let currentInput = [...inputData];

      // Get current hour timestamp
      const now = new Date();
      now.setMinutes(0, 0, 0);
      const currentHourTimestamp = now.getTime();

      // Prepare initial input
      const initialRawData = currentInput.map(d => [
        d.temperature,
        d.windSpeed,
        d.windGusts,
        d.windDirection / 360,
        d.humidity || 0
      ]);

      let normalizedInput = this.normalize(initialRawData);

      // Generate predictions for 24 hours
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = currentHourTimestamp + (hour * 3600000);
        
        // Prepare input tensor
        const inputSequence = normalizedInput.slice(-this.config.timeSteps).flat();
        const inputTensor = tf.tensor2d([inputSequence]);
        
        // Make prediction
        const outputTensor = this.model.predict(inputTensor) as tf.Tensor;
        const normalizedPrediction = await outputTensor.array() as number[][];
        
        // Denormalize prediction
        const denormalizedPrediction = this.denormalize(normalizedPrediction, [1, 2, 3])[0];
        
        // Calculate confidence
        const confidence = Math.max(0.08, 1 - (hour * 0.04));
        
        // Create prediction chunk
        const prediction: PredictionChunk = {
          startTime: timestamp,
          windSpeed: Math.max(0, denormalizedPrediction[0]),
          windGusts: Math.max(0, denormalizedPrediction[1]),
          windDirection: ((Math.round(denormalizedPrediction[2] * 360) % 360) + 360) % 360,
          confidence
        };
        
        predictions.push(prediction);
        
        // Update input for next prediction
        const newDataPoint = [
          normalizedInput[normalizedInput.length - 1][0], // Keep last temperature
          normalizedPrediction[0][0],
          normalizedPrediction[0][1],
          normalizedPrediction[0][2],
          normalizedInput[normalizedInput.length - 1][4]  // Keep last humidity
        ];
        
        normalizedInput = [...normalizedInput.slice(1), newDataPoint];
        
        // Cleanup tensors
        inputTensor.dispose();
        outputTensor.dispose();
      }

      return predictions;
    } catch (error) {
      console.error('Prediction error:', error);
      throw error;
    }
  }

  dispose(): void {
    this.model?.dispose();
    this.model = null;
    this.meanStd = null;
  }
}
