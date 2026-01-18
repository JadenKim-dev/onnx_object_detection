import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runInference,
  parseYoloOutput,
  validateInputTensor,
} from '@/app/lib/inference';
import type { ModelSession } from '@/app/lib/types/model';
import * as ort from 'onnxruntime-web';

vi.mock('onnxruntime-web', () => ({
  Tensor: vi.fn().mockImplementation(function(
    this: { type: string; data: Float32Array; dims: number[] },
    type: string,
    data: Float32Array,
    dims: number[]
  ) {
    this.type = type;
    this.data = data;
    this.dims = dims;
    return this;
  }),
}));

describe('inference', () => {
  describe('validateInputTensor', () => {
    it('should validate correct tensor size', () => {
      const tensor = new Float32Array(3 * 640 * 640);
      expect(() => validateInputTensor(tensor, [3, 640, 640])).not.toThrow();
    });

    it('should throw on incorrect tensor size', () => {
      const tensor = new Float32Array(100);
      expect(() => validateInputTensor(tensor, [3, 640, 640])).toThrow(
        'Invalid input tensor size'
      );
    });
  });

  describe('parseYoloOutput', () => {
    it('should parse detections above confidence threshold', () => {
      const outputData = new Float32Array(84 * 8400);

      outputData[0] = 320;
      outputData[8400] = 240;
      outputData[2 * 8400] = 100;
      outputData[3 * 8400] = 150;
      outputData[4 * 8400] = 0.8;

      const detections = parseYoloOutput(outputData, [1, 84, 8400], 0.5);

      expect(detections).toHaveLength(1);
      expect(detections[0].classId).toBe(0);
      expect(detections[0].confidence).toBeCloseTo(0.8, 5);
      expect(detections[0].cx).toBe(320);
      expect(detections[0].cy).toBe(240);
      expect(detections[0].width).toBe(100);
      expect(detections[0].height).toBe(150);
    });

    it('should filter detections below threshold', () => {
      const outputData = new Float32Array(84 * 8400);
      outputData[0] = 320;
      outputData[8400] = 240;
      outputData[2 * 8400] = 100;
      outputData[3 * 8400] = 150;
      outputData[4 * 8400] = 0.1;

      const detections = parseYoloOutput(outputData, [1, 84, 8400], 0.25);

      expect(detections).toHaveLength(0);
    });

    it('should handle both 3D [1, 84, 8400] and 4D [1, 1, 84, 8400] output shapes', () => {
      const outputData = new Float32Array(84 * 8400);

      expect(() => {
        parseYoloOutput(outputData, [1, 84, 8400], 0.25);
      }).not.toThrow();

      expect(() => {
        parseYoloOutput(outputData, [1, 1, 84, 8400], 0.25);
      }).not.toThrow();
    });

    it('should throw on unexpected output shape', () => {
      const outputData = new Float32Array(100);

      expect(() => {
        parseYoloOutput(outputData, [1, 2, 3, 4, 5], 0.25);
      }).toThrow('Unexpected output shape');
    });

    it('should throw on incorrect number of features', () => {
      const outputData = new Float32Array(100 * 8400);

      expect(() => {
        parseYoloOutput(outputData, [1, 100, 8400], 0.25);
      }).toThrow('Expected 84 features');
    });

    it('should select class with highest score', () => {
      const outputData = new Float32Array(84 * 8400);
      outputData[0] = 320;
      outputData[8400] = 240;
      outputData[2 * 8400] = 100;
      outputData[3 * 8400] = 150;
      outputData[4 * 8400] = 0.3;
      outputData[5 * 8400] = 0.7;
      outputData[6 * 8400] = 0.5;

      const detections = parseYoloOutput(outputData, [1, 84, 8400], 0.5);

      expect(detections[0].classId).toBe(1);
      expect(detections[0].confidence).toBeCloseTo(0.7, 5);
    });

    it('should skip invalid boxes (negative dimensions or out-of-bounds)', () => {
      const outputData = new Float32Array(84 * 8400);
      
      // Test negative width
      outputData[0] = 320;
      outputData[8400] = 240;
      outputData[2 * 8400] = -10;
      outputData[3 * 8400] = 150;
      outputData[4 * 8400] = 0.9;

      let detections = parseYoloOutput(outputData, [1, 84, 8400], 0.5);
      expect(detections).toHaveLength(0);

      // Test out-of-bounds coordinates
      outputData[0] = 700;
      outputData[2 * 8400] = 100;
      outputData[3 * 8400] = 150;

      detections = parseYoloOutput(outputData, [1, 84, 8400], 0.5);
      expect(detections).toHaveLength(0);
    });

    it('should parse multiple detections', () => {
      const outputData = new Float32Array(84 * 8400);

      outputData[0] = 100;
      outputData[8400] = 100;
      outputData[2 * 8400] = 50;
      outputData[3 * 8400] = 50;
      outputData[4 * 8400] = 0.8;

      outputData[1] = 200;
      outputData[8400 + 1] = 200;
      outputData[2 * 8400 + 1] = 60;
      outputData[3 * 8400 + 1] = 70;
      outputData[5 * 8400 + 1] = 0.9;

      const detections = parseYoloOutput(outputData, [1, 84, 8400], 0.5);

      expect(detections).toHaveLength(2);
      expect(detections[0].classId).toBe(0);
      expect(detections[1].classId).toBe(1);
    });
  });

  describe('runInference', () => {
    let mockModelSession: ModelSession;
    let mockOutputTensor: { data: Float32Array; dims: number[] };

    beforeEach(() => {
      mockOutputTensor = {
        data: new Float32Array(84 * 8400),
        dims: [1, 84, 8400],
      };

      const mockSession = {
        run: vi.fn().mockResolvedValue({
          output0: mockOutputTensor,
        }),
      } as unknown as ort.InferenceSession;

      mockModelSession = {
        session: mockSession,
        metadata: {
          id: 'yolo11n',
          name: 'YOLOv11 Nano',
          file: '/models/yolo11n.onnx',
          description: 'Test model',
          size_mb: 10.2,
          input_shape: [1, 3, 640, 640],
          output_shape: [1, 1, 84, 8400],
          parameters: '2.6M',
          recommended_use: 'Real-time detection',
        },
        executionProvider: 'wasm',
        inputName: 'images',
        outputName: 'output0',
        inputShape: [1, 3, 640, 640],
        outputShape: [1, 84, 8400],
      };
    });

    it('should run inference successfully', async () => {
      const tensorData = new Float32Array(3 * 640 * 640);

      const result = await runInference(mockModelSession, tensorData);

      expect(result).toHaveProperty('detections');
      expect(result).toHaveProperty('inferenceTimeMs');
      expect(result).toHaveProperty('numCandidates', 8400);
      expect(result).toHaveProperty('numFiltered');
      expect(result.inferenceTimeMs).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.detections)).toBe(true);
    });

    it('should respect confidence threshold config', async () => {
      const tensorData = new Float32Array(3 * 640 * 640);

      mockOutputTensor.data[0] = 320;
      mockOutputTensor.data[8400] = 240;
      mockOutputTensor.data[2 * 8400] = 100;
      mockOutputTensor.data[3 * 8400] = 150;
      mockOutputTensor.data[4 * 8400] = 0.5;

      const result = await runInference(mockModelSession, tensorData, {
        confidenceThreshold: 0.9,
      });

      expect(result.detections).toHaveLength(0);
    });

    it('should apply maxDetections limit', async () => {
      const tensorData = new Float32Array(3 * 640 * 640);

      for (let i = 0; i < 10; i++) {
        mockOutputTensor.data[i] = 100 + i * 10;
        mockOutputTensor.data[8400 + i] = 100;
        mockOutputTensor.data[2 * 8400 + i] = 50;
        mockOutputTensor.data[3 * 8400 + i] = 50;
        mockOutputTensor.data[4 * 8400 + i] = 0.9;
      }

      const result = await runInference(mockModelSession, tensorData, {
        maxDetections: 5,
      });

      expect(result.detections.length).toBeLessThanOrEqual(5);
    });

    it('should throw on invalid tensor size', async () => {
      const invalidTensor = new Float32Array(100);

      await expect(
        runInference(mockModelSession, invalidTensor)
      ).rejects.toThrow('Invalid input tensor');
    });

    it('should throw when output tensor not found', async () => {
      const tensorData = new Float32Array(3 * 640 * 640);

      mockModelSession.session.run = vi.fn().mockResolvedValue({});

      await expect(
        runInference(mockModelSession, tensorData)
      ).rejects.toThrow('Output tensor');
    });
  });
});
