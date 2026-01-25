import type {
  ScreenshotOptions,
  RecordingOptions,
  RecordingControl,
} from '@/app/types/visualization';

/**
 * Captures a canvas element as an image and triggers a download to the user's device.
 */
export async function captureCanvasScreenshot(
  canvas: HTMLCanvasElement,
  options: ScreenshotOptions = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const {
      filename = `detection-${Date.now()}.png`,
      format = 'image/png',
      quality = 1.0,
    } = options;

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create screenshot'));
          return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        resolve();
      },
      format,
      quality,
    );
  });
}

/**
 * Captures a composite screenshot by merging video frame and detection overlay canvas into a single image.
 */
export async function captureCompositeScreenshot(
  video: HTMLVideoElement,
  overlayCanvas: HTMLCanvasElement,
  options: ScreenshotOptions = {},
): Promise<void> {
  const offscreen = document.createElement('canvas');
  offscreen.width = video.videoWidth;
  offscreen.height = video.videoHeight;
  const ctx = offscreen.getContext('2d')!;

  ctx.drawImage(video, 0, 0);
  ctx.drawImage(overlayCanvas, 0, 0);

  return captureCanvasScreenshot(offscreen, options);
}

/**
 * MediaRecorder wrapper class to capture canvas stream as a video file.
 */
class CanvasRecorder implements RecordingControl {
  private mediaRecorder: MediaRecorder;
  private chunks: Blob[] = [];
  private mimeType: string;
  private recorderOptions: MediaRecorderOptions;

  constructor(canvas: HTMLCanvasElement, options: RecordingOptions = {}) {
    const {
      mimeType = 'video/webm;codecs=vp9',
      videoBitsPerSecond = 2500000,
      fps = 30,
      MediaRecorderCtor = globalThis.MediaRecorder,
    } = options;

    this.mimeType = MediaRecorderCtor.isTypeSupported(mimeType)
      ? mimeType
      : 'video/webm';

    this.recorderOptions = {
      mimeType: this.mimeType,
      videoBitsPerSecond,
    };

    const stream = canvas.captureStream(fps);
    this.mediaRecorder = new MediaRecorderCtor(stream, this.recorderOptions);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
  }

  getRecorderOptions(): MediaRecorderOptions {
    return this.recorderOptions;
  }

  start(): void {
    this.chunks.length = 0;
    this.mediaRecorder.start(100);
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mimeType });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `detection-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);

        resolve(blob);
      };
      this.mediaRecorder.stop();
    });
  }

  pause(): void {
    this.mediaRecorder.pause();
  }

  resume(): void {
    this.mediaRecorder.resume();
  }

  get isRecording(): boolean {
    return this.mediaRecorder.state === 'recording';
  }

  get isPaused(): boolean {
    return this.mediaRecorder.state === 'paused';
  }
}

/**
 * Creates a MediaRecorder instance to capture canvas stream as a video file with playback controls.
 */
export function createRecorder(
  canvas: HTMLCanvasElement,
  options: RecordingOptions = {},
): RecordingControl {
  return new CanvasRecorder(canvas, options);
}
