import { config as loadDotEnv } from 'dotenv';
import { buildSecurityConfigFromEnv, SecurityConfig } from './server/app-configuration/SecurityConfig';

const DEFAULT_PORT = 8787;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_ENV_FILE_PATH = '.env';
const DEFAULT_VOXTRAL_MODEL = 'mistralai/Voxtral-Mini-4B-Realtime-2602';
const DEFAULT_VOXTRAL_TIMEOUT_MS = 1800;
const DEFAULT_VOICE_MAX_AUDIO_BYTES = 1024 * 1024;

export interface VoxtralConfig {
  /** Mistral API key. If null, the /voice/spell endpoint is disabled. */
  apiKey: string | null;
  /** Base URL of the API. Override to point to a local vLLM server. */
  baseUrl: string | null;
  /** Voxtral model to use. */
  model: string;
  /** Timeout for the transcription request in milliseconds. */
  timeoutMs: number;
  /** Max accepted audio payload for low latency. */
  maxAudioBytes: number;
}

export interface AppConfig {
  host: string;
  port: number;
  envFilePath: string;
  security: SecurityConfig;
  voxtral: VoxtralConfig;
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function buildAppConfigFromEnv(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    host: env.HOST?.trim() || DEFAULT_HOST,
    port: parsePort(env.PORT),
    envFilePath: env.APP_CONFIG_PATH?.trim() || DEFAULT_ENV_FILE_PATH,
    security: buildSecurityConfigFromEnv(env),
    voxtral: {
      apiKey: env.MISTRAL_API_KEY?.trim() || null,
      baseUrl: env.VOXTRAL_BASE_URL?.trim() || null,
      model: env.VOXTRAL_MODEL?.trim() || DEFAULT_VOXTRAL_MODEL,
      timeoutMs: parsePositiveInt(env.VOXTRAL_TIMEOUT_MS, DEFAULT_VOXTRAL_TIMEOUT_MS),
      maxAudioBytes: parsePositiveInt(env.VOICE_MAX_AUDIO_BYTES, DEFAULT_VOICE_MAX_AUDIO_BYTES),
    },
  };
}

export function loadAppConfig(): AppConfig {
  const envFilePath = process.env.APP_CONFIG_PATH?.trim() || DEFAULT_ENV_FILE_PATH;
  loadDotEnv({ path: envFilePath, quiet: true });
  return buildAppConfigFromEnv(process.env);
}

