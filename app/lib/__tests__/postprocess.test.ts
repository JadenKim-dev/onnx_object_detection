import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from 'vitest';
import {
  transformCoordinates,
  enrichWithClassNames,
  filterByClass,
  postProcessDetections,
  loadCocoClasses,
  type FinalDetection,
  type TransformMetadata,
  type CocoClassesData,
} from '@/app/lib/postprocess';
import type { Detection } from '@/app/lib/types/model';

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

function createMockClassMap(): Map<number, string> {
  return new Map([
    [0, 'person'],
    [15, 'cat'],
    [16, 'dog'],
    [2, 'car'],
  ]);
}

function createMetadata(
  originalWidth: number,
  originalHeight: number,
): TransformMetadata {
  const maxSize = Math.max(originalWidth, originalHeight);
  const scale = 640 / maxSize;
  return { scale, originalWidth, originalHeight };
}

describe('postprocess', () => {
  describe('transformCoordinates', () => {
    it('should transform coordinates for landscape image (1920×1080)', () => {
      // Letterbox: 1920×1080 → 1920×1920 (pad) → 640×640 (scale=1/3)
      // so model coords × 3 = original coords
      const metadata = createMetadata(1920, 1080);
      const detection = createDetection(0, 0.9, 100, 100, 200, 200);

      const result = transformCoordinates(detection, metadata);

      expect(result.x1).toBeCloseTo(300, 5);
      expect(result.y1).toBeCloseTo(300, 5);
      expect(result.x2).toBeCloseTo(600, 5);
      expect(result.y2).toBeCloseTo(600, 5);
      expect(result.width).toBeCloseTo(300, 5);
      expect(result.height).toBeCloseTo(300, 5);
    });

    it('should transform coordinates for square image (640×640)', () => {
      const metadata = createMetadata(640, 640);
      const detection = createDetection(0, 0.9, 100, 100, 200, 200);

      const result = transformCoordinates(detection, metadata);

      expect(result.x1).toBeCloseTo(100, 5);
      expect(result.y1).toBeCloseTo(100, 5);
      expect(result.x2).toBeCloseTo(200, 5);
      expect(result.y2).toBeCloseTo(200, 5);
    });

    it('should clamp coordinates to image bounds', () => {
      const metadata = createMetadata(1920, 1080);
      // Model coords (-10,-10,650,650) → unscale → (-30,-30,1950,1950) → clamp → (0,0,1920,1080)
      const detection = createDetection(0, 0.9, -10, -10, 650, 650);

      const result = transformCoordinates(detection, metadata);

      expect(result.x1).toBe(0);
      expect(result.y1).toBe(0);
      expect(result.x2).toBeCloseTo(1920, 5);
      expect(result.y2).toBeCloseTo(1080, 5);
    });

    it('should preserve classId and confidence', () => {
      const metadata = createMetadata(1920, 1080);
      const detection = createDetection(15, 0.87, 100, 100, 200, 200);

      const result = transformCoordinates(detection, metadata);

      expect(result.classId).toBe(15);
      expect(result.confidence).toBeCloseTo(0.87, 5);
    });

    it('should handle small image upscaled to 640×640', () => {
      const metadata = createMetadata(320, 320);
      const detection = createDetection(0, 0.9, 100, 100, 200, 200);

      const result = transformCoordinates(detection, metadata);

      expect(result.x1).toBeCloseTo(50, 5);
      expect(result.y1).toBeCloseTo(50, 5);
      expect(result.x2).toBeCloseTo(100, 5);
      expect(result.y2).toBeCloseTo(100, 5);
    });
  });

  describe('enrichWithClassNames', () => {
    it('should add class names from map', () => {
      const classMap = createMockClassMap();
      const detections = [
        {
          classId: 0,
          confidence: 0.9,
          x1: 0,
          y1: 0,
          x2: 100,
          y2: 100,
          width: 100,
          height: 100,
        },
        {
          classId: 15,
          confidence: 0.8,
          x1: 0,
          y1: 0,
          x2: 50,
          y2: 50,
          width: 50,
          height: 50,
        },
      ];

      const result = enrichWithClassNames(detections, classMap);

      expect(result[0].className).toBe('person');
      expect(result[1].className).toBe('cat');
    });

    it('should use fallback for unknown class IDs', () => {
      const classMap = createMockClassMap();
      const detections = [
        {
          classId: 99,
          confidence: 0.9,
          x1: 0,
          y1: 0,
          x2: 100,
          y2: 100,
          width: 100,
          height: 100,
        },
      ];

      const result = enrichWithClassNames(detections, classMap);

      expect(result[0].className).toBe('class_99');
    });

    it('should handle empty detection array', () => {
      const classMap = createMockClassMap();
      const result = enrichWithClassNames([], classMap);
      expect(result).toHaveLength(0);
    });
  });

  describe('filterByClass', () => {
    it('should keep only allowed classes', () => {
      const detections: FinalDetection[] = [
        {
          classId: 0,
          className: 'person',
          confidence: 0.9,
          x1: 0,
          y1: 0,
          x2: 100,
          y2: 100,
          width: 100,
          height: 100,
        },
        {
          classId: 15,
          className: 'cat',
          confidence: 0.8,
          x1: 0,
          y1: 0,
          x2: 50,
          y2: 50,
          width: 50,
          height: 50,
        },
        {
          classId: 2,
          className: 'car',
          confidence: 0.85,
          x1: 0,
          y1: 0,
          x2: 80,
          y2: 80,
          width: 80,
          height: 80,
        },
      ];

      const result = filterByClass(detections, [0, 15]);

      expect(result).toHaveLength(2);
      expect(result[0].classId).toBe(0);
      expect(result[1].classId).toBe(15);
    });

    it('should return all detections when allowed list is empty', () => {
      const detections: FinalDetection[] = [
        {
          classId: 0,
          className: 'person',
          confidence: 0.9,
          x1: 0,
          y1: 0,
          x2: 100,
          y2: 100,
          width: 100,
          height: 100,
        },
      ];

      const result = filterByClass(detections, []);

      expect(result).toHaveLength(1);
    });

    it('should return empty array when no classes match', () => {
      const detections: FinalDetection[] = [
        {
          classId: 0,
          className: 'person',
          confidence: 0.9,
          x1: 0,
          y1: 0,
          x2: 100,
          y2: 100,
          width: 100,
          height: 100,
        },
      ];

      const result = filterByClass(detections, [15, 16]);

      expect(result).toHaveLength(0);
    });
  });

  describe('postProcessDetections', () => {
    it('should complete full post-processing pipeline', () => {
      const metadata = createMetadata(1920, 1080);
      const classMap = createMockClassMap();
      const detections = [
        createDetection(0, 0.9, 100, 100, 200, 200),
        createDetection(15, 0.8, 300, 300, 400, 400),
      ];

      const result = postProcessDetections(detections, metadata, classMap);

      expect(result).toHaveLength(2);
      expect(result[0].className).toBe('person');
      expect(result[0].x1).toBeCloseTo(300, 5);
      expect(result[1].className).toBe('cat');
      expect(result[1].x1).toBeCloseTo(900, 5);
    });

    it('should apply class filtering when configured', () => {
      const metadata = createMetadata(1920, 1080);
      const classMap = createMockClassMap();
      const detections = [
        createDetection(0, 0.9, 100, 100, 200, 200),
        createDetection(15, 0.8, 300, 300, 400, 400),
        createDetection(2, 0.85, 500, 500, 600, 600),
      ];

      const result = postProcessDetections(detections, metadata, classMap, {
        allowedClassIds: [0, 15],
      });

      expect(result).toHaveLength(2);
      expect(result.find((d) => d.classId === 2)).toBeUndefined();
    });

    it('should handle empty detection array', () => {
      const metadata = createMetadata(1920, 1080);
      const classMap = createMockClassMap();

      const result = postProcessDetections([], metadata, classMap);

      expect(result).toHaveLength(0);
    });
  });

  describe('loadCocoClasses', () => {
    beforeEach(() => {
      vi.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve({} as Response),
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should load and parse COCO classes JSON', async () => {
      const mockData: CocoClassesData = {
        version: '1.0.0',
        num_classes: 3,
        classes: [
          { id: 0, name: 'person' },
          { id: 15, name: 'cat' },
          { id: 16, name: 'dog' },
        ],
      };

      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const classMap = await loadCocoClasses();

      expect(classMap.size).toBe(3);
      expect(classMap.get(0)).toBe('person');
      expect(classMap.get(15)).toBe('cat');
      expect(classMap.get(16)).toBe('dog');
    });

    it('should throw error on fetch failure', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(loadCocoClasses()).rejects.toThrow(
        'Failed to load COCO classes',
      );
    });

    it('should throw error on invalid JSON', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(loadCocoClasses()).rejects.toThrow('Invalid JSON');
    });
  });
});
