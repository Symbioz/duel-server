import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StartGestureUseCase } from '../StartGestureUseCase';
import { GesturePoint } from '../../entities/GesturePoint';
import { GestureSessionRepository } from '../../common-ports/GesturePorts';

describe('StartGestureUseCase', () => {
  let repository: GestureSessionRepository;
  let useCase: StartGestureUseCase;

  beforeEach(() => {
    repository = {
      save: vi.fn(),
      findByControllerId: vi.fn().mockResolvedValue(null),
      remove: vi.fn()
    };

    useCase = new StartGestureUseCase(repository);
  });

  it('should create a new gesture session with initial point', async () => {
    const point = new GesturePoint(0.5, 0.5, Date.now());
    const session = await useCase.execute('controller-1', point);

    expect(session.controllerId).toBe('controller-1');
    expect(session.getPointCount()).toBe(1);
    expect(session.isCompleted()).toBe(false);
    expect(repository.save).toHaveBeenCalled();
  });

  it('should fail if gesture already in progress', async () => {
    const point = new GesturePoint(0.5, 0.5, Date.now());
    const existingSession = { isCompleted: () => false } as any;

    (repository.findByControllerId as any).mockResolvedValue(existingSession);

    await expect(useCase.execute('controller-1', point)).rejects.toThrow(
      'Gesture session already in progress'
    );
  });
});

