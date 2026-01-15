'use client';

import { useEffect, useRef, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { CanvasOverlayProps } from '@/app/types/video';

/**
 * Canvas overlay that automatically syncs dimensions with a video element.
 * Used for drawing detection boxes and annotations over video streams.
 */
export const CanvasOverlay = forwardRef<HTMLCanvasElement, CanvasOverlayProps>(
  ({ videoRef, className }, ref) => {
    const internalCanvasRef = useRef<HTMLCanvasElement>(null);
    const canvasRef = (ref as React.RefObject<HTMLCanvasElement>) || internalCanvasRef;

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
          "absolute top-0 left-0 pointer-events-none rounded-lg",
          className
        )}
      />
    );
  }
);

CanvasOverlay.displayName = 'CanvasOverlay';
