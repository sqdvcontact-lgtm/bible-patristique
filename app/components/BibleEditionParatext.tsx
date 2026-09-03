import { Fragment, type CSSProperties, type ReactNode } from 'react'

import { GravureAgrandissable } from './GravureAgrandissable'
import {
  ancreAppelNoteBible,
  type BibleEditionDisplayAsset,
  type BibleEditionDisplayBodyBlock,
  type BibleEditionDisplayInlineSpan,
  type BibleEditionDisplayInternalNote,
  type BibleEditionDisplayNote,
  type BibleEditionDisplayTextBlock,
  type StyleCompositionBloc,
  partIllustration,
  estHabillable,
  estDetouree,
  type IllustrationHabillee,
} from '@/app/lib/bibleEdition'
import { STYLE_CORPS } from '@/app/lib/compositionBible'
import {
  ROLES_SOUS_TITRE,
  classeIntituleTitre,
  classesDuStyle,
  resoudreStyleSemantique,
  diviserIntitule,
  type JetonTitre,
  type NatureBloc,
  type StyleResolu,
} from '@/app/lib/bibleHierarchieSemantique'
import { compositionSousTitre } from '@/app/lib/compositionBible'
import { lignesDeVers, styleLigneDeVers } from '@/app/lib/compositionVers'
import { detecterCitationSortie } from '@/app/lib/citationSortie'
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
  'id' | 'blockKey' | 'semanticStyleCode' | 'semanticLevel' | 'embeddedTitleLevel' | 'rangDuTitre'
  | 'niveauHtml' | 'noticeSubtype' | 'heading' | 'placement'
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
type CompositionParagraphe = StyleCompositionBloc | 'sous-titre'

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

/** Un span coupé en morceaux : ce fragment OUVRE-t-il la locution, la FERME-t-il ?
 *  Les deux sont vrais quand elle tient d'un seul tenant. */
type BornesDuSpan = { ouvre: boolean; ferme: boolean }
const SPAN_ENTIER: BornesDuSpan = { ouvre: true, ferme: true }

function envelopperSpan(
  contenu: ReactNode,
  span: BibleEditionDisplayInlineSpan | undefined,
  key: string,
  bornes: BornesDuSpan = SPAN_ENTIER,
): ReactNode {
  if (!span) return <Fragment key={key}>{contenu}</Fragment>
  const lang = span.language ?? undefined
  // ⛔ Les guillemets français restent en ROMAIN : ils appartiennent au français
  // qui cite, non au latin cité. « *Jesu Christi* », jamais *« Jesu Christi »* —
  // l'italique s'arrête au bord du guillemet, et la langue avec elle.
  //
  // ⛔ Et ils ne se posent qu'UNE fois, aux deux bouts de la locution. Un appel de
  // note tombant en son milieu la coupe en fragments, et chaque fragment reprenait
  // sa paire : « les hommes de » « Dieu » là où l'édition écrit « les hommes de
  // Dieu ». Relevé par l'auteur sur l'Introduction générale, 2026-08-28.
  if (span.rendering === 'quotation_italic') {
    return (
      <span key={key}>
        {bornes.ouvre ? <>«&#8239;</> : null}
        <em lang={lang}>{contenu}</em>
        {bornes.ferme ? <>&#8239;»</> : null}
      </span>
    )
  }
  // Le grec en caractères grecs se compose au fer dans Fillion. La nature
  // `foreign_expression` décrit la langue, pas une italique implicite : les
  // translittérations (`grc-Latn`) et les autres langues gardent, elles, la
  // composition étrangère habituelle.
  if (span.kind === 'foreign_expression' && span.language === 'grc') {
    return <span key={key} lang={lang}>{contenu}</span>
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

// ⛔ La marque du titre PORTÉ par le bloc — celui qui l'ouvre et le nomme —, par
// opposition aux titres qui vivent DANS son flux (ceux que rend la normalisation
// éditoriale). Les deux sortent de la même fonction de classe et se ressemblent à
// s'y méprendre dans le document ; seul l'endroit où ils sont rendus les sépare,
// et c'est ici. La feuille de styles s'en sert pour n'ôter la marge haute qu'au
// premier : le bloc l'espace déjà, quand les autres n'ont qu'elle.
const CLASSE_TITRE_PORTE = 'cs-bible-title--porte'

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
  // ⚠️ Une locution coupée en plusieurs fragments n'ouvre ses guillemets qu'au
  // PREMIER et ne les ferme qu'au DERNIER. On retient donc celles déjà ouvertes ;
  // les fragments se suivent dans l'ordre du texte, un simple ensemble suffit.
  const ouverts = new Set<BibleEditionDisplayInlineSpan>()
  const poser = (
    contenu: ReactNode,
    span: BibleEditionDisplayInlineSpan | undefined,
    key: string,
    ferme: boolean,
  ): ReactNode => {
    if (!span) return envelopperSpan(contenu, span, key)
    const ouvre = !ouverts.has(span)
    if (ouvre) ouverts.add(span)
    return envelopperSpan(contenu, span, key, { ouvre, ferme })
  }
  // Curseur de lecture : la ponctuation emportée par un appel a déjà été rendue,
  // le fragment suivant reprend après elle.
  let rendu = 0
  for (let index = 0; index < ordre.length - 1; index += 1) {
    const start = ordre[index]
    const end = ordre[index + 1]
    const span = spans.find((candidate) => candidate.startOffsetUnicode <= start && candidate.endOffsetUnicode >= end)
    const clot = Boolean(span) && end >= (span?.endOffsetUnicode ?? 0)
    const appelsIci = appels.filter((candidate) => candidate.position === end)
    const brut = text.slice(Math.max(start, rendu), end)
    if (appelsIci.length === 0) {
      if (brut) noeuds.push(poser(rendreTexteEnrichi(brut), span, `run:${start}:${end}`, clot))
      continue
    }
    const [tete, dernierMot] = detacherDernierMot(brut)
    // La locution ne se ferme sur la tête que si aucun dernier mot ne la prolonge.
    if (tete) noeuds.push(poser(rendreTexteEnrichi(tete), span, `run:${start}:${end}`, clot && !dernierMot))
    // La ponctuation ne se prend qu'en texte nu : sous une italique ou une
    // petite capitale, elle appartient à l'enveloppe et n'en sort pas.
    const spanApres = spans.find((candidate) => candidate.startOffsetUnicode <= end && candidate.endOffsetUnicode > end)
    const suite = text.slice(end, ordre[index + 2] ?? text.length)
    const ponctuation = spanApres ? '' : (PONCTUATION_ATTACHEE.exec(suite)?.[0] ?? '')
    rendu = end + ponctuation.length
    noeuds.push(
      <span key={`appels:${end}`} style={NOWRAP}>
        {dernierMot ? poser(rendreTexteEnrichi(dernierMot), span, `mot:${end}`, clot) : null}
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
  // Un sous-titre n'est pas un paragraphe d'introduction : c'est le CHAPEAU de son
  // titre, tombé dans un bloc voisin par l'ordre matériel de la page imprimée. Il se
  // compose donc en italique, et dans l'encre de son titre — une encre plus claire en
  // ferait un commentaire du titre, quand il en est la suite.
  //
  // ⛔ Le CORPS, l'ENCRE et la POSE ne sont pas ici : ils dépendent du RANG du titre,
  // et la feuille les donne par `[data-titre-rang]`. Un style en ligne l'emporterait
  // sur elle, et les 149 sous-titres accrochés à un titre au fer resteraient centrés
  // comme ils l'étaient. Ne rien remettre ici de ce que le rang commande.
  // ⛔ `sous-titre` n'a PAS sa composition ici : elle dépend du rang du TITRE auquel
  // le sous-titre s'accroche, et vit dans `compositionSousTitre`. Cette table est
  // indexée par le seul nom de la composition, elle ne saurait pas la faire varier.
  'sous-titre': {},
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
  rangDuTitre?: string | null,
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
    // Un intertitre d'introduction porte souvent sa DÉSIGNATION puis son objet —
    // « I — Ce qu'est la Bible ». Sur une seule ligne, les deux se lisent sur le
    // même plan, alors que le second est subordonné au premier : ils se composent
    // donc en titre et chapeau, par la règle même qui divise les intitulés de
    // bloc (`diviserIntitule`). ⛔ Sans `genreEnTitre` : l'ordre imprimé fait foi
    // ici, la désignation ouvre et l'objet suit.
    //
    // ⛔ On ne coupe PAS un intertitre qui porte une locution marquée ou un appel
    // de note : leurs offsets pointent dans le texte ENTIER, et couper le texte
    // les déplacerait. Le corpus le permet — sur les 43 intertitres relevés, les
    // 5 qui portent un tiret séparateur n'ont ni span ni appel, et les 3 qui
    // portent un span (« La Loi ou Tôrah ») n'ont pas de tiret.
    const coupable = (bloc.inlineSpans?.length ?? 0) === 0
      && !notes.some((note) => positionAppelDansTexte(bloc.text, note, bloc) !== null)
    const intitule = coupable ? diviserIntitule(bloc.text) : null
    const divise = Boolean(intitule?.sousTitre)
    return (
      <Balise
        key={bloc.id}
        className={[
          bloc.headingLevel ? classeIntituleTitre(bloc.headingLevel) : 'cs-bible-info-label',
          divise ? 'cs-bible-titre--divise' : null,
        ].filter(Boolean).join(' ')}
        data-source-start={bloc.sourceStartOffsetUnicode ?? undefined}
        data-source-end={bloc.sourceEndOffsetUnicode ?? undefined}
        style={{
          // ⛔ L'alignement reconstruit du fac-similé décrivait UNE ligne : « I —
          // Ce qu'est la Bible », composée au fer dans la colonne imprimée. Il ne
          // dit plus rien d'une PAIRE, et l'appliquer laissait un chiffre romain
          // solitaire pendre au bord gauche. La paire retombe donc sur son rang,
          // qui centre T1 à T5 et ne laisse au fer que T6 (globals.css).
          textAlign: divise ? undefined : bloc.presentation?.textAlign,
          fontStyle: bloc.presentation?.fontStyle,
        }}
      >
        {intitule?.sousTitre ? (
          <>
            {rendreTexteEnrichi(intitule.titre)}
            <span className="cs-bible-chapeau">{rendreTexteEnrichi(intitule.sousTitre)}</span>
          </>
        ) : rendreContenuAncre(bloc.text, bloc.inlineSpans, notes, bloc, varianteAppel(bloc.headingLevel))}
      </Balise>
    )
  }

  const discret = bloc.kind === 'reference' || bloc.kind === 'attribution'
  const style: CSSProperties = {
    ...STYLE_CORPS,
    // ⚠️ Le blanc entre deux paragraphes d'un MÊME style : 0,6 rem sous un corps de
    // 12,5 px à l'interligne 1,3 valait plus d'une demi-ligne, et l'apparat s'y égrenait.
    // Deux crans le 29 août 2026, à la demande de l'auteur — 0,6 puis 0,4 —, jusqu'à
    // 0,25 rem : quatre pixels sous une ligne de seize, soit le quart d'une ligne. Fillion
    // enchaîne ses notes, il ne les aère pas. ⛔ En dessous elles se toucheraient, et le
    // blanc cesserait de dire où finit une note.
    margin: discret ? '0.35rem 0 0' : '0 0 0.25rem',
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
    // ⛔ Le sous-titre vient APRÈS tout le reste, et en style EN LIGNE : le
    // paragraphe d'apparat pose déjà son corps, son encre et sa justification ici
    // même, si bien qu'une règle de feuille serait morte.
    ...(composition === 'sous-titre' ? compositionSousTitre(rangDuTitre) : {}),
  }
  const sortie = citationSortieDuParagraphe(bloc, resolu)
  if (sortie) {
    const { avant, citation, spansAvant, spansCitation } = sortie
    // ⚠️ `bloc` n'est PAS passé à `rendreContenuAncre` sur les deux moitiés : ses
    // offsets de source valent pour le paragraphe entier et ne veulent plus rien
    // dire une fois coupé. Les appels de note s'y posent par leur texte d'ancrage,
    // que les soixante-six notes de l'Introduction générale portent toutes.
    return (
      <Fragment key={bloc.id}>
        <p lang={bloc.language ?? undefined} style={style}>
          {rendreContenuAncre(avant, spansAvant, notes)}
        </p>
        {/* Le corps du paratexte se pose sur l'enveloppe, pour que le `0.95em` de
            `.citation-sortie` s'y rapporte : la classe porte la forme, une seule
            fois pour tout le site, et le paragraphe ne la redit pas. */}
        <div style={{ fontSize: STYLE_CORPS.fontSize }}>
          <p
            className="citation-sortie"
            lang={bloc.language ?? undefined}
            data-source-start={bloc.sourceStartOffsetUnicode ?? undefined}
            data-source-end={bloc.sourceEndOffsetUnicode ?? undefined}
            style={{
              fontFamily: STYLE_CORPS.fontFamily,
              lineHeight: STYLE_CORPS.lineHeight,
              color: STYLE_CORPS.color,
              hyphens: 'auto',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
          >
            {rendreContenuAncre(citation, spansCitation, notes)}
          </p>
        </div>
      </Fragment>
    )
  }

  // ── UN PARAGRAPHE EN VERS ───────────────────────────────────────────────────
  //
  // ⛔ Une ligne de vers est une BOÎTE, jamais un fragment en ligne : `text-indent`
  // ne s'applique qu'à la PREMIÈRE ligne d'un bloc, et jamais après un saut forcé.
  // Sans boîte, l'alinéa ne se poserait que sur le premier vers. C'est la règle de
  // `compositionVers.ts`, et l'apparat biblique la partage désormais : le style de la
  // ligne y est le MÊME que dans le corps d'une œuvre.
  //
  // ⚠️ On ne découpe PAS un paragraphe qui porte une locution marquée ou un appel de
  // note : leurs offsets pointent dans le texte ENTIER, et les couper les déplacerait.
  // C'est la même garde que sur l'intertitre divisé et la citation sortie. Un tel
  // paragraphe garde le `pre-line` de son style, qui rend les sauts sans les indenter.
  const lignes = bloc.form === 'verse' ? lignesDeVers(bloc.text) : []
  if (lignes.length > 1 && (bloc.inlineSpans ?? []).length === 0 && !notes.some((note) => positionAppelDansTexte(bloc.text, note, bloc) !== null)) {
    return (
      <div
        key={bloc.id}
        lang={bloc.language ?? undefined}
        className={composition ? `cs-bible-${composition}` : undefined}
        data-source-start={bloc.sourceStartOffsetUnicode ?? undefined}
        data-source-end={bloc.sourceEndOffsetUnicode ?? undefined}
        data-forme="vers"
        style={{ ...style, whiteSpace: 'normal' }}
      >
        {lignes.map((ligne, i) => (
          <span key={`${bloc.id}:vers:${i}`} style={styleLigneDeVers({ rang: 0 })}>{ligne}</span>
        ))}
      </div>
    )
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

/**
 * La CITATION SORTIE d'un paragraphe de paratexte — charte § 3.8, cinquième règle.
 *
 * Une citation longue, annoncée par un deux-points et terminant son paragraphe se
 * détache de la prose : elle perd ses guillemets encadrants et reçoit un retrait
 * des deux côtés. La règle est celle des ŒUVRES (`app/lib/citationSortie.ts`,
 * module pur et testé) et la forme aussi (`.citation-sortie`, dans `globals.css`) :
 * une seule mesure sur le site.
 *
 * ⛔ Réservée aux INTRODUCTIONS et aux APPARATS. C'est là qu'un auteur cite au
 * long — l'Introduction générale de Fillion cite Stolberg sur quatre cent
 * trente-huit signes. Un commentaire de verset, lui, cite en une ligne, et le
 * retrait l'y noierait.
 *
 * ⛔ Et l'on ne sort la citation que si TOUT ce qu'elle porte peut la suivre : une
 * locution marquée à cheval sur la coupure ne se reporte pas, et la perdre en
 * silence vaudrait moins que de laisser la citation au fil du texte.
 */
const NATURES_CITATION_SORTIE = new Set<NatureBloc>(['introduction', 'notice'])

function citationSortieDuParagraphe(bloc: BlocTexteBiblique, resolu?: StyleResolu): {
  avant: string
  citation: string
  spansAvant: BibleEditionDisplayInlineSpan[]
  spansCitation: BibleEditionDisplayInlineSpan[]
} | null {
  if (bloc.kind !== 'commentary' || bloc.form !== 'prose') return null
  if (!resolu || !NATURES_CITATION_SORTIE.has(resolu.nature)) return null
  const sortie = detecterCitationSortie(bloc.text)
  if (!sortie) return null
  const spans = bloc.inlineSpans ?? []
  if (spans.length === 0) return { ...sortie, spansAvant: [], spansCitation: [] }
  const debut = sortie.debutCitation
  if (debut === null) return null
  const fin = debut + sortie.citation.length
  const dansLAnnonce = (s: BibleEditionDisplayInlineSpan) => s.endOffsetUnicode <= debut
  const dansLaCitation = (s: BibleEditionDisplayInlineSpan) =>
    s.startOffsetUnicode >= debut && s.endOffsetUnicode <= fin
  if (!spans.every((s) => dansLAnnonce(s) || dansLaCitation(s))) return null
  return {
    ...sortie,
    spansAvant: spans.filter(dansLAnnonce),
    spansCitation: spans.filter(dansLaCitation).map((s) => ({
      ...s,
      startOffsetUnicode: s.startOffsetUnicode - debut,
      endOffsetUnicode: s.endOffsetUnicode - debut,
    })),
  }
}

/**
 * UNE ILLUSTRATION SE COMPOSE SELON SON RÉGIME — charte, « Les gravures de Fillion ».
 *
 * ⛔ Une seule composition servait les quarante-trois, à `min(fichier, 760 px)`,
 * centrée et sans traitement de thème : un boisseau romain de trois centimètres
 * y prenait la mesure d'une planche double page, et le Cuir recevait une dalle
 * blanche. Trois régimes désormais, et la largeur imprimée les départage.
 *
 * ⛔ LE FICHIER NE S'AFFICHE PAS, IL DÉCOUPE. Les gravures détourées portent leur
 * dessin dans la couche ALPHA, et la couleur se repose au rendu (charte : « le
 * détourage ne sert que l'ALPHA : la couleur, on la repose »). C'est ce qui les
 * fait paraître en encre sombre sur le papier et en encre claire sur le cuir,
 * avec un seul fichier et sans filtre d'inversion. Une PLANCHE, elle, garde son
 * papier de 1923 et se rend en image.
 */
export function IllustrationBible({ illustration, habillage }: {
  illustration: IllustrationBibliqueAffichable
  /** Le commentaire contourne la vignette. ⚠️ N'a de sens que DANS un bloc de
   *  prose : posée sur son propre axe, une illustration n'a rien à habiller. */
  habillage?: boolean
}) {
  const regime = illustration.regime
  const part = partIllustration(regime, illustration.largeurImprimee)
  const detouree = estDetouree(regime)
  // ⛔ Une vignette trop large ne peut pas être habillée : il ne resterait pas
  //    deux cents pixels de texte à côté d'elle. Elle se centre alors.
  const flotte = habillage === true && regime === 'vignette' && estHabillable(part)

  // ⛔ ELLE FLOTTE À DROITE, et seulement à droite : la colonne de gauche
  //    appartient au repère du commentaire. Voir `IllustrationHabillee`.
  const cadre: CSSProperties = {
    width: `${Math.round(part * 100)}%`,
    maxWidth: `${illustration.width}px`,
    margin: flotte ? '0.15rem 0 0.55rem 1.1rem' : '1.25rem auto',
    float: flotte ? 'right' : undefined,
    textAlign: 'center',
  }

  // ── Le NOM de la figure (2026-09-02) ──────────────────────────────────────
  // La légende visible nomme la figure : c'est elle que porte `aria-labelledby`,
  // et le texte alternatif ne la répète plus (un lecteur d'écran l'entendait deux
  // fois). Il ne reste sur l'image que s'il en dit PLUS qu'elle, c'est-à-dire
  // s'il décrit la scène. Sans légende, il reprend son office.
  const idLegende = `legende-${illustration.assetKey}`
  const altDistinct = illustration.altText && illustration.altText !== illustration.caption ? illustration.altText : ''
  // Un texte alternatif qui DÉCRIT (« Un souverain assis regarde… ») reste le nom
  // de l'image, et la légende la décrit en second ; un texte alternatif qui ne
  // fait que répéter la légende s'efface, et la légende nomme.
  const lien = illustration.caption
    ? (altDistinct ? { 'aria-describedby': idLegende } : { 'aria-labelledby': idLegende })
    : {}
  const nom = { ...lien, ...(altDistinct || !illustration.caption ? { 'aria-label': altDistinct || illustration.altText } : {}) }
  const nomDuBouton = illustration.altText || illustration.caption || ''
  const masque = `url("${illustration.url}")`
  // ⛔ AGRANDIE, UNE VIGNETTE NE DÉPASSE JAMAIS SA TAILLE DE FICHIER : le fichier
  //    fait 1,7 fois la taille d'affichage, l'agrandissement est donc modeste, et
  //    c'est voulu — on ne montre pas en grand une image dont la définition ne
  //    le justifie pas (décision de l'auteur, 2026-09-02).
  const encre = (largeur: string, plafond?: string) => (
    <span
      className="cs-bible-gravure-encre"
      role="img"
      {...nom}
      style={{
        display: 'block',
        width: largeur,
        maxWidth: plafond,
        maxHeight: plafond ? '78vh' : undefined,
        margin: plafond ? '0 auto' : undefined,
        aspectRatio: `${illustration.width} / ${illustration.height}`,
        WebkitMaskImage: masque,
        maskImage: masque,
      }}
    />
  )

  return (
    <figure
      data-asset-key={illustration.assetKey}
      data-asset-kind={illustration.assetKind}
      data-placement={illustration.placement}
      data-regime={regime}
      className={`cs-bible-gravure cs-bible-gravure--${regime}${flotte ? ' cs-bible-gravure--flottante' : ''}`}
      style={cadre}
    >
      {detouree ? (
        // ⚠️ Le masque se charge d'emblée : une image de masque CSS ne connaît pas
        //    le chargement différé, et un différé par script laisserait la vignette
        //    vide au premier écran le temps de l'hydratation. Elles pèsent 30 à
        //    55 Ko, trois par chapitre au plus : le différé n'y gagnerait rien.
        <GravureAgrandissable
          alt={nomDuBouton}
          legende={illustration.caption}
          enfant={encre('100%')}
          agrandi={encre('100%', `${illustration.width}px`)}
        />
      ) : (
        // ⛔ Une PHOTOGRAVURE et une PLANCHE gardent leur papier : elles sont
        //    opaques, et le thème ne les retourne pas. La première est rognée au
        //    filet gravé et prend le filet du site ; la seconde son passe-partout.
        <GravureAgrandissable
          alt={nomDuBouton}
          legende={illustration.caption}
          enfant={(
            <span className={regime === 'au-fil' ? 'cs-bible-gravure-cadre' : 'cs-bible-gravure-passe'}>
              {/* Chargement DIFFÉRÉ, natif : une planche pèse 200 à 300 Ko et vit
                  souvent trois écrans plus bas. `width` et `height` sont posés, la
                  place est réservée avant que l'image n'arrive. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={illustration.url}
                alt={altDistinct}
                {...lien}
                width={illustration.width}
                height={illustration.height}
                loading="lazy"
                decoding="async"
                style={{ display: 'block', width: '100%', height: 'auto' }}
              />
            </span>
          )}
          agrandi={(
            /* ⛔ Deux MAXIMA, aucune dimension posée : le navigateur les applique
               l'un après l'autre en tenant le rapport. Une largeur posée, plus un
               plafond de hauteur, écraserait la planche (charte, § Responsive). */
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={illustration.url}
              alt={altDistinct}
              {...lien}
              style={{
                display: 'block', margin: '0 auto',
                maxWidth: `min(100%, ${illustration.width}px)`,
                maxHeight: '78vh', width: 'auto', height: 'auto',
              }}
            />
          )}
        />
      )}
      {/* La légende suit le corps du paratexte : plus grosse que le commentaire,
          elle passerait devant le texte qu'elle accompagne. */}
      {illustration.caption && (
        <figcaption id={idLegende} style={{ marginTop: '0.5rem', fontFamily: SERIF, fontStyle: 'italic', color: 'var(--cs-texte-second)', fontSize: flotte ? '0.6875rem' : '0.78125rem', lineHeight: 1.3 }}>
          {illustration.caption}
        </figcaption>
      )}
    </figure>
  )
}

function rendreIllustrations(
  illustrations: readonly IllustrationBibliqueAffichable[],
  habillage = false,
) {
  return illustrations.map((illustration) => (
    <IllustrationBible key={illustration.id} illustration={illustration} habillage={habillage} />
  ))
}

/** Les vignettes fondues dans ce bloc par la composition, chacune de son côté.
 *  ⚠️ Distinctes de celles que la DONNÉE pose dans le flux (`placement: inline`) :
 *  celles-ci sont ancrées sur un verset, et c'est la page qui les y fond. */
function rendreHabillage(vignettes: readonly IllustrationHabillee[]) {
  return vignettes.map(({ illustration }) => (
    <IllustrationBible key={illustration.id} illustration={illustration} habillage />
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
  // ⚠️ `part_subtitle` et `section_subtitle` sont les noms HÉRITÉS de `sous_titre` :
  // ils prétendaient dire dans le rôle un rang que le rôle ne sait pas dire.
  if (ROLES_SOUS_TITRE.has(bloc.presentation.displayRole ?? '')) return 'sous-titre'
  if (rang === 0) return bloc.presentation.leadingParagraphStyle
  return null
}

export function BlocEditorialBible({
  bloc,
  illustrations = [],
  habillage = [],
  suite = false,
}: {
  bloc: BlocEditorialBiblique
  illustrations?: IllustrationBibliqueAffichable[]
  /** Vignettes ancrées sur un verset que la page fond dans ce commentaire. */
  habillage?: readonly IllustrationHabillee[]
  /** Le bloc CONTINUE le précédent — même rang, même nature, sans intitulé — et
   *  ne rouvre pas le blanc de son rang (`estSuiteDuBloc`, § 35.17.5). Décidé par
   *  l'appelant, qui seul connaît le bloc d'avant. */
  suite?: boolean
}) {
  const avant = illustrations.filter((illustration) => illustration.placement === 'before')
  const dansLeFlux = illustrations.filter((illustration) => illustration.placement === 'inline')
  const apres = illustrations.filter((illustration) => illustration.placement === 'after')

  // Le registre décide, et lui seul. Un style qu'il ignore n'est PAS aplati en
  // paragraphe générique : il n'est pas rendu, et l'administration le signale.
  // ⚠️ Le rang DÉCLARÉ n'est lu que par les codes canoniques : un nom hérité porte
  // le sien dans son propre nom, et `resoudreStyleSemantique` lui donne la priorité.
  // Sans ce report, la base accepterait un bloc — `commentaire` + I5 — que le rendu
  // refuserait, ce qui est exactement ce que son verrou existe pour empêcher.
  const resolu = resoudreStyleSemantique(bloc.semanticStyleCode, {
    niveau: bloc.semanticLevel, titre: bloc.embeddedTitleLevel,
  })
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
        <Balise className={classeIntituleTitre(resolu.headingLevel) + ' ' + CLASSE_TITRE_PORTE}>
          {rendreContenuAncre(intitule.titre, [], notesTitre, undefined, varianteIntitule)}
          {intitule.sousTitre && <span className="cs-bible-chapeau">{rendreContenuAncre(intitule.sousTitre, [], notesTitre, undefined, varianteIntitule)}</span>}
        </Balise>
      ) : resolu.kind === 'title' ? (
        <Balise className={classesDuStyle(resolu)[0] + ' ' + CLASSE_TITRE_PORTE}>
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
      {/* ⛔ Le flottant vient AVANT le texte qu'il doit faire contourner : posé
          après, il n'a plus rien à habiller. Le bloc le CONTIENT par
          `display: flow-root`, sans quoi il déborderait sur le titre suivant. */}
      {rendreIllustrations(dansLeFlux, true)}
      {rendreHabillage(habillage)}
      {bloc.textBlocks.map((texte, rang) => rendreBlocTexte(
        texte, resolu, notesCorps, bloc.niveauHtml, compositionDuParagraphe(bloc, texte, rang),
        bloc.rangDuTitre,
      ))}
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
    // ⚠️ Le rang du TITRE auquel un sous-titre s'accroche : c'est par lui, et par
    // rien d'autre, que la feuille lui donne la pose de son titre — centrée sous
    // un titre centré, au fer sous un titre au fer.
    'data-titre-rang': bloc.rangDuTitre ?? undefined,
    // Un bloc de SUITE : la feuille lui retire sa marge haute, et sa marge basse
    // au bloc qui le précède. L'attribut est vide : c'est un drapeau.
    'data-suite': suite ? '' : undefined,
  }
  // Une notice se tient à côté du fil de lecture. ⚠️ `excursus` figurait ici : le
  // regroupement du 29 août 2026 l'a fondu dans `notice`, dont il ne se distinguait
  // par rien — même corps, même aparté. La branche est donc devenue inatteignable.
  if (resolu.nature === 'notice') {
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
    // `cs-bible-piece` : la pièce lue SEULE. C'est par cette classe que la feuille
    // rend à l'introduction la mesure de sa page — voir globals.css. Une même
    // introduction posée dans le fil d'un chapitre garde, elle, son retrait.
    <article className="cs-bible-piece">
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