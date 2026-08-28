import { Fragment, type CSSProperties, type ReactNode } from 'react'
import Image from 'next/image'
import {
  ancreAppelNoteBible,
  type BibleEditionDisplayAsset,
  type BibleEditionDisplayBodyBlock,
  type BibleEditionDisplayInlineSpan,
  type BibleEditionDisplayInternalNote,
  type BibleEditionDisplayNote,
  type BibleEditionDisplayTextBlock,
  type StyleCompositionBloc,
} from '@/app/lib/bibleEdition'
import {
  classeIntituleTitre,
  classesDuStyle,
  resoudreStyleSemantique,
  diviserIntitule,
  type JetonTitre,
  type StyleResolu,
} from '@/app/lib/bibleHierarchieSemantique'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import {
  PONCTUATION_ATTACHEE,
  detacherDernierMot,
  separateurAppels,
  styleSeparateurAppels,
  type VarianteAppelNote,
} from '@/app/lib/appelsDeNote'
import { composerBibliographie } from '@/app/lib/bibleBibliographie'
import {
  auteurPorteParLeTitreDeLaPiece,
  type BibliographiePiece,
} from '@/app/lib/bibleBibliographieOuvrages'
import { intituleDansPiece } from '@/app/lib/bibleSommaireEdition'
import AppelNoteBiblique from './NoteBibliqueFenetre'
import BibliographieBible from './BibleBibliographie'
import BibliographieOuvrages from './BibliographieOuvrages'

export type BlocTexteBiblique = BibleEditionDisplayTextBlock

export type BlocEditorialBiblique = Pick<
  BibleEditionDisplayBodyBlock,
  'id' | 'blockKey' | 'semanticStyleCode' | 'niveauHtml' | 'noticeSubtype' | 'heading' | 'placement'
  | 'textBlocks' | 'presentation'
> & { internalNotes?: BibleEditionDisplayInternalNote[] }

/**
 * Comment un paragraphe se compose, quand la donnée le dit et non le rendu.
 *
 * Les trois valeurs viennent toutes d'une métadonnée : le style d'un bloc de
 * note, le style imposé au premier paragraphe d'un bloc, le rôle d'affichage
 * d'un bloc entier. ⛔ Aucune ne se devine à la forme du texte : sans la
 * métadonnée, le paragraphe se compose comme les autres.
 */
type CompositionParagraphe = StyleCompositionBloc | 'sous-titre-partie'

export type NoteBibliqueAffichable = Pick<
  BibleEditionDisplayNote,
  'id' | 'displayNumber' | 'canonId' | 'blocks'
>

export type IllustrationBibliqueAffichable = BibleEditionDisplayAsset

// Le paratexte se compose comme le reste du site, non comme un encart : la
// police et la mesure de la page Bible pour le texte, et les rangs de titre de
// la page d'œuvre pour ce qui surmonte. Les encadrés à fond teinté qui
// tenaient lieu de style au premier jet ont disparu — un commentaire de Fillion
// n'est pas une alerte, c'est du texte d'édition.
const SERIF = 'var(--font-source-serif), Georgia, serif'


// Corps d'un paratexte : la composition d'un verset de la page Bible, mais un
// cran en dessous. Une introduction de Fillion se lit AUTOUR du texte biblique,
// non à sa place : elle se compose donc plus petit, plus serré et d'une encre
// plus claire. C’est cette différence de composition qui la situe, et non un
// filet dans la marge — ⛔ aucun filet à gauche ni sous un bloc.
const STYLE_CORPS: CSSProperties = {
  fontFamily: SERIF,
  // Un cran de plus sous le texte biblique (13 → 12,5 px, rang de l'échelle),
  // et l'interligne resserré avec lui : Fillion compose son commentaire dense,
  // et un apparat qui respire comme le texte qu'il commente lui dispute la page.
  fontSize: '0.78125rem',
  lineHeight: 1.3,
  color: 'var(--cs-texte-second)',
  textAlign: 'justify',
  hyphens: 'auto',
  overflowWrap: 'break-word',
}

function positionAppelDansTexte(
  text: string,
  note: BibleEditionDisplayInternalNote,
  bloc?: BlocTexteBiblique,
): number | null {
  if (note.anchorTarget === 'heading') {
    if (!note.anchorText) return null
    const index = text.indexOf(note.anchorText)
    return index >= 0 ? index + note.anchorText.length : null
  }
  if (note.anchorTarget !== 'body') return null
  if (note.anchorText) {
    const index = text.indexOf(note.anchorText)
    if (index >= 0) return index + note.anchorText.length
  }
  const sourceStart = bloc?.sourceStartOffsetUnicode
  const sourceEnd = bloc?.sourceEndOffsetUnicode
  const anchorEnd = note.anchorEndOffsetUnicode
  if (sourceStart == null || sourceEnd == null || anchorEnd == null) return null
  if (anchorEnd < sourceStart || anchorEnd > sourceEnd) return null
  const relative = anchorEnd - sourceStart
  return relative <= text.length ? relative : null
}

function envelopperSpan(
  contenu: ReactNode,
  span: BibleEditionDisplayInlineSpan | undefined,
  key: string,
): ReactNode {
  if (!span) return <Fragment key={key}>{contenu}</Fragment>
  const lang = span.language ?? undefined
  // ⛔ Les guillemets français restent en ROMAIN : ils appartiennent au français
  // qui cite, non au latin cité. « *Jesu Christi* », jamais *« Jesu Christi »* —
  // l'italique s'arrête au bord du guillemet, et la langue avec elle.
  if (span.rendering === 'quotation_italic') {
    return (
      <span key={key}>
        «&#8239;<em lang={lang}>{contenu}</em>&#8239;»
      </span>
    )
  }
  if (span.rendering === 'italic' || ['quotation', 'foreign_expression', 'bibliographic_title', 'abbreviation'].includes(span.kind)) {
    return <em key={key} lang={lang}>{contenu}</em>
  }
  if (span.rendering === 'small_caps' || span.kind === 'historical_author' || span.kind === 'modern_author') {
    return <span key={key} lang={lang} style={{ fontVariant: 'small-caps', letterSpacing: '0.02em' }}>{contenu}</span>
  }
  return <span key={key} lang={lang}>{contenu}</span>
}

// ⛔ Un appel de note ne part JAMAIS seul en tête de ligne, et le point qui le
// suit ne l'y suit pas non plus : règle d'auteur, la même que sur la page
// d'œuvre (voir le long commentaire d'`appelNote.tsx`). L'appel voyage donc dans
// un `nowrap` avec le dernier mot qui le précède et la ponctuation qui le suit.
const NOWRAP: CSSProperties = { whiteSpace: 'nowrap' }

/** L'appel prend la TAILLE et la TEINTE du texte qui l'accueille, jamais son
 *  italique : il est toujours en romain (voir `app/lib/appelsDeNote.ts`). Les
 *  trois rangs hauts sont composés large et centrés, où la teinte brune du corps
 *  ferait une tache : l'appel y prend l'encre du titre. Les rangs bas, composés
 *  à la taille du texte, gardent la forme du corps (même règle que sur la page
 *  d'œuvre). */
function varianteAppel(headingLevel: JetonTitre | null | undefined): VarianteAppelNote {
  return headingLevel === 'T1' || headingLevel === 'T2' || headingLevel === 'T3' ? 'titre' : 'corps'
}

function rendreContenuAncre(
  text: string,
  spans: readonly BibleEditionDisplayInlineSpan[] = [],
  notes: readonly BibleEditionDisplayInternalNote[] = [],
  bloc?: BlocTexteBiblique,
  variante: VarianteAppelNote = 'corps',
): ReactNode {
  const appels = notes.flatMap((note) => {
    const position = positionAppelDansTexte(text, note, bloc)
    return position === null ? [] : [{ position, note }]
  })
  if (spans.length === 0 && appels.length === 0) return rendreTexteEnrichi(text)

  const bornes = new Set<number>([0, text.length])
  for (const span of spans) {
    bornes.add(span.startOffsetUnicode)
    bornes.add(span.endOffsetUnicode)
  }
  for (const appel of appels) bornes.add(appel.position)
  const ordre = [...bornes].filter((position) => position >= 0 && position <= text.length).sort((a, b) => a - b)
  const noeuds: ReactNode[] = []
  // Curseur de lecture : la ponctuation emportée par un appel a déjà été rendue,
  // le fragment suivant reprend après elle.
  let rendu = 0
  for (let index = 0; index < ordre.length - 1; index += 1) {
    const start = ordre[index]
    const end = ordre[index + 1]
    const span = spans.find((candidate) => candidate.startOffsetUnicode <= start && candidate.endOffsetUnicode >= end)
    const appelsIci = appels.filter((candidate) => candidate.position === end)
    const brut = text.slice(Math.max(start, rendu), end)
    if (appelsIci.length === 0) {
      if (brut) noeuds.push(envelopperSpan(rendreTexteEnrichi(brut), span, `run:${start}:${end}`))
      continue
    }
    const [tete, dernierMot] = detacherDernierMot(brut)
    if (tete) noeuds.push(envelopperSpan(rendreTexteEnrichi(tete), span, `run:${start}:${end}`))
    // La ponctuation ne se prend qu'en texte nu : sous une italique ou une
    // petite capitale, elle appartient à l'enveloppe et n'en sort pas.
    const spanApres = spans.find((candidate) => candidate.startOffsetUnicode <= end && candidate.endOffsetUnicode > end)
    const suite = text.slice(end, ordre[index + 2] ?? text.length)
    const ponctuation = spanApres ? '' : (PONCTUATION_ATTACHEE.exec(suite)?.[0] ?? '')
    rendu = end + ponctuation.length
    noeuds.push(
      <span key={`appels:${end}`} style={NOWRAP}>
        {dernierMot ? envelopperSpan(rendreTexteEnrichi(dernierMot), span, `mot:${end}`) : null}
        {appelsIci.map((appel, rang) => (
          <Fragment key={`appel:${appel.note.id}`}>
            {rang > 0 && (
              <span style={styleSeparateurAppels(variante)}>{separateurAppels(rang, appelsIci.length)}</span>
            )}
            <AppelNoteBiblique note={appel.note} variante={variante} />
          </Fragment>
        ))}
        {ponctuation}
      </span>,
    )
  }
  return noeuds
}

/** Ce qu'un style de composition change à un paragraphe, et rien de plus.
 *
 *  ⛔ Aucune boîte, aucun fond, aucune bordure, aucun pictogramme, aucun tiret :
 *  la donnée dit un genre de texte, pas un encart. */
const COMPOSITIONS: Record<CompositionParagraphe, CSSProperties> = {
  // Renvois bibliques posés SOUS un repère de commentaire : ils en prennent la
  // famille — c'est le même appareil — d'un cran plus petit, d'une encre
  // discrète, et se collent au repère au lieu de flotter entre lui et le texte.
  'renvois-bible': {
    fontFamily: 'var(--font-source-sans), Arial, sans-serif',
    fontSize: '0.75rem',
    lineHeight: 1.45,
    color: 'var(--cs-texte-second)',
    textAlign: 'left',
    hyphens: 'manual',
    margin: '0.15em 0 0.45em',
  },
  // Le sous-titre d'une partie n'est pas un paragraphe d'introduction : c'est le
  // chapeau de son titre, tombé dans un bloc voisin par l'ordre matériel. Il se
  // compose donc centré et en italique, mais dans l'ENCRE DE SON TITRE : une
  // encre plus claire en faisait un commentaire du titre, quand il en est la
  // suite. Le blanc qui les sépare se règle dans la feuille, à côté du rang.
  'sous-titre-partie': {
    fontSize: '0.9375rem',
    lineHeight: 1.35,
    fontStyle: 'italic',
    color: 'var(--cs-encre-fonce)',
    textAlign: 'center',
    hyphens: 'manual',
    margin: 0,
  },
  // La bibliographie a sa propre matière — la famille `.cs-apparat-bibliographie`,
  // voir `BibliographieBible` — et n'ajoute donc rien au style du paragraphe.
  bibliographie: {},
}

function rendreBlocTexte(
  bloc: BlocTexteBiblique,
  resolu?: StyleResolu,
  notes: readonly BibleEditionDisplayInternalNote[] = [],
  niveauParent?: 1 | 2 | 3 | 4 | 5 | 6,
  composition?: CompositionParagraphe | null,
): ReactNode {
  // Une liste bibliographique n'est pas un paragraphe : elle a sa matière, et
  // c'est la DÉCLARATION de la donnée qui l'y envoie — ⛔ jamais le titre de la
  // pièce, ni une forme reconnue au passage dans le texte.
  //
  // ⚠️ Une bibliographie déclarée mais pas encore structurée — aucun marqueur
  // d'entrée à découper — garde le cadre typographique de la famille et reste
  // un paragraphe : la reverser dans le paragraphe d'apparat ordinaire la
  // justifierait et lui rendrait le corps du texte courant. Seul un bloc
  // entièrement vide retombe sur le rendu commun, qui n'affichera rien.
  //
  // ⚠️ `sansHote` : ici, le corps, la police et l'encre de l'apparat sont posés
  // sur chaque PARAGRAPHE, en style inline — un bloc éditorial ne les porte pas
  // toujours. La liste n'est pas l'enfant de ces paragraphes mais leur sœur :
  // sans ce drapeau, son `em` se calculerait sur la page, et elle paraîtrait
  // plus GROSSE que le texte qu'elle accompagne.
  if (composition === 'bibliographie') {
    const composee = composerBibliographie(bloc.text)
    if (composee.chapeau || composee.entrees.length > 0) {
      return (
        <BibliographieBible
          key={bloc.id}
          texte={bloc.text}
          lang={bloc.language ?? undefined}
          sansHote
        />
      )
    }
  }
  if (bloc.kind === 'heading') {
    const niveau = Math.min(6, (niveauParent ?? 2) + 1) as 1 | 2 | 3 | 4 | 5 | 6
    const Balise = `h${niveau}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    return (
      <Balise
        key={bloc.id}
        className={bloc.headingLevel ? classeIntituleTitre(bloc.headingLevel) : 'cs-bible-info-label'}
        data-source-start={bloc.sourceStartOffsetUnicode ?? undefined}
        data-source-end={bloc.sourceEndOffsetUnicode ?? undefined}
        style={{
          textAlign: bloc.presentation?.textAlign,
          fontStyle: bloc.presentation?.fontStyle,
        }}
      >
        {rendreContenuAncre(bloc.text, bloc.inlineSpans, notes, bloc, varianteAppel(bloc.headingLevel))}
      </Balise>
    )
  }

  const discret = bloc.kind === 'reference' || bloc.kind === 'attribution'
  const style: CSSProperties = {
    ...STYLE_CORPS,
    margin: discret ? '0.35rem 0 0' : '0 0 0.6rem',
    whiteSpace: bloc.form === 'verse' ? 'pre-line' : 'pre-wrap',
    fontStyle: bloc.kind === 'lemma' || bloc.kind === 'quotation' ? 'italic' : 'normal',
    ...(discret
      ? { color: 'var(--cs-texte-second)', fontSize: '0.78125rem', textAlign: 'left' as const }
      : {}),
    ...(bloc.form === 'verse' ? { lineHeight: 1.6, textAlign: 'left' as const } : {}),
    // La portée ne décide jamais seule du centrage ou de l'italique. Le
    // fac-similé de Fillion centre « INTRODUCTION », mais justifie son corps :
    // seule la propriété de présentation reconstruite peut donc déroger ici.
    ...(bloc.presentation?.textAlign ? { textAlign: bloc.presentation.textAlign } : {}),
    ...(bloc.presentation?.fontStyle ? { fontStyle: bloc.presentation.fontStyle } : {}),
    // Le style de composition vient en DERNIER : c'est la déclaration la plus
    // précise, celle qui vise ce paragraphe-ci et non le genre de son bloc.
    ...(composition ? COMPOSITIONS[composition] : {}),
  }
  return (
    <p
      key={bloc.id}
      lang={bloc.language ?? undefined}
      className={composition ? `cs-bible-${composition}` : undefined}
      data-source-start={bloc.sourceStartOffsetUnicode ?? undefined}
      data-source-end={bloc.sourceEndOffsetUnicode ?? undefined}
      style={style}
    >
      {rendreContenuAncre(bloc.text, bloc.inlineSpans, notes, bloc)}
    </p>
  )
}

export function IllustrationBible({ illustration }: { illustration: IllustrationBibliqueAffichable }) {
  const largeur = Math.min(illustration.width, 760)
  return (
    <figure
      data-asset-key={illustration.assetKey}
      data-asset-kind={illustration.assetKind}
      data-placement={illustration.placement}
      style={{ width: `min(100%, ${largeur}px)`, margin: '1.25rem auto', textAlign: 'center' }}
    >
      <Image
        src={illustration.url}
        alt={illustration.altText}
        width={illustration.width}
        height={illustration.height}
        sizes="(max-width: 900px) calc(100vw - 3rem), 760px"
        unoptimized
        style={{ display: 'block', width: '100%', height: 'auto', objectFit: 'contain' }}
      />
      {/* La légende suit le corps du paratexte : plus grosse que le commentaire,
          elle passerait devant le texte qu'elle accompagne. */}
      {illustration.caption && (
        <figcaption style={{ marginTop: '0.5rem', fontFamily: SERIF, fontStyle: 'italic', color: 'var(--cs-texte-second)', fontSize: '0.78125rem', lineHeight: 1.3 }}>
          {illustration.caption}
        </figcaption>
      )}
    </figure>
  )
}

function rendreIllustrations(illustrations: readonly IllustrationBibliqueAffichable[]) {
  return illustrations.map((illustration) => (
    <IllustrationBible key={illustration.id} illustration={illustration} />
  ))
}

/**
 * Comment ce paragraphe-ci se compose. Trois déclarations, de la plus précise à
 * la plus large, et aucune inférence :
 *
 * 1. le style que le paragraphe porte lui-même (un bloc de note bibliographique) ;
 * 2. le rôle d'affichage du bloc entier (un sous-titre de partie) ;
 * 3. le style imposé au PREMIER paragraphe du bloc (les renvois bibliques).
 *
 * Le troisième ne vaut que pour le premier paragraphe : c'est lui qui touche au
 * titre, et le collant du titre au commentaire. `leading_paragraph_attached_to_heading`
 * est ce que matérialise sa marge haute très faible.
 */
function compositionDuParagraphe(
  bloc: BlocEditorialBiblique,
  texte: BlocTexteBiblique,
  rang: number,
): CompositionParagraphe | null {
  if (texte.presentationStyle) return texte.presentationStyle
  if (!bloc.presentation) return null
  if (bloc.presentation.displayRole === 'part_subtitle') return 'sous-titre-partie'
  if (rang === 0) return bloc.presentation.leadingParagraphStyle
  return null
}

export function BlocEditorialBible({
  bloc,
  illustrations = [],
}: {
  bloc: BlocEditorialBiblique
  illustrations?: IllustrationBibliqueAffichable[]
}) {
  const avant = illustrations.filter((illustration) => illustration.placement === 'before')
  const dansLeFlux = illustrations.filter((illustration) => illustration.placement === 'inline')
  const apres = illustrations.filter((illustration) => illustration.placement === 'after')

  // Le registre décide, et lui seul. Un style qu'il ignore n'est PAS aplati en
  // paragraphe générique : il n'est pas rendu, et l'administration le signale.
  const resolu = resoudreStyleSemantique(bloc.semanticStyleCode)
  if (!resolu || !resolu.bodyBlock) return null
  // ⛔ « Chapitre I » redit ce que la page annonce déjà : la barre de navigation
  // nomme le chapitre au-dessus du texte, et la mention imprimée s'y répétait
  // sans rien apprendre. Elle reste dans la donnée, témoin matériel de
  // l'édition, et ne paraît pas ici (charte §35.1). ⚠️ Elle continue en
  // revanche de traverser l'axe analytique : c'est sa PLACE qui compte, non son
  // intitulé, et sans elle le 2° remonterait sous le 1°.
  if (resolu.redondantAvecNavigation) return null

  // ⚠️ Un bloc de portée HAUTE (I1 : la Bible, un testament, un groupe de
  // livres, un livre) nomme sa portée puis dit son genre — « Évangile selon
  // saint Matthieu — Introduction ». C'est alors le GENRE qui titre, et le nom
  // qui passe en chapeau : le lecteur sait déjà quel livre il ouvre, la barre
  // de navigation le nomme. Un repère de portée plus étroite, lui, garde
  // l'ordre imprimé et la mesure des désignations.
  const intitule = diviserIntitule(bloc.heading ?? null, { genreEnTitre: resolu.level === 'I1' })
  const notesTitre = (bloc.internalNotes ?? []).filter((note) => note.anchorTarget === 'heading')
  const notesCorps = (bloc.internalNotes ?? []).filter((note) => note.anchorTarget === 'body')
  // La balise vient des parents réellement présents, jamais du chiffre du jeton.
  const Balise = `h${bloc.niveauHtml ?? 2}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  const varianteIntitule = varianteAppel(resolu.headingLevel)

  // Une note dont le texte porte l'appel se lit DANS SA FENÊTRE, au clic sur
  // l'exposant : elle n'a plus à s'imprimer au bas du développement. Restent
  // celles que la transcription n'a pas su ancrer — les introductions de Marc,
  // de Luc et de Jean n'ont encore aucun point d'appel relevé. Sans la liste,
  // elles disparaîtraient du site : elle leur est réservée.
  const appelees = new Set<string>()
  const releverAppels = (
    notes: readonly BibleEditionDisplayInternalNote[],
    texte: string,
    support?: BlocTexteBiblique,
  ) => {
    for (const note of notes) {
      if (positionAppelDansTexte(texte, note, support) !== null) appelees.add(note.id)
    }
  }
  if (intitule) {
    releverAppels(notesTitre, intitule.titre)
    if (intitule.sousTitre) releverAppels(notesTitre, intitule.sousTitre)
  }
  for (const texte of bloc.textBlocks) releverAppels(notesCorps, texte.text, texte)
  const notesSansAppel = (bloc.internalNotes ?? []).filter((note) => !appelees.has(note.id))

  const contenu = (
    <>
      {rendreIllustrations(avant)}
      {intitule && (resolu.headingRole === 'title' && resolu.headingLevel ? (
        // Cas mixte : l'intitulé EST un titre — celui de la péricope —, distinct
        // du développement qui le suit. Les deux ne se concatènent jamais.
        <Balise className={classeIntituleTitre(resolu.headingLevel)}>
          {rendreContenuAncre(intitule.titre, [], notesTitre, undefined, varianteIntitule)}
          {intitule.sousTitre && <span className="cs-bible-chapeau">{rendreContenuAncre(intitule.sousTitre, [], notesTitre, undefined, varianteIntitule)}</span>}
        </Balise>
      ) : resolu.kind === 'title' ? (
        <Balise className={classesDuStyle(resolu)[0]}>
          {rendreContenuAncre(intitule.titre, [], notesTitre, undefined, varianteIntitule)}
          {intitule.sousTitre && <span className="cs-bible-chapeau">{rendreContenuAncre(intitule.sousTitre, [], notesTitre, undefined, varianteIntitule)}</span>}
        </Balise>
      ) : (
        // Simple repère interne : jamais une balise de titre, sans quoi il
        // entrerait dans le plan d'accessibilité par la bande.
        <p className="cs-bible-info-label">
          {rendreContenuAncre(intitule.titre, [], notesTitre)}
          {intitule.sousTitre && <span className="cs-bible-chapeau">{rendreContenuAncre(intitule.sousTitre, [], notesTitre)}</span>}
        </p>
      ))}
      {bloc.textBlocks.map((texte, rang) => rendreBlocTexte(
        texte, resolu, notesCorps, bloc.niveauHtml, compositionDuParagraphe(bloc, texte, rang),
      ))}
      {rendreIllustrations(dansLeFlux)}
      {notesSansAppel.length > 0 && (
        <aside
          aria-label="Apparat propre à ce bloc"
          style={{ borderTop: '1px solid var(--cs-bord)', marginTop: '0.75rem', paddingTop: '0.75rem' }}
        >
          {/* ⚠️ La taille du corps se pose ICI et non sur les paragraphes, qui
              portent la leur : elle ne gouverne donc que ce qui se compose en
              relatif — la liste bibliographique. Elle suit le corps du
              paratexte, sans quoi une note passerait devant le commentaire. */}
          <ol style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.78125rem' }}>
            {notesSansAppel.map((note) => (
              <li key={note.id} value={note.displayNumber} style={{ marginBottom: '0.5rem' }}>
                {note.blocks.map((texte) => rendreBlocTexte(
                  texte, undefined, [], undefined, texte.presentationStyle,
                ))}
              </li>
            ))}
          </ol>
        </aside>
      )}
      {rendreIllustrations(apres)}
    </>
  )
  // Le jeton de niveau et le modificateur de nature : deux classes, deux axes.
  const props = {
    className: ['cs-bible-bloc', ...classesDuStyle(resolu)].join(' '),
    'data-semantic-style': resolu.canonique,
    'data-niveau': resolu.level,
    'data-nature': resolu.nature,
    'data-notice-subtype': bloc.noticeSubtype ?? undefined,
    'data-placement': bloc.placement,
    // Le rôle d'affichage déclaré : c'est par lui, et non par une classe
    // devinée du style sémantique, que le thème sait poser un sous-titre de
    // partie sous son titre. Une œuvre qui n'en porte pas n'est pas touchée.
    'data-display-role': bloc.presentation?.displayRole ?? undefined,
  }
  // Une notice et un excursus se tiennent à côté du fil de lecture.
  if (resolu.nature === 'notice' || resolu.nature === 'excursus') {
    return <aside {...props}>{contenu}</aside>
  }
  return <section {...props}>{contenu}</section>
}

export function NotesBibleChapitre({
  notes,
  illustrationsByNote,
  ancresRetour,
}: {
  notes: NoteBibliqueAffichable[]
  illustrationsByNote?: Map<string, IllustrationBibliqueAffichable[]>
  /** Où revient la note quand son appel porte une ancre distinguée par colonne. */
  ancresRetour?: Map<string, string>
}) {
  if (notes.length === 0) return null
  const ordonnees = [...notes].sort((a, b) => a.displayNumber - b.displayNumber)
  return (
    <section
      aria-labelledby="notes-bible-chapitre"
      style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--cs-bord)' }}
    >
      <h2 id="notes-bible-chapitre" className="cs-bible-info-label">
        Notes
      </h2>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {ordonnees.map((note) => (
          <li
            key={note.id}
            id={`note-bible-${note.id}`}
            data-canon-id={note.canonId}
            style={{ display: 'grid', gridTemplateColumns: '2rem minmax(0, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}
          >
            <a
              href={`#${ancresRetour?.get(note.id) ?? ancreAppelNoteBible(note.id)}`}
              aria-label={`Retour à l’appel de la note ${note.displayNumber}`}
              style={{ color: 'var(--cs-texte-faible)', textDecoration: 'none', fontSize: '0.625rem', fontWeight: 600, fontFamily: SERIF, textAlign: 'right', paddingTop: '0.2rem' }}
            >
              {note.displayNumber}.
            </a>
            <div>
              {rendreIllustrations(
                (illustrationsByNote?.get(note.id) ?? [])
                  .filter((illustration) => illustration.placement === 'before'),
              )}
              {note.blocks.map((texte) => rendreBlocTexte(
                texte, undefined, [], undefined, texte.presentationStyle,
              ))}
              {rendreIllustrations(
                (illustrationsByNote?.get(note.id) ?? [])
                  .filter((illustration) => illustration.placement !== 'before'),
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * Une PIÈCE LIMINAIRE lue seule : page de titre, dédicace, avant-propos,
 * introduction générale. Elle remplace le texte biblique à l'écran, comme on
 * ouvre un volume à sa page de garde.
 *
 * ⚠️ Le titre de la pièce est écrit UNE fois, en tête. Les blocs qui le redisent
 * (« Avant-propos — page IX », « Avant-propos — page X ») perdent leur intitulé ;
 * ceux dont la queue titre vraiment (« Introduction générale — § I. Ce qu'est la
 * Bible ») gardent la leur. La règle vit dans `intituleDansPiece`, module pur.
 *
 * ⛔ Une pièce dont la BIBLIOGRAPHIE est structurée — « Du même auteur » et ses
 * quinze ouvrages — ne se compose pas depuis ses blocs matériels : elle se
 * compose depuis les tables d'autorité, par `BibliographieOuvrages`. Les blocs
 * restent en base, témoins de la page imprimée, et ne sont plus la source du
 * texte affiché. ⛔ On ne mêle JAMAIS les deux : ou la liste structurée, ou le
 * repli matériel, et le repli ne joue que si la liste est réellement absente.
 *
 * ⛔ Ce qui décide n'est jamais l'INTITULÉ de la pièce. « Du même auteur »,
 * « Bibliographie », « Ouvrages consultés » nomment des pièces, non des
 * compositions : la liste structurée que la pièce PORTE fait seule la
 * bibliographie, et toutes prennent la même famille de styles. Le titre, lui,
 * garde son rang dans la hiérarchie de l'apparat.
 */
export function PieceLiminaire({
  titre,
  portee,
  blocs,
  illustrationsParBloc,
  bibliographie,
  urlRetour,
  libelleRetour,
}: {
  titre: string
  portee: string | null
  blocs: readonly BlocEditorialBiblique[]
  illustrationsParBloc?: Map<string, IllustrationBibliqueAffichable[]>
  /** La liste d'ouvrages que la pièce porte, lue dans les tables d'autorité. */
  bibliographie?: BibliographiePiece | null
  /** Où revient-on en fermant la pièce : le chapitre qu'on lisait. */
  urlRetour?: string
  libelleRetour?: string
}) {
  const ouvrages = bibliographie?.ouvrages ?? []
  // Dans « Du même auteur », le titre de la pièce établit l'auteur commun : le
  // redire devant chacune des quinze références serait le dire seize fois.
  // Ailleurs, le nom se compose normalement, en petites capitales.
  const auteurDansLaReference = bibliographie === null || bibliographie === undefined
    || !auteurPorteParLeTitreDeLaPiece(bibliographie.pieceKey)
  return (
    <article>
      <header style={{ textAlign: 'center', margin: '0 0 2rem' }}>
        {portee && (
          <p style={{
            fontFamily: 'var(--font-source-sans), Arial, sans-serif',
            fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.09em',
            textTransform: 'uppercase', color: 'var(--cs-texte-gris)', margin: '0 0 0.5rem',
          }}>
            {portee}
          </p>
        )}
        {/* Le rang des titres hauts de l'édition : une pièce liminaire n'est pas
            un chapitre, mais elle ouvre comme lui. ⛔ Pas de balise `h1` : la
            page en porte déjà un, et deux titres de premier rang dans un même
            document défont le plan d'accessibilité. */}
        <h2 className="cs-bible-title--t2" style={{ margin: 0 }}>{titre}</h2>
      </header>
      {ouvrages.length > 0 ? (
        <BibliographieOuvrages ouvrages={ouvrages} avecAuteur={auteurDansLaReference} />
      ) : blocs.map((bloc) => (
        <BlocEditorialBible
          key={bloc.id}
          bloc={{ ...bloc, heading: intituleDansPiece(bloc.heading ?? null, titre) }}
          illustrations={illustrationsParBloc?.get(bloc.id) ?? []}
        />
      ))}
      {/* Le retour se dit EN PIED, là où la lecture finit : en tête, il inviterait
          à repartir avant d'avoir lu. Les flèches de chapitre y ramènent aussi,
          une pièce n'étant pas une manière de lire mais une cible. */}
      {urlRetour && (
        <p style={{ textAlign: 'center', margin: '2.5rem 0 0.5rem' }}>
          <a href={urlRetour} style={{
            fontFamily: 'var(--font-source-serif), Georgia, serif',
            fontSize: '0.8125rem', fontStyle: 'italic', color: 'var(--cs-vert)',
            textDecoration: 'none', borderBottom: '1px solid var(--cs-or-doux)',
            paddingBottom: '1px',
          }}>
            {libelleRetour ?? 'Revenir au texte'}
          </a>
        </p>
      )}
    </article>
  )
}
