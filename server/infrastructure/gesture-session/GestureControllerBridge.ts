import { GesturePoint } from '../../entities/GesturePoint';
import { StartGestureUseCase } from '../../usecases/StartGestureUseCase';
import { UpdateGestureUseCase } from '../../usecases/UpdateGestureUseCase';
import { EndGestureUseCase } from '../../usecases/EndGestureUseCase';

/**
 * Bridge between WebSocket messages and gesture use cases.
 * Converts raw transport points into domain calls.
 */
export class GestureControllerBridge {
  constructor(
    private readonly startGestureUseCase: StartGestureUseCase,
    private readonly updateGestureUseCase: UpdateGestureUseCase,
    private readonly endGestureUseCase: EndGestureUseCase
  ) {}

  async startGesture(controllerId: string, point: GesturePoint): Promise<void> {
    await this.startGestureUseCase.execute(controllerId, point);
  }

  async updateGesture(controllerId: string, point: GesturePoint): Promise<void> {
    await this.updateGestureUseCase.execute(controllerId, point);
  }

  async endGesture(controllerId: string, point: GesturePoint): Promise<void> {
    await this.endGestureUseCase.execute(controllerId, point);
  }
}

