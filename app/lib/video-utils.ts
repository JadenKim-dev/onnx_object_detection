import { VideoError } from '@/app/types/video';

export function isGetUserMediaSupported(): boolean {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );
}

export function parseMediaError(err: unknown): VideoError {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
        return {
          type: 'permission_denied',
          message: 'Camera permission denied. Please allow access.',
          originalError: err
        };
      case 'NotFoundError':
        return {
          type: 'no_camera_found',
          message: 'No camera found on this device.',
          originalError: err
        };
      case 'NotReadableError':
        return {
          type: 'camera_in_use',
          message: 'Camera is already in use by another application.',
          originalError: err
        };
      default:
        return {
          type: 'unknown_error',
          message: err.message,
          originalError: err
        };
    }
  }
  return {
    type: 'unknown_error',
    message: 'Failed to access camera',
    originalError: err instanceof Error ? err : undefined
  };
}
