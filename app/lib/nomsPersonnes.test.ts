import { describe, expect, it } from 'vitest'
import {
  decouperNom, nomAncien, nomCollectif, composerNom, composerNomIndex, cleTriNom,
  nomStructure, separerNoms, nettoyerNom, listeDepuisVirgules,
} from './nomsPersonnes'

describe('decouperNom — personnes modernes', () => {
  it('découpe un nom ordinaire sans réserve', () => {
    expect(decouperNom('François Refoulé')).toEqual({
      prenom: 'François', nom: 'Refoulé', pseudonyme: null, douteux: false, raison: null,
    })
  })

  it('garde l’initiale médiane avec le prénom', () => {
    const d = decouperNom('Thomas P. Osborne')
    expect(d.prenom).toBe('Thomas P.')
    expect(d.nom).toBe('Osborne')
    expect(d.douteux).toBe(false)
  })

  it('accepte un prénom composé', () => {
    const d = decouperNom('Jean-Marie Guillaume')
    expect(d).toMatchObject({ prenom: 'Jean-Marie', nom: 'Guillaume', douteux: false })
  })

  // La particule ouvre le bloc patronymique, et tout ce qui suit en fait partie.
  it('rattache la particule et sa suite au nom de famille', () => {
    const d = decouperNom('Pierre de Martin de Viviés')
    expect(d.prenom).toBe('Pierre')
    expect(d.nom).toBe('de Martin de Viviés')
  })

  it('signale la particule, dont la place ne se devine pas', () => {
    expect(decouperNom('José Grosdidier de Matons').douteux).toBe(true)
    expect(decouperNom('Adalbert de Vogüé').douteux).toBe(true)
  })

  // Sans cette règle, « Dale C. Allison Jr. » se classait à « Jr. ».
  it('garde le suffixe de filiation avec le nom de famille', () => {
    const d = decouperNom('Dale C. Allison Jr.')
    expect(d.prenom).toBe('Dale C.')
    expect(d.nom).toBe('Allison Jr.')
    expect(d.douteux).toBe(false)
    expect(composerNom(d)).toBe('Dale C. Allison Jr.')
  })

  it('signale deux mots pleins devant le nom', () => {
    const d = decouperNom('Deborah Levine Gera')
    expect(d).toMatchObject({ prenom: 'Deborah Levine', nom: 'Gera', douteux: true })
  })

  it('pose un mot unique en pseudonyme, et le signale', () => {
    const d = decouperNom('Voltaire')
    expect(d).toMatchObject({ prenom: null, nom: null, pseudonyme: 'Voltaire', douteux: true })
  })

  it('refuse le vide sans lever', () => {
    expect(decouperNom('   ').douteux).toBe(true)
    expect(decouperNom('').nom).toBeNull()
  })
})

describe('nomAncien / nomCollectif', () => {
  // Règle de l'auteur : jusqu'à la fin du Moyen Âge, le nom n'est pas un patronyme.
  it('pose le nom entier d’un ancien en pseudonyme', () => {
    expect(nomAncien('Irénée de Lyon')).toEqual({ prenom: null, nom: null, pseudonyme: 'Irénée de Lyon' })
    expect(nomAncien('Augustin d’Hippone').pseudonyme).toBe('Augustin d’Hippone')
  })

  it('ne prête aucune des trois rubriques à un collectif', () => {
    expect(nomCollectif()).toEqual({ prenom: null, nom: null, pseudonyme: null })
  })
})

describe('composerNom — l’affichage reste « Prénom Nom »', () => {
  it('compose le nom civil', () => {
    expect(composerNom({ prenom: 'François', nom: 'Refoulé', pseudonyme: null })).toBe('François Refoulé')
  })

  // Le pseudonyme prime : on signe et l'on cite sous lui.
  it('préfère le pseudonyme au nom civil', () => {
    expect(composerNom({ prenom: 'François-Marie', nom: 'Arouet', pseudonyme: 'Voltaire' })).toBe('Voltaire')
  })

  it('retombe sur la chaîne déjà en base tant que les rubriques sont vides', () => {
    expect(composerNom({ prenom: null, nom: null, pseudonyme: null }, 'Pierre Prigent')).toBe('Pierre Prigent')
    expect(composerNom(null, 'Pierre Prigent')).toBe('Pierre Prigent')
    expect(composerNom(null)).toBe('')
  })
})

describe('composerNomIndex et cleTriNom — le classement va au nom de famille', () => {
  it('met le nom de famille devant', () => {
    expect(composerNomIndex({ prenom: 'François', nom: 'Refoulé', pseudonyme: null })).toBe('Refoulé, François')
  })

  // On dit Voltaire, on classe à Arouet.
  it('classe un pseudonyme au nom civil quand il est connu', () => {
    expect(composerNomIndex({ prenom: 'François-Marie', nom: 'Arouet', pseudonyme: 'Voltaire' })).toBe('Arouet, François-Marie')
  })

  it('classe au pseudonyme quand aucun nom civil n’est connu', () => {
    expect(composerNomIndex({ prenom: null, nom: null, pseudonyme: 'Irénée de Lyon' })).toBe('Irénée de Lyon')
  })

  it('rend une clé sans accent ni capitale', () => {
    expect(cleTriNom({ prenom: 'François', nom: 'Refoulé', pseudonyme: null })).toBe('refoule, francois')
  })
})

describe('nomStructure', () => {
  it('reconnaît une fiche remplie et une fiche vide', () => {
    expect(nomStructure({ prenom: null, nom: 'Refoulé', pseudonyme: null })).toBe(true)
    expect(nomStructure({ prenom: null, nom: null, pseudonyme: 'Voltaire' })).toBe(true)
    expect(nomStructure({ prenom: ' ', nom: '', pseudonyme: null })).toBe(false)
    expect(nomStructure(null)).toBe(false)
  })
})

describe('separerNoms — la chaîne d’une notice', () => {
  it('sépare les co-auteurs au point-virgule', () => {
    expect(separerNoms('André Caquot; Philippe de Robert')).toEqual(['André Caquot', 'Philippe de Robert'])
  })

  it('tolère les espaces autour du séparateur', () => {
    expect(separerNoms('Vicente Artuso ; Fabrizio Zandonadi Catenassi'))
      .toEqual(['Vicente Artuso', 'Fabrizio Zandonadi Catenassi'])
  })

  // La mention de rôle est déjà portée par la notice : elle n'appartient pas au nom.
  it('retire la mention de rôle collée au nom', () => {
    expect(separerNoms('Laurence Mellerin (dir.)')).toEqual(['Laurence Mellerin'])
    expect(separerNoms('Pères grecs et latins ; Florence Bouet (éd.)'))
      .toEqual(['Pères grecs et latins', 'Florence Bouet'])
  })

  it('ignore les segments vides', () => {
    expect(separerNoms('Alcuin;;')).toEqual(['Alcuin'])
    expect(separerNoms('')).toEqual([])
  })
})

describe('listeDepuisVirgules — les noms alternatifs', () => {
  it('découpe et nettoie, comme les variantes d’un éditeur', () => {
    expect(listeDepuisVirgules(" Jérôme ,  Hieronymus,, ")).toEqual(['Jérôme', 'Hieronymus'])
  })

  it('normalise l’apostrophe, comme partout ailleurs', () => {
    expect(listeDepuisVirgules("Augustin d'Hippone")).toEqual(['Augustin d’Hippone'])
  })

  // Deux fois la même variante ne résout pas mieux.
  it('écarte les doublons', () => {
    expect(listeDepuisVirgules('Jérôme, Jérôme')).toEqual(['Jérôme'])
  })

  it('rend une liste vide sur une saisie vide', () => {
    expect(listeDepuisVirgules('  ,  ')).toEqual([])
    expect(listeDepuisVirgules('')).toEqual([])
  })
})

describe('nettoyerNom', () => {
  it('normalise l’apostrophe et les blancs', () => {
    expect(nettoyerNom("  Augustin  d'Hippone ")).toBe('Augustin d’Hippone')
  })
})
