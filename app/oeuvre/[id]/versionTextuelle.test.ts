import { describe, expect, it } from 'vitest'
import { decomposerEdition, labelCourtVersion, libelleTraducteurVersion } from './versionTextuelle'

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
})
