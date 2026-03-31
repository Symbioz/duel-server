import * as http from 'http';
import { RecognizeGestureUseCase } from '../usecases/RecognizeGestureUseCase';
import { GestureRecognitionResult } from '../core-logic/entities/GestureRecognition';
import {
  FrontGestureResponse,
  FrontGestureTopMatch,
  FrontGestureRecognizeRequest,
  GESTURE_RECOGNITION_HEALTH_PATH,
  GESTURE_RECOGNITION_WARMUP_PATH,
  GESTURE_RECOGNITION_RECOGNIZE_PATH
} from '../infrastructure/gesture-recognition/gestureRecognitionHttpContract';

const MAX_GESTURE_BYTES = 512 * 1024; // 512 KB

const GESTURE_CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type'
};

/**
 * Convert our internal result (scores 0-1) to the front's expected format (scores 0-100).
 * threshold comes from the original request options and is echoed back.
 */
function toFrontGestureResponse(
  result: GestureRecognitionResult,
  threshold: number
): FrontGestureResponse {
  const score = Math.round(result.score * 100);
  const confidence = Math.round(result.confidence * 100);
  const distance = 100 - score;
  const passedThreshold = score >= threshold;

  const topMatches: FrontGestureTopMatch[] = (result.debug?.ranking ?? []).map((r) => {
    const rScore = Math.round(r.score * 100);
    return {
      gestureKey: r.templateKey,
      score: rScore,
      confidence: rScore,
      distance: 100 - rScore,
      threshold,
      passedThreshold: rScore >= threshold
    };
  });

  return {
    matchedGestureKey: result.templateKey,
    score,
    confidence,
    distance,
    threshold,
    passedThreshold,
    topMatches,
    debugData: null
  };
}

/**
 * Controller for gesture recognition API endpoints.
 * Handles /api/gesture-recognition/* routes.
 */
export class GestureRecognitionController {
  constructor(private recognizeGestureUseCase: RecognizeGestureUseCase) {}

  private getJsonHeaders(): Record<string, string> {
    return {
      'content-type': 'application/json; charset=utf-8',
      ...GESTURE_CORS_HEADERS
    };
  }

  /**
   * Handles CORS preflight requests.
   */
  handleCorsPreFlight(res: http.ServerResponse): void {
    res.writeHead(204, GESTURE_CORS_HEADERS);
    res.end();
  }

  /**
   * GET /api/gesture-recognition/health
   */
  async handleHealth(res: http.ServerResponse): Promise<void> {
    const payload = await this.recognizeGestureUseCase.health();
    res.writeHead(200, this.getJsonHeaders());
    res.end(JSON.stringify(payload));
  }

  /**
   * POST /api/gesture-recognition/warmup
   */
  async handleWarmup(res: http.ServerResponse): Promise<void> {
    const payload = await this.recognizeGestureUseCase.warmup();
    res.writeHead(200, this.getJsonHeaders());
    res.end(JSON.stringify(payload));
  }

  /**
   * POST /api/gesture-recognition/recognize
   * Body JSON: { points, templateKeys?, options?: { threshold, preferredGestureKey, scoringMode } }
   * Response: FrontGestureResponse (scores 0-100)
   */
  async handleRecognize(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const chunks: Buffer[] = [];
    let totalSize = 0;
    const jsonHeaders = this.getJsonHeaders();

    for await (const chunk of req) {
      totalSize += (chunk as Buffer).length;
      if (totalSize > MAX_GESTURE_BYTES) {
        res.writeHead(413, jsonHeaders);
        res.end(JSON.stringify({ error: 'Payload too large (max 512 KB)' }));
        return;
      }
      chunks.push(chunk as Buffer);
    }

    let body: FrontGestureRecognizeRequest;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as FrontGestureRecognizeRequest;
    } catch {
      res.writeHead(400, jsonHeaders);
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      return;
    }

    if (!Array.isArray(body.points) || body.points.length === 0) {
      res.writeHead(400, jsonHeaders);
      res.end(JSON.stringify({ error: 'Missing or empty "points" array' }));
      return;
    }

    // Map front options → internal options
    const frontOptions = body.options ?? {};
    const threshold = frontOptions.threshold ?? 0;
    const minScoreThreshold = threshold > 0 ? threshold / 100 : undefined;

    const result = await this.recognizeGestureUseCase.execute({
      points: body.points,
      templateKeys: body.templateKeys,
      options: {
        minScoreThreshold,
        debug: true // needed to populate topMatches
      }
    });

    res.writeHead(200, jsonHeaders);
    res.end(JSON.stringify(toFrontGestureResponse(result, threshold)));
  }

  /**
   * Route dispatcher for gesture recognition endpoints.
   */
  async dispatch(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    path: string
  ): Promise<void> {
    if (req.method === 'OPTIONS') {
      this.handleCorsPreFlight(res);
      return;
    }

    if (!this.recognizeGestureUseCase) {
      res.writeHead(503, this.getJsonHeaders());
      res.end(JSON.stringify({ error: 'Gesture recognition not configured' }));
      return;
    }

    if (req.method === 'GET' && path === GESTURE_RECOGNITION_HEALTH_PATH) {
      await this.handleHealth(res);
      return;
    }

    if (req.method === 'POST' && path === GESTURE_RECOGNITION_WARMUP_PATH) {
      await this.handleWarmup(res);
      return;
    }

    if (req.method === 'POST' && path === GESTURE_RECOGNITION_RECOGNIZE_PATH) {
      await this.handleRecognize(req, res);
      return;
    }

    res.writeHead(404, this.getJsonHeaders());
    res.end(JSON.stringify({ error: 'Not found' }));
  }
}

