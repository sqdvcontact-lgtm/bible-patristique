import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  AppelNoteBible,
  BlocEditorialBible,
  IllustrationBible,
  NotesBibleChapitre,
} from './BibleEditionParatext'

describe('paratexte des éditions bibliques', () => {
  it('rend une introduction de livre dans le corps avec son style sémantique', () => {
    const html = renderToStaticMarkup(
      <BlocEditorialBible bloc={{
        id: 'intro-mrk',
        semanticStyleCode: 'introduction_livre',
        heading: 'Introduction à l’Évangile selon saint Marc',
        placement: 'before',
        textBlocks: [{
          id: 'intro-mrk-1',
          kind: 'commentary',
          form: 'prose',
          text: 'Cette introduction appartient au corps de l’édition.',
          language: 'fr',
        }],
      }} />,
    )
    expect(html).toContain('data-semantic-style="introduction_livre"')
    expect(html).toContain('data-placement="before"')
    expect(html).toContain('Introduction à l’Évangile selon saint Marc')
  })

  it('relie l’appel à la note et la note à son appel', () => {
    const html = renderToStaticMarkup(
      <>
        <p>Initium evangelii<AppelNoteBible noteId="note-1" displayNumber={1} /></p>
        <NotesBibleChapitre notes={[{
          id: 'note-1',
          displayNumber: 1,
          canonId: 'MRK.1.1',
          blocks: [{
            id: 'note-1-commentary',
            kind: 'commentary',
            form: 'prose',
            text: 'Commentaire de ce verset.',
            language: 'fr',
          }],
        }]} />
      </>,
    )
    expect(html).toContain('href="#note-bible-note-1"')
    expect(html).toContain('id="note-bible-note-1"')
    expect(html).toContain('href="#appel-note-bible-note-1"')
    expect(html).toContain('data-canon-id="MRK.1.1"')
  })

  it("garde l'apparat d'une introduction distinct des notes de verset", () => {
    const html = renderToStaticMarkup(
      <BlocEditorialBible bloc={{
        id: 'intro-mrk',
        semanticStyleCode: 'introduction_livre',
        placement: 'before',
        textBlocks: [{ id: 'texte', kind: 'commentary', form: 'prose', text: 'Introduction.' }],
        internalNotes: [{
          id: 'intro-note-1',
          displayNumber: 1,
          printedMarker: '1',
          blocks: [{ id: 'reference', kind: 'reference', form: 'prose', text: 'Act. XII, 12.' }],
        }],
      }} />,
    )
    expect(html).toContain('aria-label="Apparat propre à ce bloc"')
    expect(html).toContain('Act. XII, 12.')
    expect(html).not.toContain('note-bible-intro-note-1')
  })

  it('rend le dérivé web avec ses dimensions, son texte alternatif et sa légende', () => {
    const html = renderToStaticMarkup(
      <IllustrationBible illustration={{
        id: 'asset-1',
        assetKey: 'fillion-t07-p0092-i01',
        assetKind: 'illustration',
        url: 'https://oucotpxcjalwgetylfbz.supabase.co/storage/v1/object/public/bible-illustrations-web/fillion/requin.webp',
        width: 1600,
        height: 555,
        altText: 'Requin figurant le poisson de Jonas.',
        caption: 'Le poisson de Jonas (le requin).',
        printedPage: '90',
        placement: 'after',
        canonIdStart: 'MAT.12.40',
        canonIdEnd: null,
        bodyBlockId: null,
        noteId: null,
        materialOrder: 120,
      }} />,
    )
    expect(html).toContain('data-asset-key="fillion-t07-p0092-i01"')
    expect(html).toContain('alt="Requin figurant le poisson de Jonas."')
    expect(html).toContain('width="1600"')
    expect(html).toContain('Le poisson de Jonas (le requin).')
  })
})
