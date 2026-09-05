import { describe, it, expect } from 'vitest'
import {
  abrevEspacee,
  romainVersEntier,
  normaliserReferencesDansTexte,
  releverReferencesBibliquesNormalisables,
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

// ── LES DEUX BORNES DU SÉPARATEUR ET DU POINT FINAL (2026-09-05) ────────────
// Trouvées en faisant passer les 11 916 renvois du corpus par cette fonction. Les
// deux changeaient ce que le LECTEUR voit, et l'une changeait le SENS.
describe('normaliserReferencesDansTexte — le point ne dit pas toujours « verset »', () => {
  it('« Gn 1.5 » désigne DEUX CHAPITRES et reste intact (charte § 3.5.1)', () => {
    // Sans blanc après le point, c'est l'énumération de chapitres de la charte :
    // la lire « chapitre 1, verset 5 » change la référence, ce n'est pas la composer.
    expect(normaliserReferencesDansTexte('Gn 1.5')).toBe('Gn 1.5')
    expect(normaliserReferencesDansTexte('Gen. 1.5')).toBe('Gen. 1.5')
  })
  it('un point SUIVI D’UN BLANC reste le séparateur des éditions anciennes', () => {
    expect(normaliserReferencesDansTexte('Psal. 65. 29')).toBe('Ps 65, 29')
  })
  it('un point suivi d’un CHIFFRE ne se mange pas : les versets disjoints tiennent', () => {
    // « (Lc 7, 11.15) » rendait « (Lc 7, 1115) » : un verset qui n'existe pas.
    // 216 blocs de neuf textes étaient dans ce cas.
    expect(normaliserReferencesDansTexte('(Lc 7, 11.15).')).toBe('(Lc 7, 11.15).')
    expect(normaliserReferencesDansTexte('(Jn 19, 26.27).')).toBe('(Jn 19, 26.27).')
    expect(normaliserReferencesDansTexte('(Jn 6, 61-63.67).')).toBe('(Jn 6, 61-63.67).')
  })
  it('les versets disjoints se normalisent AUSSI quand le livre le demande', () => {
    expect(normaliserReferencesDansTexte('(Luc VII, 11.15)')).toBe('(Lc 7, 11.15)')
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

  it('rend les transformations et leurs offsets sans modifier la source', () => {
    const source = 'Voir Is. XI, 1 puis Cf. Luc. I, 26-38.'
    const transformations = releverReferencesBibliquesNormalisables(source)
    expect(transformations).toEqual([
      {
        source: 'Is. XI, 1', normalized: 'Is 11, 1', bookCode: 'ISA',
        startOffsetUnicode: 5, endOffsetUnicode: 14,
      },
      {
        source: 'Luc. I, 26-38.', normalized: 'Lc 1, 26-38', bookCode: 'LUK',
        startOffsetUnicode: 24, endOffsetUnicode: 38,
      },
    ])
    expect(source).toBe('Voir Is. XI, 1 puis Cf. Luc. I, 26-38.')
  })
})

describe('le chapitre romain en MINUSCULES (charte § 13.12, décision 11)', () => {
  it('reconnaît le romain minuscule comme le romain capital', () => {
    expect(normaliserReferencesDansTexte('Matth. x, 22.')).toBe('Mt 10, 22')
    expect(normaliserReferencesDansTexte('Ps. cxv, 12')).toBe('Ps 115, 12')
    expect(normaliserReferencesDansTexte('Gal. v, 17')).toBe('Ga 5, 17')
    expect(normaliserReferencesDansTexte('Eccli. xxx, 24.')).toBe('Si 30, 24')
  })

  // ⛔ Le motif n'agit que si le mot qui précède RÉSOUT vers un livre du
  // référentiel. Les abréviations équivoques en sont volontairement absentes,
  // et l'élargissement ne doit pas les y faire entrer par la bande.
  it('laisse intactes les abréviations équivoques', () => {
    expect(normaliserReferencesDansTexte('Cor. xv, 22')).toBe('Cor. xv, 22')
    expect(normaliserReferencesDansTexte('Ibid. v, 12')).toBe('Ibid. v, 12')
    expect(normaliserReferencesDansTexte('Thess. iv, 16')).toBe('Thess. iv, 16')
  })

  // ⛔ AUCUN LIVRE DU CANON N'A PLUS DE 150 CHAPITRES. Mesuré sur les 24 264 blocs
  // du corpus le 5 septembre 2026, la borne écarte SIX corruptions et n'en coûte
  // aucune : sur les 4 038 réécritures d'alors, pas une ne dépassait 150.
  it('refuse un chapitre que le canon ne peut pas porter', () => {
    // « m » pris pour mille, au milieu d'un mot ou après lui.
    expect(normaliserReferencesDansTexte('na m. 2')).toBe('na m. 2')
    expect(normaliserReferencesDansTexte('Psalm. 77. ')).toBe('Psalm. 77. ')
  })

  // ⚠️ Le motif RECULE dans le mot qui précède, et c'est ce qui rend « Abdi. 1 »
  // lisible : « Abd » + « i » = Abdias, chapitre 1. Interdire ce recul (par un
  // groupe atomique) coûterait treize réécritures justes, mesurées, et
  // n'écarterait aucune corruption que la borne n'écarte déjà.
  it('lit « Abdi. 1 » comme Abdias, qui n’a qu’un chapitre', () => {
    expect(normaliserReferencesDansTexte('Abdi. 1.')).toBe('Ab 1, 1')
    expect(normaliserReferencesDansTexte('Abdi. 12.')).toBe('Ab 1, 12')
  })

  it('n’accepte pas un romain de casse MÊLÉE', () => {
    expect(normaliserReferencesDansTexte('Matth. xI, 22')).toBe('Matth. xI, 22')
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
