import { describe, it, expect } from 'vitest'
import { joindreLieux, segmentsReferenceEdition, texteReferenceEdition } from './referenceEditionServie'

const FILLION = {
  titreEdition: 'La Sainte Bible (texte latin et traduction française), commentée d’après la Vulgate et les textes originaux, à l’usage des séminaires et du clergé',
  lieuEdition: 'Paris',
  editeur: 'Letouzey et Ané',
  anneeEdition: '1888-1904',
  nombreTomes: 8,
}

describe('referenceEditionServie — la référence des volumes utilisés', () => {
  it('compose l’adresse complète, tomes compris', () => {
    expect(texteReferenceEdition(FILLION)).toBe(
      'La Sainte Bible (texte latin et traduction française), commentée d’après la Vulgate et les textes originaux, à l’usage des séminaires et du clergé, Paris, Letouzey et Ané, 1888-1904, 8 vol.',
    )
  })

  it('joint le sous-titre par un POINT, dans l’italique du titre', () => {
    expect(texteReferenceEdition({ titreEdition: 'La Sainte Bible', sousTitreEdition: 'Traduite en françois sur la Vulgate', lieuEdition: 'Paris', anneeEdition: '1730' }))
      .toBe('La Sainte Bible. Traduite en françois sur la Vulgate, Paris, 1730.')
    // Les deux fragments et leur charnière sont en italique — un seul intitulé.
    const compositions = segmentsReferenceEdition({ titreEdition: 'La Sainte Bible', sousTitreEdition: 'Nova editio' })
      .slice(0, 3).map(s => s.composition)
    expect(compositions).toEqual(['italique', 'italique', 'italique'])
  })

  it('ne double pas la ponctuation forte d’un titre attesté', () => {
    expect(texteReferenceEdition({ titreEdition: 'Où en est la question biblique ?', sousTitreEdition: 'Réponse' }))
      .toBe('Où en est la question biblique ? Réponse.')
  })

  it('laisse tomber le séparateur d’un champ absent', () => {
    expect(texteReferenceEdition({ titreEdition: 'Biblia sacra', editeur: 'Biblioteca de Autores Cristianos', anneeEdition: '1946' }))
      .toBe('Biblia sacra, Biblioteca de Autores Cristianos, 1946.')
  })

  it('garde les millésimes TELS QUE la base les écrit', () => {
    expect(texteReferenceEdition({ titreEdition: 'The Old Testament in Greek', lieuEdition: 'Cambridge', anneeEdition: 'vol. I : 1909 ; vol. II : 1907 ; vol. III : 1912', nombreTomes: 3 }))
      .toBe('The Old Testament in Greek, Cambridge, vol. I : 1909 ; vol. II : 1907 ; vol. III : 1912, 3 vol.')
  })

  it('n’écrit pas « 1 vol. » — un volume unique est le cas ordinaire', () => {
    expect(texteReferenceEdition({ titreEdition: 'La Sainte Bible', anneeEdition: '1910', nombreTomes: 1 }))
      .toBe('La Sainte Bible, 1910.')
    expect(texteReferenceEdition({ titreEdition: 'La Sainte Bible', anneeEdition: '1910', nombreTomes: null }))
      .toBe('La Sainte Bible, 1910.')
  })

  it('se tait sans titre : un lieu et une date ne nomment rien', () => {
    expect(segmentsReferenceEdition({ lieuEdition: 'Paris', anneeEdition: '1730' })).toEqual([])
    expect(segmentsReferenceEdition({ titreEdition: '   ' })).toEqual([])
    expect(segmentsReferenceEdition({})).toEqual([])
  })

  it('nomme le champ d’origine de chaque fragment', () => {
    const champs = segmentsReferenceEdition(FILLION).map(s => s.champ)
    expect(champs).toContain('titre')
    expect(champs).toContain('lieu')
    expect(champs).toContain('editeur')
    expect(champs).toContain('annee')
  })
})

describe('joindreLieux', () => {
  it('joint plusieurs lieux par un trait d’union', () => {
    expect(joindreLieux('Paris ; Tournai ; Rome')).toBe('Paris-Tournai-Rome')
  })

  it('laisse un lieu unique tel quel, espaces compris', () => {
    expect(joindreLieux('Bar-le-Duc')).toBe('Bar-le-Duc')
    expect(joindreLieux(null)).toBeNull()
  })

  it('la référence des volumes suit la même règle', () => {
    expect(texteReferenceEdition({ titreEdition: 'La Sainte Bible', lieuEdition: 'Paris ; Tournai ; Rome', editeur: 'Desclée et Cie ; Société de S. Jean l’Évangéliste', anneeEdition: '1923' }))
      .toBe('La Sainte Bible, Paris-Tournai-Rome, Desclée et Cie ; Société de S. Jean l’Évangéliste, 1923.')
  })
})
