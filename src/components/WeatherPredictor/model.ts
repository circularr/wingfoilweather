import * as tf from '@tensorflow/tfjs';
import type { WeatherData, PredictionChunk, ModelConfig } from './types';

const DEFAULT_CONFIG: ModelConfig = {
  epochs: 50,
  batchSize: 32,
  learningRate: 0.001,
  timeSteps: 16,  // 16 hours of historical data
  predictionSteps: 24  // Predict next 24 hours
};

export class WeatherModel {
  private model: tf.LayersModel | null = null;
  private config: ModelConfig;

  constructor(config: Partial<ModelConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize() {
    if (this.model) {
      this.model.dispose();
    }

    this.model = tf.sequential({
      layers: [
        tf.layers.lstm({
          units: 64,
          inputShape: [this.config.timeSteps, 5],
          returnSequences: true
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.lstm({
          units: 32,
          returnSequences: false
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: this.config.predictionSteps * 5,
          activation: 'linear'
        })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'meanSquaredError'
    });

    return this.model;
  }

  async train(data: WeatherData[]) {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    const { inputs, targets } = this.prepareTrainingData(data);
    
    await this.model.fit(inputs, targets, {
      epochs: this.config.epochs,
      batchSize: this.config.batchSize,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch + 1}/${this.config.epochs} - loss: ${logs?.loss.toFixed(4)} - val_loss: ${logs?.val_loss.toFixed(4)}`);
        }
      }
    });

    // Clean up tensors
    inputs.dispose();
    targets.dispose();
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
    const prediction = this.model.predict(input) as tf.Tensor;
    const predictionData = await prediction.array() as number[][];

    // Clean up tensors
    input.dispose();
    prediction.dispose();

    // Format predictions for exactly the next 24 hours
    const predictions = this.formatPredictions(predictionData[0], latestTimestamp);
    
    console.log('Generated predictions:', {
      count: predictions.length,
      timeRange: {
        start: new Date(predictions[0].startTime).toISOString(),
        end: new Date(predictions[predictions.length - 1].startTime).toISOString()
      }
    });

    return predictions;
  }

  private prepareTrainingData(data: WeatherData[]) {
    const X: number[][][] = [];
    const y: number[][] = [];
    
    for (let i = 0; i < data.length - this.config.timeSteps - this.config.predictionSteps; i++) {
      const window = data.slice(i, i + this.config.timeSteps);
      const target = data.slice(i + this.config.timeSteps, i + this.config.timeSteps + this.config.predictionSteps);
      
      const windowFeatures = window.map(d => [
        d.temperature,
        d.windSpeed,
        d.windGusts,
        Math.sin(d.windDirection * Math.PI / 180),
        Math.cos(d.windDirection * Math.PI / 180)
      ]);
      
      const targetFeatures = target.flatMap(d => [
        d.temperature,
        d.windSpeed,
        d.windGusts,
        Math.sin(d.windDirection * Math.PI / 180),
        Math.cos(d.windDirection * Math.PI / 180)
      ]);

      X.push(windowFeatures);
      y.push(targetFeatures);
    }
    
    return {
      inputs: tf.tensor3d(X),
      targets: tf.tensor2d(y)
    };
  }

  private prepareInputData(data: WeatherData[]) {
    const input = data.map(d => [
      d.temperature,
      d.windSpeed,
      d.windGusts,
      Math.sin(d.windDirection * Math.PI / 180),
      Math.cos(d.windDirection * Math.PI / 180)
    ]);
    
    return tf.tensor3d([input]);
  }

  private formatPredictions(flatPredictions: number[], lastTimestamp: number): PredictionChunk[] {
    const chunks: PredictionChunk[] = [];
    const HOUR_MS = 3600000;
    
    // Generate exactly 24 hourly predictions
    for (let i = 0; i < 24; i++) {
      const offset = i * 5;  // 5 features per prediction
      const timestamp = lastTimestamp + (i + 1) * HOUR_MS;
      
      chunks.push({
        startTime: timestamp,
        endTime: timestamp + HOUR_MS,
        temperature: flatPredictions[offset],
        windSpeed: Math.max(0, flatPredictions[offset + 1]),  // Wind speed can't be negative
        windGusts: Math.max(0, flatPredictions[offset + 2]),  // Gusts can't be negative
        windDirection: (Math.atan2(
          flatPredictions[offset + 3],
          flatPredictions[offset + 4]
        ) * 180 / Math.PI + 360) % 360,
        humidity: 0, // Not predicted
        confidence: Math.max(0.2, 1 - (i * 0.03))  // Decreasing confidence over time
      });
    }
    
    return chunks;
  }
}

// Helper functions for external use
export async function trainModel(data: WeatherData[]): Promise<WeatherModel> {
  const model = new WeatherModel();
  await model.initialize();
  await model.train(data);
  return model;
}

export async function predictNextHours(model: WeatherModel, data: WeatherData[]): Promise<PredictionChunk[]> {
  return model.predict(data);
}
