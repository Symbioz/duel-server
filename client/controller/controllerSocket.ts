import { ControllerMessage } from './controllerTypes';
import { buildControllerWebSocketUrl } from './controllerSecurity';

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'missing-access-key';

export class ControllerSocket {
  private ws: WebSocket | null = null;
  private queue: ControllerMessage[] = [];
  private reconnectTimer: number | null = null;
  private readonly accessKey: string | null;
  private readonly onStatusChanged: (status: SocketStatus) => void;

  constructor(accessKey: string | null, onStatusChanged: (status: SocketStatus) => void) {
    this.accessKey = accessKey;
    this.onStatusChanged = onStatusChanged;
  }

  connect(): void {
    if (!this.accessKey) {
      this.onStatusChanged('missing-access-key');
      return;
    }

    this.onStatusChanged('connecting');
    const wsUrl = buildControllerWebSocketUrl(window.location, this.accessKey);

    this.ws = new WebSocket(wsUrl);
    this.ws.onopen = () => {
      this.onStatusChanged('connected');
      this.flushQueue();
    };
    this.ws.onclose = () => {
      this.onStatusChanged('disconnected');
      this.scheduleReconnect();
    };
    this.ws.onerror = () => {
      this.onStatusChanged('disconnected');
    };
  }

  send(message: ControllerMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return;
    }
    this.queue.push(message);
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  private flushQueue(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) {
        break;
      }
      this.ws.send(JSON.stringify(item));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2000);
  }
}

