import { describe, expect, it } from 'vitest';
import { buildAppConfigFromEnv } from '../../../app.config';

describe('app.config', () => {
  it('uses expected defaults', () => {
    const config = buildAppConfigFromEnv({});

    expect(config.host).toBe('0.0.0.0');
    expect(config.port).toBe(8787);
    expect(config.envFilePath).toBe('.env');
    expect(config.security.maxControllers).toBe(5);
  });

  it('reads runtime and security options from env', () => {
    const config = buildAppConfigFromEnv({
      HOST: '127.0.0.1',
      PORT: '4321',
      APP_CONFIG_PATH: '.env.local',
      CONTROLLER_ACCESS_KEY: 'shared-secret',
      MAX_CONTROLLERS: '5',
      WS_RATE_LIMIT_PER_SEC: '90',
      WS_MAX_PAYLOAD_BYTES: '2048',
      ALLOWED_ORIGINS: 'https://duel.example.com'
    });

    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(4321);
    expect(config.envFilePath).toBe('.env.local');
    expect(config.security.controllerAccessKey).toBe('shared-secret');
    expect(config.security.maxControllers).toBe(5);
    expect(config.security.wsRateLimitPerSecond).toBe(90);
    expect(config.security.wsMaxPayloadBytes).toBe(2048);
    expect(config.security.allowedOrigins).toEqual(['https://duel.example.com']);
  });
});

