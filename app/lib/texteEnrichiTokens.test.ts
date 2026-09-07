import { describe, expect, it } from 'vitest'
import { fragmentsEnrichis } from './texteEnrichiTokens'
import { texteSansEnrichissement } from '../oeuvre/[id]/texteEnrichi'

/**
 * La garde du DÉCOUPAGE : le texte NU d'un découpage doit valoir, caractère pour
 * caractère, ce que le rendu de lecture rend d'un texte dépouillé de ses marques.
 *
 * ⛔ C'est le seul lien entre les deux lectures de la grammaire, et il est nécessaire :
 * le motif est recopié faute de pouvoir être partagé sans emporter React dans un module
 * qui tourne au serveur. Une grammaire qui bougerait d'un seul côté fait tomber ce test.
 */
const CAS = [
  'Un texte tout simple.',
  '**Gras** au début, et *italique* à la fin.',
  'Le ++quadrilobe++ en petites capitales.',
  'Un exposant ^^er^^ dans la ligne.',
  'Un lien [vers Augustin](https://exemple.test/augustin) au fil du texte.',
  'Au XIIIe siècle, la Bible française.',
  'Le texte biblique porte son <i>italique</i> sous cette forme.',
  'Une paire vide <i></i> ne rend rien.',
  '*Une italique **qui porte un gras** au milieu.*',
  'Rien à faire ici : ni marque, ni balise.',
]

describe('la grammaire d’enrichissement, lue à plat', () => {
  it('rend le même texte nu que la lecture', () => {
    for (const cas of CAS) {
      const nu = fragmentsEnrichis(cas).map(f => f.texte).join('')
      expect(nu, cas).toBe(texteSansEnrichissement(cas))
    }
  })

  it('porte les marques sur les fragments qu’elles couvrent', () => {
    const fragments = fragmentsEnrichis('avant **gras** après')
    expect(fragments).toEqual([
      { texte: 'avant ' },
      { gras: true, texte: 'gras' },
      { texte: ' après' },
    ])
  })

  it('cumule les marques imbriquées', () => {
    const fragments = fragmentsEnrichis('**gras avec *ital* dedans**')
    expect(fragments.map(f => [f.texte, f.gras === true, f.italique === true])).toEqual([
      ['gras avec ', true, false],
      ['ital', true, true],
      [' dedans', true, false],
    ])
  })

  // ⚠️ Le SENS DE LECTURE de la grammaire est celui du rendu, et il surprend : dans
  // `*ital **et gras** suite*`, c'est l'italique SIMPLE qui l'emporte à l'ouverture, et
  // les deux astérisques du gras se lisent comme deux fermetures d'italique. Le texte nu
  // reste juste, le gras se perd. C'est une propriété du corpus, non un défaut du
  // découpage : la garde de parité, ci-dessus, tient les deux lectures d'accord.
  it('lit un gras enchâssé dans une italique comme le rendu le lit', () => {
    expect(fragmentsEnrichis('*ital **et gras** suite*')).toEqual([
      { italique: true, texte: 'ital et gras suite' },
    ])
  })

  it('découpe un siècle en trois : le nombre, l’ordinal, le mot', () => {
    expect(fragmentsEnrichis('au XIIIe siècle')).toEqual([
      { texte: 'au ' },
      { petitesCapitales: true, texte: 'XIII' },
      { exposant: true, texte: 'e' },
      { texte: ' siècle' },
    ])
  })

  it('garde l’adresse d’un lien, et le libellé comme texte', () => {
    const fragments = fragmentsEnrichis('voir [la page](https://exemple.test/x) ici')
    expect(fragments[1]).toEqual({ lien: 'https://exemple.test/x', texte: 'la page' })
  })

  it('réunit deux fragments voisins de mêmes marques', () => {
    // Le mot ne doit pas se couper en deux courses : une seule, ou Word coupe la ligne.
    expect(fragmentsEnrichis('mot<i></i>suite')).toEqual([{ texte: 'motsuite' }])
  })

  it('n’a pas de curseur qui traîne d’un appel à l’autre', () => {
    // Une expression `g` réemployée garderait son `lastIndex` : deux appels de suite
    // sur le même texte doivent rendre exactement la même chose.
    const premier = fragmentsEnrichis('**a** et **b**')
    const second = fragmentsEnrichis('**a** et **b**')
    expect(second).toEqual(premier)
  })
})
