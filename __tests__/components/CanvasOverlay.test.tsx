import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { CanvasOverlay } from '@/app/components/CanvasOverlay';
import { createMockVideoElement } from '../test-helpers';
import React from 'react';

describe('CanvasOverlay', () => {
  let mockVideo: HTMLVideoElement;
  let videoRef: React.RefObject<HTMLVideoElement>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVideo = createMockVideoElement();
    videoRef = { current: mockVideo };
  });

  describe('Component Rendering', () => {
    it('should render canvas element', () => {
      const { container } = render(<CanvasOverlay videoRef={videoRef} />);

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <CanvasOverlay videoRef={videoRef} className="custom-class" />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toHaveClass('custom-class');
    });

    it('should have pointer-events-none class', () => {
      const { container } = render(<CanvasOverlay videoRef={videoRef} />);

      const canvas = container.querySelector('canvas');
      expect(canvas).toHaveClass('pointer-events-none');
    });

    it('should have absolute positioning', () => {
      const { container } = render(<CanvasOverlay videoRef={videoRef} />);

      const canvas = container.querySelector('canvas');
      expect(canvas).toHaveClass('absolute');
    });
  });

  describe('Canvas Dimension Sync', () => {
    it('should sync canvas dimensions with video on loadedmetadata event', () => {
      const { container } = render(<CanvasOverlay videoRef={videoRef} />);

      const canvas = container.querySelector('canvas');

      const event = new Event('loadedmetadata');
      mockVideo.dispatchEvent(event);

      expect(canvas?.width).toBe(1280);
      expect(canvas?.height).toBe(720);
    });

    it('should sync canvas display size with video offset dimensions', () => {
      const { container } = render(<CanvasOverlay videoRef={videoRef} />);

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      const event = new Event('loadedmetadata');
      mockVideo.dispatchEvent(event);

      expect(canvas.style.width).toBe('1280px');
      expect(canvas.style.height).toBe('720px');
    });

    it('should not sync dimensions if video ref is null', () => {
      const emptyRef = { current: null };
      const { container } = render(<CanvasOverlay videoRef={emptyRef} />);

      const canvas = container.querySelector('canvas');

      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(
        mockVideo,
        'removeEventListener'
      );

      const { unmount } = render(<CanvasOverlay videoRef={videoRef} />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'loadedmetadata',
        expect.any(Function)
      );
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to canvas element', () => {
      const canvasRef = React.createRef<HTMLCanvasElement>();

      render(<CanvasOverlay ref={canvasRef} videoRef={videoRef} />);

      expect(canvasRef.current).toBeInstanceOf(HTMLCanvasElement);
    });

    it('should allow parent to access canvas context via ref', () => {
      const canvasRef = React.createRef<HTMLCanvasElement>();

      render(<CanvasOverlay ref={canvasRef} videoRef={videoRef} />);

      const ctx = canvasRef.current?.getContext('2d');
      expect(ctx).toBeDefined();
    });
  });
});
