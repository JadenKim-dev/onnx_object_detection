import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectBrowserCapabilities } from '@/app/lib/utils/browser-detection';

describe('browser-detection', () => {
  describe('detectBrowserCapabilities', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should detect WebGPU when adapter is available', async () => {
      const mockAdapter = { features: new Set() };
      const mockGpu = {
        requestAdapter: vi.fn().mockResolvedValue(mockAdapter),
      };
      vi.stubGlobal('navigator', { ...global.navigator, gpu: mockGpu });

      const capabilities = await detectBrowserCapabilities();

      expect(capabilities.webgpu).toBe(true);
      expect(capabilities.wasm).toBe(true);
      expect(mockGpu.requestAdapter).toHaveBeenCalled();
    });

    it('should detect no WebGPU when navigator.gpu is undefined', async () => {
      vi.stubGlobal('navigator', { ...global.navigator, gpu: undefined });

      const capabilities = await detectBrowserCapabilities();

      expect(capabilities.webgpu).toBe(false);
    });

    it('should detect no WebGPU when requestAdapter returns null', async () => {
      const mockGpu = {
        requestAdapter: vi.fn().mockResolvedValue(null),
      };
      vi.stubGlobal('navigator', { ...global.navigator, gpu: mockGpu });

      const capabilities = await detectBrowserCapabilities();

      expect(capabilities.webgpu).toBe(false);
    });

    it('should detect no WebGPU when requestAdapter throws', async () => {
      const mockGpu = {
        requestAdapter: vi.fn().mockRejectedValue(new Error('GPU unavailable')),
      };
      vi.stubGlobal('navigator', { ...global.navigator, gpu: mockGpu });

      const capabilities = await detectBrowserCapabilities();

      expect(capabilities.webgpu).toBe(false);
    });

    it('should detect SharedArrayBuffer and cross-origin isolation for threading', async () => {
      const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
      vi.stubGlobal('crossOriginIsolated', true);

      const capabilities = await detectBrowserCapabilities();

      expect(capabilities.threads).toBe(hasSharedArrayBuffer && true);
    });

    it('should not detect threads when cross-origin isolated is false', async () => {
      vi.stubGlobal('crossOriginIsolated', false);

      const capabilities = await detectBrowserCapabilities();

      expect(capabilities.threads).toBe(false);
    });

    it('should handle WASM SIMD validation failure gracefully', async () => {
      const originalValidate = WebAssembly.validate;
      WebAssembly.validate = vi.fn().mockImplementation(() => {
        throw new Error('SIMD not supported');
      });

      const capabilities = await detectBrowserCapabilities();

      expect(capabilities.simd).toBe(false);

      WebAssembly.validate = originalValidate;
    });

    it('should detect WASM SIMD when available', async () => {
      const originalValidate = WebAssembly.validate;
      WebAssembly.validate = vi.fn().mockResolvedValue(true);

      const capabilities = await detectBrowserCapabilities();

      expect(capabilities.simd).toBe(true);

      WebAssembly.validate = originalValidate;
    });
  });
});
