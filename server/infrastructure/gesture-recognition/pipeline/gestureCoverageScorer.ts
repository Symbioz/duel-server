import { Point } from '../../../core-logic/entities/Point';

export type BinaryMask = Uint8Array;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 1e-12) + xi;

    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

export function createMask(size: number): BinaryMask {
  return new Uint8Array(size * size);
}

function setPixel(mask: BinaryMask, size: number, x: number, y: number): void {
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return;
  }
  mask[y * size + x] = 1;
}

function drawDisc(mask: BinaryMask, size: number, cx: number, cy: number, radius: number): void {
  const r = Math.max(1, Math.floor(radius));
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      if (dx * dx + dy * dy <= r * r) {
        setPixel(mask, size, cx + dx, cy + dy);
      }
    }
  }
}

export function rasterizePolygonsToMask(polygons: Point[][], size: number): BinaryMask {
  const mask = createMask(size);
  if (polygons.length === 0) {
    return mask;
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = (x + 0.5) / size;
      const py = (y + 0.5) / size;
      const point = { x: px, y: py };
      if (polygons.some((polygon) => pointInPolygon(point, polygon))) {
        mask[y * size + x] = 1;
      }
    }
  }

  return mask;
}

export function rasterizePolylineToMask(points: Point[], size: number, strokeRatio = 0.03): BinaryMask {
  const mask = createMask(size);
  if (points.length === 0) {
    return mask;
  }

  const radius = clamp(Math.round(size * strokeRatio), 1, Math.max(2, Math.round(size * 0.08)));

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * size * 2));

    for (let step = 0; step <= steps; step += 1) {
      const ratio = step / steps;
      const x = Math.round((start.x + dx * ratio) * (size - 1));
      const y = Math.round((start.y + dy * ratio) * (size - 1));
      drawDisc(mask, size, x, y, radius);
    }
  }

  if (points.length === 1) {
    const point = points[0];
    drawDisc(mask, size, Math.round(point.x * (size - 1)), Math.round(point.y * (size - 1)), radius);
  }

  return mask;
}

export function scoreCoverage(referenceMask: BinaryMask, inputMask: BinaryMask): number {
  if (referenceMask.length !== inputMask.length) {
    return 0;
  }

  let intersection = 0;
  let union = 0;

  for (let i = 0; i < referenceMask.length; i += 1) {
    const a = referenceMask[i] === 1;
    const b = inputMask[i] === 1;
    if (a && b) {
      intersection += 1;
    }
    if (a || b) {
      union += 1;
    }
  }

  if (union === 0) {
    return 0;
  }

  return Number((intersection / union).toFixed(6));
}

