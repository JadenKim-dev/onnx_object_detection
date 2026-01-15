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
