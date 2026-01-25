import type { FinalDetection } from './postprocess';
import type { DrawConfig } from '@/app/types/visualization';

export const CLASS_COLORS: Record<number, string> = {
  0: '#EF4444',   // person - red
  2: '#14B8A6',   // car - teal
  5: '#3B82F6',   // bus - blue
  7: '#10B981',   // truck - green
  1: '#FBBF24',   // bicycle - yellow
};

export const DEFAULT_COLOR = '#8B5CF6'; // purple for unknowns

export function getClassColor(classId: number): string {
  return CLASS_COLORS[classId] || DEFAULT_COLOR;
}

export function drawDetections(
  ctx: CanvasRenderingContext2D,
  detections: FinalDetection[],
  config?: DrawConfig
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  detections.forEach(det => {
    const color = getClassColor(det.classId);
    const lineWidth = config?.boxLineWidth || 3;
    const fontSize = config?.fontSize || 16;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(det.x1, det.y1, det.width, det.height);

    const label = `${det.className}: ${(det.confidence * 100).toFixed(1)}%`;
    ctx.font = `${fontSize}px Arial`;
    const textMetrics = ctx.measureText(label);
    const textHeight = 20;
    const padding = 4;

    const labelY = det.y1 > textHeight
      ? det.y1 - 2
      : det.y2 + textHeight;

    ctx.fillStyle = color;
    ctx.fillRect(
      det.x1,
      labelY - textHeight + padding,
      textMetrics.width + padding * 2,
      textHeight
    );

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeText(label, det.x1 + padding, labelY);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(label, det.x1 + padding, labelY);
  });
}

export function drawFPS(
  ctx: CanvasRenderingContext2D,
  fps: number,
  position: { x: number; y: number } = { x: 10, y: 30 }
): void {
  ctx.font = 'bold 24px Arial';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  const fpsText = `FPS: ${fps.toFixed(1)}`;
  ctx.strokeText(fpsText, position.x, position.y);
  ctx.fillStyle = '#FBBF24';
  ctx.fillText(fpsText, position.x, position.y);
}
