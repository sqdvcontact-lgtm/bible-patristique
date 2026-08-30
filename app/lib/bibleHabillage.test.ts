import { describe, expect, it } from 'vitest'

import {
  estDetouree,
  habillerLesVignettes,
  indexerBlocsDeCorps,
  indexerIllustrations,
  type BibleEditionDisplayAsset,
  type BibleEditionDisplayBodyBlock,
  type RegimeIllustration,
} from './bibleEdition'

/**
 * ⛔ UNE VIGNETTE SE COMPOSE DANS LE COMMENTAIRE QUI COUVRE SON VERSET.
 *
 * Les onze gravures de Marc sont ancrées sur un VERSET, donc posées entre deux
 * versets, où elles n'ont rien à contourner. L'ancre reste où elle est — c'est
 * une donnée de provenance — et c'est la composition qui les fond dans la prose.
 */

const prose = (signes: number) => 'a'.repeat(signes)

function bloc(
  id: string,
  canonIdStart: string | null,
  signes: number,
  placement: 'before' | 'after' = 'before',
): BibleEditionDisplayBodyBlock {
  return {
    id,
    blockKey: id,
    semanticStyleCode: 'commentaire',
    semanticLevel: 'I5',
    placement,
    canonIdStart,
    canonIdEnd: null,
    materialOrder: 1,
    textBlocks: [{ id: `${id}:1`, kind: 'commentary', form: 'prose', text: prose(signes), language: 'fr' }],
    internalNotes: [],
  }
}

function gravure(
  id: string,
  canonIdStart: string,
  regime: RegimeIllustration = 'vignette',
  taille: { width: number; height: number } = { width: 300, height: 200 },
): BibleEditionDisplayAsset {
  return {
    id,
    assetKey: id,
    assetKind: regime === 'hors-texte' ? 'plate' : 'illustration',
    url: `https://exemple.test/${id}.webp`,
    ...taille,
    altText: id,
    caption: 'Une légende.',
    printedPage: null,
    placement: 'after',
    canonIdStart,
    canonIdEnd: null,
    bodyBlockId: null,
    noteId: null,
    materialOrder: 100,
    regime,
  }
}

const composer = (
  ordre: readonly string[],
  blocs: BibleEditionDisplayBodyBlock[],
  gravures: BibleEditionDisplayAsset[],
) => habillerLesVignettes(ordre, indexerBlocsDeCorps(blocs), indexerIllustrations(gravures))

describe('habillage des vignettes', () => {
  it('fond la vignette dans le DERNIER bloc de prose posé avant elle', () => {
    // La gravure est ancrée sur MRK.2.17 ; le commentaire qui la couvre ouvre à
    // MRK.2.15. C'est bien celui-là, non le suivant ni celui du chapitre.
    const h = composer(
      ['MRK.2.14', 'MRK.2.15', 'MRK.2.16', 'MRK.2.17', 'MRK.2.18'],
      [bloc('c-13-14', 'MRK.2.13', 1200), bloc('c-15-17', 'MRK.2.15', 1200), bloc('c-18', 'MRK.2.18', 1200)],
      [gravure('g1', 'MRK.2.17')],
    )
    expect([...h.parBloc.keys()]).toEqual(['c-15-17'])
    expect(h.absorbees.has('g1')).toBe(true)
  })

  it('ALTERNE les côtés le long du chapitre', () => {
    const h = composer(
      ['MRK.5.2', 'MRK.5.34', 'MRK.5.38'],
      [bloc('c-1', 'MRK.5.2', 2000), bloc('c-2', 'MRK.5.34', 2000), bloc('c-3', 'MRK.5.38', 2000)],
      [gravure('g1', 'MRK.5.2'), gravure('g2', 'MRK.5.34'), gravure('g3', 'MRK.5.38')],
    )
    const cotes = [...h.parBloc.values()].flat().map((v) => v.cote)
    expect(cotes).toEqual(['droite', 'gauche', 'droite'])
  })

  it('⛔ n’habille PAS un bloc trop court pour contourner le flottant', () => {
    // Une vignette de 300 × 200 servie à 30 % de 502 px fait 150 px de large et
    // 100 de haut, plus sa légende : neuf lignes à franchir, deux de plus pour
    // que l'habillage se lise, à 45 signes la ligne.
    const court = composer(['MRK.4.3', 'MRK.4.8'], [bloc('c', 'MRK.4.3', 300)], [gravure('g1', 'MRK.4.8')])
    expect(court.absorbees.size).toBe(0)
    const long = composer(['MRK.4.3', 'MRK.4.8'], [bloc('c', 'MRK.4.3', 700)], [gravure('g1', 'MRK.4.8')])
    expect(long.absorbees.size).toBe(1)
  })

  it('⛔ le seuil suit la HAUTEUR du flottant, il n’est pas une constante', () => {
    const basse = gravure('g1', 'MRK.4.8', 'vignette', { width: 300, height: 100 })
    const haute = gravure('g2', 'MRK.4.8', 'vignette', { width: 300, height: 400 })
    const avec = (g: BibleEditionDisplayAsset) =>
      composer(['MRK.4.3', 'MRK.4.8'], [bloc('c', 'MRK.4.3', 600)], [g]).absorbees.size
    expect(avec(basse)).toBe(1)
    expect(avec(haute)).toBe(0)
  })

  it('⛔ une SCÈNE et une PLANCHE ne s’habillent jamais', () => {
    const h = composer(
      ['MRK.1.9'],
      [bloc('c', 'MRK.1.9', 4000)],
      [gravure('g1', 'MRK.1.9', 'au-fil'), gravure('g2', 'MRK.1.9', 'hors-texte')],
    )
    expect(h.absorbees.size).toBe(0)
  })

  it('laisse la vignette sur son axe quand aucun bloc ne la précède', () => {
    const h = composer(['MRK.1.1'], [], [gravure('g1', 'MRK.1.1')])
    expect(h.absorbees.size).toBe(0)
    expect(h.parBloc.size).toBe(0)
  })

  it('⛔ seule la VIGNETTE est détourée', () => {
    expect(estDetouree('vignette')).toBe(true)
    expect(estDetouree('au-fil')).toBe(false)
    expect(estDetouree('hors-texte')).toBe(false)
  })
})
