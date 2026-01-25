import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  drawDetections,
  drawFPS,
  getClassColor,
  DEFAULT_COLOR,
} from '@/app/lib/visualize';
import type { FinalDetection } from '@/app/lib/postprocess';

function createMockContext(): CanvasRenderingContext2D {
  return {
    canvas: {
      width: 640,
      height: 480,
    } as HTMLCanvasElement,
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 }) as TextMetrics),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    font: '',
  } as unknown as CanvasRenderingContext2D;
}

function createMockDetection(
  classId: number,
  className: string,
  confidence: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): FinalDetection {
  return {
    classId,
    className,
    confidence,
    x1,
    y1,
    x2,
    y2,
    width: x2 - x1,
    height: y2 - y1,
  };
}

describe('visualize', () => {
  describe('getClassColor', () => {
    it('should return correct color for known classes', () => {
      expect(getClassColor(0)).toBe('#EF4444');
      expect(getClassColor(1)).toBe('#FBBF24');
      expect(getClassColor(2)).toBe('#14B8A6');
      expect(getClassColor(5)).toBe('#3B82F6');
      expect(getClassColor(7)).toBe('#10B981');
    });

    it('should return default color for unknown classes', () => {
      expect(getClassColor(99)).toBe(DEFAULT_COLOR);
      expect(getClassColor(-1)).toBe(DEFAULT_COLOR);
    });
  });

  describe('drawDetections', () => {
    let ctx: CanvasRenderingContext2D;

    beforeEach(() => {
      ctx = createMockContext();
    });

    it('should clear canvas at start', () => {
      const detections: FinalDetection[] = [];
      drawDetections(ctx, detections);

      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 640, 480);
    });

    it('should draw bounding box with correct color', () => {
      const detections = [
        createMockDetection(0, 'person', 0.9, 100, 100, 200, 200),
      ];

      drawDetections(ctx, detections);

      expect(ctx.strokeRect).toHaveBeenCalledWith(100, 100, 100, 100);
    });

    it('should draw label with class name and confidence', () => {
      const detections = [
        createMockDetection(0, 'person', 0.857, 100, 100, 200, 200),
      ];

      drawDetections(ctx, detections);

      expect(ctx.measureText).toHaveBeenCalledWith('person: 85.7%');
      expect(ctx.fillText).toHaveBeenCalled();
      expect(ctx.strokeText).toHaveBeenCalled();
    });

    it('should position label above box when space available', () => {
      const detections = [
        createMockDetection(0, 'person', 0.9, 100, 100, 200, 200),
      ];

      drawDetections(ctx, detections);

      const fillRectCalls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock
        .calls;
      const labelBackgroundCall = fillRectCalls.find(
        (call: number[]) => call[1] < 100,
      );
      expect(labelBackgroundCall).toBeDefined();
    });

    it('should position label below box when no space above', () => {
      const detections = [
        createMockDetection(0, 'person', 0.9, 100, 10, 200, 110),
      ];

      drawDetections(ctx, detections);

      const fillRectCalls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock
        .calls;
      const labelBackgroundCall = fillRectCalls.find(
        (call: number[]) => call[1] > 110,
      );
      expect(labelBackgroundCall).toBeDefined();
    });

    it('should handle multiple detections', () => {
      const detections = [
        createMockDetection(0, 'person', 0.9, 100, 100, 200, 200),
        createMockDetection(2, 'car', 0.85, 300, 300, 400, 400),
      ];

      drawDetections(ctx, detections);

      expect(ctx.strokeRect).toHaveBeenCalledTimes(2);
      expect(ctx.fillText).toHaveBeenCalledWith(
        expect.stringContaining('person'),
        expect.any(Number),
        expect.any(Number),
      );
      expect(ctx.fillText).toHaveBeenCalledWith(
        expect.stringContaining('car'),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it('should handle empty detections array', () => {
      drawDetections(ctx, []);

      expect(ctx.clearRect).toHaveBeenCalledOnce();
      expect(ctx.strokeRect).not.toHaveBeenCalled();
    });

    it('should use custom config values', () => {
      const detections = [
        createMockDetection(0, 'person', 0.9, 100, 100, 200, 200),
      ];

      drawDetections(ctx, detections, { boxLineWidth: 5, fontSize: 20 });

      expect(ctx.font).toBe('20px Arial');
      expect(ctx.strokeRect).toHaveBeenCalled();
    });
  });

  describe('drawFPS', () => {
    let ctx: CanvasRenderingContext2D;

    beforeEach(() => {
      ctx = createMockContext();
    });

    it('should draw FPS text at default position', () => {
      drawFPS(ctx, 30.5);

      expect(ctx.strokeText).toHaveBeenCalledWith('FPS: 30.5', 10, 30);
      expect(ctx.fillText).toHaveBeenCalledWith('FPS: 30.5', 10, 30);
    });

    it('should draw FPS text at custom position', () => {
      drawFPS(ctx, 25.0, { x: 50, y: 100 });

      expect(ctx.strokeText).toHaveBeenCalledWith('FPS: 25.0', 50, 100);
      expect(ctx.fillText).toHaveBeenCalledWith('FPS: 25.0', 50, 100);
    });

    it('should format FPS with one decimal place', () => {
      drawFPS(ctx, 29.876);

      expect(ctx.strokeText).toHaveBeenCalledWith('FPS: 29.9', 10, 30);
      expect(ctx.fillText).toHaveBeenCalledWith('FPS: 29.9', 10, 30);
    });
  });
});
