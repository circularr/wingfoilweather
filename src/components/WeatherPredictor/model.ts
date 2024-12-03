import * as tf from '@tensorflow/tfjs';
import type { WeatherData, PredictionChunk, ModelConfig } from './types';

export class WeatherModel {
  private model: tf.LayersModel | null = null;
  private config: ModelConfig = {
    epochs: 50,
    batchSize: 32,
    learningRate: 0.001,
    timeSteps: 16,  // 16 hours of input data
    predictionSteps: 24  // Predict 24 hours ahead
  };

  private featureCount = 6;  // [temp, windSpeed, windGusts, windDirSin, windDirCos, humidity]

  async initialize() {
    const model = tf.sequential();
      
    // LSTM layer for processing temporal sequences
    model.add(tf.layers.lstm({
      units: 128,
      inputShape: [this.config.timeSteps, this.featureCount],
      returnSequences: false
    }));
    model.add(tf.layers.dropout({ rate: 0.2 }));

    // Dense layers for multi-step prediction
    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu'
    }));
    model.add(tf.layers.dropout({ rate: 0.2 }));

    // Output layer predicts multiple steps ahead
    model.add(tf.layers.dense({
      units: this.config.predictionSteps * 5,  // [temp, windSpeed, windGusts, windDirSin, windDirCos]
      activation: 'linear'
    }));

    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'meanSquaredError',
      metrics: ['mse']
    });

    this.model = model;
    console.log('Model initialized with architecture:', model.summary());
  }

  private preprocessData(data: WeatherData[]): number[][] {
    return data.map(d => [
      d.temperature,
      d.windSpeed,
      d.windGusts,
      Math.sin(d.windDirection * Math.PI / 180),  // Convert direction to sine
      Math.cos(d.windDirection * Math.PI / 180),  // Convert direction to cosine
      d.humidity
    ]);
  }

  private createSequences(data: number[][]): [tf.Tensor, tf.Tensor] {
    const sequences: number[][][] = [];
    const targets: number[][] = [];

    for (let i = 0; i < data.length - this.config.timeSteps - this.config.predictionSteps; i++) {
      sequences.push(data.slice(i, i + this.config.timeSteps));
      
      // Create target sequence for multiple steps ahead
      const target = data.slice(i + this.config.timeSteps, i + this.config.timeSteps + this.config.predictionSteps)
        .map(step => [
          step[0],  // temperature
          step[1],  // windSpeed
          step[2],  // windGusts
          step[3],  // windDirSin
          step[4]   // windDirCos
        ])
        .flat();
      targets.push(target);
    }

    return [
      tf.tensor3d(sequences),
      tf.tensor2d(targets)
    ];
  }

  async train(data: WeatherData[]) {
    if (!this.model) throw new Error('Model not initialized');

    const processedData = this.preprocessData(data);
    const [inputs, targets] = this.createSequences(processedData);

    try {
      const history = await this.model.fit(inputs, targets, {
        epochs: this.config.epochs,
        batchSize: this.config.batchSize,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(
              `Epoch ${epoch + 1}/${this.config.epochs} - ` +
              `loss: ${logs?.loss.toFixed(4)} - ` +
              `val_loss: ${logs?.val_loss.toFixed(4)}`
            );
          }
        }
      });

      console.log('Training complete:', history);
    } finally {
      inputs.dispose();
      targets.dispose();
    }
  }

  async predict(recentData: WeatherData[]): Promise<PredictionChunk[]> {
    if (!this.model) throw new Error('Model not initialized');

    const processedData = this.preprocessData(recentData);
    const input = tf.tensor3d([processedData.slice(-this.config.timeSteps)]);

    try {
      const prediction = await this.model.predict(input) as tf.Tensor2D;
      const predictionArray = await prediction.array() as number[][];
      const lastTimestamp = recentData[recentData.length - 1].timestamp;

      // Convert flat predictions back to time steps
      const predictions: PredictionChunk[] = [];
      for (let i = 0; i < this.config.predictionSteps; i++) {
        const offset = i * 5;  // 5 features per step
        const windDirSin = predictionArray[0][offset + 3];
        const windDirCos = predictionArray[0][offset + 4];
        
        // Convert sine and cosine back to degrees
        const windDirection = ((Math.atan2(windDirSin, windDirCos) * 180 / Math.PI) + 360) % 360;
        
        predictions.push({
          startTime: lastTimestamp + (i + 1) * 60 * 60 * 1000,
          endTime: lastTimestamp + (i + 2) * 60 * 60 * 1000,
          temperature: predictionArray[0][offset],
          windSpeed: Math.max(0, predictionArray[0][offset + 1]),
          windGusts: Math.max(0, predictionArray[0][offset + 2]),
          windDirection,
          humidity: recentData[recentData.length - 1].humidity,  // Use last known humidity
          confidence: Math.max(0.2, 1 - (i * 0.03))  // Confidence decreases over time
        });
      }

      return predictions;
    } finally {
      input.dispose();
    }
  }
}
