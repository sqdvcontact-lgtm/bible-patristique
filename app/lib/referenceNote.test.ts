import { describe, it, expect } from 'vitest'
import {
  abrevEspacee,
  romainVersEntier,
  normaliserReferencesDansTexte,
  terminerNote,
} from './referenceNote'

describe('abrevEspacee', () => {
  it('insère un espace après le chiffre de tête', () => {
    expect(abrevEspacee('1CO')).toBe('1 Co')
    expect(abrevEspacee('2PE')).toBe('2 P')
    expect(abrevEspacee('1TI')).toBe('1 Tm')
  })
  it('laisse intactes les abréviations sans chiffre', () => {
    expect(abrevEspacee('GEN')).toBe('Gn')
    expect(abrevEspacee('PSA')).toBe('Ps')
  })
})

describe('romainVersEntier', () => {
  it('convertit les romains usuels', () => {
    expect(romainVersEntier('II')).toBe(2)
    expect(romainVersEntier('XLIX')).toBe(49)
    expect(romainVersEntier('IIII')).toBe(4) // lecture indulgente
  })
  it('refuse ce qui n’est pas romain', () => {
    expect(romainVersEntier('AB')).toBeNull()
    expect(romainVersEntier('')).toBeNull()
  })
})

describe('normaliserReferencesDansTexte — exemples de l’auteur', () => {
  it('1Co. 2, 16 → 1 Co 2, 16 (abréviation espacée)', () => {
    expect(normaliserReferencesDansTexte('1Co. 2, 16')).toBe('1 Co 2, 16')
  })
  it('Gen. II, 7 → Gn 2, 7 (chapitre romain → arabe)', () => {
    expect(normaliserReferencesDansTexte('Gen. II, 7')).toBe('Gn 2, 7')
  })
  it('Psal. 65. 29. → Ps 65, 29 (virgule, pas point ; point final retiré)', () => {
    expect(normaliserReferencesDansTexte('Psal. 65. 29.')).toBe('Ps 65, 29')
  })
})

describe('normaliserReferencesDansTexte — divers', () => {
  it('reconnaît les abréviations latines et françaises', () => {
    expect(normaliserReferencesDansTexte('Matth. V, 3')).toBe('Mt 5, 3')
    expect(normaliserReferencesDansTexte('Rom 8, 1')).toBe('Rm 8, 1')
    expect(normaliserReferencesDansTexte('II Cor. 5, 17')).toBe('2 Co 5, 17')
    expect(normaliserReferencesDansTexte('Jean III, 16')).toBe('Jn 3, 16')
  })
  it('préserve les plages de versets', () => {
    expect(normaliserReferencesDansTexte('Gen. 1, 1-3')).toBe('Gn 1, 1-3')
    expect(normaliserReferencesDansTexte('Ps 22, 2–5')).toBe('Ps 22, 2-5')
  })
  it('réécrit plusieurs renvois dans un même texte', () => {
    expect(normaliserReferencesDansTexte('voir 1 Co 2, 16 et Rom. 8, 1')).toBe('voir 1 Co 2, 16 et Rm 8, 1')
  })
  it('est idempotente sur une référence déjà normalisée', () => {
    expect(normaliserReferencesDansTexte('1 Co 2, 16')).toBe('1 Co 2, 16')
    expect(normaliserReferencesDansTexte('Ps 65, 29')).toBe('Ps 65, 29')
  })
  it('laisse INTACT ce qu’elle n’identifie pas (renvoi patristique, abréviation équivoque)', () => {
    expect(normaliserReferencesDansTexte('De civ. Dei II, 7')).toBe('De civ. Dei II, 7')
    expect(normaliserReferencesDansTexte('Reg. II, 3')).toBe('Reg. II, 3')
    expect(normaliserReferencesDansTexte('Eccl. 3, 1')).toBe('Eccl. 3, 1')
    expect(normaliserReferencesDansTexte('page 3, 4')).toBe('page 3, 4')
  })
})

describe('terminerNote', () => {
  it('ajoute un point si la note n’a pas de ponctuation forte', () => {
    expect(terminerNote('Gn 2, 7')).toBe('Gn 2, 7.')
    expect(terminerNote('Une remarque de l’éditeur')).toBe('Une remarque de l’éditeur.')
  })
  it('conserve une ponctuation forte déjà présente', () => {
    expect(terminerNote('Est-ce bien exact ?')).toBe('Est-ce bien exact ?')
    expect(terminerNote('Quelle audace !')).toBe('Quelle audace !')
    expect(terminerNote('à suivre…')).toBe('à suivre…')
  })
  it('reconnaît la ponctuation forte sous un guillemet fermant', () => {
    expect(terminerNote('Il dit : « Amen. »')).toBe('Il dit : « Amen. »')
  })
  it('gère le vide', () => {
    expect(terminerNote('')).toBe('')
    expect(terminerNote('   ')).toBe('   ')
  })
})
