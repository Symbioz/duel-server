import { once } from 'node:events';
import { AddressInfo } from 'node:net';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { GestureRecognitionBackend } from './GestureRecognitionBackend';
import { createGestureRecognitionHttpServer } from './GestureRecognitionHttpServer';
import {
  GESTURE_RECOGNITION_HEALTH_PATH,
  GESTURE_RECOGNITION_RECOGNIZE_PATH,
  GESTURE_RECOGNITION_WARMUP_PATH
} from './gestureRecognitionHttpContract';

async function listen(port = 0): Promise<{ serverUrl: string; close: () => Promise<void> }> {
  const backend = new GestureRecognitionBackend({
    config: {
      spellGlyphDirectory: path.join(process.cwd(), 'server/infrastructure/gesture-recognition/spell-glyphs'),
      rasterSize: 64,
      sampleCount: 64,
      minScoreThreshold: 0.2
    }
  });
  const httpServer = createGestureRecognitionHttpServer({ backend });

  httpServer.listen(port, '127.0.0.1');
  await once(httpServer, 'listening');
  const address = httpServer.address() as AddressInfo;

  return {
    serverUrl: `http://127.0.0.1:${address.port}`,
    close: async (): Promise<void> => {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  };
}

describe('GestureRecognitionHttpServer', () => {
  let runningServer: { serverUrl: string; close: () => Promise<void> } | null = null;

  afterEach(async () => {
    if (runningServer) {
      await runningServer.close();
      runningServer = null;
    }
  });

  it('warms up and exposes health information', async () => {
    runningServer = await listen();

    const warmupResponse = await fetch(`${runningServer.serverUrl}${GESTURE_RECOGNITION_WARMUP_PATH}`, {
      method: 'POST'
    });
    const healthResponse = await fetch(`${runningServer.serverUrl}${GESTURE_RECOGNITION_HEALTH_PATH}`);

    const warmupPayload = (await warmupResponse.json()) as {
      ready: boolean;
      templateCount: number;
      keys: string[];
    };
    const healthPayload = (await healthResponse.json()) as {
      status: string;
      ready: boolean;
      templateCount: number;
      keys: string[];
    };

    expect(warmupResponse.status).toBe(200);
    expect(warmupPayload.ready).toBe(true);
    expect(warmupPayload.templateCount).toBeGreaterThan(0);
    expect(warmupPayload.keys.length).toBeGreaterThan(0);

    expect(healthResponse.status).toBe(200);
    expect(healthPayload.status).toBe('ok');
    expect(healthPayload.ready).toBe(true);
  });

  it('recognizes a coherent result for a triangle-like gesture', async () => {
    runningServer = await listen();
    await fetch(`${runningServer.serverUrl}${GESTURE_RECOGNITION_WARMUP_PATH}`, { method: 'POST' });

    const response = await fetch(`${runningServer.serverUrl}${GESTURE_RECOGNITION_RECOGNIZE_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        points: [
          { x: 0.1, y: 0.9 },
          { x: 0.5, y: 0.1 },
          { x: 0.9, y: 0.9 },
          { x: 0.1, y: 0.9 }
        ],
        options: { debug: true }
      })
    });

    const payload = (await response.json()) as {
      matched: boolean;
      templateKey: string | null;
      score: number;
      debug?: { ranking: Array<{ templateKey: string; score: number }> };
    };

    expect(response.status).toBe(200);
    expect(payload.templateKey).not.toBeNull();
    expect(payload.score).toBeGreaterThan(0);
    expect((payload.debug?.ranking.length ?? 0) > 0).toBe(true);
  });
});


