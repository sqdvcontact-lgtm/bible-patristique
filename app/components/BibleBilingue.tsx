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
import IconeSignalement from './IconeSignalement'
import IconeSignet from './IconeSignet'
import { Bulle } from './Bulle'
import type { EtatPrelevement } from '@/app/lib/prelevementsBibliques'
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
  CESURE_VERSET, CORPS_GLOSE, CORPS_LECTURE_BIBLE, ESPACE_MOT_ORIGINAL, CHASSE_VERSET, ESPACE_MOT_VERSET, INTERLIGNE_LECTURE_BIBLE, LIBELLE_GLOSE, RAPPORT_ORIGINAL_EN_REGARD,
  STYLE_SIGNET_VERSET, STYLE_VERSET_VIDE,
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
import { SERIF, SANS } from '@/app/lib/polices'

// Le bouton de copie d'une cellule ne paraît qu'au survol de sa rangée, au foyer, ou
// sur un écran sans survol. ⚠️ Son opacité est posée en ligne : la feuille la bat par
// « !important », comme les actions d'un verset en lecture simple.
const FEUILLE_COPIE_REGARD = '[data-canon-id]:hover .cs-regard-action, [data-canon-id]:focus-within .cs-regard-action { opacity: 1 !important; } @media (hover: none) { .cs-regard-action { opacity: 1 !important; } }'

// ⛔ LE SIGNET D'UN VERSET PRÉLEVÉ PREND LA COMPOSITION DE LA LECTURE SIMPLE, et non une
// composition à lui (demande de l'auteur, 2026-09-23 : « revenir à la mise en forme
// ancienne du signet grisé à gauche du numéro de verset ; étendre, simplement, la
// sélection pour l'englober »). Celle du 22 septembre PESAIT dans la colonne du numéro —
// une demi-chasse de large, plus son écart — si bien qu'un verset mis de côté poussait son
// numéro et, la colonne étant en `auto`, décalait le texte de sa rangée. `STYLE_SIGNET_VERSET`
// le rend en marge NÉGATIVE : il pend à gauche du chiffre et rien ne bouge.
// ⚠️ Ce qu'il pend au-delà de la rangée, c'est la SÉLECTION qui va le chercher
// (`--regard-signet`, globals.css), non le signet qui rentre.


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
  // Même espace et même césure que la lecture simple (compositionBible.ts), et la chasse
  // des lettres à zéro : le verset est un texte dense.
  letterSpacing: CHASSE_VERSET,
  wordSpacing: ESPACE_MOT_VERSET,
  hyphenateLimitChars: CESURE_VERSET,
  overflowWrap: 'break-word' as const,
  margin: '0 0 0.4rem',
}

// L’encre de la colonne originale des œuvres, reprise telle quelle pour que
// les deux lectures en regard du site se ressemblent.
const STYLE_VERSET_ORIGINAL = {
  ...STYLE_VERSET,
  fontFamily: SANS,
  fontSize: `calc(${CORPS_LECTURE_BIBLE} * ${RAPPORT_ORIGINAL_EN_REGARD})`,
  color: 'var(--cs-original)',
  wordSpacing: ESPACE_MOT_ORIGINAL,
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

// ⛔ LE FOND DU LASSO SE COUPE EN DEUX À LA JOINTURE DES COLONNES (demande de l'auteur,
// 2026-09-23 : « pour les éditions bilingues, tu coupes en deux, mais tu donnes un peu de
// marge dans la partie centrale »). Chaque cellule retenue prend, sur ses bords extérieurs,
// le débord même que la rangée prend au clic (`.cs-regard-rangee--symetrique`), et laisse
// au milieu de la gouttière de 1,1 rem un blanc de 0,3 rem : 0,4 rem de chaque côté.
// Les débords se passent en variables à l'ombre du lasso (`ombreDeSurbrillance`).
const DEBORD_LASSO_GAUCHE = 'calc(0.25rem + var(--regard-signet))'
const DEBORD_LASSO_DROIT = 'calc(0.25rem + var(--regard-numero) + var(--regard-numero-gouttiere))'
const DEBORD_LASSO_MILIEU = '0.4rem'
function debordsDuLasso(index: number, colonnes: number, seule: boolean): React.CSSProperties {
  const premiere = seule || index === 0
  const derniere = seule || index === colonnes - 1
  return {
    ['--lasso-g' as string]: premiere ? DEBORD_LASSO_GAUCHE : DEBORD_LASSO_MILIEU,
    ['--lasso-d' as string]: derniere ? DEBORD_LASSO_DROIT : DEBORD_LASSO_MILIEU,
  } as React.CSSProperties
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
  /** L'état du signet d'UNE cellule, par sa clé (`cleDeCelluleBilingue`) : `'plein'` si CE
   *  texte est prélevé ; `'ailleurs'` (prélevé dans une autre traduction seulement) ne se
   *  montre pas (décision de l'auteur, 2026-09-23 : rien sur l'autre colonne). Présent avec `basculerPrelevement`, chaque cellule qui
   *  porte un texte offre son signet, et le numéro DIT l'état à qui ne voit pas la page.
   *  ⛔ Par cellule, jamais par créneau : prélever le latin ne coche pas le français
   *  (demande de l'auteur, 2026-09-23). */
  etatPrelevement?: (cle: string) => EtatPrelevement
  /** Prélever ou retirer le verset d'UNE colonne, par sa clé de cellule
   *  (`cleDeCelluleBilingue`) : c'est elle qui dit quel texte et quelle bible on met de
   *  côté, comme pour la copie. */
  basculerPrelevement?: (cle: string) => Promise<void>
  /** Signaler une erreur dans le verset d'UNE colonne, par sa clé de cellule
   *  (`cleDeCelluleBilingue`). Présent, chaque cellule qui porte un texte offre au survol
   *  son drapeau, comme la lecture simple. ⚠️ La FENÊTRE vit chez l'appelant : c'est lui
   *  qui sait le texte et la référence de la cellule (voir `LectureBilingueBible`). */
  signalerCellule?: (cle: string) => void
  mobile?: boolean
  /** La place, en pixels, qui reste À DROITE de la rangée dans le défileur — la marge que
   *  la colonne de lecture laisse, gouttière d'actions comprise. Elle décide seule si la
   *  rangée d'actions se pose DANS cette marge ou se replie en carte par-dessus la fin des
   *  lignes : voir `ACTIONS_LARGEUR_PX`. ⚠️ `undefined` tant qu'on n'a pas mesuré, et l'on
   *  se replie alors, ce qui ne peut jamais déborder. */
  margeActions?: number
}

type ApparatColonne = {
  blocs: BibleEditionBodyBlockIndex
  images: BibleEditionAssetIndex
}

// ── LA PLACE D'UN BOUTON DANS LA GOUTTIÈRE D'UNE CELLULE ──────────────────────
// Les boutons d'une cellule s'EMPILENT dans la gouttière qui la suit — celle qui sépare
// les deux colonnes, ou la marge à droite de la dernière —, du premier rang au dernier.
// ⚠️ Une seule écriture : trois boutons qui calculeraient chacun leur place finiraient par
// se chevaucher au premier changement de gabarit (`COTE_BOUTON` a passé de 18 à 21 px le
// 2026-09-23).
const placeDansLaGouttiere = (rang: number, derniere: boolean) => ({
  ...STYLE_BOUTON_ACTION,
  position: 'absolute' as const,
  top: rang === 0 ? '0.15rem' : `calc(0.15rem + ${rang} * ${STYLE_BOUTON_ACTION.height})`,
  left: derniere ? 'calc(100% + 0.3rem)' : `calc(100% + 0.55rem - ${STYLE_BOUTON_ACTION.width} / 2)`,
  opacity: 0,
})

// ── LA COPIE D'UNE COLONNE (audit du 2026-09-22) ──────────────────────────────
// La lecture en regard n'avait aucun moyen de copier un verset hors du lasso. Un seul
// bouton par cellule, au survol de la rangée, posé HORS du texte : dans la gouttière entre
// les deux colonnes, ou à droite de la dernière. ⛔ Il n'est pas cliquable au travers : le
// clic s'arrête là, et ne retient pas le verset.
function CopieCellule({ copier, numero, langue, derniere, rang, enRangee = false }: {
  copier: () => Promise<void>
  numero: number | null
  langue: string
  derniere: boolean
  /** Le rang du bouton dans la gouttière : 0 quand il y est seul, 1 sous le signet. */
  rang: number
  /** Posé dans la RANGÉE d'actions (bureau) : le bouton y est un article de flex ordinaire,
   *  et c'est la rangée qui porte sa place et son opacité. */
  enRangee?: boolean
}) {
  const { copie, eclat, briller } = useEclatCopie()
  const { echec, signaler } = useEclatEchec()
  const objet = numero === null ? 'ce verset' : `le verset ${numero}`
  const infobulle = echec ? 'La copie a échoué' : `Copier ${objet} (${langue.toLowerCase()})`
  const bouton = (
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
      title={enRangee ? undefined : infobulle}
      aria-label={`Copier ${objet} (${langue.toLowerCase()})`}
      style={{
        ...(enRangee ? STYLE_BOUTON_ACTION : placeDansLaGouttiere(rang, derniere)),
        color: echec ? 'var(--cs-danger)' : copie ? 'var(--cs-vert)' : 'var(--cs-bord)',
        ...(echec ? STYLE_HOTE_ECHEC : null),
      }}
    >
      <IconeCopier />
      {echec ? <EclatEchec echec={echec} /> : <EclatCopie eclat={eclat} />}
    </button>
  )
  // ⛔ L'infobulle du site (`Bulle`) dans la RANGÉE d'actions, comme la cellule d'actions
  // d'une œuvre. Dans la gouttière (téléphone), le bouton est posé en absolu dans sa
  // cellule : une enveloppe positionnée lui prendrait son bloc conteneur, et il garde
  // l'infobulle native.
  return enRangee ? <Bulle texte={infobulle} position="left">{bouton}</Bulle> : bouton
}

// ── LE PRÉLÈVEMENT D'UNE CELLULE (audit du 2026-09-22) ────────────────────────
// La lecture en regard n'offrait AUCUN geste par verset — ni signet, ni copie — quand la
// lecture simple en porte quatre. Le signet est le jumeau du bouton de copie : même
// gabarit, même gouttière, rangé au-dessus de lui.
function SignetCellule({ basculer, etat, langue, numero, derniere, rang, enRangee = false }: {
  basculer: () => Promise<void>
  etat: EtatPrelevement
  /** La langue de la colonne, pour que le nom du geste dise QUEL texte on prélève. */
  langue: string
  numero: number | null
  derniere: boolean
  rang: number
  enRangee?: boolean
}) {
  const [attente, setAttente] = useState(false)
  const { echec, signaler } = useEclatEchec()
  const preleve = etat === 'plein'
  const objet = `${numero === null ? 'ce verset' : `le verset ${numero}`} (${langue.toLowerCase()})`
  const geste = preleve
    ? `Retirer ${objet} de mes prélèvements`
    : `Ajouter ${objet} à mes prélèvements`
  const infobulle = echec ? 'Le geste a échoué' : geste
  const bouton = (
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
      title={enRangee ? undefined : infobulle}
      aria-label={geste}
      style={{
        ...(enRangee ? STYLE_BOUTON_ACTION : placeDansLaGouttiere(rang, derniere)),
        color: echec ? 'var(--cs-danger)' : preleve ? 'var(--cs-texte-doux)' : 'var(--cs-bord)',
        ...(echec ? STYLE_HOTE_ECHEC : null),
      }}
    >
      {attente ? '…' : <IconeSignet plein={preleve} />}
      <EclatEchec echec={echec} />
    </button>
  )
  return enRangee ? <Bulle texte={infobulle} position="left">{bouton}</Bulle> : bouton
}

// ── LE SIGNALEMENT D'UNE CELLULE (demande de l'auteur, 2026-09-23) ────────────
// « Au survol d'un verset, le bouton “signaler” n'existe plus ; restaurer. » La lecture
// simple porte son drapeau depuis toujours ; la lecture en regard, qui n'offrait aucun
// geste avant le 22 septembre, en avait reçu deux et pas celui-là. ⛔ Il signale le verset
// de SA colonne : c'est la langue lue qui porte la faute, et le modérateur doit savoir
// laquelle. ⚠️ La fenêtre s'ouvre chez l'appelant, qui seul tient le texte de la cellule.
function SignalerCellule({ signaler, numero, langue, derniere, rang, enRangee = false }: {
  signaler: () => void
  numero: number | null
  langue: string
  derniere: boolean
  rang: number
  enRangee?: boolean
}) {
  const objet = numero === null ? 'ce verset' : `le verset ${numero}`
  const geste = `Signaler une erreur dans ${objet} (${langue.toLowerCase()})`
  const bouton = (
    <button
      type="button"
      className="cs-regard-action"
      onClick={(e) => { e.stopPropagation(); signaler() }}
      title={enRangee ? undefined : geste}
      aria-label={geste}
      style={{ ...(enRangee ? STYLE_BOUTON_ACTION : placeDansLaGouttiere(rang, derniere)), color: 'var(--cs-bord)' }}
    >
      <IconeSignalement />
    </button>
  )
  return enRangee ? <Bulle texte={geste} position="left">{bouton}</Bulle> : bouton
}

// ── LA RANGÉE D'ACTIONS D'UNE LECTURE EN REGARD ───────────────────────────────
//
// Demande de l'auteur (2026-09-23) : « les symboles copier, signaler, etc., dans le mode
// lecteur bilingue, sont immondes ! les placer tout à droite des deux versets, sur deux
// lignes, avec indiqué : “Texte français”, “Texte latin” pour chaque ligne ».
//
// ⛔ ILS ÉTAIENT ÉPARPILLÉS DANS LES DEUX GOUTTIÈRES, et c'est là tout le défaut : ceux du
//    français s'empilaient dans la gouttière du MILIEU — entre les deux colonnes, au beau
//    milieu de ce qu'on lit — et ceux du latin à droite de la page. Trois pictogrammes nus,
//    à deux endroits, sans un mot pour dire lequel commandait quelle langue.
// ⛔ UNE LIGNE PAR LANGUE, ET ELLE SE NOMME : « Texte français », « Texte latin ». Le nom
//    n'est pas un ornement — c'est lui qui fait qu'une rangée d'actions posée hors des
//    colonnes dise encore à quoi elle s'applique.
//
// ⚠️ La composition vit ICI et non dans la feuille : les deux volets de la page se traînent
//    à la poignée, et ce bloc n'a pas de classe à lui. Seule l'OPACITÉ passe par la feuille
//    (`FEUILLE_COPIE_REGARD`), qui la bat en `!important` au survol de la rangée.
const ACTIONS_LIBELLE: React.CSSProperties = {
  fontFamily: SANS,
  // ⛔ 0,6875 rem, LE PLANCHER DU SITE, et non un rang de moins : ce libellé se lit en bas
  //    de casse, et les 0,625 rem ne sont accordés qu'aux capitales espacées (charte, audit
  //    d'ergonomie du 2026-09-21). `echelleTypographique.test.ts` refuse l'autre.
  fontSize: '0.6875rem',
  lineHeight: 1,
  letterSpacing: '0.01em',
  color: 'var(--cs-texte-second)',
  whiteSpace: 'nowrap',
}

/** La largeur que la rangée demande, en pixels à la racine 16 : les deux libellés (le plus
 *  long, « Texte français », vaut environ 74 px à ce corps), l'écart, trois cibles de 21 px
 *  et leurs deux jours, plus le pas qui la sépare du texte.
 *  ⚠️ C'est une BORNE, non une mesure : on la veut un cheveu haute, une rangée qui déborde
 *  coûtant un défilement horizontal quand une rangée repliée ne coûte qu'un fond. */
const ACTIONS_LARGEUR_PX = 164

/**
 * Les actions d'une rangée : une ligne par colonne qui porte un texte, nommée par sa langue.
 *
 * ⛔ ELLE EST POSÉE EN ABSOLU et ne prend donc AUCUNE place dans la grille : les colonnes
 *    gardent exactement la mesure qu'elles avaient, et la page ne bouge pas quand la rangée
 *    paraît. Un article de grille absolu n'ouvre pas de rangée non plus.
 * ⚠️ `repliee` : faute de marge, elle se pose PAR-DESSUS la fin des lignes, sur le sol de la
 *    page et sous une ombre, où elle se lit comme un objet flottant. ⛔ Jamais de débord :
 *    le défileur de la page rendrait une barre horizontale pour trois pictogrammes.
 */
function ActionsDeLaRangee({ lignes, repliee }: {
  lignes: readonly { cle: string; libelle: string; boutons: ReactNode }[]
  repliee: boolean
}) {
  if (lignes.length === 0) return null
  return (
    <div
      className="cs-regard-action"
      style={{
        position: 'absolute',
        top: '0.05rem',
        ...(repliee
          ? { right: 0, background: 'var(--cs-surface)', boxShadow: 'var(--cs-ombre-nette)', borderRadius: '4px', padding: '2px 4px' }
          : { left: 'calc(100% + 0.75rem)' }),
        display: 'grid',
        gridTemplateColumns: 'auto auto',
        alignItems: 'center',
        columnGap: '0.375rem',
        rowGap: '0.125rem',
        opacity: 0,
      }}
    >
      {lignes.map((ligne) => (
        <Fragment key={ligne.cle}>
          {/* ⚠️ Le libellé est `aria-hidden` : chaque bouton porte déjà sa langue dans son
              propre nom accessible, et l'annoncer deux fois ferait lire « Texte latin,
              copier le verset 3 (latin) ». */}
          <span aria-hidden="true" style={ACTIONS_LIBELLE}>{ligne.libelle}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.125rem' }}>{ligne.boutons}</span>
        </Fragment>
      ))}
    </div>
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
  etatPrelevement,
  basculerPrelevement,
  signalerCellule,
  mobile = false,
  titresMasques,
  margeActions,
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
  // ⛔ Le drapeau aussi reste offert au doigt : signaler une faute ne se remplace par
  // aucun autre geste, et le pavé d'actions de la lecture simple le porte déjà au tactile.
  const signaler = signalerCellule
  // Le rang de chaque bouton dans la gouttière : ils s'y empilent dans l'ordre où ils sont
  // rendus, et une lecture qui n'en offre qu'un le pose tout en haut.
  const rangDuSignet = 0
  const rangDeLaCopie = basculer ? 1 : 0
  const rangDuDrapeau = (basculer ? 1 : 0) + (copier ? 1 : 0)
  // ⛔ LA RANGÉE D'ACTIONS NE VAUT QUE LES COLONNES CÔTE À CÔTE (2026-09-23). Empilées, il
  // n'y a plus de « tout à droite des deux versets » : chaque cellule prend alors la pleine
  // largeur, et les boutons retournent dans sa gouttière, comme avant.
  const actionsEnRangee = !mobile && Boolean(basculer || copier || signaler)
  const etatDe = (cle: string): EtatPrelevement => (etatPrelevement ? etatPrelevement(cle) : null)
  // Le numéro d'une rangée se dit prélevé dès qu'UNE colonne l'est : il nomme le verset,
  // non l'une de ses langues.
  const estPreleve = (canonId: string) => colonnesOrdonnees.some(
    ({ membre }) => etatDe(cleDeCelluleBilingue(membre.translationId, canonId)) === 'plein')
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
      {(copier || basculer || signaler) && <style>{FEUILLE_COPIE_REGARD}</style>}
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
        // ── LES ACTIONS DE LA RANGÉE (2026-09-23) ──
        // ⛔ UNE LIGNE PAR COLONNE QUI PORTE UN TEXTE, nommée par sa langue, et l'ordre est
        // celui des colonnes à l'écran : le lecteur retrouve « Texte français » à la hauteur
        // de la colonne française. La règle du lasso décide de ce qui s'offre — un créneau
        // qu'une édition ne porte pas, ou une glose, n'a rien à copier ni à prélever.
        const lignesActions = actionsEnRangee
          ? rangee.cellules.flatMap((cellule, index) => {
            const membre = colonnesOrdonnees[index].membre
            if (glose || cellule === null || cellule.glose || cellule.texte.trim() === '') return []
            const cle = cleDeCelluleBilingue(membre.translationId, rangee.canonId)
            const numero = numeroCanonique(rangee.canonId)
            const langue = nomLangue(membre.languageCode)
            return [{
              cle,
              libelle: `Texte ${langue.toLowerCase()}`,
              boutons: (
                <>
                  {basculer && (
                    <SignetCellule enRangee basculer={() => basculer(cle)} etat={etatDe(cle)} langue={langue}
                      numero={numero} derniere={false} rang={0} />
                  )}
                  {copier && (
                    <CopieCellule enRangee copier={() => copier(cle)} numero={numero} langue={langue}
                      derniere={false} rang={0} />
                  )}
                  {signaler && (
                    <SignalerCellule enRangee signaler={() => signaler(cle)} numero={numero} langue={langue}
                      derniere={false} rang={0} />
                  )}
                </>
              ),
            }]
          })
          : []
        return (
          <div key={rangee.canonId}>
            {rendreBlocs(commun.blocs.beforeByCanon.get(rangee.canonId) ?? [])}
            {rendreImages(commun.images.beforeByCanon.get(rangee.canonId) ?? [])}
            <div
              style={actionsEnRangee ? { ...styleGrille, position: 'relative' } : styleGrille}
              data-canon-id={glose ? undefined : rangee.canonId}
              data-glose={glose ? (glose.canonHote ?? '') : undefined}
              {...(glose ? {} : marquesDeRangee(rangee.canonId))}
            >
              {/* ⛔ LES ACTIONS PRÉCÈDENT LES CELLULES DANS LE DOCUMENT, comme en lecture
                  simple (TexteBible, audit ergonomique du 2026-09-21) : à la tabulation, on
                  rencontre d'abord les boutons du verset, puis son numéro, puis son texte et
                  ses appels de note. Rendues après les cellules, elles passaient derrière
                  les appels et semblaient appartenir au verset suivant. ⚠️ Le DESSIN ne
                  bouge pas : la rangée d'actions est posée en absolu et ne prend aucune
                  case de la grille. */}
              <ActionsDeLaRangee lignes={lignesActions} repliee={(margeActions ?? 0) < ACTIONS_LARGEUR_PX} />
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
                // ⛔ LE NUMÉRO NE SE DIT QU'UNE FOIS PAR RANGÉE (demande de l'auteur,
                // 2026-09-23 : « dans les traductions bilingues, ne pas réafficher le numéro
                // de verset à côté du texte de la colonne de droite »). Il revenait des deux
                // côtés depuis le 2026-09-04, et le lecteur lisait deux fois le même chiffre
                // sur une seule ligne. La colonne suivante garde INVISIBLE celui de la
                // première, pour que son texte reprenne le même fer et que le tapotement du
                // lasso garde sa cible.
                // ⚠️ Sauf s'il DIFFÈRE : une édition dont la numérotation propre n'est pas
                // celle du canon ne redit pas la même chose, elle en dit une autre — c'est
                // pour cela que la référence native paraît (voir `libelleReference`).
                // ⚠️ Sauf, aussi, si la première cellule est vide : la seconde est alors seule
                // à dire son numéro. Empilées, les deux colonnes se lisent comme une paire :
                // le numéro ne s'y répète jamais, fût-il différent.
                const referenceRepetee = index > 0 && rangee.cellules[0] !== null
                  && (mobile || libelleReference(cellule) === libelleReference(rangee.cellules[0]))
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
                    {/* ⛔ La marque du numéro dit l'état du VERSET : elle paraît dès qu'UNE des
                        colonnes est prélevée, à gauche du verset (demande de l'auteur,
                        2026-09-23 : un prélèvement du latin, à droite, ne se voyait nulle
                        part, son numéro étant tu). C'est aussi ce que dit le nom du bouton. */}
                    {!referenceRepetee && estBouton && !glose && estPreleve(rangee.canonId) && (
                      <span aria-hidden="true" title="Dans mes prélèvements" style={STYLE_SIGNET_VERSET}>
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
                    style={{ ...(seule ? { minWidth: 0, gridColumn: '1 / -1' } : { minWidth: 0, ...((copier || basculer || signaler) && cleLasso ? { position: 'relative' as const } : {}) }), ...(!mobile && cleLasso ? debordsDuLasso(index, rangee.cellules.length, seule) : {}) }}
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
                        {!actionsEnRangee && basculer && cleLasso && (
                          <SignetCellule
                            basculer={() => basculer(cleLasso)}
                            etat={etatDe(cleLasso)}
                            langue={nomLangue(membre.languageCode)}
                            numero={numeroCanonique(rangee.canonId)}
                            derniere={index === rangee.cellules.length - 1}
                            rang={rangDuSignet}
                          />
                        )}
                        {!actionsEnRangee && copier && cleLasso && (
                          <CopieCellule
                            copier={() => copier(cleLasso)}
                            numero={numeroCanonique(rangee.canonId)}
                            langue={nomLangue(membre.languageCode)}
                            derniere={index === rangee.cellules.length - 1}
                            rang={rangDeLaCopie}
                          />
                        )}
                        {!actionsEnRangee && signaler && cleLasso && (
                          <SignalerCellule
                            signaler={() => signaler(cleLasso)}
                            numero={numeroCanonique(rangee.canonId)}
                            langue={nomLangue(membre.languageCode)}
                            derniere={index === rangee.cellules.length - 1}
                            rang={rangDuDrapeau}
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
