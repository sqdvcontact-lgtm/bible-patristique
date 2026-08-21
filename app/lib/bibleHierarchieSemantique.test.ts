import { describe, expect, it } from 'vitest'
import {
  baliseTitre,
  classesDuStyle,
  construirePlan,
  diviserIntitule,
  empilerTitre,
  intituleDeRendu,
  JETONS_INFO,
  JETONS_TITRE,
  resoudreStyleSemantique,
  styleConnu,
  stylesInconnus,
  type JetonTitre,
} from './bibleHierarchieSemantique'

describe('hiérarchie sémantique de la page Bible', () => {
  it('porte les six jetons de titre et les six jetons d’information', () => {
    expect(JETONS_TITRE).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6'])
    expect(JETONS_INFO).toEqual(['I1', 'I2', 'I3', 'I4', 'I5', 'I6'])
  })

  it('ne confond pas les deux échelles', () => {
    // Même portée, deux échelles : le titre d'une péricope est T6, ce qui
    // l'explique est I5. L'un dit la profondeur, l'autre l'étendue.
    expect(resoudreStyleSemantique('titre_pericope')?.level).toBe('T6')
    expect(resoudreStyleSemantique('commentaire_pericope')?.level).toBe('I5')
    expect(resoudreStyleSemantique('titre_pericope')?.kind).toBe('title')
    expect(resoudreStyleSemantique('commentaire_pericope')?.kind).toBe('info')
  })

  it('sépare le niveau et la nature', () => {
    const intro = resoudreStyleSemantique('introduction_pericope')
    const commentaire = resoudreStyleSemantique('commentaire_pericope')
    expect(intro?.level).toBe('I5')
    expect(commentaire?.level).toBe('I5')
    expect(intro?.nature).toBe('introduction')
    expect(commentaire?.nature).toBe('commentary')
    expect(classesDuStyle(intro!)).toEqual(['cs-bible-info--i5', 'cs-bible-block--introduction'])
    expect(classesDuStyle(commentaire!)).toEqual(['cs-bible-info--i5', 'cs-bible-block--commentary'])
  })

  it('résout l’alias ancien « titre_section »', () => {
    const resolu = resoudreStyleSemantique('titre_section')
    expect(resolu?.canonique).toBe('titre_section_livre')
    expect(resolu?.level).toBe('T3')
  })

  it('refuse un style absent du registre plutôt que de l’aplatir', () => {
    expect(resoudreStyleSemantique('commentaire_inconnu')).toBeNull()
    expect(styleConnu('commentaire_inconnu')).toBe(false)
    expect(stylesInconnus(['introduction_livre', 'zzz', 'yyy', 'zzz'])).toEqual(['yyy', 'zzz'])
  })

  it('garde la note de verset au bas de page, jamais dans le corps', () => {
    const note = resoudreStyleSemantique('note_verset')
    expect(note?.level).toBe('I6')
    expect(note?.placement).toBe('footnote_only')
    expect(note?.bodyBlock).toBe(false)
  })

  it('ne répète pas le titre du livre, que la page porte déjà', () => {
    const titre = resoudreStyleSemantique('titre_livre')
    expect(titre?.level).toBe('T1')
    expect(titre?.bodyBlock).toBe(false)
    expect(titre?.includeInOutline).toBe(false)
  })

  describe('cas mixtes : intitulé et développement', () => {
    it('fait du titre d’une péricope un vrai titre, au plan', () => {
      const intro = resoudreStyleSemantique('introduction_pericope')
      expect(intro?.headingRole).toBe('title')
      expect(intro?.headingLevel).toBe('T6')
      expect(intro?.headingInOutline).toBe(true)
    })

    it('laisse l’intitulé d’un commentaire hors du plan', () => {
      const commentaire = resoudreStyleSemantique('commentaire_pericope')
      expect(commentaire?.headingRole).toBe('label')
      expect(commentaire?.headingInOutline).toBe(false)
    })

    it('normalise heading et source_heading sans les concaténer au texte', () => {
      expect(intituleDeRendu({ heading: 'Le précurseur' })).toBe('Le précurseur')
      expect(intituleDeRendu({ source_heading: '  Le baptême  ' })).toBe('Le baptême')
      expect(intituleDeRendu({ heading: null, source_heading: null })).toBeNull()
      expect(intituleDeRendu({ heading: '   ' })).toBeNull()
    })
  })

  describe('plan de navigation', () => {
    it('ne retient que ce que le registre y met', () => {
      const plan = construirePlan([
        { id: 'p', semanticStyle: 'titre_partie_livre', intitule: 'Première partie' },
        { id: 'c', semanticStyle: 'commentaire_pericope', intitule: 'Le précurseur fait son apparition' },
        { id: 'i', semanticStyle: 'introduction_pericope', intitule: 'Le baptême de Jésus' },
        { id: 'x', semanticStyle: 'introduction_livre', intitule: 'La personne de l’auteur' },
      ])
      expect(plan.map((e) => e.id)).toEqual(['p', 'i'])
      expect(plan.map((e) => e.jeton)).toEqual(['T2', 'T6'])
    })

    it('écarte un titre sans intitulé plutôt que d’inscrire une ligne vide', () => {
      expect(construirePlan([{ id: 't', semanticStyle: 'titre_section_livre', intitule: null }])).toEqual([])
    })
  })

  describe('balise HTML', () => {
    it('descend d’un cran sous le parent réellement présent', () => {
      // Une édition sans partie ni sous-section : T3 puis T5 ne doivent pas
      // produire h3 puis h5, ce qui sauterait des rangs dans le plan.
      let pile: JetonTitre[] = []
      expect(baliseTitre(pile, 'T3')).toBe(1)
      pile = empilerTitre(pile, 'T3')
      expect(baliseTitre(pile, 'T5')).toBe(2)
      pile = empilerTitre(pile, 'T5')
      expect(baliseTitre(pile, 'T6')).toBe(3)
    })

    it('referme les frères et les niveaux plus étroits', () => {
      let pile: JetonTitre[] = []
      pile = empilerTitre(pile, 'T2')
      pile = empilerTitre(pile, 'T5')
      // Une nouvelle partie referme le chapitre ouvert dessous.
      expect(baliseTitre(pile, 'T2')).toBe(1)
      pile = empilerTitre(pile, 'T2')
      expect(pile).toEqual(['T2'])
    })

    it('garde le plan continu quand tous les niveaux sont présents', () => {
      const plan = construirePlan([
        { id: 'a', semanticStyle: 'titre_partie_livre', intitule: 'Partie' },
        { id: 'b', semanticStyle: 'titre_section_livre', intitule: 'Section' },
        { id: 'c', semanticStyle: 'titre_sous_section', intitule: 'Sous-section' },
        { id: 'd', semanticStyle: 'titre_chapitre_livre', intitule: 'Chapitre' },
        { id: 'e', semanticStyle: 'introduction_pericope', intitule: 'Péricope' },
      ])
      expect(plan.map((e) => e.niveauHtml)).toEqual([1, 2, 3, 4, 5])
    })

    it('ne dépasse jamais h6', () => {
      expect(baliseTitre(['T1', 'T2', 'T3', 'T4', 'T5'], 'T6')).toBe(6)
    })
  })
})

describe('intitulé en deux temps', () => {
  it('sépare le genre du développement et son objet', () => {
    expect(diviserIntitule('Introduction — 1° La personne de l’auteur')).toEqual({
      titre: 'Introduction',
      sousTitre: '1. La personne de l’auteur',
    })
    expect(diviserIntitule('Notice – Le Jourdain')).toEqual({
      titre: 'Notice', sousTitre: 'Le Jourdain',
    })
  })

  it('ne coupe pas un tiret qui appartient au mot', () => {
    expect(diviserIntitule('Jésus-Christ et les siens')).toEqual({
      titre: 'Jésus-Christ et les siens', sousTitre: null,
    })
    expect(diviserIntitule('Le précurseur fait son apparition')).toEqual({
      titre: 'Le précurseur fait son apparition', sousTitre: null,
    })
  })

  it('ne rend rien d’un intitulé vide', () => {
    expect(diviserIntitule(null)).toBeNull()
    expect(diviserIntitule('   ')).toBeNull()
  })
})
