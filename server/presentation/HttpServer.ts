import * as http from 'http';
import { getControllerPageHtml } from './ControllerPageGenerator';
import { RecognizeSpellUseCase } from '../usecases/RecognizeSpellUseCase';
import { RecognizeGestureUseCase } from '../usecases/RecognizeGestureUseCase';
import { GESTURE_RECOGNITION_BASE_PATH } from '../infrastructure/gesture-recognition/gestureRecognitionHttpContract';
import { GestureRecognitionController } from './GestureRecognitionController';
import { VoiceSpellController } from './VoiceSpellController';


/**
 * HTTP server handling all routes: controller page, WebSocket upgrade,
 * gesture recognition API and voice spell recognition.
 */
export class HttpServer {
  private server: http.Server;
  private readonly controllerAccessKey: string;
  private readonly port: number;
  private readonly host: string;
  private recognizeSpellUseCase: RecognizeSpellUseCase | null = null;
  private recognizeGestureUseCase: RecognizeGestureUseCase | null = null;
  private gestureRecognitionController: GestureRecognitionController | null = null;
  private voiceSpellController: VoiceSpellController | null = null;

  constructor(port: number, host: string = '0.0.0.0', controllerAccessKey: string) {
    this.port = port;
    this.host = host;
    this.controllerAccessKey = controllerAccessKey;
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });
  }

  setRecognizeSpellUseCase(useCase: RecognizeSpellUseCase, maxAudioBytes?: number): void {
    this.recognizeSpellUseCase = useCase;
    this.voiceSpellController = new VoiceSpellController(useCase, this.controllerAccessKey, maxAudioBytes);
  }

  setRecognizeGestureUseCase(useCase: RecognizeGestureUseCase): void {
    this.recognizeGestureUseCase = useCase;
    this.gestureRecognitionController = new GestureRecognitionController(useCase);
  }

  listen(): Promise<void> {
    return new Promise((resolve, reject) => {
      const onError = (error: Error) => {
        this.server.off('listening', onListening);
        reject(error);
      };
      const onListening = () => {
        this.server.off('error', onError);
        console.log(`[HttpServer] Listening on http://${this.host}:${this.port}`);
        resolve();
      };
      this.server.once('error', onError);
      this.server.once('listening', onListening);
      this.server.listen(this.port, this.host);
    });
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const parsedUrl = new URL(req.url || '/', 'http://localhost');
    const path = parsedUrl.pathname;

    // --- Gesture recognition API (no auth, CORS enabled) ---
    if (path.startsWith(GESTURE_RECOGNITION_BASE_PATH)) {
      if (req.method === 'OPTIONS') {
        this.gestureRecognitionController?.handleCorsPreFlight(res);
        return;
      }
      this.handleGestureApi(req, res, path).catch((err) => {
        console.error('[HttpServer] /api/gesture-recognition error:', err);
        res.writeHead(500, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      });
      return;
    }

    // --- Voice spell recognition (auth required) ---
    if (req.method === 'POST' && path === '/voice/spell') {
      const accessKey = parsedUrl.searchParams.get('k');
      this.voiceSpellController?.handleSpellRecognition(req, res, accessKey).catch((err) => {
        console.error('[HttpServer] /voice/spell error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      });
      return;
    }

    // --- GET-only routes below ---
    if (req.method !== 'GET') {
      res.writeHead(405);
      res.end('Method not allowed');
      return;
    }

    if (path === '/' || path === '/controller') {
      const accessKey = parsedUrl.searchParams.get('k');
      if (!accessKey || accessKey !== this.controllerAccessKey) {
        res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Unauthorized. Use /controller?k=<access-key>.');
        return;
      }
      const html = getControllerPageHtml();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } else if (path === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  }

  // ---------------------------------------------------------------------------
  // Gesture recognition API
  // ---------------------------------------------------------------------------

  private async handleGestureApi(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    path: string
  ): Promise<void> {
    if (!this.gestureRecognitionController) {
      res.writeHead(503, {
        'content-type': 'application/json; charset=utf-8',
        'access-control-allow-origin': '*'
      });
      res.end(JSON.stringify({ error: 'Gesture recognition not configured' }));
      return;
    }

    await this.gestureRecognitionController.dispatch(req, res, path);
  }

  // ---------------------------------------------------------------------------

  getServer(): http.Server {
    return this.server;
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

