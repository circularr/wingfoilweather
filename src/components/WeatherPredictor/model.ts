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

  private prepareData(data: WeatherData[]): {
    inputs: number[][],
    labels: number[][],
    normalizer: { mean: number[], std: number[] }
  } {
    // Convert wind direction to sine and cosine components
    const processedData = data.map(d => [
      d.temperature,
      d.windSpeed,
      d.windGusts,
      Math.sin(d.windDirection * Math.PI / 180), // sin component
      Math.cos(d.windDirection * Math.PI / 180), // cos component
      d.humidity || 0
    ]);
    
    // Calculate mean and standard deviation for normalization
    const mean = processedData[0].map((_, col) => 
      processedData.reduce((sum, row) => sum + row[col], 0) / processedData.length
    );
    
    const std = processedData[0].map((_, col) => {
      const avg = mean[col];
      const squareDiffs = processedData.map(row => Math.pow(row[col] - avg, 2));
      return Math.sqrt(squareDiffs.reduce((sum, val) => sum + val, 0) / processedData.length);
    });
    
    // Normalize the data
    const normalizedData = processedData.map(row =>
      row.map((val, i) => (val - mean[i]) / (std[i] || 1))
    );
    
    const inputs: number[][] = [];
    const labels: number[][] = [];
    
    // Prepare sequences for training
    for (let i = 0; i < normalizedData.length - this.config.timeSteps - this.config.predictionSteps + 1; i++) {
      const sequence = normalizedData.slice(i, i + this.config.timeSteps);
      inputs.push(sequence.flat());
      
      // Get multiple steps ahead for labels
      const futureSteps = normalizedData
        .slice(i + this.config.timeSteps, i + this.config.timeSteps + this.config.predictionSteps)
        .map(step => [step[1], step[2], Math.atan2(step[3], step[4]) * 180 / Math.PI])
        .flat();
      
      labels.push(futureSteps);
    }
    
    return { inputs, labels, normalizer: { mean, std } };
  }

  private createModel(): tf.LayersModel {
    return tf.tidy(() => {
      const model = tf.sequential();
      
      // LSTM layer for processing temporal sequences
      model.add(tf.layers.lstm({
        units: 128,
        inputShape: [this.config.timeSteps, 6], // [timesteps, features]
        returnSequences: false
      }));
      model.add(tf.layers.dropout({ rate: 0.2 }));
      
      // Dense layer for final predictions
      model.add(tf.layers.dense({
        units: 3 * this.config.predictionSteps, // Predict multiple steps ahead
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

      // Prepare data for training
      const { inputs, labels, normalizer } = this.prepareData(sortedData);

      // Create tensors
      const features = tf.tensor2d(inputs);
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

      // Store normalizer for later use
      this.meanStd = normalizer;

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
        Math.sin(d.windDirection * Math.PI / 180), // sin component
        Math.cos(d.windDirection * Math.PI / 180), // cos component
        d.humidity || 0
      ]);

      // Normalize input data
      const normalizedInput = initialRawData.map(row =>
        row.map((val, i) => (val - this.meanStd!.mean[i]) / (this.meanStd!.std[i] || 1))
      );

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
        const denormalizedPrediction = normalizedPrediction[0].map((val, i) => 
          val * (this.meanStd!.std[Math.floor(i / 3)] || 1) + this.meanStd!.mean[Math.floor(i / 3)]
        );
        
        // Calculate confidence
        const confidence = Math.max(0.08, 1 - (hour * 0.04));
        
        // Create prediction chunk
        const prediction: PredictionChunk = {
          startTime: timestamp,
          windSpeed: Math.max(0, denormalizedPrediction[0]),
          windGusts: Math.max(0, denormalizedPrediction[1]),
          windDirection: ((Math.round(Math.atan2(denormalizedPrediction[2], denormalizedPrediction[3]) * 180 / Math.PI) % 360) + 360) % 360,
          confidence
        };
        
        predictions.push(prediction);
        
        // Update input for next prediction
        const newDataPoint = [
          normalizedInput[normalizedInput.length - 1][0], // Keep last temperature
          denormalizedPrediction[0],
          denormalizedPrediction[1],
          denormalizedPrediction[2],
          denormalizedPrediction[3],
          normalizedInput[normalizedInput.length - 1][5]  // Keep last humidity
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
