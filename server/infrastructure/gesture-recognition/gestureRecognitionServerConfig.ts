import path from 'node:path';

export interface GestureRecognitionServerConfig {
  port: number;
  host: string;
  spellGlyphDirectory: string;
  rasterSize: number;
  sampleCount: number;
  minScoreThreshold: number;
}

function parseInteger(rawInput: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(rawInput ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseFloatSafe(rawInput: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(rawInput ?? '');
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function readGestureRecognitionServerConfig(): GestureRecognitionServerConfig {
  return {
    port: parseInteger(process.env.GESTURE_RECOGNITION_PORT, 8787),
    host: process.env.GESTURE_RECOGNITION_HOST ?? '0.0.0.0',
    spellGlyphDirectory:
      process.env.GESTURE_RECOGNITION_GLYPH_DIR ??
      path.join(process.cwd(), 'server/infrastructure/gesture-recognition/spell-glyphs'),
    rasterSize: parseInteger(process.env.GESTURE_RECOGNITION_RASTER_SIZE, 96),
    sampleCount: parseInteger(process.env.GESTURE_RECOGNITION_SAMPLE_COUNT, 96),
    minScoreThreshold: parseFloatSafe(process.env.GESTURE_RECOGNITION_MIN_SCORE, 0.45)
  };
}

