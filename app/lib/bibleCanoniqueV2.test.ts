import { describe, expect, it } from 'vitest'
import {
  estExtraExplicitementGlose,
  selectionnerGlosesCanoniquesV2,
  type LigneExtraCanoniqueV2,
} from './bibleCanoniqueV2'
import { estVerseCanoniqueV2, estVerseEditorial, estVerseSurColonnes, withCanonicalV2Capability } from './bibleMultimode'
import { canonicalCapabilities } from './bibleReadingModes'

function extra(
  id: string,
  ordre: number,
  suffixe: string,
  note: string | null = null,
): LigneExtraCanoniqueV2 {
  return {
    id,
    livre: 'MAT',
    ch_orig: 6,
    v_orig: 13,
    v_orig_suffixe: suffixe,
    texte: `texte ${id}`,
    ordre_slot: ordre,
    note_structure: note,
  }
}

describe('une traduction lue dans versets_v2 par le canon', () => {
  const base = { TR0001: canonicalCapabilities('TR0001') }

  it('reçoit une capacité « verse » de source versets-v2, sans toucher aux autres', () => {
    const avec = withCanonicalV2Capability(base, ['TR0013'])
    expect(estVerseCanoniqueV2(avec.TR0013)).toBe(true)
    expect(estVerseEditorial(avec.TR0013)).toBe(false)
    expect(estVerseSurColonnes(avec.TR0013)).toBe(false)
    expect(avec.TR0001).toBe(base.TR0001)
  })

  it('ne change rien quand il n’y a personne à ajouter', () => {
    expect(withCanonicalV2Capability(base, [])).toBe(base)
  })

  it('seule une colonne de la vue large permet l’échange en mémoire', () => {
    expect(estVerseSurColonnes(base.TR0001)).toBe(true)
    expect(estVerseSurColonnes(undefined)).toBe(false)
  })
})

describe('les gloses surnuméraires de versets_v2', () => {
  it('reconnaît les preuves explicites sans assimiler tout extra à une glose', () => {
    expect(estExtraExplicitementGlose(extra('a', 10, 'extra-in-13-heart-gloss'))).toBe(true)
    expect(estExtraExplicitementGlose(extra('b', 11, 'extra-1', 'MANUSCRIPT_EXTRA – glose'))).toBe(true)
    expect(estExtraExplicitementGlose(extra('c', 12, 'extra-1', 'MANUSCRIPT_EXTRA – dittographie'))).toBe(false)
  })

  it('retient les seules gloses explicites quand le verset hôte porte aussi une autre nature', () => {
    const selection = selectionnerGlosesCanoniquesV2(
      [{ canonical_context: 'MAT.6.13' }, { canonical_context: 'MAT.6.13' }],
      [
        extra('g2', 12, 'extra-after-13-amen-gloss'),
        extra('rubrique', 13, 'extra-1'),
        extra('g1', 11, 'extra-in-13-doctrine-gloss'),
      ],
    )
    expect(selection.get('MAT.6.13')?.map((ligne) => ligne.id)).toEqual(['g1', 'g2'])
  })

  it('complète un ancien marquage seulement quand le compte source rend le groupe univoque', () => {
    const selection = selectionnerGlosesCanoniquesV2(
      [{ canonical_context: 'MAT.6.13' }, { canonical_context: 'MAT.6.13' }],
      [
        extra('ancienne', 12, 'extra-1'),
        extra('explicite', 11, 'extra-in-13-doctrine-gloss'),
      ],
    )
    expect(selection.get('MAT.6.13')?.map((ligne) => ligne.id)).toEqual(['explicite', 'ancienne'])
  })

  it('refuse de deviner lorsqu’une ligne non marquée reste en concurrence avec une autre nature', () => {
    expect(() => selectionnerGlosesCanoniquesV2(
      [{ canonical_context: 'MAT.6.13' }, { canonical_context: 'MAT.6.13' }],
      [
        extra('explicite', 11, 'extra-in-13-doctrine-gloss'),
        extra('inconnue', 12, 'extra-1'),
        extra('autre', 13, 'extra-2'),
      ],
    )).toThrow(/ambiguës/)
  })

  it('refuse une glose sans ordre matériel', () => {
    const sansOrdre = { ...extra('sans-ordre', 11, 'extra-in-13-gloss'), ordre_slot: null }
    expect(() => selectionnerGlosesCanoniquesV2(
      [{ canonical_context: 'MAT.6.13' }],
      [sansOrdre],
    )).toThrow(/sans ordre_slot/)
  })
})
