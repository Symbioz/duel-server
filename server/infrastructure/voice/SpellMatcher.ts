import { SpellName } from '../../entities/spells';
import { SpellRecognitionResult } from '../../common-ports/VoicePorts';

/**
 * Derives the spoken form of a spell from its enum key.
 * e.g. WINGARDIUM_LEVIOSA → "wingardium leviosa"
 *      CHEERING_CHARM     → "cheering charm"
 */
function toSpokenForm(enumKey: string): string {
  return enumKey.replace(/_/g, ' ').toLowerCase();
}

interface SpellEntry {
  spellName: SpellName;
  spokenForm: string;
}

const SPELL_ENTRIES: SpellEntry[] = (Object.keys(SpellName) as Array<keyof typeof SpellName>).map(
  (key) => ({
    spellName: SpellName[key],
    spokenForm: toSpokenForm(key),
  })
);

/** All spoken forms, used as context bias for Voxtral. */
export const SPELL_SPOKEN_FORMS: string[] = SPELL_ENTRIES.map((e) => e.spokenForm);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ');
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

const CONFIDENCE_THRESHOLD = 0.5;

/**
 * Matches a transcript (from Voxtral) to the closest SpellName.
 * Uses direct match first, then Levenshtein distance fuzzy matching.
 */
export function matchSpell(transcript: string): SpellRecognitionResult {
  const normalized = normalize(transcript);

  let bestSpell: SpellName | null = null;
  let bestScore = 0;

  for (const entry of SPELL_ENTRIES) {
    const score = similarity(normalized, entry.spokenForm);
    if (score > bestScore) {
      bestScore = score;
      bestSpell = entry.spellName;
    }
  }

  if (bestScore < CONFIDENCE_THRESHOLD) {
    return { spellName: null, transcript, confidence: bestScore };
  }

  return { spellName: bestSpell, transcript, confidence: bestScore };
}

