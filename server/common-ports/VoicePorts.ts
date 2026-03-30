import { SpellName } from '../entities/spells';

/**
 * Port for audio transcription.
 * Implementations can use Voxtral via the Mistral API or a local vLLM server.
 */
export interface TranscriptionService {
  transcribe(audioBuffer: Buffer, mimeType: string): Promise<string>;
}

export interface SpellRecognitionResult {
  spellName: SpellName | null;
  transcript: string;
  confidence: number;
}

