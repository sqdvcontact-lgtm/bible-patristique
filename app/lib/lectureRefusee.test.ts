import { describe, expect, it } from 'vitest'
import { ligneDeJournal, motifDEchec } from './lectureRefusee'

describe('une lecture qui échoue n’est pas une œuvre qui manque', () => {
  it('classe les erreurs de PostgREST', () => {
    expect(motifDEchec(null)).toBeNull()
    expect(motifDEchec({ code: 'PGRST116' })).toBe('absente')
    expect(motifDEchec({ code: '42501' })).toBe('refusee')
    expect(motifDEchec({ code: '57014' })).toBe('delai')
    expect(motifDEchec({ code: 'PGRST200', message: 'x' })).toBe('panne')
  })

  it('ne journalise ni l’absence ordinaire ni le succès', () => {
    expect(ligneDeJournal('œuvre A', null)).toBeNull()
    expect(ligneDeJournal('œuvre A', { code: 'PGRST116' })).toBeNull()
  })

  it('nomme un refus de droits', () => {
    const ligne = ligneDeJournal('œuvre A0010O0001', { code: '42501', message: 'permission denied for table oeuvres' })
    expect(ligne).toContain('droits insuffisants')
    expect(ligne).toContain('42501')
    expect(ligne).toContain('œuvre A0010O0001')
  })
})
