import { ControllerSocket, SocketStatus } from './controllerSocket';
import { PointerCapture } from './pointerCapture';
import { ControllerMessage, GesturePoint } from './controllerTypes';
import { buildControllerId, readControllerAccessKey } from './controllerSecurity';

export class ControllerPage {
  private readonly controllerId: string;
  private readonly accessKey: string | null;
  private readonly socket: ControllerSocket;
  private readonly points: GesturePoint[] = [];
  private socketStatus: SocketStatus = 'disconnected';
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private voiceButton: HTMLButtonElement | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private voiceStream: MediaStream | null = null;
  private voiceChunks: BlobPart[] = [];
  private voiceStatus = 'voice: idle';
  private lastTranscript = '-';
  private lastSpell = '-';

  private static readonly RECORDING_MIME_CANDIDATES = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4'
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context is required');
    }

    this.context = context;
    this.controllerId = buildControllerId();
    this.accessKey = readControllerAccessKey(window.location.search);
    this.socket = new ControllerSocket(this.accessKey, (status) => {
      this.socketStatus = status;
      this.render();
    });
  }

  mount(surface: HTMLElement): void {
    const pointerCapture = new PointerCapture(surface, {
      onStart: (point) => this.pushPoint('gesture:start', point),
      onMove: (point) => this.pushPoint('gesture:move', point),
      onEnd: (point) => this.pushPoint('gesture:end', point)
    });

    pointerCapture.bind();
    this.createVoiceButton(surface);
    this.socket.connect();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.renderLoop();
  }

  private createVoiceButton(surface: HTMLElement): void {
    if (getComputedStyle(surface).position === 'static') {
      surface.style.position = 'relative';
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Hold to talk';
    button.style.position = 'absolute';
    button.style.right = '12px';
    button.style.bottom = '12px';
    button.style.zIndex = '20';
    button.style.padding = '10px 14px';
    button.style.border = '0';
    button.style.borderRadius = '9999px';
    button.style.background = '#0f172a';
    button.style.color = '#e2e8f0';
    button.style.font = '600 14px system-ui, sans-serif';

    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.startVoiceRecording();
    });

    const stopHandler = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      this.stopVoiceRecording();
    };

    button.addEventListener('pointerup', stopHandler);
    button.addEventListener('pointercancel', stopHandler);
    button.addEventListener('pointerleave', stopHandler);

    surface.appendChild(button);
    this.voiceButton = button;
  }

  private async startVoiceRecording(): Promise<void> {
    if (this.mediaRecorder?.state === 'recording') {
      return;
    }

    if (!this.accessKey) {
      this.voiceStatus = 'voice: missing access key';
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.voiceStatus = 'voice: recording unsupported';
      return;
    }

    try {
      this.voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = this.pickRecordingMimeType();
      this.mediaRecorder = mimeType
        ? new MediaRecorder(this.voiceStream, { mimeType })
        : new MediaRecorder(this.voiceStream);

      this.voiceChunks = [];
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.voiceChunks.push(event.data);
        }
      };
      this.mediaRecorder.onstop = () => {
        void this.sendRecordedVoice();
      };

      this.mediaRecorder.start();
      this.voiceStatus = 'voice: recording...';
      if (this.voiceButton) {
        this.voiceButton.textContent = 'Release to send';
        this.voiceButton.style.background = '#7f1d1d';
      }
    } catch (error) {
      this.voiceStatus = 'voice: microphone denied';
      console.error('[ControllerPage] Unable to access microphone:', error);
      this.stopTracks(this.voiceStream);
      this.voiceStream = null;
      this.mediaRecorder = null;
    }
  }

  private stopVoiceRecording(): void {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
      return;
    }
    this.mediaRecorder.stop();
  }

  private async sendRecordedVoice(): Promise<void> {
    const recorder = this.mediaRecorder;
    const stream = this.voiceStream;
    this.mediaRecorder = null;
    this.voiceStream = null;
    this.stopTracks(stream);

    if (this.voiceButton) {
      this.voiceButton.textContent = 'Hold to talk';
      this.voiceButton.style.background = '#0f172a';
    }

    if (!this.accessKey) {
      this.voiceStatus = 'voice: missing access key';
      return;
    }

    if (!recorder || this.voiceChunks.length === 0) {
      this.voiceStatus = 'voice: no audio captured';
      return;
    }

    const blob = new Blob(this.voiceChunks, { type: recorder.mimeType || 'audio/webm' });
    this.voiceChunks = [];
    this.voiceStatus = 'voice: sending...';

    try {
      const response = await fetch(`/voice/spell?k=${encodeURIComponent(this.accessKey)}`, {
        method: 'POST',
        headers: {
          'Content-Type': blob.type || 'audio/webm'
        },
        body: blob
      });

      if (!response.ok) {
        this.voiceStatus = `voice: HTTP ${response.status}`;
        return;
      }

      const payload = (await response.json()) as {
        spellName?: string | null;
        transcript?: string;
        confidence?: number;
      };

      const transcript = payload.transcript ?? '';
      const confidence = payload.confidence ?? 0;
      this.lastTranscript = transcript || '-';
      this.lastSpell = payload.spellName ?? '-';
      this.voiceStatus = `voice: ok (${Math.round(confidence * 100)}%)`;
    } catch (error) {
      this.voiceStatus = 'voice: request failed';
      console.error('[ControllerPage] Voice request failed:', error);
    }
  }

  private pickRecordingMimeType(): string | null {
    if (typeof MediaRecorder.isTypeSupported !== 'function') {
      return null;
    }

    for (const candidate of ControllerPage.RECORDING_MIME_CANDIDATES) {
      if (MediaRecorder.isTypeSupported(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  private stopTracks(stream: MediaStream | null): void {
    if (!stream) {
      return;
    }
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }

  private pushPoint(type: ControllerMessage['type'], point: GesturePoint): void {
    this.points.push(point);
    const message: ControllerMessage = {
      type,
      controllerId: this.controllerId,
      x: point.x,
      y: point.y,
      t: point.t
    };
    this.socket.send(message);
    if (type === 'gesture:end') {
      setTimeout(() => {
        this.points.length = 0;
      }, 120);
    }
  }

  private resize(): void {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
  }

  private renderLoop(): void {
    const frame = () => {
      this.render();
      window.requestAnimationFrame(frame);
    };
    frame();
  }

  private render(): void {
    this.context.fillStyle = '#141421';
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.points.length > 1) {
      this.context.strokeStyle = '#60a5fa';
      this.context.lineWidth = 3;
      this.context.beginPath();
      for (let index = 0; index < this.points.length; index += 1) {
        const point = this.points[index];
        const x = point.x * this.canvas.width;
        const y = point.y * this.canvas.height;
        if (index === 0) {
          this.context.moveTo(x, y);
        } else {
          this.context.lineTo(x, y);
        }
      }
      this.context.stroke();
    }

    this.context.fillStyle = '#d1d5db';
    this.context.font = '14px monospace';
    this.context.fillText(`status: ${this.socketStatus}`, 12, 20);
    this.context.fillText(`points: ${this.points.length}`, 12, 40);
    this.context.fillText(`queue: ${this.socket.getQueueSize()}`, 12, 60);
    this.context.fillText(`controller: ${this.controllerId}`, 12, 80);
    this.context.fillText(this.voiceStatus, 12, 100);
    this.context.fillText(`spell: ${this.lastSpell}`, 12, 120);
    this.context.fillText(`text: ${this.lastTranscript}`, 12, 140);
  }
}

