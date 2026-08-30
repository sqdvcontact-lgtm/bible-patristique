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
    // ⚠️ L'attribut rapporte le nom CANONIQUE, non le code écrit dans la donnée.
    // Depuis le regroupement du 29 août 2026, `introduction_livre` est un alias de
    // `introduction_titree` : l'introduction qui porte son propre titre.
    expect(html).toContain('data-semantic-style="introduction_titree"')
    expect(html).toContain('data-placement="before"')
    expect(html).toContain('Introduction à l’Évangile selon saint Marc')
  })

  it('compose un style CANONIQUE dont le bloc déclare le rang', () => {
    // ⛔ Depuis le regroupement du 29 août 2026, un style d'information dit une
    // NATURE et le rang se déclare. Sans ce report, la base accepterait un bloc que
    // le rendu refuserait — ce qui est exactement ce que son verrou existe pour
    // empêcher. Voir la migration 20260829120000.
    const html = renderToStaticMarkup(
      <BlocEditorialBible bloc={{
        id: 'canon-1',
        semanticStyleCode: 'commentaire',
        semanticLevel: 'I5',
        placement: 'before',
        textBlocks: [{
          id: 'canon-1-p', kind: 'commentary', form: 'prose',
          text: 'Le commentaire de la péricope.', language: 'fr',
        }],
      }} />,
    )
    expect(html).toContain('data-semantic-style="commentaire"')
    expect(html).toContain('cs-bible-info--i5')
    expect(html).toContain('cs-bible-block--commentary')
    expect(html).toContain('Le commentaire de la péricope.')
  })

  it('⛔ ne rend RIEN d’un style canonique dont le rang manque', () => {
    // Le nom dit la nature, le rang se déclare. Un bloc qui n'en déclare aucun ne
    // s'en invente pas un : le rendu refuse ce qu'il ne sait pas composer, au lieu
    // de l'aplatir en paragraphe générique.
    const html = renderToStaticMarkup(
      <BlocEditorialBible bloc={{
        id: 'canon-2',
        semanticStyleCode: 'commentaire',
        placement: 'before',
        textBlocks: [{
          id: 'canon-2-p', kind: 'commentary', form: 'prose',
          text: 'Ceci ne doit pas paraître.', language: 'fr',
        }],
      }} />,
    )
    expect(html).not.toContain('Ceci ne doit pas paraître.')
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

  /** ⛔ Une gravure DÉTOURÉE ne s'affiche pas, elle DÉCOUPE : son dessin est dans
   *  la couche alpha et l'encre se repose au rendu. Elle n'a donc ni <img> ni
   *  attribut alt, mais un rôle d'image et son intitulé accessible. Une PLANCHE,
   *  qui garde le papier de 1923, se rend en image. */
  const gravure = (regime: 'vignette' | 'au-fil' | 'hors-texte') => ({
    id: 'asset-1',
    assetKey: 'fillion-t07-p0092-i01',
    assetKind: regime === 'hors-texte' ? 'plate' : 'illustration',
    url: 'https://exemple.test/gravure.webp',
    width: 1600,
    height: 555,
    altText: 'Requin figurant le poisson de Jonas.',
    caption: 'Le poisson de Jonas (le requin).',
    printedPage: '90',
    placement: 'after' as const,
    canonIdStart: 'MAT.12.40',
    canonIdEnd: null,
    bodyBlockId: null,
    noteId: null,
    materialOrder: 120,
    regime,
  })

  it('découpe une gravure détourée au lieu de l’afficher, et repose l’encre', () => {
    const html = renderToStaticMarkup(<IllustrationBible illustration={gravure('vignette')} />)
    expect(html).toContain('data-asset-key="fillion-t07-p0092-i01"')
    expect(html).toContain('data-regime="vignette"')
    expect(html).toContain('mask-image')
    expect(html).toContain('aria-label="Requin figurant le poisson de Jonas."')
    expect(html).toContain('Le poisson de Jonas (le requin).')
    // ⛔ Aucune image : le fichier est un masque, pas une illustration à poser.
    expect(html).not.toContain('<img')
  })

  it('donne à chaque régime sa part de la colonne', () => {
    const part = (regime: 'vignette' | 'au-fil' | 'hors-texte') =>
      renderToStaticMarkup(<IllustrationBible illustration={gravure(regime)} />).match(/style="width:(\d+)%/)?.[1]
    expect(part('vignette')).toBe('30')
    expect(part('au-fil')).toBe('75')
    expect(part('hors-texte')).toBe('100')
  })

  it('⛔ rend une SCÈNE en image OPAQUE, jamais en masque', () => {
    // Une photogravure en ton continu ne se détoure pas : mesurée, sa surface
    // transparente valait 3 % quand une gravure au trait en rend 85 à 94.
    const html = renderToStaticMarkup(<IllustrationBible illustration={gravure('au-fil')} />)
    expect(html).toContain('<img')
    expect(html).toContain('cs-bible-gravure-cadre')
    expect(html).not.toContain('mask-image')
  })

  it('rend une PLANCHE en image, papier compris, et jamais en masque', () => {
    const html = renderToStaticMarkup(<IllustrationBible illustration={gravure('hors-texte')} />)
    expect(html).toContain('<img')
    expect(html).toContain('alt="Requin figurant le poisson de Jonas."')
    expect(html).toContain('cs-bible-gravure-passe')
    expect(html).not.toContain('mask-image')
  })

  it('n’habille QUE dans un bloc : ancrée sur un verset, la vignette se centre', () => {
    const seule = renderToStaticMarkup(<IllustrationBible illustration={gravure('vignette')} />)
    const dansUnBloc = renderToStaticMarkup(<IllustrationBible illustration={gravure('vignette')} habillage />)
    expect(seule).not.toContain('float')
    expect(dansUnBloc).toContain('float:right')
  })

  it('⛔ ALTERNE les bords : le côté vient de la composition, non du régime', () => {
    const droite = renderToStaticMarkup(<IllustrationBible illustration={gravure('vignette')} habillage cote="droite" />)
    const gauche = renderToStaticMarkup(<IllustrationBible illustration={gravure('vignette')} habillage cote="gauche" />)
    expect(droite).toContain('float:right')
    expect(gauche).toContain('float:left')
    // ⚠️ La marge suit le bord : posée du mauvais côté, elle colle la gravure au texte.
    expect(gauche).toContain('data-cote="gauche"')
    expect(gauche).toContain('cs-bible-gravure--gauche')
  })

  it('⛔ à GAUCHE, la vignette prend la COLONNE DE LA MANCHETTE', () => {
    // Le repère d’un commentaire est lui aussi un flottant de gauche, large de
    // 7 rem. Une vignette plus large fait sauter le fer du texte d’un paragraphe
    // à l’autre : mesuré sur épreuve, de 126 à 168 px dans le même bloc.
    const gauche = renderToStaticMarkup(<IllustrationBible illustration={gravure('vignette')} habillage cote="gauche" />)
    const droite = renderToStaticMarkup(<IllustrationBible illustration={gravure('vignette')} habillage cote="droite" />)
    expect(gauche).toContain('width:var(--cs-manchette-colonne)')
    expect(gauche).toContain('var(--cs-manchette-gouttiere)')
    expect(droite).toContain('width:30%')
  })

  it('⛔ une SCÈNE ne flotte jamais, même si on le lui demande', () => {
    const html = renderToStaticMarkup(<IllustrationBible illustration={gravure('au-fil')} habillage cote="gauche" />)
    expect(html).not.toContain('float')
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
    expect(html).toContain('<h3 class="cs-bible-title--t6 cs-bible-title--porte"')
    expect(html).toContain('Le précurseur fait son apparition</h3>')
    expect(html).toContain('Le développement.')
  })

  // ⛔ Le titre PORTÉ par le bloc et un titre qui vit DANS son flux ne se
  // marquent pas pareil, et la feuille de styles n’ôte la marge haute qu’au
  // premier. Le sélecteur visait autrefois tout titre enfant d’un bloc : une
  // introduction normalisée, qui met dix titres dans un seul bloc, les voyait
  // tous se coller au texte qui les précède (2026-08-30).
  it('ne marque « porté » que le titre du bloc, jamais ceux de son flux', () => {
    const html = renderToStaticMarkup(
      <BlocEditorialBible bloc={bloc('introduction_pericope', {
        niveauHtml: 3,
        textBlocks: [
          { id: 'b1:1', kind: 'heading' as const, form: 'prose' as const, text: 'La Loi ou Tôrah', headingLevel: 'T4' as const },
          { id: 'b1:2', kind: 'commentary' as const, form: 'prose' as const, text: 'Le développement.' },
        ],
      })} />,
    )
    const titreDuBloc = html.match(/<h3 class="([^"]*)"/)?.[1] ?? ''
    const titreDuFlux = html.match(/<h4 class="([^"]*)"/)?.[1] ?? ''
    expect(titreDuBloc).toContain('cs-bible-title--porte')
    expect(titreDuFlux).toContain('cs-bible-title--t4')
    expect(titreDuFlux).not.toContain('cs-bible-title--porte')
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

  it('pose un sous-titre de partie, et non un paragraphe d’introduction', () => {
    const html = renderToStaticMarkup(<BlocEditorialBible bloc={sousTitre} />)
    expect(html).toContain('data-display-role="part_subtitle"')
    expect(html).toContain('class="cs-bible-sous-titre"')
    const paragraphe = html.slice(0, html.indexOf('L’enfance'))
    expect(paragraphe).toContain('font-style:italic')
    // ⛔ Pas de justification : ce n'est pas un développement.
    expect(paragraphe).not.toContain('text-align:justify')
    // Sans rang connu, la composition des rangs HAUTS : centrée, dans l'encre du
    // titre. C'est celle que les 201 sous-titres du corpus recevaient tous.
    expect(paragraphe).toContain('text-align:center')
    expect(paragraphe).toContain('font-size:0.9375rem')
    expect(paragraphe).toContain('color:var(--cs-encre-fonce)')
  })

  it('⛔ un sous-titre prend la POSE de son titre, quel qu’il soit', () => {
    // C'est la correction du 29 août 2026 : 149 sous-titres sur 201 se composaient
    // centrés sous un titre lui-même au fer. Les deux moitiés d'une même composition
    // ne partageaient pas leur axe, défaut déjà consigné pour l'intertitre divisé.
    // ⚠️ La règle n'a pas changé le 30 août ; ce sont les TITRES qui ont bougé. La
    // sous-section s'est recentrée, son sous-titre la suit, et seule la péricope
    // tient encore le fer. Un test qui nommerait « les rangs bas » manquerait le
    // point : rien ici ne dépend du rang, tout dépend de la pose du titre.
    const sousSection = renderToStaticMarkup(
      <BlocEditorialBible bloc={{ ...sousTitre, rangDuTitre: 'T4' }} />,
    )
    expect(sousSection).toContain('data-titre-rang="T4"')
    const centre = sousSection.slice(0, sousSection.indexOf('L’enfance'))
    expect(centre).toContain('text-align:center')
    expect(centre).toContain('font-size:1rem')
    expect(centre).toContain('color:var(--cs-encre-apparat)')

    const pericope = renderToStaticMarkup(
      <BlocEditorialBible bloc={{ ...sousTitre, rangDuTitre: 'T6' }} />,
    )
    const auFer = pericope.slice(0, pericope.indexOf('L’enfance'))
    expect(auFer).toContain('text-align:left')
    expect(auFer).toContain('font-size:0.875rem')
    expect(auFer).toContain('color:var(--cs-encre-apparat)')
  })

  it('⛔ ne pose aucun rang quand l’ancre n’en a pas donné', () => {
    // Mieux vaut la composition par défaut qu'un rang deviné.
    expect(renderToStaticMarkup(<BlocEditorialBible bloc={sousTitre} />))
      .not.toContain('data-titre-rang')
  })

  it('conserve le niveau section dans la donnée tout en composant son sous-titre comme un chapeau', () => {
    const html = renderToStaticMarkup(<BlocEditorialBible bloc={{
      ...sousTitre,
      id: 'mat-struct-section-01-info',
      blockKey: 'mat-struct-section-01-info',
      presentation: {
        ...sousTitre.presentation,
        displayRole: 'section_subtitle',
        attachToBlockKey: 'mat-struct-section-01',
      },
    }} />)
    expect(html).toContain('data-display-role="section_subtitle"')
    expect(html).toContain('class="cs-bible-sous-titre"')
    const paragraphe = html.slice(0, html.indexOf('L’enfance'))
    expect(paragraphe).toContain('font-style:italic')
    expect(paragraphe).not.toContain('text-align:justify')
  })

  it('reconnaît le rôle CANONIQUE `sous_titre`', () => {
    // Les deux noms hérités disaient dans le rôle un rang que le rôle ne sait pas
    // dire : le rang vient du titre, et le rôle ne dit plus que la fonction.
    const html = renderToStaticMarkup(<BlocEditorialBible bloc={{
      ...sousTitre,
      presentation: { ...sousTitre.presentation, displayRole: 'sous_titre' },
    }} />)
    expect(html).toContain('data-display-role="sous_titre"')
    expect(html).toContain('class="cs-bible-sous-titre"')
  })

  it('ne pose aucun rôle d’affichage sur un bloc qui n’en déclare pas', () => {
    const html = renderToStaticMarkup(
      <BlocEditorialBible bloc={{ ...sousTitre, presentation: null }} />,
    )
    expect(html).not.toContain('data-display-role')
    expect(html).not.toContain('cs-bible-sous-titre')
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
    // La MÊME famille que les listes structurées : une note bibliographique et
    // une pièce « Du même auteur » se composent d'une seule manière.
    // ⚠️ Le modificateur suit : la liste des notes pose le corps de l'apparat
    // sur ses PARAGRAPHES, jamais sur un ancêtre de la bibliographie.
    expect(html).toContain(
      'class="cs-apparat-bibliographie cs-apparat-bibliographie--sans-hote"',
    )
    expect(html).toContain('<li class="cs-apparat-bibliographie__entree">')
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
    expect(html).not.toContain('cs-apparat-bibliographie')
  })
})

describe('citation sortie dans une introduction ou un apparat', () => {
  const CITEE = 'Toutes les parties de ce livre sont unies de la façon la plus étroite par une relation unique, la relation qu’elles ont à Jésus-Christ, l’Oint de Dieu, le Sauveur d’Israël, le Sauveur de l’humanité. Sans lui, l’histoire sainte entière n’aurait ni enchaînement ni but. Non, elle n’en aurait pas, puisqu’il est l’objet perpétuel des promesses, des coutumes religieuses, de l’attente nationale, des aspirations ardentes des hommes de Dieu.'
  const ANNONCE = 'À notre époque, Stolberg écrivait au sujet de la Bible : '

  const rendre = (style: string, texte: string, inlineSpans?: unknown[]) => renderToStaticMarkup(
    <BlocEditorialBible bloc={{
      id: 'bloc',
      semanticStyleCode: style,
      placement: 'before',
      textBlocks: [{
        id: 'bloc-1', kind: 'commentary', form: 'prose', text: texte, language: 'fr',
        ...(inlineSpans ? { inlineSpans } : {}),
      }],
    } as never} />,
  )

  it('détache une citation longue, isolée et terminale d’une introduction', () => {
    const html = rendre('introduction_bible', `${ANNONCE}« ${CITEE} »`)
    expect(html).toContain('class="citation-sortie"')
    // ⛔ Les guillemets encadrants tombent : le retrait dit la citation.
    expect(html).toContain('Toutes les parties de ce livre')
    expect(html).not.toContain(`« ${CITEE}`)
    // L’annonce, elle, reste au fil du texte.
    expect(html).toContain('Stolberg écrivait au sujet de la Bible')
  })

  it('la détache aussi dans un apparat critique', () => {
    expect(rendre('notice_bible', `${ANNONCE}« ${CITEE} »`)).toContain('class="citation-sortie"')
  })

  it('⛔ ne la détache PAS dans un commentaire de péricope', () => {
    // Un commentaire cite en une ligne : le retrait l’y noierait.
    expect(rendre('commentaire_pericope', `${ANNONCE}« ${CITEE} »`)).not.toContain('citation-sortie')
  })

  it('⛔ ne la détache PAS quand une locution marquée est à cheval sur la coupure', () => {
    // Ses offsets ne se reportent pas : mieux vaut la citation au fil du texte
    // qu’une italique perdue en silence.
    const texte = `${ANNONCE}« ${CITEE} »`
    const cheval = [{ kind: 'foreign_expression', rendering: 'italic', language: 'la',
      startOffsetUnicode: ANNONCE.length - 10, endOffsetUnicode: ANNONCE.length + 20 }]
    expect(rendre('introduction_bible', texte, cheval)).not.toContain('citation-sortie')
  })

  it('reporte une locution marquée qui tient tout entière dans la citation', () => {
    const texte = `${ANNONCE}« ${CITEE} »`
    const debut = texte.indexOf('Jésus-Christ')
    const dedans = [{ kind: 'foreign_expression', rendering: 'italic', language: 'la',
      startOffsetUnicode: debut, endOffsetUnicode: debut + 'Jésus-Christ'.length }]
    const html = rendre('introduction_bible', texte, dedans)
    expect(html).toContain('class="citation-sortie"')
    expect(html).toContain('<em lang="la">Jésus-Christ</em>')
  })
})

describe('une locution entre guillemets coupée par un appel de note', () => {
  it('n’ouvre ses guillemets qu’une fois, et ne les ferme qu’une fois', () => {
    // Relevé par l'auteur sur l'Introduction générale, 2026-08-28 : l'appel tombé
    // au milieu coupait la locution en fragments, et CHAQUE fragment reprenait sa
    // paire — « les hommes de » « Dieu » là où l'édition écrit « les hommes de
    // Dieu ».
    const texte = 'Les aspirations ardentes des hommes de Dieu sont là.'
    const debut = texte.indexOf('hommes de Dieu')
    const html = renderToStaticMarkup(
      <BlocEditorialBible bloc={{
        id: 'bloc',
        semanticStyleCode: 'commentaire_pericope',
        placement: 'before',
        internalNotes: [{
          id: 'n1', displayNumber: 1, printedMarker: '1',
          anchorTarget: 'body', anchorText: 'hommes de',
          blocks: [],
        }],
        textBlocks: [{
          id: 'bloc-1', kind: 'commentary', form: 'prose', text: texte, language: 'fr',
          inlineSpans: [{
            kind: 'quotation', rendering: 'quotation_italic', language: 'fr',
            startOffsetUnicode: debut, endOffsetUnicode: debut + 'hommes de Dieu'.length,
          }],
        }],
      } as never} />,
    )
    const ouvrants = (html.match(/«/g) ?? []).length
    const fermants = (html.match(/»/g) ?? []).length
    expect({ ouvrants, fermants }).toEqual({ ouvrants: 1, fermants: 1 })
  })
})
