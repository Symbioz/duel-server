export type ControllerMessageType = 'gesture:start' | 'gesture:move' | 'gesture:end';

export interface ControllerMessage {
  type: ControllerMessageType;
  controllerId: string;
  x: number;
  y: number;
  t: number;
}

export interface GesturePointDto {
  x: number;
  y: number;
  t: number;
}

export interface GestureSessionDto {
  controllerId: string;
  points: GesturePointDto[];
}

