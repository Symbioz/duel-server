import http, { IncomingMessage, ServerResponse } from 'node:http';
import {
  GESTURE_RECOGNITION_BASE_PATH,
  GESTURE_RECOGNITION_HEALTH_PATH,
  GESTURE_RECOGNITION_RECOGNIZE_PATH,
  GESTURE_RECOGNITION_WARMUP_PATH,
  GestureRecognitionRecognizeRequest,
  GestureRecognitionWarmupResponse
} from '../infrastructure/gesture-recognition/gestureRecognitionHttpContract';
import { GestureRecognitionBackend } from '../infrastructure/gesture-recognition/GestureRecognitionBackend';

export type GestureRecognitionHttpControllerOptions = {
  backend?: GestureRecognitionBackend;
  allowOrigin?: string;
};

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8'
} as const;

const createCorsHeaders = (allowOrigin: string): Record<string, string> => ({
  'access-control-allow-origin': allowOrigin,
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type'
});

const writeJson = (
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
  allowOrigin: string
): void => {
  response.writeHead(statusCode, {
    ...JSON_HEADERS,
    ...createCorsHeaders(allowOrigin)
  });
  response.end(JSON.stringify(payload));
};

const readJsonBody = async <TBody>(request: IncomingMessage): Promise<TBody> => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {} as TBody;
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as TBody;
};

export const createGestureRecognitionHttpController = (
  options: GestureRecognitionHttpControllerOptions = {}
): http.Server => {
  const backend = options.backend ?? new GestureRecognitionBackend();
  const allowOrigin = options.allowOrigin ?? '*';

  return http.createServer(async (request, response) => {
    const method = request.method ?? 'GET';
    const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    const pathname = requestUrl.pathname;

    if (method === 'OPTIONS' && pathname.startsWith(GESTURE_RECOGNITION_BASE_PATH)) {
      response.writeHead(204, createCorsHeaders(allowOrigin));
      response.end();
      return;
    }

    try {
      if (method === 'GET' && pathname === GESTURE_RECOGNITION_HEALTH_PATH) {
        const payload = await backend.health();
        writeJson(response, 200, payload, allowOrigin);
        return;
      }

      if (method === 'POST' && pathname === GESTURE_RECOGNITION_WARMUP_PATH) {
        const payload: GestureRecognitionWarmupResponse = await backend.warmup();
        writeJson(response, 200, payload, allowOrigin);
        return;
      }

      if (method === 'POST' && pathname === GESTURE_RECOGNITION_RECOGNIZE_PATH) {
        const body = await readJsonBody<GestureRecognitionRecognizeRequest>(request);
        const result = await backend.recognize(body);
        writeJson(response, 200, result, allowOrigin);
        return;
      }

      writeJson(response, 404, { error: 'Not found' }, allowOrigin);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown gesture recognition error.';
      writeJson(response, 500, { error: message }, allowOrigin);
    }
  });
};

