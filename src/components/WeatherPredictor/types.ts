export interface WeatherData {
  timestamp: number;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  humidity: number;
}

export interface PredictionChunk {
  startTime: number;
  endTime: number;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  humidity: number;
  confidence: number;
}

export interface ModelState {
  isTraining: boolean;
  isReady: boolean;
  error: string | null;
}

export interface WeatherPrediction {
  chunks: PredictionChunk[];
  lastUpdated: number;
} 