import { GesturePoint } from '../../entities/GesturePoint';
import {
  ControllerMessage,
  ControllerMessageType
} from '../../common-ports/sharedTypes';

/**
 * Shared types for WebSocket controller communication.
 */


/**
 * Validates and parses raw WebSocket message.
 * Throws if payload is malformed.
 */
export function parseControllerMessage(data: unknown): ControllerMessage {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Message must be a JSON object');
  }

  const msg = data as Record<string, unknown>;
  const type = msg.type;
  const controllerId = msg.controllerId;
  const x = msg.x;
  const y = msg.y;
  const t = msg.t;

  if (typeof type !== 'string' || !['gesture:start', 'gesture:move', 'gesture:end'].includes(type)) {
    throw new Error('Message type must be gesture:start, gesture:move, or gesture:end');
  }

  if (typeof controllerId !== 'string' || !/^player-[a-z0-9_-]{4,32}$/i.test(controllerId)) {
    throw new Error('controllerId must match pattern player-<4..32 chars>');
  }

  if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > 1) {
    throw new Error('x must be a number in [0, 1]');
  }

  if (typeof y !== 'number' || !Number.isFinite(y) || y < 0 || y > 1) {
    throw new Error('y must be a number in [0, 1]');
  }

  if (typeof t !== 'number' || !Number.isSafeInteger(t) || t < 0) {
    throw new Error('t must be a non-negative safe integer');
  }

  return { type: type as ControllerMessageType, controllerId, x, y, t };
}

/**
 * Converts a controller message to a GesturePoint.
 */
export function messageToGesturePoint(msg: ControllerMessage): GesturePoint {
  return new GesturePoint(msg.x, msg.y, msg.t);
}


