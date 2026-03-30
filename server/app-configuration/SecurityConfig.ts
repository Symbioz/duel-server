import { randomBytes } from 'crypto';

const DEFAULT_MAX_CONTROLLERS = 5;
const DEFAULT_WS_MAX_PAYLOAD_BYTES = 4096;
const DEFAULT_WS_RATE_LIMIT_PER_SECOND = 120;

export interface SecurityConfig {
  controllerAccessKey: string;
  isEphemeralAccessKey: boolean;
  maxControllers: number;
  wsMaxPayloadBytes: number;
  wsRateLimitPerSecond: number;
  allowedOrigins: string[];
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseAllowedOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function buildSecurityConfigFromEnv(env: NodeJS.ProcessEnv = process.env): SecurityConfig {
  const configuredAccessKey = env.CONTROLLER_ACCESS_KEY?.trim();
  const isEphemeralAccessKey = !configuredAccessKey;
  const controllerAccessKey = configuredAccessKey || randomBytes(16).toString('hex');

  return {
    controllerAccessKey,
    isEphemeralAccessKey,
    maxControllers: parsePositiveInt(env.MAX_CONTROLLERS, DEFAULT_MAX_CONTROLLERS),
    wsMaxPayloadBytes: parsePositiveInt(env.WS_MAX_PAYLOAD_BYTES, DEFAULT_WS_MAX_PAYLOAD_BYTES),
    wsRateLimitPerSecond: parsePositiveInt(env.WS_RATE_LIMIT_PER_SEC, DEFAULT_WS_RATE_LIMIT_PER_SECOND),
    allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS)
  };
}

