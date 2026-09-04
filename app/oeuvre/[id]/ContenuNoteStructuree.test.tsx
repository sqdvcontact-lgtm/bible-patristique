import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ContenuNoteStructuree } from './ContenuNoteStructuree'
import type { NoteBlocData, NoteStructuree } from './oeuvreTypes'

function note(...blocks: NoteBlocData[]): NoteStructuree {
  return { noteKey: 'I-TEST', noteNumber: 1, blocks }
}

function block(overrides: Partial<NoteBlocData>): NoteBlocData {
  return {
    blockId: 'b1', rank: 100, kind: 'commentary', form: 'prose',
    language: 'fr', text: 'Texte', rendering: 'word_paragraph',
    needsReview: false, targetBlockId: null, translationOf: null,
    ...overrides,
  }
}

describe('ContenuNoteStructuree', () => {
  it('rend inline_after_target après la cible avec une espace insécable et sans parenthèses ajoutées', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'cible', text: 'Traduction.' }),
      block({
        blockId: 'ref', rank: 200, kind: 'reference', text: '(Platon, Timée.)',
        rendering: 'inline_after_target', targetBlockId: 'cible',
      }),
    )} />)

    expect(html).toContain('Traduction.<span')
    expect(html).toContain('> (Platon, Timée.)</span>')
    expect(html).not.toContain('((Platon')
  })

  it('rend manual_line_break_in_verse dans la même unité après un vrai retour à la ligne', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'poeme', kind: 'quotation', form: 'verse', text: 'Premier vers\nSecond vers', rendering: 'Footnote Verse' }),
      block({
        blockId: 'ref', rank: 200, kind: 'reference', text: '(Contra Symmach.)',
        rendering: 'manual_line_break_in_verse', targetBlockId: 'poeme',
      }),
    )} />)

    expect(html).toContain('Premier vers\nSecond vers\n<span')
    expect(html).toContain('(Contra Symmach.)</span>')
    expect((html.match(/data-block-id="poeme"/g) ?? [])).toHaveLength(1)
  })

  it('conserve word_paragraph comme paragraphe distinct, au rang prévu et sans italique par défaut', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'lemme', text: 'Lemme.' }),
      block({
        blockId: 'ref', rank: 200, kind: 'reference', text: 'Voir le chapitre VI.',
        rendering: 'word_paragraph', targetBlockId: 'lemme',
      }),
    )} />)

    expect(html.indexOf('Lemme.')).toBeLessThan(html.indexOf('Voir le chapitre VI.'))
    expect(html).toContain('data-block-id="ref"')
    expect(html).toContain('font-style:normal')
    expect(html).not.toContain('<em>')
  })

  it('compose les titres et locutions balisés en italique dans une note ordinaire', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ text: 'Voir *De anima*, 58.' }),
    )} />)

    expect(html).toContain('Voir <em>De anima</em>, 58.')
    expect(html).not.toContain('*De anima*')
  })
})
