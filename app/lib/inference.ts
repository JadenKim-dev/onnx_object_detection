import * as ort from 'onnxruntime-web';
import type {
  ModelSession,
  RawDetection,
  InferenceResult,
  InferenceConfig,
} from './types/model';

const DEFAULT_CONFIG: InferenceConfig = {
  confidenceThreshold: 0.25,
};

/**
 * Validates that the input tensor has the correct size for the model.
 * 
 * @param tensorData - The Float32Array containing preprocessed image data
 * @param expectedShape - Expected tensor shape as [channels, height, width]. Defaults to [3, 640, 640]
 * @throws {Error} If tensor size doesn't match expected dimensions
 */
export function validateInputTensor(
  tensorData: Float32Array,
  expectedShape: [number, number, number] = [3, 640, 640]
): void {
  const expectedSize = expectedShape[0] * expectedShape[1] * expectedShape[2];

  if (tensorData.length !== expectedSize) {
    throw new Error(
      `[Inference] Invalid input tensor size: expected ${expectedSize}, got ${tensorData.length}`
    );
  }
}

function normalizeOutputShape(dims: readonly number[]): {
  batchSize: number;
  numFeatures: number;
  numPredictions: number;
} {
  if (dims.length === 3) {
    const [batch, features, predictions] = dims;
    return { batchSize: batch, numFeatures: features, numPredictions: predictions };
  } else if (dims.length === 4) {
    const [batch, _, features, predictions] = dims;
    return { batchSize: batch, numFeatures: features, numPredictions: predictions };
  } else {
    throw new Error(
      `[Inference] Unexpected output shape: [${dims.join(', ')}]. Expected [1, 84, 8400] or [1, 1, 84, 8400]`
    );
  }
}

// Constants for YOLO output parsing
const NUM_BBOX_COORDS = 4;
const NUM_CLASSES = 80;
const IMAGE_SIZE = 640;

/**
 * Extracts bounding box coordinates from YOLO output data
 */
function extractBoundingBox(
  outputData: Float32Array,
  predictionIndex: number,
  numPredictions: number
): { cx: number; cy: number; width: number; height: number } {
  return {
    cx: outputData[0 * numPredictions + predictionIndex],
    cy: outputData[1 * numPredictions + predictionIndex],
    width: outputData[2 * numPredictions + predictionIndex],
    height: outputData[3 * numPredictions + predictionIndex],
  };
}

/**
 * Validates bounding box dimensions and position
 */
function isValidBoundingBox(bbox: {
  cx: number;
  cy: number;
  width: number;
  height: number;
}): boolean {
  return (
    bbox.width > 0 &&
    bbox.height > 0 &&
    bbox.cx >= 0 &&
    bbox.cy >= 0 &&
    bbox.cx <= IMAGE_SIZE &&
    bbox.cy <= IMAGE_SIZE
  );
}

/**
 * Finds the class with highest confidence score for a prediction
 */
function findBestClass(
  outputData: Float32Array,
  predictionIndex: number,
  numPredictions: number
): { classId: number; confidence: number } {
  let maxScore = 0;
  let maxClassId = 0;

  for (let classIdx = 0; classIdx < NUM_CLASSES; classIdx++) {
    const scoreIdx = (NUM_BBOX_COORDS + classIdx) * numPredictions + predictionIndex;
    const score = outputData[scoreIdx];

    if (score > maxScore) {
      maxScore = score;
      maxClassId = classIdx;
    }
  }

  return { classId: maxClassId, confidence: maxScore };
}

/**
 * Parses raw YOLO model output into structured detection objects.
 * 
 * Processes the model's output tensor to extract bounding boxes and class predictions.
 * The YOLO output format is [batch, 84, 8400] where:
 * - 84 features = 4 bbox coordinates (cx, cy, w, h) + 80 class scores
 * - 8400 predictions = anchor points across the feature pyramid
 * 
 * @param outputData - Raw Float32Array from model output tensor
 * @param outputShape - Shape of the output tensor (supports [1, 84, 8400] or [1, 1, 84, 8400])
 * @param confidenceThreshold - Minimum confidence score to include a detection (0.0-1.0)
 * @returns Array of raw detections with bounding boxes, class IDs, and confidence scores
 * @throws {Error} If output shape is unexpected or number of features is not 84
 */
export function parseYoloOutput(
  outputData: Float32Array,
  outputShape: number[],
  confidenceThreshold: number
): RawDetection[] {
  const { numFeatures, numPredictions } = normalizeOutputShape(outputShape);

  if (numFeatures !== 84) {
    throw new Error(`[Inference] Expected 84 features, got ${numFeatures}`);
  }

  const detections: RawDetection[] = [];

  for (let i = 0; i < numPredictions; i++) {
    const bbox = extractBoundingBox(outputData, i, numPredictions);
    
    if (!isValidBoundingBox(bbox)) {
      continue;
    }

    const { classId, confidence } = findBestClass(outputData, i, numPredictions);

    if (confidence >= confidenceThreshold) {
      detections.push({
        classId,
        confidence,
        ...bbox,
      });
    }
  }

  return detections;
}

/**
 * Runs object detection inference on preprocessed image data.
 * 
 * Executes the ONNX model on the provided tensor data and returns structured detection results.
 * The function handles tensor creation, model execution, output parsing, and performance timing.
 * 
 * @param modelSession - Active ONNX Runtime session with model metadata
 * @param tensorData - Preprocessed image data as Float32Array in CHW format (channels, height, width)
 * @param config - Optional inference configuration to override defaults
 * @param config.confidenceThreshold - Minimum confidence score (default: 0.25)
 * @param config.maxDetections - Maximum number of detections to return (default: unlimited)
 * @returns Promise resolving to inference results with detections and timing information
 * @throws {Error} If input tensor size is invalid or inference fails
 */
export async function runInference(
  modelSession: ModelSession,
  tensorData: Float32Array,
  config?: Partial<InferenceConfig>
): Promise<InferenceResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  validateInputTensor(tensorData, [3, 640, 640]);

  const startTime = performance.now();

  const inputTensor = new ort.Tensor(
    'float32',
    tensorData,
    modelSession.inputShape
  );

  const feeds = { [modelSession.inputName]: inputTensor };
  const results = await modelSession.session.run(feeds);

  const outputTensor = results[modelSession.outputName];
  if (!outputTensor) {
    throw new Error(
      `[Inference] Output tensor '${modelSession.outputName}' not found`
    );
  }

  const outputData = outputTensor.data as Float32Array;
  const outputShape = Array.from(outputTensor.dims);

  const detections = parseYoloOutput(
    outputData,
    outputShape,
    finalConfig.confidenceThreshold
  );

  const filteredDetections = finalConfig.maxDetections
    ? detections.slice(0, finalConfig.maxDetections)
    : detections;

  const inferenceTimeMs = performance.now() - startTime;

  return {
    detections: filteredDetections,
    inferenceTimeMs,
    numCandidates: 8400,
    numFiltered: filteredDetections.length,
  };
}
