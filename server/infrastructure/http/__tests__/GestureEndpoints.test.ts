import { afterEach, describe, expect, it } from 'vitest';
import { HttpServer } from '../HttpServer';
import { RecognizeGestureUseCase } from '../../../usecases/RecognizeGestureUseCase';
import { GestureRecognitionResult } from '../../../core-logic/entities/GestureRecognition';
import {
  GESTURE_RECOGNITION_HEALTH_PATH,
  GESTURE_RECOGNITION_RECOGNIZE_PATH,
  GESTURE_RECOGNITION_WARMUP_PATH,
  FrontGestureResponse
} from '../../gesture-recognition/gestureRecognitionHttpContract';

// ---------------------------------------------------------------------------
// Stub use case — no SVG loading, predictable results
// ---------------------------------------------------------------------------

class StubRecognizeGestureUseCase {
  readonly warmupResponse = {
    ready: true,
    templateCount: 2,
    keys: ['expelliarmus', 'protego']
  };

  async warmup() {
    return this.warmupResponse;
  }

  async health() {
    return {
      status: 'ok' as const,
      ready: true,
      templateCount: 2,
      keys: ['expelliarmus', 'protego']
    };
  }

  async execute(_request: unknown): Promise<GestureRecognitionResult> {
    return {
      matched: true,
      templateKey: 'expelliarmus',
      spellName: 'expelliarmus',
      score: 0.89,
      confidence: 0.91,
      debug: {
        normalizedInputPoints: 4,
        evaluatedTemplates: 2,
        ranking: [
          {
            templateKey: 'expelliarmus',
            spellName: 'expelliarmus',
            score: 0.89,
            polylineScore: 0.88,
            coverageScore: 0.92
          },
          {
            templateKey: 'protego',
            spellName: 'protego',
            score: 0.42,
            polylineScore: 0.40,
            coverageScore: 0.46
          }
        ]
      }
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBaseUrl(server: HttpServer): string {
  const address = server.getServer().address();
  if (!address || typeof address === 'string') {
    throw new Error('Expected an inet server address');
  }
  return `http://127.0.0.1:${address.port}`;
}

const SAMPLE_POINTS = [
  { x: 0.1, y: 0.9 },
  { x: 0.5, y: 0.1 },
  { x: 0.9, y: 0.9 },
  { x: 0.1, y: 0.9 }
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HttpServer — gesture recognition endpoints', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  async function startServer(): Promise<{ server: HttpServer; baseUrl: string }> {
    const stub = new StubRecognizeGestureUseCase();
    const httpServer = new HttpServer(0, '127.0.0.1', 'test-key');
    httpServer.setRecognizeGestureUseCase(stub as unknown as RecognizeGestureUseCase);
    await httpServer.listen();
    server = httpServer;
    return { server: httpServer, baseUrl: getBaseUrl(httpServer) };
  }

  // --- health ---

  it('GET /api/gesture-recognition/health → 200 with keys and status ok', async () => {
    const { baseUrl } = await startServer();

    const res = await fetch(`${baseUrl}${GESTURE_RECOGNITION_HEALTH_PATH}`);
    const body = (await res.json()) as { status: string; ready: boolean; keys: string[] };

    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.ready).toBe(true);
    expect(body.keys).toContain('expelliarmus');
  });

  it('GET /api/gesture-recognition/health has CORS header', async () => {
    const { baseUrl } = await startServer();
    const res = await fetch(`${baseUrl}${GESTURE_RECOGNITION_HEALTH_PATH}`);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('OPTIONS /api/gesture-recognition/health → 204 CORS preflight', async () => {
    const { baseUrl } = await startServer();
    const res = await fetch(`${baseUrl}${GESTURE_RECOGNITION_HEALTH_PATH}`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-methods')).toContain('POST');
  });

  // --- warmup ---

  it('POST /api/gesture-recognition/warmup → 200 with templateCount and keys', async () => {
    const { baseUrl } = await startServer();

    const res = await fetch(`${baseUrl}${GESTURE_RECOGNITION_WARMUP_PATH}`, { method: 'POST' });
    const body = (await res.json()) as { ready: boolean; templateCount: number; keys: string[] };

    expect(res.status).toBe(200);
    expect(body.ready).toBe(true);
    expect(body.templateCount).toBe(2);
    expect(body.keys).toEqual(['expelliarmus', 'protego']);
  });

  // --- recognize ---

  it('POST /api/gesture-recognition/recognize → 200 with front format (score 0-100)', async () => {
    const { baseUrl } = await startServer();

    const res = await fetch(`${baseUrl}${GESTURE_RECOGNITION_RECOGNIZE_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        points: SAMPLE_POINTS,
        options: { threshold: 72 }
      })
    });

    const body = (await res.json()) as FrontGestureResponse;

    expect(res.status).toBe(200);
    expect(body.matchedGestureKey).toBe('expelliarmus');
    expect(body.score).toBe(89);       // Math.round(0.89 * 100)
    expect(body.confidence).toBe(91);  // Math.round(0.91 * 100)
    expect(body.distance).toBe(11);    // 100 - 89
    expect(body.threshold).toBe(72);
    expect(body.passedThreshold).toBe(true);  // 89 >= 72
    expect(Array.isArray(body.topMatches)).toBe(true);
    expect(body.topMatches.length).toBeGreaterThan(0);
    expect(body.topMatches[0].gestureKey).toBe('expelliarmus');
    expect(body.debugData).toBeNull();
  });

  it('topMatches second entry is not passedThreshold when below threshold', async () => {
    const { baseUrl } = await startServer();

    const res = await fetch(`${baseUrl}${GESTURE_RECOGNITION_RECOGNIZE_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ points: SAMPLE_POINTS, options: { threshold: 72 } })
    });

    const body = (await res.json()) as FrontGestureResponse;
    const second = body.topMatches[1];
    expect(second.gestureKey).toBe('protego');
    expect(second.score).toBe(42);           // Math.round(0.42 * 100)
    expect(second.passedThreshold).toBe(false); // 42 < 72
  });

  it('recognize with no threshold → threshold echoed as 0', async () => {
    const { baseUrl } = await startServer();

    const res = await fetch(`${baseUrl}${GESTURE_RECOGNITION_RECOGNIZE_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ points: SAMPLE_POINTS })
    });

    const body = (await res.json()) as FrontGestureResponse;
    expect(res.status).toBe(200);
    expect(body.threshold).toBe(0);
    expect(body.passedThreshold).toBe(true); // any score >= 0
  });

  it('recognize with empty points → 400', async () => {
    const { baseUrl } = await startServer();

    const res = await fetch(`${baseUrl}${GESTURE_RECOGNITION_RECOGNIZE_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ points: [] })
    });

    expect(res.status).toBe(400);
  });

  it('recognize with invalid JSON → 400', async () => {
    const { baseUrl } = await startServer();

    const res = await fetch(`${baseUrl}${GESTURE_RECOGNITION_RECOGNIZE_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json'
    });

    expect(res.status).toBe(400);
  });

  // --- 503 when use case not configured ---

  it('returns 503 when gesture use case not set', async () => {
    const httpServer = new HttpServer(0, '127.0.0.1', 'test-key');
    server = httpServer;
    await httpServer.listen();
    const baseUrl = getBaseUrl(httpServer);

    const res = await fetch(`${baseUrl}${GESTURE_RECOGNITION_HEALTH_PATH}`);
    expect(res.status).toBe(503);
  });
});

