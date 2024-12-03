import * as tf from '@tensorflow/tfjs';
import type { WeatherData, PredictionChunk, ModelConfig } from './types';
import { standardizeData } from '../../lib/tf-setup';

const DEFAULT_CONFIG: ModelConfig = {
  epochs: 20,
  batchSize: 32,
  learningRate: 0.001,
  timeSteps: 16,
  predictionSteps: 4
};

export class WeatherPredictor {
  private model: tf.LayersModel | null = null;
  private config: ModelConfig;
  private dataMean: number[] | null = null;
  private dataStd: number[] | null = null;

  constructor(config: Partial<ModelConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private createModel(): tf.LayersModel {
    return tf.tidy(() => {
      const model = tf.sequential();

      // Input layer
      model.add(tf.layers.dense({
        units: 64,
        inputShape: [this.config.timeSteps * 4],
        activation: 'relu'
      }));

      // Hidden layers with batch normalization
      model.add(tf.layers.batchNormalization());
      model.add(tf.layers.dense({
        units: 128,
        activation: 'relu'
      }));
      model.add(tf.layers.dropout({ rate: 0.3 }));

      model.add(tf.layers.dense({
        units: 64,
        activation: 'relu'
      }));
      model.add(tf.layers.dropout({ rate: 0.2 }));

      // Output layer
      model.add(tf.layers.dense({
        units: this.config.predictionSteps * 4,
        activation: 'linear'
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

  private normalizeData(data: tf.Tensor2D): tf.Tensor2D {
    const moments = tf.moments(data, 0);
    this.dataMean = Array.from(moments.mean.dataSync());
    this.dataStd = Array.from(tf.sqrt(moments.variance).dataSync());
    
    return tf.tidy(() => {
      const normalized = data.sub(moments.mean).div(tf.sqrt(moments.variance).add(tf.scalar(1e-8)));
      return normalized;
    });
  }

  private denormalizeData(data: tf.Tensor2D): tf.Tensor2D {
    if (!this.dataMean || !this.dataStd) {
      throw new Error('Normalizer not initialized');
    }
    
    return tf.tidy(() => {
      const meanTensor = tf.tensor2d([this.dataMean]);
      const stdTensor = tf.tensor2d([this.dataStd]);
      return data.mul(stdTensor).add(meanTensor);
    });
  }

  private prepareData(weatherData: WeatherData[]): {
    features: tf.Tensor2D;
    labels: tf.Tensor2D;
  } {
    return tf.tidy(() => {
      const data = weatherData.map(d => [
        d.temperature,
        d.windSpeed,
        d.windDirection,
        d.humidity
      ]);

      const tensor = tf.tensor2d(data);
      const normalized = this.normalizeData(tensor);

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
      this.model = this.createModel();
      const { features, labels } = this.prepareData(weatherData);

      await this.model.fit(features, labels, {
        epochs: this.config.epochs,
        batchSize: this.config.batchSize,
        shuffle: true,
        validationSplit: 0.2,
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
      const input = recentData.slice(-this.config.timeSteps).map(d => [
        d.temperature,
        d.windSpeed,
        d.windDirection,
        d.humidity
      ]);

      const inputTensor = tf.tensor2d(input);
      const normalized = this.normalizeData(inputTensor);
      const reshaped = normalized.reshape([1, this.config.timeSteps * 4]);
      const prediction = this.model!.predict(reshaped) as tf.Tensor;
      const denormalized = this.denormalizeData(prediction.reshape([-1, 4]));
      
      const predictionData = denormalized.arraySync() as number[][];
      const lastTimestamp = recentData[recentData.length - 1].timestamp;
      const hourMs = 3600000;

      return predictionData.map((values, i) => ({
        startTime: lastTimestamp + (i * 4 * hourMs),
        endTime: lastTimestamp + ((i + 1) * 4 * hourMs),
        temperature: values[0],
        windSpeed: Math.max(0, values[1]), // Ensure non-negative
        windDirection: ((values[2] % 360) + 360) % 360, // Normalize to 0-360
        humidity: Math.min(100, Math.max(0, values[3])), // Clamp to 0-100
        confidence: Math.max(0, 1 - (i * 0.15)) // Decrease confidence over time
      }));
    });
  }

  dispose(): void {
    this.model?.dispose();
  }
}
