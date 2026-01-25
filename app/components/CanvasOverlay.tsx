'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';
import { drawDetections, drawFPS } from '@/app/lib/visualize';
import { captureCompositeScreenshot, createRecorder } from '@/app/lib/capture';
import type { FinalDetection } from '@/app/lib/postprocess';
import type {
  DrawConfig,
  ScreenshotOptions,
  RecordingOptions,
  RecordingControl,
} from '@/app/types/visualization';

export interface CanvasOverlayRef {
  draw: (detections: FinalDetection[], fps?: number) => void;
  clear: () => void;
  screenshot: (options?: ScreenshotOptions) => Promise<void>;
  startRecording: (options?: RecordingOptions) => RecordingControl;
  getContext: () => CanvasRenderingContext2D | null;
  getCanvas: () => HTMLCanvasElement | null;
}

export interface CanvasOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  className?: string;
  drawConfig?: DrawConfig;
}

/**
 * Canvas overlay that automatically syncs dimensions with a video element.
 * Used for drawing detection boxes and annotations over video streams.
 *
 * Exposes methods via ref for drawing detections, taking screenshots, and recording.
 */
export const CanvasOverlay = forwardRef<CanvasOverlayRef, CanvasOverlayProps>(
  ({ videoRef, className, drawConfig }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (canvas && !ctxRef.current) {
        ctxRef.current = canvas.getContext('2d');
      }
    }, []);

    useImperativeHandle(ref, () => ({
      draw: (detections: FinalDetection[], fps?: number) => {
        const ctx = ctxRef.current;
        if (!ctx) return;

        drawDetections(ctx, detections, drawConfig);
        if (fps !== undefined) {
          drawFPS(ctx, fps);
        }
      },

      clear: () => {
        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      },

      screenshot: async (options?: ScreenshotOptions) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) {
          throw new Error('Canvas or video not available');
        }
        await captureCompositeScreenshot(video, canvas, options);
      },

      startRecording: (options?: RecordingOptions) => {
        const canvas = canvasRef.current;
        if (!canvas) {
          throw new Error('Canvas not available');
        }
        return createRecorder(canvas, options);
      },

      getContext: () => ctxRef.current,
      getCanvas: () => canvasRef.current,
    }));

    // Sync canvas dimensions with video:
    // sets internal resolution to native video size and display size to match rendered video element
    useEffect(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas) return;

      const updateCanvasSize = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.style.width = `${video.offsetWidth}px`;
        canvas.style.height = `${video.offsetHeight}px`;
      };

      video.addEventListener('loadedmetadata', updateCanvasSize);

      const resizeObserver = new ResizeObserver(updateCanvasSize);
      resizeObserver.observe(video);

      if (video.videoWidth > 0) {
        updateCanvasSize();
      }

      return () => {
        video.removeEventListener('loadedmetadata', updateCanvasSize);
        resizeObserver.disconnect();
      };
    }, [videoRef, canvasRef]);

    return (
      <canvas
        ref={canvasRef}
        className={cn(
          'absolute top-0 left-0 pointer-events-none rounded-lg',
          className,
        )}
      />
    );
  },
);

CanvasOverlay.displayName = 'CanvasOverlay';
