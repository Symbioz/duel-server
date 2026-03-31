import { afterEach, describe, expect, it } from 'vitest';
import { TranscriptionService } from '../../common-ports/VoicePorts';
import { HttpServer } from '../HttpServer';
import { RecognizeSpellUseCase } from '../../usecases/RecognizeSpellUseCase';

class RecordingTranscriptionService implements TranscriptionService {
  lastAudioBuffer: Buffer | null = null;
  lastMimeType: string | null = null;

  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<string> {
    this.lastAudioBuffer = audioBuffer;
    this.lastMimeType = mimeType;
    return 'expelliarmus';
  }
}

class TimeoutTranscriptionService implements TranscriptionService {
  async transcribe(_audioBuffer: Buffer, _mimeType: string): Promise<string> {
    const error = new Error('Voice transcription timed out after 1200ms');
    error.name = 'VoiceTranscriptionTimeoutError';
    throw error;
  }
}

function getBaseUrl(server: HttpServer): string {
  const address = server.getServer().address();
  if (!address || typeof address === 'string') {
    throw new Error('Expected an inet server address');
  }
  return `http://127.0.0.1:${address.port}`;
}

describe('HttpServer /voice/spell', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('accepts binary audio payloads with audio/* content type', async () => {
    const transcriptionService = new RecordingTranscriptionService();
    server = new HttpServer(0, '127.0.0.1', 'shared-secret');
    server.setRecognizeSpellUseCase(new RecognizeSpellUseCase(transcriptionService));
    await server.listen();

    const audioBuffer = Buffer.from([1, 2, 3, 4, 5]);
    const response = await fetch(`${getBaseUrl(server)}/voice/spell?k=shared-secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'audio/webm' },
      body: audioBuffer
    });

    expect(response.status).toBe(200);
    expect(transcriptionService.lastMimeType).toBe('audio/webm');
    expect(transcriptionService.lastAudioBuffer).toEqual(audioBuffer);

    const body = (await response.json()) as { transcript?: string };
    expect(body.transcript).toBe('expelliarmus');
  });

  it('rejects JSON payloads with unsupported media type', async () => {
    const transcriptionService = new RecordingTranscriptionService();
    server = new HttpServer(0, '127.0.0.1', 'shared-secret');
    server.setRecognizeSpellUseCase(new RecognizeSpellUseCase(transcriptionService));
    await server.listen();

    const response = await fetch(`${getBaseUrl(server)}/voice/spell?k=shared-secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio: Buffer.from([9, 8, 7, 6]).toString('base64'),
        mimeType: 'audio/wav'
      })
    });

    expect(response.status).toBe(415);
    expect(transcriptionService.lastMimeType).toBeNull();
    expect(transcriptionService.lastAudioBuffer).toBeNull();

    const body = (await response.json()) as { error?: string };
    expect(body.error).toContain('Unsupported media type');
  });

  it('rejects unauthorized voice requests', async () => {
    const transcriptionService = new RecordingTranscriptionService();
    server = new HttpServer(0, '127.0.0.1', 'shared-secret');
    server.setRecognizeSpellUseCase(new RecognizeSpellUseCase(transcriptionService));
    await server.listen();

    const response = await fetch(`${getBaseUrl(server)}/voice/spell?k=wrong-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'audio/webm' },
      body: Buffer.from([1])
    });

    expect(response.status).toBe(401);
    expect(transcriptionService.lastAudioBuffer).toBeNull();
  });

  it('returns 504 when transcription times out', async () => {
    server = new HttpServer(0, '127.0.0.1', 'shared-secret');
    server.setRecognizeSpellUseCase(new RecognizeSpellUseCase(new TimeoutTranscriptionService()));
    await server.listen();

    const response = await fetch(`${getBaseUrl(server)}/voice/spell?k=shared-secret`, {
      method: 'POST',
      headers: { 'Content-Type': 'audio/webm' },
      body: Buffer.from([1, 2, 3])
    });

    expect(response.status).toBe(504);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toContain('timeout');
  });
});


