import { describe, expect, it } from 'vitest'
import { estVerseCanoniqueV2, estVerseEditorial, estVerseSurColonnes, withCanonicalV2Capability } from './bibleMultimode'
import { canonicalCapabilities } from './bibleReadingModes'

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
