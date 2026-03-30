import { GestureSession } from '../../entities/GestureSession';
import { GestureSessionRepository } from '../../common-ports/GesturePorts';

/**
 * In-memory implementation of GestureSessionRepository.
 * Keyed by controllerId. Not persistent across restarts.
 */
export class InMemoryGestureSessionRepository implements GestureSessionRepository {
  private readonly sessions = new Map<string, GestureSession>();

  async save(session: GestureSession): Promise<void> {
    this.sessions.set(session.controllerId, session);
  }

  async findByControllerId(controllerId: string): Promise<GestureSession | null> {
    return this.sessions.get(controllerId) ?? null;
  }

  async remove(controllerId: string): Promise<void> {
    this.sessions.delete(controllerId);
  }
}

