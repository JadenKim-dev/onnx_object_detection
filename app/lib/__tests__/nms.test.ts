import { describe, it, expect } from 'vitest';
import { calculateIoU, applyNMS } from '@/app/lib/nms';
import type { RawDetection } from '@/app/lib/types/model';
import type { Detection } from '@/app/lib/nms';

function createRawDetection(
  classId: number,
  confidence: number,
  cx: number,
  cy: number,
  width: number,
  height: number,
): RawDetection {
  return { classId, confidence, cx, cy, width, height };
}

function createDetection(
  classId: number,
  confidence: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): Detection {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const width = x2 - x1;
  const height = y2 - y1;
  return { classId, confidence, cx, cy, width, height, x1, y1, x2, y2 };
}

describe('nms', () => {
  describe('calculateIoU', () => {
    it('should return 1.0 for identical boxes', () => {
      const boxA = createDetection(0, 0.9, 0, 0, 100, 100);
      const boxB = createDetection(0, 0.8, 0, 0, 100, 100);
      expect(calculateIoU(boxA, boxB)).toBe(1.0);
    });

    it('should return 0.0 for non-overlapping boxes', () => {
      const boxA = createDetection(0, 0.9, 0, 0, 50, 50);
      const boxB = createDetection(0, 0.8, 100, 100, 150, 150);
      expect(calculateIoU(boxA, boxB)).toBe(0.0);
    });

    it('should calculate correct IoU for partial overlap', () => {
      const boxA = createDetection(0, 0.9, 0, 0, 100, 100);
      const boxB = createDetection(0, 0.8, 50, 50, 150, 150);

      const intersectArea = 50 * 50;
      const boxAArea = 100 * 100;
      const boxBArea = 100 * 100;
      const unionArea = boxAArea + boxBArea - intersectArea;
      const expectedIoU = intersectArea / unionArea;

      expect(calculateIoU(boxA, boxB)).toBeCloseTo(expectedIoU, 5);
    });

    it('should calculate correct IoU for complete containment', () => {
      const boxA = createDetection(0, 0.9, 0, 0, 100, 100);
      const boxB = createDetection(0, 0.8, 25, 25, 75, 75);

      const intersectArea = 50 * 50;
      const boxAArea = 100 * 100;
      const expectedIoU = intersectArea / boxAArea;

      expect(calculateIoU(boxA, boxB)).toBeCloseTo(expectedIoU, 5);
    });

    it('should handle zero-area boxes', () => {
      const boxA = createDetection(0, 0.9, 50, 50, 50, 50);
      const boxB = createDetection(0, 0.8, 100, 100, 150, 150);
      expect(calculateIoU(boxA, boxB)).toBe(0.0);
    });
  });

  describe('applyNMS', () => {
    it('should keep all detections when no overlap exists', () => {
      const detections: RawDetection[] = [
        createRawDetection(0, 0.9, 25, 25, 50, 50),
        createRawDetection(0, 0.8, 125, 125, 50, 50),
        createRawDetection(0, 0.7, 225, 225, 50, 50),
      ];

      const result = applyNMS(detections, { iouThreshold: 0.45 });
      expect(result).toHaveLength(3);
    });

    it('should suppress overlapping detections above IoU threshold', () => {
      const detections: RawDetection[] = [
        createRawDetection(0, 0.9, 50, 50, 100, 100),
        createRawDetection(0, 0.8, 60, 60, 100, 100),
      ];

      const result = applyNMS(detections, { iouThreshold: 0.45 });
      expect(result).toHaveLength(1);
      expect(result[0].confidence).toBe(0.9);
    });

    it('should handle per-class NMS independently', () => {
      const detections: RawDetection[] = [
        createRawDetection(0, 0.9, 50, 50, 100, 100),
        createRawDetection(0, 0.8, 60, 60, 100, 100),
        createRawDetection(1, 0.85, 55, 55, 100, 100),
        createRawDetection(1, 0.75, 65, 65, 100, 100),
      ];

      const result = applyNMS(detections, { iouThreshold: 0.45 });
      expect(result).toHaveLength(2);

      const class0 = result.filter((d) => d.classId === 0);
      const class1 = result.filter((d) => d.classId === 1);
      expect(class0).toHaveLength(1);
      expect(class1).toHaveLength(1);
      expect(class0[0].confidence).toBe(0.9);
      expect(class1[0].confidence).toBe(0.85);
    });

    it('should sort results by confidence descending', () => {
      const detections: RawDetection[] = [
        createRawDetection(0, 0.7, 25, 25, 50, 50),
        createRawDetection(1, 0.9, 125, 125, 50, 50),
        createRawDetection(2, 0.8, 225, 225, 50, 50),
      ];

      const result = applyNMS(detections, { iouThreshold: 0.45 });
      expect(result).toHaveLength(3);
      expect(result[0].confidence).toBe(0.9);
      expect(result[1].confidence).toBe(0.8);
      expect(result[2].confidence).toBe(0.7);
    });

    it('should handle empty input array', () => {
      const detections: RawDetection[] = [];
      const result = applyNMS(detections, { iouThreshold: 0.45 });
      expect(result).toHaveLength(0);
    });

    it('should handle single detection', () => {
      const detections: RawDetection[] = [
        createRawDetection(0, 0.9, 50, 50, 100, 100),
      ];

      const result = applyNMS(detections, { iouThreshold: 0.45 });
      expect(result).toHaveLength(1);
      expect(result[0].confidence).toBe(0.9);
    });

    it('should handle cascade suppression', () => {
      const detections: RawDetection[] = [
        createRawDetection(0, 0.9, 50, 50, 100, 100),
        createRawDetection(0, 0.8, 70, 70, 100, 100),
        createRawDetection(0, 0.7, 100, 100, 100, 100),
      ];

      const result = applyNMS(detections, { iouThreshold: 0.45 });

      expect(result).toHaveLength(2);
      expect(result[0].confidence).toBe(0.9);
      expect(result[1].confidence).toBe(0.7);
    });

    it('should preserve coordinate accuracy through conversion', () => {
      const detections: RawDetection[] = [
        createRawDetection(0, 0.9, 100.5, 200.5, 50.5, 60.5),
      ];

      const result = applyNMS(detections, { iouThreshold: 0.45 });
      expect(result).toHaveLength(1);
      expect(result[0].cx).toBe(100.5);
      expect(result[0].cy).toBe(200.5);
      expect(result[0].width).toBe(50.5);
      expect(result[0].height).toBe(60.5);
      expect(result[0].x1).toBeCloseTo(75.25, 5);
      expect(result[0].y1).toBeCloseTo(170.25, 5);
      expect(result[0].x2).toBeCloseTo(125.75, 5);
      expect(result[0].y2).toBeCloseTo(230.75, 5);
    });
  });
});
