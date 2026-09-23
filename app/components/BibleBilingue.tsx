// Lecture « Latin & Français » d'une édition biblique commentée.
//
// Deux colonnes sur grand écran, empilées par verset sur mobile, synchronisées
// par l'axe canonique. Ce qui appartient à l'ensemble éditorial — introductions,
// commentaires de péricope, conclusions — se rend HORS DES COLONNES et une seule
// fois : le dupliquer dans chaque langue ferait lire deux fois le même
// commentaire. Un bloc propre à une langue sort LUI AUSSI des colonnes : les
// commentaires de Fillion n’ont pas d’équivalent latin, et les enfermer dans une
// colonne laissait en face un vide de leur hauteur.
//
// ⛔ MAIS PAS SUR TOUTE LEUR LARGEUR (2026-09-03, décision de l'auteur revenant sur
// celle du 20 août : « toute la largeur, c'est trop, pas naturel pour un corps de
// texte ; il faut, pour ces styles-là, réduire la largeur maximale »). Mesuré sur
// un écran de 2 560 px, le paragraphe d'introduction de la Genèse faisait 124
// signes par ligne sur les 52 rem des deux colonnes, contre 83 sur les 31,25 rem
// de la lecture simple. L'appareil a d'abord pris cette mesure-là ; puis, devant
// le résultat, le même jour : « les versets dépassent trop ; élargir le corps du
// texte, et réduire la largeur des versets bibliques, harmonieusement ». La règle
// est désormais celle de la lecture simple, où LE RETRAIT DÉSIGNE LE VERSET : les
// versets prennent la mesure de la PAGE (`LectureBilingueBible`), et l'appareil est
// bordé par le fer de leur TEXTE — les numéros pendent dans la marge, et la page
// n'a qu'un fer. Mesuré : versets 1 144 → 853 px, appareil 688 → 768. Voir
// `surMesure`.
//
// ⚠️ Une illustration matériellement attachée à un bloc ou à une note suit CE
// bloc ou CETTE note, quel que soit le membre à qui elle appartient : la charte
// veut que l'image d'une note reste dans sa note. Les trois index sont donc
// fusionnés, à la différence des ancres de verset, qui restent par colonne.
//
// Le composant ne décide de rien : la répartition, l'appariement et l'indexation
// viennent de modules purs et testés.

import { Fragment, useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { activerAuClavier } from '@/app/lib/activerAuClavier'
import { cesurerSelonLangue } from '@/app/lib/langueBible'
import { copierSansCesures } from '@/app/lib/grec'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { fondreAppelsDansLaMarque, marquerLacunesDuTemoin, rendreMarqueurs899 } from '@/app/lib/marqueurs899'
import { estTraductionModerne899, TRAD_ID_BIBLE899 } from '@/app/lib/bible899'
import { STYLE_BOUTON_ACTION } from '@/app/lib/celluleActions'
import IconeCopier from './IconeCopier'
import IconeSignet from './IconeSignet'
import { libelleNumeroVerset } from '@/app/lib/libelleVerset'
import { nomLangue } from '@/app/lib/bibleModesAlternatifs'
import { avecHoteEclat, EclatCopie, useEclatCopie } from './EclatCopie'
import { EclatEchec, STYLE_HOTE_ECHEC, useEclatEchec } from './EclatEchec'

import {
  indexerBlocsDeCorps,
  indexerIllustrations,
  type BibleEditionAssetIndex,
  type BibleEditionBodyBlockIndex,
  type BibleEditionDisplayAsset,
  type BibleEditionDisplayBodyBlock,
} from '@/app/lib/bibleEdition'
import {
  appelsDeLaCellule,
  apparierRangees,
  cleDeCelluleBilingue,
  colonnesBilingues,
  gloseSansVisAVis,
  numeroCanonique,
  rangeesNonVides,
  referenceCanoniqueLisible,
  referenceNativeLisible,
  repartirBlocsDeCorps,
  repartirIllustrations,
  notesDuChapitreBilingue,
  type ColonneBilingue,
  type MembreBilingue,
  type NoteBilingue,
} from '@/app/lib/bibleEditionBilingue'
import {
  CORPS_GLOSE, CORPS_LECTURE_BIBLE, INTERLIGNE_LECTURE_BIBLE, LIBELLE_GLOSE, RAPPORT_ORIGINAL_EN_REGARD, STYLE_VERSET_VIDE,
} from '@/app/lib/compositionBible'
import AppelNoteBiblique from './NoteBibliqueFenetre'
import { rendreTexteAvecAppels, repartirAppels } from '@/app/lib/ancresAppelsBible'
import { separateurAppels, styleSeparateurAppels } from '@/app/lib/appelsDeNote'
import { estSuiteDuBloc } from '@/app/lib/bibleHierarchieSemantique'
import {
  BlocEditorialBible,
  figuresDeLaNote,
  IllustrationBible,
} from './BibleEditionParatext'

// Le bouton de copie d'une cellule ne paraît qu'au survol de sa rangée, au foyer, ou
// sur un écran sans survol. ⚠️ Son opacité est posée en ligne : la feuille la bat par
// « !important », comme les actions d'un verset en lecture simple.
const FEUILLE_COPIE_REGARD = '[data-canon-id]:hover .cs-regard-action, [data-canon-id]:focus-within .cs-regard-action { opacity: 1 !important; } @media (hover: none) { .cs-regard-action { opacity: 1 !important; } }'

// ⛔ LE SIGNET D'UN VERSET PRÉLEVÉ, à gauche de son numéro, comme en lecture simple
// (`STYLE_SIGNET_VERSET`) : l'état se dit sur la ligne, il ne pèse pas sur la gouttière
// d'actions, et il paraît même quand la souris est ailleurs.
const STYLE_SIGNET_REGARD = {
  display: 'inline-block' as const,
  width: '0.5em',
  height: '0.65em',
  marginRight: '0.2em',
  color: 'var(--cs-texte-doux)',
  verticalAlign: 'baseline' as const,
}

const SERIF = 'var(--font-source-serif), Georgia, serif'

// Composition des deux colonnes, reprise de la lecture bilingue des œuvres.
//
// Le FRANÇAIS garde la composition d’un verset de la page Bible. Le LATIN se
// tient en regard : sans empattements, un peu plus petit, et d’une encre
// grise — c’est le change de caractère qui sépare les deux colonnes, mieux
// qu’un filet. Même encre et même chasse que la colonne originale d’une œuvre.
//
// Le texte est RESSERRÉ dans la LIGNE — interligne court — mais les versets
// respirent ENTRE eux : trop serrés, ils formaient un pavé où l'œil se perdait.
// ⚠️ Le corps et l'interligne suivent le réglage « Taille du texte » du lecteur
// (compositionBible.ts, CORPS_LECTURE_BIBLE), comme la lecture simple.
const STYLE_VERSET = {
  fontFamily: SERIF,
  fontSize: CORPS_LECTURE_BIBLE,
  lineHeight: INTERLIGNE_LECTURE_BIBLE,
  color: 'var(--cs-texte-fort)',
  textAlign: 'justify' as const,
  hyphens: 'auto' as const,
  overflowWrap: 'break-word' as const,
  margin: '0 0 0.4rem',
}

// L’encre de la colonne originale des œuvres, reprise telle quelle pour que
// les deux lectures en regard du site se ressemblent.
const STYLE_VERSET_ORIGINAL = {
  ...STYLE_VERSET,
  fontFamily: 'var(--font-source-sans), Arial, sans-serif',
  fontSize: `calc(${CORPS_LECTURE_BIBLE} * ${RAPPORT_ORIGINAL_EN_REGARD})`,
  color: 'var(--cs-original)',
  wordSpacing: '-0.025em',
}

// ⛔ UNE GLOSE — italique, un point sous le texte de SA colonne (décision de l'auteur,
// 2026-09-11). Les corps viennent de `compositionBible.ts`, que la lecture simple lit
// aussi : un corps recopié divergerait au premier réglage.
const STYLE_GLOSE = { ...STYLE_VERSET, fontSize: CORPS_GLOSE.sousVerset, fontStyle: 'italic' as const }
const STYLE_GLOSE_ORIGINAL = {
  ...STYLE_VERSET_ORIGINAL,
  fontSize: CORPS_GLOSE.sousOriginal,
  fontStyle: 'italic' as const,
}

// La référence occupe sa propre colonne, étroite et alignée à droite, comme le
// numéro de verset de la page Bible. Sans cela, chaque ligne commençait après
// une référence de longueur variable et les deux colonnes ne s’alignaient pas.
// ⚠️ La colonne et sa gouttière sont NOMMÉES dans globals.css (`--regard-numero`,
// `--regard-numero-gouttiere`) : c'est d'elles que la feuille déduit la mesure de
// l'appareil, bordé par le fer du texte des versets (voir `surMesure`). Une seule
// écriture, sans quoi les deux fers se séparent au premier réglage. ⚠️ La colonne
// reste `auto` : un numéro plus large qu'elle (« 27, 58 », « 150, 6 ») pousse le
// texte de sa rangée de quelques pixels plutôt que de se couper.
const STYLE_LIGNE_VERSET = {
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  columnGap: 'var(--regard-numero-gouttiere)',
  alignItems: 'baseline' as const,
}

const STYLE_REFERENCE = {
  minWidth: 'var(--regard-numero)',
  textAlign: 'right' as const,
  fontSize: '0.6875rem',
  fontWeight: 600,
  color: 'var(--cs-texte-gris)',
  whiteSpace: 'nowrap' as const,
}

type Appartenance = { appliesTo: 'family' | 'member'; appliesToMemberId: string | null }
type BlocBilingue = BibleEditionDisplayBodyBlock & Appartenance
type IllustrationBilingue = BibleEditionDisplayAsset & Appartenance

export type LectureBilingueProps = {
  membres: readonly MembreBilingue[]
  /** Rangs de titre que l'édition ne rend pas (réglage d'administration). */
  titresMasques?: readonly string[]
  colonnes: readonly ColonneBilingue[]
  /** Créneaux canoniques du chapitre, dans l'ordre : c'est l'axe d'alignement. */
  axeCanonique: readonly string[]
  blocs?: readonly BlocBilingue[]
  notes?: readonly NoteBilingue[]
  illustrations?: readonly IllustrationBilingue[]
  /** Le créneau canonique retenu, s'il en est un. Voir `onSelectionnerVerset`. */
  canonSelectionne?: string | null
  /** Cliquer une rangée ouvre l'apparat patristique de son créneau canonique.
   *  Absent, la lecture n'est pas cliquable et ne porte aucune marque de survol. */
  onSelectionnerVerset?: (canonId: string) => void
  /** Copier le verset d'UNE colonne, par sa clé de cellule (`cleDeCelluleBilingue`). Présent,
   *  chaque cellule qui porte un texte offre au survol un bouton de copie (bureau seul). */
  copierCellule?: (cle: string) => Promise<void>
  /** L'identifiant du prélèvement d'un créneau, ou `null` s'il n'est pas prélevé. Présent
   *  avec `basculerPrelevement`, chaque cellule qui porte un texte offre son signet, et le
   *  numéro DIT l'état à qui ne voit pas la page. */
  prelevementDe?: (canonId: string) => string | null
  /** Prélever ou retirer le verset d'UNE colonne, par sa clé de cellule
   *  (`cleDeCelluleBilingue`) : c'est elle qui dit quel texte et quelle bible on met de
   *  côté, comme pour la copie. */
  basculerPrelevement?: (cle: string) => Promise<void>
  mobile?: boolean
}

type ApparatColonne = {
  blocs: BibleEditionBodyBlockIndex
  images: BibleEditionAssetIndex
}

// ── LA COPIE D'UNE COLONNE (audit du 2026-09-22) ──────────────────────────────
// La lecture en regard n'avait aucun moyen de copier un verset hors du lasso. Un seul
// bouton par cellule, au survol de la rangée, posé HORS du texte : dans la gouttière entre
// les deux colonnes, ou à droite de la dernière. ⛔ Il n'est pas cliquable au travers : le
// clic s'arrête là, et ne retient pas le verset.
function CopieCellule({ copier, numero, langue, derniere, rang }: {
  copier: () => Promise<void>
  numero: number | null
  langue: string
  derniere: boolean
  /** Le rang du bouton dans la gouttière : 0 quand il y est seul, 1 sous le signet. */
  rang: number
}) {
  const { copie, eclat, briller } = useEclatCopie()
  const { echec, signaler } = useEclatEchec()
  const objet = numero === null ? 'ce verset' : `le verset ${numero}`
  return (
    <button
      type="button"
      className={avecHoteEclat('cs-regard-copier cs-regard-action')}
      onClick={(e) => {
        e.stopPropagation()
        copier().then(briller, (erreur: unknown) => {
          console.error('[copie] verset en regard', erreur)
          signaler('La copie a échoué.')
        })
      }}
      title={echec ? 'La copie a échoué' : `Copier ${objet} (${langue.toLowerCase()})`}
      aria-label={`Copier ${objet} (${langue.toLowerCase()})`}
      style={{
        ...STYLE_BOUTON_ACTION,
        position: 'absolute',
        top: rang === 0 ? '0.15rem' : `calc(0.15rem + ${STYLE_BOUTON_ACTION.height})`,
        left: derniere ? 'calc(100% + 0.3rem)' : `calc(100% + 0.55rem - ${STYLE_BOUTON_ACTION.width} / 2)`,
        opacity: 0,
        color: echec ? 'var(--cs-danger)' : copie ? 'var(--cs-vert)' : 'var(--cs-bord)',
        ...(echec ? STYLE_HOTE_ECHEC : null),
      }}
    >
      <IconeCopier />
      {echec ? <EclatEchec echec={echec} /> : <EclatCopie eclat={eclat} />}
    </button>
  )
}

// ── LE PRÉLÈVEMENT D'UNE CELLULE (audit du 2026-09-22) ────────────────────────
// La lecture en regard n'offrait AUCUN geste par verset — ni signet, ni copie — quand la
// lecture simple en porte quatre. Le signet est le jumeau du bouton de copie : même
// gabarit, même gouttière, rangé au-dessus de lui.
function SignetCellule({ basculer, preleve, numero, derniere }: {
  basculer: () => Promise<void>
  preleve: boolean
  numero: number | null
  derniere: boolean
}) {
  const [attente, setAttente] = useState(false)
  const { echec, signaler } = useEclatEchec()
  const objet = numero === null ? 'ce verset' : `le verset ${numero}`
  const geste = preleve ? `Retirer ${objet} de mes prélèvements` : `Ajouter ${objet} à mes prélèvements`
  return (
    <button
      type="button"
      className={avecHoteEclat('cs-regard-action')}
      disabled={attente}
      onClick={(e) => {
        e.stopPropagation()
        setAttente(true)
        basculer().then(
          () => setAttente(false),
          (erreur: unknown) => {
            setAttente(false)
            console.error('[prélèvements] verset en regard', erreur)
            signaler(preleve ? 'Le retrait a échoué. Réessayez.' : 'Le prélèvement a échoué. Réessayez.')
          },
        )
      }}
      title={echec ? 'Le geste a échoué' : geste}
      aria-label={geste}
      style={{
        ...STYLE_BOUTON_ACTION,
        position: 'absolute',
        top: '0.15rem',
        left: derniere ? 'calc(100% + 0.3rem)' : `calc(100% + 0.55rem - ${STYLE_BOUTON_ACTION.width} / 2)`,
        opacity: 0,
        color: echec ? 'var(--cs-danger)' : preleve ? 'var(--cs-texte-doux)' : 'var(--cs-bord)',
        ...(echec ? STYLE_HOTE_ECHEC : null),
      }}
    >
      {attente ? '…' : <IconeSignet plein={preleve} />}
      <EclatEchec echec={echec} />
    </button>
  )
}

// Une liste vide STABLE : un `= []` en défaut de paramètre en ferait une neuve à chaque
// rendu, et les mémoires ci-dessous se recalculeraient toujours.
const AUCUN: readonly never[] = []

export default function BibleBilingue({
  membres,
  colonnes,
  axeCanonique,
  blocs = AUCUN,
  notes = AUCUN,
  illustrations = AUCUN,
  canonSelectionne = null,
  onSelectionnerVerset,
  copierCellule,
  prelevementDe,
  basculerPrelevement,
  mobile = false,
  titresMasques,
}: LectureBilingueProps): ReactNode {
  // ⚠️ MÉMORISÉS (audit du 2026-09-22) : la répartition, les index, l'appariement et les
  // notes retenues ne dépendent que de la matière du chapitre et de l'écran. Ils étaient
  // recalculés à chaque rendu, donc à chaque verset retenu.
  const ordre = useMemo(() => colonnesBilingues(membres, mobile ? 'mobile' : 'desktop'), [membres, mobile])
  const colonnesOrdonnees = useMemo(() => ordre
    .map((membre) => colonnes.find((colonne) => colonne.membre.id === membre.id))
    .filter((colonne): colonne is ColonneBilingue => colonne !== undefined), [ordre, colonnes])

  const notesRetenues = useMemo(() => notesDuChapitreBilingue(notes, ordre), [notes, ordre])

  // ⛔ Un bloc du corps IGNORE les colonnes, qu'il soit commun à l'édition ou
  // propre à une langue. Les introductions et les commentaires de Fillion n’ont
  // pas d’équivalent latin : les enfermer dans la colonne française laissait en
  // face une colonne vide de la hauteur du commentaire. Ils sortent donc des
  // colonnes, et l’appartenance reste une donnée de provenance, non une
  // consigne de mise en page. ⚠️ Ils ne prennent pas pour autant toute la
  // largeur des colonnes : voir `surMesure`, plus bas.
  const commun: ApparatColonne = useMemo(() => {
    const blocsRepartis = repartirBlocsDeCorps(blocs, ordre)
    const illustrationsReparties = repartirIllustrations(illustrations, ordre)
    return {
      blocs: indexerBlocsDeCorps([
        ...blocsRepartis.communs,
        ...[...blocsRepartis.parMembre.values()].flat(),
      ]),
      images: indexerIllustrations([
        ...illustrationsReparties.communs,
        ...[...illustrationsReparties.parMembre.values()].flat(),
      ]),
    }
  }, [blocs, illustrations, ordre])
  const imagesParBloc = commun.images.byBodyBlock
  const imagesParNote = commun.images.byNote

  // ⛔ UNE NOTE DE VERSET NE SE LIT QU'À SON APPEL (décision de l'auteur, 13 septembre
  // 2026 : « il ne faut pas que les notes de bas de page existent »). La série du bas de
  // chapitre est retirée, et avec elle le lien qui y revenait : chaque cellule appelle ses
  // notes par `appelsDeLaCellule`, et une rangée qui porte une note ne se retire pas.
  const rangees = useMemo(() => rangeesNonVides(
    apparierRangees(axeCanonique, colonnesOrdonnees),
    new Set(notesRetenues.map((note) => note.canonId)),
  ), [axeCanonique, colonnesOrdonnees, notesRetenues])
  // L'image qu'une note porte suit sa fenêtre (`figuresDeLaNote`).
  const appeler = (appels: readonly NoteBilingue[], memberId: string) => appels.map((note) => (
    <AppelNoteBiblique
      key={`${memberId}:${note.id}`}
      note={note}
      memberId={memberId}
      figures={figuresDeLaNote(imagesParNote.get(note.id))}
    />
  ))
  // Les appels posés à une même ancre se lisent « 2 & 3 », comme partout (charte § 13.7).
  const appelerEnSuite = (appels: readonly NoteBilingue[], memberId: string) => appels.map((note, rang) => (
    <Fragment key={`${memberId}:${note.id}`}>
      {rang > 0 && <span style={styleSeparateurAppels()}>{separateurAppels(rang, appels.length)}</span>}
      <AppelNoteBiblique note={note} memberId={memberId} figures={figuresDeLaNote(imagesParNote.get(note.id))} />
    </Fragment>
  ))

  // ── L'appareil est bordé par le fer des versets ─────────────────────────────
  // ⛔ Hors des colonnes, mais PAS sur toute leur largeur (décisions de l'auteur,
  // 2026-09-03 — voir l'en-tête). La mesure vaut la page moins, de chaque côté, la
  // colonne du numéro et sa gouttière, centrée sur l'axe : son fer est celui du
  // TEXTE des versets, les numéros pendent dans la marge. C'est le pendant de
  // l'axe de texte de la lecture simple (`surAxeTexte`, TexteBible), où le retrait
  // du numéro désigne déjà le verset.
  // ⛔ UN BLOC LA PORTE LUI-MÊME (`[data-lecture='bilingue'] .cs-bible-bloc`,
  // globals.css), il n'est PAS enveloppé : les blocs restent FRÈRES dans la boîte
  // de leur créneau, et ce sont les règles de voisinage de la mesure étroite —
  // « ce qui suit un titre lui appartient », « deux titres ne s'ouvrent pas deux
  // fois » — qui font leurs blancs, comme depuis toujours en regard. Le 2026-09-03,
  // une enveloppe posée autour de chaque bloc les a coupées en silence : sous
  // « 1. Le premier jour » le blanc est passé de 0,5 à 1,5 rem, sous « 2. L'œuvre
  // des six jours » de 2,25 à 4 (relevé de l'auteur le soir même). Une enveloppe
  // est une surface de plus, et une règle de blanc ne la connaît pas.
  // ⚠️ Une GRAVURE, elle, prend l'enveloppe `.cs-bible-regard` : sa part se calcule sur
  // son conteneur, et sur 52 rem une planche hors-texte dépassait la taille de son
  // fichier ; aucune règle de voisinage ne la nomme, l'enveloppe n'y coupe rien. ⛔ Pas
  // sur mobile : les colonnes y sont empilées à la largeur de l'écran, et rien n'y est
  // borné.
  const surMesure = (contenu: ReactNode, cle: string) => mobile ? contenu : (
    <div key={cle} className="cs-bible-regard">{contenu}</div>
  )

  // Un bloc de SUITE — le paragraphe suivant d'un même développement, que la
  // donnée a coupé en blocs — ne rouvre pas le blanc de son rang (`estSuiteDuBloc`).
  const rendreBlocs = (liste: readonly BibleEditionDisplayBodyBlock[]) => liste.map((bloc, i) => (
    <BlocEditorialBible
      key={bloc.id}
      bloc={bloc}
      illustrations={imagesParBloc.get(bloc.id) ?? []}
      suite={i > 0 && estSuiteDuBloc(liste[i - 1], bloc)}
      titresMasques={titresMasques}
    />
  ))
  const rendreImages = (liste: readonly BibleEditionDisplayAsset[]) => liste.map((illustration) => surMesure(
    <IllustrationBible key={illustration.id} illustration={illustration} />,
    illustration.id,
  ))

  // ── CLIQUER UN VERSET OUVRE SON APPARAT, DES DEUX CÔTÉS ─────────────────────
  // Demande de l'auteur (2026-09-04) : « permettre de cliquer sur un verset pour
  // afficher les liens patristiques (sur l'AF et le Français) ».
  // ⛔ LA CIBLE EST LA RANGÉE, jamais la cellule : les deux colonnes d'une rangée
  // sont le MÊME verset canonique, et le volet de droite se charge sur `canon_id`
  // (`segmentsLiesAuVerset`). Cliquer l'ancien français ou le français ouvre donc
  // le même apparat, et il n'y a rien à départager entre deux colonnes qui disent
  // le même créneau. ⚠️ Une rangée dont une colonne est vide se clique aussi :
  // l'apparat tient au créneau, non à ce que telle édition en porte.
  // ⚠️ Les appels de note arrêtent le clic (`NoteBibliqueFenetre`) : ouvrir une
  // note ne sélectionne pas le verset qui la porte.
  // ⚠️ Le survol et la marque du verset retenu vivent dans `globals.css`
  // (`.cs-regard-rangee`) : posés en style en ligne, ils battraient toute règle de
  // feuille, et le survol serait mort sans que rien ne le dise.
  const choisir = onSelectionnerVerset
  // La copie d'une colonne : au bureau seulement ; au doigt, le lasso tactile la porte.
  const copier = mobile ? undefined : copierCellule
  // ⛔ Le signet reste offert AU DOIGT, à la différence de la copie : le lasso tactile
  // enregistre une sélection, il ne bascule pas un verset seul.
  const basculer = basculerPrelevement
  const estPreleve = (canonId: string) => (prelevementDe ? prelevementDe(canonId) !== null : false)
  const marquesDeRangee = (canonId: string) => {
    if (!choisir) return {}
    const retenue = canonId === canonSelectionne
    return {
      // ⛔ La marque déborde le texte autant à droite qu'à gauche, comme en lecture simple
      // (décision de l'auteur, 14 septembre 2026) : voir `.cs-regard-rangee--symetrique`.
      // ⚠️ Colonnes côte à côte seulement : empilées, elles n'ont plus à droite la gouttière
      // où le débord se loge.
      className: `cs-regard-rangee${mobile ? '' : ' cs-regard-rangee--symetrique'}${retenue ? ' cs-regard-rangee--retenue' : ''}`,
      onClick: () => choisir(canonId),
      // ⛔ La rangée n'est plus focalisable (audit du 2026-09-22) : elle l'était sans rôle ni
      // nom, et elle porte des appels de note. Au clavier, c'est son NUMÉRO qui la retient,
      // comme en lecture simple (`boutonDuNumero`).
    }
  }
  // Le numéro, bouton du verset pour le clavier : rôle, état et nom, comme dans TexteBible.
  const boutonDuNumero = (canonId: string, libelleGlose: string | null = null) => {
    if (!choisir) return {}
    const numero = numeroCanonique(canonId)
    if (libelleGlose !== null) {
      return {
        role: 'button' as const,
        tabIndex: 0,
        'aria-pressed': canonId === canonSelectionne,
        'aria-label': numero === null ? libelleGlose : `${libelleGlose}, verset ${numero}`,
        // ⚠️ La rangée d'une glose ne porte PAS de clic : elle n'a pas de créneau à elle.
        // Le libellé est donc son seul bouton, et il doit répondre à la souris comme au
        // clavier — sans quoi l'apparat de son hôte resterait inatteignable.
        onClick: (e: MouseEvent<HTMLSpanElement>) => { e.stopPropagation(); choisir(canonId) },
        onKeyDown: (e: KeyboardEvent<HTMLSpanElement>) => activerAuClavier(e, () => choisir(canonId)),
      }
    }
    return {
      role: 'button' as const,
      tabIndex: 0,
      'aria-pressed': canonId === canonSelectionne,
      // ⛔ Le nom dit tout ce que le numéro MONTRE, l'état prélevé compris : même
      // écriture qu'en lecture simple (`libelleNumeroVerset`).
      'aria-label': numero === null ? 'Verset' : libelleNumeroVerset({ verset: numero }, estPreleve(canonId)),
      onKeyDown: (e: KeyboardEvent<HTMLSpanElement>) => activerAuClavier(e, () => choisir(canonId)),
    }
  }

  // ⛔ EMPILÉES, LES DEUX COLONNES D'UN VERSET SE LISENT COMME UNE ŒUVRE EN REGARD
  // (demande de l'auteur, 2026-09-22 : « reprendre le modèle bilingue des œuvres
  // patristiques, avec le filet ») : la paire serrée, un filet pâle sous elle, celui
  // de `.para-bilingue` (OeuvreClient). Le numéro ne se répète pas : voir
  // `referenceRepetee`.
  const styleGrille = mobile
    ? {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr)',
      rowGap: '0.15rem',
      borderBottom: '1px solid rgba(var(--cs-bord-rgb), 0.55)',
      marginBottom: '0.55rem',
    }
    : {
      display: 'grid',
      // Colonnes de largeurs INÉGALES, comme en traductions parallèles : le texte
      // original est plus dense que sa traduction et demande moins de place. La
      // mesure totale fut celle des œuvres, 52 rem, jusqu'au 2026-09-03 ; c'est
      // désormais celle de la PAGE de la lecture simple, 38,75 rem, posée par
      // `LectureBilingueBible` sur l'axe du texte — et l'appareil est bordé par
      // le fer des versets (`surMesure`). ⚠️ Les œuvres en regard sont à 42 rem
      // depuis le 2026-08-30, mesurées sur les vers de Boèce ; la Bible pose des
      // commentaires entre ses versets, elle n'a pas la même contrainte.
      gridTemplateColumns: colonnesOrdonnees
        .map((colonne) => (colonne.membre.memberRole === 'source_text' ? 'minmax(0, 0.88fr)' : 'minmax(0, 1.12fr)'))
        .join(' '),
      alignItems: 'baseline',
      columnGap: '1.1rem',
      rowGap: '0.4rem',
    }

  return (
    <div data-lecture="bilingue">
      {(copier || basculer) && <style>{FEUILLE_COPIE_REGARD}</style>}
      {rendreBlocs(commun.blocs.opening)}
      {rendreImages(commun.images.opening)}

      {rangees.map((rangee) => {
        // ⛔ UNE RANGÉE DE GLOSE N'EST PAS UN VERSET (charte § 15.4). Elle ne porte donc
        // pas `data-canon-id`, où la reprise de lecture chercherait un numéro, ni la marque
        // d'une rangée cliquable : l'apparat patristique se charge sur un créneau, et une
        // glose n'en a pas. Et une colonne vide n'y garde pas sa place : une glose sans
        // vis-à-vis prend la largeur des deux (`gloseSansVisAVis`).
        const glose = rangee.glose
        const seule = gloseSansVisAVis(rangee)
        // Le numéro qui sert de bouton : celui de la première cellule qui porte un texte.
        const indexBouton = rangee.cellules.findIndex((c) => c !== null)
        const libelleReference = (cellule: (typeof rangee.cellules)[number]) => cellule === null
          ? referenceCanoniqueLisible(rangee.canonId)
          : cellule.glose
            ? LIBELLE_GLOSE
            : referenceNativeLisible(cellule.referenceNative) ?? referenceCanoniqueLisible(rangee.canonId)
        return (
          <div key={rangee.canonId}>
            {rendreBlocs(commun.blocs.beforeByCanon.get(rangee.canonId) ?? [])}
            {rendreImages(commun.images.beforeByCanon.get(rangee.canonId) ?? [])}
            <div
              style={styleGrille}
              data-canon-id={glose ? undefined : rangee.canonId}
              data-glose={glose ? (glose.canonHote ?? '') : undefined}
              {...(glose ? {} : marquesDeRangee(rangee.canonId))}
            >
              {rangee.cellules.map((cellule, index) => {
                const membre = colonnesOrdonnees[index].membre
                if (glose && cellule === null) return null
                const original = membre.memberRole === 'source_text'
                // ⛔ LE LASSO NE PREND QU'UN VERSET QUI PORTE DU TEXTE DANS CETTE COLONNE,
                // et jamais une glose : elle n'a pas de créneau, donc aucun numéro sous
                // lequel s'enregistrer (charte § 15.4). Un créneau qu'une édition ne porte
                // pas reste hors du lasso : il n'y a rien à copier.
                const cleLasso = !glose && !cellule?.glose && cellule !== null && cellule.texte.trim() !== ''
                  ? cleDeCelluleBilingue(membre.translationId, rangee.canonId)
                  : undefined
                const appels = appelsDeLaCellule(notesRetenues, rangee, index, membre.id)
                // ── LE TEXTE SE COMPOSE COMME EN LECTURE SIMPLE (audit du 2026-09-22) ──
                // Il sortait brut : ni enrichissement (`<i>` de Sacy, petites capitales),
                // ni espaces françaises, ni césures du latin et du grec, ni marqueurs du
                // témoin de 1260. Même chaîne que `TexteBible` : le témoin passe par
                // `rendreMarqueurs899` d'un bloc, ses appels à la suite ; la traduction
                // moderne met ses lacunes en forme par `marquerLacunesDuTemoin`.
                const langue = membre.languageCode?.toLowerCase()
                const temoin899 = membre.translationId === TRAD_ID_BIBLE899
                const lacunesEnClair = estTraductionModerne899(membre.translationId)
                // ⛔ Un appel se pose à l'ANCRE que la donnée déclare ; sans ancre lisible, il suit le texte.
                const repartition = repartirAppels(temoin899 ? '' : (cellule?.texte ?? ''), appels, true)
                const copieSansCesures = langue === 'la' || langue === 'grc' ? copierSansCesures : undefined
                // ⛔ Empilé, le numéro ne paraît qu'une fois, sur la première cellule : la
                // seconde garde INVISIBLE celui de la première, pour que son texte reprenne
                // le même fer.
                // ⚠️ Sauf si la première cellule est vide : la seconde est alors seule à
                // dire son numéro.
                const referenceRepetee = mobile && index > 0 && rangee.cellules[0] !== null
                // ⛔ LE NUMÉRO EST LE BOUTON DU VERSET POUR LE CLAVIER, comme en lecture simple :
                // la rangée porte des appels de note, on ne la rend pas focalisable. Un seul
                // bouton par rangée, sur la première cellule qui dit son numéro.
                // ⛔ UNE GLOSE S'OUVRE COMME UN VERSET, ET AU CLAVIER AUSSI (audit du
                // 2026-09-22). Elle n'a pas de créneau à elle (charte § 15.4) : c'est celui
                // de son HÔTE que le clic ouvre, comme la rangée qui la porte. Son libellé
                // est alors le bouton, sans quoi l'apparat d'une glose n'était atteignable
                // qu'à la souris — et pas même à la souris, la rangée ne portant aucun clic.
                const estBouton = index === indexBouton && (!glose || glose.canonHote !== null)
                // ⚠️ `data-lasso-depart` : le lasso du doigt ne naît que sur la marge d'un
                // verset (contrat de `LassoTactile`), et il y apprend sa COLONNE. Le numéro
                // répété, invisible, garde sa boîte : l'enveloppe reste touchable.
                const departLasso = cleLasso ? membre.translationId : undefined
                const reference = (
                  <span style={STYLE_REFERENCE}
                    aria-hidden={referenceRepetee || undefined}
                    data-lasso-depart={departLasso}
                    {...(estBouton && !referenceRepetee ? boutonDuNumero(glose ? (glose.canonHote as string) : rangee.canonId, glose ? LIBELLE_GLOSE : null) : {})}>
                    {!referenceRepetee && estBouton && !glose && estPreleve(rangee.canonId) && (
                      <span aria-hidden="true" title="Dans mes prélèvements" style={STYLE_SIGNET_REGARD}>
                        <IconeSignet plein taille="100%" />
                      </span>
                    )}
                    {referenceRepetee
                      ? <span style={{ visibility: 'hidden' as const }}>{libelleReference(rangee.cellules[0])}</span>
                      : libelleReference(cellule)}
                  </span>
                )
                return (
                  <div
                    key={membre.id}
                    lang={membre.languageCode}
                    data-membre={membre.id}
                    data-lasso-cellule={cleLasso}
                    style={seule ? { minWidth: 0, gridColumn: '1 / -1' } : { minWidth: 0, ...((copier || basculer) && cleLasso ? { position: 'relative' as const } : {}) }}
                  >
                    {cellule === null ? (appels.length === 0 ? (
                      // Un créneau que cette édition ne porte pas reste vide :
                      // on n'y met jamais le texte de l'autre colonne.
                      <p aria-hidden style={STYLE_VERSET}>
                        &nbsp;
                      </p>
                    ) : (
                      // ⛔ Sauf l'appel d'une note que CETTE langue y a posée : l'appel est son
                      // seul chemin, et la note dit pourquoi le verset manque. La cellule garde
                      // son vide, rendu « — » comme dans la lecture simple.
                      <div style={STYLE_LIGNE_VERSET}>
                        {reference}
                        <p style={original ? STYLE_VERSET_ORIGINAL : STYLE_VERSET}>
                          <span style={STYLE_VERSET_VIDE}>—</span>
                          {appeler(appels, membre.id)}
                        </p>
                      </div>
                    )) : (
                      <div style={STYLE_LIGNE_VERSET}>
                        {/* ⚠️ LA RÉFÉRENCE PARAÎT DES DEUX CÔTÉS (demande de l'auteur,
                            2026-09-04). Une édition ne dit sa numérotation propre que
                            lorsqu'elle DIFFÈRE du canon ; à défaut la colonne portait une
                            gouttière vide, et le lecteur n'avait de numéro que d'un bord.
                            Une glose y porte son libellé, sans numéro (charte § 15.4).
                            ⚠️ Empilées, voir `referenceRepetee`. */}
                        {reference}
                        <p
                          onCopy={copieSansCesures}
                          style={cellule.glose
                            ? (original ? STYLE_GLOSE_ORIGINAL : STYLE_GLOSE)
                            : (original ? STYLE_VERSET_ORIGINAL : STYLE_VERSET)}
                        >
                          {temoin899
                            ? rendreMarqueurs899(cellule.texte)
                            : rendreTexteAvecAppels(cellule.texte, repartition.groupes, (morceau) => rendreTexteEnrichi(
                                // Les césures se posent morceau par morceau, APRÈS le placement
                                // des appels (qui se fait par offset sur le texte entier).
                                cesurerSelonLangue(morceau, langue),
                                lacunesEnClair ? marquerLacunesDuTemoin : undefined,
                              ), (notes) => appelerEnSuite(notes, membre.id), true,
                              lacunesEnClair
                                ? (avant, appelsFondus, ponctuation) => fondreAppelsDansLaMarque(avant, appelsFondus, ponctuation, rendreTexteEnrichi)
                                : undefined)}
                          {appeler(repartition.aLaSuite, membre.id)}
                        </p>
                        {basculer && cleLasso && (
                          <SignetCellule
                            basculer={() => basculer(cleLasso)}
                            preleve={estPreleve(rangee.canonId)}
                            numero={numeroCanonique(rangee.canonId)}
                            derniere={index === rangee.cellules.length - 1}
                          />
                        )}
                        {copier && cleLasso && (
                          <CopieCellule
                            copier={() => copier(cleLasso)}
                            numero={numeroCanonique(rangee.canonId)}
                            langue={nomLangue(membre.languageCode)}
                            derniere={index === rangee.cellules.length - 1}
                            rang={basculer ? 1 : 0}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {rendreImages(commun.images.afterByCanon.get(rangee.canonId) ?? [])}
            {rendreBlocs(commun.blocs.afterByCanon.get(rangee.canonId) ?? [])}
          </div>
        )
      })}

      {rendreImages(commun.images.closing)}
      {rendreBlocs(commun.blocs.closing)}
    </div>
  )
}
