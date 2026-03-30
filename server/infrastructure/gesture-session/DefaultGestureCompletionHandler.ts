import { GesturePoint } from '../../entities/GesturePoint';
import { GestureCompletionHandler } from '../../common-ports/GesturePorts';

/**
 * Default no-op completion handler.
 * Replace or extend this to trigger spell casting, gesture recognition, etc.
 */
export class DefaultGestureCompletionHandler implements GestureCompletionHandler {
  async onGestureCompleted(controllerId: string, points: GesturePoint[]): Promise<void> {
    console.log(
      `[GestureCompletion] controllerId=${controllerId} points=${points.length}`
    );
  }
}

