import { SpellName } from '../../../entities/spells';

const SPELL_VALUES = new Set<string>(Object.values(SpellName));

export function normalizeTemplateKey(templateKey: string): string {
  return templateKey.trim().toLowerCase().replace(/[_-]+/g, ' ');
}

export function resolveSpellNameFromTemplateKey(templateKey: string): string {
  const normalized = normalizeTemplateKey(templateKey);
  if (SPELL_VALUES.has(normalized)) {
    return normalized;
  }
  return normalized;
}

