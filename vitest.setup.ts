import '@testing-library/jest-dom';
import { vi } from 'vitest';
import 'vitest-canvas-mock';

// Mock HTMLMediaElement methods for video playback
window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
window.HTMLMediaElement.prototype.pause = vi.fn();
window.HTMLMediaElement.prototype.load = vi.fn();

// Mock ResizeObserver for components that observe element size changes
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};
