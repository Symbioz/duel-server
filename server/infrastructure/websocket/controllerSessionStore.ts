import WebSocket from 'ws';

export class ControllerSessionStore {
  private readonly socketsByControllerId = new Map<string, WebSocket>();

  bind(controllerId: string, socket: WebSocket): void {
    this.socketsByControllerId.set(controllerId, socket);
  }

  unbindBySocket(socket: WebSocket): void {
    for (const [controllerId, currentSocket] of this.socketsByControllerId.entries()) {
      if (currentSocket === socket) {
        this.socketsByControllerId.delete(controllerId);
      }
    }
  }

  getSocket(controllerId: string): WebSocket | undefined {
    return this.socketsByControllerId.get(controllerId);
  }
}

