/**
 * Image preprocessing pipeline for YOLO models
 * Handles letterbox resizing, BGR conversion, and normalization
 */

import type { Mat } from '@techstark/opencv-js';
import { getOpenCV, cleanupMats } from './opencv-loader';

export interface PreprocessResult {
  tensor: Float32Array;
  scale: number;
  padX: number;
  padY: number;
  originalWidth: number;
  originalHeight: number;
}

/**
 * Preprocess video frame for YOLO model input
 *
 * @param video - Video element to capture frame from
 * @param canvas - Canvas for drawing (can be offscreen)
 * @param modelWidth - Model input width
 * @param modelHeight - Model input height
 * @returns Preprocessed tensor data with metadata for coordinate transformation
 */
export async function preprocessImage(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  modelWidth = 640,
  modelHeight = 640
): Promise<PreprocessResult> {
  const cv = await getOpenCV();

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to get canvas 2d context');
  }

  // Stage 1: Draw video frame to canvas
  // This converts the video stream into pixel data
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);

  const mats: Mat[] = [];

  try {
    const mat = cv.imread(canvas);
    mats.push(mat);

    // Stage 2: Convert RGBA(web format) to BGR (OpenCV format)
    // YOLO models expect BGR color ordering
    const matC3 = new cv.Mat();
    mats.push(matC3);
    cv.cvtColor(mat, matC3, cv.COLOR_RGBA2BGR);

    // Stage 3: Apply letterbox resize (maintain aspect ratio with padding)
    // This prevents objects from being stretched or squashed
    const maxSize = Math.max(matC3.rows, matC3.cols);
    const yPad = maxSize - matC3.rows;
    const xPad = maxSize - matC3.cols;

    const matPad = new cv.Mat();
    mats.push(matPad);
    cv.copyMakeBorder(
      matC3,
      matPad,
      0,
      yPad,
      0,
      xPad,
      cv.BORDER_CONSTANT,
      new cv.Scalar(114, 114, 114, 255) // gray padding
    );

    // Stage 4: Resize to model input size (640x640)
    const matResized = new cv.Mat();
    mats.push(matResized);
    cv.resize(matPad, matResized, new cv.Size(modelWidth, modelHeight), 0, 0, cv.INTER_LINEAR);

    // Stage 5: Convert to tensor blob (normalized float32)
    const inputBlob = cv.blobFromImage(
      matResized,
      1 / 255.0, // normalize from [0, 255] to [0, 1] range
      new cv.Size(modelWidth, modelHeight),
      new cv.Scalar(0, 0, 0),
      true, // swapRB (BGR to RGB)
      false,
      cv.CV_32F
    );
    mats.push(inputBlob);

    const tensorData = new Float32Array(inputBlob.data32F);

    const scale = modelWidth / maxSize;

    return {
      tensor: tensorData,
      scale,
      padX: xPad,
      padY: yPad,
      originalWidth: video.videoWidth,
      originalHeight: video.videoHeight,
    };
  } finally {
    cleanupMats(...mats);
  }
}

/**
 * Validate tensor output shape and values
 */
export function validatePreprocessOutput(
  result: PreprocessResult,
  expectedShape: [number, number, number] = [3, 640, 640]
): boolean {
  const [channels, height, width] = expectedShape;
  const expectedSize = channels * height * width;

  if (result.tensor.length !== expectedSize) {
    console.error(
      `Invalid tensor size: expected ${expectedSize}, got ${result.tensor.length}`
    );
    return false;
  }

  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < result.tensor.length; i++) {
    if (result.tensor[i] < min) min = result.tensor[i];
    if (result.tensor[i] > max) max = result.tensor[i];
  }

  if (min < 0 || max > 1) {
    console.error(`Invalid tensor values: min=${min}, max=${max}. Expected [0, 1]`);
    return false;
  }

  return true;
}
