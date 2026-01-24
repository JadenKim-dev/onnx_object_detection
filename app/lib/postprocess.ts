import type { Detection } from './types/model';
import { clamp } from 'remeda';

export interface FinalDetection {
  classId: number;
  className: string;
  confidence: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
}

export interface PostProcessConfig {
  allowedClassIds?: number[];
}

export interface TransformMetadata {
  scale: number;
  originalWidth: number;
  originalHeight: number;
}

export interface CocoClass {
  id: number;
  name: string;
}

export interface CocoClassesData {
  version: string;
  num_classes: number;
  classes: CocoClass[];
}

/**
 * Transforms coordinates from model space (640×640) to original image space
 *
 * Process:
 * 1. Unscale: coord_original = coord_model / scale
 * 2. Clamp: Ensure coordinates are within valid image bounds
 *
 * @param detection - Detection with coordinates in model space
 * @param metadata - Preprocessing metadata for transformation
 * @returns Detection with coordinates in original image space
 */
export function transformCoordinates(
  detection: Detection,
  metadata: TransformMetadata
): Omit<FinalDetection, 'className'> {
  const { scale, originalWidth, originalHeight } = metadata;

  const x1 = detection.x1 / scale;
  const y1 = detection.y1 / scale;
  const x2 = detection.x2 / scale;
  const y2 = detection.y2 / scale;

  const clampedX1 = clamp(x1, { min: 0, max: originalWidth });
  const clampedY1 = clamp(y1, { min: 0, max: originalHeight });
  const clampedX2 = clamp(x2, { min: 0, max: originalWidth });
  const clampedY2 = clamp(y2, { min: 0, max: originalHeight });

  return {
    classId: detection.classId,
    confidence: detection.confidence,
    x1: clampedX1,
    y1: clampedY1,
    x2: clampedX2,
    y2: clampedY2,
    width: clampedX2 - clampedX1,
    height: clampedY2 - clampedY1,
  };
}

/**
 * Loads COCO class definitions from JSON file
 * Creates a Map for O(1) class name lookup
 *
 * @returns Promise resolving to a Map of classId → className
 * @throws Error if JSON fetch or parsing fails
 */
export async function loadCocoClasses(): Promise<Map<number, string>> {
  const response = await fetch('/data/coco_classes.json');

  if (!response.ok) {
    throw new Error(
      `Failed to load COCO classes: ${response.status} ${response.statusText}`
    );
  }

  const data: CocoClassesData = await response.json();

  return new Map(
    data.classes.map((cocoClass) => [cocoClass.id, cocoClass.name] as const)
  );
}

/**
 * Enriches detections with human-readable class names
 *
 * @param detections - Detections with classId but no className
 * @param classMap - Map of classId to className
 * @returns Detections enriched with className field
 */
export function enrichWithClassNames(
  detections: Omit<FinalDetection, 'className'>[],
  classMap: Map<number, string>
): FinalDetection[] {
  return detections.map((detection) => ({
    ...detection,
    className: classMap.get(detection.classId) ?? `class_${detection.classId}`,
  }));
}

/**
 * Filters detections to only include specified classes
 *
 * @param detections - All detections
 * @param allowedClassIds - Array of class IDs to keep
 * @returns Filtered detections
 */
export function filterByClass(
  detections: FinalDetection[],
  allowedClassIds: number[]
): FinalDetection[] {
  if (allowedClassIds.length === 0) {
    return detections;
  }

  const allowedSet = new Set(allowedClassIds);
  return detections.filter((det) => allowedSet.has(det.classId));
}

/**
 * Main post-processing function: transforms coordinates and enriches detections
 *
 * Complete pipeline:
 * 1. Transform coordinates from model space to original image space
 * 2. Enrich with human-readable class names
 * 3. Optionally filter by allowed classes
 *
 * @param detections - Detections from NMS in model space
 * @param metadata - Preprocessing metadata for coordinate transformation
 * @param classMap - Map of classId to className (from loadCocoClasses)
 * @param config - Optional post-processing configuration
 * @returns Final detections ready for rendering
 */
export function postProcessDetections(
  detections: Detection[],
  metadata: TransformMetadata,
  classMap: Map<number, string>,
  config?: PostProcessConfig
): FinalDetection[] {
  const transformed = detections.map((det) =>
    transformCoordinates(det, metadata)
  );

  let enriched = enrichWithClassNames(transformed, classMap);

  if (config?.allowedClassIds && config.allowedClassIds.length > 0) {
    enriched = filterByClass(enriched, config.allowedClassIds);
  }

  return enriched;
}
