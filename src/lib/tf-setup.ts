import * as tf from '@tensorflow/tfjs';

export async function initializeTensorFlow() {
  // Wait for backend to be ready
  await tf.ready();
  
  // Set memory management settings
  tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
  tf.env().set('WEBGL_FORCE_F16_TEXTURES', false);
  
  // Log backend info
  console.log('TensorFlow.js backend:', tf.getBackend());
  console.log('WebGL max texture size:', tf.env().getNumber('WEBGL_MAX_TEXTURE_SIZE'));
  
  return tf;
}

export function standardizeData(data: tf.Tensor) {
  return tf.tidy(() => {
    const moments = tf.moments(data, 0);
    const standardized = data.sub(moments.mean).div(tf.sqrt(moments.variance.add(1e-8)));
    return standardized;
  });
}
