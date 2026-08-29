import { describe, expect, it } from 'vitest'
import { estEnVers, estBlocDeVers, styleLigneDeVers, FORME_VERS } from './compositionVers'
import { styleTexteVerset } from './compositionBible'
import { styleBlocDeVers } from './compositionOeuvre'

/**
 * ⛔ UN STYLE, QUATRE SURFACES (2026-08-29).
 *
 * Demande de l'auteur : la poésie doit avoir son style dans le corps d'une œuvre, dans
 * l'apparat d'une œuvre, dans l'apparat d'une bible, et dans le texte biblique.
 *
 * Ce qui fait qu'un vers est un vers ne dépend d'aucune surface : on ne le justifie
 * pas, on ne le coupe pas — on ne coupe pas un alexandrin —, il porte son alinéa et
 * son retrait de suite. Seuls la police, le corps et l'encre appartiennent au bloc de
 * chaque surface. Cette garde tient les deux moitiés de la règle.
 */

describe('déclarer un vers : deux écritures, une règle', () => {
  it('la nature HÉRITÉE `vers` vaut déclaration', () => {
    // 2 325 segments la portent, tous dans la Consolation de Boèce.
    expect(estEnVers({ nature: 'vers' })).toBe(true)
  })

  it('la forme CANONIQUE vaut déclaration, quelle que soit la nature', () => {
    // ⛔ C'est la seule écriture possible dans l'apparat, où la nature vaut déjà
    // `apparat_critique` et ne peut pas dire deux choses à la fois.
    expect(estEnVers({ nature: 'apparat_critique', forme: FORME_VERS })).toBe(true)
    expect(estEnVers({ nature: 'texte', forme: FORME_VERS })).toBe(true)
  })

  it('rien d’autre ne vaut déclaration', () => {
    expect(estEnVers({ nature: 'texte' })).toBe(false)
    expect(estEnVers({ nature: 'apparat_critique' })).toBe(false)
    expect(estEnVers({ nature: 'texte', forme: 'prose' })).toBe(false)
    expect(estEnVers(null)).toBe(false)
    expect(estEnVers(undefined)).toBe(false)
  })

  it('⛔ un bloc est en vers TOUT ou RIEN, comme pour les versets', () => {
    expect(estBlocDeVers([{ nature: 'vers' }, { nature: 'texte', forme: FORME_VERS }])).toBe(true)
    expect(estBlocDeVers([{ nature: 'vers' }, { nature: 'texte' }])).toBe(false)
    expect(estBlocDeVers([])).toBe(false)
  })
})

describe('la LIGNE se compose pareil partout', () => {
  it('ne se coupe jamais, et pend son retrait de suite', () => {
    const ligne = styleLigneDeVers({ rang: 0 })
    expect(ligne.display).toBe('block')
    expect(ligne.hyphens).toBe('none')
    expect(ligne.lineHeight).toBe(1.4)
    // Le retrait de suite est NÉGATIF en `text-indent` et positif en `padding` :
    // c'est ce qui distingue une ligne trop longue du vers d'après.
    expect(String(ligne.textIndent)).toMatch(/^-/)
    expect(ligne.paddingLeft).toBe(String(ligne.textIndent).slice(1))
  })

  it('l’alinéa poétique creuse la marge, la strophe ouvre le blanc', () => {
    expect(styleLigneDeVers({ rang: 0 }).marginLeft).not.toBe(styleLigneDeVers({ rang: 2 }).marginLeft)
    expect(styleLigneDeVers({ rang: 0, ouvreStrophe: true }).marginTop).toBe('0.6rem')
    expect(styleLigneDeVers({ rang: 0 }).marginTop).toBe(0)
  })
})

describe('chaque SURFACE apporte sa police, jamais la règle du vers', () => {
  it('le bloc patristique porte le sérif et le corps de la lecture', () => {
    const bloc = styleBlocDeVers()
    expect(String(bloc.fontFamily)).toContain('serif')
    expect(bloc.fontSize).toBeDefined()
  })

  it('⛔ le TEXTE biblique en vers ne se justifie ni ne se coupe', () => {
    const vers = styleTexteVerset({ enVers: true })
    expect(vers.textAlign).toBe('left')
    expect(vers.hyphens).toBe('none')
    // Alors que la prose du même verset fait l'inverse.
    const prose = styleTexteVerset()
    expect(prose.textAlign).toBe('justify')
    expect(prose.hyphens).toBe('auto')
  })
})
