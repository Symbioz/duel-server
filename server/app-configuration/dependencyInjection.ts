import * as http from 'http';
import { InMemoryGestureSessionRepository } from '../infrastructure/gesture-session/InMemoryGestureSessionRepository';
import { DefaultGestureCompletionHandler } from '../infrastructure/gesture-session/DefaultGestureCompletionHandler';
import { StartGestureUseCase } from '../usecases/StartGestureUseCase';
import { UpdateGestureUseCase } from '../usecases/UpdateGestureUseCase';
import { EndGestureUseCase } from '../usecases/EndGestureUseCase';
import { RecognizeSpellUseCase } from '../usecases/RecognizeSpellUseCase';
import { RecognizeGestureUseCase } from '../usecases/RecognizeGestureUseCase';
import { ControllerSocketHandler } from '../infrastructure/websocket/ControllerSocketHandler';
import { ControllerWebSocketServer } from '../infrastructure/websocket/ControllerWebSocketServer';
import { GestureControllerBridge } from '../infrastructure/gesture-session/GestureControllerBridge';
import { ControllerSessionStore } from '../infrastructure/websocket/controllerSessionStore';
import { VoxtralTranscriptionService } from '../infrastructure/voice/VoxtralTranscriptionService';
import { GestureRecognitionBackend } from '../infrastructure/gesture-recognition/GestureRecognitionBackend';
import { HttpServer } from '../presentation/HttpServer';
import { SecurityConfig } from './SecurityConfig';
import { VoxtralConfig } from '../../app.config';

/**
 * Application factory and configuration.
 * Assembles all dependencies and creates the server.
 */
export class DependencyInjection {
  private httpServer: http.Server;
  private wsServer: ControllerWebSocketServer;

  constructor(
    httpServer: HttpServer,
    securityConfig: SecurityConfig,
    voxtralConfig: VoxtralConfig
  ) {
    this.httpServer = httpServer.getServer();

    // Infrastructure: repositories and handlers
    const gestureRepository = new InMemoryGestureSessionRepository();
    const completionHandler = new DefaultGestureCompletionHandler();

    // Use cases — gestures (WebSocket session lifecycle)
    const startGestureUseCase = new StartGestureUseCase(gestureRepository);
    const updateGestureUseCase = new UpdateGestureUseCase(gestureRepository);
    const endGestureUseCase = new EndGestureUseCase(gestureRepository, completionHandler);
    const gestureControllerBridge = new GestureControllerBridge(
      startGestureUseCase,
      updateGestureUseCase,
      endGestureUseCase
    );
    const controllerSessionStore = new ControllerSessionStore();

    // Use case — gesture glyph recognition (deterministic, no AI)
    const gestureRecognitionBackend = new GestureRecognitionBackend();
    const recognizeGestureUseCase = new RecognizeGestureUseCase(gestureRecognitionBackend);
    httpServer.setRecognizeGestureUseCase(recognizeGestureUseCase);
    // Warm up templates in background so first request is fast
    recognizeGestureUseCase.warmup().then(() => {
      console.log('[GestureRecognition] Templates loaded and ready');
    }).catch((err: unknown) => {
      console.warn('[GestureRecognition] Warmup failed (will retry on first request):', err);
    });

    // Use case — voice spell recognition (optional, requires MISTRAL_API_KEY)
    if (voxtralConfig.apiKey) {
      const transcriptionService = new VoxtralTranscriptionService({
        apiKey: voxtralConfig.apiKey,
        baseUrl: voxtralConfig.baseUrl ?? undefined,
        model: voxtralConfig.model,
        timeoutMs: voxtralConfig.timeoutMs,
      });
      const recognizeSpellUseCase = new RecognizeSpellUseCase(transcriptionService);
      httpServer.setRecognizeSpellUseCase(recognizeSpellUseCase, voxtralConfig.maxAudioBytes);
      console.log(`[Voice] Spell recognition enabled (model: ${voxtralConfig.model})`);
    } else {
      console.log('[Voice] Spell recognition disabled (set MISTRAL_API_KEY to enable)');
    }

    // Transport layer
    const socketHandler = new ControllerSocketHandler(
      gestureControllerBridge,
      controllerSessionStore,
      securityConfig.wsRateLimitPerSecond
    );

    this.wsServer = new ControllerWebSocketServer(this.httpServer, socketHandler, securityConfig);
  }

  getHttpServer(): http.Server {
    return this.httpServer;
  }

  async shutdown(): Promise<void> {
    await this.wsServer.close();
  }
}
