import { TranscriptionService, SpellRecognitionResult } from '../common-ports/VoicePorts';
import { matchSpell } from '../infrastructure/voice/SpellMatcher';

/**
 * Use case: receive a raw audio buffer, transcribe it with Voxtral,
 * then match the transcript to the closest Harry Potter spell.
 */
export class RecognizeSpellUseCase {
  constructor(private readonly transcriptionService: TranscriptionService) {}

  async execute(audioBuffer: Buffer, mimeType: string): Promise<SpellRecognitionResult> {
    const transcript = await this.transcriptionService.transcribe(audioBuffer, mimeType);

    console.log(`[SpellRecognition] Transcript: "${transcript}"`);

    const result = matchSpell(transcript);

    if (result.spellName) {
      console.log(
        `[SpellRecognition] Matched: ${result.spellName} (confidence: ${(result.confidence * 100).toFixed(0)}%)`
      );
    } else {
      console.log(
        `[SpellRecognition] No match found for "${transcript}" (best score: ${(result.confidence * 100).toFixed(0)}%)`
      );
    }

    return result;
  }
}

