import { describe, expect, it } from 'vitest'
import {
  MESURE_MINIMALE_EXERGUE, NATURE_EXERGUE, PART_RETRAIT_EXERGUE,
  RAPPORT_CORPS_EXERGUE, RETRAIT_EXERGUE, estBlocExergue,
} from './compositionExergue'

describe('le bloc d’exergue', () => {
  it('est tout ou rien', () => {
    // ⚠️ Même contrat que `estBlocVersets` et `estBlocDeSignatures` : un bloc qui
    // mêlerait un exergue à de la prose se compose en prose.
    expect(estBlocExergue(['exergue'])).toBe(true)
    expect(estBlocExergue(['exergue', 'exergue'])).toBe(true)
    expect(estBlocExergue(['exergue', 'texte'])).toBe(false)
    expect(estBlocExergue(['lemme'])).toBe(false)
  })

  it('⛔ une liste vide n’est pas un bloc', () => {
    // Un bloc dont on n'a lu aucun segment ne doit pas se composer en exergue :
    // `every` rend `true` sur un tableau vide, d'où la garde de longueur.
    expect(estBlocExergue([])).toBe(false)
  })

  it('ne se laisse pas prendre à un segment absent', () => {
    expect(estBlocExergue([null])).toBe(false)
    expect(estBlocExergue([undefined])).toBe(false)
    expect(estBlocExergue(['exergue', null])).toBe(false)
  })
})

describe('le retrait cède quand la mesure ne peut plus le payer', () => {
  it('vaut le quart de la mesure, borné par ce qui reste au-dessus du plancher', () => {
    // ⛔ La seule écriture possible en style EN LIGNE, où aucune requête de média ne
    // s'écrit — et le style en ligne est ce qui permet à la planche des styles de
    // composer l'exergue exactement comme la page.
    expect(RETRAIT_EXERGUE).toBe(`max(0px, min(${PART_RETRAIT_EXERGUE}, 100% - ${MESURE_MINIMALE_EXERGUE}))`)
  })

  it('les trois valeurs se répondent', () => {
    expect(PART_RETRAIT_EXERGUE).toBe('25%')
    expect(MESURE_MINIMALE_EXERGUE).toBe('20rem')
    // Une colonne de lecture de 31,25 rem laisse 23,4375 rem de mesure : le quart
    // (7,8125 rem) passe donc sans que le plancher morde.
    const colonne = 31.25
    const quart = colonne * 0.25
    expect(colonne - quart).toBeGreaterThan(20)
  })

  it('le corps reste celui de la citation sortie', () => {
    expect(RAPPORT_CORPS_EXERGUE).toBe(0.95)
  })

  it('la nature est bien celle du vocabulaire', () => {
    expect(NATURE_EXERGUE).toBe('exergue')
  })
})
