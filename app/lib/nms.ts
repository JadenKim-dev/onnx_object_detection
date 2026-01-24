import { groupBy, pipe, mapValues, flatMap, sortBy } from 'remeda';
import type { RawDetection } from './types/model';

export interface Detection extends RawDetection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface NMSConfig {
  iouThreshold: number;
}

const DEFAULT_NMS_CONFIG: NMSConfig = {
  iouThreshold: 0.45,
};

/**
 * Converts center-based coordinates (cx, cy, width, height) to corner-based coordinates (x1, y1, x2, y2).
 */
function convertToCornerCoords(detection: RawDetection): Detection {
  const { cx, cy, width, height } = detection;
  return {
    ...detection,
    x1: cx - width / 2,
    y1: cy - height / 2,
    x2: cx + width / 2,
    y2: cy + height / 2,
  };
}

export function calculateIoU(boxA: Detection, boxB: Detection): number {
  const intersectX1 = Math.max(boxA.x1, boxB.x1);
  const intersectY1 = Math.max(boxA.y1, boxB.y1);
  const intersectX2 = Math.min(boxA.x2, boxB.x2);
  const intersectY2 = Math.min(boxA.y2, boxB.y2);

  const intersectWidth = Math.max(0, intersectX2 - intersectX1);
  const intersectHeight = Math.max(0, intersectY2 - intersectY1);
  const intersectArea = intersectWidth * intersectHeight;

  const boxAArea = (boxA.x2 - boxA.x1) * (boxA.y2 - boxA.y1);
  const boxBArea = (boxB.x2 - boxB.x1) * (boxB.y2 - boxB.y1);
  const unionArea = boxAArea + boxBArea - intersectArea;

  if (unionArea === 0) {
    return 0;
  }

  return intersectArea / unionArea;
}

/**
 * Applies NMS algorithm to a single class, keeping high-confidence boxes and suppressing overlapping ones.
 */
function performNMSOnClass(
  classBoxes: Detection[],
  iouThreshold: number
): Detection[] {
  const sorted = sortBy(classBoxes, [(box) => box.confidence, 'desc']);
  const keep: Detection[] = [];
  let remaining = sorted;

  while (remaining.length > 0) {
    const [best, ...rest] = remaining;
    keep.push(best);

    remaining = rest.filter((box) => calculateIoU(best, box) <= iouThreshold);
  }

  return keep;
}

/**
 * Applies Non-Maximum Suppression (NMS) to filter overlapping detections and return only the best boxes.
 * Processes detections per class, keeping high-confidence boxes and removing overlapping ones based on IoU threshold.
 */
export function applyNMS(
  detections: RawDetection[],
  config: Partial<NMSConfig> = {}
): Detection[] {
  if (detections.length === 0) {
    return [];
  }

  if (detections.length === 1) {
    return [convertToCornerCoords(detections[0])];
  }

  const { iouThreshold } = { ...DEFAULT_NMS_CONFIG, ...config };

  return pipe(
    detections,
    (dets) => dets.map(convertToCornerCoords),
    (boxes) => groupBy(boxes, (box) => box.classId),
    (buckets) => mapValues(buckets, (classBoxes) => performNMSOnClass(classBoxes, iouThreshold)),
    (buckets) => flatMap(Object.values(buckets), (x) => x),
    (result) => sortBy(result, [(box) => box.confidence, 'desc'])
  );
}
