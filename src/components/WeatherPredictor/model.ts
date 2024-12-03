import * as tf from '@tensorflow/tfjs';
import type { WeatherData, PredictionChunk } from './types';
import { normalizeData, denormalizeData, calculateStats, type DataStats } from '../../lib/normalize';

export class WeatherModel {
  private model: tf.LayersModel | null = null;
  private inputWindowSize = 16; // 16 hours of historical data
  private outputWindowSize = 4; // 4 chunks of 4 hours each
  private featureCount = 4; // temperature, windSpeed, windDirection, humidity
  private stats: DataStats | null = null;

  async initialize() {
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          inputShape: [this.inputWindowSize * this.featureCount],
        }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu',
        }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: this.outputWindowSize * this.featureCount,
          activation: 'linear',
        }),
      ],
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mse'],
    });
  }

  async train(data: WeatherData[], epochs: number = 10) {
    if (!this.model) throw new Error('Model not initialized');

    // Calculate and store stats for later use
    this.stats = calculateStats(data);
    
    try {
      // Prepare training data
      const { inputs, outputs } = this.prepareTrainingData(data);
      
      await this.model.fit(inputs, outputs, {
        epochs,
        batchSize: 16,
        shuffle: true,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(
              `Epoch ${epoch + 1}/${epochs} - ` +
              `loss: ${logs?.loss.toFixed(4)} - ` +
              `val_loss: ${logs?.val_loss.toFixed(4)}`
            );
          },
        },
      });

      // Clean up tensors
      inputs.dispose();
      outputs.dispose();
    } catch (error) {
      console.error('Training error:', error);
      throw error;
    }
  }

  async predict(recentData: WeatherData[]): Promise<PredictionChunk[]> {
    if (!this.model) throw new Error('Model not initialized');
    if (!this.stats) throw new Error('Model not trained');

    try {
      // Use tidy for tensor operations only
      const predictionTensor = tf.tidy(() => {
        // Normalize input data
        const normalizedInput = normalizeData(
          recentData.slice(-this.inputWindowSize),
          this.stats!
        );

        // Reshape for model input
        const modelInput = normalizedInput.reshape([1, -1]);
        
        // Make prediction
        const prediction = this.model!.predict(modelInput) as tf.Tensor;
        return prediction.reshape([this.outputWindowSize, this.featureCount]) as tf.Tensor2D;
      });

      // Convert tensor to array outside of tidy
      const predictionArray = await predictionTensor.array();
      predictionTensor.dispose();

      // Convert to WeatherData format
      const weatherData: WeatherData[] = predictionArray.map((row, i) => ({
        timestamp: recentData[recentData.length - 1].timestamp + i * 4 * 60 * 60 * 1000,
        temperature: row[0],
        windSpeed: row[1],
        windDirection: row[2],
        humidity: row[3],
      }));

      // Denormalize the predictions
      const denormalized = denormalizeData(
        tf.tensor2d(predictionArray),
        this.stats!
      );

      // Format predictions with confidence scores
      return this.formatPredictions(denormalized, recentData[recentData.length - 1].timestamp);
    } catch (error) {
      console.error('Prediction error:', error);
      throw error;
    }
  }

  private prepareTrainingData(data: WeatherData[]) {
    return tf.tidy(() => {
      const windows: { input: tf.Tensor2D; output: tf.Tensor2D }[] = [];

      // Create sliding windows
      for (let i = 0; i < data.length - this.inputWindowSize - this.outputWindowSize; i++) {
        const inputData = data.slice(i, i + this.inputWindowSize);
        const outputData = data.slice(
          i + this.inputWindowSize,
          i + this.inputWindowSize + this.outputWindowSize
        );

        const normalizedInput = normalizeData(inputData, this.stats!);
        const normalizedOutput = normalizeData(outputData, this.stats!);

        windows.push({
          input: normalizedInput.reshape([1, this.inputWindowSize * this.featureCount]),
          output: normalizedOutput.reshape([1, this.outputWindowSize * this.featureCount]),
        });
      }

      // Concatenate all windows
      const inputs = tf.concat(windows.map(w => w.input));
      const outputs = tf.concat(windows.map(w => w.output));

      // Clean up individual window tensors
      windows.forEach(w => {
        w.input.dispose();
        w.output.dispose();
      });

      return { inputs, outputs };
    });
  }

  private formatPredictions(predictions: WeatherData[], lastTimestamp: number): PredictionChunk[] {
    return predictions.map((pred, i) => ({
      startTime: lastTimestamp + i * 4 * 60 * 60 * 1000,
      endTime: lastTimestamp + (i + 1) * 4 * 60 * 60 * 1000,
      temperature: pred.temperature,
      windSpeed: pred.windSpeed,
      windDirection: pred.windDirection,
      humidity: pred.humidity,
      confidence: Math.max(0.2, 1 - (i * 0.2)), // Confidence from 100% to 20%
    }));
  }
} 