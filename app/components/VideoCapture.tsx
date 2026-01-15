"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  VideoCaptureProps,
  VideoCaptureRef,
  VideoError,
  DEFAULT_VIDEO_CONSTRAINTS,
} from "@/app/types/video";
import {
  parseMediaError,
  isGetUserMediaSupported,
} from "@/app/lib/video-utils";

export const VideoCapture = forwardRef<VideoCaptureRef, VideoCaptureProps>(
  (
    {
      onVideoReady,
      onStreamStart,
      onError,
      constraints,
      className,
      autoStart = true,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const [error, setError] = useState<VideoError | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleError = useCallback(
      (videoError: VideoError) => {
        setError(videoError);
        onError?.(videoError);
      },
      [onError]
    );

    const startMediaStream = useCallback(async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: constraints || DEFAULT_VIDEO_CONSTRAINTS,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      onStreamStart?.(stream);
    }, [constraints, onStreamStart]);

    /**
     * Initializes the camera and starts the media stream.
     */
    const initCamera = useCallback(async () => {
      if (!isGetUserMediaSupported()) {
        const notSupportedError: VideoError = {
          type: "not_supported",
          message:
            "Your browser does not support camera access. Please use Chrome, Firefox, or Safari.",
        };
        handleError(notSupportedError);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        await startMediaStream();
      } catch (err) {
        handleError(parseMediaError(err));
      } finally {
        setIsLoading(false);
      }
    }, [handleError, startMediaStream]);

    // Notify parent component when video metadata is loaded and ready for processing
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleLoadedData = () => {
        onVideoReady?.(video);
      };

      video.addEventListener("loadeddata", handleLoadedData);

      return () => {
        video.removeEventListener("loadeddata", handleLoadedData);
      };
    }, [onVideoReady]);

    useEffect(() => {
      if (autoStart) {
        initCamera();
      }

      return () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => {
            track.stop();
            console.log("Camera track stopped:", track.label);
          });
          streamRef.current = null;
        }
      };
    }, [autoStart, initCamera]);

    useImperativeHandle(ref, () => ({
      start: initCamera,
      stop: () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
      },
      getStream: () => streamRef.current,
      getVideoElement: () => videoRef.current,
      captureFrame: () => {
        if (!videoRef.current) return null;

        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement("canvas");
        }

        const canvas = offscreenCanvasRef.current;
        const video = videoRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
      },
    }));

    return (
      <div className={cn("relative", className)}>
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted rounded-lg">
            <div className="text-center">
              <p className="text-muted-foreground">
                Requesting camera access...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-destructive/10 rounded-lg">
            <div className="text-center p-6">
              <p className="text-destructive font-semibold mb-4">
                {error.message}
              </p>
              {error.type !== "not_supported" && (
                <Button onClick={initCamera} variant="outline">
                  Try Again
                </Button>
              )}
              {error.type === "not_supported" && (
                <p className="text-sm text-muted-foreground">
                  Please use Chrome, Firefox, or Safari
                </p>
              )}
            </div>
          </div>
        )}

        {/* Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={cn(
            "w-full h-auto rounded-lg bg-black",
            (isLoading || error) && "opacity-0"
          )}
        />
      </div>
    );
  }
);

VideoCapture.displayName = "VideoCapture";
