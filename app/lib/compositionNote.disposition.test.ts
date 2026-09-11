import { describe, it, expect } from 'vitest'
import { dispositionCitation } from './compositionNote'

// LA DISPOSITION D'UN BLOC DE NOTE — charte § 13.18. La nature et la disposition sont
// deux axes : la donnée dit la seconde quand elle la connaît (`metadata.citation_layout`).
describe('la disposition d’un bloc de note', () => {
  it('se lit dans la donnée quand elle la déclare', () => {
    // Les 51 citations en prose de la Consolation déclarées sorties — 35 grecques,
    // 16 latines — que le rendu laissait au fil (relevé du 11 septembre 2026).
    expect(dispositionCitation({ kind: 'quotation', form: 'prose', citationLayout: 'block' })).toBe('sortie')
    expect(dispositionCitation({ kind: 'quotation', form: 'verse', citationLayout: 'inline' })).toBe('fil')
  })

  it('donne à la traduction la disposition de son original, faute de la sienne', () => {
    const sortie = { kind: 'quotation', form: 'prose', citationLayout: 'block' as const }
    const auFil = { kind: 'quotation', form: 'prose', citationLayout: 'inline' as const }
    expect(dispositionCitation({ kind: 'translation', form: 'prose' }, sortie)).toBe('sortie')
    expect(dispositionCitation({ kind: 'translation', form: 'prose' }, auFil)).toBe('fil')
    // ⚠️ Sa propre déclaration l'emporte.
    expect(dispositionCitation({ kind: 'translation', form: 'prose', citationLayout: 'block' }, auFil)).toBe('sortie')
  })

  it('ne sort JAMAIS la citation visée, fût-elle en vers', () => {
    expect(dispositionCitation({ kind: 'lemma', form: 'verse' })).toBe('fil')
    expect(dispositionCitation({ kind: 'lemma', form: 'prose', citationLayout: 'block' })).toBe('fil')
  })

  it('garde la règle de la forme là où rien n’est déclaré', () => {
    expect(dispositionCitation({ kind: 'quotation', form: 'verse' })).toBe('sortie')
    expect(dispositionCitation({ kind: 'translation', form: 'prose' })).toBe('sortie')
    expect(dispositionCitation({ kind: 'translation', form: 'prose' }, null)).toBe('sortie')
    expect(dispositionCitation({ kind: 'quotation', form: 'prose' })).toBe('fil')
    expect(dispositionCitation({ kind: 'commentary', form: 'prose' })).toBe('fil')
    expect(dispositionCitation({ kind: 'reference', form: 'prose' })).toBe('fil')
  })
})
