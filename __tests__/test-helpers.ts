import { vi } from 'vitest';

export function createMockMediaStream(): MediaStream {
  const mockTrack = {
    kind: 'video',
    id: 'mock-video-track',
    label: 'Mock Camera',
    enabled: true,
    muted: false,
    readyState: 'live',
    stop: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaStreamTrack;

  const mockStream = {
    id: 'mock-stream',
    active: true,
    getTracks: vi.fn(() => [mockTrack]),
    getVideoTracks: vi.fn(() => [mockTrack]),
    getAudioTracks: vi.fn(() => []),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaStream;

  return mockStream;
}

export function createMockVideoElement(): HTMLVideoElement {
  const video = document.createElement('video');

  Object.defineProperties(video, {
    videoWidth: { value: 1280, writable: true },
    videoHeight: { value: 720, writable: true },
    offsetWidth: { value: 1280, writable: true },
    offsetHeight: { value: 720, writable: true },
    srcObject: { value: null, writable: true },
    play: { value: vi.fn().mockResolvedValue(undefined) },
  });

  return video;
}

export function createMockDOMException(
  name: string,
  message: string
): DOMException {
  return new DOMException(message, name);
}

export function mockGetUserMediaSuccess(stream?: MediaStream) {
  const mockStream = stream || createMockMediaStream();
  return vi.fn().mockResolvedValue(mockStream);
}

export function mockGetUserMediaError(errorName: string, message: string) {
  const error = createMockDOMException(errorName, message);
  return vi.fn().mockRejectedValue(error);
}
