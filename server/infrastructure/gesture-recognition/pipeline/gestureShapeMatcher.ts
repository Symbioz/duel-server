import { Point } from '../../../core-logic/entities/Point';

function averageDistance(a: Point[], b: Point[]): number {
  const length = Math.min(a.length, b.length);
  if (length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  let sum = 0;
  for (let i = 0; i < length; i += 1) {
    const dx = a[i].x - b[i].x;
    const dy = a[i].y - b[i].y;
    sum += Math.hypot(dx, dy);
  }
  return sum / length;
}

export function computePolylineScore(inputPoints: Point[], templatePoints: Point[]): number {
  if (inputPoints.length === 0 || templatePoints.length === 0) {
    return 0;
  }

  const directDistance = averageDistance(inputPoints, templatePoints);
  const reversedDistance = averageDistance(inputPoints, [...templatePoints].reverse());
  const bestDistance = Math.min(directDistance, reversedDistance);

  const normalizedDistance = Math.min(bestDistance / Math.SQRT2, 1);
  return Number((1 - normalizedDistance).toFixed(6));
}

