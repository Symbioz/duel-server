import { Mistral } from '@mistralai/mistralai';
import { TranscriptionService } from '../../common-ports/VoicePorts';
import { SPELL_SPOKEN_FORMS } from './SpellMatcher';

export interface VoxtralConfig {
  apiKey: string;
  /** Base URL of the API. Defaults to Mistral cloud. Override to use a local vLLM server. */
  baseUrl?: string;
  /** Model to use. Defaults to voxtral-mini-latest. */
  model?: string;
}

/**
 * Transcription service backed by Voxtral (Mistral's speech understanding model).
 *
 * Works with:
 *  - Mistral cloud API: set MISTRAL_API_KEY
 *  - Local vLLM:        set VOXTRAL_BASE_URL=http://localhost:8000/v1
 *                       and run: vllm serve mistralai/Voxtral-Mini-3B-2507 --port 8000
 */
export class VoxtralTranscriptionService implements TranscriptionService {
  private readonly client: Mistral;
  private readonly model: string;

  constructor(config: VoxtralConfig) {
    this.client = new Mistral({
      apiKey: config.apiKey,
      serverURL: config.baseUrl,
    });
    this.model = config.model ?? 'voxtral-mini-latest';
  }

  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<string> {
    const extension = mimeType.split('/')[1]?.split(';')[0] ?? 'webm';

    const response = await this.client.audio.transcriptions.complete({
      model: this.model,
      file: {
        fileName: `spell.${extension}`,
        content: new Uint8Array(audioBuffer),
      },
      // Bias transcription towards spell names for much better accuracy
      contextBias: SPELL_SPOKEN_FORMS,
    });

    return response.text;
  }
}

