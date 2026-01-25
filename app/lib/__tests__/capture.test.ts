import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  captureCanvasScreenshot,
  captureCompositeScreenshot,
  createRecorder,
} from '@/app/lib/capture';

function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canvas.toBlob = vi.fn((callback, type, _quality) => {
    const blob = new Blob(['mock'], { type: type || 'image/png' });
    callback(blob);
  });

  canvas.getContext = vi.fn(() => ({
    drawImage: vi.fn(),
  })) as unknown as typeof canvas.getContext;

  canvas.captureStream = vi.fn(() => ({
    getTracks: vi.fn(() => [{ kind: 'video' }]),
  })) as unknown as typeof canvas.captureStream;

  return canvas;
}

function createMockVideo(): HTMLVideoElement {
  const video = document.createElement('video');
  Object.defineProperties(video, {
    videoWidth: { value: 1280, writable: true },
    videoHeight: { value: 720, writable: true },
  });
  return video;
}

class MockMediaRecorder {
  state: RecordingState = 'inactive';
  ondataavailable: ((e: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(
    public stream: MediaStream,
    public options?: MediaRecorderOptions,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  start(_timeslice?: number) {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    if (this.ondataavailable) {
      this.ondataavailable({
        data: new Blob(['mock-video'], { type: 'video/webm' }),
      } as BlobEvent);
    }
    if (this.onstop) {
      setTimeout(() => this.onstop!(), 0);
    }
  }

  pause() {
    this.state = 'paused';
  }

  resume() {
    this.state = 'recording';
  }

  static isTypeSupported(mimeType: string) {
    return mimeType.includes('webm');
  }
}

describe('capture', () => {
  let mockClickedElements: HTMLElement[] = [];
  const realCreateElement = document.createElement.bind(document);
  const MOCK_OBJECT_URL = 'mock-url';

  beforeEach(() => {
    mockClickedElements = [];

    // Mock <a> element click() to track download triggers without actual file downloads
    vi.spyOn(document, 'createElement').mockImplementation(
      (tagName: string) => {
        const element = realCreateElement(tagName);

        if (tagName === 'a') {
          element.click = vi.fn(() => {
            mockClickedElements.push(element);
          });
        }

        return element;
      },
    );

    vi.spyOn(URL, 'createObjectURL').mockReturnValue(MOCK_OBJECT_URL);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockOffscreenCanvas() {
    const offscreenCanvas = createMockCanvas();
    const mockDrawImage = vi.fn();
    const mockGetContext = vi.fn(() => ({
      drawImage: mockDrawImage,
    })) as unknown as typeof offscreenCanvas.getContext;
    offscreenCanvas.getContext = mockGetContext;

    // Mock only canvas creation while preserving real behavior for other elements
    vi.spyOn(document, 'createElement').mockImplementation(
      (tagName: string) => {
        if (tagName === 'canvas') return offscreenCanvas;
        return realCreateElement(tagName);
      },
    );

    return { mockGetContext, mockDrawImage };
  }

  function createMockMediaRecorderCtor(
    constructorSpy: (
      stream: MediaStream,
      options?: MediaRecorderOptions,
    ) => void,
    staticOverrides?: { isTypeSupported?: (mimeType: string) => boolean },
  ) {
    const MockCtor = class extends MockMediaRecorder {
      constructor(stream: MediaStream, options?: MediaRecorderOptions) {
        super(stream, options);
        constructorSpy(stream, options);
      }
    };

    if (staticOverrides?.isTypeSupported) {
      MockCtor.isTypeSupported = staticOverrides.isTypeSupported;
    }

    return MockCtor as unknown as typeof MediaRecorder;
  }

  describe('captureCanvasScreenshot', () => {
    it('should capture screenshot with default options', async () => {
      const canvas = createMockCanvas();

      await captureCanvasScreenshot(canvas);

      expect(canvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/png',
        1.0,
      );
    });

    it('should use custom filename', async () => {
      const canvas = createMockCanvas();

      await captureCanvasScreenshot(canvas, { filename: 'custom.png' });

      expect(mockClickedElements.length).toBe(1);
      const anchor = mockClickedElements[0] as HTMLAnchorElement;
      expect(anchor.download).toBe('custom.png');
    });

    it('should use custom format', async () => {
      const canvas = createMockCanvas();

      await captureCanvasScreenshot(canvas, { format: 'image/jpeg' });

      expect(canvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/jpeg',
        1.0,
      );
    });

    it('should use custom quality', async () => {
      const canvas = createMockCanvas();

      await captureCanvasScreenshot(canvas, {
        format: 'image/jpeg',
        quality: 0.8,
      });

      expect(canvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/jpeg',
        0.8,
      );
    });

    it('should trigger download via anchor element', async () => {
      const canvas = createMockCanvas();

      await captureCanvasScreenshot(canvas);

      expect(mockClickedElements.length).toBe(1);
      const anchor = mockClickedElements[0] as HTMLAnchorElement;
      expect(anchor.href).toContain(MOCK_OBJECT_URL);
      expect(anchor.download).toMatch(/detection-\d+\.png/);
    });

    it('should revoke object URL after download', async () => {
      const canvas = createMockCanvas();

      await captureCanvasScreenshot(canvas);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith(MOCK_OBJECT_URL);
    });

    it('should reject on toBlob failure', async () => {
      const canvas = createMockCanvas();
      canvas.toBlob = vi.fn((callback) => {
        callback(null);
      });

      await expect(captureCanvasScreenshot(canvas)).rejects.toThrow(
        'Failed to create screenshot',
      );
    });
  });

  describe('captureCompositeScreenshot', () => {
    it('should create offscreen canvas with video dimensions', async () => {
      const video = createMockVideo();
      const overlayCanvas = createMockCanvas();

      await captureCompositeScreenshot(video, overlayCanvas);

      const createElementCalls = (
        document.createElement as ReturnType<typeof vi.fn>
      ).mock.calls;
      const canvasCall = createElementCalls.find(
        (call: string[]) => call[0] === 'canvas',
      );
      expect(canvasCall).toBeDefined();
    });

    it('should draw video and overlay on offscreen canvas', async () => {
      const video = createMockVideo();
      const overlayCanvas = createMockCanvas();
      const { mockDrawImage } = mockOffscreenCanvas();

      await captureCompositeScreenshot(video, overlayCanvas);

      expect(mockDrawImage).toHaveBeenCalledTimes(2);
      expect(mockDrawImage).toHaveBeenCalledWith(video, 0, 0);
      expect(mockDrawImage).toHaveBeenCalledWith(overlayCanvas, 0, 0);
    });

    it('should trigger screenshot with composite canvas', async () => {
      const video = createMockVideo();
      const overlayCanvas = createMockCanvas();

      await captureCompositeScreenshot(video, overlayCanvas);

      expect(mockClickedElements.length).toBe(1);
    });
  });

  describe('createRecorder', () => {
    it('should create MediaRecorder with canvas stream', () => {
      const canvas = createMockCanvas();
      const constructorSpy = vi.fn();
      const MockCtor = createMockMediaRecorderCtor(constructorSpy);

      const recorder = createRecorder(canvas, {
        MediaRecorderCtor: MockCtor,
      });

      expect(recorder).toBeDefined();
      expect(constructorSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should use default mimeType and bitrate', () => {
      const canvas = createMockCanvas();
      const constructorSpy = vi.fn();
      const MockCtor = createMockMediaRecorderCtor(constructorSpy);

      createRecorder(canvas, {
        MediaRecorderCtor: MockCtor,
      });

      expect(constructorSpy).toHaveBeenCalledWith(expect.any(Object), {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000,
      });
    });

    it('should use custom mimeType', () => {
      const canvas = createMockCanvas();
      const constructorSpy = vi.fn();
      const MockCtor = createMockMediaRecorderCtor(constructorSpy);

      createRecorder(canvas, {
        mimeType: 'video/webm;codecs=vp8',
        MediaRecorderCtor: MockCtor,
      });

      expect(constructorSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          mimeType: 'video/webm;codecs=vp8',
        }),
      );
    });

    it('should use custom bitrate', () => {
      const canvas = createMockCanvas();
      const constructorSpy = vi.fn();
      const MockCtor = createMockMediaRecorderCtor(constructorSpy);

      createRecorder(canvas, {
        videoBitsPerSecond: 5000000,
        MediaRecorderCtor: MockCtor,
      });

      expect(constructorSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          videoBitsPerSecond: 5000000,
        }),
      );
    });

    it('should use default fps (30)', () => {
      const canvas = createMockCanvas();
      const constructorSpy = vi.fn();
      const MockCtor = createMockMediaRecorderCtor(constructorSpy);

      createRecorder(canvas, {
        MediaRecorderCtor: MockCtor,
      });

      expect(canvas.captureStream).toHaveBeenCalledWith(30);
    });

    it('should use custom fps', () => {
      const canvas = createMockCanvas();
      const constructorSpy = vi.fn();
      const MockCtor = createMockMediaRecorderCtor(constructorSpy);

      createRecorder(canvas, {
        fps: 60,
        MediaRecorderCtor: MockCtor,
      });

      expect(canvas.captureStream).toHaveBeenCalledWith(60);
    });

    it('should start recording', () => {
      const canvas = createMockCanvas();

      const recorder = createRecorder(canvas, {
        MediaRecorderCtor: MockMediaRecorder as unknown as typeof MediaRecorder,
      });

      recorder.start();

      expect(recorder.isRecording).toBe(true);
    });

    it('should stop recording and return blob', async () => {
      const canvas = createMockCanvas();

      const recorder = createRecorder(canvas, {
        MediaRecorderCtor: MockMediaRecorder as unknown as typeof MediaRecorder,
      });

      recorder.start();
      const stopResult = await recorder.stop();

      expect(stopResult).toBeInstanceOf(Blob);
      expect(recorder.isRecording).toBe(false);
    });

    it('should pause recording', () => {
      const canvas = createMockCanvas();

      const recorder = createRecorder(canvas, {
        MediaRecorderCtor: MockMediaRecorder as unknown as typeof MediaRecorder,
      });

      recorder.start();
      recorder.pause();

      expect(recorder.isPaused).toBe(true);
    });

    it('should resume recording', () => {
      const canvas = createMockCanvas();

      const recorder = createRecorder(canvas, {
        MediaRecorderCtor: MockMediaRecorder as unknown as typeof MediaRecorder,
      });

      recorder.start();
      recorder.pause();
      recorder.resume();

      expect(recorder.isRecording).toBe(true);
      expect(recorder.isPaused).toBe(false);
    });

    it('should trigger download on stop', async () => {
      const canvas = createMockCanvas();

      const recorder = createRecorder(canvas, {
        MediaRecorderCtor: MockMediaRecorder as unknown as typeof MediaRecorder,
      });

      recorder.start();
      await recorder.stop();

      expect(mockClickedElements.length).toBe(1);
      const anchor = mockClickedElements[0] as HTMLAnchorElement;
      expect(anchor.download).toMatch(/detection-\d+\.webm/);
    });

    it('should fallback to video/webm if mimeType not supported', () => {
      const canvas = createMockCanvas();
      const constructorSpy = vi.fn();
      const MockCtor = createMockMediaRecorderCtor(constructorSpy, {
        isTypeSupported: vi.fn(() => false),
      });

      createRecorder(canvas, {
        mimeType: 'video/mp4',
        MediaRecorderCtor: MockCtor,
      });

      expect(constructorSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          mimeType: 'video/webm',
        }),
      );
    });

    it('should clear chunks on each start', async () => {
      const canvas = createMockCanvas();

      const recorder = createRecorder(canvas, {
        MediaRecorderCtor: MockMediaRecorder as unknown as typeof MediaRecorder,
      });

      recorder.start();
      const firstBlob = await recorder.stop();

      recorder.start();
      const secondBlob = await recorder.stop();

      expect(mockClickedElements.length).toBe(2);

      expect(firstBlob.size).toBe(10);
      expect(secondBlob.size).toBe(10); // Should be same size, not doubled
    });
  });
});
