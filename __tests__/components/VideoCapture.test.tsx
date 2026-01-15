import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { VideoCapture } from '@/app/components/VideoCapture';
import {
  createMockMediaStream,
  mockGetUserMediaSuccess,
  mockGetUserMediaError,
} from '../test-helpers';
import type { VideoCaptureRef } from '@/app/types/video';

describe('VideoCapture', () => {
  let mockGetUserMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserMedia = mockGetUserMediaSuccess();
    vi.stubGlobal('navigator', {
      ...global.navigator,
      mediaDevices: {
        ...global.navigator.mediaDevices,
        getUserMedia: mockGetUserMedia,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('Component Rendering', () => {
    it('should render video element', () => {
      render(<VideoCapture autoStart={false} />);

      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
    });

    it('should show loading state while requesting camera', async () => {
      mockGetUserMedia.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<VideoCapture autoStart={true} />);

      expect(screen.getByText(/requesting camera access/i)).toBeInTheDocument();
    });
  });

  describe('Camera Initialization', () => {
    it('should request camera access on mount when autoStart is true', async () => {
      render(<VideoCapture autoStart={true} />);

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
      });
    });

    it('should not request camera access on mount when autoStart is false', async () => {
      render(<VideoCapture autoStart={false} />);

      await waitFor(() => {
        expect(mockGetUserMedia).not.toHaveBeenCalled();
      });
    });

    it('should call onStreamStart callback when stream starts', async () => {
      const mockStream = createMockMediaStream();
      mockGetUserMedia.mockImplementation(mockGetUserMediaSuccess(mockStream));

      const onStreamStart = vi.fn();

      render(<VideoCapture autoStart={true} onStreamStart={onStreamStart} />);

      await waitFor(() => {
        expect(onStreamStart).toHaveBeenCalledWith(mockStream);
      });
    });

    it('should call onVideoReady callback when video is loaded', async () => {
      const onVideoReady = vi.fn();

      render(<VideoCapture autoStart={true} onVideoReady={onVideoReady} />);

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });

      const video = document.querySelector('video');
      if (video) {
        const event = new Event('loadeddata');
        video.dispatchEvent(event);
      }

      await waitFor(() => {
        expect(onVideoReady).toHaveBeenCalledWith(video);
      });
    });

    it('should use custom constraints when provided', async () => {
      const customConstraints = {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: 'environment',
      };

      render(
        <VideoCapture autoStart={true} constraints={customConstraints} />
      );

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({
          video: customConstraints,
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when permission is denied', async () => {
      mockGetUserMedia.mockImplementation(mockGetUserMediaError(
        'NotAllowedError',
        'Permission denied'
      ));

      render(<VideoCapture autoStart={true} />);

      await waitFor(() => {
        expect(
          screen.getByText(/camera permission denied/i)
        ).toBeInTheDocument();
      });
    });

    it('should display error message when no camera is found', async () => {
      mockGetUserMedia.mockImplementation(mockGetUserMediaError(
        'NotFoundError',
        'No camera found'
      ));

      render(<VideoCapture autoStart={true} />);

      await waitFor(() => {
        expect(screen.getByText(/no camera found/i)).toBeInTheDocument();
      });
    });

    it('should display error message when camera is in use', async () => {
      mockGetUserMedia.mockImplementation(mockGetUserMediaError(
        'NotReadableError',
        'Camera in use'
      ));

      render(<VideoCapture autoStart={true} />);

      await waitFor(() => {
        expect(screen.getByText(/camera is already in use/i)).toBeInTheDocument();
      });
    });

    it('should call onError callback when error occurs', async () => {
      mockGetUserMedia.mockImplementation(mockGetUserMediaError(
        'NotAllowedError',
        'Permission denied'
      ));

      const onError = vi.fn();

      render(<VideoCapture autoStart={true} onError={onError} />);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'permission_denied',
            message: expect.stringContaining('Camera permission denied'),
          })
        );
      });
    });

    it('should show Try Again button on error', async () => {
      mockGetUserMedia.mockImplementation(mockGetUserMediaError(
        'NotAllowedError',
        'Permission denied'
      ));

      render(<VideoCapture autoStart={true} />);

      await waitFor(() => {
        expect(screen.getByText(/try again/i)).toBeInTheDocument();
      });
    });

    it('should not show Try Again button for not_supported error', async () => {
      vi.stubGlobal('navigator', {
        ...global.navigator,
        mediaDevices: undefined,
      });

      render(<VideoCapture autoStart={true} />);

      await waitFor(() => {
        expect(screen.queryByText(/try again/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Component Cleanup', () => {
    it('should stop all tracks on unmount', async () => {
      const mockStream = createMockMediaStream();
      const mockTrack = mockStream.getTracks()[0];
      const stopSpy = vi.spyOn(mockTrack, 'stop');

      mockGetUserMedia.mockImplementation(mockGetUserMediaSuccess(mockStream));

      const { unmount } = render(<VideoCapture autoStart={true} />);

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });

      unmount();

      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('Imperative Handle', () => {
    it('should expose start method via ref', async () => {
      const ref = React.createRef<VideoCaptureRef>();

      render(<VideoCapture ref={ref} autoStart={false} />);

      await waitFor(() => {
        expect(ref.current).not.toBeNull();
      });

      expect(ref.current?.start).toBeDefined();
      expect(typeof ref.current?.start).toBe('function');
    });

    it('should expose stop method via ref', async () => {
      const ref = React.createRef<VideoCaptureRef>();

      render(<VideoCapture ref={ref} autoStart={false} />);

      await waitFor(() => {
        expect(ref.current?.stop).toBeDefined();
      });

      expect(typeof ref.current?.stop).toBe('function');
    });

    it('should expose getStream method via ref', async () => {
      const ref = React.createRef<VideoCaptureRef>();

      render(<VideoCapture ref={ref} autoStart={false} />);

      await waitFor(() => {
        expect(ref.current?.getStream).toBeDefined();
      });

      expect(typeof ref.current?.getStream).toBe('function');
    });

    it('should expose getVideoElement method via ref', async () => {
      const ref = React.createRef<VideoCaptureRef>();

      render(<VideoCapture ref={ref} autoStart={false} />);

      await waitFor(() => {
        expect(ref.current?.getVideoElement).toBeDefined();
      });

      expect(typeof ref.current?.getVideoElement).toBe('function');
    });

    it('should expose captureFrame method via ref', async () => {
      const ref = React.createRef<VideoCaptureRef>();

      render(<VideoCapture ref={ref} autoStart={false} />);

      await waitFor(() => {
        expect(ref.current?.captureFrame).toBeDefined();
      });

      expect(typeof ref.current?.captureFrame).toBe('function');
    });

    it('should return MediaStream from getStream after initialization', async () => {
      const mockStream = createMockMediaStream();
      mockGetUserMedia.mockImplementation(mockGetUserMediaSuccess(mockStream));

      const ref = React.createRef<VideoCaptureRef>();

      render(<VideoCapture ref={ref} autoStart={true} />);

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });

      const stream = ref.current?.getStream();
      expect(stream).toBe(mockStream);
    });

    it('should return ImageData from captureFrame when video is ready', async () => {
      const ref = React.createRef<VideoCaptureRef>();

      render(<VideoCapture ref={ref} autoStart={true} />);

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });

      const video = document.querySelector('video');
      if (video) {
        Object.defineProperty(video, 'videoWidth', { value: 1280 });
        Object.defineProperty(video, 'videoHeight', { value: 720 });
      }

      const frameData = ref.current?.captureFrame();

      expect(frameData).not.toBeNull();
      expect(frameData?.width).toBe(1280);
      expect(frameData?.height).toBe(720);
    });

    it('should stop stream when stop method is called', async () => {
      const mockStream = createMockMediaStream();
      const mockTrack = mockStream.getTracks()[0];
      const stopSpy = vi.spyOn(mockTrack, 'stop');

      mockGetUserMedia.mockImplementation(mockGetUserMediaSuccess(mockStream));

      const ref = React.createRef<VideoCaptureRef>();

      render(<VideoCapture ref={ref} autoStart={true} />);

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });

      ref.current?.stop();

      expect(stopSpy).toHaveBeenCalled();
    });
  });
});
