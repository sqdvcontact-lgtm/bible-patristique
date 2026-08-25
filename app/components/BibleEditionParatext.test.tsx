import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  BlocEditorialBible,
  IllustrationBible,
  NotesBibleChapitre,
} from './BibleEditionParatext'
import AppelNoteBiblique from './NoteBibliqueFenetre'

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

  it('relie la note de fin de chapitre à l’appel qui l’a posée', () => {
    const note = {
      id: 'note-1',
      displayNumber: 1,
      canonId: 'MRK.1.1',
      blocks: [{
        id: 'note-1-commentary',
        kind: 'commentary' as const,
        form: 'prose' as const,
        text: 'Commentaire de ce verset.',
        language: 'fr',
      }],
    }
    const html = renderToStaticMarkup(
      <>
        <p>Initium evangelii<AppelNoteBiblique note={note} /></p>
        <NotesBibleChapitre notes={[note]} />
      </>,
    )
    // L'appel n'est plus un lien : il ouvre la note au clic. Il garde en
    // revanche l'ancre vers laquelle la liste du chapitre revient.
    expect(html).toContain('id="appel-note-bible-note-1"')
    expect(html).toContain('id="note-bible-note-1"')
    expect(html).toContain('href="#appel-note-bible-note-1"')
    expect(html).toContain('data-canon-id="MRK.1.1"')
  })

  it('ouvre au clic la note qu’un appel désigne, au lieu de l’imprimer sous le bloc', () => {
    const html = renderToStaticMarkup(
      <BlocEditorialBible bloc={{
        id: 'intro-mat',
        semanticStyleCode: 'introduction_livre',
        placement: 'before',
        textBlocks: [{
          id: 'texte',
          kind: 'commentary',
          form: 'prose',
          text: 'Il se nommait primitivement Lévi, comme nous l’apprend saint Marc.',
        }],
        internalNotes: [{
          id: 'intro-note-1',
          displayNumber: 1,
          printedMarker: '1',
          anchorTarget: 'body',
          anchorText: 'saint Marc',
          blocks: [{ id: 'reference', kind: 'reference', form: 'prose', text: 'Act. XII, 12.' }],
        }],
      }} />,
    )
    expect(html).toContain('aria-label="Consulter la note 1"')
    // Le texte de la note ne se lit plus dans le corps, et la liste du bas
    // disparaît avec lui.
    expect(html).not.toContain('Act. XII, 12.')
    expect(html).not.toContain('aria-label="Apparat propre à ce bloc"')
  })

  it('n’abandonne jamais l’appel en tête de ligne, ni le point qui le suit', () => {
    const html = renderToStaticMarkup(
      <BlocEditorialBible bloc={{
        id: 'intro-mat',
        semanticStyleCode: 'introduction_livre',
        placement: 'before',
        textBlocks: [{
          id: 'texte',
          kind: 'commentary',
          form: 'prose',
          text: 'Il se nommait primitivement Lévi, comme nous l’apprend saint Marc.',
        }],
        internalNotes: [{
          id: 'intro-note-1',
          displayNumber: 1,
          printedMarker: '1',
          anchorTarget: 'body',
          anchorText: 'saint Marc',
          blocks: [{ id: 'reference', kind: 'reference', form: 'prose', text: 'Act. XII, 12.' }],
        }],
      }} />,
    )
    // Le dernier mot, l'appel et le point final voyagent ensemble.
    const groupe = /<span style="white-space:nowrap">Marc.*?\.<\/span>/s.exec(html)
    expect(groupe).not.toBeNull()
    expect(groupe?.[0]).toContain('Consulter la note 1')
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

  it('ne déduit pas l’apparence du développement de sa seule portée', () => {
    // Le fac-similé de Matthieu porte une introduction de livre justifiée et
    // romaine : « introduction_livre » ne signifie donc pas automatiquement
    // « centré et italique ». L’apparence vient de la structure relevée.
    const html = renderToStaticMarkup(<BlocEditorialBible bloc={introduction} />)
    const paragraphe = html.slice(html.indexOf('Comme nous') - 320, html.indexOf('Comme nous'))
    expect(paragraphe).toContain('font-style:normal')
    expect(paragraphe).toContain('text-align:justify')
  })

  it('respecte une apparence explicitement relevée dans la structure', () => {
    const html = renderToStaticMarkup(<BlocEditorialBible bloc={{
      ...introduction,
      textBlocks: [{
        ...introduction.textBlocks[0],
        presentation: { fontStyle: 'italic' as const, textAlign: 'center' as const },
      }],
    }} />)
    const paragraphe = html.slice(html.indexOf('Comme nous') - 320, html.indexOf('Comme nous'))
    expect(paragraphe).toContain('font-style:italic')
    expect(paragraphe).toContain('text-align:center')
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

// Ce que la donnée DÉCLARE de sa présentation, et que le rendu suit sans rien
// deviner : le rôle d'affichage d'un bloc, le style de son premier paragraphe,
// le genre d'un bloc de note.
describe('présentation déclarée par la donnée', () => {
  const sousTitre = {
    id: 'mat-struct-part-01-info',
    blockKey: 'mat-struct-part-01-info',
    semanticStyleCode: 'introduction_partie',
    placement: 'before' as const,
    presentation: {
      displayRole: 'part_subtitle' as const,
      attachToBlockKey: 'mat-struct-part-01',
      hierarchyAxis: null,
      outlineRole: null,
      leadingParagraphStyle: null,
      leadingParagraphAttachedToHeading: false,
    },
    textBlocks: [{
      id: 'sous-titre',
      kind: 'commentary' as const,
      form: 'prose' as const,
      text: 'L’enfance et la vie cachée de Jésus (1, 1 - 2, 23).',
      language: 'fr',
    }],
  }

  it('pose le sous-titre de partie centré, et non comme un paragraphe d’introduction', () => {
    const html = renderToStaticMarkup(<BlocEditorialBible bloc={sousTitre} />)
    expect(html).toContain('data-display-role="part_subtitle"')
    expect(html).toContain('class="cs-bible-sous-titre-partie"')
    const paragraphe = html.slice(0, html.indexOf('L’enfance'))
    expect(paragraphe).toContain('text-align:center')
    expect(paragraphe).toContain('font-style:italic')
    // ⛔ Pas de justification : ce n'est pas un développement.
    expect(paragraphe).not.toContain('text-align:justify')
  })

  it('ne pose aucun rôle d’affichage sur un bloc qui n’en déclare pas', () => {
    const html = renderToStaticMarkup(
      <BlocEditorialBible bloc={{ ...sousTitre, presentation: null }} />,
    )
    expect(html).not.toContain('data-display-role')
    expect(html).not.toContain('cs-bible-sous-titre-partie')
  })

  it('ne rend pas la mention de chapitre, que la navigation dit déjà', () => {
    // Charte §35.1. Elle reste dans la donnée, témoin matériel de l'édition,
    // mais la barre de navigation nomme déjà le chapitre au-dessus du texte.
    const html = renderToStaticMarkup(<BlocEditorialBible bloc={{
      id: 'mat-02-chapter-title',
      blockKey: 'mat-02-chapter-title',
      semanticStyleCode: 'titre_chapitre_livre',
      heading: 'Chapitre II',
      placement: 'before',
      niveauHtml: 3,
      textBlocks: [],
    }} />)
    expect(html).toBe('')
  })

  const renvois = {
    id: 'mat-ocr-block-0002',
    semanticStyleCode: 'commentaire_pericope',
    heading: '2-5. Les ancêtres de Notre-Seigneur',
    placement: 'before' as const,
    presentation: {
      displayRole: null,
      attachToBlockKey: null,
      hierarchyAxis: null,
      outlineRole: null,
      leadingParagraphStyle: 'renvois-bible' as const,
      leadingParagraphAttachedToHeading: true,
    },
    textBlocks: [
      { id: 'p1', kind: 'commentary' as const, form: 'prose' as const, text: '*Cf.* Gn 21, 2 et *ss.* ; 25, 25.', language: 'fr' },
      { id: 'p2', kind: 'commentary' as const, form: 'prose' as const, text: 'Les trois patriarches les plus illustres.', language: 'fr' },
    ],
  }

  it('compose en renvois le PREMIER paragraphe seulement', () => {
    const html = renderToStaticMarkup(<BlocEditorialBible bloc={renvois} />)
    expect(html).toContain('class="cs-bible-renvois-bible"')
    const premier = html.slice(0, html.indexOf('Gn 21'))
    expect(premier).toContain('color:var(--cs-texte-second)')
    // ⛔ Ni boîte, ni fond, ni bordure, ni tiret injecté.
    expect(premier).not.toContain('border')
    expect(premier).not.toContain('background')
    const second = html.slice(html.indexOf('Gn 21'), html.indexOf('patriarches'))
    expect(second).not.toContain('cs-bible-renvois-bible')
    // L'italique interne du renvoi survit.
    expect(html).toContain('<em>Cf.</em>')
  })

  it('garde le renvoi court dans la prose, faute de déclaration', () => {
    // « … à son frère Pharès (cf. Gn 38, 27 et ss.). » est une référence
    // ponctuelle, pas un groupe posé sous un titre : rien ne le distingue.
    const html = renderToStaticMarkup(
      <BlocEditorialBible bloc={{ ...renvois, presentation: null }} />,
    )
    expect(html).not.toContain('cs-bible-renvois-bible')
  })

  const bibliographie = [
    'Signalons, comme œuvres spéciales :',
    '- ++Jean Chrysostome++, *Homélies sur l’Évangile selon Matthieu*.',
    '- ++Van Steenkiste++ Jean-Aloïs, *Commentarius*, Bruges, 1876.',
  ].join('\n')

  it('compose en liste la note que la donnée déclare bibliographique', () => {
    const html = renderToStaticMarkup(<NotesBibleChapitre notes={[{
      id: 'note-biblio',
      displayNumber: 1,
      canonId: 'MAT.1.1',
      blocks: [{
        id: 'note-biblio-1',
        kind: 'commentary' as const,
        form: 'prose' as const,
        text: bibliographie,
        language: 'fr',
        presentationStyle: 'bibliographie' as const,
      }],
    }]} />)
    expect(html).toContain('class="cs-bible-bibliographie"')
    expect(html).toContain('<li>')
    // ⛔ Le marqueur de la donnée ne s'imprime pas.
    expect(html).not.toContain('- <span')
    expect(html).not.toContain('>- ')
    // La forme d'affichage garde sa capitale d'autorité.
    expect(html).toContain('Van Steenkiste')
  })

  it('laisse en paragraphe suivi la même note sans sa déclaration', () => {
    const html = renderToStaticMarkup(<NotesBibleChapitre notes={[{
      id: 'note-suivie',
      displayNumber: 1,
      canonId: 'MAT.1.1',
      blocks: [{
        id: 'note-suivie-1',
        kind: 'commentary' as const,
        form: 'prose' as const,
        text: bibliographie,
        language: 'fr',
      }],
    }]} />)
    expect(html).not.toContain('cs-bible-bibliographie')
  })
})
