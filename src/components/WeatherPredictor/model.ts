import * as tf from '@tensorflow/tfjs';
import type { WeatherData, PredictionChunk, ModelConfig } from './types';
import { standardizeData } from '../../lib/tf-setup';

const DEFAULT_CONFIG: ModelConfig = {
  epochs: 20,
  batchSize: 32,
  learningRate: 0.001,
  timeSteps: 16,
  predictionSteps: 24  // 24 hours of predictions
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

      // Enhanced model architecture
      model.add(tf.layers.dense({
        units: 128,
        inputShape: [this.config.timeSteps * 5],
        activation: 'relu'
      }));

      model.add(tf.layers.batchNormalization());
      model.add(tf.layers.dense({
        units: 256,
        activation: 'relu'
      }));
      model.add(tf.layers.dropout({ rate: 0.3 }));

      model.add(tf.layers.dense({
        units: 128,
        activation: 'relu'
      }));
      model.add(tf.layers.dropout({ rate: 0.2 }));

      // Output layer for hourly predictions
      model.add(tf.layers.dense({
        units: 5, // One hour prediction at a time
        activation: 'linear'
      }));

      model.compile({
        optimizer: tf.train.adam(this.config.learningRate),
        loss: 'meanSquaredError'
      });

      return model;
    });
  }

  async predict(recentData: WeatherData[]): Promise<PredictionChunk[]> {
    if (!this.model) {
      throw new Error('Model not trained');
    }

    return tf.tidy(() => {
      const predictions: PredictionChunk[] = [];
      let currentData = [...recentData.slice(-this.config.timeSteps)];
      const hourMs = 3600000;
      const lastTimestamp = currentData[currentData.length - 1].timestamp;

      // Generate predictions one hour at a time
      for (let hour = 0; hour < this.config.predictionSteps; hour++) {
        // Prepare input for current prediction
        const input = currentData.map(d => [
          d.temperature,
          d.windSpeed,
          d.windGusts,
          d.windDirection,
          d.humidity
        ]);

        const inputTensor = tf.tensor2d(input);
        const normalized = this.normalizeData(inputTensor);
        const reshaped = normalized.reshape([1, this.config.timeSteps * 5]);
        const prediction = this.model!.predict(reshaped) as tf.Tensor;
        const denormalized = this.denormalizeData(prediction.reshape([-1, 5]));
        
        const predictionValues = denormalized.arraySync() as number[][];
        const values = predictionValues[0];

        // Create prediction chunk for this hour
        const chunk: PredictionChunk = {
          startTime: lastTimestamp + (hour * hourMs),
          endTime: lastTimestamp + ((hour + 1) * hourMs),
          temperature: values[0],
          windSpeed: Math.max(0, values[1]),
          windGusts: Math.max(values[1], values[2]),
          windDirection: ((values[3] % 360) + 360) % 360,
          humidity: Math.min(100, Math.max(0, values[4])),
          confidence: Math.max(0, 1 - (hour * 0.04)) // Confidence decreases over time
        };

        predictions.push(chunk);

        // Update currentData for next prediction by removing oldest and adding new prediction
        currentData.shift();
        currentData.push({
          timestamp: chunk.startTime,
          temperature: chunk.temperature,
          windSpeed: chunk.windSpeed,
          windGusts: chunk.windGusts,
          windDirection: chunk.windDirection,
          humidity: chunk.humidity
        });
      }

      return predictions;
    });
  }

  private normalizeData(data: tf.Tensor2D): tf.Tensor2D {
    return tf.tidy(() => {
      if (!this.dataMean || !this.dataStd) {
        this.dataMean = data.mean(0).arraySync() as number[];
        this.dataStd = data.sub(tf.tensor2d([this.dataMean]))
          .square()
          .mean(0)
          .sqrt()
          .arraySync() as number[];
      }
      
      return data.sub(tf.tensor2d([this.dataMean]))
        .div(tf.tensor2d([this.dataStd]));
    });
  }

  private denormalizeData(data: tf.Tensor2D): tf.Tensor2D {
    return tf.tidy(() => {
      if (!this.dataMean || !this.dataStd) {
        throw new Error('Data statistics not initialized');
      }
      return data.mul(tf.tensor2d([this.dataStd]))
        .add(tf.tensor2d([this.dataMean]));
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
        d.windGusts,
        d.windDirection,
        d.humidity
      ]);

      const tensor = tf.tensor2d(data);
      const normalized = this.normalizeData(tensor);

      const sequences = [];
      const labels = [];
      
      for (let i = 0; i <= data.length - this.config.timeSteps - 1; i++) {
        const sequence = normalized
          .slice([i, 0], [this.config.timeSteps, 5])
          .reshape([1, this.config.timeSteps * 5]);
        
        const label = normalized
          .slice([i + this.config.timeSteps, 0], [1, 5])
          .reshape([1, 5]);

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
    if (weatherData.length < this.config.timeSteps + 1) {
      throw new Error(`Insufficient data: need at least ${this.config.timeSteps + 1} points`);
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

  dispose(): void {
    this.model?.dispose();
  }
}
