import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CLE_CORPS, CORPS_DEFAUT, CRANS_CORPS, SCRIPT_CORPS, corpsValide } from './corpsLecture'

describe('la taille du texte biblique, en trois crans', () => {
  it('trois crans, dans l’ordre du volet, le normal par défaut', () => {
    expect(CRANS_CORPS.map(c => c.cle)).toEqual(['petit', 'normal', 'grand'])
    expect(CORPS_DEFAUT).toBe('normal')
  })

  it('ne reconnaît que les trois crans', () => {
    expect(corpsValide('grand')).toBe('grand')
    expect(corpsValide(' petit ')).toBe('petit')
    expect(corpsValide('enorme')).toBeNull()
    expect(corpsValide(null)).toBeNull()
  })

  it('le script d’avant peinture est court, synchrone, et efface une valeur inconnue', () => {
    expect(SCRIPT_CORPS).toContain(CLE_CORPS)
    expect(SCRIPT_CORPS).toContain('removeItem')
    expect(SCRIPT_CORPS).not.toMatch(/await|fetch|=>/)
  })

  it('le gabarit écrit le cran par défaut et pose le script dans le <head>', () => {
    const gabarit = readFileSync(join(process.cwd(), 'app/layout.tsx'), 'utf8')
    expect(gabarit).toContain('data-corps={CORPS_DEFAUT}')
    expect(gabarit).toContain('SCRIPT_THEME + SCRIPT_CORPS')
  })

  it('la feuille déclare les trois crans : 14, 15 et 17 px, à l’interligne du gris', () => {
    const feuille = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')
    expect(feuille).toContain('--cs-lecture-corps: 0.9375rem;')
    expect(feuille).toContain('--cs-lecture-interligne: var(--cs-corps-interligne);')
    expect(feuille).toMatch(/:root\[data-corps="petit"\] \{\s*--cs-lecture-corps: 0\.875rem;/)
    expect(feuille).toMatch(/:root\[data-corps="grand"\] \{\s*--cs-lecture-corps: 1\.0625rem;/)
  })
})
