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

describe('hiérarchie de rendu', () => {
  const bloc = (semanticStyleCode: string, extra: Record<string, unknown> = {}) => ({
    id: 'b1',
    semanticStyleCode,
    heading: 'Le précurseur fait son apparition',
    placement: 'before' as const,
    textBlocks: [{
      id: 'b1:1', kind: 'commentary' as const, form: 'prose' as const,
      text: 'Le développement.',
    }],
    ...extra,
  })

  it('fait du titre de péricope un vrai titre, distinct du développement', () => {
    const html = renderToStaticMarkup(
      <BlocEditorialBible bloc={bloc('introduction_pericope', { niveauHtml: 3 })} />,
    )
    // Deux éléments, jamais un paragraphe qui concatène l'un et l'autre.
    expect(html).toContain('<h3 class="cs-bible-title--t6"')
    expect(html).toContain('Le précurseur fait son apparition</h3>')
    expect(html).toContain('Le développement.')
  })

  it('laisse l’intitulé d’un commentaire hors des balises de titre', () => {
    const html = renderToStaticMarkup(
      <BlocEditorialBible bloc={bloc('commentaire_pericope', { niveauHtml: 3 })} />,
    )
    // Un repère interne n'est pas un titre : il n'entre donc pas au plan
    // d'accessibilité, et le sommaire ne peut pas le ramasser.
    expect(html).not.toMatch(/<h[1-6]/)
    expect(html).toContain('cs-bible-info-label')
  })

  it('porte le jeton de niveau ET le modificateur de nature', () => {
    const html = renderToStaticMarkup(<BlocEditorialBible bloc={bloc('commentaire_pericope')} />)
    expect(html).toContain('cs-bible-info--i5')
    expect(html).toContain('cs-bible-block--commentary')
    expect(html).toContain('data-niveau="I5"')
  })

  it('résout l’alias ancien vers son nom canonique', () => {
    const html = renderToStaticMarkup(<BlocEditorialBible bloc={bloc('titre_section', { niveauHtml: 2 })} />)
    expect(html).toContain('data-semantic-style="titre_section_livre"')
    expect(html).toContain('cs-bible-title--t3')
  })

  it('refuse un style absent du registre plutôt que de l’aplatir', () => {
    const html = renderToStaticMarkup(<BlocEditorialBible bloc={bloc('commentaire_zzz')} />)
    expect(html).toBe('')
  })

  it('ne répète pas le titre du livre, que la page porte déjà', () => {
    expect(renderToStaticMarkup(<BlocEditorialBible bloc={bloc('titre_livre')} />)).toBe('')
  })
})

describe('composition d’une introduction', () => {
  const introduction = {
    id: 'i1',
    semanticStyleCode: 'introduction_livre',
    heading: 'Introduction — 1° La personne de l’auteur',
    placement: 'before' as const,
    textBlocks: [{
      id: 'i1:1', kind: 'commentary' as const, form: 'prose' as const,
      text: 'Comme nous l’apprend le livre des Actes.',
    }],
  }

  it('sépare le titre de son chapeau, sans les concaténer', () => {
    const html = renderToStaticMarkup(<BlocEditorialBible bloc={introduction} />)
    expect(html).toContain('>Introduction<span class="cs-bible-chapeau">1. La personne de l’auteur</span>')
    expect(html).not.toContain('Introduction — 1°')
  })

  it('compose le développement en italique, centré et plus petit', () => {
    // ⚠️ L'italique se posait AVANT le réglage général de `fontStyle`, qui
    // l'écrasait : la règle doit venir en dernier.
    const html = renderToStaticMarkup(<BlocEditorialBible bloc={introduction} />)
    const paragraphe = html.slice(html.indexOf('Comme nous') - 320, html.indexOf('Comme nous'))
    expect(paragraphe).toContain('font-style:italic')
    expect(paragraphe).toContain('text-align:center')
    expect(paragraphe).toContain('font-size:0.78125rem')
  })

  it('laisse un commentaire au fer et sans italique', () => {
    const html = renderToStaticMarkup(
      <BlocEditorialBible bloc={{ ...introduction, semanticStyleCode: 'commentaire_pericope' }} />,
    )
    const paragraphe = html.slice(html.indexOf('Comme nous') - 320, html.indexOf('Comme nous'))
    expect(paragraphe).toContain('font-style:normal')
    expect(paragraphe).not.toContain('text-align:center')
  })

  it('laisse l’introduction d’une PÉRICOPE au fer et en romain', () => {
    // Le préambule du livre s’écarte du fil ; l’introduction d’une péricope
    // accompagne un passage précis et appartient au fil. Le même traitement
    // pour les deux faisait flotter au milieu de la page un texte qui suit
    // son intertitre.
    const html = renderToStaticMarkup(
      <BlocEditorialBible bloc={{ ...introduction, semanticStyleCode: 'introduction_pericope', niveauHtml: 3 }} />,
    )
    const paragraphe = html.slice(html.indexOf('Comme nous') - 320, html.indexOf('Comme nous'))
    expect(paragraphe).toContain('font-style:normal')
    expect(paragraphe).not.toContain('text-align:center')
  })
})
