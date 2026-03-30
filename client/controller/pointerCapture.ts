import { GesturePoint } from './controllerTypes';

export interface PointerCaptureCallbacks {
  onStart: (point: GesturePoint) => void;
  onMove: (point: GesturePoint) => void;
  onEnd: (point: GesturePoint) => void;
}

export class PointerCapture {
  private readonly element: HTMLElement;
  private readonly callbacks: PointerCaptureCallbacks;
  private active = false;

  constructor(element: HTMLElement, callbacks: PointerCaptureCallbacks) {
    this.element = element;
    this.callbacks = callbacks;
  }

  bind(): void {
    this.element.addEventListener('pointerdown', (event: PointerEvent) => this.handlePointerDown(event));
    this.element.addEventListener('pointermove', (event: PointerEvent) => this.handlePointerMove(event));
    this.element.addEventListener('pointerup', (event: PointerEvent) => this.handlePointerUp(event));
    this.element.addEventListener('pointercancel', (event: PointerEvent) => this.handlePointerUp(event));
  }

  private handlePointerDown(event: PointerEvent): void {
    event.preventDefault();
    if (this.active) {
      return;
    }

    this.active = true;
    this.callbacks.onStart(this.toNormalizedPoint(event));
  }

  private handlePointerMove(event: PointerEvent): void {
    event.preventDefault();
    if (!this.active) {
      return;
    }

    this.callbacks.onMove(this.toNormalizedPoint(event));
  }

  private handlePointerUp(event: PointerEvent): void {
    event.preventDefault();
    if (!this.active) {
      return;
    }

    this.active = false;
    this.callbacks.onEnd(this.toNormalizedPoint(event));
  }

  private toNormalizedPoint(event: PointerEvent): GesturePoint {
    const rect = this.element.getBoundingClientRect();
    const rawX = (event.clientX - rect.left) / rect.width;
    const rawY = (event.clientY - rect.top) / rect.height;

    return {
      x: Math.max(0, Math.min(1, rawX)),
      y: Math.max(0, Math.min(1, rawY)),
      t: Date.now()
    };
  }
}


