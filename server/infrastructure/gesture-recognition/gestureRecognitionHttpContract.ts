import {
  GestureRecognitionOptions,
  GestureRecognitionResult
} from '../../core-logic/entities/GestureRecognition';
import { Point } from '../../core-logic/entities/Point';

export const GESTURE_RECOGNITION_BASE_PATH = '/api/gesture-recognition';
export const GESTURE_RECOGNITION_API_BASE_PATH = GESTURE_RECOGNITION_BASE_PATH;
export const GESTURE_RECOGNITION_WARMUP_PATH = `${GESTURE_RECOGNITION_BASE_PATH}/warmup`;
export const GESTURE_RECOGNITION_HEALTH_PATH = `${GESTURE_RECOGNITION_BASE_PATH}/health`;
export const GESTURE_RECOGNITION_RECOGNIZE_PATH = `${GESTURE_RECOGNITION_BASE_PATH}/recognize`;

// --- Backend-internal response types ---

export interface GestureRecognitionWarmupResponse {
  ready: boolean;
  templateCount: number;
  keys: string[];
}

export interface GestureRecognitionHealthResponse {
  status: 'ok' | 'warming' | 'error';
  ready: boolean;
  templateCount: number;
  keys: string[];
}

export interface GestureRecognitionRecognizeRequest {
  points: Point[];
  templateKeys?: string[];
  options?: GestureRecognitionOptions;
}

export interface GestureRecognitionRecognizeResponse {
  result: GestureRecognitionResult;
}

// --- Front-facing types (contract exposed to the browser) ---

/**
 * Options as sent by the front.
 * threshold (0-100) maps to minScoreThreshold (0-1) internally.
 */
export interface FrontGestureOptions {
  threshold?: number;
  preferredGestureKey?: string;
  scoringMode?: 'hybrid' | 'polyline' | 'coverage';
}

export interface FrontGestureTopMatch {
  gestureKey: string;
  score: number;       // 0-100
  confidence: number;  // 0-100
  distance: number;    // 100 - score
  threshold: number;
  passedThreshold: boolean;
}

export interface FrontGestureResponse {
  matchedGestureKey: string | null;
  score: number;       // 0-100
  confidence: number;  // 0-100
  distance: number;    // 100 - score
  threshold: number;
  passedThreshold: boolean;
  topMatches: FrontGestureTopMatch[];
  debugData: null;
}

export interface FrontGestureRecognizeRequest {
  points: Point[];
  templateKeys?: string[];
  options?: FrontGestureOptions;
}
