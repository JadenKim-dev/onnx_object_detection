import type { InferenceSession } from 'onnxruntime-web';

export interface ModelMetadata {
  id: string;
  name: string;
  file: string;
  description: string;
  size_mb: number;
  input_shape: [number, number, number, number];
  output_shape: [number, number, number, number];
  parameters: string;
  recommended_use: string;
}

export type ExecutionProvider = 'webgpu' | 'wasm' | 'cpu';

export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

export interface ModelSession {
  session: InferenceSession;
  metadata: ModelMetadata;
  executionProvider: ExecutionProvider;
  inputName: string;
  outputName: string;
  inputShape: number[];
  outputShape: number[];
}

export interface LoadResult {
  session: ModelSession;
  loadTimeMs: number;
  executionProvider: ExecutionProvider;
}

export interface ModelError {
  message: string;
  provider?: ExecutionProvider;
}

export interface BrowserCapabilities {
  webgpu: boolean;
  wasm: boolean;
  simd: boolean;
  threads: boolean;
}

export interface RawDetection {
  classId: number;
  confidence: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
}

export type { Detection } from '../nms';

export interface InferenceResult {
  detections: RawDetection[];
  inferenceTimeMs: number;
  numCandidates: number;
  numAfterNMS?: number;
}

export interface InferenceConfig {
  confidenceThreshold: number;
  maxDetections?: number;
  applyNMS?: boolean;
  iouThreshold?: number;
}

export type {
  FinalDetection,
  PostProcessConfig,
  TransformMetadata,
} from '../postprocess';
