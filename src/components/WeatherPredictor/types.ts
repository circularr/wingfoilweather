export interface WeatherData {
  timestamp: number;
  temperature: number;
  windSpeed: number;
  windGusts: number;
  windDirection: number;
  humidity: number;
  isForecast?: boolean;
}

export interface PredictionChunk {
  startTime: number;
  endTime: number;
  temperature: number;
  windSpeed: number;
  windGusts: number;
  windDirection: number;
  humidity: number;
  confidence: number;
}

export interface ModelConfig {
  epochs: number;
  batchSize: number;
  learningRate: number;
  timeSteps: number; // 16 hours
  predictionSteps: number; // 4 chunks of 4 hours
}

export interface TrainingStatus {
  epoch: number;
  loss: number;
  status: 'training' | 'complete' | 'error';
}
