import { GesturePoint } from '../entities/GesturePoint';
import { GestureSessionRepository, GestureCompletionHandler } from '../common-ports/GesturePorts';

/**
 * Use case: end an in-progress gesture.
 * Marks session as complete, triggers completion handler, and logs debug info.
 */
export class EndGestureUseCase {
  constructor(
    private repository: GestureSessionRepository,
    private completionHandler: GestureCompletionHandler
  ) {}

  async execute(controllerId: string, point: GesturePoint): Promise<void> {
    const session = await this.repository.findByControllerId(controllerId);
    if (!session) {
      throw new Error(`No gesture session for controller ${controllerId}`);
    }

    if (session.isCompleted()) {
      throw new Error(`Gesture session already completed for controller ${controllerId}`);
    }

    session.addPoint(point);
    session.complete();
    await this.repository.save(session);

    const points = session.getPoints();
    const duration = session.getDuration();
    const pointCount = session.getPointCount();

    console.log(
      `[GestureCompleted] controllerId=${controllerId} pointCount=${pointCount} duration=${duration}ms`
    );

    await this.completionHandler.onGestureCompleted(controllerId, points);

    // Clean up session
    await this.repository.remove(controllerId);
  }
}

