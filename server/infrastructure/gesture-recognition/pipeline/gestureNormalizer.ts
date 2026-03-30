import { Point } from '../../../core-logic/entities/Point';

function distance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

export function normalizePoints(points: Point[]): Point[] {
  if (points.length === 0) {
    return [];
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  const width = Math.max(maxX - minX, 1e-9);
  const height = Math.max(maxY - minY, 1e-9);
  const scale = Math.max(width, height);

  return points.map((point) => ({
    x: (point.x - minX) / scale,
    y: (point.y - minY) / scale,
    t: point.t
  }));
}

export function resamplePoints(points: Point[], targetCount: number): Point[] {
  if (points.length === 0 || targetCount <= 0) {
    return [];
  }

  if (points.length === 1) {
    return Array.from({ length: targetCount }, () => ({ ...points[0] }));
  }

  const cumulative: number[] = [0];
  for (let i = 1; i < points.length; i += 1) {
    cumulative.push(cumulative[i - 1] + distance(points[i - 1], points[i]));
  }

  const totalLength = cumulative[cumulative.length - 1];
  if (totalLength === 0) {
    return Array.from({ length: targetCount }, () => ({ ...points[0] }));
  }

  const result: Point[] = [];
  let segmentIndex = 1;

  for (let i = 0; i < targetCount; i += 1) {
    const targetDistance = (i / Math.max(targetCount - 1, 1)) * totalLength;

    while (segmentIndex < cumulative.length - 1 && cumulative[segmentIndex] < targetDistance) {
      segmentIndex += 1;
    }

    const prevIndex = Math.max(segmentIndex - 1, 0);
    const nextIndex = Math.min(segmentIndex, points.length - 1);

    const segmentStart = cumulative[prevIndex];
    const segmentEnd = cumulative[nextIndex];
    const segmentLength = Math.max(segmentEnd - segmentStart, 1e-9);
    const ratio = (targetDistance - segmentStart) / segmentLength;

    const start = points[prevIndex];
    const end = points[nextIndex];
    result.push({
      x: start.x + (end.x - start.x) * ratio,
      y: start.y + (end.y - start.y) * ratio
    });
  }

  return result;
}

export function normalizeAndResample(points: Point[], targetCount: number): Point[] {
  return resamplePoints(normalizePoints(points), targetCount);
}

