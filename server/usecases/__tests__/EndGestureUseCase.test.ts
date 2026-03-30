import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EndGestureUseCase } from '../EndGestureUseCase';
import { GesturePoint } from '../../entities/GesturePoint';
import { GestureSession } from '../../entities/GestureSession';
import { GestureCompletionHandler, GestureSessionRepository } from '../../common-ports/GesturePorts';

describe('EndGestureUseCase', () => {
  let repository: GestureSessionRepository;
  let completionHandler: GestureCompletionHandler;
  let useCase: EndGestureUseCase;

  beforeEach(() => {
    repository = {
      save: vi.fn(),
      findByControllerId: vi.fn(),
      remove: vi.fn()
    };

    completionHandler = {
      onGestureCompleted: vi.fn()
    };

    useCase = new EndGestureUseCase(repository, completionHandler);
  });

  it('completes gesture and invokes completion hook', async () => {
    const session = new GestureSession('controller-1', new GesturePoint(0.2, 0.2, 100));
    (repository.findByControllerId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(session);

    await useCase.execute('controller-1', new GesturePoint(0.9, 0.9, 180));

    expect(repository.save).toHaveBeenCalled();
    expect(repository.remove).toHaveBeenCalledWith('controller-1');
    expect(completionHandler.onGestureCompleted).toHaveBeenCalledTimes(1);
    expect(completionHandler.onGestureCompleted).toHaveBeenCalledWith(
      'controller-1',
      expect.arrayContaining([
        expect.objectContaining({ x: 0.2, y: 0.2 }),
        expect.objectContaining({ x: 0.9, y: 0.9 })
      ])
    );
  });
});

