import { describe, expect, it } from 'vitest'
import {
  indexerLivresAelf,
  masquerTraductionsAelfIndisponibles,
  projeterCelluleAelf,
  traductionsDisponiblesPourLivres,
  type CellulePolyglotteAelf,
} from './polyglotteAelf'

const celluleScindee: CellulePolyglotteAelf = {
  id: 'aad285cd-eccf-4cc5-839f-cb06855136d6',
  aelf_book_code: 'GEN',
  aelf_chapter_base: 17,
  aelf_verse_base: 3,
  historical_canon_id: 'GEN.17.4',
  livre: 'GEN',
  trad_id: 'TR0010',
  ch_orig: 17,
  v_orig: 4,
  v_orig_suffixe: null,
  texte: 'Et Dieu lui dit : ',
  notes: null,
}

describe('projection AELF de la Polyglotte', () => {
  it("place le fragment sur l'axe AELF, pas sur la référence historique", () => {
    expect(projeterCelluleAelf(celluleScindee)).toEqual({
      id: 'aelf:aad285cd-eccf-4cc5-839f-cb06855136d6',
      canon_id: 'GEN.17.3',
      canon_id_fin: null,
      livre: 'GEN',
      trad_id: 'TR0010',
      ch_orig: 17,
      v_orig: 4,
      v_orig_suffixe: null,
      texte: 'Et Dieu lui dit : ',
      notes: null,
      lectureSeuleAelf: true,
    })
  })

  it('n’offre Fillion que dans les livres réellement publiés par la vue', () => {
    const couverture = indexerLivresAelf([
      { trad_id: 'TR0010', livre: 'GEN', nb_unites: 1533 },
      { trad_id: 'TR0011', livre: 'GEN', nb_unites: 1533 },
    ])
    const traductions = [
      { trad_id: 'TR0001' },
      { trad_id: 'TR0010', sourceAelf: true },
      { trad_id: 'TR0011', sourceAelf: true },
    ]

    expect(traductionsDisponiblesPourLivres(traductions, ['GEN'], couverture).map(t => t.trad_id))
      .toEqual(['TR0001', 'TR0010', 'TR0011'])
    expect(traductionsDisponiblesPourLivres(traductions, ['EXO'], couverture).map(t => t.trad_id))
      .toEqual(['TR0001'])
  })

  it('reste fermé si la couverture AELF n’a pas pu être lue', () => {
    const traductions = [{ trad_id: 'TR0010', sourceAelf: true }]
    expect(traductionsDisponiblesPourLivres(traductions, ['GEN'], new Map())).toEqual([])
  })

  it('masque une sélection Fillion conservée dès que le lecteur quitte la Genèse', () => {
    const traductions = [
      { trad_id: 'TR0001' },
      { trad_id: 'TR0010', sourceAelf: true },
      { trad_id: 'TR0011', sourceAelf: true },
    ]
    const disponiblesHorsGenese = [{ trad_id: 'TR0001' }]

    expect(masquerTraductionsAelfIndisponibles(
      ['TR0010', 'TR0001', 'TR0011'],
      traductions,
      disponiblesHorsGenese,
    )).toEqual(['', 'TR0001', ''])
  })
})
