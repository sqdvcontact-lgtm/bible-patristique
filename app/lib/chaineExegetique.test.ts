import { describe, expect, it } from 'vitest'
import {
  accorder, composerChaine, compterChaine, versetsAResoudre,
  type CommentaireBrut, type NoteBrute,
} from './chaineExegetique'

const commentaire = (c: Partial<CommentaireBrut> & { id: number }): CommentaireBrut => ({
  id_verset: 'GEN.1.1', texte: 'Un commentaire.', created_at: '2026-08-02T07:15:00Z',
  valide: true, reponse_a: null, supprime: false, ...c,
})

const note = (n: Partial<NoteBrute>): NoteBrute => ({
  canon_id: 'GEN.1.1', texte: 'Une note.', updated_at: '2026-08-02T18:12:00Z', ...n,
})

describe('composerChaine', () => {
  it('fond les deux sources sur un même verset, dans l’ordre où elles ont été écrites', () => {
    const groupes = composerChaine(
      [commentaire({ id: 36, created_at: '2026-07-25T13:03:00Z' })],
      [note({})],
    )
    expect(groupes).toHaveLength(1)
    expect(groupes[0].entrees).toHaveLength(1)
    expect(groupes[0].entrees[0].gloses.map(g => g.nature)).toEqual(['commentaire', 'note'])
  })

  it('range les versets dans l’ordre du canon, jamais par date', () => {
    const groupes = composerChaine([
      commentaire({ id: 1, id_verset: 'JHN.1.1', created_at: '2026-01-01T00:00:00Z' }),
      commentaire({ id: 2, id_verset: 'GEN.3.15', created_at: '2026-06-01T00:00:00Z' }),
      commentaire({ id: 3, id_verset: 'GEN.1.1', created_at: '2026-09-01T00:00:00Z' }),
    ], [])
    expect(groupes.map(g => g.code)).toEqual(['GEN', 'JHN'])
    expect(groupes[0].entrees.map(e => e.canonId)).toEqual(['GEN.1.1', 'GEN.3.15'])
    expect(groupes[0].entrees[0].reference).toBe('Genèse 1, 1')
    expect(groupes[0].nom).toBe('Genèse')
    expect(groupes[0].ancre).toBe('livre-GEN')
    expect(groupes[0].rubrique).toBe('Ancien Testament')
    expect(groupes[1].rubrique).toBe('Nouveau Testament')
  })

  it('range les versets d’un même chapitre par numéro, et non par ordre alphabétique', () => {
    const groupes = composerChaine([
      commentaire({ id: 1, id_verset: 'GEN.1.10' }),
      commentaire({ id: 2, id_verset: 'GEN.1.2' }),
      commentaire({ id: 3, id_verset: 'GEN.2.1' }),
    ], [])
    expect(groupes[0].entrees.map(e => e.canonId)).toEqual(['GEN.1.2', 'GEN.1.10', 'GEN.2.1'])
  })

  it('⛔ écarte la note VIDE que laisse une saisie ouverte puis refermée', () => {
    expect(composerChaine([], [note({ texte: '' }), note({ canon_id: 'GEN.1.7', texte: '   ' })])).toEqual([])
  })

  it('⛔ écarte le commentaire supprimé, et celui qui ne vise aucun verset', () => {
    const groupes = composerChaine([
      commentaire({ id: 1, supprime: true }),
      commentaire({ id: 2, id_verset: null }),
    ], [])
    expect(groupes).toEqual([])
  })

  it('dit ce qui est en révision et ce qui répond à un autre', () => {
    const [groupe] = composerChaine([
      commentaire({ id: 1, valide: false, created_at: '2026-01-01T00:00:00Z' }),
      commentaire({ id: 2, reponse_a: 1, created_at: '2026-01-02T00:00:00Z' }),
    ], [])
    expect(groupe.entrees[0].gloses.map(g => [g.enRevision, g.enReponse])).toEqual([[true, false], [false, true]])
  })

  it('garde les identifiants hérités, à part et en fin de chaîne', () => {
    const groupes = composerChaine([
      commentaire({ id: 1, id_verset: 'B000015' }),
      commentaire({ id: 2, id_verset: 'REV.22.21' }),
      commentaire({ id: 3, id_verset: 'GEN.1.1' }),
    ], [])
    expect(groupes.map(g => g.code)).toEqual(['GEN', 'REV', ''])
    const heritees = groupes[2]
    expect(heritees.nom).toBe('Références anciennes')
    expect(heritees.entrees[0].reference).toBe('B000015')
    expect(heritees.entrees[0].livre).toBe('')
  })

  it('ne demande le texte que des versets que la base sait résoudre', () => {
    const groupes = composerChaine([
      commentaire({ id: 1, id_verset: 'B000015' }),
      commentaire({ id: 2, id_verset: 'GEN.1.1' }),
    ], [])
    expect(versetsAResoudre(groupes)).toEqual(['GEN.1.1'])
  })

  it('compte sur la chaîne composée, une fois les vides écartés', () => {
    const groupes = composerChaine(
      [commentaire({ id: 1 }), commentaire({ id: 2, id_verset: 'JHN.1.1' })],
      [note({}), note({ canon_id: 'GEN.1.7', texte: '' })],
    )
    expect(compterChaine(groupes)).toEqual({ versets: 2, notes: 1, commentaires: 2 })
  })
})

describe('accorder', () => {
  it('accorde le compte avec son nom', () => {
    expect(accorder(0, 'note')).toBe('0 note')
    expect(accorder(1, 'note')).toBe('1 note')
    expect(accorder(3, 'note')).toBe('3 notes')
    expect(accorder(2, 'verset commenté', 'versets commentés')).toBe('2 versets commentés')
  })
})
