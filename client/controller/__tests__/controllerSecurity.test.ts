import { describe, expect, it } from 'vitest';
import {
  buildControllerId,
  buildControllerWebSocketUrl,
  readControllerAccessKey
} from '../controllerSecurity';

describe('controllerSecurity', () => {
  it('reads the controller access key from the query string', () => {
    expect(readControllerAccessKey('?k=shared-secret&foo=bar')).toBe('shared-secret');
    expect(readControllerAccessKey('?foo=bar')).toBeNull();
  });

  it('builds a controller id matching the server pattern', () => {
    expect(buildControllerId(() => 0)).toBe('player-00000000');
    expect(buildControllerId(() => 0.123456789)).toMatch(/^player-[a-z0-9_-]{8}$/i);
  });

  it('builds the secured WebSocket URL with the access key', () => {
    const url = buildControllerWebSocketUrl(
      {
        protocol: 'https:',
        host: 'duel.example.com',
        search: '?k=shared-secret'
      },
      'shared secret'
    );

    expect(url).toBe('wss://duel.example.com/ws/controller?k=shared%20secret');
  });
});

