import { GesturePoint } from './GesturePoint';

/**
 * Aggregate representing an in-progress or completed gesture session.
 * Contains all points recorded during the gesture lifetime.
 */
export class GestureSession {
  private points: GesturePoint[] = [];
  readonly controllerId: string;
  readonly startedAt: number;
  private endedAt: number | null = null;

  constructor(controllerId: string, initialPoint: GesturePoint) {
    this.controllerId = controllerId;
    this.points.push(initialPoint);
    this.startedAt = initialPoint.timestamp;
  }

  addPoint(point: GesturePoint): void {
    if (this.endedAt !== null) {
      throw new Error('Cannot add points to a completed gesture session');
    }
    this.points.push(point);
  }

  complete(): void {
    if (this.endedAt !== null) {
      throw new Error('Gesture session already completed');
    }
    this.endedAt = Date.now();
  }

  getPoints(): GesturePoint[] {
    return [...this.points];
  }

  isCompleted(): boolean {
    return this.endedAt !== null;
  }

  getDuration(): number {
    const lastPoint = this.points[this.points.length - 1];
    return lastPoint.timestamp - this.startedAt;
  }

  getPointCount(): number {
    return this.points.length;
  }
}

