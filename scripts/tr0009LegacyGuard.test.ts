import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const guardedScripts = [
  'align-manual.mjs',
  'align-nw.mjs',
  'attach-structural.mjs',
  'fill-gaps.mjs',
  'integrate-giguet.mjs',
  'integrate-suzanne-bel.mjs',
  'marker-map.mjs',
  'merge-splits.mjs',
  'rematch-surnum.mjs',
  'resolve-collisions.mjs',
  'verify-surnum.mjs',
] as const

describe('garde-fou des importeurs historiques Giguet', () => {
  it.each(guardedScripts)('bloque %s avant toute création de client Supabase', (scriptName) => {
    const source = readFileSync(resolve(process.cwd(), 'scripts', scriptName), 'utf8')
    const guardIndex = source.indexOf("throw new Error('BLOCKED_LEGACY_TR0009:")
    const clientIndex = source.indexOf('createClient(')

    expect(guardIndex).toBeGreaterThanOrEqual(0)
    expect(clientIndex).toBeGreaterThan(guardIndex)
    expect(source).toContain('TR0009 is reserved for Bible française du XIIIe siècle')
  })
})
