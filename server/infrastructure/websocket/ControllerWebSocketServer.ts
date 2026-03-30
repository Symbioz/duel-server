import * as WebSocket from 'ws';
import * as http from 'http';
import { Duplex } from 'stream';
import { ControllerSocketHandler } from './ControllerSocketHandler';
import { SecurityConfig } from '../../app-configuration/SecurityConfig';

/**
 * WebSocket server for controller connections.
 * Manages incoming connections and message routing.
 */
export class ControllerWebSocketServer {
  private wss: WebSocket.Server;
  private readonly activeSockets = new Set<WebSocket.WebSocket>();

  constructor(
    httpServer: http.Server,
    socketHandler: ControllerSocketHandler,
    private readonly securityConfig: SecurityConfig
  ) {
    this.wss = new WebSocket.Server({
      noServer: true,
      maxPayload: this.securityConfig.wsMaxPayloadBytes
    });

    this.wss.on('connection', (socket) => {
      this.activeSockets.add(socket);
      socket.on('close', () => {
        this.activeSockets.delete(socket);
      });
      socketHandler.handleConnection(socket);
    });

    httpServer.on('upgrade', (request, socket, head) => {
      this.handleUpgrade(request, socket, head);
    });

    console.log(`[WebSocketServer] Initialized at ws://*/ws/controller`);
  }

  private handleUpgrade(request: http.IncomingMessage, socket: Duplex, head: Buffer): void {
    const requestUrl = new URL(request.url || '/', 'http://localhost');

    if (requestUrl.pathname !== '/ws/controller') {
      this.rejectUpgrade(socket, 404, 'Not Found');
      return;
    }

    const accessKey = requestUrl.searchParams.get('k');
    if (!accessKey || accessKey !== this.securityConfig.controllerAccessKey) {
      this.rejectUpgrade(socket, 401, 'Unauthorized');
      return;
    }

    if (!this.isOriginAllowed(request.headers.origin)) {
      this.rejectUpgrade(socket, 403, 'Forbidden');
      return;
    }

    if (this.activeSockets.size >= this.securityConfig.maxControllers) {
      this.rejectUpgrade(socket, 503, 'Controller limit reached');
      return;
    }

    this.wss.handleUpgrade(request, socket, head, (upgradedSocket) => {
      this.wss.emit('connection', upgradedSocket, request);
    });
  }

  private isOriginAllowed(origin: string | undefined): boolean {
    if (this.securityConfig.allowedOrigins.length === 0) {
      return true;
    }

    if (!origin) {
      return false;
    }

    return this.securityConfig.allowedOrigins.includes(origin);
  }

  private rejectUpgrade(socket: Duplex, statusCode: number, message: string): void {
    socket.write(
      `HTTP/1.1 ${statusCode} ${message}\r\n` +
        'Connection: close\r\n' +
        'Content-Type: text/plain; charset=utf-8\r\n' +
        '\r\n'
    );
    socket.destroy();
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}
