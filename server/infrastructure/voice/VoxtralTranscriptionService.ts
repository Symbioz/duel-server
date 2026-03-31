import { Mistral } from '@mistralai/mistralai';
import { TranscriptionService } from '../../common-ports/VoicePorts';
import { SPELL_SPOKEN_FORMS } from './SpellMatcher';

export interface VoxtralConfig {
  apiKey: string;
  /** Base URL of the API. Defaults to Mistral cloud. Override to use a local vLLM server. */
  baseUrl?: string;
  /** Model to use. Defaults to voxtral-mini-latest. */
  model?: string;
  /** Timeout for a transcription request in milliseconds. */
  timeoutMs?: number;
}

function normalizeVoxtralBaseUrl(baseUrl?: string): string | undefined {
  if (!baseUrl) {
    return undefined;
  }

  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/v1') ? trimmed.slice(0, -3) : trimmed;
}

const DEFAULT_TRANSCRIPTION_TIMEOUT_MS = 1800;

export class VoiceTranscriptionTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Voice transcription timed out after ${timeoutMs}ms`);
    this.name = 'VoiceTranscriptionTimeoutError';
  }
}

/**
 * Transcription service backed by Voxtral (Mistral's speech understanding model).
 *
 * Works with:
 *  - Mistral cloud API: set MISTRAL_API_KEY
 *  - Local vLLM:        set VOXTRAL_BASE_URL=http://localhost:8000
 *                       and run: vllm serve mistralai/Voxtral-Mini-3B-2507 --port 8000
 */
export class VoxtralTranscriptionService implements TranscriptionService {
  private readonly client: Mistral;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly localBaseUrl?: string;

  constructor(config: VoxtralConfig) {
    const normalizedBaseUrl = normalizeVoxtralBaseUrl(config.baseUrl);
    this.client = new Mistral({
      apiKey: config.apiKey,
      serverURL: normalizedBaseUrl,
    });
    this.localBaseUrl = normalizedBaseUrl;
    this.model = config.model ?? 'voxtral-mini-latest';
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TRANSCRIPTION_TIMEOUT_MS;
  }

  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<string> {
    if (this.localBaseUrl) {
      return this.transcribeWithLocalVllm(audioBuffer, mimeType);
    }

    const extension = mimeType.split('/')[1]?.split(';')[0] ?? 'webm';

    const response = await new Promise<Awaited<ReturnType<typeof this.client.audio.transcriptions.complete>>>(
      (resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new VoiceTranscriptionTimeoutError(this.timeoutMs)),
          this.timeoutMs
        );

        this.client.audio.transcriptions
          .complete({
            model: this.model,
            file: {
              fileName: `spell.${extension}`,
              content: new Uint8Array(audioBuffer),
            },
            // Bias transcription towards spell names for much better accuracy
            contextBias: SPELL_SPOKEN_FORMS,
          })
          .then((result) => {
            clearTimeout(timeout);
            resolve(result);
          })
          .catch((error) => {
            clearTimeout(timeout);
            reject(error);
          });
      }
    );

    return response.text;
  }

  private async transcribeWithLocalVllm(audioBuffer: Buffer, mimeType: string): Promise<string> {
    const extension = mimeType.split('/')[1]?.split(';')[0] ?? 'webm';
    const formData = new FormData();
    const prompt = SPELL_SPOKEN_FORMS.join(', ');

    formData.append('model', this.model);
    formData.append('temperature', '0.0');
    formData.append('prompt', prompt);
    formData.append('file', new Blob([new Uint8Array(audioBuffer)], { type: mimeType }), `spell.${extension}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.localBaseUrl}/v1/audio/transcriptions`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Voxtral local error ${response.status}: ${errorBody}`);
      }

      const payload = (await response.json()) as { text?: string };
      return payload.text ?? '';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new VoiceTranscriptionTimeoutError(this.timeoutMs);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

