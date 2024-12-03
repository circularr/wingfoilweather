import * as tf from '@tensorflow/tfjs';
import type { WeatherData, PredictionChunk, ModelConfig } from './types';
import { standardizeData } from '../../lib/tf-setup';

const DEFAULT_CONFIG: ModelConfig = {
  epochs: 10,
  batchSize: 8,
  learningRate: 0.001,
  timeSteps: 16,
  predictionSteps: 4
};

export class WeatherPredictor {
  private model: tf.LayersModel | null = null;
  private config: ModelConfig;
  private normalizer: {
    mean: tf.Tensor | null;
    std: tf.Tensor | null;
  } = { mean: null, std: null };

  constructor(config: Partial<ModelConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private createModel(): tf.LayersModel {
    return tf.tidy(() => {
      const model = tf.sequential();

      // Input layer
      model.add(tf.layers.dense({
        units: 32,
        inputShape: [this.config.timeSteps * 4],
        activation: 'relu'
      }));

      // Hidden layers
      model.add(tf.layers.dense({
        units: 64,
        activation: 'relu'
      }));
      model.add(tf.layers.dropout({ rate: 0.2 }));

      model.add(tf.layers.dense({
        units: 32,
        activation: 'relu'
      }));

      // Output layer
      model.add(tf.layers.dense({
        units: this.config.predictionSteps * 4
      }));

      const optimizer = tf.train.adam(this.config.learningRate);
      model.compile({
        optimizer,
        loss: 'meanSquaredError',
        metrics: ['mse']
      });

      return model;
    });
  }

  private prepareData(weatherData: WeatherData[]): {
    features: tf.Tensor2D;
    labels: tf.Tensor2D;
  } {
    return tf.tidy(() => {
      // Convert data to tensor
      const data = weatherData.map(d => [
        d.temperature,
        d.windSpeed,
        d.windDirection,
        d.humidity
      ]);
      const dataTensor = tf.tensor2d(data);
      
      // Standardize data
      const normalized = standardizeData(dataTensor);
      
      // Prepare sequences
      const sequences = [];
      const labels = [];
      
      for (let i = 0; i <= data.length - this.config.timeSteps - this.config.predictionSteps; i++) {
        const sequence = normalized
          .slice([i, 0], [this.config.timeSteps, 4])
          .reshape([1, this.config.timeSteps * 4]);
        
        const label = normalized
          .slice([i + this.config.timeSteps, 0], [this.config.predictionSteps, 4])
          .reshape([1, this.config.predictionSteps * 4]);

        sequences.push(sequence);
        labels.push(label);
      }

      return {
        features: tf.concat(sequences, 0),
        labels: tf.concat(labels, 0)
      };
    });
  }

  async train(weatherData: WeatherData[], onProgress?: (status: { epoch: number; loss: number }) => void): Promise<void> {
    if (weatherData.length < this.config.timeSteps + this.config.predictionSteps) {
      throw new Error(`Insufficient data: need at least ${this.config.timeSteps + this.config.predictionSteps} points`);
    }

    try {
      // Create new model
      this.model = this.createModel();
      
      // Prepare training data
      const { features, labels } = this.prepareData(weatherData);

      // Train the model
      await this.model.fit(features, labels, {
        epochs: this.config.epochs,
        batchSize: this.config.batchSize,
        shuffle: true,
        validationSplit: 0.1,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            onProgress?.({
              epoch,
              loss: logs?.loss ?? 0
            });
          }
        }
      });

    } catch (error) {
      console.error('Training error:', error);
      throw error;
    }
  }

  async predict(recentData: WeatherData[]): Promise<PredictionChunk[]> {
    if (!this.model) {
      throw new Error('Model not trained');
    }

    return tf.tidy(() => {
      // Prepare input data
      const input = recentData.slice(-this.config.timeSteps).map(d => [
        d.temperature,
        d.windSpeed,
        d.windDirection,
        d.humidity
      ]);

      // Make prediction
      const inputTensor = tf.tensor2d(input);
      const normalized = standardizeData(inputTensor);
      const reshaped = normalized.reshape([1, this.config.timeSteps * 4]);
      const prediction = this.model!.predict(reshaped) as tf.Tensor;
      
      // Process predictions
      const predictionData = prediction.reshape([this.config.predictionSteps, 4]).arraySync() as number[][];
      const lastTimestamp = recentData[recentData.length - 1].timestamp;
      const hourMs = 3600000;

      return predictionData.map((values, i) => ({
        startTime: lastTimestamp + (i * 4 * hourMs),
        endTime: lastTimestamp + ((i + 1) * 4 * hourMs),
        temperature: values[0],
        windSpeed: values[1],
        windDirection: values[2],
        confidence: Math.max(0, 1 - (i * 0.15))
      }));
    });
  }

  dispose(): void {
    this.model?.dispose();
    this.normalizer.mean?.dispose();
    this.normalizer.std?.dispose();
  }
}
