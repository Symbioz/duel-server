import * as http from 'http';
import { RecognizeSpellUseCase } from '../usecases/RecognizeSpellUseCase';

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Controller for voice spell recognition API endpoints.
 * Handles /voice/spell route.
 */
export class VoiceSpellController {
  constructor(
    private recognizeSpellUseCase: RecognizeSpellUseCase,
    private controllerAccessKey: string
  ) {}

  /**
   * POST /voice/spell?k=<access-key>
   * Body: raw audio bytes, Content-Type: audio/*
   * Response: { spellName, transcript, confidence }
   */
  async handleSpellRecognition(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    accessKey: string | null
  ): Promise<void> {
    if (!accessKey || accessKey !== this.controllerAccessKey) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    if (!this.recognizeSpellUseCase) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Voice recognition not configured (missing MISTRAL_API_KEY)' }));
      return;
    }

    const rawContentTypeHeader = req.headers['content-type'];
    const contentType = (
      Array.isArray(rawContentTypeHeader) ? rawContentTypeHeader[0] : rawContentTypeHeader ?? ''
    )
      .split(';')[0]
      .trim()
      .toLowerCase();

    if (!contentType.startsWith('audio/')) {
      res.writeHead(415, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unsupported media type. Use Content-Type: audio/*.' }));
      return;
    }

    const chunks: Buffer[] = [];
    let totalSize = 0;
    for await (const chunk of req) {
      totalSize += (chunk as Buffer).length;
      if (totalSize > MAX_AUDIO_BYTES) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Audio payload too large (max 10 MB)' }));
        return;
      }
      chunks.push(chunk as Buffer);
    }

    const audioBuffer = Buffer.concat(chunks);
    if (audioBuffer.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Empty audio payload' }));
      return;
    }

    const result = await this.recognizeSpellUseCase.execute(audioBuffer, contentType);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  }
}

