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

    // ⛔ UN VERS EST UNE BOÎTE PAR LIGNE, non un texte à `pre-line` : c'est la boîte
    // qui porte le retrait de suite, et c'est elle qui interdit la césure. Le renvoi
    // qui suit descend d'une ligne en devenant une boîte lui aussi — le saut matériel
    // n'a plus de `pre-line` pour le rendre, et deux façons de descendre d'une ligne
    // dans le même bloc se contrediraient.
    expect(html).toContain('>Premier vers</span>')
    expect(html).toContain('>Second vers</span>')
    expect(html).not.toContain('Premier vers\nSecond vers')
    expect(html).toContain('hyphens:none')
    expect(html).toContain('(Contra Symmach.)</span>')
    expect((html.match(/data-block-id="poeme"/g) ?? [])).toHaveLength(1)
  })

  it('compose au MÊME corps ce que la note CITE, et sur un seul fer', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'poeme', kind: 'quotation', form: 'verse', language: 'la', text: 'Jam mihi deterior canis\nJamque meos vultus' }),
      block({ blockId: 'trad', rank: 200, kind: 'translation', text: 'La traduction.' }),
    )} />)

    // ⛔ AUCUN CORPS PROPRE AU VERS : la source ne se compose pas plus petit que sa
    // propre traduction, dans une boîte qui porte déjà le rang discret de l'appareil.
    // Aucune des cinq autres surfaces où le site compose des vers ne le fait.
    expect(html).not.toContain('font-size:0.9em')
    // ⛔ UN SEUL FER POUR LES DEUX : la ligne de vers le porte en marge, le bloc de
    // traduction en rembourrage, et les deux rendent 1,5 em.
    expect(html).toContain('margin-left:1.5em')
    expect(html).toContain('padding-left:1.5em')
    // ⛔ ET PAS DE FILET : le retrait dit tout, comme pour une citation sortie.
    expect(html).not.toContain('border-left')
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
