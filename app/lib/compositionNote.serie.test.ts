import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  MARGE_ENTREE_APPARAT,
  MARGE_PARAGRAPHE_ENCART,
  RETRAIT_BLOC_ENCART,
  sequencesDeLaNote,
  styleBlocNote,
} from './compositionNote'

/**
 * LA SÉRIE BIBLIOGRAPHIQUE D'UNE NOTE — le découpage, et la feuille qui la compose sous
 * l'encart (charte § 47.2, « SÉRIES BIBLIOGRAPHIQUES DANS LES NOTES »).
 */

const S = (serie: boolean, debut: number, fin: number) => ({ serie, debut, fin })
const E = { bibliographyListItem: true }

/** Le corps d'une règle, commentaires ôtés, repérée par son sélecteur EXACT en tête de ligne. */
function corps(selecteur: string): string {
  const feuille = readFileSync('app/globals.css', 'utf8').replace(/\/\*[\s\S]*?\*\//gu, '')
  const debut = feuille.indexOf(`\n${selecteur} {`)
  expect(debut, `aucune règle « ${selecteur} »`).toBeGreaterThan(-1)
  return feuille.slice(feuille.indexOf('{', debut) + 1, feuille.indexOf('}', debut))
}

function valeur(bloc: string, propriete: string): string {
  const declaration = bloc.split(';').map(m => m.trim()).find(m => m.startsWith(`${propriete}:`))
  expect(declaration, `« ${propriete} » absent`).toBeDefined()
  return declaration!.slice(propriete.length + 1).trim()
}

const LISTE = '.cs-encart-propos .cs-apparat-bibliographie__liste'
const ENTREE = '.cs-encart-propos .cs-apparat-bibliographie__entree:not(:last-child)'

describe('sequencesDeLaNote', () => {
  it('réunit les entrées qui se suivent, et elles seules', () => {
    expect(sequencesDeLaNote([{}, E, E, E, E, {}])).toEqual([S(false, 0, 1), S(true, 1, 5), S(false, 5, 6)])
    expect(sequencesDeLaNote([{}, {}])).toEqual([S(false, 0, 2)])
    expect(sequencesDeLaNote([])).toEqual([])
  })

  it('arrête une série au premier bloc qui n’en est pas', () => {
    expect(sequencesDeLaNote([E, {}, E])).toEqual([S(true, 0, 1), S(false, 1, 2), S(true, 2, 3)])
    // ⛔ Seul le booléen vrai marque une entrée.
    expect(sequencesDeLaNote([{ bibliographyListItem: false }, E])).toEqual([S(false, 0, 1), S(true, 1, 2)])
  })
})

describe('styleBlocNote, pour une entrée', () => {
  it('rend son blanc à la liste, et le garde à tout autre bloc', () => {
    expect(styleBlocNote({ entreeBibliographique: true }).margin).toBe(0)
    expect(styleBlocNote().margin).toBe(`0 0 ${MARGE_PARAGRAPHE_ENCART}`)
  })
})

describe('la série sous l’encart, dans la feuille', () => {
  it('prend le fer du bloc détaché, recalculé depuis le cran de la famille', () => {
    const cran = Number.parseFloat(valeur(corps('.cs-apparat-bibliographie'), 'font-size'))
    const retrait = valeur(corps(LISTE), 'padding-left')
    expect(retrait.endsWith('em') && !retrait.endsWith('rem')).toBe(true)
    // ⛔ La liste descend d'un cran : son em n'est pas celui de la note. 1,5625 × 0,96 = 1,5.
    expect(Number.parseFloat(retrait) * cran).toBeCloseTo(Number.parseFloat(RETRAIT_BLOC_ENCART), 6)
  })

  it('prend l’encre seconde de l’appareil', () => {
    expect(valeur(corps(LISTE), 'color')).toBe('var(--cs-texte-second)')
  })

  it('serre les entrées du blanc de l’apparat, plus étroit que celui des blocs', () => {
    const blanc = valeur(corps(ENTREE), 'margin-bottom')
    expect(blanc).toBe(MARGE_ENTREE_APPARAT)
    expect(Number.parseFloat(blanc)).toBeLessThan(Number.parseFloat(MARGE_PARAGRAPHE_ENCART))
  })

  it('n’écrit aucun blanc invisible qui ferait tomber une déclaration', () => {
    // ⚠️ Une insécable devant une valeur n'est pas un blanc pour CSS : la déclaration tombe
    // en silence, et le `trim()` des tests ci-dessus la ferait passer pour saine.
    for (const selecteur of [LISTE, ENTREE]) {
      const points = [...corps(selecteur)].map(c => c.codePointAt(0))
      expect(points.filter(p => p === 0xa0 || p === 0x202f)).toEqual([])
    }
  })
})
