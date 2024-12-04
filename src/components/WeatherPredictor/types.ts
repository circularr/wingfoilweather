export interface WeatherData {
  timestamp: number;
  temperature: number;
  windSpeed: number;
  windGusts: number;
  windDirection: number;
  humidity: number;
  waveHeight?: number;
  wavePeriod?: number;
  swellDirection?: number;
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
  waveHeight: number;
  wavePeriod: number;
  swellDirection: number;
  confidence: number;
}

export type PerformancePreset = 'fast' | 'balanced' | 'accurate';

export interface ModelConfig {
  epochs: number;
  batchSize: number;
  learningRate: number;
  timeSteps: number; // 16 hours
  predictionSteps: number; // 24 chunks of 4 hours
  performancePreset: PerformancePreset;
  useLightModel: boolean;
}

export interface ModelMetricsType {
  validationStrategy: string;
  rmse: number;
  mae: number;
  r2Score: number;
  confidenceIntervals: {
    wind: number;
    direction: number;
    temperature: number;
  };
  sampleSize: number;
  timestamp: string;
  trainingLoss: number[];
  validationLoss: number[];
  errorDistribution: number[];
}

export interface TrainingStatus {
  epoch: number;
  loss: number;
  status: 'training' | 'complete' | 'error';
}

export interface TrainingProgress {
  currentEpoch: number;
  totalEpochs: number;
  loss: number;
  stage: 'initializing' | 'training' | 'predicting';
}

export interface TrainingProgress {
  status: string;
  progress: number;
}
