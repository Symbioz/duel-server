import { SpellName } from '@entities/Spells'
import {
  buildSpellGlyphInventoryReport,
  formatSpellGlyphInventoryReport,
  getCanonicalSpellGlyphKeys,
  readSpellGlyphInventoryReport,
  toSpellGlyphKey
} from './spellGlyphInventory'

describe('spell glyph inventory', () => {
  it('builds a stable report with well-named, missing, and orphaned glyph keys', () => {
    const canonicalKeys = [SpellName.LUMOS, SpellName.PROTEGO, SpellName.REPARO]
    const fileKeys = ['lumos', 'protego', 'obscuro']

    expect(buildSpellGlyphInventoryReport(canonicalKeys, fileKeys)).toEqual({
      canonicalKeys: ['lumos', 'protego', 'reparo'],
      fileKeys: ['lumos', 'obscuro', 'protego'],
      wellNamed: ['lumos', 'protego'],
      missing: ['reparo'],
      orphaned: ['obscuro']
    })
  })

  it('derives canonical keys from SpellName and strips svg extensions', () => {
    const canonicalKeys = getCanonicalSpellGlyphKeys()

    expect(canonicalKeys).toContain(SpellName.LUMOS)
    expect(canonicalKeys).toContain(SpellName.COUNTER_CURSE)
    expect(toSpellGlyphKey('counterCurse.svg')).toEqual('counterCurse')
    expect(toSpellGlyphKey('wingardium leviosa.svg')).toEqual('wingardium leviosa')
  })

  it('reports the current spell-glyph directory inventory', async () => {
    const report = await readSpellGlyphInventoryReport()
    const formattedReport = formatSpellGlyphInventoryReport(report)

    process.stdout.write(`${formattedReport}\n`)

    expect(report.wellNamed).toContain('lumos')
    expect(report.wellNamed).toContain('counterCurse')
    expect(report.wellNamed).toContain('obscuro')
    expect(report.wellNamed).toContain('stupefix')
    expect(report.missing).toContain('araniaExumai')
    expect(report.missing).toContain('veraVerto')
    expect(report.orphaned).toEqual([])

    expect(report.wellNamed.length + report.missing.length).toEqual(report.canonicalKeys.length)
  })
})

