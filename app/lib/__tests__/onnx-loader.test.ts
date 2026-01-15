import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ModelMetadata, ExecutionProvider } from '@/app/lib/types/model';

vi.mock('onnxruntime-web', () => ({
  InferenceSession: {
    create: vi.fn(),
  },
  env: {
    wasm: {
      wasmPaths: '',
      numThreads: 1,
      simd: false,
      proxy: false,
    },
    logLevel: 'warning',
  },
  Tensor: vi.fn(),
}));

vi.mock('@/app/lib/utils/browser-detection', () => ({
  detectBrowserCapabilities: vi.fn().mockResolvedValue({
    webgpu: true,
    wasm: true,
    simd: true,
    threads: true,
  }),
}));

import {
  initializeOnnxEnv,
  selectExecutionProvider,
  loadModel,
  getModelInfo,
  releaseModel,
} from '@/app/lib/onnx-loader';
import { detectBrowserCapabilities } from '@/app/lib/utils/browser-detection';
import * as ort from 'onnxruntime-web';

describe('onnx-loader', () => {
  const mockModelMetadata: ModelMetadata = {
    id: 'yolo11n',
    name: 'YOLOv11 Nano',
    file: '/models/yolo11n.onnx',
    description: 'Fastest model',
    size_mb: 10.2,
    input_shape: [1, 3, 640, 640],
    output_shape: [1, 1, 84, 8400],
    parameters: '2.6M',
    recommended_use: 'Real-time',
  };

  const mockSession = {
    inputNames: ['images'],
    outputNames: ['output0'],
    inputMetadata: {
      images: {
        dims: [1, 3, 640, 640],
      },
    },
    outputMetadata: {
      output0: {
        dims: [1, 1, 84, 8400],
      },
    },
    release: vi.fn().mockResolvedValue(undefined),
    run: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ort.env.wasm.wasmPaths = '';
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.simd = false;
    ort.env.wasm.proxy = false;
    vi.mocked(ort.InferenceSession.create).mockResolvedValue(mockSession as unknown as ort.InferenceSession);
  });

  describe('initializeOnnxEnv', () => {
    it('should initialize ONNX environment with correct settings', () => {
      initializeOnnxEnv();

      expect(ort.env.wasm.wasmPaths).toBe(
        '/node_modules/onnxruntime-web/dist/'
      );
      expect(ort.env.wasm.numThreads).toBe(4);
      expect(ort.env.wasm.simd).toBe(true);
      expect(ort.env.wasm.proxy).toBe(false);
    });

    it('should only initialize once', () => {
      initializeOnnxEnv();
      const wasmPaths = ort.env.wasm.wasmPaths;

      initializeOnnxEnv();

      expect(ort.env.wasm.wasmPaths).toBe(wasmPaths);
    });
  });

  describe('selectExecutionProvider', () => {
    it('should select WebGPU when available', async () => {
      vi.mocked(detectBrowserCapabilities).mockResolvedValueOnce({
        webgpu: true,
        wasm: true,
        simd: true,
        threads: true,
      });

      const provider = await selectExecutionProvider();

      expect(provider).toBe('webgpu');
    });

    it('should fallback to WASM when WebGPU not available', async () => {
      vi.mocked(detectBrowserCapabilities).mockResolvedValueOnce({
        webgpu: false,
        wasm: true,
        simd: true,
        threads: true,
      });

      const provider = await selectExecutionProvider();

      expect(provider).toBe('wasm');
    });

    it('should fallback to CPU when WASM features not available', async () => {
      vi.mocked(detectBrowserCapabilities).mockResolvedValueOnce({
        webgpu: false,
        wasm: true,
        simd: false,
        threads: false,
      });

      const provider = await selectExecutionProvider();

      expect(provider).toBe('cpu');
    });
  });

  describe('loadModel', () => {
    it('should load model successfully with WebGPU', async () => {
      vi.mocked(detectBrowserCapabilities).mockResolvedValueOnce({
        webgpu: true,
        wasm: true,
        simd: true,
        threads: true,
      });

      const result = await loadModel(mockModelMetadata);

      expect(result.session.session).toBe(mockSession);
      expect(result.session.metadata).toBe(mockModelMetadata);
      expect(result.executionProvider).toBe('webgpu');
      expect(result.session.inputName).toBe('images');
      expect(result.session.outputName).toBe('output0');
      expect(result.session.inputShape).toEqual([1, 3, 640, 640]);
      expect(result.session.outputShape).toEqual([1, 1, 84, 8400]);
      expect(result.loadTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should use preferred provider when specified', async () => {
      const result = await loadModel(mockModelMetadata, 'wasm');

      expect(ort.InferenceSession.create).toHaveBeenCalledWith(
        mockModelMetadata.file,
        expect.objectContaining({
          executionProviders: ['wasm'],
        })
      );
      expect(result.executionProvider).toBe('wasm');
    });

    it('should fallback to WASM when WebGPU fails', async () => {
      vi.mocked(detectBrowserCapabilities).mockResolvedValueOnce({
        webgpu: true,
        wasm: true,
        simd: true,
        threads: true,
      });

      let callCount = 0;
      vi.mocked(ort.InferenceSession.create).mockImplementation(
        (_path, options) => {
          callCount++;
          const firstProvider = options?.executionProviders?.[0];
          const providerName = typeof firstProvider === 'string' ? firstProvider : firstProvider?.name;
          if (callCount === 1 && providerName === 'webgpu') {
            return Promise.reject(new Error('WebGPU failed'));
          }
          return Promise.resolve(mockSession as unknown as ort.InferenceSession);
        }
      );

      const result = await loadModel(mockModelMetadata);

      expect(result.executionProvider).toBe('wasm');
      expect(ort.InferenceSession.create).toHaveBeenCalledTimes(2);
    });

    it('should fallback to CPU when both WebGPU and WASM fail', async () => {
      vi.mocked(detectBrowserCapabilities).mockResolvedValueOnce({
        webgpu: true,
        wasm: true,
        simd: true,
        threads: true,
      });

      let callCount = 0;
      vi.mocked(ort.InferenceSession.create).mockImplementation(
        () => {
          callCount++;
          if (callCount <= 2) {
            return Promise.reject(new Error('Provider failed'));
          }
          return Promise.resolve(mockSession as unknown as ort.InferenceSession);
        }
      );

      const result = await loadModel(mockModelMetadata);

      expect(result.executionProvider).toBe('cpu');
      expect(ort.InferenceSession.create).toHaveBeenCalledTimes(3);
    });

    it('should throw error when all providers fail', async () => {
      vi.mocked(detectBrowserCapabilities).mockResolvedValueOnce({
        webgpu: true,
        wasm: true,
        simd: true,
        threads: true,
      });

      vi.mocked(ort.InferenceSession.create).mockRejectedValue(
        new Error('All providers failed')
      );

      await expect(loadModel(mockModelMetadata)).rejects.toThrow();
    });
  });

  describe('getModelInfo', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            models: [mockModelMetadata],
          }),
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return model info from models.json', async () => {
      const info = await getModelInfo('/models/yolo11n.onnx');

      expect(info).toEqual({
        inputName: 'images',
        outputName: 'output0',
        inputShape: [1, 3, 640, 640],
        outputShape: [1, 1, 84, 8400],
      });
    });

    it('should throw error when model not found', async () => {
      await expect(getModelInfo('/models/nonexistent.onnx')).rejects.toThrow(
        'Model not found'
      );
    });

    it('should throw error when fetch fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(getModelInfo('/models/yolo11n.onnx')).rejects.toThrow(
        'Failed to get model info'
      );
    });
  });

  describe('releaseModel', () => {
    it('should release model session successfully', async () => {
      const result = await loadModel(mockModelMetadata);

      await releaseModel(result.session);

      expect(mockSession.release).toHaveBeenCalledTimes(1);
    });

    it('should handle release errors gracefully', async () => {
      const result = await loadModel(mockModelMetadata);
      mockSession.release.mockRejectedValueOnce(new Error('Release failed'));

      await expect(releaseModel(result.session)).resolves.not.toThrow();
    });
  });
});
