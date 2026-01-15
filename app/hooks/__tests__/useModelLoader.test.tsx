import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useModelLoader } from '@/app/hooks/useModelLoader';
import type { ModelMetadata } from '@/app/lib/types/model';

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
      dims: [1, 84, 8400],
    },
  },
  release: vi.fn().mockResolvedValue(undefined),
  run: vi.fn(),
};

const mockLoadModel = vi.fn();
const mockReleaseModel = vi.fn().mockResolvedValue(undefined);

vi.mock('@/app/lib/onnx-loader', () => ({
  loadModel: (...args: Parameters<typeof mockLoadModel>) => mockLoadModel(...args),
  releaseModel: (...args: Parameters<typeof mockReleaseModel>) => mockReleaseModel(...args),
}));

describe('useModelLoader', () => {
  const mockModelMetadata: ModelMetadata = {
    id: 'yolo11n',
    name: 'YOLOv11 Nano',
    file: '/models/yolo11n.onnx',
    description: 'Fastest model',
    size_mb: 10.2,
    input_shape: [1, 3, 640, 640],
    output_shape: [1, 84, 8400, 1],
    parameters: '2.6M',
    recommended_use: 'Real-time',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadModel.mockResolvedValue({
      session: {
        session: mockSession,
        metadata: mockModelMetadata,
        executionProvider: 'webgpu',
        inputName: 'images',
        outputName: 'output0',
        inputShape: [1, 3, 640, 640],
        outputShape: [1, 84, 8400],
      },
      loadTimeMs: 1234.56,
      executionProvider: 'webgpu',
    });
  });

  describe('initial state', () => {
    it('should start with idle state', () => {
      const { result } = renderHook(() => useModelLoader());

      expect(result.current.session).toBeNull();
      expect(result.current.loadingState).toBe('idle');
      expect(result.current.error).toBeNull();
      expect(result.current.loadTimeMs).toBeNull();
      expect(result.current.executionProvider).toBeNull();
    });
  });

  describe('loadModel', () => {
    it('should load model successfully', async () => {
      const { result } = renderHook(() => useModelLoader());

      const loadPromise = result.current.loadModel(mockModelMetadata);

      await waitFor(() => {
        expect(result.current.loadingState).toBe('loaded');
      });

      await loadPromise;

      expect(result.current.session).not.toBeNull();
      expect(result.current.session?.metadata.id).toBe('yolo11n');
      expect(result.current.executionProvider).toBe('webgpu');
      expect(result.current.loadTimeMs).toBe(1234.56);
      expect(result.current.error).toBeNull();
      expect(mockLoadModel).toHaveBeenCalledWith(mockModelMetadata, undefined);
    });

    it('should load model with preferred provider', async () => {
      const { result } = renderHook(() => useModelLoader());

      result.current.loadModel(mockModelMetadata, 'wasm');

      await waitFor(() => {
        expect(result.current.loadingState).toBe('loaded');
      });

      expect(mockLoadModel).toHaveBeenCalledWith(mockModelMetadata, 'wasm');
    });

    it('should set loading state during load', async () => {
      const { result } = renderHook(() => useModelLoader());

      mockLoadModel.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  session: {
                    session: mockSession,
                    metadata: mockModelMetadata,
                    executionProvider: 'webgpu',
                    inputName: 'images',
                    outputName: 'output0',
                    inputShape: [1, 3, 640, 640],
                    outputShape: [1, 84, 8400],
                  },
                  loadTimeMs: 1234.56,
                  executionProvider: 'webgpu',
                }),
              50
            );
          })
      );

      result.current.loadModel(mockModelMetadata);

      await waitFor(() => {
        expect(result.current.loadingState).toBe('loading');
      });

      await waitFor(() => {
        expect(result.current.loadingState).toBe('loaded');
      });

      expect(result.current.loadingState).toBe('loaded');
    });

    it('should handle load error', async () => {
      const { result } = renderHook(() => useModelLoader());

      const errorMessage = 'Failed to load model';
      mockLoadModel.mockRejectedValueOnce(new Error(errorMessage));

      result.current.loadModel(mockModelMetadata);

      await waitFor(() => {
        expect(result.current.loadingState).toBe('error');
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toBe(errorMessage);
      expect(result.current.session).toBeNull();
      expect(result.current.loadingState).toBe('error');
    });

    it('should clear previous error when loading new model', async () => {
      const { result } = renderHook(() => useModelLoader());

      mockLoadModel.mockRejectedValueOnce(new Error('First error'));
      result.current.loadModel(mockModelMetadata);

      await waitFor(() => {
        expect(result.current.loadingState).toBe('error');
      });

      mockLoadModel.mockResolvedValueOnce({
        session: {
          session: mockSession,
          metadata: mockModelMetadata,
          executionProvider: 'webgpu',
          inputName: 'images',
          outputName: 'output0',
          inputShape: [1, 3, 640, 640],
          outputShape: [1, 84, 8400],
        },
        loadTimeMs: 1234.56,
        executionProvider: 'webgpu',
      });

      result.current.loadModel(mockModelMetadata);

      await waitFor(() => {
        expect(result.current.loadingState).toBe('loaded');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('switchModel', () => {
    it('should release old model before loading new one', async () => {
      const { result } = renderHook(() => useModelLoader());

      await result.current.loadModel(mockModelMetadata);

      await waitFor(() => {
        expect(result.current.loadingState).toBe('loaded');
      });

      const newMetadata: ModelMetadata = {
        ...mockModelMetadata,
        id: 'yolo11s',
        name: 'YOLOv11 Small',
        file: '/models/yolo11s.onnx',
      };

      mockLoadModel.mockResolvedValueOnce({
        session: {
          session: mockSession,
          metadata: newMetadata,
          executionProvider: 'webgpu',
          inputName: 'images',
          outputName: 'output0',
          inputShape: [1, 3, 640, 640],
          outputShape: [1, 84, 8400],
        },
        loadTimeMs: 2345.67,
        executionProvider: 'webgpu',
      });

      await result.current.switchModel(newMetadata);

      await waitFor(() => {
        expect(result.current.session?.metadata.id).toBe('yolo11s');
      });

      expect(mockReleaseModel).toHaveBeenCalledTimes(1);
      expect(mockLoadModel).toHaveBeenCalledTimes(2);
    });
  });

  describe('unloadModel', () => {
    it('should release model and reset state', async () => {
      const { result } = renderHook(() => useModelLoader());

      await result.current.loadModel(mockModelMetadata);

      await waitFor(() => {
        expect(result.current.loadingState).toBe('loaded');
      });

      await result.current.unloadModel();

      await waitFor(() => {
        expect(result.current.session).toBeNull();
      });

      expect(result.current.loadingState).toBe('idle');
      expect(result.current.error).toBeNull();
      expect(result.current.loadTimeMs).toBeNull();
      expect(result.current.executionProvider).toBeNull();
      expect(mockReleaseModel).toHaveBeenCalledTimes(1);
    });

    it('should do nothing when no model is loaded', async () => {
      const { result } = renderHook(() => useModelLoader());

      await result.current.unloadModel();

      expect(mockReleaseModel).not.toHaveBeenCalled();
    });
  });

  describe('cleanup on unmount', () => {
    it('should release model when component unmounts', async () => {
      const { result, unmount } = renderHook(() => useModelLoader());

      await result.current.loadModel(mockModelMetadata);

      await waitFor(() => {
        expect(result.current.loadingState).toBe('loaded');
      });

      unmount();

      await waitFor(() => {
        expect(mockReleaseModel).toHaveBeenCalledTimes(1);
      });
    });

    it('should not release when no model is loaded', () => {
      const { unmount } = renderHook(() => useModelLoader());

      unmount();

      expect(mockReleaseModel).not.toHaveBeenCalled();
    });
  });
});
