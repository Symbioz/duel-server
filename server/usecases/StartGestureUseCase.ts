import { GesturePoint } from '../entities/GesturePoint';
import { GestureSession } from '../entities/GestureSession';
import { GestureSessionRepository } from '../common-ports/GesturePorts';

/**
 * Use case: start a new gesture from a controller.
 * Creates a new gesture session or errors if one is already in progress.
 */
export class StartGestureUseCase {
  constructor(private repository: GestureSessionRepository) {}

  async execute(controllerId: string, point: GesturePoint): Promise<GestureSession> {
    const existing = await this.repository.findByControllerId(controllerId);
    if (existing && !existing.isCompleted()) {
      throw new Error(`Gesture session already in progress for controller ${controllerId}`);
    }

    const session = new GestureSession(controllerId, point);
    await this.repository.save(session);
    return session;
  }
}

