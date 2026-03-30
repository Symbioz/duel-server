export type ControllerMessageType = 'gesture:start' | 'gesture:move' | 'gesture:end';

export interface GesturePoint {
  x: number;
  y: number;
  t: number;
}

export interface ControllerMessage extends GesturePoint {
  type: ControllerMessageType;
  controllerId: string;
}

export interface GestureSession {
  controllerId: string;
  points: GesturePoint[];
  startedAt: number;
  endedAt?: number;
}

