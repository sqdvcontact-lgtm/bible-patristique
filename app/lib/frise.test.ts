import { describe, expect, it } from 'vitest'
import { cleTypeAffichage, coulType, LIB_TYPE } from './frise'

/**
 * ⚠️ Les valeurs sont recopiées des DEUX vues du site, telles qu'elles en
 * sortent : `v_chronologie_auteurs` écrit ses types sans accents, et
 * `v_chronologie_traductions` accentue « édition » et « réception ». C'est
 * précisément cet écart qui laissait deux brins sur trois sans couleur.
 */
const GRIS = 'var(--cs-texte-gris)'

describe('cleTypeAffichage — les deux vues ne parlent pas la même langue', () => {
  it('ôte les accents de la vue des traductions', () => {
    expect(cleTypeAffichage('édition')).toBe('edition')
    expect(cleTypeAffichage('réception')).toBe('reception')
    expect(cleTypeAffichage('formation')).toBe('formation')
  })

  it('⚠️ garde l’œ ligaturé, qui n’est pas un accent', () => {
    expect(cleTypeAffichage('œuvre')).toBe('œuvre')
    expect(LIB_TYPE[cleTypeAffichage('œuvre')]).toBe('Œuvre')
  })

  it('rend une chaîne vide sur une valeur absente', () => {
    expect(cleTypeAffichage(null)).toBe('')
    expect(cleTypeAffichage(undefined)).toBe('')
  })
})

describe('coulType — un brin nommé a sa couleur, accents ou non', () => {
  it('donne aux trois brins d’une TRADUCTION leur couleur', () => {
    // Avant le repli des clés, « édition » et « réception » tombaient sur le gris.
    expect(coulType('édition')).not.toBe(GRIS)
    expect(coulType('réception')).not.toBe(GRIS)
    expect(coulType('formation')).not.toBe(GRIS)
    expect(coulType('contexte')).not.toBe(GRIS)
  })

  it('donne aux trois brins d’un AUTEUR la leur, sans rien changer', () => {
    expect(coulType('vie')).toBe('var(--cs-vert)')
    expect(coulType('œuvre')).not.toBe(GRIS)
    expect(coulType('contexte')).not.toBe(GRIS)
  })

  it('⛔ les trois brins d’une traduction se distinguent l’un de l’autre', () => {
    const brins = ['formation', 'édition', 'réception'].map(coulType)
    expect(new Set(brins).size).toBe(3)
  })

  it('retombe sur le gris pour un type inconnu ou absent', () => {
    expect(coulType('galimatias')).toBe(GRIS)
    expect(coulType(null)).toBe(GRIS)
  })
})
