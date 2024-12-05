import * as tf from '@tensorflow/tfjs';
import type { WeatherData, ModelConfig } from './types';

interface DataStats {
  mean: { [key: string]: number };
  std: { [key: string]: number };
}

const calculateStats = (data: WeatherData[]): DataStats => {
  const stats: DataStats = {
    mean: {},
    std: {}
  };

  const numericFields = [
    'windSpeed',
    'windGusts',
    'windDirection',
    'waveHeight',
    'wavePeriod',
    'swellDirection'
  ];

  // Calculate means
  numericFields.forEach((field) => {
    const values = data
      .map((d) => (d as any)[field])
      .filter((v) => v !== undefined && !isNaN(v));
    stats.mean[field] =
      values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  });

  // Calculate standard deviations
  numericFields.forEach((field) => {
    const values = data
      .map((d) => (d as any)[field])
      .filter((v) => v !== undefined && !isNaN(v));
    const mean = stats.mean[field];
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    stats.std[field] =
      values.length > 0
        ? Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length)
        : 1;
    // Prevent division by zero
    if (stats.std[field] === 0) stats.std[field] = 1;
  });

  return stats;
};

const normalizeData = (data: WeatherData[], stats: DataStats): WeatherData[] => {
  return data.map((record) => {
    const normalized = { ...record };
    Object.keys(stats.mean).forEach((field) => {
      if ((record as any)[field] !== undefined) {
        (normalized as any)[field] =
          ((record as any)[field] - stats.mean[field]) / stats.std[field];
      } else {
        // Handle missing values with mean imputation (normalized mean is 0)
        (normalized as any)[field] = 0;
      }
    });
    return normalized;
  });
};

const denormalizePrediction = (pred: number[], stats: DataStats): WeatherData => {
  return {
    timestamp: Date.now(),
    windSpeed: pred[0] * stats.std.windSpeed + stats.mean.windSpeed,
    windGusts: pred[1] * stats.std.windGusts + stats.mean.windGusts,
    windDirection: ((Math.atan2(pred[3], pred[2]) * (180 / Math.PI)) + 360) % 360,
    waveHeight: pred[4] * stats.std.waveHeight + stats.mean.waveHeight,
    wavePeriod: pred[5] * stats.std.wavePeriod + stats.mean.wavePeriod,
    swellDirection: ((Math.atan2(pred[7], pred[6]) * (180 / Math.PI)) + 360) % 360,
    isForecast: true
  };
};

const prepareTrainingData = (data: WeatherData[], timeSteps: number) => {
  const stats = calculateStats(data);
  const normalizedData = normalizeData(data, stats);

  const X: number[][][] = [];
  const y: number[][] = [];

  for (let i = timeSteps; i < normalizedData.length; i++) {
    const inputSequence = normalizedData.slice(i - timeSteps, i).map((d) => [
      d.windSpeed,
      d.windGusts,
      Math.sin((d.windDirection * Math.PI) / 180),
      Math.cos((d.windDirection * Math.PI) / 180),
      d.waveHeight || 0,
      d.wavePeriod || 0,
      Math.sin(((d.swellDirection || 0) * Math.PI) / 180),
      Math.cos(((d.swellDirection || 0) * Math.PI) / 180)
    ]);

    const targetFeatures = [
      normalizedData[i].windSpeed,
      normalizedData[i].windGusts,
      Math.sin((normalizedData[i].windDirection * Math.PI) / 180),
      Math.cos((normalizedData[i].windDirection * Math.PI) / 180),
      normalizedData[i].waveHeight || 0,
      normalizedData[i].wavePeriod || 0,
      Math.sin(((normalizedData[i].swellDirection || 0) * Math.PI) / 180),
      Math.cos(((normalizedData[i].swellDirection || 0) * Math.PI) / 180)
    ];

    X.push(inputSequence);
    y.push(targetFeatures);
  }

  return {
    inputs: tf.tensor3d(X),
    targets: tf.tensor2d(y),
    stats
  };
};

function createModel(
  numFeatures: number,
  outputDim: number,
  timeSteps: number,
  useLightModel: boolean
): tf.LayersModel {
  const model = tf.sequential();

  if (useLightModel) {
    model.add(
      tf.layers.lstm({
        units: 32,
        returnSequences: false,
        inputShape: [timeSteps, numFeatures]
      })
    );
  } else {
    model.add(
      tf.layers.lstm({
        units: 64,
        returnSequences: true,
        inputShape: [timeSteps, numFeatures]
      })
    );
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.lstm({ units: 32, returnSequences: false }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
  }

  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.1 }));
  model.add(tf.layers.dense({ units: outputDim }));

  return model;
}

export function calculateR2Score(actuals: number[], predictions: number[]): number {
  const meanActual = actuals.reduce((sum, val) => sum + val, 0) / actuals.length;
  const totalSS = actuals.reduce((sum, val) => sum + Math.pow(val - meanActual, 2), 0);
  const residualSS = actuals.reduce((sum, actual, i) => sum + Math.pow(actual - predictions[i], 2), 0);
  return 1 - residualSS / totalSS;
}

export async function trainModel(
  historicalData: WeatherData[],
  config: ModelConfig
): Promise<{
  model: tf.LayersModel;
  trainingLoss: number[];
  validationLoss: number[];
  actuals: number[];
  predictions: number[];
}> {
  const {
    timeSteps = 24,
    epochs = 50,
    batchSize = 32,
    learningRate = 0.001
  } = config;

  // Prepare data with normalization
  const { inputs, targets, stats } = prepareTrainingData(historicalData, timeSteps);

  // Create and compile model
  const model = createModel(inputs.shape[2], targets.shape[1], timeSteps, config.useLightModel);

  const optimizer = tf.train.adam(learningRate);
  model.compile({
    optimizer,
    loss: 'meanSquaredError',
    metrics: ['mae']
  });

  const trainingLoss: number[] = [];
  const validationLoss: number[] = [];

  // Train model with early stopping
  const validationSplit = 0.2;
  const earlyStoppingPatience = 10;
  let bestLoss = Infinity;
  let patienceCounter = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const { history } = await model.fit(inputs, targets, {
      epochs: 1,
      batchSize,
      validationSplit,
      shuffle: true
    });

    // Extract loss values
    let currentLoss = Infinity;
    let currentValLoss = Infinity;
    if (history && history.loss && history.loss.length > 0) {
      currentLoss = history.loss[0] as number;
      trainingLoss.push(currentLoss);
    }
    if (history && history.val_loss && history.val_loss.length > 0) {
      currentValLoss = history.val_loss[0] as number;
      validationLoss.push(currentValLoss);
    }

    if (config.callbacks?.onProgress) {
      config.callbacks.onProgress({
        currentEpoch: epoch + 1,
        totalEpochs: epochs,
        loss: currentLoss,
        stage: 'training'
      });
    }

    // Early stopping check
    if (currentValLoss < bestLoss) {
      bestLoss = currentValLoss;
      patienceCounter = 0;
    } else {
      patienceCounter++;
      if (patienceCounter >= earlyStoppingPatience) {
        console.log('Early stopping triggered');
        break;
      }
    }
  }

  // Generate predictions on validation set
  const validationSize = Math.floor(inputs.shape[0] * 0.2);
  const validationInputs = inputs.slice(
    [inputs.shape[0] - validationSize, 0, 0],
    [validationSize, -1, -1]
  );
  const validationTargets = targets.slice(
    [targets.shape[0] - validationSize, 0],
    [validationSize, -1]
  );

  const predictedTensor = model.predict(validationInputs) as tf.Tensor;
  const predictedArray = (await predictedTensor.array()) as number[][];
  const actualArray = (await validationTargets.array()) as number[][];

  // Extract wind speed predictions and actuals for metrics (index 0 is wind speed)
  const predictions = predictedArray.map((pred) => pred[0]);
  const actuals = actualArray.map((actual) => actual[0]);

  // Dispose of tensors
  inputs.dispose();
  targets.dispose();
  validationInputs.dispose();
  validationTargets.dispose();
  predictedTensor.dispose();

  // Attach stats and timeSteps to the model for later use
  (model as any).stats = stats;
  (model as any).timeSteps = timeSteps;

  return { model, trainingLoss, validationLoss, actuals, predictions };
}

export async function predictNextHours(
  model: tf.LayersModel,
  historicalData: WeatherData[],
  timeSteps: number
): Promise<WeatherData[]> {
  const stats = (model as any).stats as DataStats;
  if (!stats) {
    throw new Error('Model stats not found');
  }

  const predictionSteps = 24; // Predict next 24 hours

  // Prepare initial input data
  const normalizedData = normalizeData(historicalData.slice(-timeSteps), stats);
  const predictions: WeatherData[] = [];
  
  let currentInput = normalizedData;

  // Generate predictions for each hour
  for (let i = 0; i < predictionSteps; i++) {
    const inputSequence = currentInput.map((d) => [
      d.windSpeed,
      d.windGusts,
      Math.sin((d.windDirection * Math.PI) / 180),
      Math.cos((d.windDirection * Math.PI) / 180),
      d.waveHeight || 0,
      d.wavePeriod || 0,
      Math.sin(((d.swellDirection || 0) * Math.PI) / 180),
      Math.cos(((d.swellDirection || 0) * Math.PI) / 180)
    ]);

    const inputTensor = tf.tensor3d([inputSequence]);
    const predictionTensor = model.predict(inputTensor) as tf.Tensor;
    const predictionArray = await predictionTensor.array();

    if (!Array.isArray(predictionArray) || !Array.isArray(predictionArray[0])) {
      throw new Error('Invalid prediction format');
    }

    // Denormalize prediction
    const prediction = denormalizePrediction(predictionArray[0], stats);
    predictions.push(prediction);

    // Update input for next prediction
    currentInput = [...currentInput.slice(1), normalizeData([prediction], stats)[0]];

    // Cleanup tensors
    inputTensor.dispose();
    predictionTensor.dispose();
  }

  return predictions;
}
