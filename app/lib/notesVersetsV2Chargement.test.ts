import { describe, expect, it } from 'vitest'

import { filtreChapitreDesNotesV2 } from './notesVersetsV2Chargement'

describe('filtreChapitreDesNotesV2', () => {
  it('joint le créneau canonique et le chapitre de l’édition, par deux égalités', () => {
    expect(filtreChapitreDesNotesV2(9)).toBe('canon_chapitre.eq.9,ch_orig.eq.9')
  })

  it('prend le chapitre 0 de l’édition sous le premier chapitre', () => {
    expect(filtreChapitreDesNotesV2(1)).toBe('canon_chapitre.eq.1,ch_orig.eq.1,ch_orig.eq.0')
  })

  it('ne prend le chapitre 0 que là', () => {
    expect(filtreChapitreDesNotesV2(2)).not.toContain('ch_orig.eq.0')
    expect(filtreChapitreDesNotesV2(10)).not.toContain('ch_orig.eq.0')
  })

  // ⛔ Ce que le `like` de préfixe rendait fragile : « PSA.1.% » ne devait pas mordre sur
  // le chapitre 11, et une égalité ne le peut pas. Le contrôle reste, parce que la borne
  // est ce qui décide quelles notes un chapitre montre.
  it('borne le chapitre : 1 ne mord pas sur 11, 11 ne mord pas sur 1', () => {
    expect(filtreChapitreDesNotesV2(1)).not.toContain('.eq.11')
    expect(filtreChapitreDesNotesV2(11)).toBe('canon_chapitre.eq.11,ch_orig.eq.11')
  })

  it('ne redit pas le livre : la requête le pose déjà en égalité', () => {
    expect(filtreChapitreDesNotesV2(118)).not.toMatch(/[A-Z]{3}/)
  })
})
