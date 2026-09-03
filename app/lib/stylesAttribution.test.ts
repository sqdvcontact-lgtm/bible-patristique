import { describe, expect, it } from 'vitest'
import { metadonneesAvecForme, metadonneesAvecStyleBible, natureAttribuable } from './stylesAttribution'

const TRACE = { par: 'administration', le: '2026-09-03T20:00:00.000Z' }

describe('la nature d’un segment', () => {
  it('n’accepte que le vocabulaire, et refuse la nature héritée', () => {
    expect(natureAttribuable('citation')).toBe('citation')
    expect(() => natureAttribuable('vers')).toThrow(/inconnue/)
    expect(() => natureAttribuable('separateur')).toThrow(/héritée/)
  })
})

describe('la forme d’un segment', () => {
  it('pose et retire `forme` sans toucher au reste', () => {
    expect(metadonneesAvecForme(null, true)).toEqual({ forme: 'vers' })
    expect(metadonneesAvecForme({ indent_inches: 0.25, forme: 'vers' }, false)).toEqual({ indent_inches: 0.25 })
    // Plus rien à garder : la valeur ordinaire d'un segment de prose.
    expect(metadonneesAvecForme({ forme: 'vers' }, false)).toBeNull()
    expect(metadonneesAvecForme('n’importe quoi', false)).toBeNull()
  })
})

describe('le style d’un bloc biblique', () => {
  it('pose un titre avec son rang fixe, et garde les métadonnées voisines', () => {
    const m = metadonneesAvecStyleBible({ presentation: { display_role: 'sous_titre' }, semantic_style: 'commentaire', semantic_level: 'I5' }, 'titre_pericope', null, TRACE)
    expect(m.semantic_style).toBe('titre_pericope')
    expect(m.semantic_level).toBe('T6')
    expect(m.presentation).toEqual({ display_role: 'sous_titre' })
    expect(m.style_attribution).toEqual({ ...TRACE, avant: { style: 'commentaire', rang: 'I5' } })
  })
  it('exige un rang pour une nature d’information', () => {
    expect(() => metadonneesAvecStyleBible({}, 'commentaire', null, TRACE)).toThrow(/rang/)
    expect(() => metadonneesAvecStyleBible({}, 'commentaire', 'T5', TRACE)).toThrow(/rang/)
    expect(metadonneesAvecStyleBible({}, 'commentaire', 'I3', TRACE).semantic_level).toBe('I3')
  })
  it('refuse une note et un style inconnu', () => {
    expect(() => metadonneesAvecStyleBible({}, 'note_verset', 'I6', TRACE)).toThrow(/note/)
    expect(() => metadonneesAvecStyleBible({}, 'commentaire_pericope', null, TRACE)).toThrow(/inconnu/)
  })
})
