import { describe, expect, it } from 'vitest'
import { indexerLivresFillion, masquerTraductionsIndisponibles, traductionsDisponiblesPourLivres } from './polyglotteFillion'

const couverture = indexerLivresFillion([
  { trad_id: 'TR0010', livre: 'GEN', nb_versets: 1533 },
  { trad_id: 'TR0010', livre: 'EXO', nb_versets: 1213 },
  { trad_id: 'TR0011', livre: 'GEN', nb_versets: 1533 },
])

const traductions = [
  { trad_id: 'TR0001' },
  { trad_id: 'TR0004' },
  { trad_id: 'TR0010', sourceFillion: true },
  { trad_id: 'TR0011', sourceFillion: true },
]

describe('la Fillion dans le menu de la Polyglotte', () => {
  it('range les livres par traduction', () => {
    expect(couverture.get('TR0010')).toEqual(new Set(['GEN', 'EXO']))
    expect(couverture.get('TR0011')).toEqual(new Set(['GEN']))
  })

  it('offre chaque texte de la Fillion là où il est aligné, et lui seul', () => {
    expect(traductionsDisponiblesPourLivres(traductions, ['GEN'], couverture).map(t => t.trad_id))
      .toEqual(['TR0001', 'TR0004', 'TR0010', 'TR0011'])
    // Le latin n'est pas encore aligné sur l'Exode : le français y va seul.
    expect(traductionsDisponiblesPourLivres(traductions, ['EXO'], couverture).map(t => t.trad_id))
      .toEqual(['TR0001', 'TR0004', 'TR0010'])
    expect(traductionsDisponiblesPourLivres(traductions, ['MAT'], couverture).map(t => t.trad_id))
      .toEqual(['TR0001', 'TR0004'])
  })

  it('suffit qu’UN des livres affichés la porte', () => {
    expect(traductionsDisponiblesPourLivres(traductions, ['MAT', 'MRK', 'GEN'], couverture).map(t => t.trad_id))
      .toEqual(['TR0001', 'TR0004', 'TR0010', 'TR0011'])
  })

  it('reste fermée si la couverture n’a pas pu être lue', () => {
    expect(traductionsDisponiblesPourLivres(traductions, ['GEN'], new Map()).map(t => t.trad_id))
      .toEqual(['TR0001', 'TR0004'])
  })
})

describe('les colonnes hors des livres couverts', () => {
  it('vide la colonne de la Fillion sans oublier le choix', () => {
    const disponibles = traductionsDisponiblesPourLivres(traductions, ['MAT'], couverture)
    expect(masquerTraductionsIndisponibles(['TR0001', 'TR0010', 'TR0011', ''], traductions, disponibles))
      .toEqual(['TR0001', '', '', ''])
  })

  it('laisse tout en place là où la Fillion se lit', () => {
    const disponibles = traductionsDisponiblesPourLivres(traductions, ['GEN'], couverture)
    expect(masquerTraductionsIndisponibles(['TR0001', 'TR0010', 'TR0011', ''], traductions, disponibles))
      .toEqual(['TR0001', 'TR0010', 'TR0011', ''])
  })

  it('ne touche jamais à une bible de `versets_v2`', () => {
    expect(masquerTraductionsIndisponibles(['TR0004'], traductions, [])).toEqual(['TR0004'])
  })
})
