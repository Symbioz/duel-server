/**
 * Types for multi-device gesture + voice session management.
 *
 * Rule: the microphone providing audio MUST correspond to the device
 * that produced the gesture (desktop mouse → desktop mic,
 * phone touch → phone mic).
 */

export type DeviceOwner = 'desktop' | 'phone';

/**
 * Identifies a player across devices and sessions.
 */
export interface PlayerId {
  readonly value: string;
}

/**
 * Identifies a physical device (desktop browser tab or phone).
 */
export interface DeviceId {
  readonly value: string;
}

/**
 * A game session grouping multiple spell-casting attempts by one player.
 */
export interface SessionId {
  readonly value: string;
}

/**
 * One spell-casting attempt: a gesture + its associated audio capture.
 * Both MUST originate from the same device (enforced by deviceId + owner).
 */
export interface AttemptId {
  readonly value: string;
}

export interface AttemptSession {
  attemptId: string;
  sessionId: string;
  playerId: string;
  deviceId: string;
  /** Which physical device produced this attempt. */
  owner: DeviceOwner;
  startedAt: number;
  endedAt?: number;
}

/**
 * Lightweight context attached to gesture and voice HTTP requests.
 * Allows the backend to correlate gesture and audio to the same attempt.
 */
export interface AttemptContext {
  attemptId?: string;
  sessionId?: string;
  playerId?: string;
  deviceId?: string;
  owner?: DeviceOwner;
}

/**
 * Guard: returns true if the audio context matches the gesture context.
 * Both must have the same deviceId (or both be absent).
 */
export function isSameDevice(gestureCtx: AttemptContext, audioCtx: AttemptContext): boolean {
  if (!gestureCtx.deviceId || !audioCtx.deviceId) {
    return true; // lenient when not provided
  }
  return gestureCtx.deviceId === audioCtx.deviceId;
}

