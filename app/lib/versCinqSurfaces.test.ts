import { describe, expect, it } from 'vitest'
import { estEnVers, estBlocDeVers, formeDeSegment, styleLigneDeVers, FORME_VERS } from './compositionVers'
import { NATURE_VALIDES } from './naturesSegments'
import { styleTexteVerset } from './compositionBible'
import { styleArgument, styleBlocArgumentEnVers, styleBlocDeVers, styleLigneArgumentEnVers } from './compositionOeuvre'

/**
 * ⛔ UN STYLE, CINQ SURFACES (2026-08-29, cinquième le 2026-09-07).
 *
 * Demande de l'auteur : la poésie doit avoir son style dans le corps d'une œuvre, dans
 * l'apparat d'une œuvre, dans l'apparat d'une bible, et dans le texte biblique. La
 * CINQUIÈME — l'introduction, c'est-à-dire l'argument hissé en tête d'une division — a
 * été trouvée le 7 septembre 2026 : elle se rend par un chemin à elle, qui ne savait
 * rien de `forme = vers`, et les 79 vers du *Manuel* de Dhuoda s'y composaient en prose
 * justifiée et césurée.
 *
 * Ce qui fait qu'un vers est un vers ne dépend d'aucune surface : on ne le justifie
 * pas, on ne le coupe pas — on ne coupe pas un alexandrin —, il porte son alinéa et
 * son retrait de suite. Seuls la police, le corps et l'encre appartiennent au bloc de
 * chaque surface. Cette garde tient les deux moitiés de la règle.
 */

describe('déclarer un vers : UNE écriture, deux enveloppes', () => {
  it('la FORME vaut déclaration, et elle seule', () => {
    // ⛔ C'est la seule écriture possible dans l'apparat, où la nature vaut déjà
    // `apparat_critique` — c'est par là que le segment est SÉLECTIONNÉ — et ne peut
    // pas dire en plus qu'il est en vers.
    expect(estEnVers({ forme: FORME_VERS })).toBe(true)
    expect(estEnVers({ segment_metadata: { forme: FORME_VERS } })).toBe(true)
  })

  it('⛔ la nature `vers` ne déclare plus rien : elle n’existe plus', () => {
    // Sortie du vocabulaire le 29 août 2026 ; les 2 325 segments qui la portaient
    // ont migré vers la forme. La garder en repli aurait laissé vivre deux écritures
    // d'un même fait, ce qui est exactement ce qui avait dérivé : trois lecteurs du
    // site jugeaient le vers sans passer par ce prédicat.
    expect(NATURE_VALIDES).not.toContain('vers')
    expect(estEnVers({ nature: 'vers' } as never)).toBe(false)
  })

  it('rien d’autre ne vaut déclaration', () => {
    expect(estEnVers({})).toBe(false)
    expect(estEnVers({ forme: 'prose' })).toBe(false)
    expect(estEnVers({ segment_metadata: { forme: 'prose' } })).toBe(false)
    expect(estEnVers({ segment_metadata: null })).toBe(false)
    expect(estEnVers(null)).toBe(false)
    expect(estEnVers(undefined)).toBe(false)
  })

  it('les DEUX enveloppes se lisent, à plat comme imbriquée', () => {
    // ⚠️ Ce n'est pas une seconde déclaration mais un second TRANSPORT : selon la
    // requête, la forme arrive à plat (`forme:segment_metadata->>forme` de
    // `SELECT_SEGMENT`) ou dans la colonne entière. C'est là que le défaut se logeait.
    expect(formeDeSegment({ forme: FORME_VERS })).toBe(FORME_VERS)
    expect(formeDeSegment({ segment_metadata: { forme: FORME_VERS } })).toBe(FORME_VERS)
    expect(formeDeSegment({})).toBe(null)
  })

  it('⛔ un bloc est en vers TOUT ou RIEN, comme pour les versets', () => {
    expect(estBlocDeVers([{ forme: FORME_VERS }, { segment_metadata: { forme: FORME_VERS } }])).toBe(true)
    expect(estBlocDeVers([{ forme: FORME_VERS }, {}])).toBe(false)
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

  it('⛔ les CINQ rangs se distinguent, sur les quatre surfaces à la fois', () => {
    // Le style est partagé : ce que ce test garde, la lecture ordinaire, le bilingue,
    // les traductions parallèles et l'apparat le tiennent tous les quatre. Le plafond
    // a valu 3 et confondait le rang 4 avec le rang 3 partout d'un coup.
    const marges = [0, 1, 2, 3, 4].map(rang => styleLigneDeVers({ rang }).marginLeft)
    expect(new Set(marges).size).toBe(5)
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

  // ⛔ La CINQUIÈME surface : l'argument hissé en tête d'une division. Elle a vécu sans
  // le vers jusqu'au 2026-09-07, et le Manuel de Dhuoda y rendait 79 vers en prose.
  it('⛔ l’ARGUMENT en vers garde la face de l’argument et la géométrie du vers', () => {
    const bloc = styleBlocArgumentEnVers()
    const prose = styleArgument()
    // La FACE est celle de l'argument, au caractère près : un poème d'argument ne se
    // compose pas dans un autre corps que l'argument qui le précède.
    expect(bloc.fontSize).toBe(prose.fontSize)
    expect(bloc.fontStyle).toBe(prose.fontStyle)
    expect(bloc.color).toBe(prose.color)
    expect(bloc.fontFamily).toBe(prose.fontFamily)
    // ⛔ Et rien de la PROSE : ni justification, ni césure.
    expect(bloc.textAlign).toBeUndefined()
    expect(bloc.hyphens).toBeUndefined()
    expect(prose.textAlign).toBe('justify')
    expect(prose.hyphens).toBe('auto')
  })

  it('⛔ la ligne d’argument est la ligne de vers, retrait de suite compris', () => {
    const ligne = styleLigneArgumentEnVers({ rang: 2 })
    const vers = styleLigneDeVers({ rang: 2 })
    expect(ligne.marginLeft).toBe(vers.marginLeft)
    expect(ligne.textIndent).toBe(vers.textIndent)
    expect(ligne.lineHeight).toBe(vers.lineHeight)
    expect(ligne.hyphens).toBe('none')
    // ⛔ Le raccourci `padding` écraserait le retrait de suite : les rembourrages du
    // chrome se posent en longhand, et `paddingLeft` reste celui du vers.
    expect(ligne.paddingLeft).toBe(vers.paddingLeft)
    expect(ligne.padding).toBeUndefined()
    // La strophe ouvre son blanc là comme ailleurs.
    expect(styleLigneArgumentEnVers({ rang: 0, ouvreStrophe: true }).marginTop).toBe('0.6rem')
  })
})
