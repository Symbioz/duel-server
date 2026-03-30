import { GestureSession } from '../entities/GestureSession';
import { GesturePoint } from '../entities/GesturePoint';

/**
 * Port for storing and retrieving gesture sessions.
 * Implementations may use in-memory storage, database, etc.
 */
export interface GestureSessionRepository {
  save(session: GestureSession): Promise<void>;
  findByControllerId(controllerId: string): Promise<GestureSession | null>;
  remove(controllerId: string): Promise<void>;
}

/**
 * Port for handling completed gestures.
 * This hook allows plugging in gesture recognition, spell casting, etc.
 */
export interface GestureCompletionHandler {
  onGestureCompleted(controllerId: string, points: GesturePoint[]): Promise<void>;
}

/**
 * Port for recognizing gestures.
 * Abstraction to keep gesture recognition decoupled from transport.
 */
export interface GestureRecognizer {
  recognize(points: GesturePoint[]): Promise<{
    spellName: string | null;
    confidence: number;
    debugData: Record<string, unknown>;
  }>;
}

