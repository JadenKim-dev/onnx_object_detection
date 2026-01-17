/**
 * OpenCV.js loader using @techstark/opencv-js package
 * Handles async loading and runtime initialization
 */

import { CV, Mat } from '@techstark/opencv-js';

let cvInstance: CV | null = null;
let cvPromise: Promise<CV> | null = null;

/**
 * Get OpenCV.js instance, loading it if necessary
 * Returns cached instance on subsequent calls
 * Follows the official @techstark/opencv-js usage pattern
 */
export async function getOpenCV(): Promise<CV> {
  if (cvInstance) {
    return cvInstance;
  }

  if (cvPromise) {
    return cvPromise;
  }

  // Import OpenCV.js dynamically to avoid hanging in test environment
  const cvModule = await import('@techstark/opencv-js');

  cvPromise = (async () => {
    let cv: CV;

    if (cvModule instanceof Promise) {
      cv = await cvModule;
    } else {
      if (cvModule.Mat) {
        cv = cvModule;
      } else {
        await new Promise<void>((resolve) => {
          cvModule.onRuntimeInitialized = () => {
            resolve();
          };
        });
        cv = cvModule;
      }
    }

    cvInstance = cv;
    return cv;
  })();

  return cvPromise;
}

/**
 * Cleanup OpenCV Mat objects to prevent memory leaks
 */
export function cleanupMats(...mats: Mat[]): void {
  mats.forEach(mat => {
    mat.delete();
  });
}
