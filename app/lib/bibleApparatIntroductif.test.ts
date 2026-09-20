import { describe, expect, it } from 'vitest'

import { intituleDeManchette, manchettesDApparat, type BlocDApparat } from './bibleApparatIntroductif'
import { estSuiteDuBloc } from './bibleHierarchieSemantique'

/** La forme minimale de l'apparat introductif d'un livre, dans l'ordre matériel. */
function apparat(overrides: Partial<BlocDApparat>[] = []): BlocDApparat[] {
  const blocs: BlocDApparat[] = [
    {
      id: 'intro', blockKey: 'intro', semanticStyleCode: 'introduction_livre',
      heading: 'Genèse — Introduction', semanticParentKey: null,
    },
    {
      id: 't1', blockKey: 't1', semanticStyleCode: 'titre_sous_section',
      heading: 'Le sujet et le but', semanticParentKey: 'intro',
    },
    {
      id: 'c1a', blockKey: 'c1a', semanticStyleCode: 'commentaire', semanticLevel: 'I3',
      heading: null, semanticParentKey: 't1',
    },
    {
      id: 'c1b', blockKey: 'c1b', semanticStyleCode: 'commentaire', semanticLevel: 'I3',
      heading: null, semanticParentKey: 't1',
    },
    {
      id: 't2', blockKey: 't2', semanticStyleCode: 'titre_sous_section',
      heading: 'Plan et division', semanticParentKey: 'intro',
    },
    {
      id: 'c2a', blockKey: 'c2a', semanticStyleCode: 'commentaire', semanticLevel: 'I3',
      heading: null, semanticParentKey: 't2',
    },
  ]
  return blocs.map((bloc, rang) => ({ ...bloc, ...(overrides[rang] ?? {}) }))
}

describe('les subdivisions d’un apparat introductif passent en manchette', () => {
  it('absorbe le titre dans le premier développement qui le nomme pour parent', () => {
    const { absorbes, parBloc } = manchettesDApparat(apparat())

    expect([...absorbes].sort()).toEqual(['t1', 't2'])
    expect(parBloc.get('c1a')).toEqual({ titreId: 't1', texte: 'Le sujet et le but' })
    expect(parBloc.get('c2a')).toEqual({ titreId: 't2', texte: 'Plan et division' })
    // ⛔ Le SECOND paragraphe d’une subdivision ne reçoit rien : la manchette
    // ouvre le développement, elle ne se répète pas à chaque paragraphe.
    expect(parBloc.has('c1b')).toBe(false)
  })

  it('⛔ ne touche pas un titre dont le parent n’est pas une introduction', () => {
    // La même sous-section, sous une PARTIE du livre : c’est un titre ordinaire,
    // et il garde le blanc et la pose de son rang.
    const { absorbes } = manchettesDApparat([
      {
        id: 'partie', blockKey: 'partie', semanticStyleCode: 'titre_partie_livre',
        heading: 'Première partie', semanticParentKey: null,
      },
      {
        id: 'sous', blockKey: 'sous', semanticStyleCode: 'titre_sous_section',
        heading: 'I — Prélude : la généalogie', semanticParentKey: 'partie',
      },
      {
        id: 'corps', blockKey: 'corps', semanticStyleCode: 'commentaire', semanticLevel: 'I3',
        heading: null, semanticParentKey: 'sous',
      },
    ])

    expect(absorbes.size).toBe(0)
  })

  it('⛔ ne touche que le rang T4 : le titre de la pièce reste un titre', () => {
    // Daniel : un « Introduction » de rang T2 déclare l’introduction pour parent.
    // Il titre la pièce entière, il n’en divise pas le propos.
    const { absorbes } = manchettesDApparat([
      {
        id: 'intro', blockKey: 'intro', semanticStyleCode: 'introduction_livre',
        heading: 'Daniel — Introduction', semanticParentKey: null,
      },
      {
        id: 'titre', blockKey: 'titre', semanticStyleCode: 'titre_partie_livre',
        heading: 'Introduction', semanticParentKey: 'intro',
      },
      {
        id: 'corps', blockKey: 'corps', semanticStyleCode: 'commentaire', semanticLevel: 'I3',
        heading: null, semanticParentKey: 'titre',
      },
    ])

    expect(absorbes.size).toBe(0)
  })

  it('⛔ n’absorbe rien quand le développement manque, ou qu’il a déjà son intitulé', () => {
    const sansCorps = manchettesDApparat(apparat().slice(0, 2))
    expect(sansCorps.absorbes.size).toBe(0)

    const corpsIntitule = manchettesDApparat(
      apparat([{}, {}, { heading: 'Son propre repère' }]),
    )
    expect(corpsIntitule.absorbes.has('t1')).toBe(false)
    // La seconde subdivision, elle, n’a pas ce défaut et passe quand même.
    expect(corpsIntitule.absorbes.has('t2')).toBe(true)
  })

  it('ôte la numérotation de l’imprimé, et elle seule', () => {
    expect(intituleDeManchette('1. La personne de l’auteur')).toBe('La personne de l’auteur')
    expect(intituleDeManchette('2° Le plan et la division')).toBe('Le plan et la division')
    expect(intituleDeManchette('Le sujet et le but')).toBe('Le sujet et le but')
    // ⛔ Un chiffre ROMAIN désigne une division, il ne la numérote pas : la paire
    // « I — Ce qu’est la Bible » se compose en titre et chapeau, entière.
    expect(intituleDeManchette('I — Ce qu’est la Bible')).toBe('I — Ce qu’est la Bible')
    // ⛔ Ni un nombre qui OUVRE une phrase : rien n’est deviné hors du motif.
    expect(intituleDeManchette('70 ans de captivité')).toBe('70 ans de captivité')
  })

  it('⛔ une manchette rompt la suite : deux subdivisions ne se collent pas', () => {
    const dernierDeLaPremiere = { semanticStyleCode: 'commentaire', semanticLevel: 'I3', heading: null }
    const premierDeLaSeconde = { semanticStyleCode: 'commentaire', semanticLevel: 'I3', heading: null }

    // Même rang, même nature, aucun intitulé : sans la manchette, c’est une suite.
    expect(estSuiteDuBloc(dernierDeLaPremiere, premierDeLaSeconde)).toBe(true)
    expect(estSuiteDuBloc(dernierDeLaPremiere, { ...premierDeLaSeconde, manchette: 'Plan et division' })).toBe(false)
  })
})

describe('le registre dit le rang du titre porté, même sans déclaration du bloc', () => {
  it('⛔ un code canonique vaut son alias', async () => {
    const { resoudreStyleSemantique } = await import('./bibleHierarchieSemantique')
    // Genèse : l’alias porte son rang et celui de son titre.
    const parAlias = resoudreStyleSemantique('introduction_livre')
    // Matthieu : le code canonique, le rang déclaré par le bloc, et RIEN pour le
    // titre porté. Il se composait en rubrique grise ; il se compose en T2.
    const parCanonique = resoudreStyleSemantique('introduction_titree', { niveau: 'I1' })

    expect(parAlias?.headingLevel).toBe('T2')
    expect(parCanonique?.headingLevel).toBe('T2')
    expect(parCanonique?.headingRole).toBe('title')
  })
})
