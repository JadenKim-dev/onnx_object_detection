import * as ort from 'onnxruntime-web';
import type {
  ModelMetadata,
  ExecutionProvider,
  ModelSession,
  LoadResult,
} from './types/model';
import { detectBrowserCapabilities } from './utils/browser-detection';

let isInitialized = false;

export function initializeOnnxEnv(): void {
  if (isInitialized) return;

  ort.env.wasm.wasmPaths = '/node_modules/onnxruntime-web/dist/';

  ort.env.wasm.numThreads = 4;
  ort.env.wasm.simd = true;
  ort.env.wasm.proxy = false;

  if (process.env.NODE_ENV === 'development') {
    ort.env.logLevel = 'warning';
  }

  isInitialized = true;
}

export async function selectExecutionProvider(): Promise<ExecutionProvider> {
  const capabilities = await detectBrowserCapabilities();

  if (capabilities.webgpu) {
    return 'webgpu';
  }

  if (capabilities.wasm && capabilities.simd && capabilities.threads) {
    return 'wasm';
  }

  return 'cpu';
}

function createSessionOptions(
  provider: ExecutionProvider
): ort.InferenceSession.SessionOptions {
  const options: ort.InferenceSession.SessionOptions = {
    executionProviders: [],
    graphOptimizationLevel: 'all',
    enableCpuMemArena: true,
    enableMemPattern: true,
    executionMode: 'sequential',
  };

  if (provider === 'webgpu') {
    options.executionProviders = [
      {
        name: 'webgpu',
        preferredLayout: 'NCHW',
      } as ort.InferenceSession.WebGpuExecutionProviderOption,
    ];
  } else if (provider === 'wasm') {
    options.executionProviders = ['wasm'];
  } else {
    options.executionProviders = ['cpu'];
  }

  return options;
}

export async function loadModel(
  metadata: ModelMetadata,
  preferredProvider?: ExecutionProvider
): Promise<LoadResult> {
  const startTime = performance.now();

  initializeOnnxEnv();

  const targetProvider = preferredProvider || (await selectExecutionProvider());

  let session: ort.InferenceSession | null = null;
  let actualProvider = targetProvider;
  const fallbackChain: ExecutionProvider[] = ['webgpu', 'wasm', 'cpu'];

  const startIndex = fallbackChain.indexOf(targetProvider);
  const providersToTry = fallbackChain.slice(startIndex);

  for (const provider of providersToTry) {
    const options = createSessionOptions(provider);
    try {
      session = await ort.InferenceSession.create(metadata.file, options);
    } catch (error) {
      console.error('[ONNX Loader] Error creating session for provider:', provider, error);
      if (provider === 'cpu') {
        throw new Error(
          `Failed to load model with all execution providers. Last error: ${error}`
        );
      }
      continue;
    }
    
    actualProvider = provider;
    console.log(
      `[ONNX Loader] Successfully loaded with ${provider.toUpperCase()}`
    );
    break;
  }

  if (!session) {
    throw new Error('Failed to create ONNX session');
  }

  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];

  const inputShape = Array.from(metadata.input_shape) as number[];
  const outputShape = Array.from(metadata.output_shape) as number[];

  const loadTimeMs = performance.now() - startTime;

  const modelSession: ModelSession = {
    session,
    metadata,
    executionProvider: actualProvider,
    inputName,
    outputName,
    inputShape,
    outputShape,
  };

  return {
    session: modelSession,
    loadTimeMs,
    executionProvider: actualProvider,
  };
}

export async function getModelInfo(modelPath: string): Promise<{
  inputName: string;
  outputName: string;
  inputShape: number[];
  outputShape: number[];
}> {
  const { models }: { models: ModelMetadata[] } = await (async () => {
    try {
      const response = await fetch('/data/models.json');
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get model info: ${error}`);
    }
  })();

  const model = models.find(
    m => m.file === modelPath
  );

  if (!model) {
    throw new Error(`Model not found: ${modelPath}`);
  }

  return {
    inputName: 'images',
    outputName: 'output0',
    inputShape: model.input_shape,
    outputShape: model.output_shape,
  };
}

export async function releaseModel(modelSession: ModelSession): Promise<void> {
  try {
    await modelSession.session.release();
  } catch (error) {
    console.error('[ONNX Loader] Error releasing session:', error);
  }
}
