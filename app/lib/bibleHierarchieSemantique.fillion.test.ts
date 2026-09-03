import { describe, expect, it } from 'vitest'

import { baliserBlocs } from './bibleHierarchieSemantique'

describe('front-matter Fillion et hiérarchie du chapitre', () => {
  it('ferme la branche de l’introduction avant le premier titre du corps', () => {
    // Forme minimale de Gn 1 : l’introduction de livre porte son propre T2 ;
    // ses cinq intertitres T4 la nomment comme parent. Le premier titre du corps,
    // « Le Divin Prélude », est une racine analytique distincte. Il ne doit donc
    // jamais devenir l’enfant HTML de « Introduction » simplement parce que les
    // deux arbres se suivent dans l’ordre matériel.
    const balises = baliserBlocs([
      {
        id: 'intro', blockKey: 'intro', semanticStyle: 'introduction_livre',
        intitule: 'Genèse — Introduction', semanticParentKey: null,
      },
      {
        id: 'intro-section', blockKey: 'intro-section', semanticStyle: 'titre_sous_section',
        intitule: 'Le sujet et le but', semanticParentKey: 'intro',
      },
      {
        id: 'corps', blockKey: 'corps', semanticStyle: 'titre_section_livre',
        intitule: 'Le Divin Prélude', semanticParentKey: null,
      },
      {
        id: 'corps-section', blockKey: 'corps-section', semanticStyle: 'titre_sous_section',
        intitule: 'La création', semanticParentKey: 'corps',
      },
    ])

    expect(balises.get('intro')).toBe(1)
    expect(balises.get('intro-section')).toBe(2)
    expect(balises.get('corps')).toBe(1)
    expect(balises.get('corps-section')).toBe(2)
  })

  it('conserve la pile implicite des vrais titres structurels', () => {
    // L’isolement ne vaut que pour un titre PORTÉ par un bloc d’information.
    // Deux titres structurels ordinaires sans parent déclaré continuent de se
    // hiérarchiser par leur rang, pour les lots plus anciens qui n’ont pas encore
    // de semantic_parent_key exhaustif.
    const balises = baliserBlocs([
      {
        id: 'partie', blockKey: 'partie', semanticStyle: 'titre_partie_livre',
        intitule: 'Première partie', semanticParentKey: null,
      },
      {
        id: 'section', blockKey: 'section', semanticStyle: 'titre_section_livre',
        intitule: 'Section I', semanticParentKey: null,
      },
    ])

    expect(balises.get('partie')).toBe(1)
    expect(balises.get('section')).toBe(2)
  })
})
