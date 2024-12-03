import * as tf from '@tensorflow/tfjs';

export async function initializeTensorFlow() {
  // First try to initialize WebGL backend
  try {
    await tf.setBackend('webgl');
    await tf.ready();
    console.log('Using WebGL backend');
  } catch (e) {
    // If WebGL fails, fall back to CPU backend
    try {
      await tf.setBackend('cpu');
      await tf.ready();
      console.log('Falling back to CPU backend');
    } catch (e2) {
      console.error('Failed to initialize TensorFlow backend:', e2);
      throw new Error('Could not initialize TensorFlow');
    }
  }

  // Set up memory management
  tf.enableProdMode();
  tf.engine().startScope(); // Start global scope for memory management
} 