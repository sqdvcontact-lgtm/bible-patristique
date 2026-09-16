import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CARTE_TITRES_LIMINAIRES,
  INTITULE_CARTE_LIMINAIRES,
  NIV1_LIMINAIRES,
  deTitre,
  intituleDeNiveau1,
  niveau1DuSegment,
} from './intituleNiveau1'

// ── LE TITRE PUBLIC D'UNE DIVISION DE NIVEAU 1 — une seule écriture ──────────────

describe('niveau1DuSegment', () => {
  it('rend la division que le segment porte', () => {
    expect(niveau1DuSegment({ ref_niv1: 'Seconde catéchèse', espace_textuel: 'corps' })).toBe('Seconde catéchèse')
  })

  it('range dans les liminaires un segment d’introduction sans division, et lui seul', () => {
    expect(niveau1DuSegment({ ref_niv1: null, espace_textuel: 'introduction' })).toBe(NIV1_LIMINAIRES)
    expect(niveau1DuSegment({ ref_niv1: null, espace_textuel: 'corps' })).toBeNull()
  })

  it('garde la chaîne vide, comme la page : elle n’est pas une absence', () => {
    // 138 segments du corpus portent `ref_niv1 = ''` (mesuré le 16 septembre 2026).
    expect(niveau1DuSegment({ ref_niv1: '', espace_textuel: 'introduction' })).toBe('')
  })
})

describe('intituleDeNiveau1', () => {
  it('nomme une division par son titre, et les liminaires par la carte', () => {
    expect(intituleDeNiveau1('Seconde catéchèse')).toBe('Seconde catéchèse')
    expect(intituleDeNiveau1(NIV1_LIMINAIRES, CARTE_TITRES_LIMINAIRES)).toBe(INTITULE_CARTE_LIMINAIRES)
    expect(intituleDeNiveau1(NIV1_LIMINAIRES, {})).toBe('Liminaires')
  })
})

describe('deTitre', () => {
  it('élide devant une voyelle et un « h » muet, jamais devant « onz- », un « h » aspiré ni un chiffre romain', () => {
    expect(deTitre('Seconde catéchèse')).toBe('de ')
    expect(deTitre('Avant-propos')).toBe('d’')
    expect(deTitre('Homélie sur le paralytique')).toBe('d’')
    expect(deTitre('Onzième catéchèse')).toBe('de ')
    expect(deTitre('Huitième catéchèse')).toBe('de ')
    expect(deTitre('IV')).toBe('de ')
  })
})

describe('la page d’une œuvre n’écrit pas sa propre règle', () => {
  // ⛔ Le titre de niveau 1 vivait recopié à six endroits. Une copie qui revient se voit ici.
  for (const fichier of ['app/oeuvre/[id]/OeuvreClient.tsx', 'app/oeuvre/[id]/page.tsx']) {
    it(`${fichier} lit le résolveur commun`, () => {
      const source = readFileSync(fichier, 'utf8')
      expect(source).not.toMatch(/const NIV1_LIMINAIRES\s*=/u)
      expect(source).not.toContain("'Liminaires'")
      expect(source).toContain("from '@/app/lib/intituleNiveau1'")
    })
  }
})
