import { describe, it, expect } from 'vitest'
import { dispositionCitation } from './compositionNote'
import { SEUIL_CITATION_SORTIE } from './citationSortie'

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

  it('sort la citation visée comme toute citation : la donnée d’abord, puis la forme', () => {
    // I-01 de la Consolation : le distique « Le bonheur qui jadis inspirait mes accents »,
    // déclaré sorti comme les 37 autres citations visées en vers. Une règle du 11 septembre
    // 2026 au matin le gardait au fil malgré la donnée (charte § 13.18, rectifiée le soir).
    expect(dispositionCitation({ kind: 'lemma', form: 'verse', citationLayout: 'block' })).toBe('sortie')
    expect(dispositionCitation({ kind: 'lemma', form: 'prose', citationLayout: 'block' })).toBe('sortie')
    expect(dispositionCitation({ kind: 'lemma', form: 'verse', citationLayout: 'inline' })).toBe('fil')
    // Sans déclaration : un vers se détache ; la prose reste au fil, où elle ouvre la ligne du propos.
    expect(dispositionCitation({ kind: 'lemma', form: 'verse' })).toBe('sortie')
    expect(dispositionCitation({ kind: 'lemma', form: 'prose' })).toBe('fil')
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

// ── ET UNE CITATION LONGUE SE DÉTACHE, MÊME SANS DÉCLARATION (charte § 13.18.1) ──
//
// ⚠️ Le seuil est celui des œuvres, et il ne contredit AUCUNE déclaration du corpus :
// les 36 citations déclarées au fil au 16 septembre 2026 comptent au plus 391 signes.
// Le cas qui l'a imposé est la note 146 de La Cité de Dieu (Barreau, Vivès), 1 409
// signes coulés dans le fil d'une note de 198.
describe('la disposition d’une citation que la donnée ne déclare pas', () => {
  const long = (n: number) => 'a'.repeat(n)

  it('sort la citation qui atteint le seuil', () => {
    expect(dispositionCitation({ kind: 'quotation', form: 'prose', text: long(SEUIL_CITATION_SORTIE) }))
      .toBe('sortie')
  })

  it('garde au fil celle qui reste en deçà', () => {
    expect(dispositionCitation({ kind: 'quotation', form: 'prose', text: long(SEUIL_CITATION_SORTIE - 1) }))
      .toBe('fil')
    // La plus longue citation déclarée au fil du corpus, au 16 septembre 2026.
    expect(dispositionCitation({ kind: 'quotation', form: 'prose', text: long(391) })).toBe('fil')
  })

  // ⛔ La DÉCLARATION l'emporte toujours : une citation qui se dit au fil y reste, si
  // longue soit-elle, et le seuil ne se retourne jamais contre l'éditeur.
  it('ne retourne jamais une déclaration', () => {
    expect(dispositionCitation({
      kind: 'quotation', form: 'prose', citationLayout: 'inline', text: long(2000),
    })).toBe('fil')
  })

  // ⛔ Le seuil ne vaut que pour une CITATION : la prose d'une note, un ancrage, un renvoi
  // se composent au fil quelle que soit leur longueur.
  it('ne vaut que pour une citation', () => {
    expect(dispositionCitation({ kind: 'commentary', form: 'prose', text: long(2000) })).toBe('fil')
    expect(dispositionCitation({ kind: 'lemma', form: 'prose', text: long(2000) })).toBe('fil')
    expect(dispositionCitation({ kind: 'reference', form: 'prose', text: long(2000) })).toBe('fil')
  })

  it('tient sans texte du tout', () => {
    expect(dispositionCitation({ kind: 'quotation', form: 'prose' })).toBe('fil')
    expect(dispositionCitation({ kind: 'quotation', form: 'prose', text: null })).toBe('fil')
  })
})
