import { describe, expect, it, vi } from 'vitest'

// Le module ouvre un client navigateur à l'import : on le remplace, rien ici n'écrit.
vi.mock('./supabase', () => ({ supabase: {} }))

import {
  cleVersetPreleve, codeDeTraduction, etatDuVerset, prelevementDuVerset, tradsAilleurs,
  type PrelevementsDuChapitre,
} from './prelevementsBibliques'

// UN PRÉLÈVEMENT EST CELUI D'UNE TRADUCTION (2026-09-23). Demande de l'auteur : « dans une
// bible bilingue, quand je coche un verset, le signet du texte latin et le signet du texte
// français se valident ; il faudrait n'en valider qu'un, celui sur lequel on a cliqué ».

const liste = (paires: [string, string][]): PrelevementsDuChapitre => new Map(paires)

describe('la clé porte la traduction', () => {
  it('le latin et le français d’un même créneau ont deux clés', () => {
    expect(cleVersetPreleve('GEN.1.3', 3, 'TR0004')).not.toBe(cleVersetPreleve('GEN.1.3', 3, 'TR0001'))
  })

  it('⛔ prélever la Vulgate ne coche pas la Bible de Sacy', () => {
    const l = liste([[cleVersetPreleve('GEN.1.3', 3, 'TR0004'), 'id-vg']])
    expect(prelevementDuVerset(l, 'GEN.1.3', 3, 'TR0004')).toBe('id-vg')
    expect(prelevementDuVerset(l, 'GEN.1.3', 3, 'TR0001')).toBeNull()
  })

  it('l’autre colonne se dit « prélevé ailleurs »', () => {
    const l = liste([[cleVersetPreleve('GEN.1.3', 3, 'TR0004'), 'id-vg']])
    expect(etatDuVerset(l, 'GEN.1.3', 3, 'TR0004')).toBe('plein')
    expect(etatDuVerset(l, 'GEN.1.3', 3, 'TR0001')).toBe('ailleurs')
    expect(etatDuVerset(l, 'GEN.1.4', 4, 'TR0001')).toBeNull()
    expect(tradsAilleurs(l, 'GEN.1.3', 3, 'TR0001')).toEqual(['TR0004'])
  })

  it('les deux prélevés : chacun plein, et l’autre nommé ailleurs', () => {
    const l = liste([
      [cleVersetPreleve('GEN.1.3', 3, 'TR0004'), 'id-vg'],
      [cleVersetPreleve('GEN.1.3', 3, 'TR0001'), 'id-sacy'],
    ])
    expect(etatDuVerset(l, 'GEN.1.3', 3, 'TR0001')).toBe('plein')
    expect(tradsAilleurs(l, 'GEN.1.3', 3, 'TR0001')).toEqual(['TR0004'])
  })

  it('⚠️ une ligne surnuméraire « 8+ » ne prend pas l’état du verset « 8 »', () => {
    const l = liste([[cleVersetPreleve('DAN.13.8', 8, 'TR0004'), 'id']])
    expect(etatDuVerset(l, 'DAN.13.8+', 8, 'TR0001')).toBeNull()
  })

  it('un prélèvement ancien sans créneau se retrouve par son numéro, dans sa traduction', () => {
    const l = liste([[cleVersetPreleve(null, 7, 'TR0001'), 'id-ancien']])
    expect(prelevementDuVerset(l, 'GEN.1.7', 7, 'TR0001')).toBe('id-ancien')
    expect(etatDuVerset(l, 'GEN.1.7', 7, 'TR0004')).toBe('ailleurs')
  })
})

describe('codeDeTraduction', () => {
  it('garde le code, ôte le suffixe de couche', () => {
    expect(codeDeTraduction('TR0004')).toBe('TR0004')
    expect(codeDeTraduction('TR0009#diplomatic')).toBe('TR0009')
    expect(codeDeTraduction('TR0009:diplomatic')).toBe('TR0009')
  })

  it('rend null pour ce qui n’est pas un code (la base le refuserait)', () => {
    expect(codeDeTraduction('Bible de Sacy')).toBeNull()
    expect(codeDeTraduction(null)).toBeNull()
  })
})
