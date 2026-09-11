import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ContenuDeLaNote, rendreTexteAvecNotes } from './appelNote'
import type { NoteStructuree } from './oeuvreTypes'

// ── L'APPEL D'UNE SURFACE, ET LE PROPOS D'UNE NOTE ───────────────────────────
//
// Le volet patristique rend ses extraits par le moteur de la page de lecture et n'y
// change que l'APPEL (`options.appel`) : il déplie la note au-dessus de l'extrait au lieu
// d'ouvrir un encart. Ce qui voyage avec l'appel — le mot qui le précède, la ponctuation
// qui le suit, la suite « 2 & 3 » — doit rester celui du moteur.

const note = (noteNumber: number, texte: string, displayNumber?: number): NoteStructuree => ({
  noteKey: `N${noteNumber}`,
  noteNumber,
  ...(displayNumber === undefined ? {} : { displayNumber }),
  blocks: [{ blockId: 'b', rank: 1, kind: 'commentary', form: 'prose', text: texte, needsReview: false }],
})

describe('rendreTexteAvecNotes, option `appel`', () => {
  it('rend l’appel de la surface à la place de l’encart, avec son mot et sa ponctuation', () => {
    const appel = vi.fn(({ numeroVisible }: { numeroVisible: number }) => <b data-appel={numeroVisible} />)
    const n12 = note(12, 'Voir Jean.')
    const html = renderToStaticMarkup(<p>{rendreTexteAvecNotes('Il le dit[[12]].', { 12: n12 }, 'corps', { appel })}</p>)
    expect(appel).toHaveBeenCalledWith({ marqueur: '12', contenu: n12, numeroVisible: 12 })
    expect(html).toContain('<span style="white-space:nowrap">dit<b data-appel="12"></b>.</span>')
    // L'encart de la page de lecture ne paraît pas.
    expect(html).not.toContain('role="button"')
  })

  it('donne le numéro que le lecteur voit, non le numéro interne', () => {
    const appel = vi.fn(() => null)
    renderToStaticMarkup(<p>{rendreTexteAvecNotes('mot[[40]]', { 40: note(40, 'x', 3) }, 'corps', { appel })}</p>)
    expect(appel).toHaveBeenCalledWith(expect.objectContaining({ numeroVisible: 3 }))
  })

  it('garde la suite « 2 & 3 » du moteur', () => {
    const appel = vi.fn(({ numeroVisible }: { numeroVisible: number }) => <b>{numeroVisible}</b>)
    const html = renderToStaticMarkup(<p>{rendreTexteAvecNotes('mot[[2]][[3]].', { 2: note(2, 'a'), 3: note(3, 'b') }, 'corps', { appel })}</p>)
    expect(appel).toHaveBeenCalledTimes(2)
    expect(html).toMatch(/<b>2<\/b><sup[^>]*>.*&amp;.*<\/sup><b>3<\/b>/)
  })

  it('sans l’option, l’appel reste celui de la page de lecture', () => {
    const html = renderToStaticMarkup(<p>{rendreTexteAvecNotes('mot[[12]]', { 12: note(12, 'x') })}</p>)
    expect(html).toContain('role="button"')
    expect(html).toContain('aria-expanded="false"')
  })
})

describe('ContenuDeLaNote', () => {
  it('rend une note héritée ENRICHIE, terminée par son point', () => {
    const html = renderToStaticMarkup(<div><ContenuDeLaNote contenu="Voir *La Cité de Dieu*" /></div>)
    expect(html).toContain('<em>La Cité de Dieu</em>')
  })

  it('dit une note héritée vide « indisponible »', () => {
    expect(renderToStaticMarkup(<div><ContenuDeLaNote contenu="" /></div>)).toContain('Note indisponible')
  })

  it('rend une note structurée par ses blocs', () => {
    expect(renderToStaticMarkup(<div><ContenuDeLaNote contenu={note(5, 'Selon Augustin')} /></div>)).toContain('Selon Augustin')
  })
})
