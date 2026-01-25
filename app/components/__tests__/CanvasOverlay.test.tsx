import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useRef, useEffect } from 'react';
import { CanvasOverlay, CanvasOverlayRef } from '@/app/components/CanvasOverlay';
import type { FinalDetection } from '@/app/lib/postprocess';
import * as visualize from '@/app/lib/visualize';
import * as capture from '@/app/lib/capture';

vi.mock('@/app/lib/visualize', () => ({
  drawDetections: vi.fn(),
  drawFPS: vi.fn(),
}));

vi.mock('@/app/lib/capture', () => ({
  captureCompositeScreenshot: vi.fn().mockResolvedValue(undefined),
  createRecorder: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn().mockResolvedValue(new Blob()),
    pause: vi.fn(),
    resume: vi.fn(),
    isRecording: false,
    isPaused: false,
  })),
}));

function createMockVideo(): HTMLVideoElement {
  const video = document.createElement('video');
  Object.defineProperties(video, {
    videoWidth: { value: 1280, writable: true },
    videoHeight: { value: 720, writable: true },
    offsetWidth: { value: 640, writable: true },
    offsetHeight: { value: 360, writable: true },
  });
  return video;
}

function createMockDetection(): FinalDetection {
  return {
    classId: 0,
    className: 'person',
    confidence: 0.9,
    x1: 100,
    y1: 100,
    x2: 200,
    y2: 200,
    width: 100,
    height: 100,
  };
}

function TestComponent({
  videoRef,
  onRefReady,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onRefReady: (ref: CanvasOverlayRef) => void;
}) {
  const canvasRef = useRef<CanvasOverlayRef>(null);

  useEffect(() => {
    if (canvasRef.current) {
      onRefReady(canvasRef.current);
    }
  }, [onRefReady]);

  return <CanvasOverlay ref={canvasRef} videoRef={videoRef} />;
}

describe('CanvasOverlay', () => {
  let mockVideo: HTMLVideoElement;
  let mockVideoRef: React.RefObject<HTMLVideoElement>;
  let mockResizeObserver: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockVideo = createMockVideo();
    mockVideoRef = { current: mockVideo };

    // Mock ResizeObserver as a constructor
    mockResizeObserver = vi.fn(function(this: ResizeObserver) {
      this.observe = vi.fn();
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
      return this;
    });
    global.ResizeObserver = mockResizeObserver as unknown as typeof ResizeObserver;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ref API', () => {
    it('should expose draw method via ref', async () => {
      let canvasRefInstance: CanvasOverlayRef | null = null;

      render(
        <TestComponent
          videoRef={mockVideoRef}
          onRefReady={(ref) => {
            canvasRefInstance = ref;
          }}
        />
      );

      await waitFor(() => {
        expect(canvasRefInstance).not.toBeNull();
      });

      expect(canvasRefInstance!.draw).toBeDefined();
      expect(typeof canvasRefInstance!.draw).toBe('function');
    });

    it('should expose clear method via ref', async () => {
      let canvasRefInstance: CanvasOverlayRef | null = null;

      render(
        <TestComponent
          videoRef={mockVideoRef}
          onRefReady={(ref) => {
            canvasRefInstance = ref;
          }}
        />
      );

      await waitFor(() => {
        expect(canvasRefInstance).not.toBeNull();
      });

      expect(canvasRefInstance!.clear).toBeDefined();
      expect(typeof canvasRefInstance!.clear).toBe('function');
    });

    it('should expose screenshot method via ref', async () => {
      let canvasRefInstance: CanvasOverlayRef | null = null;

      render(
        <TestComponent
          videoRef={mockVideoRef}
          onRefReady={(ref) => {
            canvasRefInstance = ref;
          }}
        />
      );

      await waitFor(() => {
        expect(canvasRefInstance).not.toBeNull();
      });

      expect(canvasRefInstance!.screenshot).toBeDefined();
      expect(typeof canvasRefInstance!.screenshot).toBe('function');
    });

    it('should expose startRecording method via ref', async () => {
      let canvasRefInstance: CanvasOverlayRef | null = null;

      render(
        <TestComponent
          videoRef={mockVideoRef}
          onRefReady={(ref) => {
            canvasRefInstance = ref;
          }}
        />
      );

      await waitFor(() => {
        expect(canvasRefInstance).not.toBeNull();
      });

      expect(canvasRefInstance!.startRecording).toBeDefined();
      expect(typeof canvasRefInstance!.startRecording).toBe('function');
    });

    it('should expose getContext method via ref', async () => {
      let canvasRefInstance: CanvasOverlayRef | null = null;

      render(
        <TestComponent
          videoRef={mockVideoRef}
          onRefReady={(ref) => {
            canvasRefInstance = ref;
          }}
        />
      );

      await waitFor(() => {
        expect(canvasRefInstance).not.toBeNull();
      });

      expect(canvasRefInstance!.getContext).toBeDefined();
      expect(typeof canvasRefInstance!.getContext).toBe('function');
    });

    it('should expose getCanvas method via ref', async () => {
      let canvasRefInstance: CanvasOverlayRef | null = null;

      render(
        <TestComponent
          videoRef={mockVideoRef}
          onRefReady={(ref) => {
            canvasRefInstance = ref;
          }}
        />
      );

      await waitFor(() => {
        expect(canvasRefInstance).not.toBeNull();
      });

      expect(canvasRefInstance!.getCanvas).toBeDefined();
      expect(typeof canvasRefInstance!.getCanvas).toBe('function');
    });
  });

  describe('draw method', () => {
    it('should call drawDetections with detections', async () => {
      let canvasRefInstance: CanvasOverlayRef | null = null;

      render(
        <TestComponent
          videoRef={mockVideoRef}
          onRefReady={(ref) => {
            canvasRefInstance = ref;
          }}
        />
      );

      await waitFor(() => {
        expect(canvasRefInstance).not.toBeNull();
      });

      const detections = [createMockDetection()];
      canvasRefInstance!.draw(detections);

      expect(visualize.drawDetections).toHaveBeenCalledWith(
        expect.any(Object),
        detections,
        undefined
      );
    });

    it('should call drawFPS when fps is provided', async () => {
      let canvasRefInstance: CanvasOverlayRef | null = null;

      render(
        <TestComponent
          videoRef={mockVideoRef}
          onRefReady={(ref) => {
            canvasRefInstance = ref;
          }}
        />
      );

      await waitFor(() => {
        expect(canvasRefInstance).not.toBeNull();
      });

      const detections = [createMockDetection()];
      canvasRefInstance!.draw(detections, 30);

      expect(visualize.drawFPS).toHaveBeenCalledWith(expect.any(Object), 30);
    });

    it('should not call drawFPS when fps is not provided', async () => {
      let canvasRefInstance: CanvasOverlayRef | null = null;

      render(
        <TestComponent
          videoRef={mockVideoRef}
          onRefReady={(ref) => {
            canvasRefInstance = ref;
          }}
        />
      );

      await waitFor(() => {
        expect(canvasRefInstance).not.toBeNull();
      });

      const detections = [createMockDetection()];
      canvasRefInstance!.draw(detections);

      expect(visualize.drawFPS).not.toHaveBeenCalled();
    });

    it('should pass drawConfig to drawDetections', async () => {
      let canvasRefInstance: CanvasOverlayRef | null = null;
      const drawConfig = { boxLineWidth: 5, fontSize: 20 };

      const TestComponentWithConfig = () => {
        const canvasRef = useRef<CanvasOverlayRef>(null);

        useEffect(() => {
          if (canvasRef.current) {
            canvasRefInstance = canvasRef.current;
          }
        }, []);

        return (
          <CanvasOverlay
            ref={canvasRef}
            videoRef={mockVideoRef}
            drawConfig={drawConfig}
          />
        );
      };

      render(<TestComponentWithConfig />);

      await waitFor(() => {
        expect(canvasRefInstance).not.toBeNull();
      });

      const detections = [createMockDetection()];
      canvasRefInstance!.draw(detections);

      expect(visualize.drawDetections).toHaveBeenCalledWith(
        expect.any(Object),
        detections,
        drawConfig
      );
    });
  });

  describe('clear method', () => {
    it('should clear canvas', async () => {
      let canvasRefInstance: CanvasOverlayRef | null = null;

      render(
        <TestComponent
          videoRef={mockVideoRef}
          onRefReady={(ref) => {
            canvasRefInstance = ref;
          }}
        />
      );

      await waitFor(() => {
        expect(canvasRefInstance).not.toBeNull();
      });

      const canvas = canvasRefInstance!.getCanvas();
      expect(canvas).not.toBeNull();

      const ctx = canvas!.getContext('2d');
      const clearRectSpy = vi.spyOn(ctx!, 'clearRect');

      canvasRefInstance!.clear();

      expect(clearRectSpy).toHaveBeenCalledWith(
        0,
        0,
        canvas!.width,
        canvas!.height
      );
    });
  });

  describe('screenshot method', () => {
    it('should call captureCompositeScreenshot', async () => {
      let canvasRefInstance: CanvasOverlayRef | null = null;

      render(
        <TestComponent
          videoRef={mockVideoRef}
          onRefReady={(ref) => {
            canvasRefInstance = ref;
          }}
        />
      );

      await waitFor(() => {
        expect(canvasRefInstance).not.toBeNull();
      });

      await canvasRefInstance!.screenshot();

      expect(capture.captureCompositeScreenshot).toHaveBeenCalledWith(
        mockVideo,
        expect.any(HTMLCanvasElement),
        undefined
      );
    });

    it('should pass options to captureCompositeScreenshot', async () => {
      let canvasRefInstance: CanvasOverlayRef | null = null;

      render(
        <TestComponent
          videoRef={mockVideoRef}
          onRefReady={(ref) => {
            canvasRefInstance = ref;
          }}
        />
      );

      await waitFor(() => {
        expect(canvasRefInstance).not.toBeNull();
      });

      const options = { filename: 'test.png', format: 'image/png' as const };
      await canvasRefInstance!.screenshot(options);

      expect(capture.captureCompositeScreenshot).toHaveBeenCalledWith(
        mockVideo,
        expect.any(HTMLCanvasElement),
        options
      );
    });

    it('should throw error when canvas not available', async () => {
      let canvasRefInstance: CanvasOverlayRef | null = null;
      const emptyVideoRef = { current: null };

      render(
        <TestComponent
          videoRef={emptyVideoRef}
          onRefReady={(ref) => {
            canvasRefInstance = ref;
          }}
        />
      );

      await waitFor(() => {
        expect(canvasRefInstance).not.toBeNull();
      });

      await expect(canvasRefInstance!.screenshot()).rejects.toThrow(
        'Canvas or video not available'
      );
    });
  });

  describe('startRecording method', () => {
    it('should call createRecorder', async () => {
      let canvasRefInstance: CanvasOverlayRef | null = null;

      render(
        <TestComponent
          videoRef={mockVideoRef}
          onRefReady={(ref) => {
            canvasRefInstance = ref;
          }}
        />
      );

      await waitFor(() => {
        expect(canvasRefInstance).not.toBeNull();
      });

      canvasRefInstance!.startRecording();

      expect(capture.createRecorder).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        undefined
      );
    });

    it('should pass options to createRecorder', async () => {
      let canvasRefInstance: CanvasOverlayRef | null = null;

      render(
        <TestComponent
          videoRef={mockVideoRef}
          onRefReady={(ref) => {
            canvasRefInstance = ref;
          }}
        />
      );

      await waitFor(() => {
        expect(canvasRefInstance).not.toBeNull();
      });

      const options = { mimeType: 'video/webm', videoBitsPerSecond: 5000000 };
      canvasRefInstance!.startRecording(options);

      expect(capture.createRecorder).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        options
      );
    });
  });

  describe('getContext and getCanvas methods', () => {
    it('should return canvas context', async () => {
      let canvasRefInstance: CanvasOverlayRef | null = null;

      render(
        <TestComponent
          videoRef={mockVideoRef}
          onRefReady={(ref) => {
            canvasRefInstance = ref;
          }}
        />
      );

      await waitFor(() => {
        expect(canvasRefInstance).not.toBeNull();
      });

      const ctx = canvasRefInstance!.getContext();
      expect(ctx).toBeInstanceOf(CanvasRenderingContext2D);
    });

    it('should return canvas element', async () => {
      let canvasRefInstance: CanvasOverlayRef | null = null;

      render(
        <TestComponent
          videoRef={mockVideoRef}
          onRefReady={(ref) => {
            canvasRefInstance = ref;
          }}
        />
      );

      await waitFor(() => {
        expect(canvasRefInstance).not.toBeNull();
      });

      const canvas = canvasRefInstance!.getCanvas();
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    });
  });

  describe('dimension syncing', () => {
    it('should setup ResizeObserver on video element', () => {
      render(<CanvasOverlay videoRef={mockVideoRef} />);

      expect(mockResizeObserver).toHaveBeenCalled();
      const observerInstance =
        mockResizeObserver.mock.results[0].value;
      expect(observerInstance.observe).toHaveBeenCalledWith(mockVideo);
    });

    it('should listen to loadedmetadata event', () => {
      const addEventListenerSpy = vi.spyOn(mockVideo, 'addEventListener');

      render(<CanvasOverlay videoRef={mockVideoRef} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'loadedmetadata',
        expect.any(Function)
      );
    });

    it('should sync canvas dimensions with video on loadedmetadata event', () => {
      const { container } = render(<CanvasOverlay videoRef={mockVideoRef} />);
      const canvas = container.querySelector('canvas');
      const event = new Event('loadedmetadata');
      mockVideo.dispatchEvent(event);
      expect(canvas?.width).toBe(1280);
      expect(canvas?.height).toBe(720);
    });

    it('should sync canvas display size with video offset dimensions', () => {
      const { container } = render(<CanvasOverlay videoRef={mockVideoRef} />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      const event = new Event('loadedmetadata');
mockVideo.dispatchEvent(event);
      expect(canvas.style.width).toBe('640px');
      expect(canvas.style.height).toBe('360px');
    });

    it('should not sync dimensions if video ref is null', () => {
      const emptyRef = { current: null };
      const { container } = render(<CanvasOverlay videoRef={emptyRef} />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      expect(canvas?.width).toBe(300);
      expect(canvas?.height).toBe(150);
    });

    it('should cleanup observer and event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(mockVideo, 'removeEventListener');
      const { unmount } = render(<CanvasOverlay videoRef={mockVideoRef} />);

      const observerInstance =
        mockResizeObserver.mock.results[0].value;
      const disconnectSpy = vi.spyOn(observerInstance, 'disconnect');

      unmount();

      expect(disconnectSpy).toHaveBeenCalled();
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'loadedmetadata',
        expect.any(Function)
      );
    });
  });

  describe('rendering', () => {
    it('should render canvas with absolute positioning class', () => {
      const { container } = render(<CanvasOverlay videoRef={mockVideoRef} />);

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();
      expect(canvas?.className).toContain('absolute');
      expect(canvas?.className).toContain('top-0');
      expect(canvas?.className).toContain('left-0');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <CanvasOverlay videoRef={mockVideoRef} className="custom-class" />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas?.className).toContain('custom-class');
    });

    it('should have pointer-events-none class', () => {
      const { container } = render(<CanvasOverlay videoRef={mockVideoRef} />);

      const canvas = container.querySelector('canvas');
      expect(canvas?.className).toContain('pointer-events-none');
    });
  });
});
