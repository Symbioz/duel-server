import {
  GestureRecognitionRequest,
  GestureRecognitionResult
} from '../core-logic/entities/GestureRecognition';
import {
  GestureRecognitionHealthResponse,
  GestureRecognitionWarmupResponse
} from '../infrastructure/gesture-recognition/gestureRecognitionHttpContract';
import { GestureRecognitionBackend } from '../infrastructure/gesture-recognition/GestureRecognitionBackend';

/**
 * Use case: recognize a gesture from a sequence of points.
 * Delegates to the GestureRecognitionBackend and normalizes errors.
 */
export class RecognizeGestureUseCase {
  constructor(private readonly backend: GestureRecognitionBackend) {}

  async execute(request: GestureRecognitionRequest): Promise<GestureRecognitionResult> {
    if (!request.points || request.points.length < 2) {
      return {
        matched: false,
        templateKey: null,
        spellName: null,
        score: 0,
        confidence: 0
      };
    }

    try {
      return await this.backend.recognize(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[RecognizeGestureUseCase] Recognition failed: ${message}`);
      throw new Error(`Gesture recognition failed: ${message}`);
    }
  }

  async warmup(): Promise<GestureRecognitionWarmupResponse> {
    return this.backend.warmup();
  }

  async health(): Promise<GestureRecognitionHealthResponse> {
    try {
      return await this.backend.health();
    } catch {
      return { status: 'error', ready: false, templateCount: 0, keys: [] };
    }
  }
}
