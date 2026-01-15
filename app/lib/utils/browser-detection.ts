import type { BrowserCapabilities } from '../types/model';

async function checkWasmSIMD(): Promise<boolean> {
  const simdTest = new Uint8Array([
    0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0,
    10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
  ]);
  try {
    return WebAssembly.validate(simdTest);
  } catch {
    return false;
  }
}

async function checkWebGPU(): Promise<boolean> {
  if (
    typeof navigator === 'undefined' ||
    !('gpu' in navigator) ||
    !navigator.gpu
  ) {
    return false;
  }

  try { 
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

export async function detectBrowserCapabilities(): Promise<BrowserCapabilities> {
  const webgpu = await checkWebGPU();
  const simd = await checkWasmSIMD();
  const threads =
    typeof SharedArrayBuffer !== 'undefined' &&
    (typeof crossOriginIsolated !== 'undefined' ? crossOriginIsolated : false);
  const wasm = typeof WebAssembly !== 'undefined';

  return { webgpu, wasm, simd, threads };
}
