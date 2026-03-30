import { describe, expect, it } from 'vitest';
import { buildSecurityConfigFromEnv } from '../SecurityConfig';

describe('SecurityConfig', () => {
  it('uses secure defaults when env is empty', () => {
    const config = buildSecurityConfigFromEnv({});

    expect(config.controllerAccessKey.length).toBeGreaterThanOrEqual(32);
    expect(config.isEphemeralAccessKey).toBe(true);
    expect(config.maxControllers).toBe(5);
    expect(config.wsMaxPayloadBytes).toBe(4096);
    expect(config.wsRateLimitPerSecond).toBe(120);
    expect(config.allowedOrigins).toEqual([]);
  });

  it('parses explicit environment overrides', () => {
    const config = buildSecurityConfigFromEnv({
      CONTROLLER_ACCESS_KEY: 'shared-secret',
      MAX_CONTROLLERS: '7',
      WS_MAX_PAYLOAD_BYTES: '8192',
      WS_RATE_LIMIT_PER_SEC: '240',
      ALLOWED_ORIGINS: 'https://duel.example.com, https://admin.example.com '
    });

    expect(config.controllerAccessKey).toBe('shared-secret');
    expect(config.isEphemeralAccessKey).toBe(false);
    expect(config.maxControllers).toBe(7);
    expect(config.wsMaxPayloadBytes).toBe(8192);
    expect(config.wsRateLimitPerSecond).toBe(240);
    expect(config.allowedOrigins).toEqual([
      'https://duel.example.com',
      'https://admin.example.com'
    ]);
  });
});

