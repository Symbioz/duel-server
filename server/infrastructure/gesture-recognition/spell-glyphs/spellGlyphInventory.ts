import fs from 'node:fs/promises'
import path from 'node:path'
import { SpellName } from '@entities/Spells'

export type SpellGlyphInventoryReport = {
  canonicalKeys: string[]
  fileKeys: string[]
  wellNamed: string[]
  missing: string[]
  orphaned: string[]
}

const sortKeys = (keys: Iterable<string>): string[] => [...keys].sort((first, second) => first.localeCompare(second))

export const getCanonicalSpellGlyphKeys = (): string[] => sortKeys(Object.values(SpellName))

export const toSpellGlyphKey = (fileName: string): string => fileName.replace(/\.svg$/i, '')

export const buildSpellGlyphInventoryReport = (
  canonicalKeys: string[],
  fileKeys: string[]
): SpellGlyphInventoryReport => {
  const canonicalKeySet = new Set(canonicalKeys)
  const fileKeySet = new Set(fileKeys)

  return {
    canonicalKeys: sortKeys(canonicalKeySet),
    fileKeys: sortKeys(fileKeySet),
    wellNamed: sortKeys([...fileKeySet].filter((key) => canonicalKeySet.has(key))),
    missing: sortKeys([...canonicalKeySet].filter((key) => !fileKeySet.has(key))),
    orphaned: sortKeys([...fileKeySet].filter((key) => !canonicalKeySet.has(key)))
  }
}

export const formatSpellGlyphInventoryReport = (report: SpellGlyphInventoryReport): string =>
  [
    'spell-glyph inventory report',
    `wellNamed (${report.wellNamed.length}): ${report.wellNamed.join(', ') || '(none)'}`,
    `missing (${report.missing.length}): ${report.missing.join(', ') || '(none)'}`,
    `orphaned (${report.orphaned.length}): ${report.orphaned.join(', ') || '(none)'}`
  ].join('\n')

export const readSpellGlyphInventoryReport = async (
  directoryPath = path.join(process.cwd(), 'src/presentation/assets/spell-glyphs')
): Promise<SpellGlyphInventoryReport> => {
  const directoryEntries = await fs.readdir(directoryPath)
  const fileKeys = directoryEntries.filter((entry) => entry.toLowerCase().endsWith('.svg')).map(toSpellGlyphKey)

  return buildSpellGlyphInventoryReport(getCanonicalSpellGlyphKeys(), fileKeys)
}

