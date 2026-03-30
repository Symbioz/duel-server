import * as WebSocket from 'ws';
import { parseControllerMessage, messageToGesturePoint } from './controllerMessageTypes';
import { GestureControllerBridge } from '../gesture-session/GestureControllerBridge';
import { ControllerSessionStore } from './controllerSessionStore';

interface RateLimitWindow {
  windowStartedAt: number;
  count: number;
}

/**
 * WebSocket handler for controller messages.
 * Pure transport adapter: receives messages, validates shape, calls use cases.
 * No business logic here.
 */
export class ControllerSocketHandler {
  private readonly rateLimitWindowBySocket = new WeakMap<WebSocket.WebSocket, RateLimitWindow>();

  constructor(
    private readonly gestureControllerBridge: GestureControllerBridge,
    private readonly controllerSessionStore: ControllerSessionStore,
    private readonly wsRateLimitPerSecond: number
  ) {}

  handleConnection(socket: WebSocket.WebSocket): void {
    console.log('[ControllerSocket] New connection');

    socket.on('message', async (data: WebSocket.RawData) => {
      try {
        if (!this.consumeRateLimit(socket)) {
          throw new Error('Rate limit exceeded for this connection');
        }

        const rawText = typeof data === 'string' ? data : data.toString('utf-8');
        const rawMessage = JSON.parse(rawText);
        const message = parseControllerMessage(rawMessage);
        const currentOwnerSocket = this.controllerSessionStore.getSocket(message.controllerId);

        if (currentOwnerSocket && currentOwnerSocket !== socket) {
          throw new Error(`controllerId ${message.controllerId} is already used by another connection`);
        }

        if (!currentOwnerSocket && message.type !== 'gesture:start') {
          throw new Error(`First message for ${message.controllerId} must be gesture:start`);
        }

        switch (message.type) {
          case 'gesture:start': {
            const point = messageToGesturePoint(message);
            this.controllerSessionStore.bind(message.controllerId, socket);
            await this.gestureControllerBridge.startGesture(message.controllerId, point);
            console.log(`[ControllerSocket] Gesture started for ${message.controllerId}`);
            break;
          }

          case 'gesture:move': {
            const point = messageToGesturePoint(message);
            await this.gestureControllerBridge.updateGesture(message.controllerId, point);
            break;
          }

          case 'gesture:end': {
            const point = messageToGesturePoint(message);
            await this.gestureControllerBridge.endGesture(message.controllerId, point);
            console.log(`[ControllerSocket] Gesture ended for ${message.controllerId}`);
            break;
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[ControllerSocket] Error processing message: ${errorMsg}`);
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ error: errorMsg }));
        }

        if (errorMsg.includes('Rate limit exceeded')) {
          socket.close(1008, 'Rate limit exceeded');
        }
      }
    });

    socket.on('close', () => {
      this.controllerSessionStore.unbindBySocket(socket);
      console.log(`[ControllerSocket] Connection closed`);
    });

    socket.on('error', (error) => {
      console.error(`[ControllerSocket] Socket error: ${error.message}`);
    });
  }

  private consumeRateLimit(socket: WebSocket.WebSocket): boolean {
    const now = Date.now();
    const current = this.rateLimitWindowBySocket.get(socket);

    if (!current || now - current.windowStartedAt >= 1000) {
      this.rateLimitWindowBySocket.set(socket, { windowStartedAt: now, count: 1 });
      return true;
    }

    current.count += 1;
    return current.count <= this.wsRateLimitPerSecond;
  }
}
