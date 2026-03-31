/**
 * HTML page served to phone controllers.
 * Provides a touch surface and WebSocket connection to the server.
 */
export function getControllerPageHtml(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <title>Duel Controller</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      width: 100vw;
      height: 100vh;
      background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      overflow: hidden;
    }

    #touchSurface {
      width: 100%;
      height: 100%;
      touch-action: none;
      user-select: none;
      position: relative;
    }

    #canvas {
      display: block;
      width: 100%;
      height: 100%;
    }

    #status {
      position: absolute;
      bottom: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-family: monospace;
      z-index: 10;
      min-width: 200px;
    }

    .status-connected {
      color: #4ade80;
    }

    .status-disconnected {
      color: #ef4444;
    }

    .status-gesture {
      color: #60a5fa;
    }

    #debug {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-family: monospace;
      z-index: 10;
      max-width: 200px;
      text-align: right;
    }

    .debug-line {
      margin: 2px 0;
    }
  </style>
</head>
<body>
  <div id="touchSurface">
    <canvas id="canvas"></canvas>
    <div id="status" class="status-disconnected">
      <div>Status: <span id="statusText">Disconnected</span></div>
      <div>Points: <span id="pointCount">0</span></div>
      <div>Controller: <span id="controllerId">-</span></div>
    </div>
    <div id="debug">
      <div class="debug-line">FPS: <span id="fps">--</span></div>
      <div class="debug-line">Gesture: <span id="gestureState">idle</span></div>
      <div class="debug-line">Queue: <span id="queue">0</span></div>
    </div>
  </div>

  <script>
    class ControllerClient {
      constructor() {
        this.ws = null;
        this.controllerId = this.buildControllerId();
        this.accessKey = this.readAccessKey();
        this.isConnected = false;
        this.isGestureActive = false;
        this.points = [];
        this.messageQueue = [];
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.lastFrameTime = performance.now();
        this.frameCount = 0;

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.setupTouchHandling();
        this.connect();
        this.startAnimationLoop();
        this.setupFpsCounter();

        this.updateUI();
      }

      connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const query = this.accessKey ? \`?k=\${encodeURIComponent(this.accessKey)}\` : '';
        const wsUrl = \`\${protocol}//\${window.location.host}/ws/controller\${query}\`;

        try {
          this.ws = new WebSocket(wsUrl);
          this.ws.onopen = () => this.onConnected();
          this.ws.onmessage = (e) => this.onMessage(e);
          this.ws.onerror = (e) => this.onError(e);
          this.ws.onclose = () => this.onClosed();
        } catch (e) {
          console.error('WebSocket error:', e);
          setTimeout(() => this.connect(), 2000);
        }
      }

      readAccessKey() {
        return new URLSearchParams(window.location.search).get('k');
      }

      buildControllerId() {
        const randomPart = Math.random().toString(36).slice(2, 10);
        return \`player-\${randomPart}\`;
      }

      onConnected() {
        console.log('Connected to server');
        this.isConnected = true;
        this.flushQueue();
        this.updateUI();
      }

      onMessage(event) {
        const msg = JSON.parse(event.data);
        if (msg.error) {
          console.error('Server error:', msg.error);
        }
      }

      onError(error) {
        console.error('WebSocket error:', error);
      }

      onClosed() {
        console.log('Disconnected from server');
        this.isConnected = false;
        this.updateUI();
        setTimeout(() => this.connect(), 3000);
      }

      setupTouchHandling() {
        const surface = document.getElementById('touchSurface');

        surface.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        surface.addEventListener('pointermove', (e) => this.onPointerMove(e));
        surface.addEventListener('pointerup', (e) => this.onPointerUp(e));
        surface.addEventListener('pointercancel', (e) => this.onPointerUp(e));
      }

      onPointerDown(e) {
        e.preventDefault();
        if (this.isGestureActive || !this.isConnected) return;

        this.isGestureActive = true;
        this.points = [];
        const point = this.getPointerPosition(e);
        this.points.push(point);
        this.sendMessage('gesture:start', point);
        this.updateUI();
      }

      onPointerMove(e) {
        e.preventDefault();
        if (!this.isGestureActive || !this.isConnected) return;

        const point = this.getPointerPosition(e);
        this.points.push(point);
        this.sendMessage('gesture:move', point);
      }

      onPointerUp(e) {
        e.preventDefault();
        if (!this.isGestureActive) return;

        const point = this.getPointerPosition(e);
        this.points.push(point);
        this.sendMessage('gesture:end', point);
        this.isGestureActive = false;
        this.updateUI();
      }

      getPointerPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const t = Date.now();

        return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)), t };
      }

      sendMessage(type, point) {
        const msg = {
          type,
          controllerId: this.controllerId,
          x: point.x,
          y: point.y,
          t: Math.floor(point.t)
        };

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(msg));
        } else {
          this.messageQueue.push(msg);
        }
      }

      flushQueue() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          return;
        }

        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          if (!message) {
            break;
          }
          this.ws.send(JSON.stringify(message));
        }
      }

      updateUI() {
        document.getElementById('statusText').textContent = this.isConnected ? 'Connected' : 'Disconnected';
        document.getElementById('controllerId').textContent = this.controllerId;
        document.getElementById('pointCount').textContent = this.points.length;
        document.getElementById('gestureState').textContent = this.isGestureActive ? 'active' : 'idle';
        document.getElementById('queue').textContent = this.messageQueue.length;

        const statusEl = document.getElementById('status');
        statusEl.className = this.isConnected ? 'status-connected' : 'status-disconnected';
      }

      startAnimationLoop() {
        const animate = () => {
          this.draw();
          this.frameCount++;
          requestAnimationFrame(animate);
        };
        animate();
      }

      setupFpsCounter() {
        setInterval(() => {
          const now = performance.now();
          const elapsed = now - this.lastFrameTime;
          const fps = Math.round((this.frameCount * 1000) / elapsed);
          document.getElementById('fps').textContent = fps;
          this.frameCount = 0;
          this.lastFrameTime = now;
        }, 1000);
      }

      draw() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear with dark gradient
        const gradient = this.ctx.createLinearGradient(0, 0, w, h);
        gradient.addColorStop(0, '#1e1e2e');
        gradient.addColorStop(1, '#2d2d44');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, w, h);

        // Draw grid
        this.drawGrid();

        // Draw gesture trail
        if (this.points.length > 0) {
          this.drawTrail();
        }
      }

      drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;

        const gridSize = 10;
        const w = this.canvas.width;
        const h = this.canvas.height;

        for (let i = 0; i <= gridSize; i++) {
          const x = (w / gridSize) * i;
          const y = (h / gridSize) * i;

          this.ctx.beginPath();
          this.ctx.moveTo(x, 0);
          this.ctx.lineTo(x, h);
          this.ctx.stroke();

          this.ctx.beginPath();
          this.ctx.moveTo(0, y);
          this.ctx.lineTo(w, y);
          this.ctx.stroke();
        }
      }

      drawTrail() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Draw line trail
        this.ctx.strokeStyle = this.isGestureActive ? '#60a5fa' : '#888';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        for (let i = 0; i < this.points.length; i++) {
          const px = this.points[i].x * w;
          const py = this.points[i].y * h;

          if (i === 0) {
            this.ctx.moveTo(px, py);
          } else {
            this.ctx.lineTo(px, py);
          }
        }
        this.ctx.stroke();

        // Draw points
        for (let i = 0; i < this.points.length; i++) {
          const px = this.points[i].x * w;
          const py = this.points[i].y * h;

          if (i === 0) {
            this.ctx.fillStyle = '#4ade80';
            this.ctx.beginPath();
            this.ctx.arc(px, py, 8, 0, Math.PI * 2);
            this.ctx.fill();
          } else if (i === this.points.length - 1 && !this.isGestureActive) {
            this.ctx.fillStyle = '#ef4444';
            this.ctx.beginPath();
            this.ctx.arc(px, py, 8, 0, Math.PI * 2);
            this.ctx.fill();
          }
        }
      }

      resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
      }
    }

    // Start the client when DOM is loaded
    window.addEventListener('DOMContentLoaded', () => {
      new ControllerClient();
    });
  </script>
</body>
</html>
  `.trim();
}


