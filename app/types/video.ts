export interface VideoStreamState {
  isActive: boolean;
  hasPermission: boolean;
  error: VideoError | null;
  dimensions: { width: number; height: number };
}

export type VideoErrorType =
  | 'permission_denied'
  | 'no_camera_found'
  | 'camera_in_use'
  | 'unknown_error'
  | 'not_supported';

export interface VideoError {
  type: VideoErrorType;
  message: string;
  originalError?: Error;
}

export interface VideoCaptureProps {
  onVideoReady?: (video: HTMLVideoElement) => void;
  onStreamStart?: (stream: MediaStream) => void;
  onError?: (error: VideoError) => void;
  constraints?: MediaTrackConstraints;
  className?: string;
  autoStart?: boolean;
}

export interface CanvasOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  className?: string;
}

export interface VideoCaptureRef {
  start: () => Promise<void>;
  stop: () => void;
  getStream: () => MediaStream | null;
  getVideoElement: () => HTMLVideoElement | null;
  captureFrame: () => ImageData | null;
}

export const DEFAULT_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: 'user',
  frameRate: { ideal: 30 }
};
