import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isGetUserMediaSupported,
  parseMediaError,
} from '@/app/lib/video-utils';
import { createMockDOMException } from '../test-helpers';

describe('video-utils', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('isGetUserMediaSupported', () => {
    it('should return true when getUserMedia is supported', () => {
      vi.stubGlobal('navigator', {
        ...global.navigator,
        mediaDevices: {
          ...global.navigator.mediaDevices,
          getUserMedia: vi.fn(),
        },
      });

      expect(isGetUserMediaSupported()).toBe(true);
    });

    it('should return false when navigator.mediaDevices is not available', () => {
      const original = global.navigator.mediaDevices;
      
      vi.stubGlobal('navigator', {
        ...global.navigator,
        mediaDevices: undefined,
      });

      expect(isGetUserMediaSupported()).toBe(false);

      vi.stubGlobal('navigator', {
        ...global.navigator,
        mediaDevices: original,
      });
    });
  });

  describe('parseMediaError', () => {
    it('should parse NotAllowedError correctly', () => {
      const error = createMockDOMException(
        'NotAllowedError',
        'Permission denied'
      );

      const result = parseMediaError(error);

      expect(result.type).toBe('permission_denied');
      expect(result.message).toBe('Camera permission denied. Please allow access.');
      expect(result.originalError).toBe(error);
    });

    it('should parse NotFoundError correctly', () => {
      const error = createMockDOMException(
        'NotFoundError',
        'No camera found'
      );

      const result = parseMediaError(error);

      expect(result.type).toBe('no_camera_found');
      expect(result.message).toBe('No camera found on this device.');
      expect(result.originalError).toBe(error);
    });

    it('should parse NotReadableError correctly', () => {
      const error = createMockDOMException(
        'NotReadableError',
        'Camera in use'
      );

      const result = parseMediaError(error);

      expect(result.type).toBe('camera_in_use');
      expect(result.message).toBe(
        'Camera is already in use by another application.'
      );
      expect(result.originalError).toBe(error);
    });

    it('should parse unknown DOMException correctly', () => {
      const error = createMockDOMException(
        'UnknownError',
        'Something went wrong'
      );

      const result = parseMediaError(error);

      expect(result.type).toBe('unknown_error');
      expect(result.message).toBe('Something went wrong');
      expect(result.originalError).toBe(error);
    });

    it('should parse generic Error correctly', () => {
      const error = new Error('Generic error');

      const result = parseMediaError(error);

      expect(result.type).toBe('unknown_error');
      expect(result.message).toBe('Failed to access camera');
      expect(result.originalError).toBe(error);
    });

    it('should parse non-Error objects correctly', () => {
      const error = 'string error';

      const result = parseMediaError(error);

      expect(result.type).toBe('unknown_error');
      expect(result.message).toBe('Failed to access camera');
      expect(result.originalError).toBeUndefined();
    });
  });
});
