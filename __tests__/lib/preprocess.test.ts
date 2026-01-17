import { describe, it, expect } from 'vitest';
import {
  validatePreprocessOutput,
  PreprocessResult,
} from '@/app/lib/preprocess';

describe('Image Preprocessing', () => {

  describe('validatePreprocessOutput', () => {
    it('should validate correct tensor shape', () => {
      const result: PreprocessResult = {
        tensor: new Float32Array(3 * 640 * 640).fill(0.5),
        scale: 0.5,
        padX: 0,
        padY: 140,
        originalWidth: 1280,
        originalHeight: 720,
      };

      expect(validatePreprocessOutput(result)).toBe(true);
    });

    it('should reject incorrect tensor size', () => {
      const result: PreprocessResult = {
        tensor: new Float32Array(100),
        scale: 0.5,
        padX: 0,
        padY: 140,
        originalWidth: 1280,
        originalHeight: 720,
      };

      expect(validatePreprocessOutput(result)).toBe(false);
    });

    it('should reject values outside [0, 1] range', () => {
      const tensor = new Float32Array(3 * 640 * 640);
      tensor[0] = -0.1;

      const result: PreprocessResult = {
        tensor,
        scale: 0.5,
        padX: 0,
        padY: 140,
        originalWidth: 1280,
        originalHeight: 720,
      };

      expect(validatePreprocessOutput(result)).toBe(false);
    });

    it('should validate custom tensor shapes', () => {
      const result: PreprocessResult = {
        tensor: new Float32Array(3 * 320 * 320).fill(0.5),
        scale: 0.5,
        padX: 0,
        padY: 140,
        originalWidth: 1280,
        originalHeight: 720,
      };

      expect(validatePreprocessOutput(result, [3, 320, 320])).toBe(true);
    });
  });

});
