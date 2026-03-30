import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateGestureUseCase } from '../UpdateGestureUseCase';
import { GesturePoint } from '../../entities/GesturePoint';
import { GestureSession } from '../../entities/GestureSession';
import { GestureSessionRepository } from '../../common-ports/GesturePorts';

describe('UpdateGestureUseCase', () => {
  let repository: GestureSessionRepository;
  let useCase: UpdateGestureUseCase;

  beforeEach(() => {
    repository = {
      save: vi.fn(),
      findByControllerId: vi.fn(),
      remove: vi.fn()
    };

    useCase = new UpdateGestureUseCase(repository);
  });

  it('should add a point to an active gesture', async () => {
    const initialPoint = new GesturePoint(0.5, 0.5, 1000);
    const session = new GestureSession('controller-1', initialPoint);

    (repository.findByControllerId as any).mockResolvedValue(session);

    const newPoint = new GesturePoint(0.6, 0.6, 1100);
    await useCase.execute('controller-1', newPoint);

    expect(session.getPointCount()).toBe(2);
    expect(repository.save).toHaveBeenCalled();
  });

  it('should fail if no session exists', async () => {
    (repository.findByControllerId as any).mockResolvedValue(null);

    const point = new GesturePoint(0.5, 0.5, 1000);
    await expect(useCase.execute('controller-1', point)).rejects.toThrow('No gesture session');
  });

  it('should fail if session is completed', async () => {
    const initialPoint = new GesturePoint(0.5, 0.5, 1000);
    const session = new GestureSession('controller-1', initialPoint);
    session.complete();

    (repository.findByControllerId as any).mockResolvedValue(session);

    const point = new GesturePoint(0.6, 0.6, 1100);
    await expect(useCase.execute('controller-1', point)).rejects.toThrow('already completed');
  });
});

