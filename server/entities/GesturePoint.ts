/**
 * Value object representing a single point in a gesture trajectory.
 * Immutable and can be freely compared.
 */
export class GesturePoint {
  readonly x: number;
  readonly y: number;
  readonly timestamp: number;

  constructor(x: number, y: number, timestamp: number) {
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      throw new Error('Gesture coordinates must be normalized [0, 1]');
    }
    if (timestamp < 0) {
      throw new Error('Gesture timestamp must be non-negative');
    }
    this.x = x;
    this.y = y;
    this.timestamp = timestamp;
  }

  equals(other: GesturePoint): boolean {
    return this.x === other.x && this.y === other.y && this.timestamp === other.timestamp;
  }
}

