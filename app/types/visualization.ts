export interface DrawConfig {
  showConfidence?: boolean;
  showClassName?: boolean;
  boxLineWidth?: number;
  fontSize?: number;
}

export interface ScreenshotOptions {
  filename?: string;
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
  quality?: number;
}

/**
 * MediaRecorder constructor type for dependency injection
 */
export type MediaRecorderCtor = {
  new (stream: MediaStream, options?: MediaRecorderOptions): MediaRecorder;
  isTypeSupported(mimeType: string): boolean;
};

export interface RecordingOptions {
  mimeType?: string;
  videoBitsPerSecond?: number;
  fps?: number;
  MediaRecorderCtor?: MediaRecorderCtor;
}

export interface RecordingControl {
  start: () => void;
  stop: () => Promise<Blob>;
  pause: () => void;
  resume: () => void;
  isRecording: boolean;
  isPaused: boolean;
}
