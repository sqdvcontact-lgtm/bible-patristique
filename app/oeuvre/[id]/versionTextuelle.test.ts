import { describe, expect, it } from 'vitest'
import { decomposerEdition, identiteEdition, labelCourtVersion, libelleTraducteurVersion } from './versionTextuelle'

describe('métadonnées du texte actif', () => {
  it('sépare une mention d’édition de la publication sans identifiant spécifique', () => {
    expect(decomposerEdition(
      'Rouen, Jean Viret, Jacques Besongne et Clément Malassis, cinquième édition revue par le traducteur, 1646',
      1646,
    )).toEqual({
      editionDescription: 'Cinquième édition revue par le traducteur',
      publicationLabel: 'Rouen, Jean Viret, Jacques Besongne et Clément Malassis, 1646',
      ville: 'Rouen',
      editeur: 'Jean Viret, Jacques Besongne et Clément Malassis',
      annee: '1646',
    })
  })

  it('préserve une publication simple', () => {
    const resultat = decomposerEdition('Paris, Librairie de L. Hachette et Cie, 1861', 1861)
    expect(resultat.editionDescription).toBeNull()
    expect(resultat.ville).toBe('Paris')
    expect(resultat.editeur).toBe('Librairie de L. Hachette et Cie')
    expect(resultat.annee).toBe('1861')
  })

  it('reprend la formule du titre de version et compose un libellé court', () => {
    const version = {
      titre: 'Traduction de René de Ceriziers, cinquième édition, 1646',
      traducteur: 'René de Ceriziers',
      anneeEdition: 1646,
    }
    expect(libelleTraducteurVersion(version)).toBe('Traduction de René de Ceriziers')
    expect(labelCourtVersion(version)).toBe('Ceriziers 1646')
  })

  it('⛔ ne découpe pas un patronyme dans une mention de machine', () => {
    // Dhuoda, « Manuel pour mon fils » : la colonne française du texte en regard
    // s’intitulait « Scriptura 2026 », en face de « Bondurand 1887 ».
    expect(labelCourtVersion({
      titre: 'Traduction française IA — publication progressive',
      traducteur: 'Traduction IA — Corpus Scriptura',
      anneeEdition: 2026,
    })).toBe('Traduction IA 2026')
  })
})

// ── L'identité de l'édition qu'on lit ────────────────────────────────────────
describe('identiteEdition', () => {
  const oeuvre = {
    trad_auteur: 'Traduction IA — Corpus Scriptura',
    editeur: 'Alphonse Picard',
    ville: 'Paris',
    date_publication: '1887',
  }
  const version = {
    traducteur: null as string | null,
    traducteurLabel: null as string | null,
    villeEdition: null as string | null,
    editeurEdition: null as string | null,
    dateEdition: null as string | null,
    isDefault: false,
  }

  it('rend l’œuvre elle-même quand aucune version n’est active', () => {
    expect(identiteEdition(oeuvre, null)).toEqual({
      traducteur: 'Traduction IA — Corpus Scriptura',
      traducteurLabel: null,
      editeur: 'Alphonse Picard',
      ville: 'Paris',
      datePublication: '1887',
    })
  })

  it('⛔ n’emprunte pas un traducteur à l’œuvre : le silence d’une version est un fait', () => {
    const latin = { ...version, villeEdition: 'Paris', editeurEdition: 'Alphonse Picard', dateEdition: '1887' }
    expect(identiteEdition(oeuvre, latin).traducteur).toBeNull()
  })

  it('⛔ ne compose pas une adresse de deux éditions', () => {
    // La traduction n’a pas de ville : elle n’en prend pas une à l’édition latine.
    const francais = { ...version, traducteur: 'Traduction IA — Corpus Scriptura', isDefault: true,
      editeurEdition: 'Corpus Scriptura', dateEdition: '2026' }
    expect(identiteEdition(oeuvre, francais)).toEqual({
      traducteur: 'Traduction IA — Corpus Scriptura',
      traducteurLabel: null,
      editeur: 'Corpus Scriptura',
      ville: null,
      datePublication: '2026',
    })
  })

  it('laisse l’œuvre parler pour la version PAR DÉFAUT qui ne porte aucune adresse', () => {
    expect(identiteEdition(oeuvre, { ...version, isDefault: true }).ville).toBe('Paris')
    // Une version qui n’est pas celle que l’œuvre décrit ne lui emprunte rien.
    expect(identiteEdition(oeuvre, version).ville).toBeNull()
  })
})
