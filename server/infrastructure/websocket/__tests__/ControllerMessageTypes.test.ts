import { describe, expect, it } from 'vitest';
import { messageToGesturePoint, parseControllerMessage } from '../controllerMessageTypes';

describe('ControllerMessageTypes', () => {
  it('parses a valid message', () => {
    const parsed = parseControllerMessage({
      type: 'gesture:move',
      controllerId: 'player-abcd1',
      x: 0.3,
      y: 0.6,
      t: 1712345678901
    });

    expect(parsed.type).toBe('gesture:move');
    expect(parsed.controllerId).toBe('player-abcd1');
  });

  it('rejects out-of-bounds coordinates', () => {
    expect(() =>
      parseControllerMessage({
        type: 'gesture:move',
        controllerId: 'player-abcd1',
        x: 1.4,
        y: 0.6,
        t: 1712345678901
      })
    ).toThrow();
  });

  it('rejects malformed controllerId', () => {
    expect(() =>
      parseControllerMessage({
        type: 'gesture:move',
        controllerId: 'attacker',
        x: 0.4,
        y: 0.6,
        t: 1712345678901
      })
    ).toThrow();
  });

  it('rejects non-integer timestamp', () => {
    expect(() =>
      parseControllerMessage({
        type: 'gesture:move',
        controllerId: 'player-abcd1',
        x: 0.4,
        y: 0.6,
        t: 1712345678901.5
      })
    ).toThrow();
  });

  it('maps message to gesture point', () => {
    const point = messageToGesturePoint({
      type: 'gesture:start',
      controllerId: 'player-abcd1',
      x: 0.1,
      y: 0.1,
      t: 1712345678901
    });

    expect(point.x).toBe(0.1);
    expect(point.y).toBe(0.1);
    expect(point.timestamp).toBe(1712345678901);
  });
});


