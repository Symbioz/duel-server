import { GesturePoint } from '../entities/GesturePoint';
import { GestureSessionRepository } from '../common-ports/GesturePorts';

/**
 * Use case: add a movement point to an in-progress gesture.
 * Fails cleanly if no session exists or session is already completed.
 */
export class UpdateGestureUseCase {
  constructor(private repository: GestureSessionRepository) {}

  async execute(controllerId: string, point: GesturePoint): Promise<void> {
    const session = await this.repository.findByControllerId(controllerId);
    if (!session) {
      throw new Error(`No gesture session for controller ${controllerId}`);
    }

    if (session.isCompleted()) {
      throw new Error(`Gesture session already completed for controller ${controllerId}`);
    }

    session.addPoint(point);
    await this.repository.save(session);
  }
}

