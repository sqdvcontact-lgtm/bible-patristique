import { describe, expect, it, vi } from 'vitest'

// Les règles éprouvées ici sont PURES : le client Supabase ne sert qu'aux deux écritures.
vi.mock('@/app/lib/supabase', () => ({ supabase: { from: vi.fn() } }))
vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { cleVersetPreleve, type PrelevementsDuChapitre } from './prelevementsBibliques'
import {
  citationDuLasso, compterDejaPreleves, passagesAPrelever, prelevementsDesPassages,
  type PassageDuLasso,
} from './prelevementsLasso'

const p = (numero: number, canonId: string | null = null, texte = `texte ${numero}`): PassageDuLasso =>
  ({ numero, texte, label: 'Bible de Sacy', canonId })

const liste = (entrees: readonly [string, string][]): PrelevementsDuChapitre => new Map(entrees)

describe('passagesAPrelever', () => {
  it('écarte ce qui est déjà prélevé', () => {
    const deja = liste([[cleVersetPreleve('GEN.1.3', 3), 'id-3']])
    expect(passagesAPrelever(deja, [p(3, 'GEN.1.3'), p(4, 'GEN.1.4')]).map(x => x.numero)).toEqual([4])
  })

  it('ne prélève qu’une fois le même créneau', () => {
    expect(passagesAPrelever(liste([]), [p(3, 'GEN.1.3'), p(3, 'GEN.1.3')]).length).toBe(1)
  })

  it('DISTINGUE le verset de la ligne surnuméraire du même numéro', () => {
    const deja = liste([[cleVersetPreleve('DAN.13.44', 44), 'id-44']])
    const restants = passagesAPrelever(deja, [p(44, 'DAN.13.44'), p(44, 'DAN.13.44+')])
    expect(restants.map(x => x.canonId)).toEqual(['DAN.13.44+'])
  })

  it('un prélèvement ANCIEN, sans créneau, ne couvre que le verset ordinaire', () => {
    const ancien = liste([[cleVersetPreleve(null, 44), 'id-ancien']])
    expect(passagesAPrelever(ancien, [p(44, 'DAN.13.44')]).length).toBe(0)
    expect(passagesAPrelever(ancien, [p(44, 'DAN.13.44+')]).map(x => x.canonId)).toEqual(['DAN.13.44+'])
  })
})

describe('prelevementsDesPassages', () => {
  it('rend l’identifiant à retirer, et la clé sous laquelle la liste le porte', () => {
    const deja = liste([
      [cleVersetPreleve('DAN.13.44', 44), 'id-44'],
      [cleVersetPreleve('DAN.13.44+', 44), 'id-44-plus'],
    ])
    expect(prelevementsDesPassages(deja, [p(44, 'DAN.13.44+')]))
      .toEqual([{ cle: cleVersetPreleve('DAN.13.44+', 44), id: 'id-44-plus' }])
  })

  it('retrouve un prélèvement ancien sous son numéro', () => {
    const ancien = liste([[cleVersetPreleve(null, 7), 'id-ancien']])
    expect(prelevementsDesPassages(ancien, [p(7, 'GEN.1.7')]))
      .toEqual([{ cle: cleVersetPreleve(null, 7), id: 'id-ancien' }])
  })

  it('ne compte pas deux fois le même prélèvement', () => {
    const deja = liste([[cleVersetPreleve('GEN.1.7', 7), 'id-7']])
    expect(compterDejaPreleves(deja, [p(7, 'GEN.1.7'), p(7, 'GEN.1.7')])).toBe(1)
  })
})

describe('citationDuLasso', () => {
  it('compose la référence française et dit l’élision', () => {
    const citation = citationDuLasso(
      [p(3, 'GEN.1.3', 'Que la lumière soit'), p(5, 'GEN.1.5', 'Et la lumière fut')],
      { livreAbrege: 'Gn', nomLivre: 'Genèse', chapitre: 1 },
    )
    expect(citation.texte).toContain('(Gn 1, 3.5)')
    expect(citation.texte).toContain('[…]')
  })
})
