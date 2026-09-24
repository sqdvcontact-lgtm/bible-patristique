'use client'
import { activerAuClavier, AIDE_SEGMENT, ID_AIDE_SEGMENT } from '@/app/lib/activerAuClavier'
import { Z_MODALE, Z_TIROIR, Z_TIROIR_VOILE } from '@/app/lib/empilement'
import { LIVRES } from '@/app/lib/bible'
import { MotAttente } from '@/app/lib/attenteEnCreux'
import { hydraterLiensHerites } from '@/app/lib/liens'
import { lancerEnParallele, lotsPourClauseIn } from '@/app/lib/paginationSupabase'
import { MarqueAttente } from '@/app/lib/attenteNavigation'
import { codesTraductionsLecture } from '@/app/lib/traductions'
// ⛔ La projection qui ne faillit pas : une ancre hors du texte est laissée de côté
// et dite à la console, le segment se lit. La stricte lève, et une seule ancre
// fermait la division (2026-09-05, voir `app/lib/chargementTolerant.ts`).
import { champDuTitre, projeterAppelsNotesStructureesEnSignalant as projeterAppels, type AncreNoteStructureeProjection } from '@/app/lib/appelsNotesStructurees'
import type { DegradationChargement } from '@/app/lib/chargementTolerant'
import { chargerNotesStructurees } from '@/app/lib/notesStructureesChargement'
import RetourFlottant from './RetourFlottant'
import FleuronDiscret from '@/app/components/FleuronDiscret'
import ReferenceBibliographique from '@/app/components/ReferenceBibliographique'
import { CLASSES_BIBLIOGRAPHIE, estBlocBibliographique } from '@/app/lib/apparatBibliographie'
import { comparerOuvragesDUnVolume, ouvrageDeLaNotice, type OuvrageBibliographique } from '@/app/lib/bibleBibliographieOuvrages'
import type { NoticeBibliographique } from '@/app/lib/referenceBibliographique'
import { chargerNoticesBibliographiques, identifiantsOuvrages, tableDesNotices } from '@/app/lib/referencesBibliographiquesChargement'

import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, useTransition, useId, Fragment } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import IconeCrayon from '@/app/components/IconeCrayon'
import { createPortal } from 'react-dom'
import { supabase } from "@/app/lib/supabase"
import type { ChampTitre, SegData, GroupeData, Props, EditionCible, OeuvreResumee, NoteAffichee, NoteStructuree, VersionTextuelle } from './oeuvreTypes'
import { variantesFrontispice, variantesIntertitre, titreComposeDe, cleTitreCompose, type TitresComposes } from './compositionTitres'
import type { BlocOriginal } from './bilingueAlignement'
import { repartirGroupes, chargerProjectionBilingue, chargerPlaceEnRegard, fondreOriginaux, fusionnerBlocsDeVers, originalEnRegard, bornesDesGroupes, partiesNonAlignees, LIBELLE_NON_ALIGNE, type BlocEnRegard } from './bilingueAlignement'
import { choisirPaireDeLecture, estVersionEnLangueOriginale, modeDeLectureEffectif } from './paireDeLecture'
import { ALIGNEMENT_ACTIONS, BoutonVolet, MenuVolet, STYLE_RANGEE_TETE_VOLET, TitreVolet, useRangeeCondensee, type ActionVolet } from './TeteVolet'
import { construireNavigationApparat } from './apparatNavigation'
import { chargerProfondeurPresente } from './niveauxPresents'
// ⛔ LE PIPELINE DES SEGMENTS, celui-là même que le rendu serveur emploie. Cinq de ses
// fonctions vivaient ici en copie, et c'est là qu'elles avaient divergé.
import {
  composerSegments,
  estIntroduction,
  indexerVersetsCites,
  segmentAffichable,
  type LigneVersetCite,
  type SegmentBrut,
  type VersetsCites,
} from './pipelineSegments'
import {
  basculerChapeau,
  chapeauxEnTexte,
  clesDeSurface,
  niveauVide,
  niveauxOfferts,
  normaliserConfig,
  poserProfondeur,
  type Surface,
} from './niveauxAffichage'

import { rendreTexteEnrichi, texteSansEnrichissement, normaliserEspaces, normaliserEspacesOriginal } from './texteEnrichi'
import { rendreEnrichi } from '@/app/lib/enrichissements'
import { bornerGuillemets } from '@/app/lib/guillemets'
import { effacerTiretsDeBordure } from '@/app/lib/tirets'
import { CelluleActions, useCelluleActions } from '@/app/components/CelluleActions'
import LassoLecture from '@/app/components/LassoLecture'
import { citationsDeLaSelection, colonnesTouchees } from '@/app/lib/lasso'
import { AUCUN_TITRE_MONTRE, passagesQuiOuvrentUnTitre, titresDuGroupe, type NiveauxDuPassage, type ReglageDesTitres } from '@/app/lib/titresDeDivision'
import { texteDesSuites, UNITE_PASSAGES } from '@/app/lib/selectionPassages'
import { citationPatristique, copierCitation } from '@/app/lib/citation'
import { signalerProgression } from '@/app/components/AnnonceHautsFaits'
import {
  AUCUN_ECHO,
  limiterRequeteAuxLiminairesSansNiveau,
  limiterRequeteSegmentsALaSurface,
  partagerLApparat,
  segmentsDeLaSurface,
  SELECT_SEGMENT,
  type SectionApparat,
} from '@/app/lib/oeuvreSelects'
import { liantAvantSegment } from '@/app/lib/jonctionSegments'
import { niveauxAlinea, retraitVers, ouvreStrophe, fusionnerBlocs, ombreDeLettrine, lignesDeVers, styleLigneDeVers, estBlocDeVers, RETRAIT_SUITE } from '@/app/lib/compositionVers'
import { BLANC_ENTRE_VERSETS, NATURE_VERSET, RETRAIT_VERSET, RETRAIT_VERSET_ETROIT, estBlocVersets, numeroDUnVerset } from '@/app/lib/compositionVersets'
import { estBlocExergue } from '@/app/lib/compositionExergue'
import { paginerBlocs } from '@/app/lib/paginationLecture'
import {
  LIBELLE_SECTION_APPARAT,
  STYLE_LETTRINE, STYLE_NUMERO_SEGMENT, STYLE_PREFIXE_LETTRINE,
  accepteLaLettrine, estBlocDeSignatures, margeArgument, paragraphesDeSegments,
  placeDeLExergue, placeDeLaSignature,
  styleArgument, styleBlocArgumentEnVers, styleBlocDeVers, styleEnteteSectionApparat,
  styleLigneArgumentEnVers,
  styleColonneOriginale, styleHoteBibliographieApparat, styleParagrapheApparat, styleParagrapheLecture,
  styleSousTitreNiveau, styleTitreNiveau,
} from '@/app/lib/compositionOeuvre'
import { OPTION_VOLET, RUBRIQUE_AXE } from '@/app/lib/stylesVoletLecture'
import { cesurerLatin } from '@/app/lib/cesuresLatines'
import { cesurerGrec, codeLangue } from '@/app/lib/grec'
import {
  citationStructurelleEstLongue,
  detecterCitationSortie,
  regrouperCitationsStructurelles,
  textesCitationStructurelleSansEncadrement,
} from '@/app/lib/citationSortie'
import { preparerTitreColophon, rendreIntituleDeSommaire, intituleEnTexteNu, rendreTexteAvecNotes, rendreTitreColophonAvecNotes, notesPourTexte, type OptionsRenduNotes } from './appelNote'
import { ouvrirLaNoteDansLeTexte } from './ouvrirNoteDansLeTexte'
// LA MANCHETTE — un renvoi biblique se lit dans la marge, il ne s'ouvre pas.
import { ContenuRenvoiEnLigne } from './ContenuNoteStructuree'
import { ProvisionNotesConnues, registreDesNotes } from './RenvoiNote'
import { NIV1_LIMINAIRES, intituleDeNiveau1 } from '@/app/lib/intituleNiveau1'
import { STYLE_RENVOI_MANCHETTE, vaEnManchette } from '@/app/lib/manchetteRenvois'
import { CLASSE_RENVOI_MANCHETTE, useManchetteRenvois } from './useManchetteRenvois'
import { chargerOeuvresDAuteurs } from '@/app/lib/auteursOeuvre'
import { identiteEdition, labelCourtVersion, libelleVersionComplet } from './versionTextuelle'
import { editionsOffertes } from './editionsDuTexte'
import { nettoyerFin } from '@/app/lib/ponctuation'
import FicheEdition, { type VoletFiche } from './FicheEdition'
import { libelleLangue } from '@/app/lib/langues'
import PageTitre, { libelleTrad, formaterEditeur } from './PageTitre'
import BandeauDegradations from './BandeauDegradations'
import { useEditeursCharges } from '@/app/lib/editeurs'
import { adresseEdition } from '@/app/lib/adresseEdition'
import ModaleAuteur from '@/app/components/ModaleAuteur'
import NomVolet from '@/app/components/NomVolet'
// ⛔ STATIQUE, ET C'EST UNE CORRECTION (2026-09-10). Chargé à la demande, ce composant
// partait au PREMIER CLIC SUR UN SEGMENT : sur un onglet ouvert avant un déploiement, son
// morceau de code rendait 404 et Next rechargeait la page en dur, ramenant le lecteur en
// haut. Le geste le plus courant de la lecture ne doit demander AUCUN morceau de code. La
// fenêtre qu'il ouvre, elle, reste à la demande, dans le fichier même.
import AssocierVerset from './AssocierVerset'
import { Fleuron } from './Ornements'
import { FLEURONS, fleuronDe, FLEURON_DU_SITE } from '@/app/lib/fleurons'
import EtoileFavori from '@/app/components/EtoileFavori'
import VisiteGuidee from '@/app/components/VisiteGuidee'
import { CLE_VISITE_OEUVRE, VISITE_OEUVRE } from '@/app/lib/visiteOeuvre'
import BoutonProportions from '@/app/components/BoutonProportions'
import { type SceneVisite } from '@/app/lib/visiteGuidee'
import { offrirLaVisite } from '@/app/lib/demandeDeVisite'
import { useFavoris } from '@/app/lib/useFavoris'
import { refFavoriOriginal } from '@/app/lib/refsFavoris'
import type { NoteRecensee, PlaceSegment } from './notesInventaire'
import OngletCommentaires, { ID_SEGMENT_MAX } from './OngletCommentaires'
import ListeMenuBibles from '@/app/components/ListeMenuBibles'
// ⛔ LE VOLET LIT AUTANT DE BIBLES QUE LA PAGE BIBLE CLASSIQUE (décision de l'auteur,
// 2026-09-16). Ce que le menu offre et par quel chemin chaque texte se lit vivent dans
// `bibleLecturesDisponibles` (module pur, testé) et `bibleVersetsParCanon` (les lectures
// en base) : rien n'en est recopié ici.
import {
  LECTURE_DE_REPLI, lecturesDisponibles, rangDeLaLecture, type LectureBiblique,
} from '@/app/lib/bibleLecturesDisponibles'
import { chargerFaitsDesBibles, chargerTextesParCanon } from '@/app/lib/bibleVersetsParCanon'
// ⛔ L'inventaire des notes est chargé à la DEMANDE : il n'entre dans le paquet que
// lorsqu'un administrateur ouvre son onglet, et jamais dans celui d'un lecteur.
const OngletNotes = dynamic(() => import('./OngletNotes'))
// ⚠️ Le type seul : il s'efface à la compilation et ne ramène donc pas le composant
// dans le paquet que le chargement à la demande vient d'en sortir.
import type { SourceInventaire } from './OngletNotes'
import { BTN_STYLE, BoutonEnregistrerSegment, BoutonCopieSegment, BoutonSignalerSegment } from './BoutonsSegment'
import { useEstMobile, useSansSurvol } from '@/app/lib/useEstMobile'
import { POINTS_DE_RUPTURE } from '@/app/lib/pointsDeRupture'
import { useFermerAEchap } from '@/app/lib/useFermerAEchap'
import { useFenetreModale } from '@/app/lib/useFenetreModale'
import { COMPOSITION_INTITULE, cleTriTitre, complementDeTitre } from '@/app/lib/titres'
import { partagerOpuscules } from '@/app/lib/opuscules'
import IconeChevron from '@/app/components/IconeChevron'
import BarreVoletMobile from '@/app/components/BarreVoletMobile'
import RailVolet from '@/app/components/RailVolet'
import OngletsPage from '@/app/components/OngletsPage'
import { usePoigneeVolet } from '@/app/lib/poigneeVolet'
import { useFoyerAuRepli } from '@/app/lib/useFoyerAuRepli'
import { enregistrerOeuvreRecente } from '@/app/lib/oeuvresRecentes'
import EtatVideVolet, { MentionVide } from '@/app/components/EtatVideVolet'
import { HAUTEUR_BARRE_VOLET, HAUTEUR_NAVBAR, HAUTEUR_SOUS_NAVBAR } from '@/app/lib/mesures'
import { BoutonCopieVerset, BoutonEnregistrerVerset, BoutonSignalerVerset } from './BoutonsVerset'
import { CLASSE_ACTIONS_CARTE_VOLET, CLASSE_CARTE_VOLET, CORPS_CARTE_VOLET, FEUILLE_CARTE_VOLET, INTERLIGNE_CARTE_VOLET, STYLE_CARTE_VOLET } from '@/app/lib/carteVolet'
import { useAffichageAdmin } from '@/app/lib/contexteAffichageAdmin'
import { useCompte } from '@/app/lib/contexteCompte'
import { insererSignalement } from './signalements'
import ModalLienBiblique, { libelleTypeLien, type ChampLienBiblique, type VersetLienBiblique } from '@/app/components/ModalLienBiblique'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'
import { allerAAncre, allerAElement } from '@/app/lib/defilement'
import { hauteurNavbarPx } from '@/app/lib/fenetreContextuelle'
import {
  DUREE_ENTREE_MS,
  DUREE_SORTIE_MS,
  adresseAvecPosition,
  adresseCourante,
  annoncerBascule,
  basculeEnAttente,
  inscrireNiv1DansLAdresse,
  lirePositionRetenue,
  ordonnerBlocsVisibles,
  positionAppliquable,
  reprendreBascule,
  retenirLaPosition,
  segmentEnTeteDeFenetre,
} from '@/app/lib/passageTexte'
import {
  choisirAlignement,
  comparaisonDisponible,
  divisionVoisine,
  divisionPresente,
  libelleLivreComparaison,
  libelleDivisionComparaison,
  type DivisionAlignee,
} from './comparaisonTraductionsUtils'
import { SERIF, SANS } from '@/app/lib/polices'
import { STYLE_POSITION_PAGE, STYLE_RUBRIQUE, TITRE_CARTE } from '@/app/lib/hierarchieTitres'
import IconeCroix from '@/app/components/IconeCroix'

const CHARS_PAR_PAGE = 15000

/**
 * LE REPÈRE DU HAUT DU TEXTE, sous le frontispice.
 *
 * ⛔ Il ne peut pas être le haut de `<main>` : la page de titre s'y rend à CHAQUE
 * page de pagination, et l'on rouvrirait l'œuvre à son frontispice chaque fois qu'on
 * tourne une page.
 *
 * ⛔ Et il ne peut plus être `barre-nav-niv1`, qui portait ce rôle : cette barre n'est
 * rendue qu'en lecture ORDINAIRE — ni en texte entier, ni sur un texte sans niveaux, ni
 * en comparaison. Tourner une page y laissait donc le lecteur exactement où il était,
 * la page neuve commençant au-dessus de lui (relevé de l'auteur, 2026-09-10 : « revoir
 * le changement de page »). Le repère est désormais rendu dans TOUS les modes de
 * lecture, à la place que la barre occupe quand elle existe.
 */
const ANCRE_DEBUT_LECTURE = 'debut-lecture'

// ⛔ `detailsRefBiblique`, `NATURE_LIEN`, `extraireVersetsAvecNature` et `segmentAffichable`
// vivaient ICI, en copie de `page.tsx`. Elles sont dans `./pipelineSegments`, avec leurs
// tests : c'est là qu'elles avaient divergé, et une forme recopiée à deux endroits ne reste
// identique que par accident.

// ⛔ ON CLASSE AVANT DE REGROUPER. Le regroupement ci-dessous ne réunit que des entrées
// ADJACENTES dans la liste ; or la liste arrive rangée par TYPE de lien — citation, puis
// reprise, puis doctrine, puis écho (voir `extraireVersetsAvecNature` et, en amont,
// `hydraterLiensHerites`, qui trie par `type` puis par `id`). Un segment qui REPREND He 11, 24
// et CITE He 11, 25 rendait donc « He 11, 25 » puis « He 11, 24 » : deux occurrences, à rebours,
// là où il n'y a qu'un seul passage. Mesuré le 2026-08-30 sur `liens_bibliques` : 752 segments
// du corpus, 863 occurrences en trop.
//
// Même accident et même remède que l'apparat patristique de la page Bible, où la concaténation
// citations → doctrine → échos fabriquait elle aussi un ordre apparent : il y est classé par la
// chronologie avant d'être regroupé (`PanneauPatristique`, « ET IL EST CLASSÉ »). Ici l'ordre qui
// va de soi est celui du canon. ⛔ Le classement ne vaut QUE pour ce volet : la liste portée par
// le segment garde son ordre de types, dont dépendent l'association et la suppression d'un lien.
const RANG_LIVRE = new Map(LIVRES.map((l, i) => [l.code, i]))

function ordonnerAuCanon<T extends { livre: string; chapitre: string; verset: string }>(versets: T[]): T[] {
  const rang = (v: T) => RANG_LIVRE.get(v.livre) ?? Number.MAX_SAFE_INTEGER
  // `parseInt` et non `Number` : un verset suffixé (« 22a ») se range à sa place au lieu de tomber
  // en NaN. Le regroupement, lui, garde son `Number` — un verset suffixé ne se fond pas.
  const nombre = (s: string) => { const n = parseInt(s, 10); return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER }
  return [...versets].sort((a, b) =>
    rang(a) - rang(b)
    || (a.livre < b.livre ? -1 : a.livre > b.livre ? 1 : 0)
    || nombre(a.chapitre) - nombre(b.chapitre)
    || nombre(a.verset) - nombre(b.verset))
}

// REGROUPEMENTS (affichage seul, la base n'est pas modifiée) : quand un segment cite
// plusieurs versets qui se suivent dans le même chapitre (verset n, n+1, n+2…), on les réunit
// en UNE occurrence — un seul paragraphe, à la suite. On regroupe les entrées adjacentes de la
// liste dont le numéro de verset s'enchaîne sans trou.
function regrouperVersetsConsecutifs<T extends { livre: string; chapitre: string; verset: string }>(versets: T[]): T[][] {
  const groupes: T[][] = []
  for (const v of versets) {
    const dernierGroupe = groupes[groupes.length - 1]
    const prec = dernierGroupe?.[dernierGroupe.length - 1]
    const nPrec = prec ? Number(prec.verset) : NaN
    const nCur = Number(v.verset)
    if (prec && prec.livre === v.livre && prec.chapitre === v.chapitre
        && Number.isFinite(nPrec) && Number.isFinite(nCur) && nCur === nPrec + 1) {
      dernierGroupe.push(v)
    } else {
      groupes.push([v])
    }
  }
  return groupes
}

const SEUIL_TITRE_COLOPHON = 86

// ⛔ Toute la composition de la lecture — paragraphe, vers, argument, numéro de
// segment — vit dans `app/lib/compositionOeuvre.ts`. Elle en est sortie pour que la
// PLANCHE DES STYLES montre ce que cette page FAIT, et non ce qu'on croit qu'elle
// fait : un spécimen qui rejoue une composition de mémoire dérive au premier
// réglage, et fait ensuite autorité contre la page qu'il décrit.

// Appels de note (info-bulle, formes selon le contexte) et outils de titre :
// voir ./appelNote — partagés avec la page de titre.

const TRADUCTIONS_FALLBACK = [
  { code: 'TR0001',    label: 'Bible de Sacy' },
  { code: 'TR0002',     label: 'Bible Segond' },
  { code: 'TR0003', label: 'Bible Crampon' },
  { code: 'TR0004', label: 'Vulgate' },
]

/**
 * Ce que le menu montre avant que la base ait répondu : les quatre bibles de la vue
 * large, dont le texte voyage DÉJÀ avec la page. Aucune n'a de famille ni de graphie —
 * c'est un repli, non un catalogue, et il ne promet donc rien qu'il ne tienne.
 */
const LECTURES_FALLBACK: LectureBiblique[] = TRADUCTIONS_FALLBACK.map(t => ({
  code: t.code, label: t.label, famille: null,
  tradId: t.code, couche: null, chemin: 'canonique', sourceIds: [],
}))

// Extrait le préfixe de numérotation divergente du texte d'un verset.
// Format stocké en DB : "(Psaumes 9, 22 dans la Vulgate) ut quid Domine…"
// Retourne { note, corps } — note est null si le texte est sans préfixe.
function extraireNoteVerset(texte: string): { note: string | null; corps: string } {
  const m = texte.match(/^\(([^)]+)\)\s+(.+)$/s)
  if (m) return { note: m[1], corps: m[2] }
  return { note: null, corps: texte }
}

let _codesTraductionsCache: PromiseLike<string[]> | null = null
function chargerCodesTraductions(): PromiseLike<string[]> {
  if (!_codesTraductionsCache) {
    // Ne garde que les traductions matérialisées dans `versets_lecture` : une colonne
    // inexistante dans le select ferait échouer toute la requête et viderait l'apparat
    // biblique (voir app/lib/traductions.ts).
    _codesTraductionsCache = codesTraductionsLecture(supabase).then(
      codes => codes.length > 0 ? codes : TRADUCTIONS_FALLBACK.map(t => t.code),
      () => TRADUCTIONS_FALLBACK.map(t => t.code),
    )
  }
  return _codesTraductionsCache
}

// ── CE QUE LA PAGE NE REND QU'À LA DEMANDE ────────────────────────────────────
// ⛔ Quatre composants que le lecteur ordinaire ne voit JAMAIS voyageaient dans le même
// paquet que la lecture : la modale d'édition et l'association d'un verset sont réservées
// à l'administrateur, le menu d'extraction ne paraît qu'au clic, et la comparaison de
// traductions qu'en mode comparaison. Ensemble, un cinquième de la source de la page.
//
// ⚠️ SANS `ssr: false`, et c'est délibéré : le chunk CLIENT se sépare, mais le rendu
// serveur ne bouge pas d'un caractère. `ssr: false` retarderait à l'hydratation ce que
// l'administrateur voit aujourd'hui dès le premier écran, et une arrivée par
// « ?compare= » ouvrirait sur du vide.
const ModaleEditionAdmin = dynamic(() => import('./ModaleEditionAdmin'))
const MenuExtraction = dynamic(() => import('./MenuExtraction'))
const BullePartage = dynamic(() => import('@/app/components/BullePartage'))
const ComparaisonTraductions = dynamic(() => import('./ComparaisonTraductions'))

// ── Proposition de lien biblique (non-admin) ──────────────────────────────────
// Le lecteur dispose des DEUX moyens, et non plus du seul texte libre : il choisit ses
// versets dans l'outil de sélection — le même que celui de l'administrateur, à ceci près
// qu'ici RIEN n'est écrit dans `segments` — et il écrit ce qu'il veut à côté, pour dire
// d'où lui vient sa lecture. L'un ou l'autre suffit à envoyer ; les deux valent mieux.
//
// ⛔ La sélection ne s'enregistre pas : elle n'est qu'une façon commode d'ÉCRIRE une
// référence sans se tromper de chiffre. Ce qui part est une proposition, que la
// modération lira.
/**
 * Un bouton d'icône de la TÊTE DU VOLET — la rangée de la roue crantée, de l'étoile et du
 * chevron. ⛔ Il reprend leur géométrie au pixel près : une rangée dont un bouton se
 * dessine autrement cesse d'être une rangée. La forme vit ici et non en style recopié,
 * pour que les deux gestes de sortie (partager, extraire) ne divergent jamais.
 */
// ⚠️ `BoutonVolet` et le menu ⋮ vivent dans `./TeteVolet` : le menu demande un portail
// et un placement — le volet est en `overflow: auto`, une boîte posée dedans s'y ferait
// couper —, et ce n'est pas dans un composant de 4 400 lignes qu'on ajoute cela.

/** Les trois glyphes que le menu ⋮ reprend, écrits UNE fois : la rangée et le menu
 *  montrent le même dessin, et deux copies divergeraient au premier réglage.
 *  ⚠️ LEUR TRAIT S'ACCORDE AU CHEVRON (2026-09-15) : les symboles se montrent désormais à
 *  côté de la flèche qui ferme le volet, et ils doivent peser comme elle. Rendu à
 *  0,8125 rem, le chevron trace 1,22 px ; la roue n'en traçait que 0,87 (un trait de 1,6
 *  dans une boîte de 24) et passe à 2,1, soit 1,14 ; le partage, le plus haut des dessins
 *  (11,7 px d'encre), resserre ses nœuds à 10,8 px et porte son trait à 1,45. */
const ICONE_NIVEAUX = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2.1"/></svg>
)
const ICONE_PARTAGE = (
  // ⛔ DES NŒUDS PLEINS, non des anneaux (2026-09-23, « pixelisés ») : un anneau de
  // deux pixels de rayon, cerné d'un trait d'un pixel et demi, n'a plus de jour au
  // milieu et se rend en tache ; un disque plein reste net à la taille de la rangée.
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M4.8 7.3l6.4-3.4M4.8 8.7l6.4 3.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="12" cy="3.5" r="2.2" fill="currentColor"/>
    <circle cx="12" cy="12.5" r="2.2" fill="currentColor"/>
    <circle cx="4" cy="8" r="2.2" fill="currentColor"/>
  </svg>
)
/* ⚠️ LE MÊME TRACÉ QUE `EtoileFavori`, à la lettre : sous le ⋮, l'étoile doit se
   reconnaître pour celle qui vient de quitter la rangée. Deux états, parce que c'est
   un ÉTAT qu'elle dit et non une action — pleine, l'œuvre est rangée dans les favoris. */
const ICONE_ETOILE = (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1.5l1.854 3.756 4.146.603-3 2.924.708 4.131L8 10.765l-3.708 1.949.708-4.131-3-2.924 4.146-.603z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
)
const ICONE_ETOILE_PLEINE = (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1.5l1.854 3.756 4.146.603-3 2.924.708 4.131L8 10.765l-3.708 1.949.708-4.131-3-2.924 4.146-.603z"/></svg>
)
const ICONE_EXTRACTION = (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 1.8v8.2M4.8 6.9L8 10.1l3.2-3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2.6 12.1v1.1a1 1 0 0 0 1 1h8.8a1 1 0 0 0 1-1v-1.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

function ProposerLienBiblique({ segId }: { segId: number }) {
  const [ouvert, setOuvert] = useState(false)
  const [texte, setTexte] = useState('')
  const [choixOuvert, setChoixOuvert] = useState(false)
  const [selection, setSelection] = useState<{ champ: ChampLienBiblique; versets: VersetLienBiblique[] } | null>(null)
  const [statut, setStatut] = useState<'idle' | 'envoi' | 'ok' | 'err'>('idle')
  const { exigerCompte } = useCompte()
  // ⛔ Le voile et la croix ne servent que le curseur : Échap est le seul chemin du clavier.
  const fermer = useCallback(() => setOuvert(false), [])
  useFermerAEchap(ouvert, fermer)
  const boiteLien = useRef<HTMLDivElement>(null)
  useFenetreModale(boiteLien, ouvert)

  const versets = selection?.versets ?? []
  // Un texte SEUL reste recevable : on peut vouloir signaler un rapprochement sans savoir
  // le référencer. Une sélection SEULE l'est aussi : la référence se suffit alors.
  const peutEnvoyer = versets.length > 0 || texte.trim().length > 0

  const reinitialiser = () => { setTexte(''); setSelection(null); setStatut('idle') }

  const envoyer = async () => {
    if (!peutEnvoyer) return
    setStatut('envoi')
    const morceaux: string[] = []
    if (selection && versets.length > 0) {
      morceaux.push(`${libelleTypeLien(selection.champ)} : ${versets.map(v => v.label).join(' ; ')}`)
    }
    if (texte.trim()) morceaux.push(texte.trim())
    try {
      await insererSignalement({ id_segment: segId, message: `Proposition de lien biblique : ${morceaux.join(' — ')}`, importance: 'important', url_source: window.location.href })
      setStatut('ok')
      setTimeout(() => { setOuvert(false); reinitialiser() }, 1800)
    } catch { setStatut('err') }
  }

  return (
    <>
      {/* ⛔ Une action SECONDAIRE a la forme du site pour ces actions (charte § 51.3) :
          le bouton-lien, sans cadre ni fond. Le cadre en pointillés sur un lavis vert se
          lisait comme une zone de dépôt, et le « + » redisait le verbe. Centré sous
          l'arbre des versets, qui l'est aussi. */}
      <p style={{ margin: 0, display: 'flex', justifyContent: 'center' }}>
        <button type="button" className="cs-bouton-lien"
          onClick={() => { if (!exigerCompte('proposer un lien biblique')) return; reinitialiser(); setOuvert(true) }}>
          Proposer un lien biblique
        </button>
      </p>
      {/* Sous la barre de navigation et bornée en hauteur, comme les autres fenêtres de
          cette page : le pied porte le bouton d'envoi, il ne peut pas sortir de l'écran. */}
      {ouvert && (
        <div onClick={() => setOuvert(false)} style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0, background: 'var(--cs-calque-modale)', zIndex: Z_MODALE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
          {/* ⚠️ `aria-modal` dit à un lecteur d'écran que le reste de la page est hors jeu
              tant que la fenêtre est là ; `aria-label` la nomme, faute d'un titre à viser
              par `aria-labelledby` — le titre vit dans un `<p>`, non dans un rang de titre. */}
          <div ref={boiteLien} role="dialog" aria-modal="true" aria-label="Proposer un lien biblique"
            onClick={e => e.stopPropagation()} style={{ background: 'var(--cs-surface)', borderRadius: '12px', width: 'min(22.5rem, 100%)', maxHeight: `calc(100dvh - ${HAUTEUR_NAVBAR} - 2.5rem)`, display: 'flex', flexDirection: 'column', boxShadow: 'var(--cs-ombre-modale)' }}>
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 22px 10px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cs-vert)', margin: 0 }}>Proposer un lien biblique</p>
              <button onClick={() => setOuvert(false)} aria-label="Fermer" className="cs-croix-fermer"><IconeCroix /></button>
            </div>
            <div className="cs-defilement-discret" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '0 22px' }}>
            {statut === 'ok' ? (
              <p style={{ fontSize: '0.71875rem', color: 'var(--cs-vert)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0 16px' }}>Proposition envoyée, merci&#8239;!</p>
            ) : (
              <>
                <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', fontStyle: 'italic', margin: '0 0 10px', lineHeight: 1.45 }}>
                  Choisissez les versets dans la Bible, ou écrivez la référence et ce qui vous la fait proposer. L’un ou l’autre suffit.
                </p>

                <button type="button" onClick={() => setChoixOuvert(true)}
                  style={{ width: '100%', fontSize: '0.6875rem', color: 'var(--cs-vert)', background: 'rgba(var(--cs-vert-rgb),0.04)', border: '1px dashed var(--cs-bord)', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', textAlign: 'left' }}>
                  {versets.length > 0 ? 'Modifier les versets choisis…' : 'Choisir les versets dans la Bible…'}
                </button>

                {selection && versets.length > 0 && (
                  <div style={{ marginTop: '8px', padding: '8px 10px', background: 'var(--cs-fond-clair)', border: '1px solid var(--cs-fond-doux)', borderRadius: '4px' }}>
                    <p style={{ ...STYLE_RUBRIQUE, margin: '0 0 4px' }}>{libelleTypeLien(selection.champ)}</p>
                    {versets.map(v => (
                      <p key={v.id} style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-fort)', margin: '2px 0 0', lineHeight: 1.4 }}>{v.label}</p>
                    ))}
                    <button type="button" onClick={() => setSelection(null)}
                      className="cs-bouton-lien" style={{ marginTop: '6px' }}>
                      Retirer ce choix
                    </button>
                  </div>
                )}

                <textarea aria-label="Référence proposée" value={texte} onChange={e => setTexte(e.target.value)} rows={3}
                  placeholder="Référence, ou ce qui vous la fait proposer…"
                  style={{ width: '100%', fontSize: '0.6875rem', padding: '7px 9px', marginTop: '8px', border: '1px solid var(--cs-bord)', borderRadius: '4px', background: 'var(--cs-fond-clair)', color: 'var(--cs-texte-fort)', resize: 'vertical', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }} />
              </>
            )}
            </div>
            {statut !== 'ok' && (
              <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', padding: '10px 22px 18px' }}>
                {statut === 'err' && <span style={{ fontSize: '0.6875rem', color: 'var(--cs-danger)', marginRight: 'auto' }}>Erreur d’envoi.</span>}
                <button onClick={() => setOuvert(false)} style={{ fontSize: '0.71875rem', padding: '0.3125rem 0.875rem', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
                <button onClick={envoyer} disabled={statut === 'envoi' || !peutEnvoyer}
                  className="cs-bouton-plein cs-bouton-plein--compact">
                  {statut === 'envoi' ? 'Envoi…' : 'Envoyer'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {choixOuvert && (
        <ModalLienBiblique
          ouvert={choixOuvert}
          titre="Choisir les versets à proposer"
          onFermer={() => setChoixOuvert(false)}
          onValider={(champ, versetsChoisis) => { setSelection({ champ, versets: versetsChoisis }); setChoixOuvert(false) }}
        />
      )}
    </>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
// Les styles des contrôles du volet gauche (Lecture / Texte / Traduction) vivent
// dans `app/lib/stylesVoletLecture.ts`, d'où la page Bible les prend aussi : le même
// geste — choisir comment on lit ce qu'on a sous les yeux — se présente de la même
// façon des deux côtés du site. Ce fichier en portait une COPIE depuis le 2026-08-22,
// le temps d'un chantier ; elle est réunie ici, les deux formes étant encore mot pour
// mot identiques. ⛔ Ne pas en redéclarer une troisième.
/**
 * Le défaut de `blocsOriginal`, en constante de MODULE.
 *
 * ⛔ Un `= {}` dans la destructuration fabriquerait un objet NEUF à chaque rendu.
 * L'état qui recopie cette propriété se recale pendant le rendu (patron des états qui
 * recopient une propriété) : il se recalerait donc à chaque rendu, indéfiniment.
 */
const AUCUN_BLOC: Record<string, BlocOriginal> = {}
const AUCUNE_DEGRADATION: DegradationChargement[] = []
// Des replis STABLES : un objet neuf à chaque rendu changerait l'identité de
// `notesEnRegardCompletes`, et l'effet qui la guette se rejouerait à chaque rendu.
const AUCUNE_NOTE_EN_REGARD: Record<string, Record<string, NoteStructuree>> = {}
const AUCUNE_ANCRE_EN_REGARD: Record<string, AncreNoteStructureeProjection[]> = {}
type NotesEnRegardLues = {
  notes: Record<string, Record<string, NoteStructuree>>
  ancres: Record<string, AncreNoteStructureeProjection[]>
}

/** Les trois onglets du volet de droite. ⛔ « notes » est réservé à l'administration. */
/** Ce que chaque onglet du volet de droite annonce. ⚠️ « Notes » n'est offert qu'à
 *  l'administration : voir `ongletsDuVolet`. */
const LIBELLE_ONGLET_VOLET: Record<OngletDroit, string> = {
  refs: 'Bible',
  commentaires: 'Commentaires',
  notes: 'Notes',
}

/** La tête d'une rubrique du volet de gauche : « Apparat de l'auteur », « Apparat de
 *  l'éditeur » (deux rubriques depuis le 2026-09-15, là où il y avait « Apparat
 *  critique »), « Revenir au texte », « Sommaire ». ⛔ Une seule écriture pour toutes. Le retour au texte se
 *  compose STRICTEMENT comme le sommaire, dont il tient la place (demande de l'auteur,
 *  2026-09-13), et deux copies d'un même style finissent toujours par diverger. */
const TETE_RUBRIQUE: React.CSSProperties = { flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', textAlign: 'left' }

type OngletDroit = 'refs' | 'commentaires' | 'notes'

export default function OeuvreClient({ auteur, auteurId, auteurs: auteursOeuvre = [], idOeuvre, idTexte, versionsTextuelles, alignementsDisponibles, notesStructurees: notesStructureesRecues = AUCUNE_NOTE_EN_REGARD, ancresNotesStructurees: ancresNotesStructureesRecues = AUCUNE_ANCRE_EN_REGARD, notesStructureesPartielles = false, notesOriginales: notesOriginalesRecues = AUCUNE_NOTE_EN_REGARD, ancresNotesOriginales: ancresNotesOriginalesRecues = AUCUNE_ANCRE_EN_REGARD, notesOriginalesPartielles = false, blocsOriginal = AUCUN_BLOC, estAdmin: estAdminReel, niv1List: niv1ListProp, niv1TexteMap: niv1TexteMapProp = {}, niveauxSommaire = 1, niveauxCorps = 1, txtSommaire = [], txtCorps = [], afficherNumeros = true, lectureTexteEntier = false, fleuron = null, titresComposes: titresComposesInit = null, oeuvre, groupes: groupesInit, segments: segmentsInit, tocApparat, groupesApparat: groupesApparatInit, segmentsApparat: segmentsApparatInit, noticesBibliographiques: noticesBibliographiquesInit = {}, degradations = AUCUNE_DEGRADATION, segmentCibleId = null, cibleReprise = false, niv1Initial = null, vueInitiale = 'texte', niv1InitialPartiel = false, comparaisonInitiale = false, alignmentSetIdInitial = null, comparaisonLivreInitial = 1, comparaisonDivisionInitiale = 1, filAriane = null, retour = null }: Props) {
  // La mémoire des visites vit sur le COMPTE, miroitée sur ce poste : une seule porte.
  const { visiteFaite, oublierVisite, profilPret, exigerCompte } = useCompte()
  const { modeUtilisateurStandard } = useAffichageAdmin()
  const estAdmin = estAdminReel && !modeUtilisateurStandard
  // Charge la table des éditeurs (une fois) pour afficher les noms complets répertoriés.
  useEditeursCharges()
  const { favoris: favorisOeuvres, pret: favorisPret, toggle: toggleFavoriOeuvre } = useFavoris('oeuvre')
  const [segActif, setSegActif] = useState<number | null>(cibleReprise ? null : segmentCibleId)
  const [tradIndex, setTradIndex] = useState(0)
  const [lecturesBible, setLecturesBible] = useState<LectureBiblique[]>(LECTURES_FALLBACK)
  const [tradOuverte, setTradOuverte] = useState(false)
  /**
   * Le texte des bibles qui ne vivent PAS dans la vue large, par lecture puis par
   * créneau canonique. Il s'accumule au fil des paragraphes ouverts : revenir sur un
   * passage déjà lu ne redemande rien.
   */
  const [textesHorsVueLarge, setTextesHorsVueLarge] = useState<Record<string, Record<string, string>>>({})
  /**
   * Les créneaux DÉJÀ DEMANDÉS, lecture par lecture.
   *
   * ⛔ Une mémoire à part, et il en faut une : un verset que l'édition ne porte pas ne
   * laisse aucune trace dans les textes reçus, et sans ce registre on le redemanderait à
   * chaque rendu. ⚠️ Il ne se lit que dans l'effet, jamais au rendu — une référence n'est
   * pas une valeur dont l'affichage dépend.
   */
  const versetsDemandes = useRef<Set<string>>(new Set())
  /** La bible par défaut lue au compte du lecteur, appliquée quand la liste est connue. */
  const [defautProfil, setDefautProfil] = useState<string | null>(null)
  // ⛔ Plus d'onglet « Problèmes ». Il listait les passages dont le lien biblique restait
  // à constituer, et vivait de colonnes abolies : la fiabilité est portée AU LIEN depuis
  // le 20 juillet 2026 (charte §24.3), `segments.fiabilite` est vidée et `lien_1` à
  // `lien_4` n'existent plus. Il a été rebâti sur `liens_bibliques`, puis retiré : ce
  // travail relève de l'atelier, non du volet de lecture d'un lecteur.
  // ⛔ « notes » est RÉSERVÉ à l'administrateur : c'est un inventaire d'atelier, qui
  // montre les relectures en attente et les ancres orphelines. Un onglet qu'un lecteur
  // ne doit pas voir ne se garde pas au rendu seulement — il ne se propose pas.
  const [ongletDroit, setOngletDroit] = useState<OngletDroit>('refs')
  const [userId, setUserId] = useState<string | null>(null)
  const [sauvegardesSegs, setSauvegardesSegs] = useState<Set<number>>(new Set())
  const [vue, setVue] = useState<'texte' | 'apparat'>(vueInitiale)
  const [editionCible, setEditionCible] = useState<EditionCible | null>(null)
  const [titreAffiche, setTitreAffiche] = useState(oeuvre.titre)
  const [oeuvreLocale, setOeuvreLocale] = useState<Props['oeuvre']>(oeuvre)
  // Les INTERTITRES COMPOSÉS de l'œuvre (`compositionTitres.ts`). Ils vivent à côté des
  // groupes et non dedans : un titre de division est répété sur tous ses segments, et
  // sa composition ne s'écrit qu'une fois, sur l'œuvre. L'état local suit les retouches
  // de l'administrateur sans recharger la page, comme `oeuvreLocale` pour le frontispice.
  const [titresComposes, setTitresComposes] = useState<TitresComposes>(titresComposesInit ?? {})
  // ⛔ UN CRAYON D'INTERTITRE OUVRE LES DEUX FACES, comme celui du titre de l'œuvre :
  // l'identité de la division d'un côté — elle s'écrit sur tous ses segments et porte la
  // navigation —, sa composition de l'autre, qui ne vaut que cette page. Neuf crayons
  // les ouvrent (barre de division, niveaux 2 à 4, titre et sous-titre) : ils passent
  // tous par ici, faute de quoi l'un d'eux écrirait encore à l'aveugle dans le catalogue.
  const cibleTitre = useCallback((niveau: 1 | 2 | 3 | 4, groupe: GroupeData, schemaTexte: boolean, texteActuel: string): EditionCible => {
    const champ = `niv${niveau}${schemaTexte ? '_texte' : ''}` as ChampTitre
    return {
      type: 'titre', niveau, groupe, texteActuel, schemaTexte,
      variantes: variantesIntertitre(champ, texteActuel, titresComposes[cleTitreCompose(champ, groupe)] ?? ''),
    }
  }, [titresComposes])
  const versionActive = versionsTextuelles.find(version => version.idTexte === idTexte) ?? null
  // ⛔ L'identité de l'édition qu'on lit se prend à la version active, silence compris :
  //    le repli champ par champ mêlait deux éditions (voir `identiteEdition`).
  // ⚠️ L'œuvre VUE PAR UNE ÉDITION : l'identité de la version l'emporte champ par champ.
  //    ⛔ Elle se calcule pour une version QUELCONQUE, et non pour la seule version
  //    active : la fiche « À propos » en compose deux en lecture bilingue, et deux
  //    projections écrites à part auraient divergé au premier champ ajouté.
  const oeuvrePourVersion = useCallback((v: VersionTextuelle | null): Props['oeuvre'] => {
    const identite = identiteEdition(oeuvreLocale, v)
    return {
      ...oeuvreLocale,
      // `Props['oeuvre']` ne connaît pas le null sur ces champs : une identité absente
      // s'y écrit undefined, et les gardes de rendu la lisent pareil.
      trad_auteur: identite.traducteur ?? undefined,
      editeur: identite.editeur ?? undefined,
      ville: identite.ville ?? undefined,
      date_publication: identite.datePublication ?? undefined,
      // ⚠️ La collection de l'ŒUVRE ne décrit que son texte par défaut : servie telle
      //    quelle sur le latin de Knöll, elle le rangeait dans les « Œuvres complètes
      //    de saint Augustin » de Vivès.
      collection: identite.collection ?? undefined,
      // ⛔ La source de l'ŒUVRE ne décrit que son texte PAR DÉFAUT, comme son adresse : le
      //    latin d'Eucher, qui n'en déclare aucune, offrait la source Gallica du français.
      url_source: v ? (v.sourceUrl ?? (v.isDefault ? oeuvreLocale.url_source : undefined)) : oeuvreLocale.url_source,
      commentaire_traduction: v && !v.isDefault
        ? null
        : oeuvreLocale.commentaire_traduction,
    }
  }, [oeuvreLocale])
  const oeuvreAffichee = useMemo<Props['oeuvre']>(
    () => oeuvrePourVersion(versionActive), [oeuvrePourVersion, versionActive])
  // ⛔ LA BARRE MOBILE RESTE POSÉE QUAND SON TIROIR S’OUVRE (relevé de l’auteur,
  //    2026-09-09 : « il faut idéalement garder la barre Sommaire intacte, identique ;
  //    on ne sait pas où fermer ou comment revenir »). Elle disparaissait au profit
  //    d’un en-tête de tiroir dont la flèche regardait à GAUCHE, c’est-à-dire vers le
  //    rail du BUREAU, qui n’existe pas sur un téléphone. Le tiroir se pose donc SOUS
  //    la barre (ou dessus, en pied), et c’est la barre qui ferme.
  //    ⚠️ Sa hauteur se NOMME, comme celle de la barre de navigation : le tiroir compose
  //    son `top` et son plafond dessus, et un nombre recopié les désaccorderait.
  //    38 px = 2 × 0,6875rem de rembourrage + la ligne du libellé à 0,8125rem.
  const [navOuverte, setNavOuverte] = useState(true)
  const [panneauOuvert, setPanneauOuvert] = useState(true)
  // ≤ 900px : nav et apparat en barres fixes + tiroirs (voir AGENTS § mobile).
  const mobile = useEstMobile()

  // Mémorise l'ÉDITION ouverte dans les « dernières consultées » (survol de
  // « Patristique » dans la navbar). Local au navigateur. Le texte ne se retient que
  // s'il n'est pas celui que l'œuvre ouvre par défaut, et l'édition se nomme pour
  // départager deux entrées de même titre.
  const texteRecent = versionActive && !versionActive.isDefault ? versionActive.idTexte : null
  const editionRecente = versionActive ? libelleVersionComplet(versionActive) : null
  useEffect(() => {
    enregistrerOeuvreRecente({ id: idOeuvre, titre: oeuvre.titre, auteur, texte: texteRecent, edition: editionRecente })
  }, [idOeuvre, oeuvre.titre, auteur, texteRecent, editionRecente])
  // Mobile : actions de segment masquées, révélées à l'appui long (comme les
  // versets de la page Bible).
  const [infoEditionOuverte, setInfoEditionOuverte] = useState(false)
  // Le menu d'extraction, et la fenêtre de partage.
  const [extractionOuverte, setExtractionOuverte] = useState(false)
  /**
   * PARTAGER LA PAGE. ⚠️ Le geste ouvre la bulle partagée du site
   * (`app/components/BullePartage.tsx`), qui compose la ligne et offre les canaux ;
   * cette page ne connaît que le SUJET — un auteur, un titre — et l'ANCRE, c'est-à-dire
   * le rectangle du bouton qui a servi : la bulle s'ouvre à côté de lui.
   * ⛔ Elle ne copiait le lien qu'à défaut de partage natif, et ne nommait aucun canal :
   * la règle est levée par décision de l'auteur, 2026-09-10.
   * ⚠️ L'état EST l'ancre : `null` ferme, un rectangle ouvre. Deux états pour un seul
   * fait se désaccorderaient au premier réglage.
   */
  const [ancrePartage, setAncrePartage] = useState<DOMRect | null>(null)
  // Identifiant de l'auteur dont la fiche est ouverte (null = aucune). Une œuvre
  // pouvant être signée à deux, il ne suffit plus de savoir QU'une fiche est
  // ouverte : il faut savoir LAQUELLE.
  const [auteurModalId, setAuteurModalId] = useState<string | null>(null)
  // La lecture se fait EN PARAGRAPHES, et il n'y a plus d'autre façon : les segments
  // d'un même paragraphe coulent en un seul bloc, leur délimitation n'apparaissant
  // qu'au survol.
  //
  // ⛔ Le mode « segments » (un segment = un bloc, gouttière d'actions à droite) est
  // retiré, avec le choix qui l'offrait. Les SEGMENTS, eux, restent entiers : ils sont
  // l'unité de numérotation, d'ancre, de signet, de prélèvement et de renvoi. Ce qui
  // disparaît est une MISE EN PAGE, non une structure.
  //
  // Une œuvre dont les segments n'ont pas de `paragraphe` se lit sans dommage : le
  // garde-fou de `paragraphesDe` isole alors chaque segment dans son propre bloc, ce
  // qui rend très exactement ce que faisait l'ancien mode. C'est pourquoi le drapeau
  // `eligibleParagraphes` a pu partir avec lui : il ne gardait plus aucune porte.
  // L'original en regard vient d'UNE source, `blocsOriginal` : le texte est lu dans SES
  // PROPRES segments, sous son propre `id_texte`, et l'alignement dit quel bloc répond à
  // quel paragraphe. ⛔ La copie `segments.texte_original` ne sert plus (2026-09-22) :
  // voir `bilingueAlignement.ts`.
  // Les blocs reçus du serveur ne couvrent que la division rendue : changer de division
  // en apporte d'autres, qu'on ACCUMULE. D'où un état, recalé sur la propriété PENDANT
  // le rendu (patron des états qui recopient une propriété, charte § linter) : dans un
  // effet, la division précédente paraîtrait un instant en regard de la nouvelle.
  const [blocsRecus, setBlocsRecus] = useState(blocsOriginal)
  const [blocsOriginalEtat, setBlocsOriginalEtat] = useState(blocsOriginal)
  if (blocsRecus !== blocsOriginal) { setBlocsRecus(blocsOriginal); setBlocsOriginalEtat(blocsOriginal) }

  const blocsAlignes = useMemo(() => Object.keys(blocsOriginalEtat).length > 0, [blocsOriginalEtat])
  const aTexteOriginal = blocsAlignes

  // ── LA PAIRE DE LECTURE ────────────────────────────────────────────────────
  // Quelle traduction, quel original, quel alignement : la règle vit dans
  // `paireDeLecture.ts`, avec ses tests, et le SERVEUR l'applique à l'identique — sans
  // quoi la page préchargerait l'original que le client ne compose pas.
  // ⛔ Ce choix ne se fait plus par des `find(...)` posés côte à côte : « la première
  // traduction venue » désignait, sur une œuvre à deux éditions de 1866, l'instantané
  // de travail retiré du service, et « Français & Latin » y emmenait l'administrateur.
  const paireDeLecture = useMemo(
    () => choisirPaireDeLecture({
      idTexteActif: idTexte,
      versions: versionsTextuelles,
      alignements: alignementsDisponibles,
      langueOriginale: oeuvre.langue_originale,
    }),
    [idTexte, versionsTextuelles, alignementsDisponibles, oeuvre.langue_originale],
  )
  // Le texte en langue originale de CETTE œuvre, s'il en a un et si ce n'est pas celui
  // qu'on lit : c'est lui que l'alignement met en regard.
  const idTexteEnRegard = paireDeLecture.idTexteEnRegard
  const ensembleBilingue = paireDeLecture.ensembleBilingue
  // ⛔ LES NOTES DU TEXTE EN REGARD ne partent avec la page que pour ce qu'elle compose
  // (`notesEnRegard.ts`) : l'apparat entier de Knöll faisait l'essentiel des 4,5 Mo de
  // HTML des Confessions. Le reste se demande ici, UNE fois, dès qu'il sert : la lecture
  // en regard (l'inventaire des notes) ou une autre division (sa colonne originale).
  // ⚠️ Une fonction qui compose en différé lit le résultat de la PROMESSE, jamais l'état :
  // celui-ci est celui du rendu où elle a été créée.
  const [notesEnRegardChargees, setNotesEnRegardChargees] = useState<NotesEnRegardLues | null>(null)
  const notesOriginales = notesEnRegardChargees?.notes ?? notesOriginalesRecues
  const chargementNotesEnRegardRef = useRef<Promise<NotesEnRegardLues> | null>(null)
  const notesEnRegardCompletes = useCallback((): Promise<NotesEnRegardLues> => {
    const recues: NotesEnRegardLues = { notes: notesOriginalesRecues, ancres: ancresNotesOriginalesRecues }
    if (!notesOriginalesPartielles || !idTexteEnRegard) return Promise.resolve(recues)
    if (!chargementNotesEnRegardRef.current) {
      const incidents: DegradationChargement[] = []
      chargementNotesEnRegardRef.current = chargerNotesStructurees(supabase, idTexteEnRegard, incidents)
        .then(({ notesParSegment, ancresParSegment }) => {
          if (incidents.length > 0) console.error(`[lecture] notes du texte en regard (${idTexteEnRegard}) :`, incidents)
          const lues = { notes: notesParSegment, ancres: ancresParSegment }
          setNotesEnRegardChargees(lues)
          return lues
        })
        .catch((erreur: unknown) => {
          // Couche secondaire : sans elle, la colonne originale garde ce que la page a reçu.
          console.error(`[lecture] notes du texte en regard illisibles (${idTexteEnRegard}) :`, erreur)
          chargementNotesEnRegardRef.current = null
          return recues
        })
    }
    return chargementNotesEnRegardRef.current
  }, [notesOriginalesPartielles, idTexteEnRegard, notesOriginalesRecues, ancresNotesOriginalesRecues])
  // ⛔ LES NOTES DU TEXTE LU, de même (2026-09-21) : la page n'envoie que celles des segments
  // qu'elle rend, et AUCUNE ancre (`notesDuTexteUtiles`). Les Homélies sur la Genèse
  // envoyaient leurs 1 318 notes et leurs ancres en double de ce que portent les segments.
  // Le tout se demande UNE fois, quand il sert : l'inventaire des notes, une autre
  // division, l'apparat rechargé — les seuls lieux qui recomposent ou recensent.
  const [notesDuTexteChargees, setNotesDuTexteChargees] = useState<NotesEnRegardLues | null>(null)
  const [notesDuTexteEchec, setNotesDuTexteEchec] = useState(false)
  const notesStructurees = notesDuTexteChargees?.notes ?? notesStructureesRecues
  const chargementNotesDuTexteRef = useRef<Promise<NotesEnRegardLues> | null>(null)
  const notesDuTexteCompletes = useCallback((): Promise<NotesEnRegardLues> => {
    const recues: NotesEnRegardLues = { notes: notesStructureesRecues, ancres: ancresNotesStructureesRecues }
    // Tout est là : les notes entières, et leurs ancres (ou aucune note à ancrer).
    const aucuneNote = Object.keys(notesStructureesRecues).length === 0
    const ancresRecues = Object.keys(ancresNotesStructureesRecues).length > 0
    if (!notesStructureesPartielles && (aucuneNote || ancresRecues)) return Promise.resolve(recues)
    if (!chargementNotesDuTexteRef.current) {
      const incidents: DegradationChargement[] = []
      chargementNotesDuTexteRef.current = chargerNotesStructurees(supabase, idTexte, incidents)
        .then(({ notesParSegment, ancresParSegment }) => {
          if (incidents.length > 0) console.error(`[lecture] notes du texte (${idTexte}) :`, incidents)
          const lues = { notes: notesParSegment, ancres: ancresParSegment }
          setNotesDuTexteChargees(lues)
          setNotesDuTexteEchec(false)
          return lues
        })
        .catch((erreur: unknown) => {
          // Couche secondaire : sans elle, on recompose avec ce que la page a reçu.
          console.error(`[lecture] notes du texte illisibles (${idTexte}) :`, erreur)
          chargementNotesDuTexteRef.current = null
          setNotesDuTexteEchec(true)
          return recues
        })
    }
    return chargementNotesDuTexteRef.current
  }, [notesStructureesPartielles, idTexte, notesStructureesRecues, ancresNotesStructureesRecues])
  // L'inventaire n'est exhaustif qu'une fois le tout arrivé ; avant, il attend.
  const notesDuTextePretes = !notesStructureesPartielles || notesDuTexteChargees !== null
  // Mode d'affichage du texte : français seul, bilingue (français + latin), latin seul.
  const [modeTexte, setModeTexte] = useState<'fr' | 'bilingue' | 'la'>('fr')
  // « Traductions parallèles » est désactivé pour le moment (mode de lecture jugé
  // trop complexe). On force l'indisponibilité : les boutons disparaissent et le
  // mode est neutralisé partout (via modeComparaisonActif). Réversible d'une ligne :
  // rétablir `comparaisonDisponible(alignementsDisponibles)`.
  const COMPARAISON_ACTIVE = false
  const comparaisonEstDisponible = COMPARAISON_ACTIVE && comparaisonDisponible(alignementsDisponibles)
  const [alignmentSetId, setAlignmentSetId] = useState<string | null>(alignmentSetIdInitial)
  const alignementActif = choisirAlignement(alignementsDisponibles, alignmentSetId)
  const [modeComparaison, setModeComparaison] = useState(comparaisonInitiale)
  const modeComparaisonActif = comparaisonEstDisponible && modeComparaison && Boolean(alignementActif)
  // Navigation de la comparaison, MENÉE COMME LA LECTURE : l'état (livre, division,
  // liste ordonnée des divisions alignées) vit ici pour alimenter à la fois le
  // sommaire de gauche et la barre « ‹ Livre — Division › », exactement comme les
  // niveaux du texte alimentent le sommaire et la barre de niveau 1.
  const [comparaisonDivisions, setComparaisonDivisions] = useState<DivisionAlignee[]>([])
  const [comparaisonBook, setComparaisonBook] = useState(() => Number.isInteger(comparaisonLivreInitial) && comparaisonLivreInitial >= 1 ? comparaisonLivreInitial : 1)
  const [comparaisonDivision, setComparaisonDivision] = useState(() => Number.isInteger(comparaisonDivisionInitiale) && comparaisonDivisionInitiale >= 1 ? comparaisonDivisionInitiale : 1)
  const fermerComparaison = () => {
    setModeComparaison(false)
    const params = new URLSearchParams(window.location.search)
    params.delete('compare')
    params.delete('book')
    params.delete('division')
    router.replace(`${window.location.pathname}${params.size ? `?${params.toString()}` : ''}`, { scroll: false })
  }
  // ⛔ NE PAS SUPPRIMER PARCE QUE « PERSONNE NE L'APPELLE ». Cette fonction n'a plus de
  // bouton depuis la refonte des sélecteurs de lecture (18 août 2026), et c'est VOULU :
  // tout l'appareil de comparaison dort derrière `COMPARAISON_ACTIVE = false`, quelques
  // lignes plus haut, où il est dit réversible d'une ligne. Le linter la signale comme
  // morte ; elle est en sommeil, ce qui n'est pas la même chose. La rétablir demande de
  // remettre `COMPARAISON_ACTIVE` à vrai ET de lui rendre un point d'entrée.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- en sommeil, voir ci-dessus
  const ouvrirLectureParallele = (setId: string) => {
    setVue('texte')
    setAlignmentSetId(setId)
    setModeComparaison(true)
    const params = new URLSearchParams(window.location.search)
    params.set('compare', setId)
    params.set('book', String(comparaisonBook))
    params.set('division', String(comparaisonDivision))
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false })
  }
  // Va à une division alignée (depuis le sommaire de gauche ou les flèches ‹ ›),
  // met l'URL à jour et ramène en haut du texte — comme un changement de niveau 1.
  const naviguerComparaison = (book: number, division: number) => {
    setComparaisonBook(book)
    setComparaisonDivision(division)
    const params = new URLSearchParams(window.location.search)
    if (alignementActif) params.set('compare', alignementActif.alignmentSetId)
    params.set('book', String(book))
    params.set('division', String(division))
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false })
    if (mobile) setNavOuverte(false)
    allerAAncre('barre-nav-division')
  }
  // Charge la liste ordonnée des divisions alignées à l'entrée en comparaison, avec
  // le TITRE EXACT de chaque division tiré de la traduction de référence (niv1/niv2),
  // pour que le sommaire soit identique à celui de la lecture. Recale la division
  // courante sur la première disponible si elle est hors liste.
  useEffect(() => {
    if (!comparaisonEstDisponible || !alignementActif || !modeComparaison) return
    let actif = true
    ;(async () => {
      const { data: alnData, error } = await supabase.from('texte_alignements')
        .select('alignment_id,book,canonical_division_order')
        .eq('alignment_set_id', alignementActif.alignmentSetId)
        .order('book').order('canonical_division_order')
      if (!actif || error || !alnData) return
      // Une entrée par division (dans l'ordre), avec un groupe représentatif dont on
      // lira le titre côté référence.
      const parDivision = new Map<string, { book: number; division: number; alignmentId: string }>()
      for (const row of alnData as { alignment_id: string; book: number; canonical_division_order: number }[]) {
        const cle = `${row.book}|${row.canonical_division_order}`
        if (!parDivision.has(cle)) parDivision.set(cle, { book: row.book, division: row.canonical_division_order, alignmentId: row.alignment_id })
      }
      const reps = [...parDivision.values()]
      // ⛔ LA CLAUSE SE DÉCOUPE EN OCTETS D’ADRESSE. Une liste d’identifiants
      // d’alignement non bornée franchit les ~25 000 octets que la passerelle accorde,
      // et rend un « 400 » NU, sans code ni message : c’est la panne du 29 août 2026,
      // et ces deux clauses en portaient encore le motif.
      const lotsMembres = await Promise.all(lotsPourClauseIn(reps.map(rep => rep.alignmentId)).map(lot =>
        supabase.from('texte_alignement_membres')
          .select('alignment_id,segment_key').eq('role', 'reference').in('alignment_id', lot)))
      const memErreur = lotsMembres.find(r => r.error)?.error
      if (memErreur) console.warn('[oeuvre] divisions alignées : membres non chargés', memErreur)
      const memData = lotsMembres.flatMap(r => r.data ?? [])
      const cleParAlignement = new Map<string, string>()
      for (const row of (memData ?? []) as { alignment_id: string; segment_key: string }[]) if (!cleParAlignement.has(row.alignment_id)) cleParAlignement.set(row.alignment_id, row.segment_key)
      const segKeys = [...cleParAlignement.values()]
      // ⚠️ Une clé de segment fait de trente à quatre-vingts signes : c’est ICI que
      // l’adresse enflait le plus vite.
      const lotsTitres = segKeys.length
        ? await Promise.all(lotsPourClauseIn(segKeys).map(lot =>
            supabase.from('segments').select('segment_key,ref_niv1,ref_niv2').in('segment_key', lot)))
        : []
      const segErreur = lotsTitres.find(r => r.error)?.error
      if (segErreur) console.warn('[oeuvre] divisions alignées : titres non chargés', segErreur)
      const segData = lotsTitres.flatMap(r => r.data ?? [])
      const titreParCle = new Map<string, { niv1: string | null; niv2: string | null }>()
      for (const row of (segData ?? []) as { segment_key: string; ref_niv1: string | null; ref_niv2: string | null }[]) titreParCle.set(row.segment_key, { niv1: row.ref_niv1, niv2: row.ref_niv2 })
      const liste: DivisionAlignee[] = reps.map(rep => {
        const segKey = cleParAlignement.get(rep.alignmentId)
        const titre = segKey ? titreParCle.get(segKey) : undefined
        return { book: rep.book, division: rep.division, niv1: titre?.niv1 ?? undefined, niv2: titre?.niv2 ?? undefined }
      })
      if (!actif) return
      setComparaisonDivisions(liste)
      if (liste.length > 0 && !divisionPresente(liste, comparaisonBook, comparaisonDivision)) {
        setComparaisonBook(liste[0].book)
        setComparaisonDivision(liste[0].division)
      }
    })()
    return () => { actif = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparaisonEstDisponible, alignementActif?.alignmentSetId, modeComparaison])
  useEffect(() => {
    try {
      // Un lien direct « ?mt=la » (texte original / bilingue) l'emporte sur la
      // préférence enregistrée : il ouvre l'œuvre exactement dans le mode demandé.
      const urlMt = new URLSearchParams(window.location.search).get('mt')
      if (urlMt === 'fr' || urlMt === 'bilingue' || urlMt === 'la') {
        setModeTexte(urlMt)
        return
      }
      // ⛔ LE FRANÇAIS SEUL EST LE DÉFAUT, ET IL LE REDEVIENT À CHAQUE VISITE
      // (demande de l'auteur, 2026-09-10). Le mode se gardait dans `localStorage`,
      // c'est-à-dire SANS FIN : une œuvre ouverte une fois en « Français & Latin »
      // se rouvrait en deux colonnes des semaines plus tard, sans que rien à l'écran
      // dise d'où venait ce choix — le volet montrait un mode que le lecteur n'avait
      // pas demandé ce jour-là. Le choix suit désormais la SESSION : il tient le temps
      // qu'on lit, d'un chapitre à l'autre et d'une page du site à l'autre, et il
      // tombe quand le navigateur se referme.
      // ⚠️ L'ANCIENNE CLÉ `cs_bilingue_<œuvre>` N'EST PLUS RELUE. Plus rien ne l'écrit,
      // mais elle dort encore dans les navigateurs qui l'ont reçue, et elle y rouvrait
      // le bilingue à elle seule, sans que le lecteur puisse la défaire autrement qu'en
      // choisissant « Français » une fois de plus.
      const mt = sessionStorage.getItem(`cs_modetexte_${idOeuvre}`)
      if (mt === 'fr' || mt === 'bilingue' || mt === 'la') setModeTexte(mt)
    } catch {}
  }, [idOeuvre])

  // ── UNE LECTURE EN REGARD NE S'OUVRE JAMAIS À VIDE ─────────────────────────
  // ⛔ Le mode demandé ne vaut que si une colonne peut RÉELLEMENT se composer en face
  // du texte lu : un ensemble d'alignement qui couvre ce texte. Sans cela, « Français &
  // Latin » allumait son bouton et
  // ne rendait qu'une colonne (relevé sur A0010O0100 le 2026-09-05), et « Latin »
  // masquait le français pour ne rien mettre à sa place — une page blanche, qu'une
  // préférence gardée dans le navigateur suffisait à rouvrir.
  const enRegardSurPlace = paireDeLecture.enRegardSurPlace
  const modeTexteEffectif = modeDeLectureEffectif(modeTexte, paireDeLecture)
  const affichageBilingue = modeTexteEffectif === 'bilingue'
  useEffect(() => {
    if (affichageBilingue && ensembleBilingue && notesOriginalesPartielles) void notesEnRegardCompletes()
  }, [affichageBilingue, ensembleBilingue, notesOriginalesPartielles, notesEnRegardCompletes])
  // ⛔ L'inventaire des notes charge les siennes À L'OUVERTURE de l'onglet, et pas avant.
  useEffect(() => {
    if (ongletDroit === 'notes' && estAdmin && notesStructureesPartielles) void notesDuTexteCompletes()
  }, [ongletDroit, estAdmin, notesStructureesPartielles, notesDuTexteCompletes])
  // L'ÉDITION MISE EN REGARD, quand c'en est une autre : la page de titre la nomme au
  // même titre que celle qu'on lit. `ensembleBilingue` est la garde qui compte.
  const versionEnRegard = affichageBilingue && ensembleBilingue && idTexteEnRegard
    ? versionsTextuelles.find(version => version.idTexte === idTexteEnRegard) ?? null
    : null
  // ⛔ L'ÉDITION DE L'ORIGINAL, quand c'en est une autre : une citation nomme l'édition du
  // passage (charte § 5.5.1), et le latin est une édition à part entière. ⚠️ `versionEnRegard`
  // ne vaut que sous la lecture EN REGARD, parce que la page de titre ne nomme deux éditions
  // que là ; le latin lu SEUL demande pourtant la même version.
  const versionDeLOriginal = ensembleBilingue && idTexteEnRegard
    ? versionsTextuelles.find(version => version.idTexte === idTexteEnRegard) ?? null
    : null
  const afficherOriginalSeul = modeTexteEffectif === 'la'
  // ⚠️ Une colonne originale se compose dans les DEUX modes : en regard du français, ou
  // seule à sa place. Les deux surfaces qui la portent — la lecture et l'argument — le
  // demandent, et il n'y a qu'une façon de le dire.
  const enRegardTexte = affichageBilingue || afficherOriginalSeul
  // ⚠️ Le rattrapage d'un lien « ?mt=bilingue » incohérent est plus bas, avec `router` :
  // il déplace le lecteur, et non seulement le mode. Voir « UN LIEN QUI NE MÈNE À RIEN ».
  // Libellés du choix de lecture selon la langue de l'original (grec ou, par défaut, latin).
  // La langue s'écrit « Grec » ou « grec » selon les fiches : la comparaison stricte
  // laissait passer la minuscule, et un texte grec repartait alors avec les libellés
  // et le syllabateur latins.
  const estGrec = /grec/i.test(oeuvre.langue_originale ?? '')
  const basculerTexte = (mode: 'fr' | 'bilingue' | 'la') => {
    if (modeComparaisonActif) fermerComparaison()
    setModeTexte(mode)
    try {
      // Le mode retenu vaut pour la SESSION (voir « LE FRANÇAIS SEUL EST LE DÉFAUT ») :
      // il suit le lecteur d'une page à l'autre, il ne le suit pas d'un jour à l'autre.
      sessionStorage.setItem(`cs_modetexte_${idOeuvre}`, mode)
    } catch {}
  }
  // ⛔ LA GOUTTIÈRE D'ACTIONS EST RETIRÉE (2026-08-25). Les boutons signaler, prélever et
  // copier vivaient dans une colonne d'environ 60px réservée à droite du texte, et tout
  // ce qui se centrait — page de titre, fleuron, titres de rang 1 et 2, barre de
  // circulation, pagination — portait un `paddingRight` de 60px pour se recentrer sur le
  // corps du texte seul. Le centre de la lecture tombait donc trente pixels à gauche du
  // centre du bloc, et cela se voyait. La cellule d'actions FLOTTE désormais hors de la
  // colonne (règle dans app/lib/celluleActions.ts) : la gouttière n'a plus d'objet, et sa
  // compensation non plus.
  //
  // ⚠️ La JUSTIFICATION, elle, ne change pas : on retranche les 60px de la COLONNE au lieu
  // de les retrancher de chacun de ses blocs. Le texte garde exactement sa largeur, et
  // tout se centre enfin sur l'axe du bloc, entre les deux volets. En rem et non en
  // pixels : la racine grandit avec l'écran, la gouttière ne le faisait pas — 35rem moins
  // 3,75rem, soit les 60px de la racine 16. Sur mobile il n'y avait pas de gouttière : la
  // largeur ne bouge pas.
  // ⛔ LA LECTURE EN REGARD A SA PROPRE MESURE, 42 rem (décision de l'auteur,
  // 2026-08-30 : « tu peux éventuellement augmenter la largeur des colonnes ; on peut
  // tolérer quelques retours à la ligne disgracieux, mais il faut des limites »). Deux
  // colonnes dans la mesure d'UNE seule en laissaient 266 px au français et 209 au
  // latin. C'est trop peu pour un vers, qui ne se coupe pas : mesurés un par un dans
  // leur composition réelle, les 2 011 vers de Boèce s'y enroulaient 468 fois, soit
  // près d'un sur quatre. À 42 rem, il en reste TROIS. Le détail est dans AGENTS.md.
  // ⚠️ La prose y gagne aussi : sa colonne latine passe de 209 à 295 px.
  // ⛔ Le « Latin seul » garde 31,25 rem : il n'a qu'une colonne, et une colonne de
  // 672 px n'est plus une mesure de lecture.
  const largeurLecture = modeComparaisonActif ? '52rem'
    : mobile ? '35rem'
    : affichageBilingue ? '42rem'
    : '31.25rem'

  // Survol d'un segment en mode paragraphes : cellule d'actions flottante ancrée
  // sur le segment (via portail, pour n'être pas clippée par le corps).
  // La cellule d'actions du site : à droite du segment, au-dessus si la place manque,
  // jamais par-dessus. Elle sert la lecture en paragraphes ET les arguments hissés en
  // tête de division, qui la posaient jusqu'ici EN ABSOLU dans leur coin haut droit,
  // c'est-à-dire sur leur première ligne.
  const cellule = useCelluleActions<number>()
  // ⛔ L'axe est la CAPACITÉ DU POINTEUR, jamais la largeur : une tablette de 1024 px en
  // paysage n'a pas de souris, et « mobile » y est faux (charte, « LE DOIGT »).
  const sansSurvol = useSansSurvol()
  // ⛔ LES DEUX BARRES MOBILES DE LA LECTURE SONT DU CHROME FIXE, ET LA CELLULE
  //    D’ACTIONS PASSE DESSOUS depuis que `Z_FLOTTANT` est descendu sous `Z_FENETRE`
  //    (2026-09-09). Sans ces deux bornes, un segment tapé près d’un bord poserait sa
  //    cellule DERRIÈRE une barre, c’est-à-dire nulle part. Elle les couvrait jusque-là,
  //    ce qui n’était pas mieux : on masquait une navigation pour montrer quatre boutons.
  //    ⚠️ Les deux se MESURENT, jamais ne se calculent : la hauteur d’une barre est en
  //    rem (`0.6875rem` de rembourrage), et la racine du site est fluide de 16 à 22 px.
  //    ⚠️ Hors mobile, les deux références sont nulles et la cellule reprend ses bornes
  //    par défaut — le bas de la barre de navigation, le bas de la fenêtre.
  const barreSommaireRef = useRef<HTMLButtonElement>(null)
  const barreBibleRef = useRef<HTMLButtonElement>(null)
  const bandeDeLecture = () => ({
    sommet: barreSommaireRef.current?.getBoundingClientRect().bottom,
    pied: barreBibleRef.current?.getBoundingClientRect().top,
  })
  // null = largeur AUTO (responsive, s'adapte à l'écran, plancher de lisibilité) ;
  // number = largeur fixée à la main (drag), en px.
  const [navWidth, setNavWidth] = useState<number | null>(null)
  const [pannWidth, setPannWidth] = useState<number | null>(null)
  const voletsDirty = navWidth !== null || pannWidth !== null
  const refNav = useRef<HTMLElement>(null)
  const refAside = useRef<HTMLElement>(null)
  // ── Les deux volets : identifiants, poignées, foyer rendu, tiroirs modaux ──────────
  // (audit d'harmonie, 2026-09-23 : la page Bible faisait tout cela, l'œuvre rien).
  const idVoletGauche = useId()
  const idVoletDroit = useId()
  const idPanneauDroit = useId()
  const idOngletDroit = useCallback((c: string) => `${idPanneauDroit}-onglet-${c}`, [idPanneauDroit])
  const poigneeGauche = usePoigneeVolet({
    largeur: navWidth, mesurer: () => refNav.current?.getBoundingClientRect().width,
    changer: setNavWidth, min: 120, max: 400, cote: 'gauche', controle: idVoletGauche,
  })
  const poigneeDroite = usePoigneeVolet({
    largeur: pannWidth, mesurer: () => refAside.current?.getBoundingClientRect().width,
    changer: setPannWidth, min: 200, max: 560, cote: 'droite', controle: idVoletDroit,
  })
  // Replier rend le foyer au rail, déplier au chevron (voir `useFoyerAuRepli`).
  const refRailGauche = useRef<HTMLButtonElement>(null)
  const refChevronGauche = useRef<HTMLButtonElement>(null)
  const refRailDroit = useRef<HTMLButtonElement>(null)
  const refChevronDroit = useRef<HTMLButtonElement>(null)
  useFoyerAuRepli(navOuverte, refRailGauche, refChevronGauche)
  useFoyerAuRepli(panneauOuvert, refRailDroit, refChevronDroit)
  // ⛔ SUR UN TÉLÉPHONE, UN VOLET OUVERT EST UN TIROIR MODAL, comme sur la page Bible :
  // `role="dialog"`, Échap, et le foyer pris dans le tiroir puis rendu à la barre.
  // ⚠️ `voletsPrets` attend que l'arrivée ait fermé les volets d'un téléphone : sans lui,
  // le premier rendu, volets encore ouverts, prendrait le foyer pour le rendre aussitôt.
  const [voletsPrets, setVoletsPrets] = useState(false)
  const tiroirSommaire = mobile && navOuverte && voletsPrets
  const tiroirReferences = mobile && panneauOuvert && voletsPrets
  const fermerSommaire = useCallback(() => setNavOuverte(false), [])
  const fermerReferences = useCallback(() => setPanneauOuvert(false), [])
  useFermerAEchap(tiroirSommaire, fermerSommaire)
  useFenetreModale(refNav, tiroirSommaire)
  useFermerAEchap(tiroirReferences, fermerReferences)
  useFenetreModale(refAside, tiroirReferences)
  // ⛔ La configuration est NORMALISÉE à l'ouverture : bornée à ce que chaque surface
  // sait rendre, chapeaux éteints au-dessus de leur niveau. La règle et ses mesures
  // vivent dans `niveauxAffichage.ts` — c'est elle qui répare les pastilles à la fois
  // vertes et grisées. ⚠️ Elle ne change RIEN à l'écran de lecture : un niveau au delà
  // du maximum rend comme le maximum, et un chapeau au delà de sa profondeur ne rend
  // pas du tout. Elle accorde ce que le panneau montre avec ce que la page fait.
  const configInitiale = () => normaliserConfig({
    sommaire: niveauxSommaire, corps: niveauxCorps,
    txtSommaire, txtCorps, afficherNumeros, texteEntier: lectureTexteEntier,
  })
  const [configNiveaux, setConfigNiveaux] = useState(configInitiale)
  // ⚠️ Le fleuron vit à CÔTÉ de la configuration des niveaux, non dedans : ce n'est pas
  // un niveau, et `ConfigNiveaux` est un module pur dont la forme dit ce qu'elle règle.
  // ⛔ `null` est le cas ordinaire et veut dire « celui du site » — voir `fleurons.ts`.
  const [fleuronChoisi, setFleuronChoisi] = useState<string | null>(fleuron)
  // Ce que le panneau montre : « Niveaux » ou « Fleuron ». La barre reprend le modèle
  // unique du site, à la mesure du volet — le panneau fait 25 rem, non 46.
  const [ongletConfig, setOngletConfig] = useState<'niveaux' | 'fleuron'>('niveaux')
  // ⛔ ET ELLE SE RECALE QUAND ON CHANGE D'ŒUVRE. `/oeuvre/[id]` est une seule route :
  // passer d'une œuvre à l'autre ne remonte pas ce composant, si bien que le panneau
  // gardait les niveaux de l'œuvre PRÉCÉDENTE — un réglage qui décrit autre chose que
  // ce qu'on lit. Patron des états qui recopient une propriété (charte § linter) : on
  // recale PENDANT le rendu, jamais dans un effet, sinon l'ancien réglage paraît un
  // instant. ⚠️ Sur l'œuvre courante, les retouches non enregistrées sont conservées.
  const [oeuvreDeLaConfig, setOeuvreDeLaConfig] = useState(idOeuvre)
  const [configOuverte, setConfigOuverte] = useState(false)
  // Échap referme la fenêtre des niveaux, comme le voile et la croix le font à la souris.
  const fermerConfig = useCallback(() => setConfigOuverte(false), [])
  useFermerAEchap(configOuverte, fermerConfig)
  const boiteConfig = useRef<HTMLDivElement>(null)
  useFenetreModale(boiteConfig, configOuverte)

  // ── LES ACTIONS RANGÉES SOUS LE ⋮ DE LA TÊTE DU VOLET ─────────────────────
  // ⚠️ Elles sont NOMMÉES : la rangée ne les portait qu'en glyphes de treize pixels,
  // dont le sens ne se lisait que dans un `title` — c'est-à-dire nulle part au doigt.
  // ⛔ Le libellé du partage suit son ÉTAT : « Lien copié » est ce que le bouton disait
  // déjà par sa coche, et le taire dans un menu qui parle serait un recul.
  const actionsDuVolet = useMemo<ActionVolet[]>(() => {
    const liste: ActionVolet[] = []
    if (estAdmin) {
      liste.push({ cle: 'niveaux', libelle: 'Niveaux d’affichage', icone: ICONE_NIVEAUX, onChoisir: () => setConfigOuverte(true) })
    }
    liste.push({ cle: 'partage', libelle: 'Partager la page', icone: ICONE_PARTAGE, onChoisir: ancre => setAncrePartage(ancre ?? null) })
    liste.push({ cle: 'extraction', libelle: 'Extraire en document Word', icone: ICONE_EXTRACTION, onChoisir: () => setExtractionOuverte(true) })
    return liste
  }, [estAdmin])
  // ── LA RANGÉE MONTRE TOUT, ET NE CÈDE QUE QUAND LA PLACE MANQUE ───────────
  // Rectification de l'auteur, 2026-09-10 au soir, contre la forme posée le matin :
  // « je t'ai demandé de regrouper partager, extraire, etc., sous un bouton ⋮ ; cela ne
  // doit être le cas que quand on manque de place à l'écran ; sur grand écran, pas la
  // peine de cacher les icônes ». Les trois actions étaient rangées sous le ⋮ EN TOUTES
  // CIRCONSTANCES, et seule l'étoile en sortait à l'aise : c'était l'inverse du besoin.
  // ⛔ Deux formes, et deux seulement : la rangée ENTIÈRE en icônes, ou le ⋮ et rien
  // d'autre. Un repli par crans — une icône qui cède après l'autre — a été écarté :
  // c'est le parti que la barre de navigation a défait le 2026-09-10 au matin, parce
  // qu'une rangée qui n'a pas la même forme selon la largeur ne s'apprend jamais.
  // ⛔ La condition se MESURE (voir `useRangeeCondensee`) : elle dépend du nom qu'on
  // lit autant que de la largeur du volet, et un seuil posé se tromperait sur les deux
  // bouts — à 1920 px, « Eusèbe de Césarée » porte la rangée entière quand « Grégoire
  // de Nazianze », plus long de dix-neuf pixels, la condense. Relevé sur les quinze
  // auteurs publiés et neuf écrans (`tmp/mesure-tete-rangee-entiere.mjs`).
  // ⚠️ CE QUI COMPTE EST LE NOMBRE DE CIBLES, chevron compris : l'administrateur en a
  // une de plus, et un téléphone n'a pas de chevron — c'est la barre qui y ferme.
  const ciblesDepliees = actionsDuVolet.length + (favorisPret ? 1 : 0) + (mobile ? 0 : 1)
  const { condense: teteCondensee, refRangee, refNoms } = useRangeeCondensee(ciblesDepliees)
  const [configEnvoi, setConfigEnvoi] = useState(false)
  // ⛔ L'enregistrement échouait SANS UN MOT : `if (reponses.some(r => !r.ok)) return`
  // remettait simplement le bouton en place. Six appels partent en parallèle ; si un
  // seul est refusé — session expirée, droits perdus — l'admin voyait « Enregistrement… »
  // puis plus rien, et devait conclure que le réglage ne marchait pas. Un réglage qui
  // échoue doit le dire, sans quoi on cherche le défaut dans l'affichage.
  const [configErreur, setConfigErreur] = useState<string | null>(null)
  // ── QUELS NIVEAUX DE TITRE EXISTENT VRAIMENT ──────────────────────────────
  // Le panneau signale les niveaux creux. `null` = on ne sait pas encore, ou la sonde a
  // échoué : dans les deux cas on ne grise RIEN. Calculé à l'ouverture du panneau, pour
  // l'administrateur seul, et refait quand on change d'œuvre.
  //
  // ⛔ SUR L'ŒUVRE, NON SUR LE TEXTE LU. Les quatre réglages vivent sur `oeuvres` et
  // gouvernent tous ses textes à la fois : mesurer le seul texte ouvert grisait un
  // niveau que son voisin porte — le grec de l'Hexaéméron n'a qu'un niveau quand son
  // français en a deux, et le Morel du Discours 38 n'en a aucun quand son grec en a un.
  //
  // ⛔ ET LA SONDE EST UNIQUE, partagée avec le panneau de l'administration
  // (`niveauxPresents.ts`) : deux écrans qui règlent la même donnée doivent la mesurer de
  // la même façon. La règle — du plus haut au plus bas, en série, arrêt au premier absent
  // —, ses mesures et l'emboîtement qu'elle suppose vivent dans `niveauxAffichage.ts`.
  const [profondeurExistante, setProfondeurExistante] = useState<number | null>(null)
  useEffect(() => {
    if (!configOuverte) return
    let annule = false
    chargerProfondeurPresente(idOeuvre).then(profondeur => {
      if (!annule) setProfondeurExistante(profondeur)
    })
    return () => { annule = true }
  }, [configOuverte, idOeuvre])
  if (oeuvreDeLaConfig !== idOeuvre) {
    setOeuvreDeLaConfig(idOeuvre)
    setConfigNiveaux(configInitiale())
    setFleuronChoisi(fleuron)
    setProfondeurExistante(null)
  }
  const resetVolets = () => { setNavWidth(null); setPannWidth(null); try { localStorage.removeItem('cs_volets_oeuvre2') } catch {} }
  // ⛔ ICI VIVAIT UN COMPTEUR QUE PERSONNE NE LISAIT. Un effet interrogeait
  // `commentaires` en `count: 'exact'` à CHAQUE changement de segment actif, pour
  // ranger le nombre dans un état dont plus aucune vue ne se servait : un aller-retour
  // à la base par clic de lecteur, pour rien. (Audit du 8 septembre 2026.)
  const tradSelectRef = useRef<HTMLDivElement>(null)
  const tradBoutonRef = useRef<HTMLButtonElement>(null)
  const idMenuTraductions = useId()
  // La liste se ferme au clic à côté et à Échap (`ListeMenuBibles`) ; au clavier, le foyer
  // revient au bouton qui l'a ouverte.
  const fermerMenuTraductions = useCallback((rendreLeFoyer: boolean) => {
    setTradOuverte(false)
    if (rendreLeFoyer) tradBoutonRef.current?.focus()
  }, [])
  const choisirTraduction = useCallback((index: number) => {
    setTradIndex(index)
    fermerMenuTraductions(true)
  }, [fermerMenuTraductions])
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('cs_volets_oeuvre2') ?? 'null')
      if (s?.nav) setNavWidth(s.nav)
      if (s?.pann) setPannWidth(s.pann)
    } catch {}
    if (typeof window !== 'undefined' && window.innerWidth <= POINTS_DE_RUPTURE.tiroirs) {
      setNavOuverte(false)
      setPanneauOuvert(false)
      // ⛔ ET LE SOMMAIRE AVEC EUX (décision de l’auteur, 2026-09-09 : « par défaut,
      //    fermer tous les sous-onglets de ce volet »). Il s’ouvre d’office au BUREAU,
      //    où il est la navigation principale et où la place ne manque pas ; dans un
      //    tiroir de téléphone, il pousse hors de vue les trois rubriques qui le
      //    précèdent, et l’on ne voit plus ce que le volet offre.
      setSommaireOuvert(false)
    }
    setVoletsPrets(true)
  }, [])
  useEffect(() => {
    // ⚠️ Le stockage peut être refusé (navigation privée, réglage du navigateur) : la
    // largeur ne se retient pas, et rien ne tombe.
    try { localStorage.setItem('cs_volets_oeuvre2', JSON.stringify({ nav: navWidth, pann: pannWidth })) } catch {}
  }, [navWidth, pannWidth])
  // ⛔ L'écoute du clic à côté du menu des traductions vit dans `ListeMenuBibles` (2026-09-15).

    const [oeuvresAuteur, setOeuvresAuteur] = useState<OeuvreResumee[]>([])
  const router = useRouter()

  // ⛔ CHANGER DE TEXTE, C'EST CHANGER DE PAGE — et cela ne se voyait nulle part.
  // « Français » et « Français & latin » ne font que basculer un état, ils sont donc
  // instantanés ; « Latin » vise un AUTRE `id_texte`, donc une autre adresse, donc un
  // rendu serveur entier : cinq vagues de requêtes enchaînées, et la division tout
  // entière renvoyée. Mesuré le 2026-08-25 sur les Questions sur l'Heptateuque, dont le
  // premier livre latin est la plus grosse division du corpus (393 segments, 132 839
  // signes, 331 Ko de JSON) : une seconde et davantage, PENDANT LAQUELLE RIEN NE BOUGE.
  // Le `loading.tsx` de la route n'y paraît pas — seule la requête d'adresse change, le
  // routeur garde donc la page courante —, et le bouton était un `<button>` nu.
  //
  // Deux remèdes, tous deux ici, et aucun ne touche à ce qui est chargé :
  //  1. le clic est ACQUITTÉ : `useTransition` tient l'attente et le bouton la montre ;
  //  2. la page est DEMANDÉE AU SURVOL, avant même le clic.
  const [navigation, demarrerNavigation] = useTransition()
  const [cibleEnCours, setCibleEnCours] = useState<string | null>(null)
  const dejaPrechargees = useRef<Set<string>>(new Set())
  // ⚠️ `cibleEnCours` ne se rembobine pas, et n'a pas à le faire : le témoin se lit
  // TOUJOURS avec `navigation`, qui retombe seul. Une remise à zéro dans un effet ne
  // ferait qu'ajouter un rendu en cascade pour un état que personne ne lit plus.

  const urlDuTexte = (cibleOeuvre: string, mt: 'fr' | 'bilingue' | 'la', cibleTexte?: string | null) => {
    const params = new URLSearchParams()
    if (cibleTexte) params.set('texte', cibleTexte)
    if (mt !== 'fr') params.set('mt', mt)
    const requete = params.toString()
    return `/oeuvre/${cibleOeuvre}${requete ? `?${requete}` : ''}`
  }
  // ── Le passage d'un texte à l'autre est FLUIDE (2026-09-02) ───────────────
  // Trois choses, et `passageTexte.ts` porte ce qui n'est pas propre à ce composant :
  //  1. on ne revient pas au début. L'adresse emporte le niveau qu'on lisait et le
  //     paragraphe en tête de fenêtre (par son groupe d'alignement ou sa clé), et le
  //     serveur ouvre l'autre texte au même endroit ; le défilement est conservé, et
  //     le paragraphe repris se pose à la hauteur exacte où était l'ancien ;
  //  2. le texte qu'on quitte s'efface paragraphe par paragraphe, de haut en bas, et
  //     celui qui arrive paraît de même (classes `lecture-sortie` / `lecture-entree`
  //     sur `<main>`, animations dans `globals.css`) ;
  //  3. rien de tout cela ne coûte une requête de plus.
  const mainRef = useRef<HTMLElement>(null)
  // La COLONNE de lecture : c'est elle que la manchette borde, et c'est son
  // `position: relative` qui fait le bloc conteneur des renvois posés en marge.
  const colonneRef = useRef<HTMLDivElement>(null)
  const refFilAriane = useRef<HTMLDivElement>(null)
  const [sortie, setSortie] = useState(false)
  // Vrai dès le PREMIER rendu quand on arrive d'un autre texte : la classe doit être là
  // avant la première peinture, sinon la page paraît entière, s'efface, et reparaît.
  // Au rendu serveur comme au chargement d'une adresse, aucune bascule n'est en
  // attente, et les deux rendus s'accordent.
  const [entree, setEntree] = useState(() => basculeEnAttente())
  const naviguer = (url: string) => {
    const main = mainRef.current
    const haut = hauteurNavbarPx()
    const memeOeuvre = new URL(url, window.location.origin).pathname === window.location.pathname
    // Le paragraphe en tête de fenêtre, et ce qu'on sait de lui pour le retrouver dans
    // l'autre texte. Un groupe d'alignement ne vaut qu'entre deux textes de la MÊME
    // œuvre ; une œuvre sœur ne reçoit que le niveau.
    const tete = main && vue === 'texte' && !modeComparaisonActif ? segmentEnTeteDeFenetre(main, haut) : null
    const seg = tete ? segments.find(s => s.id === tete.id) : undefined
    const cible = adresseAvecPosition(url, {
      niv1: vue === 'texte' && niv1Actif ? niv1Actif : null,
      groupe: memeOeuvre ? seg?.groupeOriginal ?? null : null,
      cle: memeOeuvre ? seg?.segmentKey ?? null : null,
    })
    annoncerBascule({ defilement: window.scrollY, hauteurTete: tete?.y ?? null })
    if (main) ordonnerBlocsVisibles(main, haut)
    setSortie(true)
    setCibleEnCours(url)
    // `scroll: false` : le routeur ne remonte pas en haut de page. Une œuvre SŒUR change
    // de route, et le `loading.tsx` remplace alors la page d'un coup : on lui laisse le
    // temps de l'effacement, que rien ne verrait sinon. Le même texte, lui, part tout
    // de suite : le routeur garde la page jusqu'à ce que l'autre soit prête.
    const partir = () => demarrerNavigation(() => router.push(cible, { scroll: false }))
    if (memeOeuvre) partir()
    else window.setTimeout(partir, DUREE_SORTIE_MS)
  }

  // ── UN LIEN « ?mt=bilingue » QUI NE MÈNE À RIEN ────────────────────────────
  // Une adresse EXPLICITE posée sur une traduction que rien ne met en regard — une
  // archive, une édition qu'aucun alignement ne couvre — rejoint la traduction qui
  // porte l'alignement, plutôt que de retomber en silence sur le français seul. Tout le
  // reste de l'adresse est conservé, la position de lecture (`niv1`, `groupe`, `cle`)
  // comprise : on ne change que d'édition. Faute d'une telle traduction, il n'y a rien
  // à faire ici — `modeTexteEffectif` a déjà ramené la page au français seul.
  //
  // ⚠️ `replace` et non `push` : c'est une correction d'adresse, pas un pas de lecture.
  // Le retour arrière ne doit pas ramener sur le lien mort.
  // ⚠️ Sur la seule ADRESSE, jamais sur la préférence gardée dans le navigateur :
  // déplacer le lecteur d'un texte à l'autre pour un réglage qu'il ne relit pas serait
  // une navigation qu'il n'a pas demandée.
  useEffect(() => {
    if (enRegardSurPlace) return
    const cible = paireDeLecture.navigationBilingue
    if (!cible || cible === idTexte) return
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('mt') !== 'bilingue') return
      params.set('texte', cible)
      router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false })
    } catch {}
  }, [enRegardSurPlace, paireDeLecture.navigationBilingue, idTexte, router])

  // Une navigation qui n'aboutit pas (retour arrière pendant l'attente, autre clic)
  // laisse ce composant en place : on lui rend son texte.
  const aTransite = useRef(false)
  useEffect(() => {
    if (navigation) { aTransite.current = true; return }
    if (aTransite.current && sortie) {
      aTransite.current = false
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSortie(false)
    }
  }, [navigation, sortie])
  // ── Le même passage pour les changements INTERNES de la page (2026-09-02) ───
  // Changer de niveau 1 (flèches, sommaire), tourner une page de pagination : le texte
  // ne change pas d'adresse, mais il change tout entier. Il s'efface donc de même, et
  // ce qui le remplace paraît de même. Le départ marque et efface ; le remplacement
  // n'est appliqué qu'à la FIN de l'effacement (une division en cache arriverait sinon
  // avant qu'on ait rien vu) ; l'arrivée se joue dans un effet de mise en page, dès que
  // le contenu neuf est là et avant sa première peinture.
  const [arrivee, setArrivee] = useState(0)
  const departLocal = () => {
    const main = mainRef.current
    if (main) ordonnerBlocsVisibles(main, hauteurNavbarPx())
    setSortie(true)
    return Date.now()
  }
  const finDeSortie = (depart: number) => new Promise<void>(resolve => {
    window.setTimeout(resolve, Math.max(0, depart + DUREE_SORTIE_MS - Date.now()))
  })
  useLayoutEffect(() => {
    if (arrivee === 0) return
    // Le retour en haut d'une division neuve se fait ICI, avant de marquer : sinon on
    // marquerait les blocs d'un endroit qu'on va quitter dans l'instant. L'effet qui
    // le faisait après la peinture trouve alors le témoin déjà rembobiné.
    if (pendingScrollTopRef.current && vue === 'texte') {
      pendingScrollTopRef.current = false
      document.getElementById(ANCRE_DEBUT_LECTURE)?.scrollIntoView({ block: 'start' })
    }
    const main = mainRef.current
    if (main) ordonnerBlocsVisibles(main, hauteurNavbarPx())
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSortie(false)
    setEntree(true)
    const fin = window.setTimeout(() => setEntree(false), DUREE_ENTREE_MS)
    return () => window.clearTimeout(fin)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrivee])
  /** Tourne une page de pagination, avec le passage. */
  const changerPage = async (idx: number) => {
    const depart = departLocal()
    await finDeSortie(depart)
    setPageActuelle(idx)
    pendingScrollTopRef.current = true
    setArrivee(n => n + 1)
  }
  /** Demande la page au survol, une fois par adresse.
   *
   *  ⚠️ `kind: 'full'` n'est pas un ornement : un préchargement ordinaire s'arrête au
   *  `loading.tsx` de la route et ne rapporte donc RIEN de ce qui coûte ici. La valeur
   *  est publique et stable ; l'énumération qui la nomme vit dans les entrailles de
   *  Next, et on ne l'importe pas pour autant. */
  const precharger = (url: string) => {
    if (dejaPrechargees.current.has(url)) return
    dejaPrechargees.current.add(url)
    router.prefetch(url, { kind: 'full' } as Parameters<typeof router.prefetch>[1])
  }
  /** Le témoin d'attente d'un bouton, et de quoi le préparer au survol. */
  const gestesDeNavigation = (url: string | null) => ({
    onMouseEnter: url ? () => precharger(url) : undefined,
    onFocus: url ? () => precharger(url) : undefined,
    'aria-busy': (url !== null && navigation && cibleEnCours === url) || undefined,
  })
  const attendCette = (url: string | null) => url !== null && navigation && cibleEnCours === url

  // Traductions sœurs : œuvres du MÊME auteur au MÊME titre normalisé (comme le
  // regroupement de la Bibliothèque). Sert au sélecteur de traduction du volet gauche.
  type VersionTrad = { id_oeuvre: string; titre: string; trad_auteur: string | null; editeur: string | null; ville: string | null; date_publication: string | null; acces_public: boolean | null; langue_originale: string | null; langue_trad: string | null }
  const [versions, setVersions] = useState<VersionTrad[]>([])
  const [auteurOuvert, setAuteurOuvert] = useState(false)
  // La sous-section « Opuscules » de la rubrique ci-dessus. Repliée par défaut, comme
  // à la bibliothèque : c'est tout son objet.
  const [opusculesOuverts, setOpusculesOuverts] = useState(false)
  // ⚠️ UN ÉTAT PAR MAIN : l'apparat de l'auteur et celui de l'éditeur sont deux rubriques
  // depuis le 2026-09-15, et chacune s'ouvre pour son compte.
  const [apparatOuvert, setApparatOuvert] = useState<Record<SectionApparat, boolean>>({ auteur: false, editeur: false })
  const [sommaireOuvert, setSommaireOuvert] = useState(true)
  const [apparatNiv1Actif, setApparatNiv1Actif] = useState<string | null>(null)
  const [ancreEnAttente, setAncreEnAttente] = useState<string | null>(null)

  useEffect(() => {
    if (!ancreEnAttente || vue !== 'apparat') return
    const el = document.getElementById(ancreEnAttente)
    if (allerAElement(el)) setAncreEnAttente(null)
  }, [vue, ancreEnAttente])

  // Navigation lazy par niv1
  const niv1List = niv1ListProp
  const texteSansNiveaux = niv1List.length === 0
  // ⛔ UN SOMMAIRE QUI N’A RIEN À SOMMER NE PARAÎT PAS (demande de l’auteur,
  //    2026-09-05). Le volet posait la rubrique « SOMMAIRE » et, dessous, la mention
  //    « Texte complet » : une rubrique qui annonce une table des matières, et une
  //    ligne qui dit qu’il n’y en a pas. Deux objets pour rien.
  //
  // ⛔ ET UNE SEULE ENTRÉE NE SOMME PAS DAVANTAGE QUE ZÉRO (2026-09-08 : « en mode
  //    “texte entier”, ne pas afficher du tout dans le volet de gauche “Sommaire” ou
  //    “texte complet”, ni même le titre entier »). C’est la MÊME règle d’un cran plus
  //    loin, et elle vise un cas précis : cinq œuvres publiques lues d’un tenant —
  //    quatre homélies et la Lettre à l’empereur Constance — n’ont qu’un seul niveau 1,
  //    dont l’intitulé EST le titre de l’œuvre. Le volet écrivait donc « SOMMAIRE », et
  //    dessous, en unique entrée, le titre déjà imprimé trois lignes plus haut. Une
  //    table des matières à une entrée n’offre aucun choix : elle nomme le tout.
  //
  // ⚠️ La règle porte sur le CONTENU, non sur le mode de lecture, et c’est ce qui la
  //    rend sûre : c’est en texte entier que le cas se rencontre, mais un texte à une
  //    seule division serait tout aussi vain ailleurs. ⛔ NE PAS l’étendre au mode
  //    « texte entier » lui-même : vingt-trois œuvres s’y lisent AVEC leur sommaire,
  //    dont l’Apologétique (52 chapitres) et les Homélies sur la Genèse (68), où il est
  //    la seule navigation — la garde de 2026-09-05 tient toujours.
  const sommaireAQuoiSommer = modeComparaisonActif || niv1List.length > 1
  // ⛔ LE RETOUR AU TEXTE NE PARAÎT QUE LÀ OÙ LE SOMMAIRE MANQUE (demande de l'auteur,
  //    2026-09-13 : « seulement si le texte est en mode texte entier et ne dispose
  //    d'aucun niveau 1 dans son sommaire »). Quand le sommaire est là, ses entrées
  //    ramènent déjà au texte, et le bouton les doublait sous leurs yeux.
  // ⚠️ La garde porte sur le sommaire AFFICHÉ, non sur le seul mode : un texte paginé à
  //    une seule division n'a pas de sommaire non plus, et sans ce bouton il n'aurait
  //    aucun chemin de retour depuis l'apparat. Au 2026-09-13, un seul texte public est
  //    dans ce cas (A0010O0109) ; tous les autres qui gardent le bouton se lisent en texte
  //    entier. ⚠️ Et le bloc de l'apparat ne s'étire plus quand le bouton le suit : il le
  //    pousserait au pied du volet, loin de la liste qu'il ferme.
  const revenirAuTexteVisible = !modeComparaisonActif && vue === 'apparat' && !sommaireAQuoiSommer
  // Carte niv1 -> titre textuel, complete des le rendu serveur.
  // Elle reste enrichie apres modifications ou chargements forces.
  const [niv1TexteMap, setNiv1TexteMap] = useState<Record<string, string>>(niv1TexteMapProp)
  const [niv1Actif, setNiv1Actif] = useState<string>((niv1Initial && niv1List.includes(niv1Initial) ? niv1Initial : null) ?? niv1List[0] ?? '')
  const [groupes, setGroupes] = useState<GroupeData[]>(groupesInit)
  const [segments, setSegments] = useState<SegData[]>(segmentsInit)
  const [groupesApparat, setGroupesApparat] = useState<GroupeData[]>(groupesApparatInit)
  const [segmentsApparat, setSegmentsApparat] = useState<SegData[]>(segmentsApparatInit)
  // Les notices des ouvrages que cite l'apparat, par `ouvrage_id` : un segment qui en
  // porte un se compose depuis la BASE (moteur bibliographique, charte § 47.1), non
  // depuis son texte. Le serveur les envoie avec l'apparat ; le rechargement les complète.
  const [noticesBibliographiques, setNoticesBibliographiques] = useState<Record<number, NoticeBibliographique>>(noticesBibliographiquesInit)
  const [niv1Loading, setNiv1Loading] = useState(false)
  const [niv1Erreur, setNiv1Erreur] = useState<string | null>(null)
  const [pageActuelle, setPageActuelle] = useState(0)
  const profondeurSommaire = configNiveaux.sommaire
  const profondeurCorps = configNiveaux.corps
  // Navigation par niv2 (si profondeur >= 2)
  const [niv2Actif, setNiv2Actif] = useState<string | null>(null)

  // Niv1 actif suivi en ref : la complétion en tâche de fond ne doit s'appliquer
  // que si le lecteur n'a pas changé de niveau entre-temps.
  const niv1ActifRef = useRef(niv1Actif)
  useEffect(() => { niv1ActifRef.current = niv1Actif }, [niv1Actif])

  const niv1Index = niv1List.indexOf(niv1Actif)
  const niv1Prev = niv1Index > 0 ? niv1List[niv1Index - 1] : null
  const niv1Next = niv1Index < niv1List.length - 1 ? niv1List[niv1Index + 1] : null

  // Cache mémoire des niv1 déjà chargés : navigation instantanée au retour sur
  // un niveau déjà visité, et préchargement discret des niv1 voisins en tâche
  // de fond pour réduire la latence perçue au clic sur Suivant/Précédent.
  const cacheNiv1Ref = useRef<Map<string, { groupes: GroupeData[]; segments: SegData[] }>>(new Map())
  useEffect(() => {
    cacheNiv1Ref.current.set(niv1Actif, { groupes: groupesInit, segments: segmentsInit })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pendingScrollTopRef = useRef(false)
  const pendingScrollSegRef = useRef<number | null>(null)
  // La note que l'inventaire a demandé d'OUVRIR, avec le segment qui la porte : le saut
  // qui vise ce segment la consomme (`viserLeSegment`), et lui seul.
  const noteAOuvrirRef = useRef<{ cle: string; segId: number } | null>(null)
  useEffect(() => {
    if (!pendingScrollTopRef.current || vue !== 'texte') return
    pendingScrollTopRef.current = false
    document.getElementById(ANCRE_DEBUT_LECTURE)?.scrollIntoView({ block: 'start' })
  }, [vue, groupes])
  // Liste des niv2 du niv1 actif (sert au sommaire)
  const groupesNiv1Actif = lectureTexteEntier ? groupes.filter(g => g.niv1 === niv1Actif) : groupes
  const niv2List = Array.from(new Set(groupesNiv1Actif.map(g => g.niv2).filter(Boolean)))

  // Pagination : découpe les groupes en pages de CHARS_PAR_PAGE caractères max,
  // sans jamais couper un groupe (niv3/4/5 solidaires).
  const segCharMap = useMemo(() => {
    const m = new Map<number, number>()
    segments.forEach(s => m.set(s.id, s.texte?.length ?? 0))
    return m
  }, [segments])

  const pages = useMemo(() => {
    if (groupes.length === 0) return [[]] as GroupeData[][]
    if (texteSansNiveaux) {
      // Sans niveaux, ce sont les SEGMENTS que l'on répartit, et chaque page devient
      // ensuite un groupe de rendu à elle seule.
      const parPage = paginerBlocs(
        groupes.flatMap(g => g.itemIds).map(id => ({ bloc: id, signes: segCharMap.get(id) ?? 0 })),
        CHARS_PAR_PAGE,
      )
      const result: GroupeData[][] = parPage.map((itemIds, pageIndex) => [{
        niv1: '', niv2: '', niv3: '', niv4: '',
        niv1_texte: '', niv2_texte: '', niv3_texte: '', niv4_texte: '',
        anchor: `g-sans-niveaux-${pageIndex}`,
        itemIds,
      }])
      return result.length > 0 ? result : [[]]
    }
    // ⛔ Un groupe ne se coupe jamais (niv3/4/5 solidaires), et une page ne se ferme
    // pas tant qu'elle ne porte pas de quoi en être une : toute la règle, avec le cas
    // qui l'a imposée, vit dans `app/lib/paginationLecture.ts`.
    const result = paginerBlocs(
      groupes.map(groupe => ({
        bloc: groupe,
        signes: groupe.itemIds.reduce((acc, id) => acc + (segCharMap.get(id) ?? 0), 0),
      })),
      CHARS_PAR_PAGE,
    )
    return result.length > 0 ? result : [[]]
  }, [groupes, segCharMap, texteSansNiveaux])

  const groupesFiltres = useMemo(() => pages[pageActuelle] ?? [], [pages, pageActuelle])

  // Amène un élément au NIVEAU DES YEUX : son sommet se pose au tiers supérieur de la
  // fenêtre. On passe par `scrollIntoView` (fiable ici) avec une marge de défilement
  // haute temporaire égale au tiers de la fenêtre — `block:'start'` cale alors le sommet
  // à ce tiers.
  const scrollNiveauDesYeux = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (!el) return false
    const prev = el.style.scrollMarginTop
    el.style.scrollMarginTop = `${Math.round(window.innerHeight / 3)}px`
    // Défilement INSTANTANÉ (et non « smooth ») : un défilement animé était annulé dès la
    // première frame par le re-rendu déclenché par la sélection du segment.
    el.scrollIntoView({ behavior: 'auto', block: 'start' })
    window.setTimeout(() => { el.style.scrollMarginTop = prev }, 200)
    return true
  }, [])

  // Le saut vers un segment de l'inventaire des notes. S'il porte la note qu'on a demandé
  // d'ouvrir, c'est l'APPEL qu'on pose au niveau des yeux, et la note s'ouvre (demande de
  // l'auteur, 2026-09-11) ; sinon le segment, comme avant. ⚠️ La demande se consomme ICI,
  // au moment même où l'on vise : un saut qui n'est pas le sien ne l'ouvre jamais.
  const viserLeSegment = useCallback((segId: number, ancre: string) => {
    const viserLeSegmentSeul = () => { if (!scrollNiveauDesYeux(`segment-${segId}`)) allerAAncre(ancre) }
    const note = noteAOuvrirRef.current
    if (!note || note.segId !== segId) { viserLeSegmentSeul(); return }
    noteAOuvrirRef.current = null
    ouvrirLaNoteDansLeTexte({ cle: note.cle, idSegment: `segment-${segId}`, repli: viserLeSegmentSeul })
  }, [scrollNiveauDesYeux])

  /**
   * LE SAUT VERS UNE INTRODUCTION, qui n'est dans aucun groupe.
   *
   * ⛔ Une introduction est HISSÉE en tête de la première page, hors des groupes
   * structurels et hors de la pagination (`estIntroduction`, `introsEnTete`) : aucun
   * `itemIds` ne la porte. Le saut, qui ne cherchait que dans les groupes, la manquait
   * donc toujours — et la note qu'elle ancre ne s'ouvrait jamais. Relevé de l'auteur le
   * 12 septembre 2026 sur le *Manuel pour mon fils* de Dhuoda, dont les Prolégomènes
   * sont tout entiers faits d'introductions : leurs trente-neuf notes ouvrent
   * l'inventaire, et pas une ne s'ouvrait.
   *
   * ⚠️ Elle ne paraît que sur la PREMIÈRE page de sa division : on y revient avant de
   * viser. L'ancre de repli est le haut du texte, faute de groupe où se rabattre.
   */
  const viserIntroduction = useCallback((segId: number) => {
    // ⚠️ `nature` est facultative sur un segment chargé, obligatoire dans le pipeline :
    // le vide se dit `null` des deux côtés, et c'est la seule chose à accorder.
    if (!segments.some(s => s.id === segId && estIntroduction({ nature: s.nature ?? null }))) return false
    if (pageActuelle !== 0) setPageActuelle(0)
    setSegActif(segId)
    setTimeout(() => viserLeSegment(segId, ANCRE_DEBUT_LECTURE), 80)
    return true
  }, [segments, pageActuelle, viserLeSegment])

  useEffect(() => {
    const segId = pendingScrollSegRef.current
    if (!segId) return
    const g = groupes.find(gr => gr.itemIds.includes(segId))
    if (!g) {
      // La division vient d'arriver, mais la cible est une introduction : elle n'est dans
      // aucun groupe, et la demande resterait en attente pour toujours.
      if (viserIntroduction(segId)) pendingScrollSegRef.current = null
      return
    }
    pendingScrollSegRef.current = null
    const pageIdx = pages.findIndex(p => p.some(gr => gr.anchor === g.anchor))
    if (pageIdx >= 0 && pageIdx !== pageActuelle) setPageActuelle(pageIdx)
    setSegActif(segId)
    // « Aller au passage » : on pose le passage au niveau des yeux (tiers supérieur) ;
    // à défaut du segment précis, on se rabat sur le paragraphe qui le contient.
    setTimeout(() => viserLeSegment(segId, g.anchor), 80)
  }, [groupes, pages, pageActuelle, viserLeSegment, viserIntroduction])

  const segmentsFiltres = useMemo(() => {
    const ids = new Set(groupesFiltres.flatMap(g => g.itemIds))
    return segments.filter(s => ids.has(s.id))
  }, [groupesFiltres, segments])

  // Scroll-spy du sommaire : au défilement, le niveau 2 (question, section…)
  // effectivement à l'écran devient l'actif dans le sommaire — et non celui sur
  // lequel on avait cliqué en dernier. On retient le dernier groupe dont le haut
  // est passé sous la barre fixe (sticky 48px + barre de navigation niv1).
  useEffect(() => {
    if (vue !== 'texte') return
    // Scroll-spy throttlé : au plus UNE mesure par frame (requestAnimationFrame),
    // au lieu de lire la géométrie (getBoundingClientRect en boucle) à chaque
    // événement scroll — ce qui provoquait du jank sur les grosses œuvres.
    const etat = { ticking: false }
    const calcul = () => {
      etat.ticking = false
      const seuil = 140
      let n1Courant: string | null = null
      let n2Courant: string | null = null
      let trouve = false
      for (const g of groupesFiltres) {
        const el = document.getElementById(g.anchor)
        if (!el) continue
        if (el.getBoundingClientRect().top - seuil <= 0) {
          n1Courant = g.niv1 || null
          n2Courant = g.niv2 || null
          trouve = true
        } else break
      }
      if (trouve) {
        if (lectureTexteEntier && n1Courant) setNiv1Actif(prev => (prev === n1Courant ? prev : n1Courant!))
        setNiv2Actif(prev => (prev === n2Courant ? prev : n2Courant))
      }
    }
    const onScroll = () => {
      if (etat.ticking) return
      etat.ticking = true
      requestAnimationFrame(calcul)
    }
    calcul()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [groupesFiltres, lectureTexteEntier, vue])

  // Navigue vers une ancre en changeant de page si nécessaire
  // ── L'INVENTAIRE DES NOTES (administration) ────────────────────────────────
  // La note qu'on vient d'ouvrir depuis l'inventaire, pour la marquer dans la liste.
  // ⛔ Le COUPLE (texte, clé) : en lecture en regard l'inventaire porte deux appareils,
  // et deux textes peuvent numéroter leurs notes de la même façon.
  const [noteCourante, setNoteCourante] = useState<{ idTexte: string; cle: string } | null>(null)
  // ⛔ L'onglet « Notes » ne se PROPOSE pas hors administration : un onglet qu'un
  // lecteur ne doit pas voir ne se garde pas au seul rendu de son contenu.
  const ongletsDuVolet = useMemo<OngletDroit[]>(
    () => (estAdmin ? ['refs', 'commentaires', 'notes'] : ['refs', 'commentaires']),
    [estAdmin],
  )

  /**
   * LES TEXTES DONT L'INVENTAIRE RELÈVE LES NOTES.
   *
   * ⛔ EN LECTURE EN REGARD, ILS SONT DEUX (demande de l'auteur, 2026-09-12 : « en mode
   * latin-français, il faut afficher toutes les notes, des deux textes »). Le lecteur a
   * deux appareils sous les yeux, et l'inventaire n'en montrait qu'un — sur le *Manuel
   * pour mon fils* de Dhuoda, il annonçait « 258 notes dans ce texte » en taisant les
   * 1 535 de Bondurand, qui sont pourtant appelées dans la colonne d'en face.
   *
   * ⛔ ET SEULEMENT EN LECTURE EN REGARD : hors du bilingue, les appels du texte
   * original ne sont pas rendus, et une note qu'on listerait ne pourrait pas s'ouvrir.
   * ⚠️ `ensembleBilingue` est la garde qui compte.
   *
   * ⚠️ Le libellé est la LANGUE, celle que la donnée déclare (« Latin », « Français ») :
   * c'est ce qui distingue les deux colonnes à l'œil. Le nom court de l'édition ne sert
   * qu'à défaut, pour un texte dont la langue n'est pas renseignée.
   */
  const sourcesNotes = useMemo<SourceInventaire[]>(() => {
    const nommer = (version: VersionTextuelle | null, defaut: string) =>
      version?.langue?.trim() || (version ? labelCourtVersion(version) : defaut)
    const lu: SourceInventaire = {
      idTexte,
      libelle: nommer(versionActive, 'Texte lu'),
      notesStructurees,
      ordreDivisions: niv1List,
    }
    if (!affichageBilingue || !ensembleBilingue || !idTexteEnRegard) return [lu]
    if (Object.keys(notesOriginales).length === 0) return [lu]
    return [lu, {
      idTexte: idTexteEnRegard,
      libelle: nommer(versionEnRegard, 'Texte en regard'),
      notesStructurees: notesOriginales,
      sansApparat: true,
    }]
  }, [idTexte, versionActive, notesStructurees, niv1List, affichageBilingue, ensembleBilingue, idTexteEnRegard, notesOriginales, versionEnRegard])

  // ⛔ LES NOTES QUE LA PAGE PORTE, PAR IDENTITÉ : un renvoi de note à note qui vise l'une
  // d'elles la déplie sans aller la redemander au serveur (`RenvoiNote.tsx`). Une note
  // absente — un autre texte, une note sans ancre — se demande à la route.
  const registreNotes = useMemo(() => registreDesNotes([
    { idTexte, notes: notesStructurees },
    { idTexte: idTexteEnRegard, notes: notesOriginales },
  ]), [idTexte, notesStructurees, idTexteEnRegard, notesOriginales])

  const naviguerVersAncre = useCallback((ancre: string) => {
    const pageIdx = pages.findIndex(p => p.some(g => g.anchor === ancre))
    if (pageIdx >= 0 && pageIdx !== pageActuelle) {
      setPageActuelle(pageIdx)
      // L'ancre n'existe pas encore : elle est sur une page qu'on vient seulement de
      // demander. On laisse le rendu se faire avant de viser.
      setTimeout(() => allerAAncre(ancre), 60)
    } else {
      allerAAncre(ancre)
    }
  }, [pages, pageActuelle])

  // ⛔ EN TEXTE ENTIER, UNE DIVISION DEMANDÉE AVANT LA FIN DE LA COMPLÉTION SE REJOINT À
  // SON ARRIVÉE : le sommaire nomme toutes les divisions (`niv1List`), la première
  // tranche n'en porte que le début (2026-09-24).
  const niv1AViserRef = useRef<string | null>(null)
  useEffect(() => {
    const n1 = niv1AViserRef.current
    if (!n1) return
    const ancre = groupes.find(g => g.niv1 === n1)?.anchor
    if (!ancre) return
    niv1AViserRef.current = null
    naviguerVersAncre(ancre)
  }, [groupes, naviguerVersAncre])

  // Deep link : aller à la bonne page de pagination puis scroller sur le segment
  useEffect(() => {
    if (!segmentCibleId) return
    const pageIdx = pages.findIndex(p => p.some(g => g.itemIds.includes(segmentCibleId)))
    if (pageIdx >= 0 && pageIdx !== pageActuelle) setPageActuelle(pageIdx)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentCibleId, pages])

  useEffect(() => {
    // Une reprise se pose autrement, juste en dessous : à la hauteur qu'avait le
    // paragraphe qu'on lisait, et non au niveau des yeux.
    if (!segmentCibleId || cibleReprise) return
    let stopped = false
    const tryScroll = (attempt = 0) => {
      if (stopped) return
      const el = document.getElementById(`segment-${segmentCibleId}`)
      // `allerAElement` rend false tant que le segment n'est pas dans la page : on
      // réessaie alors, comme avant, jusqu'à quinze fois.
      if (!allerAElement(el) && attempt < 15) window.setTimeout(() => tryScroll(attempt + 1), 200)
    }
    const timer = window.setTimeout(() => tryScroll(), 100)
    return () => { stopped = true; window.clearTimeout(timer) }
  }, [segmentCibleId, pageActuelle])

  // ── LE RECHARGEMENT QUE PERSONNE N'A DEMANDÉ ───────────────────────────────
  // Un onglet ouvert pendant un déploiement porte un build que le serveur ne sert
  // plus : au premier morceau de code demandé, Next fait une navigation DURE. On ne
  // peut pas l'empêcher sans payer (voir `passageTexte.ts`) ; on le rend indolore.
  // La DIVISION voyage désormais dans l'adresse (`inscrireNiv1DansLAdresse`, posé par
  // `changerNiv1`) ; le défilement et la page de pagination se retiennent ici.
  //
  // ⛔ La reprise est un `useLayoutEffect` : les effets de mise en page passent tous
  // AVANT les effets ordinaires, si bien qu'elle lit la position retenue avant que
  // l'écoute du défilement, ci-dessous, n'ait pu la réécrire.
  useLayoutEffect(() => {
    // Une bascule en attente veut dire qu'on ARRIVE d'un autre texte : l'effet qui
    // suit s'en charge, et il sait poser le paragraphe à sa hauteur exacte. Un lien
    // profond (`?segment=`) vise, lui aussi, et deux mécanismes ne se disputent pas
    // le même défilement.
    if (basculeEnAttente() || segmentCibleId) return
    const reprise = positionAppliquable(lirePositionRetenue(), adresseCourante(), pages.length, Date.now())
    if (!reprise) return
    if (reprise.page > 0) setPageActuelle(reprise.page)
    let pose = -1
    const lecteurABouge = () => pose >= 0 && Math.abs(window.scrollY - pose) > 1
    const poser = () => { window.scrollTo(0, reprise.defilement); pose = window.scrollY }
    poser()
    // La page de pagination reprise ne se rend qu'au rendu suivant, et le frontispice
    // change encore de hauteur pendant la première seconde : on repose, et l'on
    // s'abstient dès que le lecteur a bougé — c'est lui qui commande.
    let arret = false
    const minuteries = [120, 350, 700, 1200].map(delai =>
      window.setTimeout(() => { if (!arret && !lecteurABouge()) poser() }, delai))
    return () => { arret = true; minuteries.forEach(m => window.clearTimeout(m)) }
    // Une seule fois, au montage : une reprise ne se rejoue pas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ⚠️ Une écriture par IMAGE au plus : le défilement émet des dizaines d'événements
  // par seconde, et `sessionStorage` écrit sur le disque.
  useEffect(() => {
    let image = 0
    const retenir = () => { image = 0; retenirLaPosition(pageActuelle, window.scrollY) }
    const auDefilement = () => { if (!image) image = window.requestAnimationFrame(retenir) }
    window.addEventListener('scroll', auDefilement, { passive: true })
    return () => {
      window.removeEventListener('scroll', auDefilement)
      if (image) window.cancelAnimationFrame(image)
    }
  }, [pageActuelle])

  // Arrivée depuis un autre texte. On rend d'abord au lecteur son défilement (une
  // œuvre sœur est passée par l'écran d'attente, qui l'a ramené en haut), puis on pose
  // le paragraphe repris à la hauteur exacte où était celui qu'il lisait, et l'on
  // ordonne les blocs visibles pour qu'ils paraissent l'un après l'autre. Tout cela
  // AVANT la première peinture, d'où `useLayoutEffect`. La bascule se consomme ICI, et
  // non dans un initialiseur : le composant qu'on quitte se rend encore pendant
  // l'attente, et il ne doit pas reprendre ce qu'il vient d'annoncer.
  useLayoutEffect(() => {
    const reprise = reprendreBascule()
    if (!reprise) return
    window.scrollTo(0, reprise.defilement)
    // Le défilement qu'on a posé en dernier : s'il a bougé sans nous, c'est le lecteur
    // qui a repris la main, et l'on ne se mêle plus de rien.
    let defilementPose = window.scrollY
    const lecteurABouge = () => Math.abs(window.scrollY - defilementPose) > 1
    const poser = () => {
      if (!cibleReprise || !segmentCibleId || reprise.hauteurTete === null) return true
      const el = document.getElementById(`segment-${segmentCibleId}`)
      if (!el) return false
      window.scrollBy(0, el.getBoundingClientRect().top - reprise.hauteurTete)
      defilementPose = window.scrollY
      return true
    }
    // Le segment peut être sur une autre page de pagination, que l'effet ci-dessus ne
    // demande qu'après la première peinture : on réessaie, comme le lien profond.
    let arret = false
    let essais = 0
    const reessayer = () => {
      if (arret || lecteurABouge() || poser() || essais++ >= 15) return
      window.setTimeout(reessayer, 200)
    }
    reessayer()
    // ⚠️ Et l'on REPOSE pendant la première seconde. Le frontispice change de hauteur
    // après le montage, quand les effets rapportent les éditeurs et les œuvres sœurs :
    // mesuré en ligne le 2026-09-02, le paragraphe posé au pixel dérivait ensuite de
    // cinquante à cent pixels. Chaque repose s'abstient dès que le lecteur a bougé.
    for (const delai of [120, 350, 700, 1200]) {
      window.setTimeout(() => { if (!arret && !lecteurABouge()) poser() }, delai)
    }
    const main = mainRef.current
    if (main) ordonnerBlocsVisibles(main, hauteurNavbarPx())
    const fin = window.setTimeout(() => setEntree(false), DUREE_ENTREE_MS)
    return () => { arret = true; window.clearTimeout(fin) }
    // Une seule fois, au montage : l'arrivée ne se rejoue pas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  /** Rend la lecture au TEXTE SUIVI depuis la vue de l'apparat critique.
   *
   *  ⚠️ Il remonte au haut du texte (`ANCRE_DEBUT_LECTURE`) et non à l'endroit qu'on
   *  lisait avant d'ouvrir l'apparat : la page ne retient pas cette place, et une
   *  remontée franche vaut mieux qu'une place devinée. */
  const revenirAuTexte = () => {
    setVue('texte')
    setSegActif(null)
    setAncreEnAttente(null)
    if (mobile) setNavOuverte(false)
    pendingScrollTopRef.current = true
  }

  const allerAuNiv2 = (n2: string | null) => {
    setNiv2Actif(n2)
    setVue('texte')
    if (!n2) return
    const ancre = groupes.find(g => (!lectureTexteEntier || g.niv1 === niv1Actif) && g.niv2 === n2)?.anchor
    if (ancre) naviguerVersAncre(ancre)
  }

  // Les deux projections d'appels que le pipeline attend : l'une ferme sur les ancres du
  // texte lu, l'autre sur celles du texte en langue originale, dont les offsets sont
  // indexés par la clé d'origine. ⛔ Le module ne connaît ni les unes ni les autres : il
  // ne sait que POSER, jamais où chercher.
  const projectionsDuTexte = (ancres: Record<string, AncreNoteStructureeProjection[]>) => ({
    projeterAppels: (texte: string, cle: string | null) =>
      projeterAppels(texte, cle ? ancres[cle] : undefined),
    // ⛔ Un CHAMP DE TITRE se projette comme le texte, et ses ancres se cherchent dans
    // TOUS les segments du groupe : l'ancre d'un chapeau tombe parfois quelques segments
    // plus loin que le premier.
    projeterTitre: (texte: string, cles: readonly string[], champ: ChampTitre) =>
      projeterAppels(texte, cles.flatMap(cle => ancres[cle] ?? []), champDuTitre(champ)),
  })

  /**
   * Rattache à leur groupe d'alignement les segments qu'on vient de charger, et range
   * l'original de ces groupes.
   *
   * ⚠️ Un échec ici ne fait pas tomber la lecture : la colonne de droite manquera pour
   * la division rechargée, le texte restera lisible. Une division sans alignement n'est
   * pas une anomalie — la Cité de Dieu en a.
   */
  const rattacherAlignement = async (segs: SegData[]): Promise<SegData[]> => {
    if (!ensembleBilingue || !idTexteEnRegard) return segs
    try {
      const enRegard = await notesEnRegardCompletes()
      const projection = await chargerProjectionBilingue(supabase, {
        alignmentSetId: ensembleBilingue.alignmentSetId,
        idTexteTraduit: idTexte,
        idTexteOriginal: idTexteEnRegard,
        clesTraduites: segs.map(s => s.segmentKey).filter((c): c is string => Boolean(c)),
        notesOriginales: enRegard.notes,
        ancresOriginales: enRegard.ancres,
      })
      if (projection.blocParGroupe.size > 0) {
        setBlocsOriginalEtat(prev => ({ ...prev, ...Object.fromEntries(projection.blocParGroupe) }))
      }
      return segs.map(s => ({
        ...s,
        groupeOriginal: (s.segmentKey && projection.groupeParCle.get(s.segmentKey)) || null,
      }))
    } catch (error) {
      console.error(`Alignement bilingue indisponible (${ensembleBilingue.alignmentSetId}) :`, error)
      return segs
    }
  }

  const chargerNiv1Data = async (n1: string): Promise<{ groupes: GroupeData[]; segments: SegData[] }> => {
    // Les notes du texte en regard partent AVEC les segments, non après eux : la
    // projection bilingue (`rattacherAlignement`) les attendra.
    void notesEnRegardCompletes()
    const duTextePromis = notesDuTexteCompletes()
    // ⛔ `apparat_auteur` (prologue, avertissement de l'auteur) appartient au CORPS :
    // il se lit à sa place dans le texte. Ne pas le retirer de cette liste — c'est
    // ce qui l'avait fait disparaître du rendu. Distinct d'`apparat_critique`.
    // Chargement par lots de 1000 mais EN PARALLÈLE (les grosses divisions, ex.
    // Somme théologique ~6500 segments/niv1, se chargeaient en séquentiel) : on
    // récupère le total avec le 1er lot, puis on tire le reste d'un coup.
    const lotNiv1 = (from: number) => {
      let q = limiterRequeteSegmentsALaSurface(
        supabase.from('segments').select(SELECT_SEGMENT).eq('id_oeuvre', idOeuvre).eq('id_texte', idTexte),
        'corps',
      ).order('segment_numero').range(from, from + 999)
      if (!lectureTexteEntier && !texteSansNiveaux && n1) {
        q = n1 === NIV1_LIMINAIRES ? limiterRequeteAuxLiminairesSansNiveau(q) : q.eq('ref_niv1', n1)
      }
      return q
    }
    let premierReq = limiterRequeteSegmentsALaSurface(
      supabase.from('segments').select(SELECT_SEGMENT, { count: 'exact' }).eq('id_oeuvre', idOeuvre).eq('id_texte', idTexte),
      'corps',
    ).order('segment_numero').range(0, 999)
    if (!lectureTexteEntier && !texteSansNiveaux && n1) {
      premierReq = n1 === NIV1_LIMINAIRES ? limiterRequeteAuxLiminairesSansNiveau(premierReq) : premierReq.eq('ref_niv1', n1)
    }
    const premier = await premierReq
    if (premier.error) {
      console.error(`Chargement des segments impossible (${idTexte}/${n1}) :`, premier.error)
      throw premier.error
    }
    const segs: any[] = [...segmentsDeLaSurface(((premier.data as any[]) ?? []), 'corps')]
    const total = premier.count ?? segs.length
    if (total > 1000) {
      const restes = await Promise.all(
        Array.from({ length: Math.ceil(total / 1000) - 1 }, (_, i) => lotNiv1((i + 1) * 1000))
      )
      for (const r of restes) {
        if (r.error) {
          console.error(`Chargement d'un lot de segments impossible (${idTexte}/${n1}) :`, r.error)
          throw r.error
        }
        segs.push(...segmentsDeLaSurface(((r.data as any[]) ?? []), 'corps'))
      }
    }

    // Les liens ne sont plus portés par le segment : on les rapporte de
    // `liens_bibliques` et on les repose au format attendu par l'affichage.
    await hydraterLiensHerites(segs)

    const tousIds = new Set<string>()
    const segsAffichables = segs.filter(segmentAffichable)

    segsAffichables.forEach((s: any) => {
      [s.lien_1,s.lien_2,s.lien_3,s.lien_4].filter(Boolean).forEach((v: string) =>
        v.split(';').map((x: string) => x.trim()).filter(Boolean).forEach((x: string) => tousIds.add(x)))
    })
    const idsArr = Array.from(tousIds)
    let versetMap: VersetsCites = {}
    if (idsArr.length > 0) {
      const codesTraductions = await chargerCodesTraductions()
      const selectVersets = ['id_verset', 'ref', ...codesTraductions.map(code => `"${code}"`)].join(', ')
      // ⛔ Découpage OBLIGATOIRE, et par octets d'adresse : la « Secunda Secundae »
      // de la Somme vise 2 092 versets distincts, soit près de 36 ko rien que pour
      // la liste — bien au-delà des ~25 ko que la passerelle accepte, qu'elle
      // refuse d'un « 400 » nu. L'erreur n'est pas lue ici, à dessein : un verset
      // manquant ne doit pas fermer la division. Sans découpage, la division
      // s'ouvrait donc bel et bien, mais SANS aucun texte biblique sous ses
      // citations, et sans que rien ne le dise. Le rendu serveur, lui, découpait
      // déjà (`enrichirAvecVersets`) : le premier écran était juste, et le
      // rechargement d'une division le défaisait.
      const lots = await Promise.all(lotsPourClauseIn(idsArr).map(lot =>
        supabase.from('versets_lecture').select(selectVersets).in('id_verset', lot)))
      // ⚠️ Le repli sur `id_verset` d'une ligne sans `ref` vit dans le pipeline, avec son
      // test : c'est précisément le point où les deux surfaces avaient divergé.
      versetMap = indexerVersetsCites(
        lots.flatMap(r => r.data ?? []) as unknown as LigneVersetCite[],
        codesTraductions,
      )
    }

    // ⛔ LA MÊME CHAÎNE QUE LE PREMIER RENDU, et c'est tout l'objet du module : sa
    // numérotation locale remet le compteur à zéro à chaque `ref_niv1`, ce que celui d'ici
    // ne faisait pas — sans effet tant qu'on ne charge qu'une division, faux dès qu'on en
    // charge deux.
    const duTexte = await duTextePromis
    const { segments: newSegs, groupes: newGroupes } = composerSegments(segs as SegmentBrut[], {
      versetsCites: versetMap,
      notes: duTexte.notes,
      ...projectionsDuTexte(duTexte.ancres),
    })

    // Enrichir la carte niv1 → niv1_texte avec ce qu'on vient de charger
    const niv1TexteEntries: Record<string, string> = {}
    newGroupes.forEach(g => { if (g.niv1 && g.niv1_texte) niv1TexteEntries[g.niv1] = g.niv1_texte })
    if (Object.keys(niv1TexteEntries).length > 0)
      setNiv1TexteMap(prev => ({ ...prev, ...niv1TexteEntries }))

    return { groupes: newGroupes, segments: await rattacherAlignement(newSegs) }
  }

  // Les divisions entièrement de la main de l'auteur, qui paraissent AUSSI dans la vue
  // d'apparat. ⚠️ Redemandées à chaque rechargement, et non reçues du serveur : une
  // correction admin fait entrer ou sortir une pièce à l'instant même où l'on recharge,
  // et la liste du premier rendu serait périmée de la modification qu'on vient de faire.
  const divisionsApparatAuteur = async (): Promise<ReadonlySet<string>> => {
    const { data, error } = await supabase.rpc('get_niv1_apparat_auteur', {
      p_id_oeuvre: idOeuvre,
      p_id_texte: idTexte,
    })
    if (error) {
      console.error(`Divisions d'apparat d'auteur illisibles (${idTexte}) :`, error)
      return AUCUN_ECHO
    }
    return new Set(((data ?? []) as { ref_niv1: string | null }[])
      .map(ligne => String(ligne.ref_niv1 ?? '').trim())
      .filter(Boolean))
  }

  // Recharge tout l'apparat critique de l'œuvre depuis Supabase — nécessaire
  // après une modification ou une suppression admin, puisque l'apparat n'est
  // sinon chargé qu'une seule fois au rendu serveur de la page.
  const chargerApparatData = async () => {
    const duTextePromis = notesDuTexteCompletes()
    const { data, error } = await limiterRequeteSegmentsALaSurface(
      supabase
        .from('segments')
        .select(SELECT_SEGMENT)
        .eq('id_oeuvre', idOeuvre)
        .eq('id_texte', idTexte),
      'apparat',
    ).order('segment_numero')
    if (error) {
      console.error(`Chargement de l'apparat impossible (${idTexte}) :`, error)
      throw error
    }
    // L'apparat de l'AUTEUR se lit ici comme dans le texte : il y fait écho, par pièces
    // entières, et se compose en tête, sous son propre en-tête (`partagerLApparat`).
    const divisions = await divisionsApparatAuteur()
    const retenus = segmentsDeLaSurface(((data ?? []) as any[]), 'apparat', divisions).filter(segmentAffichable)
    const parSection = partagerLApparat(retenus)
    const segs = [...parSection.auteur, ...parSection.editeur]

    // La MÊME chaîne que le corps, à trois mots près : l'apparat porte des notices
    // bibliographiques, n'ouvre aucun volet biblique, et sa SECTION coupe ses groupes.
    const duTexte = await duTextePromis
    const { segments: newSegs, groupes: newGroupes } = composerSegments(
      segs as SegmentBrut[],
      {
        versetsCites: {},
        notes: duTexte.notes,
        ...projectionsDuTexte(duTexte.ancres),
        avecOuvrage: true,
        sansVersets: true,
      },
      { prefixeAncre: 'a', avecSection: true },
    )

    setGroupesApparat(newGroupes)
    // Les notices des ouvrages cités partent AVEC l'alignement, et arrivent avant que
    // les segments ne se posent : sans elles, un segment bibliographique retomberait
    // un instant sur son texte, la projection de secours. ⚠️ Une panne de la vue ne
    // ferme pas l'apparat : elle se dit, et les segments se lisent depuis le texte.
    const [segsAlignes, notices] = await Promise.all([
      rattacherAlignement(newSegs),
      chargerNoticesBibliographiques(supabase, identifiantsOuvrages(newSegs)).catch((erreur: unknown) => {
        console.error(`Notices bibliographiques illisibles (${idTexte}) :`, erreur)
        return new Map<number, NoticeBibliographique>()
      }),
    ])
    setNoticesBibliographiques(prev => ({ ...prev, ...tableDesNotices(notices) }))
    setSegmentsApparat(segsAlignes)
  }

  const changerNiv1 = async (n1: string, opts?: { forceRefresh?: boolean; conserverPosition?: boolean }) => {
    setNiv1Actif(n1)
    // La division lue s’inscrit dans la barre d’adresse, SANS navigation ni requête :
    // un rechargement subi rouvre alors l’œuvre ICI, et non à sa première division.
    inscrireNiv1DansLAdresse(n1)
    if (lectureTexteEntier) {
      // ⛔ En texte entier, il n'y a PAS de niveau 1 à recharger : le serveur a envoyé
      // l'œuvre d'un seul tenant. `chargerNiv1Data` ne sait rapporter qu'UNE section, et
      // un rafraîchissement forcé la substituait donc à tout le reste — la lecture se
      // repliait sans un mot sur la seule section courante, et le mode paraissait ne
      // plus s'appliquer, jusqu'au prochain rechargement de la page. Le seul équivalent
      // honnête d'un « forceRefresh » est ici de reprendre la page entière.
      if (opts?.forceRefresh) { window.location.reload(); return }
      setSegActif(null)
      setNiv2Actif(null)
      setVue('texte')
      const ancre = groupes.find(g => g.niv1 === n1)?.anchor
      // ⚠️ Une division que la première tranche ne porte pas encore s'atteint quand la
      // complétion arrive (`niv1AViserRef`), au lieu de ne rien faire.
      niv1AViserRef.current = ancre ? null : n1
      if (ancre) naviguerVersAncre(ancre)
      return
    }
    // Le texte s'efface d'abord ; ce qui suit ne s'applique qu'à la fin de
    // l'effacement, d'un seul tenant, pour que rien de l'ancienne division ne
    // reparaisse entre-temps (sa première page, la vue du texte…).
    const depart = departLocal()
    const appliquer = (donnees: { groupes: GroupeData[]; segments: SegData[] }) => {
      if (!opts?.conserverPosition) {
        setSegActif(null)
        setNiv2Actif(null)
        setVue('texte')
        setPageActuelle(0)
        pendingScrollTopRef.current = true
      }
      setGroupes(donnees.groupes)
      setSegments(donnees.segments)
      setArrivee(n => n + 1)
    }

    const enCache = !opts?.forceRefresh ? cacheNiv1Ref.current.get(n1) : undefined
    if (enCache) {
      setNiv1Loading(false)
      setNiv1Erreur(null)
      await finDeSortie(depart)
      appliquer(enCache)
    } else {
      setNiv1Loading(true)
      setNiv1Erreur(null)
      try {
        const donnees = await chargerNiv1Data(n1)
        cacheNiv1Ref.current.set(n1, donnees)
        await finDeSortie(depart)
        appliquer(donnees)
      } catch (error) {
        console.error(`Chargement du niveau ${n1} impossible :`, error)
        setNiv1Erreur(n1)
        // L'erreur se lit dans la barre du niveau : on rend son texte à la page.
        setSortie(false)
      } finally {
        setNiv1Loading(false)
      }
    }

    // Préchargement discret des niv1 voisins, en tâche de fond
    const idx = niv1List.indexOf(n1)
    ;[niv1List[idx - 1], niv1List[idx + 1]].forEach(voisin => {
      if (voisin && !cacheNiv1Ref.current.has(voisin)) {
        chargerNiv1Data(voisin).then(d => cacheNiv1Ref.current.set(voisin, d)).catch(error => {
          console.error(`Préchargement du niveau ${voisin} impossible :`, error)
        })
      }
    })
  }

  // Complétion en tâche de fond de la première tranche du niv1 initial. Le serveur
  // n'en envoie qu'une tranche (~1000 segments) pour peindre vite les grosses
  // divisions ; on charge ici le reste sans bloquer l'affichage, puis on remplace
  // par le niv1 complet. La tranche serveur est ordonnée par segment_numero (comme
  // `chargerNiv1Data`), donc c'en est un vrai préfixe : pas de saut visible.
  useEffect(() => {
    if (!niv1InitialPartiel) return
    let annule = false
    const n1 = niv1Actif
    ;(async () => {
      try {
        const donnees = await chargerNiv1Data(n1)
        cacheNiv1Ref.current.set(n1, donnees)
        // N'appliquer que si le lecteur est toujours sur ce niv1. ⚠️ En TEXTE ENTIER, la
        // tranche est le début de toute l'œuvre et la complétion la rapporte entière :
        // le niveau actif y suit le défilement, et le lecteur qui a lu plus bas
        // pendant le chargement ne doit pas perdre la suite pour autant.
        if (!annule && (lectureTexteEntier || niv1ActifRef.current === n1)) {
          setGroupes(donnees.groupes)
          setSegments(donnees.segments)
        }
      } catch (error) {
        // La tranche initiale reste affichée, mais l'échec n'est pas silencieux.
        console.error(`Complétion du niveau ${n1} impossible :`, error)
      }
    })()
    return () => { annule = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cf. useMemo groupesFiltres / segmentsFiltres définis plus haut (après `pages`)

  /**
   * Aller à un segment DÉJÀ CHARGÉ : tourner la page de pagination s'il le faut, le
   * retenir, et le poser au niveau des yeux. Rend faux si la division n'est pas là.
   *
   * ⚠️ C'est un GESTE, non un effet : le saut se joue au clic, et rien ne se repose
   * dans le corps d'un effet — ce qui coûterait un rendu en cascade.
   */
  const allerAuSegment = useCallback((segId: number, surface: 'corps' | 'apparat') => {
    const source = surface === 'apparat' ? groupesApparat : groupes
    const g = source.find(gr => gr.itemIds.includes(segId))
    // Aucun groupe ne porte une introduction : elle a son propre chemin (cf.
    // `viserIntroduction`). L'apparat n'en a pas.
    if (!g) return surface === 'corps' && viserIntroduction(segId)
    if (surface === 'corps') {
      const pageIdx = pages.findIndex(p => p.some(gr => gr.anchor === g.anchor))
      if (pageIdx >= 0 && pageIdx !== pageActuelle) setPageActuelle(pageIdx)
    }
    setSegActif(segId)
    // Le rendu de la page demandée doit avoir eu lieu avant qu'on vise.
    setTimeout(() => viserLeSegment(segId, g.anchor), 80)
    return true
  }, [groupes, groupesApparat, pages, pageActuelle, viserLeSegment, viserIntroduction])

  /**
   * Le renvoi de l'inventaire des notes vers la note DANS LE CORPS DU TEXTE, et la note
   * s'OUVRE (demande de l'auteur, 2026-09-11 : « quand je clique sur une note dans
   * “Notes”, j'aimerais qu'elle s'ouvre »). Le clic menait au passage et s'arrêtait là.
   *
   * ⛔ La division visée n'est pas toujours celle qu'on lit : c'est tout l'objet de
   * l'inventaire, qui est exhaustif sur le texte entier. Quand le segment n'est pas
   * chargé, on retient la cible et l'on change de division — l'effet du saut la reprend
   * dès que les groupes arrivent.
   *
   * ⚠️ La demande d'ouverture n'est posée que si un saut l'est aussi : restée en attente,
   * elle ouvrirait la note au premier saut venu.
   */
  // ⚠️ Fonction ordinaire, non mémorisée : `changerNiv1` ne l'est pas, et un
  // `useCallback` dont une dépendance change à chaque rendu ne mémorise rien.
  // Le saut proprement dit, une fois la place connue DANS LE TEXTE LU.
  const sauterVersLaNote = (cle: string, place: { id: number; division: string }, surface: 'corps' | 'apparat') => {
    noteAOuvrirRef.current = { cle, segId: place.id }
    if (allerAuSegment(place.id, surface)) return
    if (surface === 'corps' && place.division) {
      pendingScrollSegRef.current = place.id
      changerNiv1(place.division)
      return
    }
    noteAOuvrirRef.current = null
  }

  /**
   * LE RENVOI VERS UNE NOTE DU TEXTE EN REGARD.
   *
   * ⛔ LA PAGE NE NAVIGUE QUE PAR LES DIVISIONS DU TEXTE LU. Le latin ne les nomme pas
   * de la même façon — « Liber I » contre « Livre premier » —, et la place d'une note du
   * latin ne dit donc rien à `changerNiv1`. On demande à l'ALIGNEMENT ce qui, dans le
   * texte lu, fait face au segment qui la porte, et l'on saute là : l'appel latin y est
   * rendu dans la colonne d'en face, et `ouvrirLaNoteDansLeTexte` le retrouve par sa clé.
   *
   * ⛔ AUCUN REPLI PAR RANG : faute d'alignement, on ne bouge pas. Envoyer le lecteur au
   * mauvais endroit est pire qu'un bouton qui ne fait rien.
   *
   * ⚠️ Une erreur de la base se DIT au journal ; une absence d'alignement est un fait de
   * donnée, et elle n'a rien à y faire.
   */
  const ouvrirNoteEnRegard = (note: NoteRecensee, place: PlaceSegment) => {
    if (!ensembleBilingue || !idTexteEnRegard) return
    setVue('texte')
    void chargerPlaceEnRegard(supabase, {
      alignmentSetId: ensembleBilingue.alignmentSetId,
      idTexteTraduit: idTexte,
      idTexteOriginal: idTexteEnRegard,
      cleOriginale: place.segmentKey,
    })
      .then(enFace => { if (enFace) sauterVersLaNote(note.cle, enFace, 'corps') })
      .catch((erreur: unknown) => {
        console.error(`Place en regard illisible (${note.source.idTexte} · ${place.segmentKey}) :`, erreur)
      })
  }

  const allerALaNote = (note: NoteRecensee) => {
    const place = note.place
    if (!place) return
    setNoteCourante({ idTexte: note.source.idTexte, cle: note.cle })
    // Sur un téléphone, l'inventaire vit dans le tiroir, qui couvre le texte : on le
    // referme, sans quoi l'on ouvrirait la note d'un passage qu'on ne voit pas.
    if (mobile) setPanneauOuvert(false)
    // ⛔ Une note du texte EN REGARD n'a pas de place dans la navigation du texte lu :
    // elle passe par l'alignement, qui seul sait où elle tombe.
    if (note.source.idTexte !== idTexte) { ouvrirNoteEnRegard(note, place); return }
    const surface = place.surface
    setVue(surface === 'apparat' ? 'apparat' : 'texte')
    sauterVersLaNote(note.cle, place, surface)
  }

  // La LECTURE choisie : une bible, et la graphie dans laquelle on la lit. ⚠️ `trad` reste
  // l'identifiant de la TRADUCTION, et lui seul part dans une adresse, dans un signet ou
  // dans la préférence du lecteur : une graphie ne se retient pas d'un passage à l'autre.
  const lecture = lecturesBible[tradIndex] ?? LECTURE_DE_REPLI
  const trad = lecture.tradId
  const segMap = new Map(segmentsFiltres.map(s => [s.id, s]))
  // La LETTRINE ne se pose pas sur le premier segment venu : elle se pose sur le
  // premier que sa nature autorise à la porter (`accepteLaLettrine`). Une division
  // qui s'ouvre sur le verset commenté, un lemme ou une rubrique la reporte donc au
  // premier paragraphe de l'auteur — ce que fait l'imprimé, qui n'orne jamais la
  // parole d'un autre. ⛔ On ne cherche que dans le PREMIER groupe : plus loin, la
  // capitale tomberait au milieu de la page, où elle n'ouvrirait plus rien.
  // ⚠️ Ce calcul a besoin de `segMap` et vit donc ICI, non plus au-dessus des pages.
  const premierSegmentId = pageActuelle === 0 && groupesFiltres.length > 0
    ? (groupesFiltres[0].itemIds.find(id => accepteLaLettrine(segMap.get(id))) ?? null)
    : null
  const segMapApparat = new Map(segmentsApparat.map(s => [s.id, s]))
  const segMapActive = vue === 'texte' ? segMap : segMapApparat
  // Un groupe qui enjambe deux blocs ne compose son original qu'une fois, dans le
  // premier : voir `repartirGroupes`. Les bornes se prennent sur TOUTE la page, et non
  // sur un groupe structurel, sans quoi un empan à cheval sur deux sections se
  // recomposerait dans chacune. ⚠️ L'ordre de `segmentsFiltres` fait foi, et c'est bien
  // l'ordre de lecture (`segment_numero`), qu'aucun filtre ne dérange.
  //
  // ⛔ ET LES INTRODUCTIONS EN SONT (2026-09-07, le soir). Elles sont hissées en tête,
  // hors des groupes structurels, donc absentes de `segmentsFiltres` : leur empan
  // n'avait AUCUNE borne, et `repartirGroupes` fait alors composer l'original par
  // chaque rang qu'il touche — c'est son repli, et il est juste tant qu'on ne sait
  // rien. Or un argument vaut un bloc à lui seul : l'original se recopiait donc
  // autant de fois que le groupe compte de segments. Mesuré sur le *Manuel* de
  // Dhuoda, dont les 94 segments français sont tous des introductions : l'épigramme
  // tient un seul groupe de quatorze vers, et la colonne latine portait quatorze
  // fois la strophe entière, chaque vers latin paraissant quatorze fois.
  // ⛔ La liste des bornes est donc EXACTEMENT celle que la page rend, dans l'ordre
  // où elle la rend : c'est la seule garantie qu'un empan ne se compose qu'une fois.
  // ⚠️ Les introductions ne sont rendues que sur la PREMIÈRE page — les compter
  // ailleurs viderait la colonne d'un empan que la page compose pourtant.
  const introsEnTete = useMemo(
    () => (pageActuelle === 0 ? segments.filter(s => s.nature === 'introduction') : []),
    [segments, pageActuelle],
  )
  const bornesGroupes = bornesDesGroupes([...introsEnTete, ...segmentsFiltres])

  // ── LES TITRES QUE LA PAGE MONTRE ───────────────────────────────────────────
  // Une seule règle pour le rendu des titres et pour la frontière des citations
  // (`titresDeDivision.ts`, charte § 38.8.1) : la copie du lasso coupe exactement là où
  // la page compose un titre. Le niveau 1 reprend celui de la page précédente, les
  // niveaux suivants repartent à vide en tête de page.
  const titresAuDepart: NiveauxDuPassage = {
    ...AUCUN_TITRE_MONTRE,
    niv1: pageActuelle > 0 ? (pages[pageActuelle - 1]?.at(-1)?.niv1 ?? '') : '',
  }
  const reglageDesTitres: ReglageDesTitres = { profondeur: profondeurCorps, niveau1DansLeCorps: lectureTexteEntier }

  // Une note appelée dans un TITRE n'est pas toujours définie sur le premier
  // segment de son groupe : dans les imports à notes structurées, son ancre tombe
  // quelques segments plus loin (Discours sur la Genèse : l'appel du chapeau du
  // « Premier discours » est ancré au huitième segment). Le titre cherche donc son
  // appel dans toute la section chargée, à défaut du groupe — sans quoi l'appel
  // paraîtrait avec une note vide.
  const notesSection = useMemo(() => {
    const banque: Record<string, NoteAffichee> = {}
    for (const s of [...segments, ...segmentsApparat]) {
      if (!s.notes) continue
      for (const cle of Object.keys(s.notes)) if (banque[cle] === undefined) banque[cle] = s.notes[cle]
    }
    return banque
  }, [segments, segmentsApparat])

  const notesDuTitre = useCallback(
    (textes: (string | null | undefined)[], locales?: Record<string, NoteAffichee>) =>
      notesPourTexte(textes, [locales, notesSection]),
    [notesSection],
  )
  const segActifData = segActif !== null ? segMapActive.get(segActif) : null

  // ── LE TEXTE DE LA BIBLE CHOISIE, QUAND ELLE N'EST PAS DANS LA VUE LARGE ──────
  //
  // ⛔ ON NE CHARGE QUE CE QU'ON REGARDE. Une division de la Somme cite plus de deux
  // mille versets, et le volet n'en montre jamais que ceux d'un paragraphe : le texte
  // de Fillion ou du témoin 899 se demande donc au paragraphe ouvert, jamais à la
  // division. Il reste ensuite en mémoire, si bien que revenir sur un passage ne
  // recharge rien, et que changer de bible ne recharge que la poignée sous les yeux.
  //
  // ⚠️ Les cinq bibles de la vue large n'entrent jamais ici : leur texte est arrivé
  // avec celui de la page, et le redemander doublerait la lecture la plus courante.
  const canonsDuSegment = (segActifData?.versets ?? []).map(v => v.id).join(' ')
  useEffect(() => {
    if (lecture.chemin === 'canonique') return
    const ids = canonsDuSegment ? canonsDuSegment.split(' ') : []
    if (ids.length === 0) return
    // Le créneau est inscrit au registre AVANT la réponse : sans cela, un rendu de plus
    // pendant le vol relancerait la même lecture.
    const marque = (id: string) => `${lecture.code}|${id}`
    const manquants = ids.filter(id => !versetsDemandes.current.has(marque(id)))
    if (manquants.length === 0) return
    manquants.forEach(id => versetsDemandes.current.add(marque(id)))
    // ⚠️ Les textes reçus se rangent DANS TOUS LES CAS, même si le lecteur a changé de
    // bible entre-temps : ils sont justes, ils sont rangés sous leur propre lecture, et
    // ils resserviront tels quels s'il y revient.
    chargerTextesParCanon(supabase, lecture, manquants).then(textes => {
      setTextesHorsVueLarge(avant => ({
        ...avant,
        [lecture.code]: { ...(avant[lecture.code] ?? {}), ...textes },
      }))
    }, erreur => {
      console.warn('[oeuvre] texte biblique non chargé', erreur)
      // Une lecture qui a échoué se REDEMANDE : on retire les marques posées.
      manquants.forEach(id => versetsDemandes.current.delete(marque(id)))
    })
  }, [lecture, canonsDuSegment])

  /**
   * Le texte d'un verset dans la lecture choisie.
   *
   * ⛔ AUCUN REPLI D'UNE BIBLE SUR UNE AUTRE hors de la vue large : un verset que
   * Fillion ne porte pas se dit absent, il ne se remplace pas en silence par celui de
   * Sacy sous le nom de Fillion. C'est la faute même que le filtrage du menu avait
   * corrigée le 15 septembre.
   */
  const texteDeLaLecture = (verset: { id: string; textes: Record<string, string> }): string => {
    if (lecture.chemin === 'canonique') return verset.textes[trad] || verset.textes['TR0001'] || ''
    return textesHorsVueLarge[lecture.code]?.[verset.id] ?? ''
  }

  // ⛔ LE COMPTE DES COMMENTAIRES SE PREND ICI, NON DANS L’ONGLET (demande de
  //    l’auteur, 2026-09-09 : « afficher le nombre de résultats, références et
  //    commentaires distinctement, dans la barre dédiée »). L’onglet ne les charge
  //    que MONTÉ, c’est-à-dire tiroir ouvert et onglet choisi : il ne peut donc rien
  //    dire à une barre fermée, qui est précisément là où le compte sert.
  //    ⚠️ Une tête de comptage, sans une ligne rapatriée, et sous la session du
  //    LECTEUR : elle rend ce que la politique lui laisse voir, non le total réel.
  //    ⛔ Elle ne part pas au-delà de 2^31 : `commentaires.id_segment` est un
  //    `integer` quand `segments.id` est un `bigint`, et 2 589 segments du corpus
  //    dépassent la borne (défaut de DONNÉE relevé le 2026-09-05). La requête y
  //    rendrait un 400 à chaque clic ; on se tait plutôt que de crier.
  // ⛔ LE COMPTE SE DÉDUIT, IL NE SE REMET PAS À ZÉRO DANS UN EFFET. Il est retenu AVEC
  //    le segment auquel il appartient, et l’on ne le lit que s’il répond au segment
  //    courant : une réponse arrivée pour le passage d’avant ne peut donc pas s’afficher
  //    sous celui d’après, et rien ne se remet à zéro dans un corps d’effet, ce que le
  //    linter refuse à bon droit. C’est le patron de la Polyglotte (charte, § 50.1).
  const [compteCommentaires, setCompteCommentaires] = useState<{ seg: number; n: number } | null>(null)
  useEffect(() => {
    if (segActif === null || segActif > ID_SEGMENT_MAX) return
    let vivant = true
    void supabase
      .from('commentaires')
      .select('id', { count: 'exact', head: true })
      .eq('id_segment', segActif)
      .then(({ count, error }) => {
        if (!vivant) return
        if (error) { console.warn('[oeuvre] compte des commentaires indisponible', error); return }
        setCompteCommentaires({ seg: segActif, n: count ?? 0 })
      })
    return () => { vivant = false }
  }, [segActif])
  const nbCommentairesSegment = compteCommentaires && compteCommentaires.seg === segActif
    ? compteCommentaires.n
    : null

  // Ce que la barre du volet de droite annonce quand un passage est retenu.
  // ⚠️ Le compte des commentaires peut manquer (il arrive après, ou la borne du
  //    `integer` l’interdit) : la barre dit alors les seules références.
  const libelleBarreVolet = (() => {
    if (segActif === null || !segActifData) return 'Références & commentaires'
    const r = segActifData.versets.length
    const parts = [`${r} référence${r > 1 ? 's' : ''}`]
    if (nbCommentairesSegment !== null) {
      const c = nbCommentairesSegment
      parts.push(`${c} commentaire${c > 1 ? 's' : ''}`)
    }
    return parts.join(' · ')
  })()
  // idOeuvre vient des Props
  const tocApparatLocal = useMemo(
    () => construireNavigationApparat(groupesApparat),
    [groupesApparat],
  )
  // Les mains que l'apparat porte, dans l'ordre de la vue : l'auteur, puis l'éditeur. Une
  // rubrique par main dans le volet (2026-09-15).
  const sectionsApparat = useMemo(
    () => (['auteur', 'editeur'] as const).filter(section => tocApparatLocal.some(entry => entry.section === section)),
    [tocApparatLocal],
  )
  const apparatsOuverts = sectionsApparat.filter(section => apparatOuvert[section]).length
  // Les apparats prennent toute la hauteur qui reste quand rien ne les suit dans le volet,
  // ni sommaire ni retour au texte, comme la rubrique unique le faisait.
  const apparatSEtire = !sommaireAQuoiSommer && !revenirAuTexteVisible

  // Détection session + chargement des segments déjà sauvegardés
  // + traduction biblique par défaut choisie dans Mon compte
  const chargerTraductionDefaut = (uid: string) => {
    supabase.from('profils').select('traduction_defaut').eq('id', uid).maybeSingle().then(({ data }) => {
      if (data?.traduction_defaut) {
        localStorage.setItem('traduction_defaut', data.traduction_defaut)
        // ⛔ LA PRÉFÉRENCE EST RETENUE, ELLE N'EST PAS APPLIQUÉE ICI. Cette fonction est
        // appelée depuis l'effet de session, dont les dépendances ne comptent pas la
        // liste des bibles : elle n'en voyait donc que l'état où elle se trouvait à sa
        // création — le repli, le plus souvent, qui ne porte ni Fillion ni le témoin.
        // Une préférence pour l'une d'elles ne prenait effet qu'à la visite suivante,
        // quand le navigateur la relisait dans son magasin. C'est l'effet ci-dessous,
        // qui connaît la liste, qui tranche.
        setDefautProfil(data.traduction_defaut)
      }
    })
  }

  useEffect(() => {
    // ⛔ `est_biblique` : c'est ICI que le défaut se voyait le mieux — la page d'une œuvre
    // patristique offrait, dans son menu de traductions BIBLIQUES, les quatre notices des
    // traductions patristiques elles-mêmes, dont celle qui sert la page. Voir app/page.tsx.
    // ⛔ ET LE MENU NE PROPOSE QUE CE QUE LE VOLET SAIT LIRE (2026-09-15). Il listait toutes
    // les bibles de `traductions`, quand `versets_lecture` n'en porte que cinq : choisir la
    // Bible du XIIIe siècle affichait son nom au-dessus du texte de Sacy, pris en repli sans
    // un mot.
    // ⛔ MAIS « CE QUE LE VOLET SAIT LIRE » A CHANGÉ (2026-09-16) : la vue large n'est plus
    // la seule source. Fillion et la Bible du XIIIe siècle se lisent par leurs propres
    // chemins, et le menu les offre donc, familles et graphies comprises. L'inventaire des
    // chemins est un fait observé en base, jamais une liste écrite ici.
    chargerFaitsDesBibles(supabase).then(faits => {
      const liste = lecturesDisponibles(faits)
      if (liste.length) setLecturesBible(liste)
    }, erreur => { console.warn('[oeuvre] bibles du volet non chargées', erreur) })
  }, [])

  // La bible que le lecteur a choisie pour de bon : celle de son compte, à défaut celle
  // que son navigateur a retenue. ⚠️ Elle se résout DÈS QUE LA LISTE CHANGE, et la liste
  // change une fois — du repli aux bibles réelles. Une préférence que le repli ne porte
  // pas trouve donc sa place à cet instant-là, et non à la visite suivante.
  useEffect(() => {
    const code = defautProfil ?? localStorage.getItem('traduction_defaut')
    if (!code) return
    const idx = rangDeLaLecture(lecturesBible, code)
    if (idx >= 0) setTradIndex(idx)
  }, [lecturesBible, defautProfil])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null
      setUserId(uid)
      if (uid && idOeuvre) chargerSauvegardesSegs(uid, idOeuvre, idTexte)
      if (uid) chargerTraductionDefaut(uid)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user.id ?? null
      setUserId(uid)
      if (uid && idOeuvre) chargerSauvegardesSegs(uid, idOeuvre, idTexte)
      else setSauvegardesSegs(new Set())
      if (uid) chargerTraductionDefaut(uid)
    })
    return () => listener.subscription.unsubscribe()
  }, [idOeuvre, idTexte])

  useEffect(() => {
    if (idOeuvre && oeuvre?.titre) {
      localStorage.setItem('cs_derniere_oeuvre', JSON.stringify({ id: idOeuvre, titre: oeuvre.titre, auteur }))
    }
  }, [idOeuvre, oeuvre?.titre, auteur])

  // Une œuvre peut être signée à plusieurs : « du même auteur » et les traductions
  // sœurs se cherchent alors sur TOUS ses auteurs, et par les couples (œuvre,
  // auteur) — un filtre sur `oeuvres.id_auteur` manquerait les œuvres que l'auteur
  // co-signe sans les ouvrir.
  const idsAuteurs = useMemo(
    () => (auteursOeuvre.length > 0 ? auteursOeuvre.map(a => a.id_auteur) : auteurId ? [auteurId] : []),
    [auteursOeuvre, auteurId],
  )
  const cleAuteurs = idsAuteurs.join(',')

  // Chaque auteur porte son propre nom cliquable : sur une œuvre signée à deux,
  // le lecteur atteint la fiche de l'un ou de l'autre. Repli sur le nom composé
  // (non cliquable) si la liste n'a pas été fournie.
  // ⛔ Le survol du nom N'OUVRE PLUS DE CARTE (décision de l'auteur, 2026-08-31) :
  // `ApercuAuteur` montrait au bout de 220 ms un portrait, les dates et deux cents
  // signes de la notice, c'est-à-dire un morceau de la page qu'un clic ouvre en
  // entier. Le composant est retiré, sa forme de bouton conservée dans `NomVolet`,
  // que la carte « Traduction » de la page Bible emploie désormais aussi.
  const auteursCliquables = useMemo(
    () => (auteursOeuvre.length > 0 ? auteursOeuvre : auteurId && auteur ? [{ id_auteur: auteurId, nom: auteur, rang: 1 }] : []),
    [auteursOeuvre, auteurId, auteur],
  )

  // ── LES VOLETS DE LA FICHE « À PROPOS » ───────────────────────────────────
  //
  // ⛔ DEUX COLONNES À L'ÉCRAN, DEUX VOLETS DANS LA FICHE (demande de l'auteur,
  // 2026-09-08). En lecture bilingue, la fiche ne décrivait que le texte « principal » :
  // on pouvait lire le latin de Knöll pendant qu'elle parlait de la traduction de
  // Moreau, sans qu'un mot le signale. ⚠️ Le premier volet est celui qu'on LIT, la fiche
  // s'ouvrant sur ce que le lecteur vient de cliquer ; le second est celui d'en regard.
  //
  // ⚠️ L'onglet prend la LANGUE pour nom : c'est ce qui sépare les deux colonnes, et le
  // mot que le menu « Mode de lecture » emploie déjà trois rubriques plus haut. À défaut — une
  // version sans langue déclarée —, le libellé court de l'édition, qui la nomme toujours.
  //
  // ⛔ Un seul volet ne pose pas de barre : `FicheEdition` s'en charge, et la règle est
  // celle du site — une barre d'un onglet annonce un choix qu'elle n'offre pas.
  const voletsFiche = useMemo<VoletFiche[]>(() => {
    const volet = (v: VersionTextuelle | null, cle: string): VoletFiche => ({
      cle,
      libelle: (v?.langue ? libelleLangue(v.langue) : null) || v?.labelCourt || 'Édition',
      donnees: {
        oeuvre: oeuvrePourVersion(v),
        titre: titreAffiche,
        auteurs: auteursCliquables,
        auteurNom: auteur,
        versionActive: v,
        versions: versionsTextuelles,
        aTexteOriginal,
      },
    })
    const lu = volet(versionActive, versionActive?.idTexte ?? 'lu')
    if (!versionEnRegard || versionEnRegard.idTexte === versionActive?.idTexte) return [lu]
    return [lu, volet(versionEnRegard, versionEnRegard.idTexte)]
  }, [oeuvrePourVersion, titreAffiche, auteursCliquables, auteur, versionActive, versionEnRegard, versionsTextuelles, aTexteOriginal])
  // Un fragment, pas un composant : `NomsAuteurs` était déclaré au rendu, donc de
  // type neuf à chaque passage, ce que React ne reconnaît pas. Il ne porte aucun état
  // et ne sert qu'une fois — le rendre en valeur suffit, et l'identité cesse d'être
  // en jeu (même motif que les lignes de fiche dans SectionTraductions).
  // ⛔ AUCUNE CONJONCTION ENTRE LES NOMS (demande de l'auteur, 2026-09-09).
  // `NomVolet` se compose en bloc : chaque nom tient sa ligne, et le « et » tombait
  // donc seul au milieu de la colonne. Les noms se suivent, cela suffit à les lier.
  // La fiche dit l'œuvre (genres, composition) et son édition en ligne (millésime,
  // étendue, autres éditions) : la garde compte donc CE QU'ELLE SAIT DIRE, et non les
  // seuls champs de l'édition imprimée. ⚠️ C'est elle qui décide si le TITRE s'ouvre.
  const ficheEditionDisponible = Boolean(
    oeuvreAffichee.sous_titre || oeuvreAffichee.titre_original || oeuvreAffichee.trad_auteur
    || oeuvreAffichee.editeur || oeuvreAffichee.ville || oeuvreAffichee.date_publication
    || oeuvreAffichee.collection || oeuvreAffichee.date_composition || oeuvreAffichee.genres?.length
    || oeuvreAffichee.bibliographie_selective || oeuvreAffichee.date_mise_en_ligne || oeuvreAffichee.url_source || versionsTextuelles.length > 1,
  )
  // ⚠️ LES NOMS SONT PASSÉS SOUS LE TITRE (2026-09-10) : ils ne sont plus dans la
  // rangée d'actions, et ne portent donc plus `refNoms` — c'est le titre qui demande
  // désormais la place, et c'est lui qu'on mesure. Ils s'y composent en variante
  // `credit`, en petit corps et sans flèche, l'auteur ayant demandé qu'elle parte.
  const nomsAuteurs = (
    <span style={{ minWidth: 0, display: 'block' }}>
      {auteursCliquables.map(a => (
        <NomVolet key={a.id_auteur} onOuvrir={() => setAuteurModalId(a.id_auteur)} inactif={!a.id_auteur}
          variante="credit" titre="Voir la fiche de l’auteur">{a.nom}</NomVolet>
      ))}
    </span>
  )

  const [oeuvresDesAuteurs, setOeuvresDesAuteurs] = useState<string[]>([])
  useEffect(() => {
    if (!cleAuteurs) { setOeuvresDesAuteurs([]); return }
    let annule = false
    const ids = cleAuteurs.split(',')
    // ⛔ Le filtre est en BASE : on lisait le catalogue ENTIER des couples auteur/œuvre
    // pour n'en garder que les œuvres de ces auteurs-là. Voir `chargerOeuvresDAuteurs`.
    chargerOeuvresDAuteurs(supabase, ids).then(oeuvres => {
      if (annule) return
      setOeuvresDesAuteurs(oeuvres)
    })
    return () => { annule = true }
  }, [cleAuteurs])

  // ⛔ UNE SEULE LECTURE POUR DEUX LISTES. Deux effets interrogeaient `oeuvres` avec le
  // MÊME filtre et des colonnes qui ne différaient que par `nb_signes` : deux
  // allers-retours pour un seul ensemble de lignes. Ce qui les séparait n'était pas la
  // requête mais ce qu'on en tire — « Du même auteur » range au titre, les traductions
  // sœurs retiennent celles qui portent le même titre que l'œuvre lue.
  //
  // ⚠️ L'ordre de la requête reste celui des SŒURS (`date_publication`) : le tri au titre
  // se fait déjà en mémoire, et un tri en mémoire ne rend pas l'ordre de la base.
  useEffect(() => {
    if (!auteurId) return
    let annule = false
    // `nb_signes` commande le partage entre œuvres et opuscules : ne pas le retirer.
    const base = supabase.from('oeuvres').select('id_oeuvre, titre, acces_public, trad_auteur, editeur, ville, date_publication, langue_originale, langue_trad, nb_signes')
    // Repli sur le premier auteur tant que les couples ne sont pas chargés (ou
    // s'ils n'ont pas pu l'être) : la liste reste peuplée, simplement sans les
    // co-signatures.
    const requete = oeuvresDesAuteurs.length > 0 ? base.in('id_oeuvre', oeuvresDesAuteurs) : base.eq('id_auteur', auteurId)
    // ⛔ L'ŒUVRE COURANTE EST DANS LA LISTE (demande de l'auteur, 2026-09-08 : « afficher
    //    une liste de toutes les œuvres […] y compris celle en cours, et montrer qu'elle
    //    est sélectionnée »). Elle en était RETIRÉE par un `.neq`, et la liste devenait
    //    alors le catalogue de tout ce qu'on ne lit pas : le lecteur y cherchait sa place
    //    et ne l'y trouvait jamais. Une liste où l'on se voit est une carte ; une liste
    //    d'où l'on est absent est un ailleurs.
    requete
      .order('date_publication', { ascending: true, nullsFirst: true })
      .then(({ data }) => {
        if (annule) return
        // ⚠️ Le type décrit ce que le SELECT demande, non la table : une colonne
        // retirée du select casse alors à la compilation (charte, « Typer une lecture »).
        const lignes = (data ?? []) as (VersionTrad & { nb_signes: number | null })[]
        // ⚠️ L'œuvre COURANTE échappe au filtre de publication : on est en train de la
        //    lire. Un administrateur qui ouvre une œuvre non publiée doit s'y voir, sans
        //    quoi la liste dirait qu'il lit ce qui n'existe pas.
        setOeuvresAuteur(lignes
          .filter(o => o.id_oeuvre === idOeuvre || estOeuvrePubliee(o))
          // Classement alphabétique en écartant l'article/déterminant de tête
          // (« La Cité de Dieu » → à « C »), titre brut en départage.
          .sort((a, b) => cleTriTitre(a.titre).localeCompare(cleTriTitre(b.titre), 'fr')
            || String(a.titre).localeCompare(String(b.titre), 'fr')))
        // Les traductions sœurs : même auteur, même titre normalisé, œuvre courante
        // incluse. S'il y en a plus d'une, le sélecteur de traduction s'affiche.
        const norm = (t: string) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
        const cible = norm(oeuvre?.titre || '')
        setVersions((lignes as VersionTrad[]).filter(o => norm(o.titre) === cible && estOeuvrePubliee(o)))
      })
    return () => { annule = true }
  }, [auteurId, idOeuvre, oeuvre?.titre, oeuvresDesAuteurs])

  // ── Éditions de l'ouvrage et menus de lecture (deux menus) ─────────────────
  // Menu 1 = mode de lecture (LANGUE) ; menu 2 = édition dans cette langue. Une
  // édition en langue ORIGINALE (langue_trad vide, langue_originale renseignée)
  // est le texte original ; les autres sont des traductions. « versions » = les
  // œuvres sœurs (même titre normalisé), langue comprise ; l'œuvre courante en
  // fait partie. Le mode « original » vise le TEXTE en langue originale de l'œuvre,
  // sinon l'ŒUVRE latine/grecque AUTONOME quand elle existe (titres d'origine).
  const estEditionOriginale = (v: { langue_trad: string | null; langue_originale: string | null }) =>
    !(v?.langue_trad && v.langue_trad.trim()) && !!(v?.langue_originale && v.langue_originale.trim())
  // Le latin d'une œuvre n'a plus besoin d'être une ŒUVRE à part pour se lire à ses
  // titres d'origine : il peut être un TEXTE de l'œuvre, à côté de la traduction
  // (Les Confessions, 2026-08-23 : Knöll CSEL 33 sous A0010O0001, avec son apparat).
  // La règle de reconnaissance est la même qu'entre œuvres sœurs — pas de traducteur,
  // et la langue de l'œuvre —, pour qu'il n'y en ait qu'une à retenir. Elle vit
  // désormais dans `paireDeLecture.ts`, avec le serveur qui l'applique aussi : elle
  // était écrite ici, là-bas, et dans deux replis d'accents différents.
  const estVersionOriginale = (v: VersionTextuelle) =>
    estVersionEnLangueOriginale(v, oeuvre.langue_originale)
  // ⛔ NI L'UN NI L'AUTRE NE SE CHOISIT PLUS PAR `find` : « le premier original venu »
  // et « la première traduction venue » lisaient l'ordre de Supabase, c'est-à-dire le
  // millésime seul, et deux éditions de la même année s'y rangeaient au hasard.
  const versionOriginale = paireDeLecture.original
  const versionTraduite = paireDeLecture.traductionFr
  const surTexteOriginal = !!versionActive && estVersionOriginale(versionActive)
  const editionCourante = versions.find(v => v.id_oeuvre === idOeuvre) ?? null
  const couranteEstOriginale = surTexteOriginal || (editionCourante ? estEditionOriginale(editionCourante)
    : (!!oeuvre.langue_originale && !aTexteOriginal))
  // Une œuvre en langue originale lue POUR ELLE-MÊME (le latin autonome, à ses titres
  // d'origine) a son CORPS en latin ou en grec : il se compose alors comme la colonne
  // originale du bilingue. Sans quoi le corps se déclarait « fr » et « hyphens: auto »
  // coupait le latin avec le dictionnaire français, faute que le navigateur en ait un
  // pour ces langues — c'est justement pourquoi nous posons les césures nous-mêmes.
  // ⛔ LA LANGUE DU CORPS EST CELLE DU TEXTE LU, et non « l'original, sinon le français ».
  // Une traduction latine lue pour elle-même (Funk, sous la Doctrine des Apôtres) se
  // déclarait « fr », et « hyphens: auto » la coupait au dictionnaire français.
  const langueCorps = codeLangue(versionActive?.langue ?? (couranteEstOriginale ? oeuvre.langue_originale : null))
  const composerCorps = (texte: string) => langueCorps === 'grc' ? cesurerGrec(texte)
    : langueCorps === 'la' ? cesurerLatin(normaliserEspacesOriginal(texte)) : texte
  const editionsTraduction = versions.filter(v => !estEditionOriginale(v))
  const editionsOriginal = versions.filter(estEditionOriginale)
  // ⛔ AUCUNE LANGUE PAR DÉFAUT DANS LE CHOIX DE LECTURE (relevé de l'auteur, 2026-09-13).
  // Les libellés se lisent sur les TEXTES : la langue de l'original retenu, celle de la
  // traduction que vise le premier mode. Le latin tenait lieu de langue inconnue, et le
  // premier mode se disait « Français » même quand il menait au latin de Funk.
  const langueOriginaleLue = versionOriginale?.langue || editionsOriginal[0]?.langue_originale || oeuvre.langue_originale || null
  const labelOrigMenu = libelleLangue(langueOriginaleLue) || 'Texte original'
  const editionFrRef = (!couranteEstOriginale && editionCourante) ? editionCourante : (editionsTraduction[0] ?? null)
  const labelTraductionMenu = libelleLangue(versionTraduite?.langue || editionFrRef?.langue_trad) || 'Français'
  const labelBilingueMenu = `${labelTraductionMenu} & ${libelleLangue(langueOriginaleLue) || 'original'}`
  const editionOrigRef = (couranteEstOriginale && editionCourante) ? editionCourante : (editionsOriginal[0] ?? null)
  const aOriginalQuelconque = aTexteOriginal || editionsOriginal.length > 0 || couranteEstOriginale || !!versionOriginale
  // Deux textes d'une même œuvre se rejoignent par `?texte=`, deux œuvres sœurs par
  // leur identifiant. On ne bascule le mode sur place que si la cible est bien le
  // texte qu'on lit déjà : sans cette seconde condition, passer du latin au français
  // sous la même œuvre ne faisait que retourner le mode et laissait le latin à l'écran.
  // Un mode qui reste sur le même texte se bascule sur place ; les autres changent de
  // page. `urlDuModeOuNull` dit lesquels, ce qui sert aussi à ne précharger que ceux-là.
  const urlDuModeOuNull = (cibleOeuvre: string, mt: 'fr' | 'bilingue' | 'la', cibleTexte?: string | null) =>
    cibleOeuvre === idOeuvre && (!cibleTexte || cibleTexte === idTexte)
      ? null
      : urlDuTexte(cibleOeuvre, mt, cibleTexte)
  const allerAuMode = (cibleOeuvre: string, mt: 'fr' | 'bilingue' | 'la', cibleTexte?: string | null) => {
    const url = urlDuModeOuNull(cibleOeuvre, mt, cibleTexte)
    if (url === null) { basculerTexte(mt); return }
    naviguer(url)
  }
  // Cible du mode « original » :
  //  - si l'œuvre courante EST l'original, on la lit elle-même (mt=fr = son texte) ;
  //  - sinon l'œuvre latine/grecque AUTONOME sœur si elle existe (mt=fr, titres d'origine) ;
  //  - sinon la colonne originale lue seule sur place (mt=la), que l'alignement compose.
  const origAutonome = !couranteEstOriginale && !!editionOrigRef && editionOrigRef.id_oeuvre !== editionFrRef?.id_oeuvre
  const cibleOrigOeuvre = couranteEstOriginale ? idOeuvre : origAutonome ? editionOrigRef!.id_oeuvre : (editionFrRef?.id_oeuvre ?? idOeuvre)
  const cibleOrigMt: 'fr' | 'la' = (couranteEstOriginale || origAutonome) ? 'fr' : 'la'
  type ModeLecture = { cle: string; label: string; cibleOeuvre: string; cibleTexte?: string | null; cibleMt: 'fr' | 'bilingue' | 'la'; actif: boolean }
  const modesLecture: ModeLecture[] = []
  // Le texte en langue originale de CETTE œuvre passe avant l'œuvre sœur : il porte
  // ses titres d'origine ET son apparat.
  //
  // ⚠️ LA GARDE PORTE SUR LA CIBLE, et non sur ce qui permet de la calculer. Les
  // œuvres sœurs (`versions`) sont chargées par un effet : elles sont VIDES au premier
  // rendu, qui est celui du serveur, si bien que `editionFrRef` y vaut TOUJOURS null.
  // La garde « editionFrRef || versionTraduite » laissait donc passer toute œuvre
  // traduite jusqu'à `editionFrRef!.id_oeuvre`, et la page tombait en 500 avant d'avoir
  // rien affiché — toutes les œuvres traduites, la Doctrine des Apôtres en témoin.
  const cibleFrOeuvre = versionOriginale ? (versionTraduite ? idOeuvre : null) : (editionFrRef?.id_oeuvre ?? null)
  const cibleFrTexte = versionOriginale ? (versionTraduite?.idTexte ?? null) : null
  // ⛔ LE BILINGUE A SA PROPRE CIBLE, et ce n'est pas toujours celle du français. Lu
  // depuis une archive ou depuis une édition qu'aucun alignement ne couvre, « Français »
  // reste sur place — on ne change pas d'édition pour rien — quand « Français & Latin »
  // doit rejoindre la traduction que l'alignement relie à l'original. Les deux
  // partageaient `cibleFrTexte`, et c'est ainsi qu'un clic emmenait sur une archive
  // dépourvue d'alignement, où le mode restait pourtant allumé, sans seconde colonne.
  const cibleBilingueTexte = versionOriginale ? (paireDeLecture.traductionBilingue?.idTexte ?? null) : null
  if (aOriginalQuelconque && cibleFrOeuvre) {
    const surFr = !couranteEstOriginale && (versionOriginale ? true : idOeuvre === editionFrRef?.id_oeuvre)
    modesLecture.push({ cle: 'fr', label: labelTraductionMenu, cibleOeuvre: cibleFrOeuvre, cibleTexte: cibleFrTexte, cibleMt: 'fr',
      actif: surFr && modeTexteEffectif === 'fr' })
    // ⛔ Le mode ne s'offre que si quelque chose peut réellement paraître en regard :
    // un ensemble d'alignement. « Un original quelconque existe quelque part dans
    // l'œuvre » ne suffit pas.
    if (paireDeLecture.bilingueOffert) {
      modesLecture.push({ cle: 'bilingue', label: labelBilingueMenu, cibleOeuvre: cibleFrOeuvre, cibleTexte: cibleBilingueTexte, cibleMt: 'bilingue',
        actif: surFr && modeTexteEffectif === 'bilingue' })
    }
  }
  if (versionOriginale) {
    modesLecture.push({ cle: 'orig', label: labelOrigMenu, cibleOeuvre: idOeuvre, cibleTexte: versionOriginale.idTexte,
      cibleMt: 'fr', actif: surTexteOriginal })
  } else if (aOriginalQuelconque && (couranteEstOriginale || editionOrigRef || aTexteOriginal)) {
    const surOrig = idOeuvre === cibleOrigOeuvre && (couranteEstOriginale || (cibleOrigMt === 'la' && modeTexteEffectif === 'la'))
    modesLecture.push({ cle: 'orig', label: labelOrigMenu, cibleOeuvre: cibleOrigOeuvre, cibleMt: cibleOrigMt,
      actif: surOrig })
  }
  // L’étoile range CE QU’ON LIT. Sur une édition en langue originale autonome, c’est
  // l’œuvre elle-même, qui a son identifiant. Sur une traduction lue en « texte
  // original seul », c’est le texte original, qui n’en a pas : sa référence prend le
  // suffixe « #la » (voir app/lib/refsFavoris.ts). Sans quoi le latin d’une œuvre ne
  // pouvait se mettre en favori qu’en rangeant sa traduction à sa place.
  // Le texte en langue originale d’une œuvre à plusieurs textes relève du même
  // suffixe : il a bien un `id_texte`, mais `favoris.ref_id` désigne des ŒUVRES, et
  // sans lui l’étoile posée sur le latin rangeait de nouveau la traduction.
  const favoriEstOriginal = surTexteOriginal || (!couranteEstOriginale && modeTexteEffectif === 'la')
  const refFavori = favoriEstOriginal ? refFavoriOriginal(idOeuvre) : idOeuvre
  // La langue du texte qu'on range, telle que sa fiche la porte. Sans défaut : tout ce
  // qui n'était pas grec se rangeait sous « le texte latin ».
  const nomFavori = favoriEstOriginal ? `le texte ${(langueOriginaleLue ?? '').trim().toLocaleLowerCase('fr-FR') || 'original'}` : null
  // ⛔ UNE SEULE LISTE ORDONNÉE, et les DEUX formes en dérivent : la rangée d'icônes
  // quand la place y est, le menu ⋮ quand elle manque. Écrire les boutons à part
  // dupliquerait libellés, glyphes et gestes — c'est ce que la charte refuse au menu,
  // « il ne change pas les dessins, il leur ajoute leur nom ».
  // ⛔ L'ÉTOILE Y GARDE SON ÉTAT dans les deux formes : glyphe plein, encre d'or, et un
  // libellé qui dit le geste inverse. Un état qu'on ne pourrait plus lire sans ouvrir un
  // menu ne serait plus un état ; nommé et peint, il l'est encore.
  // ⚠️ Elle ouvre la liste parce qu'elle est, des quatre, celle qu'on emploie le plus —
  // la roue de l'administrateur la suit, et non l'inverse : elle n'est à personne d'autre.
  const favoriPose = favorisOeuvres.has(refFavori)
  const actionsTeteVolet = useMemo<ActionVolet[]>(() => {
    if (!favorisPret) return actionsDuVolet
    return [{
      cle: 'favori',
      libelle: favoriPose
        ? (nomFavori ? `Retirer ${nomFavori} des favoris` : 'Retirer des favoris')
        : (nomFavori ? `Ajouter ${nomFavori} aux favoris` : 'Ajouter aux favoris'),
      icone: favoriPose ? ICONE_ETOILE_PLEINE : ICONE_ETOILE,
      // ⛔ LE JETON, non le littéral de `EtoileFavori` : celui-là est une dette
      // inscrite au registre des couleurs en dur, et le registre ne peut que décroître.
      // `--cs-or` est l'encre de l'apparat du site, et elle suit les deux thèmes.
      teinte: favoriPose ? 'var(--cs-or)' : undefined,
      onChoisir: () => toggleFavoriOeuvre(refFavori),
    }, ...actionsDuVolet]
  }, [favorisPret, favoriPose, nomFavori, refFavori, toggleFavoriOeuvre, actionsDuVolet])
  const libelleEdition = (v: VersionTrad): string => {
    // L'ADRESSE de l'édition, dans l'ordre de la charte (§ 5) : ville, éditeur, année.
    const edit = adresseEdition({
      ville: v.ville,
      editeur: formaterEditeur(v.editeur),
      annee: v.date_publication ? formaterDateHistorique(v.date_publication) : null,
    })
    if (estEditionOriginale(v)) {
      // La langue telle que la fiche la porte, sans défaut : tout ce qui n'était pas grec
      // s'y disait « Latin ».
      const lang = libelleLangue(v.langue_originale) || 'Texte original'
      return [lang, edit && `édition ${edit}`].filter(Boolean).join(' — ')
    }
    const trad = v.trad_auteur ? libelleTrad(v.trad_auteur) : (v.langue_trad || 'Français')
    return [trad, edit && `édition ${edit}`].filter(Boolean).join(', ')
  }

  // ── « ÉDITIONS DE CE TEXTE » : UN SEUL CHOIX, ET SEULEMENT S'IL Y EN A UN ───
  // Le volet en portait DEUX, qui répondaient à la même question sous deux
  // intitulés et par deux règles : « Édition » listait les ŒUVRES SŒURS (des lignes
  // d'`oeuvres` au même titre normalisé), « Éditions de ce texte » les TEXTES de
  // l'œuvre courante. Ils n'en font plus qu'un, et la règle est celle de l'auteur
  // (2026-09-04) : deux ÉDITIONS DIFFÉRENTES dans la MÊME LANGUE, ou rien.
  // ⚠️ Le menu des œuvres sœurs ne s'était JAMAIS ouvert : aucune œuvre publiée ne
  // partage son titre normalisé avec une autre (mesuré le 2026-09-04 ; la seule
  // paire, La Cité de Dieu et son latin de Migne, a été dépubliée le 2026-08-26).
  // Elles rejoignent le menu commun plutôt que d'y garder une rubrique à elles.
  // ⛔ Le tri d'avant comparait « ceci EST le texte original » à « je LIS le texte
  // original », ce qui n'est pas la même question que la langue : il se fait
  // désormais sur la LANGUE, et sur elle seule.
  // ⚠️ La langue vient du TEXTE qu’on lit, et d’abord de lui : c’est la seule qui
  // décrive ce qui est à l’écran. Le repli ne sert qu’au texte original, dont la langue
  // est celle de l’œuvre. ⛔ Une version sans langue déclarée ne se range sous aucune :
  // le menu se tait plutôt que de deviner.
  const langueActive = versionActive?.langue ?? (couranteEstOriginale ? oeuvre.langue_originale : null)
  // Le millésime d'une œuvre sœur : `date_publication` est du TEXTE, et porte parfois
  // une fourchette (« 1870-1873 ») — on retient la première année nommée.
  const anneeDeLOeuvre = (v: string | null): number | null => {
    // ⚠️ L'antislash s'était perdu (« d{4} » cherchait quatre lettres d) : aucune œuvre
    // sœur n'avait de millésime, et le menu ne pouvait pas les départager.
    const trouve = (v ?? '').match(/\d{4}/u)
    return trouve ? Number(trouve[0]) : null
  }
  const editionsDeCeTexte = editionsOffertes([
    ...versionsTextuelles.map(v => ({
      cle: v.idTexte,
      langue: v.langue,
      traducteur: v.traducteur,
      annee: v.anneeEdition,
      mention: v.editionLabel,
      libelle: libelleVersionComplet(v),
      url: v.idTexte === idTexte ? null : urlDuTexte(idOeuvre, 'fr', v.idTexte),
      actif: v.idTexte === idTexte,
      // ⛔ C'est ICI que tombent les instantanés de travail — « …_PRE_RESEG_20260903 »,
      // « …_PRE_ALIGN_20260903 » —, que la politique de lecture d'`oeuvre_textes`
      // (`is_admin() OR is_public`) montre à l'AUTEUR et à lui seul.
      lisible: v.isPublic,
      indisponible: v.indisponible,
      prefere: v.isDefault,
    })),
    ...versions.filter(v => v.id_oeuvre !== idOeuvre).map(v => ({
      cle: v.id_oeuvre,
      langue: v.langue_trad?.trim() ? v.langue_trad : v.langue_originale,
      traducteur: v.trad_auteur,
      annee: anneeDeLOeuvre(v.date_publication),
      mention: adresseEdition({ ville: v.ville, editeur: formaterEditeur(v.editeur) }) || null,
      libelle: libelleEdition(v),
      url: `/oeuvre/${v.id_oeuvre}`,
      actif: false,
      // Les œuvres sœurs sont déjà filtrées sur `acces_public` à leur chargement.
      lisible: true,
    })),
  ], langueActive)

  // « Du même auteur » : la ligne qui DÉPARTAGE deux entrées. Le titre y reste
  // normalisé, comme partout ailleurs, et deux éditions d'un même texte y portaient
  // donc rigoureusement le même intitulé : la liste proposait deux liens que rien ne
  // distinguait, et le lecteur ne pouvait que tirer au sort.
  //
  // ⛔ SANS LA LANGUE (demande de l'auteur, 2026-09-09 : « ne pas indiquer la langue du
  // texte »). Elle ouvrait la ligne, et c'était le rang le plus long pour le moins de
  // renseignement : sur une étagère d'auteur, presque toutes les entrées portaient le
  // même mot. Ce qui départage deux éditions d'un même titre reste dit — le traducteur,
  // puis l'adresse —, et une œuvre en langue originale se reconnaît à ce qu'elle n'a
  // justement pas de traducteur.
  const libelleDistinction = (o: OeuvreResumee): string => {
    // Un SEUL séparateur entre les rangs, et il est nommé. La première écriture en avait
    // deux : un tiret après la langue d'une édition originale, une virgule après celle
    // d'une traduction, parce que les deux branches composaient leur chaîne chacune de
    // son côté. Rien n'imposait qu'elles s'accordent, et elles ne s'accordaient pas.
    // Les rangs sont maintenant assemblés au même endroit, par la même constante.
    //
    // La virgule reste À L'INTÉRIEUR du rang « édition », où elle sépare la ville,
    // l'éditeur et la date : ce sont les parties d'une même adresse, non trois rangs.
    const SEP = ' — '
    const edition = adresseEdition({
      ville: o.ville,
      editeur: formaterEditeur(o.editeur ?? null),
      annee: o.date_publication ? formaterDateHistorique(o.date_publication) : null,
    })
    const originale = estEditionOriginale({ langue_trad: o.langue_trad ?? null, langue_originale: o.langue_originale ?? null })
    // Une édition en langue originale n'a pas de traducteur : si la donnée en porte un,
    // c'est une scorie, et l'afficher ferait passer un texte original pour une traduction.
    const trad = !originale && o.trad_auteur ? libelleTrad(o.trad_auteur) : null
    return [trad, edition].filter(Boolean).join(SEP)
  }

  const chargerSauvegardesSegs = async (uid: string, oeuvreId: string, texteId: string) => {
    // ⚠️ Une erreur lue plutôt qu’avalée : sans elle, un échec rend les signets VIDES,
    // et le bouton propose alors de prélever ce qui l’est déjà.
    const { data, error } = await supabase
      .from('prelevements')
      .select('segment_id')
      .eq('user_id', uid)
      .eq('type', 'patristique')
      .eq('id_oeuvre', oeuvreId)
      .eq('id_texte', texteId)
    if (error) { console.warn('[oeuvre] signets non chargés', error); return }
    setSauvegardesSegs(new Set(
      (data ?? []).map(row => row.segment_id).filter((value): value is number => typeof value === 'number'),
    ))
  }

  // ⛔ Le retrait se dit AUSSI. Cette fonction ne savait qu'ajouter, et le signet
  // appelait le même rappel des deux côtés : un segment retiré restait donc dans
  // l'ensemble, et se montrait prélevé dès qu'on le survolait à nouveau.
  const marquerSauvegardeSeg = (segmentId: number, preleve: boolean) => {
    setSauvegardesSegs(prev => {
      const suite = new Set(prev)
      if (preleve) suite.add(segmentId)
      else suite.delete(segmentId)
      return suite
    })
  }

  // Met à jour l'affichage immédiatement après l'association d'un verset,
  // sans recharger tout le niv1 depuis Supabase.
  const associerVersetLocal = (segId: number) => (_champ: 'lien_1' | 'lien_2' | 'lien_3' | 'lien_4', verset: typeof segments[number]['versets'][number]) => {
    setSegments(prev => prev.map(s => s.id === segId ? { ...s, versets: [...s.versets, verset] } : s))
  }

  // Les liens vivent dans `liens_bibliques` depuis le 20 juillet 2026 (§24.1).
  // Cette fonction réécrivait encore `segments.lien_1` à `lien_4` : ces colonnes
  // subsistent mais sont vides, si bien que le bouton ne supprimait rien — sans
  // la moindre erreur. On supprime désormais les lignes de la table, tous types
  // confondus : le bouton porte sur le verset, pas sur l'un de ses rapports.
  // Supprime en UNE fois tous les liens d'un groupe (un lien fusionné couvre
  // plusieurs versets) : une seule confirmation, une seule requête, une seule
  // mise à jour d'état — au lieu d'une boucle qui rouvrait un confirm() natif et
  // lançait une écriture par verset.
  const supprimerLiensBibliques = async (segId: number, versetIds: string[]) => {
    if (!estAdmin || !versetIds.length) return
    const multiple = versetIds.length > 1
    if (!confirm(multiple ? `Supprimer ces ${versetIds.length} liens bibliques ?` : 'Supprimer ce lien biblique ?')) return
    const { error } = await supabase.from('liens_bibliques')
      .delete().eq('segment_id', segId).in('canon_id', versetIds)
    if (error) { alert('Suppression impossible : ' + error.message); return }
    const aRetirer = new Set(versetIds)
    setSegments(prev => prev.map(s => s.id === segId ? { ...s, versets: s.versets.filter(v => !aRetirer.has(v.id)) } : s))
  }

  // ── LA MANCHETTE DES RENVOIS ────────────────────────────────────────────────
  // ⛔ Un renvoi biblique ne s'ouvre pas : il est IMPRIMÉ dans la marge, à hauteur
  // de la ligne où son appel se tenait, et il n'a plus d'appel du tout. La règle
  // vit dans `app/lib/manchetteRenvois.ts` (charte § 13.14) ; ici, on ne fait que
  // la passer au moteur qui compose le corps.
  //
  // ⚠️ Le critère n'est PAS la place, c'est la NATURE de la note. La place ne
  // décide que d'une chose : si la marge est trop étroite pour porter une
  // manchette, le renvoi reprend son appel et son encart, comme avant.
  // ⛔ La clé porte AUSSI ce qui est rendu — la vue et le nombre de segments —, non
  // seulement où l'on se trouve : une division se charge après que `niv1Actif` a changé,
  // et une passe jouée sur une colonne encore vide ne se rejouait jamais.
  const manchetteActive = useManchetteRenvois(
    colonneRef,
    `${niv1Actif}|${pageActuelle}|${modeTexte}|${vue}|${segments.length}|${segmentsApparat.length}`,
  )
  const optionsNotesCorps = useMemo<OptionsRenduNotes>(() => ({
    // ⛔ Un renvoi seul, ET qui tient sur une ligne de manchette : plus long, il garde
    // son appel et son encart, car il pousserait le renvoi de la ligne suivante.
    enManchette: contenu => manchetteActive && vaEnManchette(contenu)
      ? (
        <span className={CLASSE_RENVOI_MANCHETTE} style={STYLE_RENVOI_MANCHETTE}>
          {/* ⛔ EN LIGNE, et il le faut : un `<div>` dans un `<p>` ferme le
              paragraphe, et le renvoi vit DANS le texte qu'il borde. La composition
              reste celle de l'encart — mêmes fonctions de normalisation. */}
          <ContenuRenvoiEnLigne note={contenu as NoteStructuree} />
        </span>
      )
      : null,
  }), [manchetteActive])

  // Lettrine (drop cap) du tout premier segment.
  const preparerTexteSegment = (texte: string) => idTexte.endsWith('_LEGACY')
    ? nettoyerFin(normaliserEspaces(texte))
    : texte

  // Rend un texte de segment avec sa lettrine (drop cap) sur la première LETTRE.
  // Si le paragraphe s'ouvre sur une ponctuation (guillemet «, tiret…), celle-ci
  // doit rester SOLIDAIRE de la lettrine flottante : rendue à part, un « float »
  // la rejetterait à droite de la lettrine (« [V] « ous… » au lieu de « «V ous… »).
  // On la glisse donc dans le même flottant, en petit corps calé sur le haut.
  const rendreAvecLettrine = (texte: string, notes: Record<string, NoteAffichee>): React.ReactNode => {
    const t = preparerTexteSegment(texte)
    const chars = [...t]
    const li = chars.findIndex(ch => /\p{L}/u.test(ch))
    if (li < 0) return rendreTexteAvecNotes(t, notes, 'corps', optionsNotesCorps)
    const prefix = chars.slice(0, li).join('')
    const lettre = chars[li]
    const suite = chars.slice(li + 1).join('')
    return (
      <>
        {/* La classe sert à la feuille, qui fait CONTENIR le flottant par son
            paragraphe (`p:has(> .seg-inline > .cs-lettrine)`). Le style, lui, reste
            dans `compositionOeuvre.ts` avec toute la composition de la lecture. */}
        <span className="cs-lettrine" style={STYLE_LETTRINE}>
          {prefix && <span style={STYLE_PREFIXE_LETTRINE}>{rendreTexteAvecNotes(prefix, notes, 'corps', optionsNotesCorps)}</span>}
          {lettre}
        </span>
        {rendreTexteAvecNotes(suite, notes, 'corps', optionsNotesCorps)}
      </>
    )
  }

  // Corps d'un segment : lettrine et citation sortie comprises (charte §3.8,
  // cinquième règle). Le segment est posé dans un <span> partagé avec ses voisins du
  // même paragraphe ; la citation étant TERMINALE par construction
  // (`detecterCitationSortie`), le bloc ferme le segment et les suivants reprennent à
  // la ligne, sans qu'aucun voisin soit coupé en deux.
  const rendreCorpsSegment = (s: SegData, estPremier: boolean, texteCitationStructurelle: string | null = null, dansBlocDeVersets = false): React.ReactNode => {
    const texteAffichage = s.texteAffichage ?? s.texte
    const texte = texteCitationStructurelle ?? composerCorps(preparerTexteSegment(texteAffichage))
    // Le numéro de segment est rendu ICI, et non par l'appelant : quand le segment
    // est la citation tout entière, il doit entrer DANS le bloc. Laissé dehors, il
    // se retrouverait seul sur sa ligne, le bloc qui le suit rompant la ligne.
    const numero = configNiveaux.afficherNumeros && !estPremier
      ? <sup style={STYLE_NUMERO_SEGMENT}>{s.numero}</sup>
      : null
    // La lettrine garde la priorité : un premier segment orné ne se sort pas.
    if (estPremier && texte.length > 0) return rendreAvecLettrine(composerCorps(texteAffichage), s.notes ?? {})
    // Une suite déjà balisée `nature = citation` reçoit son bloc au niveau du
    // paragraphe, autour de tous ses segments. La détection textuelle ne doit pas
    // créer ici un second bloc imbriqué : elle ne traite que les citations encore
    // signalées par leurs guillemets dans un segment ordinaire.
    if (texteCitationStructurelle != null) return <>{numero}{rendreTexteAvecNotes(texte, s.notes ?? {}, 'corps', optionsNotesCorps)}</>
    // Un VERSET est déjà dans le bloc de sa citation : le sortir une seconde fois y
    // imbriquerait un retrait dans un retrait, pour dire ce qui est déjà dit. Cela vaut
    // qu'il compose dans son bloc ou dans le fil.
    // ⛔ DANS LE BLOC, il porte SON numéro, celui du verset, à la place de l'ordinal du
    // segment : deux nombres en exposant sur la même ligne ne se lisent pas, et c'est le
    // verset que le lecteur cherche. Décision de l'auteur, 2026-08-28.
    // ⚠️ HORS DU BLOC, il garde son ORDINAL. Un `verset` dont le paragraphe porte aussi
    // de la prose ne forme pas de bloc (`estBlocVersets` est tout ou rien) : il coule
    // dans le fil comme n'importe quel segment, et rien ne dispute alors sa place à
    // l'ordinal — qui est la prise par laquelle tout le site cite un segment. L'échanger
    // là contre un numéro de verset, c'était le faire DISPARAÎTRE partout où la case
    // `biblical_verse_number` est vide, c'est-à-dire aujourd'hui partout. Le défaut ne se
    // voyait pas, la seule œuvre qui porte des `verset` masquant ses numéros.
    if (s.nature === NATURE_VERSET) {
      const marque = numeroDUnVerset({
        dansLeBloc: dansBlocDeVersets,
        numeroVerset: s.numeroVerset,
        ordinal: configNiveaux.afficherNumeros && !estPremier ? s.numero : null,
      })
      return (
        <>
          {marque === null ? null : marque.forme === 'verset'
            ? <sup className="num-verset">{marque.valeur}</sup>
            : <sup style={STYLE_NUMERO_SEGMENT}>{marque.valeur}</sup>}
          {rendreTexteAvecNotes(texte, s.notes ?? {}, 'corps', optionsNotesCorps)}
        </>
      )
    }
    // `sansAnnonce` : réservé à la prose. Une réplique de dialogue est elle aussi
    // entre guillemets et n'est pas une citation d'auteur (Boèce).
    const sortie = detecterCitationSortie(texte, { sansAnnonce: s.nature === 'texte' })
    if (!sortie) return <>{numero}{rendreTexteAvecNotes(texte, s.notes ?? {}, 'corps', optionsNotesCorps)}</>
    // Segment entièrement cité : le numéro entre dans le bloc, il n'y a rien d'autre.
    if (!sortie.avant) return <span className="citation-sortie">{numero}{rendreTexteAvecNotes(sortie.citation, s.notes ?? {}, 'corps', optionsNotesCorps)}</span>
    return (
      <>
        {numero}
        {rendreTexteAvecNotes(sortie.avant, s.notes ?? {}, 'corps', optionsNotesCorps)}
        <span className="citation-sortie">{rendreTexteAvecNotes(sortie.citation, s.notes ?? {}, 'corps', optionsNotesCorps)}</span>
      </>
    )
  }

  // Mode paragraphes : découpe les segments d'un groupe en paragraphes (colonne
  // `paragraphe`, charte §6.1). ⛔ La règle vit dans `paragraphesDeSegments`
  // (`app/lib/compositionOeuvre.ts`), que l'extraction d'une œuvre emploie aussi :
  // une découpe recopiée ne reste identique que par accident.
  const paragraphesDe = (itemIds: number[], source: Map<number, SegData> = segMap): { ids: number[] }[] =>
    paragraphesDeSegments(itemIds, sid => source.get(sid)).map(ids => ({ ids }))

  /**
   * Découpe de la lecture : le PARAGRAPHE compose, le GROUPE met en regard.
   *
   * ⛔ ALIGNEMENT N'EST PAS PARAGRAPHAGE (décision de l'auteur, 2026-09-07). Le filet,
   * le blanc et l'alinéa appartiennent au paragraphe de l'édition — clé éditoriale
   * entière, segments rangés par « rang » et joints par « join_before » —, jamais à la
   * frontière d'un groupe. Le Discours 38 l'a démontré : 76 groupes posés sur un corps
   * de deux paragraphes, et le lecteur en tirait soixante-seize blocs sous leur filet,
   * dont la plupart s'ouvraient en minuscule parce qu'ils continuaient la phrase
   * d'avant — « ces choses là… », « aussi ont faict les Juifs… ».
   *
   * ⛔ Mais le GROUPE garde son rang de grille, sans quoi il n'y a plus rien EN REGARD :
   * fondre un paragraphe entier en un seul rang met une colonne de français contre une
   * colonne de grec que rien ne raccorde (essayé, et défait le même jour).
   * « repartirGroupes » découpe donc aux deux, et COUD les rangs d'un même paragraphe.
   * Hors bilingue, ou faute d'alignement, le paragraphe reste seul maître.
   */
  const blocsDeLecture = (itemIds: number[]): BlocEnRegard<number>[] => {
    const enRegard = enRegardTexte
    // Un bloc que rien ne met en regard : la lecture ordinaire, et celle des œuvres sans
    // alignement, qui se composent à pleine largeur.
    const seul = (chunks: readonly { ids: number[] }[]): BlocEnRegard<number>[] =>
      chunks.map(c => ({ ids: c.ids, groupes: [], couvert: false, clot: true }))
    // Hors lecture en regard, rien ne change : découpe par `paragraphe`, et le POÈME se
    // refait par-dessus (⚠️ on ne fond QUE là — le latin d'une strophe vit sur son vers
    // de rang 1, et fondre le poème en regard n'en garderait qu'un seul).
    if (!enRegard) {
      // ⚠️ La citation en VERSETS se refait elle aussi. `paragraphe` la découpe comme
      // il découpe un poème : selon ce que l'édition source a mis dedans — un
      // paragraphe pour toute la citation ici, un par verset là. Sans fusion, le même
      // style rendrait un bloc d'un côté et autant de blocs que de versets de l'autre,
      // avec deux blancs différents entre les lignes. Le bloc est la CITATION.
      return seul(fusionnerBlocs(
        fusionnerBlocs(
          paragraphesDe(itemIds),
          ids => estBlocDeVers(ids.map(sid => segMap.get(sid))),
        ),
        ids => estBlocVersets(ids.map(sid => segMap.get(sid)?.nature)),
      ))
    }
    if (!blocsAlignes) return seul(paragraphesDe(itemIds))
    // ⛔ DEUX POÈMES NE S'ALIGNENT PAS L'UN SUR L'AUTRE (décision de l'auteur,
    // 2026-08-30). Un rang de grille prend la hauteur de la plus haute de ses deux
    // cellules : trois vers français en regard d'un distique creusaient donc un blanc
    // au bas de la colonne latine, et le poème s'en trouvait scandé de silences que
    // l'édition n'a pas écrits. Fondus, les deux poèmes coulent chacun dans SA colonne,
    // avec ses strophes et son seul blanc de fin.
    return fusionnerBlocsDeVers(
      repartirGroupes(paragraphesDe(itemIds), sid => segMap.get(sid)?.groupeOriginal, bornesGroupes),
      ids => estBlocDeVers(ids.map(sid => segMap.get(sid))),
    )
  }

  /** L'original mis en regard d'un bloc. La règle vit dans `bilingueAlignement.ts`,
   *  avec ses tests ; ici on ne fait que lui présenter les segments du bloc. */
  const originalDuBloc = (chunk: BlocEnRegard<number>) =>
    originalEnRegard<Record<string, NoteAffichee>>({
      groupes: chunk.groupes,
      blocs: blocsOriginalEtat,
    })

  /** Compose le texte original d'un bloc. ⛔ Le passage que l'alignement ne met en face
   *  de rien paraît à sa place, GRISÉ par son encre de rôle et jamais par une opacité, et
   *  la synthèse vocale l'annonce (voir `rattacherNonAlignes`). L'annonce ne se copie
   *  pas avec une sélection : elle n'appartient pas au texte. */
  const composerOriginal = (texte: string, notes: Record<string, NoteAffichee>) =>
    partiesNonAlignees(texte).map((partie, i) => {
      const rendu = rendreTexteAvecNotes(estGrec ? cesurerGrec(partie.texte) : cesurerLatin(normaliserEspacesOriginal(partie.texte)), notes)
      return partie.nonAligne
        ? (
          <span key={i} title={LIBELLE_NON_ALIGNE} style={{ color: 'var(--cs-original-non-aligne)' }}>
            <span className="cs-hors-ecran" style={{ userSelect: 'none' }}>{LIBELLE_NON_ALIGNE}. </span>
            {rendu}
          </span>
        )
        : <Fragment key={i}>{rendu}</Fragment>
    })

  // Survol d'un segment : la règle de position vit dans app/lib/celluleActions.ts, avec
  // ses tests, et le suivi au défilement, la grâce de sortie et la fermeture au tap
  // dehors vivent dans app/components/CelluleActions.tsx. Il ne reste ici que le
  // rapport entre la cellule et la SÉLECTION du segment, qui appartient à la page.
  //
  // ⛔ EN LECTURE EN REGARD, LA BORNE EST LA COLONNE, comme dans une grille de la
  // Polyglotte : à droite du français il y a le LATIN. Sans elle, la cellule tenait « à
  // droite » et se posait sur l'original — le défaut relevé le 2026-09-07 sur la
  // Polyglotte, à l'identique, sur une surface qu'on avait crue hors de cause.
  // ⚠️ La colonne est l'enfant DIRECT de la grille qui porte le segment : le français y
  // est composé tantôt en paragraphe, tantôt en bloc de vers, tantôt en versets, et
  // marquer chacune de ces trois formes ferait trois endroits où l'oublier.
  const colonneDuSegment = (el: HTMLElement): HTMLElement | null => {
    const grille = el.closest<HTMLElement>('[data-grille-bilingue]')
    if (!grille) return null
    let n: HTMLElement | null = el
    while (n && n.parentElement !== grille) n = n.parentElement
    return n
  }
  const positionnerToolbar = (el: HTMLElement, sid: number) =>
    cellule.ancrer(el, sid, { borne: colonneDuSegment(el), ...bandeDeLecture() })
  const masquerToolbar = (sid: number) => cellule.relacher(sid)

  // Tap sur un segment. Sur un écran sans survol, la cellule n'a pas de sortie de
  // curseur pour se refermer : re-taper le segment actif la referme (bascule), au lieu
  // de la repositionner indéfiniment.
  const tapSegmentParagraphe = (el: HTMLElement, sid: number, actif: boolean) => {
    if (actif) { setSegActif(null); cellule.fermer() }
    else { setSegActif(sid); cellule.ancrer(el, sid, { borne: colonneDuSegment(el), ...bandeDeLecture() }) }
  }

  // ⛔ LE CLAVIER. Tab atteint un segment, et sa cellule d'actions s'ouvre au FOYER CLAVIER
  // (jamais au clic de souris, qui garde son geste) ; ses boutons viennent juste après lui
  // dans l'ordre de tabulation (CelluleActions), et elle se referme quand le foyer quitte
  // le segment ET la cellule. Entrée ou Espace retient le segment.
  // ⚠️ Pas de `role="button"` : il rendrait muets les appels de note du segment. Une
  // indication partagée (`ID_AIDE_SEGMENT`) dit le geste à la synthèse vocale.
  const clavierSegment = (sid: number, actif: boolean) => ({
    tabIndex: 0,
    'aria-describedby': ID_AIDE_SEGMENT,
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) =>
      activerAuClavier(e, () => tapSegmentParagraphe(e.currentTarget, sid, actif)),
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return
      const el = e.currentTarget
      cellule.ancrerAuFoyer(el, sid, { borne: colonneDuSegment(el), ...bandeDeLecture() })
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => cellule.quitterFoyer(e.relatedTarget),
  })

  // ── LE LASSO ───────────────────────────────────────────────────────────────
  // Tirer un cadre depuis le blanc de la page sélectionne plusieurs passages, qu'on
  // enregistre ou qu'on copie d'un coup (app/components/LassoLecture.tsx).
  // ⛔ Seulement là où un passage s'enregistre un par un : la lecture du texte, en
  // français seul ou en regard. Ni l'apparat, ni la comparaison, ni le latin seul, où la
  // colonne française est masquée.
  // ⚠️ La clé est l'identifiant du segment, lu dans la poignée « segment-<id> » que la
  // page pose déjà pour viser un passage.
  // ⚠️ Le latin SEUL se sélectionne lui aussi : c'est un texte à part entière, et la colonne
  // française y est simplement masquée — ses boîtes rendent zéro, le lasso ne la mesure donc
  // pas. Restent hors du lasso l'apparat et la comparaison, où rien ne s'enregistre.
  const lassoActif = !mobile && !sansSurvol && vue === 'texte' && !modeComparaisonActif
  const segmentsDuLasso = (cles: readonly string[]) => {
    const parCle = new Map(segments.map(s => [String(s.id), s]))
    return cles.map(cle => parCle.get(cle)).filter((s): s is SegData => s !== undefined)
  }

  // ── LE LASSO SUR LE TEXTE ORIGINAL ─────────────────────────────────────────
  // ⛔ LA CLÉ EST CELLE DU BLOC, non d'un segment latin : la colonne originale se compose
  // par EMPAN (`originalDuBloc`), un empan réunit plusieurs segments, et c'est le bloc que
  // le lecteur voit et que le lasso touche. Elle porte le premier segment FRANÇAIS du
  // bloc, ce qui lui donne du même coup sa place dans l'ordre des titres.
  const PREFIXE_ORIGINAL = 'original-'
  const estCleOriginal = (cle: string) => cle.startsWith(PREFIXE_ORIGINAL)
  // ⛔ CE QU'ON COPIE EST LE TEXTE CANONIQUE, jamais ce que la page compose : celle-ci rend
  // `affichage`, où les appels de note sont matérialisés. La SOURCE posée sur le document
  // ne dit donc qu'OÙ retrouver le texte : les groupes d'alignement du bloc.
  const marqueDeLOriginal = (chunk: BlocEnRegard<number>): Record<string, string> => {
    const cle = chunk.ids.length > 0 ? `${PREFIXE_ORIGINAL}${chunk.ids[0]}` : null
    if (!cle) return {}
    if (chunk.groupes.length > 0 && fondreOriginaux(chunk.groupes, blocsOriginalEtat)) {
      return { 'data-lasso-original': cle, 'data-lasso-source': `g ${chunk.groupes.join(' ')}` }
    }
    return {}
  }
  const texteDeLaSource = (source: string) => {
    const [sorte, ...reste] = source.split(' ')
    if (sorte !== 'g') return null
    const fondu = fondreOriginaux(reste, blocsOriginalEtat)
    return fondu ? { texte: fondu.texte, joinBefore: fondu.joinBefore } : null
  }

  // ⛔ UNE CITATION NE MÊLE PAS DEUX LANGUES (demande de l'auteur, 20 septembre 2026) : en
  // lecture en regard, un lasso tiré en travers prend la traduction ET son original, et le
  // passage qu'on copierait n'existe nulle part.
  const refusDuLasso = (cles: readonly string[]) => {
    const colonnes = colonnesTouchees(cles, cle => (estCleOriginal(cle) ? 'original' : 'traduction'))
    if (colonnes.length < 2) return null
    return {
      titre: 'Une seule colonne à la fois',
      detail: 'Le lasso tient la traduction et le texte original ensemble\u202F; reprenez le geste dans une seule colonne.',
    }
  }

  // ⛔ LE TEXTE ORIGINAL NE S'ENREGISTRE PAS ENCORE : un prélèvement vise un SEGMENT
  // (`prelevements.segment_id` et `id_texte`), et un empan de la colonne originale n'en est
  // pas un. On le copie, et la barre n'offre donc que « Copier » — mieux vaut une action de
  // moins qu'un bouton qui rendrait « 0 passage enregistré ».
  const lassoEnregistrable = (cles: readonly string[]) => !cles.some(estCleOriginal)

  const enregistrerLasso = async (cles: readonly string[]): Promise<number | null> => {
    if (!exigerCompte('enregistrer ces passages') || !userId) return null
    const aEcrire = segmentsDuLasso(cles).filter(s => !sauvegardesSegs.has(s.id))
    if (aEcrire.length === 0) return 0
    const { error } = await supabase.from('prelevements').insert(aEcrire.map(seg => ({
      user_id: userId, type: 'patristique',
      auteur, titre_oeuvre: oeuvre.titre, id_oeuvre: idOeuvre,
      segment_id: seg.id, id_texte: seg.idTexte,
      segment_numero: seg.numeroSource, texte: texteSansEnrichissement(seg.texte),
    })))
    if (error) throw error
    setSauvegardesSegs(prev => {
      const suite = new Set(prev)
      for (const s of aEcrire) suite.add(s.id)
      return suite
    })
    signalerProgression()
    return aEcrire.length
  }

  // ⚠️ Par la clé naturelle — ce lecteur, ces segments —, comme le signet d'un passage.
  const retirerLasso = async (cles: readonly string[]): Promise<number | null> => {
    if (!userId) return null
    const ids = segmentsDuLasso(cles).map(s => s.id).filter(id => sauvegardesSegs.has(id))
    if (ids.length === 0) return 0
    await lancerEnParallele(lotsPourClauseIn(ids.map(String)).map(lot => async () => {
      const { error } = await supabase.from('prelevements').delete().eq('user_id', userId).in('segment_id', lot)
      if (error) throw error
    }))
    setSauvegardesSegs(prev => {
      const suite = new Set(prev)
      for (const id of ids) suite.delete(id)
      return suite
    })
    return ids.length
  }

  // ⛔ La citation d'une sélection se recompose par ses liants, et deux passages qui ne se
  // suivent pas se séparent d'une élision : copier le premier et le quatrième sans la dire
  // ferait lire un texte que l'auteur n'a pas écrit. L'ordre est celui où la page les rend,
  // les arguments hissés en tête d'abord.
  // ⛔ Et une citation ne passe jamais un titre (charte § 38.8.1) : le passage qui ouvre un
  // titre que la page compose commence une autre citation, sous la même référence.
  // ⚠️ L'ORDRE des empans originaux se lit dans le DOCUMENT : la colonne se compose bloc par
  // bloc au fil du rendu, et il n'existe hors de la page aucune liste de ses empans. C'est
  // la lecture même que le lasso fait pour mesurer ses cibles.
  const copierLassoOriginal = async (cles: readonly string[]) => {
    const zone = mainRef.current
    if (!zone) return
    const sources = new Map<string, string>()
    const ordre: string[] = []
    for (const element of Array.from(zone.querySelectorAll<HTMLElement>('[data-lasso-original]'))) {
      const cle = element.getAttribute('data-lasso-original')
      const source = element.getAttribute('data-lasso-source')
      if (!cle || !source) continue
      ordre.push(cle)
      sources.set(cle, source)
    }
    // ⛔ Un titre coupe la citation de l'original comme celle de la traduction (charte
    // § 38.8.1) : la clé d'un empan porte le premier segment français de son bloc, et c'est
    // lui que la page compose sous le titre.
    const ouvrentUnTitre = new Set([...passagesQuiOuvrentUnTitre(groupesFiltres, titresAuDepart, reglageDesTitres,
      id => segMap.get(id)?.nature !== 'introduction')].map(String))
    const textes = citationsDeLaSelection(
      cles.filter(cle => sources.has(cle)),
      ordre,
      cle => ouvrentUnTitre.has(cle.slice(PREFIXE_ORIGINAL.length)),
    )
      .map(citation => texteDesSuites(citation.map(suite => suite
        .map(cle => texteDeLaSource(sources.get(cle) ?? ''))
        .filter((morceau): morceau is { texte: string; joinBefore: string | null } => morceau !== null))))
      .filter(texte => texte !== '')
    if (textes.length === 0) return
    const oeuvreDeLOriginal = versionDeLOriginal ? oeuvrePourVersion(versionDeLOriginal) : oeuvreAffichee
    await copierCitation(citationPatristique(textes, {
      auteur, titre: oeuvreDeLOriginal.titre, sousTitre: oeuvreDeLOriginal.sous_titre,
      tradAuteur: oeuvreDeLOriginal.trad_auteur, editeur: oeuvreDeLOriginal.editeur,
      collection: oeuvreDeLOriginal.collection, ville: oeuvreDeLOriginal.ville,
      datePublication: oeuvreDeLOriginal.date_publication,
      responsable: (versionDeLOriginal ?? versionActive)?.responsableEdition,
    }))
  }

  const copierLasso = async (cles: readonly string[]) => {
    // La colonne ORIGINALE a sa propre citation : son édition, son ordre, ses liants.
    if (cles.length > 0 && cles.every(estCleOriginal)) return copierLassoOriginal(cles)
    const parCle = new Map(segments.map(s => [String(s.id), s]))
    const ordre = [...new Set([...introsEnTete, ...segmentsFiltres].map(s => String(s.id)))]
    const ouvrentUnTitre = new Set([...passagesQuiOuvrentUnTitre(groupesFiltres, titresAuDepart, reglageDesTitres,
      id => segMap.get(id)?.nature !== 'introduction')].map(String))
    const textes = citationsDeLaSelection(cles.filter(cle => parCle.has(cle)), ordre, cle => ouvrentUnTitre.has(cle))
      .map(citation => texteDesSuites(citation.map(suite => suite
        .map(cle => parCle.get(cle)!)
        .map(s => ({ texte: s.texte, joinBefore: s.joinBefore })))))
      .filter(texte => texte !== '')
    if (textes.length === 0) return
    await copierCitation(citationPatristique(textes, {
      auteur, titre: oeuvreAffichee.titre, sousTitre: oeuvreAffichee.sous_titre,
      tradAuteur: oeuvreAffichee.trad_auteur, editeur: oeuvreAffichee.editeur,
      collection: oeuvreAffichee.collection, ville: oeuvreAffichee.ville,
      datePublication: oeuvreAffichee.date_publication,
      // Le savant qui a établi le texte d'une édition critique : la fiche le nomme, la
      // citation aussi (contrôle des éditions latines, 16 septembre 2026).
      responsable: versionActive?.responsableEdition,
    }))
  }

  // ── LA VISITE ──────────────────────────────────────────────────────────────
  // Ce que la page montre d'elle-même la première fois qu'on l'ouvre (charte § 46).
  //
  // ⚠️ Elle attend que le TEXTE soit là : la moitié de ses arrêts vivent dans les
  // volets, mais celui du corps cerne un passage, et une visite ouverte sur une
  // colonne vide renoncerait à son arrêt le plus important.
  // ⚠️ L'état est un COMPTEUR, non un drapeau : rappelée par la barre alors qu'elle
  // est déjà ouverte, la visite repart de son grand message, et le composant ne s'y
  // remet qu'en se REMONTANT. Le compteur lui sert de clé.
  // ⛔ Et l'offre ne se fait qu'UNE fois : sans le témoin, changer de division la
  // rouvrirait à chaque rechargement de tranche.
  const [visite, setVisite] = useState(0)
  const textePret = segments.length > 0
  const visiteProposee = useRef(false)
  useEffect(() => {
    // ⛔ PAS DE VISITE SUR TÉLÉPHONE, et ce n'est pas un oubli : les deux volets y
    // sont des TIROIRS, fermés à l'ouverture de la page. Quatre arrêts sur sept
    // cerneraient donc des sujets absents, et la visite ne serait plus qu'une
    // attente entre deux cases. La page qu'elle décrit n'est pas celle qu'on voit.
    if (mobile || !textePret || !profilPret || visiteProposee.current) return
    visiteProposee.current = true
    const params = new URLSearchParams(window.location.search)
    if (params.has('visite')) oublierVisite(CLE_VISITE_OEUVRE)
    else if (visiteFaite(CLE_VISITE_OEUVRE)) return
    const depart = window.setTimeout(() => setVisite(1), 260)
    return () => window.clearTimeout(depart)
  }, [mobile, textePret, profilPret, visiteFaite, oublierVisite])

  // La page OFFRE sa visite à la barre de navigation, qui porte le bouton qui la
  // rappelle (voir app/lib/demandeDeVisite.ts). Sur téléphone elle n'en offre pas :
  // un bouton qui ouvrirait une visite dégradée vaut moins que pas de bouton.
  useEffect(() => { if (mobile) return; return offrirLaVisite(() => setVisite(n => n + 1)) }, [mobile])

  // ⚠️ L'ARRÊT DU VOLET DE DROITE RETIENT UN PASSAGE POUR DE BON : une étape qui
  // dirait « cliquez, le volet répond » devant un volet vide ne montrerait rien.
  // ⛔ Le premier passage qui vise RÉELLEMENT un verset, non le premier venu ; à
  // défaut, le premier, le volet disant alors lui-même que rien n'est cité.
  // ⚠️ AUCUN useCallback ici, et ce n'est pas un oubli : VisiteGuidee range ce rappel
  // dans une RÉFÉRENCE qu'un effet rafraîchit à chaque rendu, si bien que son identité
  // n'a aucune importance. Mémoïsé sur « segments », qui change à chaque tranche
  // chargée, il faisait au contraire renoncer le compilateur React à optimiser tout le
  // composant (« existing memoization could not be preserved »).
  const preparerScene = (scene: SceneVisite | undefined) => {
    if (!scene?.choisirSegment) return
    const vise = segments.find(s => s.versets.length > 0) ?? segments[0]
    if (vise) setSegActif(vise.id)
  }

  return (
    <ProvisionNotesConnues registre={registreNotes}>
    <div style={{ background: 'var(--cs-fond)', minHeight: HAUTEUR_SOUS_NAVBAR }}>
      <style>{`
        ${FEUILLE_CARTE_VOLET}
        .seg-wrapper { position: relative; }
        .seg-p { transition: background var(--cs-duree-courte); }
        .seg-p:hover { background: rgba(var(--cs-vert-rgb),0.05) !important; }
        /* ⛔ Plus aucune règle d'opacité sur les actions d'un argument : elles ne vivent
           plus DANS le bloc (« .seg-actions », posé en absolu dans son coin haut droit,
           donc sur sa première ligne), mais dans la cellule d'actions du site, qui est en
           portail vers <body>. Ces sélecteurs, qui exigeaient un ancêtre « .seg-wrapper »,
           n'y atteignent plus rien : les laisser aurait été trois familles de règles
           mortes, et la garde du tactile qu'elles portaient n'a plus d'objet — une
           cellule qui paraît est pleine, et elle ne paraît que si on la demande. */
        /* Segments coulant dans un même bloc, délimités au survol. */
        .seg-inline { border-radius: 4px; padding: 0 0.5px; cursor: pointer; transition: background var(--cs-duree-courte); box-decoration-break: clone; -webkit-box-decoration-break: clone; }
        .seg-inline:hover { background: var(--cs-lecture-survol); }
        .seg-inline--actif { background: var(--cs-lecture-retenu); }
        /* ⛔ Le rapport des colonnes se MESURE, il ne se devine pas. Le français a
           besoin de plus de place que le latin : ses vers demandent 302 px au neuvième
           dixième contre 227, et 343 au quatre-vingt-dix-neuvième contre 283. Le
           rapport 1,2 pour 1 est celui qui, sur la mesure de 42 rem, laisse le moins de
           vers enroulés : trois sur 2 011, quand des colonnes égales en laissent 33 et
           l'ancien rapport 1,12 / 0,88 en laisse neuf. La gouttière se resserre de 1,6
           à 1,4 rem, ce qui rend 3 px à chaque colonne. */
        .para-bilingue { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 1.4rem; align-items: start; border-bottom: 1px solid rgba(var(--cs-bord-rgb),0.55); margin-bottom: 0.85rem; }
        .para-bilingue > p { margin-bottom: 0.85rem !important; }
        /* ⛔ Le filet ferme un PARAGRAPHE, jamais un groupe d'alignement (2026-09-07).
           Le bloc est le paragraphe de l'edition ; une frontiere d'alignement, elle, ne
           pose ni blanc ni trait. Sur le Discours 38, dont l'alignement est au segment,
           le lecteur recevait 76 filets pour deux paragraphes.
           ⚠️ Aucun accent grave dans ce bloc : il vit dans un litteral de gabarit. */
        /* ⛔ Une STROPHE ne se sépare pas par un filet, mais par un BLANC (décision de
           l'auteur, 2026-08-23). Le poème se refait bloc par bloc, et le latin d'une
           strophe vivant sur son vers de rang 1, un filet entre deux strophes tirait un
           trait à chaque respiration du poème. Un blanc dit la même chose sans rien
           dessiner, et c'est ce que fait la page imprimée. */
        .para-bilingue--vers { border-bottom: none; margin-bottom: 1.15rem; }
        /* ⛔ LA COUTURE : deux rangs d'un MÊME paragraphe se touchent. Ils ne sont deux
           que parce que la mise en regard l'exige — un empan ne tient les deux colonnes
           en face l'une de l'autre qu'en occupant son propre rang de grille —, et rien
           ne doit dire au lecteur qu'il change de paragraphe : ni filet, ni blanc, ni
           retrait. Seul le DERNIER rang d'un paragraphe le ferme.
           ⚠️ Il reste une coupure de LIGNE à chaque empan : aucune écriture CSS ne fait
           couler un texte d'un rang au suivant en gardant deux colonnes accordées.
           ⚠️ Deux classes au sélecteur, sinon .para-bilingue > p l'emporterait. */
        /* ⛔ DEUX RANGS DE SÉPARATEUR, et ils ne disent pas la même chose (2026-09-07,
           le soir). Le filet PLEIN — 0,55 et deux blancs de 0,85 rem — ferme le
           paragraphe. Le filet PÂLE — 0,22 et un cheveu de 0,18 rem de part et d'autre —
           marque l'empan : c'est l'unité qui tient les deux colonnes en face l'une de
           l'autre, et sans lui la page en regard redevient un mur. Le blanc va de 1,7 rem
           à 0,36, la teinte de 0,55 à 0,22 : personne ne prendra l'un pour l'autre.
           ⚠️ Cousu SANS aucune marque, l'empan cessait d'être visible : c'est le reproche
           de l'auteur le soir même, et il est juste — un empan qu'on ne voit pas ne met
           plus rien en regard. Jugé sur planche (tmp/planche-filet-empan.html), qui rend
           les quatre valeurs sur le passage réel du Discours 38.
           ⚠️ La COULEUR seule est reprise : le style et l'épaisseur viennent de
           .para-bilingue, et .para-bilingue--vers, qui pose « none », garde la main —
           une strophe ne se sépare toujours pas par un filet. */
        .para-bilingue--couture { border-bottom-color: rgba(var(--cs-bord-rgb),0.22); padding-bottom: 0.18rem; margin-bottom: 0.18rem; }
        .para-bilingue--couture > p, .para-bilingue--couture > div { margin-bottom: 0 !important; }
        /* Le texte en langue originale se lit en sérif comme le reste de l'œuvre.
           SEULE exception : mis EN REGARD du français, il passe en sans-serif. La
           différence de police distingue les deux colonnes d'un coup d'œil, mieux
           qu'un filet, et sans peser sur le latin quand il se lit seul. */
        /* ⛔ La forme de .citation-sortie (charte §3.8, cinquième règle) vit
           désormais dans globals.css : les introductions et apparats des bibles
           la partagent, et deux écritures auraient fait deux mesures. Ne restent
           ici que les règles propres aux ŒUVRES — la surbrillance de survol et le
           bloc structurel, qui n'existent pas ailleurs.
           ⚠️ Aucun accent grave dans ce bloc : il vit dans un littéral de gabarit. */
        /* Une citation balisée peut couvrir plusieurs segments : le bloc enveloppe
           toute la suite, afin que les frontières techniques ne créent ni retraits
           répétés ni faux paragraphes. Les segments restent cliquables en dedans. */
        .citation-sortie--structurelle > .seg-inline { display: inline; }
        /* ⚠️ En mode paragraphes, le fond de .seg-inline ne peint QUE ses fragments
           en ligne : un enfant en display:block sort de l'inline et resterait sans
           surbrillance. Le survol et la sélection doivent donc l'atteindre à part,
           sans quoi une citation sortie ne se désigne plus au survol comme les autres. */
        .seg-inline:hover .citation-sortie { background: var(--cs-lecture-survol); }
        .seg-inline--actif .citation-sortie { background: var(--cs-lecture-retenu); }
        /* Un segment entièrement cité ne laisse devant son bloc qu'un fragment en
           ligne VIDE. Son rembourrage y peignait au survol un trait vert d'un
           demi-pixel, flottant seul dans la marge au-dessus de la citation. */
        .seg-inline:has(> .citation-sortie:first-child) { padding: 0; }
        /* Citation biblique DÉCOUPÉE EN VERSETS (nature de segment "verset"). Le style
           de la citation sortie — corps réduit, justification, ni guillemets ni filet —
           mais retrait à GAUCHE seulement, et un léger blanc entre versets au lieu du
           blanc de paragraphe : on lit un passage continu, non une suite de sujets.
           Les mesures vivent dans app/lib/compositionVersets.ts, que la comparaison
           des traductions emploie aussi : une seule composition, deux surfaces. */
        .citation-versets { font-family: ${SERIF}; font-size: 0.8125rem; color: var(--cs-texte-fort); margin: 0 0 0.72rem; word-spacing: -0.025em; letter-spacing: 0; }
        .citation-verset { display: block; margin: 0 0 ${BLANC_ENTRE_VERSETS} ${RETRAIT_VERSET}; font-size: 0.95em; line-height: 1.62; text-align: justify; text-justify: inter-word; hyphens: auto; -webkit-hyphens: auto; overflow-wrap: break-word; white-space: pre-line; }
        .citation-verset:last-child { margin-bottom: 0; }
        @media(max-width: 1023px){ .citation-verset { margin-left: ${RETRAIT_VERSET_ETROIT}; } }
        /* Les crayons d'administration des titres pendent à 52 px hors de la colonne :
           sur un écran étroit ils la faisaient déborder de 38 px. Ils rentrent alors
           dans le flux, sous le titre, et passent à la ligne s'il le faut. */
        @media(max-width: 900px){ .cs-outils-titre { position: static !important; justify-content: center; flex-wrap: wrap; margin-top: 2px; } }
        /* Le NUMÉRO DE VERSET, dans la face de la page Bible : graisse 600, teinte
           faible, et le corps dans le rapport qu'il y tient (0,625 rem contre 0,875,
           soit 0,71). La page Bible le pose dans une gouttière, qui se battrait ici
           avec le retrait gauche ; il passe donc en exposant, sans changer de face.
           ⚠️ Exposant à la manière de la maison (voir siecles.tsx) : line-height 0 et
           calage par top, jamais vertical-align:super, qui gonfle la boîte de ligne —
           et le blanc entre versets, qui est léger, s'en trouverait rouvert. */
        .num-verset { font-size: 0.71em; font-weight: 600; color: var(--cs-texte-doux); line-height: 0; vertical-align: baseline; position: relative; top: -0.5em; margin-right: 0.25em; user-select: none; }
        .texte-original { color: var(--cs-original); font-family: ${SERIF}; }
        .para-bilingue > .texte-original { font-family: ${SANS}; }
        @media(max-width: 1023px){
          .seg-wrapper::after { display: none !important; width: 0 !important; right: 0 !important; }
          .titre-colophon{max-width:100%!important;line-height:1.32!important;word-spacing:normal!important;letter-spacing:0!important;}
          .titre-colophon > span{display:inline!important;width:auto!important;max-width:100%!important;}
          .titre-colophon > span:not(:last-child)::after{content:" ";}
          .para-bilingue { grid-template-columns: 1fr; gap: 0.15rem; }
          .para-bilingue > .texte-original { padding-left: 0.85rem; border-left: 2px solid var(--cs-bord); }
        }
        .toc-lien-n1:hover, .toc-lien-n2:hover { color: var(--cs-vert) !important; }
        .ref-lien:hover { color: var(--cs-vert) !important; }
        .signal-btn:hover { color: var(--cs-danger) !important; }
        /* « Du même auteur » : au survol, TOUTE l'entrée prend le vert, le titre et sa
           ligne d'édition ensemble (demande de l'auteur, 2026-09-15). La ligne d'édition
           garde son second rang par le corps et l'italique. ⚠️ Aucune couleur en ligne sur
           le lien : elle battrait ces règles. */
        .lien-meme-auteur { color: var(--cs-texte); transition: color var(--cs-duree-courte); }
        .lien-meme-auteur .lien-meme-auteur-edition { color: var(--cs-texte-gris); transition: color var(--cs-duree-courte); }
        .lien-meme-auteur:hover, .lien-meme-auteur:focus-visible,
        .lien-meme-auteur:hover .lien-meme-auteur-edition,
        .lien-meme-auteur:focus-visible .lien-meme-auteur-edition { color: var(--cs-vert); }
      `}</style>

      <div style={{ display: 'flex', minHeight: HAUTEUR_SOUS_NAVBAR }}>

        {/* ── NAV GAUCHE ── */}
        {mobile && (
          <BarreVoletMobile cote="haut" ouvert={navOuverte} libelle="Sommaire" refBouton={barreSommaireRef}
            titre={navOuverte ? 'Fermer le sommaire' : 'Ouvrir le sommaire'}
            onBasculer={() => setNavOuverte(o => !o)} />
        )}
        {navOuverte ? (
        <>
        {/* Mobile : tiroir par-dessus le texte, sous la navbar. */}
        {mobile && <div onClick={() => setNavOuverte(false)} style={{ position: 'fixed', inset: 0, background: 'var(--cs-calque-modale)', zIndex: Z_TIROIR_VOILE }} />}
        {/* ⛔ LE VOLET EST UN REPÈRE (`aside`), SON SOMMAIRE UNE NAVIGATION (`nav`), comme
            partout ailleurs sur le site (audit d'harmonie, 2026-09-23).
            ⛔ ET IL NE DÉFILE PAS LUI-MÊME : c'est son contenu qui défile, dans l'enveloppe
            qui suit. La poignée y était DANS le défileur, si bien qu'elle partait avec le
            sommaire, et elle se tenait à l'intérieur du filet sur cinq pixels quand les trois
            autres poignées du site en font neuf, à cheval sur lui. Posée ici, hors de ce qui
            défile, elle prend leur mesure. ⚠️ Sur un téléphone, le tiroir défile lui-même :
            l'enveloppe s'efface (`display: contents`). */}
        <aside ref={refNav} id={idVoletGauche} data-sommaire-panneau aria-label="Volet de l’œuvre"
          role={tiroirSommaire ? 'dialog' : undefined} aria-modal={tiroirSommaire || undefined}
          style={mobile ? {
          position: 'fixed', top: `calc(${HAUTEUR_NAVBAR} + ${HAUTEUR_BARRE_VOLET})`, left: 0, right: 0, zIndex: Z_TIROIR, maxHeight: `calc(100dvh - ${HAUTEUR_NAVBAR} - ${HAUTEUR_BARRE_VOLET} - 2.5rem)`, overflowY: 'auto', overflowX: 'hidden', background: 'var(--cs-fond-clair)', borderBottom: '1px solid var(--cs-bord)', display: 'flex', flexDirection: 'column', boxShadow: 'var(--cs-ombre-modale)',
        } : { width: navWidth == null ? 'clamp(240px, 16vw, 380px)' : navWidth + 'px', flexShrink: 0, position: 'sticky', top: HAUTEUR_NAVBAR, alignSelf: 'flex-start', height: HAUTEUR_SOUS_NAVBAR, background: 'var(--cs-fond-clair)', borderRight: '1px solid var(--cs-bord)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {!mobile && <div data-sommaire-poignee {...poigneeGauche} title="Glisser pour redimensionner"
            style={{ position: 'absolute', right: '-4px', top: 0, bottom: 0, width: '9px', cursor: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%235f574b%27 stroke-width=%271.7%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M8 7L3 12l5 5%27/%3E%3Cpath d=%27M3 12h18%27/%3E%3Cpath d=%27M16 7l5 5-5 5%27/%3E%3C/svg%3E") 12 12, ew-resize', zIndex: 10 }}
            className="cs-poignee-volet cs-poignee-volet--droite"
          />}
          <div style={mobile ? { display: 'contents' } : { flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* ⚠️ L’EN-TÊTE SE RESSERRE SUR UN TÉLÉPHONE (relevé de l’auteur,
              2026-09-09 : « revoir l’en-tête qui prend trop de place »). Mesuré dans
              le tiroir, il faisait 88 px pour un nom d’auteur, un titre et un lien,
              soit le huitième de la hauteur offerte, avant même la première rubrique.
              ⛔ Rien n’en est retranché : ce sont les blancs qui se referment. */}
          <div data-visite="oeuvre-tete" style={{ padding: mobile ? '9px 14px 8px' : '14px 16px 12px', borderBottom: '1px solid var(--cs-bord)', flexShrink: 0 }}>
            <div ref={refRangee} style={STYLE_RANGEE_TETE_VOLET}>
              {/* ⚠️ `refNoms` cerne CE QUI DEMANDE LA PLACE dans la rangée : le TITRE
                  depuis le 2026-09-10, le nom de l'auteur avant lui. La mesure de
                  `useRangeeCondensee` n'a pas bougé — elle lit les boutons qu'il porte —
                  et la règle non plus : le texte ne se coupe pas, c'est la rangée qui
                  cède sous le ⋮ quand la place manque.
                  ⚠️ Le titre COMPOSÉ (`titre_affichage`) ne vaut que pour la page de
                  titre. Ici comme dans la bibliothèque ou le fil d'Ariane, c'est le titre
                  de catalogue qui nomme l'œuvre. */}
              <span ref={refNoms} style={{ minWidth: 0, flex: '1 1 auto' }}>
                <TitreVolet onOuvrir={() => setInfoEditionOuverte(true)} inactif={!ficheEditionDisponible}
                  titre="À propos de cette édition">{rendreTexteEnrichi(titreAffiche)}</TitreVolet>
              </span>
              {/* ⛔ LES ICÔNES TANT QU'IL Y A LA PLACE, LE ⋮ QUAND IL N'Y EN A PLUS
                  (rectification de l'auteur, 2026-09-10 au soir : « sur grand écran, pas
                  la peine de cacher les icônes »). Ce qui coûte la largeur est le NOMBRE
                  de cibles — le plancher de 24 px est celui de WCAG et la rangée y était
                  déjà, si bien qu'on ne peut rien reprendre sur la taille — et c'est donc
                  la rangée ENTIÈRE qui cède, d'un coup, quand la place manque.
                  ⛔ ET LES SYMBOLES ONT LA PRIORITÉ SUR LE TITRE (décision de l'auteur,
                  2026-09-15) : le titre leur cède la largeur en s'enroulant, et la rangée
                  ne se condense que lorsqu'il n'a plus sa largeur minimale — son plus long
                  mot, et jamais moins de 5,5 rem (`useRangeeCondensee`).
                  ⛔ Le chevron ne descend jamais sous le ⋮ : il est le contrôle du volet
                  lui-même, et l'on ne referme pas un panneau en ouvrant d'abord un menu qui
                  vit dedans.
                  ⚠️ LA RANGÉE ACCOMPAGNE LA PREMIÈRE LIGNE DU TITRE (`ALIGNEMENT_ACTIONS`) :
                  icônes et chevron partagent le même axe, celui de cette ligne.
                  ⚠️ L'ÉTOILE reste `EtoileFavori`, le composant partagé, et non un bouton
                  refait ici : elle porte son état, son libellé inverse et la passe du
                  DOIGT. Les autres se dérivent de la MÊME liste que le menu.
                  ⚠️ La MESURE suit la police racine (globals.css, « LA RANGÉE D'ACTIONS ») :
                  elle était en pixels quand tout autour d'elle est en rem, et gardait donc
                  ses 129 px de 1280 à 2560. */}
              <div className="cs-tete-volet-actions" style={{ marginTop: ALIGNEMENT_ACTIONS }}>
                {teteCondensee
                  ? <MenuVolet titre="Autres actions" actions={actionsTeteVolet} />
                  : actionsTeteVolet.map(action => action.cle === 'favori' ? (
                    <EtoileFavori key={action.cle} actif={favoriPose} onToggle={action.onChoisir} size={13}
                      title={action.libelle} />
                  ) : (
                    <BoutonVolet key={action.cle} titre={action.libelle}
                      onClick={e => action.onChoisir(e.currentTarget.getBoundingClientRect())}>
                      {action.icone}
                    </BoutonVolet>
                  ))}
                {/* ⛔ ELLE NE PARAÎT PLUS SUR TÉLÉPHONE : elle y regardait à GAUCHE,
                    c’est-à-dire vers le rail du BUREAU, qui n’existe pas là. C’est la
                    barre « Sommaire » qui ferme, et elle reste posée pour cela. */}
                {!mobile && (
                  <BoutonVolet titre="Réduire le volet" repli refBouton={refChevronGauche}
                    aria-expanded={true} aria-controls={idVoletGauche} onClick={() => setNavOuverte(false)}>
                    <IconeChevron dir="left" taille="0.875rem" strokeWidth={1.5} />
                  </BoutonVolet>
                )}
              </div>
            </div>
            {/* ⛔ LE LIEN « À PROPOS DE CETTE ÉDITION » A DISPARU DU CHAPEAU (2026-09-10,
                demande de l'auteur). Il vivait ici depuis le 2026-09-03, sous le titre,
                pour dire la fiche ; c'est le TITRE lui-même qui l'ouvre désormais, et une
                ligne entière de phrase soulignée n'a plus à porter ce que le titre porte.
                ⚠️ La règle qui l'avait nommé — « un lien nomme sa destination » — n'est pas
                défaite : elle passe dans l'infobulle de `TitreVolet`, le libellé du lien
                étant devenu le titre même de l'œuvre.
                ⚠️ Restent donc DEUX lignes là où il y en avait trois : le titre, puis
                l'auteur en crédit. */}
            {nomsAuteurs}
            {/* ── Menu 1 : mode de lecture (LANGUE) ──────────────────────────
                Français / Français & [orig] / [orig]. Le mode dont la cible EST l'œuvre
                courante bascule sur place ; les autres NAVIGUENT vers l'édition voulue
                (le latin autonome à ses titres d'origine).

                Plus de sous-choix « Paragraphes / Segments ». La ligne « Français » se
                divisait en deux au survol pour l'offrir, et un second bloc attendait plus
                bas les œuvres sans texte original, qui n'avaient que ce choix-là à faire.
                Les deux sont partis avec le mode segments, et le menu ne parle donc plus
                que de LANGUE. */}
            {modesLecture.length > 0 && (
              <div data-visite="oeuvre-lecture" style={{ marginTop: 'var(--volet-air, 10px)' }}>
                <span style={RUBRIQUE_AXE}>Mode de lecture</span>
                {modesLecture.map(m => {
                  const url = urlDuModeOuNull(m.cibleOeuvre, m.cibleMt, m.cibleTexte)
                  const attend = attendCette(url)
                  return (
                    <button key={m.cle} type="button" aria-pressed={m.actif}
                      onClick={() => allerAuMode(m.cibleOeuvre, m.cibleMt, m.cibleTexte)}
                      {...gestesDeNavigation(url)}
                      className="cs-option-volet"
                      style={{ ...OPTION_VOLET(m.actif), display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', cursor: attend ? 'progress' : m.actif ? 'default' : 'pointer' }}>
                      <span>{m.label}</span>
                      {/* Le témoin garde sa place vide : le libellé ne bouge pas quand il paraît.
                          ⚠️ C'est le seul écart avec le volet de la Bible, et il est motivé :
                          « Latin » vise une AUTRE adresse, donc un rendu serveur entier, quand
                          les axes de la Bible se règlent le plus souvent sur place. */}
                      <span aria-hidden="true" style={{ width: '0.6rem', textAlign: 'right', color: 'var(--cs-texte-doux)', opacity: attend ? 1 : 0, transition: 'opacity var(--cs-duree-courte)' }}>…</span>
                    </button>
                  )
                })}
              </div>
            )}
            {/* ── ÉDITIONS DE CE TEXTE ─────────────────────────────────────────
                UN seul menu, et il ne paraît que s'il y a un CHOIX : deux éditions
                DIFFÉRENTES dans la MÊME langue (règle et mesures dans
                `editionsDuTexte`). Les textes de l'œuvre et les œuvres sœurs y
                figurent ensemble, sous une seule règle : le lecteur ne choisit pas
                entre deux sortes d'identifiants, il choisit une édition. */}
            {editionsDeCeTexte.length > 0 && (
              <div style={{ marginTop: 'var(--volet-air, 10px)' }}>
                <span style={RUBRIQUE_AXE}>Éditions de ce texte</span>
                {editionsDeCeTexte.map(edition => (
                  <button key={edition.cle} type="button" aria-pressed={edition.actif}
                    disabled={edition.actif || edition.indisponible}
                    onClick={() => { if (edition.url) naviguer(edition.url) }}
                    {...gestesDeNavigation(edition.indisponible ? null : edition.url)}
                    title={edition.actif ? 'Édition affichée' : edition.indisponible ? 'Bientôt disponible (alignement en cours)' : 'Afficher cette édition'}
                    className="cs-option-volet"
                    style={{ ...OPTION_VOLET(edition.actif), cursor: edition.actif || edition.indisponible ? 'default' : 'pointer', opacity: edition.indisponible ? 'var(--cs-opacite-desactive)' : 1 }}>
                    {edition.libelle}
                  </button>
                ))}
              </div>
            )}
          </div>


          {/* ⛔ UNE LISTE D'UN SEUL ÉLÉMENT N'EST PAS UNE LISTE (demande de l'auteur,
              2026-09-08 : « sauf s'il y en a qu'une, alors ne rien afficher »). L'œuvre
              courante étant désormais dedans, une rubrique « DU MÊME AUTEUR » qui ne
              porterait qu'elle annoncerait un choix pour n'offrir que ce qu'on lit déjà.
              C'est la règle qui a déjà emporté le sommaire sans matière à sommer. */}
          {oeuvresAuteur.length > 1 && (
            <div style={{ borderBottom: '1px solid var(--cs-bord)', flexShrink: 0 }}>
              <button onClick={() => setAuteurOuvert(!auteurOuvert)} aria-expanded={auteurOuvert}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', textAlign: 'left' }}>
                <span style={RUBRIQUE_AXE}>Du même auteur</span>
                <span style={{ display: 'inline-flex', color: 'var(--cs-texte-second)', flexShrink: 0 }}>
                  <IconeChevron dir={auteurOuvert ? 'up' : 'down'} taille="0.6875rem" strokeWidth={1.5} />
                </span>
              </button>
              {auteurOuvert && (
                /* ⚠️ Sur téléphone, la liste se borne et défile en dedans : elle compte
                   jusqu’à cent entrées chez Augustin, et déployée dans un tiroir elle
                   pousse hors de vue les deux rubriques qui la suivent. Elle est fermée
                   à l’arrivée ; c’est ce qu’elle fait une fois OUVERTE qu’on borne. */
                <div style={mobile ? { padding: '0 16px 12px', maxHeight: '38dvh', overflowY: 'auto' } : { padding: '0 16px 12px' }}>
                  {(() => {
                    const rendreEntree = (o: OeuvreResumee) => {
                      // ⛔ L'ENTRÉE QU'ON LIT DIT L'ÉDITION QU'ON LIT : ses champs venaient de la
                      //    ligne d'`oeuvres`, et sur le latin des Confessions l'œuvre « en cours »
                      //    annonçait la traduction d'Arnauld d'Andilly, 1649. Elle prend donc
                      //    l'identité de la version active (`oeuvreAffichee`), silence compris.
                      const distinction = libelleDistinction(o.id_oeuvre === idOeuvre
                        ? { ...o, trad_auteur: oeuvreAffichee.trad_auteur, editeur: oeuvreAffichee.editeur, ville: oeuvreAffichee.ville, date_publication: oeuvreAffichee.date_publication }
                        : o)
                      const courante = o.id_oeuvre === idOeuvre
                      // ⚠️ CELLE QU'ON LIT N'EST PAS UN LIEN, et c'est ce qui la dit
                      //    retenue : un lien qui mène où l'on est déjà est une promesse
                      //    vide. Elle prend la marque que le site emploie partout pour
                      //    l'option en cours — le vert, la graisse —, comme un niveau actif
                      //    du sommaire deux rubriques plus bas ; `aria-current` la dit à qui
                      //    ne voit pas la couleur.
                      const contenu = (
                        <>
                          {o.titre}
                          {/* ⛔ AU SURVOL, TOUTE L'ENTRÉE PREND LE VERT (demande de l'auteur,
                              2026-09-15 : « au survol du titre, changer la couleur […], mais
                              aussi celui du sous-titre et des données éditoriales »). La ligne
                              d'édition gardait sa teinte faible sous le curseur, et l'entrée ne
                              se désignait qu'à moitié. Elle garde son second rang par le corps
                              et l'italique, non plus par une encre qui refuse le survol.
                              ⚠️ Le survol vit dans la FEUILLE (`.lien-meme-auteur`) : une couleur
                              posée en ligne battrait la règle, et deux gestionnaires JavaScript
                              la réécrivaient à chaque passage du curseur.
                              ⚠️ Et elle se TIENT PRÈS de son titre, sans s'y coller : interligne 1,1
                              et un seizième de rem, pendant que deux œuvres s'écartent de 0,625 rem.
                              Le titre et son adresse font UNE entrée ; le blanc qui doit se voir est
                              celui qui sépare deux œuvres.
                              ⚠️ Ce seizième était NÉGATIF, et il est positif depuis le 2026-09-16
                              (demande de l'auteur : « augmenter très légèrement l'espace entre le
                              titre et les données éditoriales »). Deux resserrements successifs —
                              le 2026-09-09, puis le 2026-09-15 — avaient fini par souder les deux
                              lignes en un seul pavé, où l'adresse ne se lisait plus comme un second
                              rang. Un huitième de rem les sépare à nouveau, et pas davantage : le
                              blanc entre deux œuvres reste cinq fois plus large. */}
                          {distinction && (
                            <span className="lien-meme-auteur-edition"
                              style={{ display: 'block', fontSize: '0.6875rem', fontStyle: 'italic', lineHeight: 1.1, marginTop: '0.0625rem', ...(courante ? { color: 'var(--cs-vert)', fontWeight: 400 } : null) }}>
                              {distinction}
                            </span>
                          )}
                        </>
                      )
                      // ⛔ PLUS DE FILET ENTRE DEUX ŒUVRES (2026-09-15) : c'est le BLANC qui les
                      // sépare. ⚠️ Il est un REMBOURRAGE de l'entrée, non une marge entre
                      // entrées : la cible reste continue sous le curseur, sans interstice mort
                      // où un clic ne mènerait nulle part.
                      const commun: React.CSSProperties = {
                        display: 'block', fontSize: '0.6875rem', textDecoration: 'none',
                        padding: '0.3125rem 0', lineHeight: 1.25,
                      }
                      if (courante) {
                        return (
                          <span key={o.id_oeuvre} aria-current="page"
                            style={{ ...commun, color: 'var(--cs-vert)', fontWeight: 600 }}>
                            {contenu}
                          </span>
                        )
                      }
                      return (
                        <a key={o.id_oeuvre} href={`/oeuvre/${o.id_oeuvre}`} className="lien-meme-auteur" style={commun}>
                          {contenu}
                        </a>
                      )
                    }

                    // ── ŒUVRES ET OPUSCULES ────────────────────────────────────────
                    // La MÊME règle qu'à la bibliothèque, et le même module : seuil,
                    // mesure et conditions de repli vivent dans `app/lib/opuscules.ts`.
                    // Une étagère d'auteur prolifique noie ici ses œuvres de fond sous
                    // ses textes brefs exactement comme là-bas ; elle se partage donc de
                    // la même façon, sous peine d'offrir au lecteur deux classements du
                    // même corpus selon la page où il se tient.
                    //
                    // ⛔ Le classement porte sur le GROUPE DE TITRE, jamais sur l'entrée
                    // isolée : deux éditions d'un même texte ne se séparent pas parce que
                    // l'une n'a qu'une préface intégrée. Les entrées, elles, restent à
                    // plat — chacune porte son adresse d'édition, qui la départage.
                    //
                    // ⚠️ Le groupement se fait sur `cleTriTitre`, LA CLÉ DU TRI de cette
                    // liste : grouper sur une autre clé que celle qui ordonne couperait un
                    // groupe en deux dès que les deux divergeraient.
                    type GroupeTitre = { titre: string; versions: OeuvreResumee[] }
                    const groupes: GroupeTitre[] = []
                    for (const o of oeuvresAuteur) {
                      const dernier = groupes[groupes.length - 1]
                      if (dernier && cleTriTitre(dernier.titre) === cleTriTitre(o.titre)) dernier.versions.push(o)
                      else groupes.push({ titre: o.titre, versions: [o] })
                    }
                    const { grandes, opuscules, sectionne } = partagerOpuscules<OeuvreResumee, GroupeTitre>(groupes)
                    const lignes = (gs: GroupeTitre[]) => gs.flatMap(g => g.versions).map(rendreEntree)
                    if (!sectionne) return lignes(groupes)
                    // ⛔ L'ŒUVRE QU'ON LIT NE SE REPLIE PAS : si elle est un opuscule, la
                    // section s'ouvre d'office. Sans quoi la liste où le lecteur doit se
                    // voir se refermerait précisément sur lui.
                    const deployee = opusculesOuverts || opuscules.some(g => g.versions.some(v => v.id_oeuvre === idOeuvre))
                    return (
                      <>
                        {lignes(grandes)}
                        {/* ⛔ LA MARQUE D'UNE SECTION N'EST PAS CELLE D'UNE RUBRIQUE (relevé de
                            l'auteur, 2026-09-09 : « le fait qu'Opuscules ait la même flèche pour
                            déployer que les autres niveaux de titre me paraît bizarre »). Le volet
                            replie ses RUBRIQUES — « Du même auteur », les apparats,
                            « Sommaire » — par un triangle plein posé À DROITE, au bout d'une ligne
                            en capitales. « Opuscules » n'est pas une rubrique du volet : c'est une
                            section DANS une liste, et le même signe lui donnait le rang de ce qui
                            la contient.
                            Elle reprend donc la marque qu'elle porte déjà à la BIBLIOTHÈQUE, où
                            elle est née : le chevron en trait, À GAUCHE, tourné vers le bas quand
                            la section est ouverte et vers la droite quand elle est close. Deux
                            replis, deux marques — et la même section a la même forme des deux côtés
                            du site, comme elle a déjà le même seuil et le même partage. */}
                        <div style={{ marginTop: '0.125rem' }}>
                          <button type="button" onClick={() => setOpusculesOuverts(o => !o)} aria-expanded={deployee}
                            title={deployee ? 'Replier les opuscules' : 'Les textes brefs de cet auteur'}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '0.3125rem 0', textAlign: 'left' }}>
                            <span style={{ display: 'inline-flex', color: 'var(--cs-texte-doux)' }}>
                              <IconeChevron dir={deployee ? 'down' : 'right'} taille="0.6875rem" strokeWidth={1.4} />
                            </span>
                            <span style={{ fontSize: '0.6875rem', fontStyle: 'italic', color: 'var(--cs-texte-second)' }}>Opuscules</span>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)' }}>{opuscules.length}</span>
                          </button>
                          {deployee && lignes(opuscules)}
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Apparat critique + Sommaire — conteneur partagé à hauteur égale.

              ⛔ SUR TÉLÉPHONE, IL NE DISPUTE RIEN : IL COULE. La règle `flex: 1` +
              `minHeight: 0` est faite pour le volet de BUREAU, qui a une hauteur DÉFINIE
              (`height: HAUTEUR_SOUS_NAVBAR`) et où le conteneur prend légitimement ce qui
              reste pour que ses deux listes défilent en dedans. Le tiroir mobile, lui, n’a
              qu’un PLAFOND : la même règle y donne au conteneur une base de zéro, et
              `minHeight: 0` le laisse s’effondrer pendant que ses deux blocs, en
              `flexShrink: 0`, débordent. Mesuré sur planche à 375 × 812, tiroir au plafond :
              conteneur à HAUTEUR ZÉRO, « Apparat critique » à 777 et « Sommaire » à 813
              pour un tiroir qui finit à 772 — les deux rubriques sortaient du tiroir et son
              défileur ne les comptait même pas. C’est ce que l’auteur a vu comme un
              chevauchement (2026-09-09). Avec `flex: none` : conteneur à 71 px, et les deux
              rubriques rentrent dans le défilement du tiroir. */}
          <div style={{ ...(mobile ? { flex: 'none' } : { flex: 1, minHeight: 0 }), display: 'flex', flexDirection: 'column' }}>

            {/* ⛔ DEUX RUBRIQUES, ET PLUS D'« APPARAT CRITIQUE » (décision de l'auteur,
                2026-09-15 : « Apparat critique et apparat de l'auteur se ressemblent trop ;
                autant différencier directement et faire deux sections différentes, sans
                passer par apparat critique »). La rubrique commune coiffait deux mentions
                composées comme elle, même corps, même encre, même casse, si bien que
                « Apparat de l'auteur » se lisait comme une seconde rubrique glissée dans la
                première. Chaque main a désormais la sienne, dans l'ordre de la vue : l'auteur,
                puis l'éditeur. Une œuvre qui n'en porte qu'une n'en montre qu'une.
                ⚠️ L'ENVELOPPE porte le repère de la visite et le partage de hauteur que la
                rubrique unique portait : le sommaire qui suit n'a pas à savoir combien de
                mains la précèdent. Chaque rubrique ouverte prend ensuite sa part en dedans.
                ⚠️ Le partage de hauteur appartient au BUREAU : dans un tiroir, un plafond en
                pourcentage se résout contre un conteneur sans hauteur. */}
            {!modeComparaisonActif && sectionsApparat.length > 0 && (
              <div data-visite="oeuvre-apparat" style={{ ...(!mobile && apparatsOuverts > 0 ? { flex: apparatSEtire ? 1 : '0 1 auto', maxHeight: sommaireAQuoiSommer ? '50%' : undefined, minHeight: 0 } : { flexShrink: 0 }), display: 'flex', flexDirection: 'column' }}>
                {sectionsApparat.map(section => {
                  const ouvert = apparatOuvert[section]
                  return (
                    <div key={section} style={{ ...(!mobile && ouvert ? { flex: apparatSEtire ? '1 1 auto' : '0 1 auto', minHeight: 0 } : { flexShrink: 0 }), display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--cs-bord)' }}>
                      <button onClick={() => setApparatOuvert(o => ({ ...o, [section]: !o[section] }))} aria-expanded={ouvert}
                        style={TETE_RUBRIQUE}>
                        <span style={RUBRIQUE_AXE}>{LIBELLE_SECTION_APPARAT[section]}</span>
                        <span style={{ display: 'inline-flex', color: 'var(--cs-texte-second)', flexShrink: 0 }}>
                          <IconeChevron dir={ouvert ? 'up' : 'down'} taille="0.6875rem" strokeWidth={1.5} />
                        </span>
                      </button>
                      {ouvert && (
                        <div style={mobile ? { padding: '0 16px 14px' } : { flex: '0 1 auto', overflowY: 'auto', padding: '0 16px 14px' }}>
                          {tocApparatLocal.filter(entry => entry.section === section).map(entry => {
                            // ⚠️ La clé et l'état actif portent la MAIN : deux « Préface », une de
                            // chaque main, ne sont pas la même entrée.
                            const cle = `${entry.section}|${entry.niv1}`
                            const active = apparatNiv1Actif === cle
                            return (
                              <div key={cle} style={{ marginBottom: entry.niveaux2.length > 0 ? '5px' : undefined }}>
                                <a href={`#${entry.anchor}`} onClick={(e) => { e.preventDefault(); setVue('apparat'); setSegActif(null); setApparatNiv1Actif(cle); setAncreEnAttente(entry.anchor) }} className="toc-lien-n1"
                                  style={{ display: 'block', fontSize: '0.71875rem', fontWeight: active ? 600 : 400, color: active ? 'var(--cs-vert)' : 'var(--cs-texte)', marginBottom: '2px', lineHeight: 1.35, textDecoration: 'none' }}>
                                  {rendreIntituleDeSommaire(entry.niv1)}
                                </a>
                                {entry.niveaux2.map((niveau2) => (
                                  <a key={niveau2.niv2} href={`#${niveau2.anchor}`} onClick={(e) => { e.preventDefault(); setVue('apparat'); setSegActif(null); setApparatNiv1Actif(cle); setAncreEnAttente(niveau2.anchor) }} className="toc-lien-n2"
                                    style={{ display: 'block', paddingLeft: '10px', fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', marginBottom: '2px', lineHeight: 1.35, textDecoration: 'none' }}>
                                    {rendreIntituleDeSommaire(niveau2.niv2)}
                                  </a>
                                ))}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ⛔ ON REVIENT AU TEXTE PAR LE VOLET, MAIS SEULEMENT LÀ OÙ LE SOMMAIRE MANQUE.
                Ouvrir l'apparat critique change de VUE : le texte suivi cesse d'être
                rendu, et la barre du niveau 1 avec lui. Le SOMMAIRE y ramène ; ce bouton
                ne sert donc qu'aux lectures qui n'en ont pas (voir revenirAuTexteVisible).
                ⛔ Il se compose STRICTEMENT comme la tête du sommaire, dont il tient la
                place (demande de l'auteur, 2026-09-13) : même rubrique, même rembourrage,
                le mot au fer à gauche et le chevron au fer à droite. Le chevron posé
                devant le mot décalait le libellé du fer des autres rubriques. Il regarde
                vers le texte, à droite du volet ; jamais vers le haut ni le bas, qui
                diraient un dépli. */}
            {revenirAuTexteVisible && (
              <button type="button" onClick={revenirAuTexte} style={TETE_RUBRIQUE}>
                <span style={RUBRIQUE_AXE}>Revenir au texte</span>
                <span style={{ display: 'inline-flex', color: 'var(--cs-texte-second)', flexShrink: 0 }}>
                  <IconeChevron dir="right" taille="0.6875rem" strokeWidth={1.5} />
                </span>
              </button>
            )}

            {sommaireAQuoiSommer && (
            <nav aria-label="Sommaire" data-visite="oeuvre-sommaire" style={{ ...(!mobile && sommaireOuvert ? { flex: 1, minHeight: 0 } : { flexShrink: 0 }), display: 'flex', flexDirection: 'column' }}>
              <button onClick={() => setSommaireOuvert(!sommaireOuvert)} aria-expanded={sommaireOuvert}
                style={TETE_RUBRIQUE}>
                <span style={RUBRIQUE_AXE}>Sommaire</span>
                <span style={{ display: 'inline-flex', color: 'var(--cs-texte-second)', flexShrink: 0 }}>
                  <IconeChevron dir={sommaireOuvert ? 'up' : 'down'} taille="0.6875rem" strokeWidth={1.5} />
                </span>
              </button>

              {sommaireOuvert && (
              <div style={mobile ? { padding: '4px 16px 24px' } : { flex: 1, overflowY: 'auto', padding: '4px 16px 24px' }}>
            <p style={{ display: 'none' }}></p>

            {/* En comparaison, le sommaire liste les Livres → Divisions alignés,
                exactement au gabarit des niveaux 1/2 du texte ; cliquer charge la
                division (comme cliquer un niveau 1 charge sa section). */}
            {modeComparaisonActif && (
              comparaisonDivisions.length === 0 ? (
                <MotAttente marge="4px 0 0">Chargement des divisions…</MotAttente>
              ) : (
                Array.from(new Set(comparaisonDivisions.map(d => d.book))).map(bk => {
                  const estActif = comparaisonBook === bk
                  const divisionsDuLivre = comparaisonDivisions.filter(d => d.book === bk)
                  const titreLivre = divisionsDuLivre[0]?.niv1 || `LIVRE ${libelleLivreComparaison(bk)}`
                  return (
                    <div key={bk} style={{ marginBottom: '6px' }}>
                      <button onClick={() => divisionsDuLivre[0] && naviguerComparaison(bk, divisionsDuLivre[0].division)}
                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0', fontSize: '0.71875rem', fontWeight: estActif ? 600 : 400, color: estActif ? 'var(--cs-vert)' : 'var(--cs-texte)', lineHeight: 1.35 }}>
                        {rendreIntituleDeSommaire(titreLivre)}
                      </button>
                      {estActif && divisionsDuLivre.map(d => {
                        const actif2 = comparaisonDivision === d.division
                        return (
                          <div key={d.division} style={{ borderLeft: actif2 ? '2px solid var(--cs-vert)' : '2px solid transparent', marginBottom: '2px' }}>
                            <button onClick={() => naviguerComparaison(bk, d.division)}
                              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0 3px 8px' }}>
                              <span style={{ fontSize: '0.6875rem', color: actif2 ? 'var(--cs-vert)' : 'var(--cs-texte-second)', fontWeight: actif2 ? 600 : 400, display: 'block', lineHeight: 1.3 }}>{rendreIntituleDeSommaire(d.niv2 || libelleDivisionComparaison(d.division))}</span>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })
              )
            )}

            {!modeComparaisonActif && niv1List.map(n1 => {
              const estActif = vue === 'texte' && n1 === niv1Actif
              // Le complément ne se compose que s'il dit autre chose que son titre.
              const n1txt = complementDeTitre(n1, niv1TexteMap[n1])

              return (
                <div key={n1} style={{ marginBottom: profondeurSommaire >= 2 ? '6px' : '0' }}>
                  {/* Niv1 */}
                  <button onClick={() => changerNiv1(n1)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0', fontSize: '0.71875rem', fontWeight: estActif ? 600 : 400, color: estActif ? 'var(--cs-vert)' : 'var(--cs-texte)', lineHeight: 1.35, ...COMPOSITION_INTITULE }}>
                    {rendreIntituleDeSommaire(intituleDeNiveau1(n1, niv1TexteMap))}
                    {n1 !== NIV1_LIMINAIRES && n1txt && configNiveaux.txtSommaire[0] && (
                      <span style={{ fontSize: '0.6875rem', color: estActif ? 'var(--cs-vert)' : 'var(--cs-texte-gris)', fontStyle: 'italic', display: 'block', lineHeight: 1.3, marginTop: '1px', ...COMPOSITION_INTITULE }}>{rendreIntituleDeSommaire(n1txt)}</span>
                    )}
                  </button>

                  {/* Niv2 — affiché si profondeur >= 2 ET niv1 actif */}
                  {profondeurSommaire >= 2 && estActif && niv2List.map(n2 => {
                    const g2 = groupes.find(g => (!lectureTexteEntier || g.niv1 === n1) && g.niv2 === n2)
                    const n2txt = complementDeTitre(n2, g2?.niv2_texte)
                    const actif2 = vue === 'texte' && niv2Actif === n2
                    // Niv3 distincts pour ce niv2
                    const niv3DeN2 = profondeurSommaire >= 3
                      ? Array.from(new Set(groupes.filter(g => (!lectureTexteEntier || g.niv1 === n1) && g.niv2 === n2 && g.niv3).map(g => g.niv3)))
                      : []
                    return (
                      <div key={n2} style={{ borderLeft: actif2 ? '2px solid var(--cs-vert)' : '2px solid transparent', marginBottom: '2px' }}>
                        {/* Bouton niv2 */}
                        <button
                          onClick={() => allerAuNiv2(actif2 ? null : n2)}
                          style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0 3px 8px' }}>
                          <span style={{ fontSize: '0.6875rem', color: actif2 ? 'var(--cs-vert)' : 'var(--cs-texte-second)', fontWeight: actif2 ? 600 : 400, display: 'block', lineHeight: 1.3, ...COMPOSITION_INTITULE }}>{rendreIntituleDeSommaire(n2)}</span>
                          {n2txt && configNiveaux.txtSommaire[1] && <span style={{ fontSize: '0.6875rem', color: actif2 ? 'var(--cs-vert)' : 'var(--cs-texte-gris)', fontStyle: 'italic', display: 'block', lineHeight: 1.3, marginTop: '1px', ...COMPOSITION_INTITULE }}>{rendreIntituleDeSommaire(n2txt)}</span>}
                        </button>
                        {/* Niv3 — toujours visible, sans accordéon */}
                        {niv3DeN2.map(n3 => {
                          const g3 = groupes.find(g => (!lectureTexteEntier || g.niv1 === n1) && g.niv2 === n2 && g.niv3 === n3)
                          const n3txt = complementDeTitre(n3, g3?.niv3_texte)
                          const ancre = groupes.find(g => (!lectureTexteEntier || g.niv1 === n1) && g.niv2 === n2 && g.niv3 === n3)?.anchor
                          return (
                            <button key={n3}
                              onClick={() => {
                                setVue('texte')
                                if (ancre) naviguerVersAncre(ancre)
                              }}
                              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 2px 16px' }}>
                              <span style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', display: 'block', lineHeight: 1.3, ...COMPOSITION_INTITULE }}>{rendreIntituleDeSommaire(n3)}</span>
                              {n3txt && configNiveaux.txtSommaire[2] && <span style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', fontStyle: 'italic', display: 'block', lineHeight: 1.2, ...COMPOSITION_INTITULE }}>{rendreIntituleDeSommaire(n3txt)}</span>}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
              )}
            </nav>
            )}
          </div>
          </div>
        </aside>
        </>
        ) : mobile ? null : (
          // ⛔ LE RAIL EST LE COMPOSANT PARTAGÉ, non un quatrième dessin. La charte le
          // dit depuis le 4 septembre 2026 — « un seul composant pour les TROIS rails » —
          // et la page d'œuvre en portait deux écrits à la main : 22 px au lieu de 30, un
          // libellé de 8 px au lieu de 10,5, le texte en tête au lieu du milieu, le nom du
          // CONTENU au lieu de l'ACTION, et un chevron dont le gris était FIGÉ dans celui
          // du Clair (`#9a958d`, soit `--cs-texte-doux` écrit à la main) : sur le sol du
          // Cuir, il ne suivait pas le thème. C'était le dernier endroit du chemin de
          // lecture à enfreindre la règle du `currentColor`.
          // ⚠️ La bande sticky reste ICI : c'est la page qui sait où elle se colle, et le
          // rail se contente d'y remplir la hauteur. Même parti que la Polyglotte.
          <div style={{ position: 'sticky', top: HAUTEUR_NAVBAR, height: HAUTEUR_SOUS_NAVBAR, alignSelf: 'flex-start', flexShrink: 0, display: 'flex' }}>
            <RailVolet ref={refRailGauche} cote="gauche" libelle="Ouvrir le sommaire" onOuvrir={() => setNavOuverte(true)} />
          </div>
        )}

        {/* ── TEXTE CENTRAL ── */}
        {/* L'enveloppe porte la marque d'attente, qui se centre sur le bloc de texte
            (2026-09-03). ⛔ Elle ne peut pas vivre DANS `<main>` : `.lecture-sortie`
            efface tout le bloc, et l'anneau s'effacerait avec le texte qu'il annonce.
            Aucune transformation ici non plus, pour la même raison que sur `<main>`. */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', position: 'relative' }}>
        <main ref={mainRef} lang="fr" className={sortie ? 'lecture-sortie' : entree ? 'lecture-entree' : undefined} style={{ flex: 1, minWidth: 0, padding: mobile ? '2.875rem 14px 3.75rem' : '0 14px 80px', position: 'relative', overflow: 'visible' }}><div ref={colonneRef} data-colonne-lecture="" style={{ maxWidth: largeurLecture, margin: '0 auto', position: 'relative', overflow: 'visible' }}>
          {/* Frontispice IDENTIQUE à la lecture (même en Traductions parallèles) : même
              composant, même rembourrage symétrique, le titre centré sur toute la largeur
              du bloc. Les deux traductions comparées sont nommées en tête de colonnes plus
              bas. */}
          {/* Le fil d'Ariane est OBSERVÉ : tant qu'il se voit, son lien de retour suffit ;
              passé hors de vue — à l'arrivée sur un passage lointain —, le retour se tient
              en haut de la colonne (`RetourFlottant`). */}
          <div ref={refFilAriane}>{filAriane}</div>
          {retour && <RetourFlottant retour={retour} filAriane={refFilAriane} mobile={mobile} />}
          <PageTitre auteur={auteur} oeuvre={oeuvreLocale} versionActive={versionActive} versionEnRegard={versionEnRegard} titre={titreAffiche} estAdmin={estAdmin} mobile={mobile}
            notes={notesDuTitre([oeuvreLocale.titre_affichage, titreAffiche, oeuvreLocale.sous_titre, oeuvreLocale.sous_titre_affichage, oeuvreLocale.titre_original, oeuvreLocale.titre_original_affichage, oeuvreLocale.auteur_affichage])}
            onModifier={(champ, va) => setEditionCible({
              // Chaque élément du frontispice a ses deux colonnes, et la page montre la
              // composée dès qu'elle est renseignée : on laisse donc choisir celle qu'on
              // modifie, au lieu d'écrire dans l'une pendant que l'écran affiche l'autre.
              // Les deux faces et leurs libellés vivent dans `compositionTitres.ts`.
              type: 'titre_oeuvre', champ, texteActuel: va,
              variantes: variantesFrontispice(champ, oeuvreLocale, va),
            })} />

          {/* Ce que le serveur n'a pas pu charger, dit au lecteur : la page s'ouvre
              sans la couche qui manque au lieu de tomber (charte § 18). */}
          <BandeauDegradations degradations={degradations} estAdmin={estAdmin} />

          {/* Le fleuron qui sépare la page de titre du texte. Il se centre sur toute
              la largeur du bloc, en lecture comme en comparaison. */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '40px 0 44px' }}>
            <Fleuron cle={fleuronChoisi} />
          </div>

          {/* Barre de circulation de la comparaison — jumelle de « barre-nav-niv1 » :
              flèches ‹ › et titre « Livre — Division » centré, serif. */}
          {vue === 'texte' && modeComparaisonActif && alignementActif && (() => {
            const prev = divisionVoisine(comparaisonDivisions, comparaisonBook, comparaisonDivision, -1)
            const next = divisionVoisine(comparaisonDivisions, comparaisonBook, comparaisonDivision, 1)
            const courante = comparaisonDivisions.find(d => d.book === comparaisonBook && d.division === comparaisonDivision)
            // Les intitulés alignés viennent des segments de la traduction de
            // référence, sans la banque de notes qui les accompagne en lecture :
            // l'appel y serait muet, on le masque comme au sommaire.
            const titreLivre = rendreIntituleDeSommaire(courante?.niv1 || `LIVRE ${libelleLivreComparaison(comparaisonBook)}`)
            const titreDivision = rendreIntituleDeSommaire(courante?.niv2 || libelleDivisionComparaison(comparaisonDivision))
            return (
              <div id="barre-nav-division" style={{ display: 'flex', alignItems: 'last baseline', justifyContent: 'center', gap: '16px', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--cs-fond-doux)', minHeight: '32px', scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)` }}>
                <button onClick={() => prev && naviguerComparaison(prev.book, prev.division)} disabled={!prev} aria-label="Division précédente"
                  style={{ flexShrink: 0, width: '1.1em', textAlign: 'center', fontSize: '1.125rem', lineHeight: 1, color: prev ? 'var(--cs-texte-doux)' : 'transparent', background: 'none', border: 'none', cursor: prev ? 'pointer' : 'default', padding: 0, pointerEvents: prev ? 'auto' : 'none' }}>
                  {prev ? '‹' : ''}
                </button>
                <span style={{ fontSize: TITRE_CARTE, fontWeight: 500, color: 'var(--cs-encre)', fontFamily: SERIF, textAlign: 'center', minWidth: 0, lineHeight: 1.3 }}>
                  {titreLivre}
                  <span style={{ display: 'block', fontSize: '0.9375rem', fontWeight: 400, color: 'var(--cs-texte-second)', fontStyle: 'italic', marginTop: '4px', fontFamily: SERIF }}>{titreDivision}</span>
                </span>
                <button onClick={() => next && naviguerComparaison(next.book, next.division)} disabled={!next} aria-label="Division suivante"
                  style={{ flexShrink: 0, width: '1.1em', textAlign: 'center', fontSize: '1.125rem', lineHeight: 1, color: next ? 'var(--cs-texte-doux)' : 'transparent', background: 'none', border: 'none', cursor: next ? 'pointer' : 'default', padding: 0, pointerEvents: next ? 'auto' : 'none' }}>
                  {next ? '›' : ''}
                </button>
              </div>
            )
          })()}

          {/* Le repère du HAUT DU TEXTE — voir `ANCRE_DEBUT_LECTURE`. Il se pose à la
              place qu'occupe la barre « ‹ › » quand elle existe, et il est rendu dans
              TOUS les modes de lecture : c'est lui que vise le retour en haut, qu'on
              tourne une page, qu'on change de division ou qu'on quitte l'apparat. */}
          {vue === 'texte' && !modeComparaisonActif && (
            <div id={ANCRE_DEBUT_LECTURE} aria-hidden="true" style={{ scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)` }} />
          )}

          {/* Navigation précédent/suivant, toujours au niveau 1. Les flèches se posent sur la
              ligne de base de la DERNIÈRE ligne du titre (`last baseline`, demande de l'auteur,
              2026-09-24) : sans sous-titre, elles tombent sur le titre et son numéro ; avec un
              sous-titre, elles descendent sur la ligne grisée. Centrées, elles flottaient entre
              les deux. */}
          {vue === 'texte' && !modeComparaisonActif && !texteSansNiveaux && !lectureTexteEntier && (
            <div id="barre-nav-niv1" style={{ position: 'relative', display: 'flex', alignItems: 'last baseline', justifyContent: 'center', gap: '16px', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--cs-fond-doux)', minHeight: '32px', scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)` }}>
              {/* ⛔ ELLES SE NOMMENT. Leur nom accessible était le GLYPHE : un lecteur
                  d’écran annonçait « guillemet simple gauche », ou rien. Ce sont les
                  contrôles les plus employés de la page après le texte lui-même, et le
                  nom dit la DESTINATION, non le geste. */}
              <button onClick={() => niv1Prev && changerNiv1(niv1Prev)} disabled={!niv1Prev}
                aria-label={niv1Prev ? `Aller à ${intituleEnTexteNu(niv1Prev)}` : undefined}
                title={intituleEnTexteNu(niv1Prev ?? '') || undefined}
                style={{ flexShrink: 0, width: '1.1em', textAlign: 'center', fontSize: '1.125rem', lineHeight: 1, color: niv1Prev ? 'var(--cs-texte-doux)' : 'transparent', background: 'none', border: 'none', cursor: niv1Prev ? 'pointer' : 'default', padding: 0, pointerEvents: niv1Prev ? 'auto' : 'none' }}>
                {niv1Prev ? '‹' : ''}
              </button>
              {/* ⛔ C'EST UN TITRE, ET IL PORTE SON RANG. La barre de division compose le
                  niveau 1 en lecture ordinaire — le corps ne le rend qu'en texte entier —,
                  et elle le composait en SPAN : le plan de la page sautait du titre de
                  l'œuvre au niveau 2, et la division qu'on lit n'y figurait pas du tout. */}
              <h2 style={{ fontSize: TITRE_CARTE, fontWeight: 500, color: 'var(--cs-encre)', fontFamily: SERIF, textAlign: 'center', minWidth: 0, lineHeight: 1.3, whiteSpace: 'pre-line', overflowWrap: 'break-word' }}>
                {niv1Erreur ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--cs-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Erreur de chargement.{' '}
                    <button onClick={() => changerNiv1(niv1Erreur, { forceRefresh: true })}
                      style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--cs-danger-bord)', background: 'var(--cs-surface)', color: 'var(--cs-danger)', cursor: 'pointer' }}>
                      Réessayer
                    </button>
                  </span>
                ) : niv1Loading ? <MotAttente enLigne /> : (
                  <>
                    {(() => {
                      const intitule = intituleDeNiveau1(niv1Actif, niv1TexteMap)
                      // ⛔ Le titre RENDU porte ses appels ; `niv1Actif` reste l'identité.
                      // ⚠️ Et la COMPOSITION passe avant : c'est ICI qu'on lit le titre de
                      // niveau 1 en lecture ordinaire, le corps ne le rendant qu'en texte
                      // entier. L'oublier, c'est composer partout sauf là où l'on lit.
                      const compose1 = groupes[0] ? titreComposeDe(titresComposes, 'niv1', groupes[0]) : undefined
                      const pose = niv1Actif === NIV1_LIMINAIRES ? intitule : (compose1 ?? groupes[0]?.titresAffichage?.niv1 ?? intitule)
                      return rendreTitreColophonAvecNotes(
                        pose,
                        notesDuTitre([intitule], segMap.get(groupes[0]?.itemIds[0] ?? -1)?.notes),
                        'titre',
                      )
                    })()}
                    {(() => {
                      // Le titre réellement composé au-dessus : sous « Liminaires », c'est le
                      // libellé de la carte, et il n'a pas à se redire en sous-titre.
                      const titreAffiche = intituleDeNiveau1(niv1Actif, niv1TexteMap)
                      const txt = complementDeTitre(titreAffiche, groupes[0]?.niv1_texte || niv1TexteMap[niv1Actif])
                      const notesTitre = notesDuTitre([txt], segMap.get(groupes[0]?.itemIds[0] ?? -1)?.notes)
                      const composeTexte = groupes[0] ? titreComposeDe(titresComposes, 'niv1_texte', groupes[0]) : undefined
                      return (composeTexte || txt) && configNiveaux.txtCorps[0]
                        ? <span style={{ display: 'block', fontSize: '0.9375rem', fontWeight: 400, color: 'var(--cs-texte-second)', fontStyle: 'italic', marginTop: '4px', fontFamily: SERIF }}>{rendreTexteAvecNotes(preparerTitreColophon(composeTexte ?? groupes[0]?.titresAffichage?.niv1_texte ?? txt), notesTitre)}</span>
                        : null
                    })()}
                    {/* ⚠️ Au téléphone il n'y a pas de marge : un crayon à −52 px y sortait de
                        l'écran et ouvrait un défilement horizontal de 38 px (relevé du
                        2026-09-21). Il reste alors dans le bloc, comme au frontispice. */}
                    {estAdmin && niv1Actif !== NIV1_LIMINAIRES && (() => { const g = groupes[0] ?? { niv1: niv1Actif, niv2: '', niv3: '', niv4: '', anchor: '', itemIds: [] }; return (
                      <div className="cs-outils-titre" style={{ position: 'absolute', right: mobile ? 0 : '-52px', top: '2px', display: 'flex', gap: '3px', alignItems: 'center' }}>
                        <button onClick={() => setEditionCible(cibleTitre(1, g, false, niv1Actif))}
                          title="Modifier le titre" style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', lineHeight: 1 }}><IconeCrayon size={12} /></button>
                        <button onClick={() => setEditionCible(cibleTitre(1, g, true, g.niv1_texte ?? ''))}
                          title="Modifier le sous-titre" style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', lineHeight: 1, fontStyle: 'italic' }}><IconeCrayon size={12} /></button>
                      </div>
                    )})()}
                  </>
                )}
              </h2>
              <button onClick={() => niv1Next && changerNiv1(niv1Next)} disabled={!niv1Next}
                aria-label={niv1Next ? `Aller à ${intituleEnTexteNu(niv1Next)}` : undefined}
                title={intituleEnTexteNu(niv1Next ?? '') || undefined}
                style={{ flexShrink: 0, width: '1.1em', textAlign: 'center', fontSize: '1.125rem', lineHeight: 1, color: niv1Next ? 'var(--cs-texte-doux)' : 'transparent', background: 'none', border: 'none', cursor: niv1Next ? 'pointer' : 'default', padding: 0, pointerEvents: niv1Next ? 'auto' : 'none' }}>
                {niv1Next ? '›' : ''}
              </button>
            </div>
          )}

          {/* Vue texte principal */}
          {vue === 'texte' && modeComparaisonActif && alignementActif ? (
            <ComparaisonTraductions key={`${alignementActif.alignmentSetId}:${comparaisonBook}:${comparaisonDivision}`} alignement={alignementActif} estAdmin={estAdmin} book={comparaisonBook} division={comparaisonDivision} userId={userId} auteur={auteur} />
          ) : vue === 'texte' && (() => {
            // Les titres que la page a montrés : la règle vit dans `titresDuGroupe`, que la
            // copie du lasso lit aussi (charte § 38.8.1).
            let montres = titresAuDepart
            let isFirstGroupe = true
            // Introductions (arguments) hissées en tête de l'homélie, hors des groupes
            // et de la pagination : police plus petite et plus claire, marges latérales.
            // Rendues depuis l'état complet des segments, et seulement sur la 1re page.
            //
            // ⛔ ET LA POÉSIE S'Y COMPOSE EN VERS (2026-09-07). C'est la CINQUIÈME surface
            // du vers, et la seule qui l'ignorait : les 79 vers du Manuel de Dhuoda s'y
            // rendaient en prose justifiée et césurée, un bloc par vers, avec un blanc à
            // chaque changement de « paragraphe ». On refait donc le POÈME par
            // « fusionnerBlocs », comme la lecture ordinaire, et chaque ligne prend
            // « styleLigneArgumentEnVers » — la géométrie du vers, la face de l'argument.
            //
            // ⛔ ET ELLE COMPOSE SA COLONNE EN REGARD (2026-09-07, le soir). C'était le
            // même défaut pris une seconde fois dans la même journée, et par l'autre
            // bout : ce chemin ne savait rien du BILINGUE non plus. La grille ne vit que
            // dans la boucle des groupes, quelques lignes plus bas, et celle-ci écarte
            // les segments d'introduction — un groupe qui n'en porte que rend `null`.
            // Le *Manuel pour mon fils* de Dhuoda en fait la démonstration : ses treize
            // segments français sont TOUS de nature `introduction` (la traduction a
            // commencé par les prolégomènes), l'alignement latin-français existe, il est
            // complet, `enRegardSurPlace` est vrai, le menu offre « Français & latin »…
            // et le lecteur n'obtenait qu'une colonne. Bouton allumé, rien en face,
            // c'est-à-dire exactement ce que `paireDeLecture` avait été écrit pour
            // empêcher : la garde vérifie qu'une colonne PEUT se composer, jamais que la
            // surface qui rend ce texte SAIT la composer.
            // ⛔ La MÊME liste que celle des bornes, et non une seconde filtrée ici :
            // deux listes qui doivent s'accorder finissent par diverger, et c'est
            // justement leur désaccord qui faisait paraître l'original quatorze fois.
            const intros = introsEnTete
            const introParId = new Map(intros.map(s => [s.id, s]))
            const rangDansIntros = new Map(intros.map((s, i) => [s.id, i]))
            // Les blocs de l'argument, découpés comme ceux de la lecture. ⚠️ Le chunk de
            // départ est le SEGMENT et non le paragraphe : un argument fait bloc à lui
            // seul, c'est la règle de cette surface, et `margeArgument` resserre le blanc
            // quand deux arguments voisins partagent leur paragraphe.
            const blocsIntro = ((): BlocEnRegard<number>[] => {
              const morceaux = intros.map(s => ({ ids: [s.id] }))
              const seul = (cs: readonly { ids: number[] }[]): BlocEnRegard<number>[] =>
                cs.map(c => ({ ids: c.ids, groupes: [], couvert: false, clot: true }))
              const enVers = (ids: readonly number[]) => estBlocDeVers(ids.map(sid => introParId.get(sid)))
              // Hors regard, rien ne change : le POÈME se refait par-dessus les segments.
              if (!enRegardTexte) return seul(fusionnerBlocs(morceaux, enVers))
              // Faute d'alignement, rien n'est en regard : même règle que `blocsDeLecture`.
              if (!blocsAlignes) return seul(morceaux)
              return fusionnerBlocsDeVers(
                repartirGroupes(morceaux, sid => introParId.get(sid)?.groupeOriginal, bornesGroupes),
                enVers,
              )
            })()
            // ⛔ L'ARGUMENT N'A PLUS DE PAVÉ EN ABSOLU (2026-09-07). Il en portait un,
            // « .seg-actions », posé à deux pixels du coin haut droit de son bloc : les
            // trois boutons couvraient donc la fin de sa PREMIÈRE LIGNE, au moment même
            // où l'on venait de la survoler pour les faire paraître. Il reçoit les mêmes
            // gestes qu'un segment de lecture, et la même cellule les sert.
            const gestesArgument = (s: SegData) => ({
              onClick: (e: React.MouseEvent<HTMLElement>) =>
                tapSegmentParagraphe(e.currentTarget, s.id, segActif === s.id),
              onMouseEnter: sansSurvol ? undefined : (e: React.MouseEvent<HTMLElement>) =>
                positionnerToolbar(e.currentTarget, s.id),
              onMouseLeave: sansSurvol ? undefined : () => masquerToolbar(s.id),
              ...clavierSegment(s.id, segActif === s.id),
            })
            const corpsArgument = (s: SegData) =>
              rendreTexteAvecNotes(composerCorps(preparerTexteSegment(s.texteAffichage ?? s.texte)), s.notes ?? {})
            return (<>
              {blocsIntro.map((bloc) => {
                const segs = bloc.ids.map(id => introParId.get(id)).filter((s): s is SegData => Boolean(s))
                if (segs.length === 0) return null
                const original = originalDuBloc(bloc)
                // La colonne originale d'un argument se sélectionne comme celle du corps.
                const marqueOriginal = marqueDeLOriginal(bloc)
                // ⛔ La GRILLE se garde même sans original à composer, dès lors que
                // l'alignement COUVRE le bloc : un argument dont l'empan est composé plus
                // haut ne reprend pas toute la largeur au milieu d'une page en regard.
                // Même règle, et même raison, que dans la boucle des groupes.
                const grille = affichageBilingue && (Boolean(original) || bloc.couvert)
                const toutVers = estBlocDeVers(segs)
                // L'original a sa PROPRE nature : un latin en vers se compose en vers même
                // si le français d'en face est en prose, et l'inverse.
                const originalEnVers = original?.toutVers ?? toutVers
                const classesGrille = grille
                  ? `para-bilingue${(toutVers || originalEnVers) ? ' para-bilingue--vers' : ''}${bloc.clot ? '' : ' para-bilingue--couture'}`
                  : undefined
                // ⚠️ « data-grille-bilingue » borne la cellule d'actions à la colonne
                // FRANÇAISE : à droite de l'argument il y a le latin, et sans lui le pavé
                // se posait dessus. Il n'est posé que là où la grille existe vraiment.
                // ⚠️ HORS GRILLE, ON N'ENVELOPPE RIEN : un `div` de plus autour de chaque
                // argument ferait une boîte que la lecture ordinaire n'a jamais eue, et
                // c'est la lecture ordinaire qui est le cas de presque tout le corpus.
                // En « Latin seul », le français masqué et son original sont FRÈRES, comme
                // ils le sont dans le corps.
                const enveloppe = (cle: string, contenu: React.ReactNode) => {
                  const colonnes = (<>
                    {contenu}
                    {enRegardTexte && original && (
                      originalEnVers ? (
                        <div lang={codeLangue(oeuvre.langue_originale)} className="texte-original" {...marqueOriginal}
                          style={styleColonneOriginale({ surface: 'argument', seul: afficherOriginalSeul, grec: estGrec, vers: true })}>
                          {lignesDeVers(original.affichage).map((ligne, i) => (
                            <span key={i} style={styleLigneDeVers({ rang: 0 })}>
                              {composerOriginal(ligne, original.notes)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p lang={codeLangue(oeuvre.langue_originale)} className="texte-original" {...marqueOriginal}
                          style={styleColonneOriginale({ surface: 'argument', seul: afficherOriginalSeul, grec: estGrec })}>
                          {composerOriginal(original.affichage, original.notes)}
                        </p>
                      )
                    )}
                  </>)
                  return grille
                    ? <div key={cle} data-grille-bilingue="" className={classesGrille}>{colonnes}</div>
                    : <Fragment key={cle}>{colonnes}</Fragment>
                }
                if (!toutVers) {
                  // Prose : un argument par bloc, la composition de toujours.
                  const s = segs[0]
                  const suivant = intros[(rangDansIntros.get(s.id) ?? 0) + 1]
                  const memeParagraphe = suivant?.paragraphe != null && suivant.paragraphe === s.paragraphe
                  return enveloppe(`intro-${s.id}`, (
                    // ⚠️ En « Latin seul », c'est l'ENVELOPPE qui s'efface, non le texte
                    // qu'elle porte : masquer le seul contenu laisserait une boîte vide
                    // qui garde sa marge, donc un blanc fantôme entre deux arguments.
                    // ⚠️ L'introduction porte la MÊME poignée que tout autre segment,
                    // `segment-<id>` : c'est par elle qu'on la vise, qu'on l'amène au
                    // niveau des yeux, et qu'on départage deux appels d'une même note.
                    // Elle ne l'avait pas, et ce chemin de rendu restait donc muet pour
                    // la navigation.
                    <div id={`segment-${s.id}`} className="seg-wrapper" style={{
                      position: 'relative',
                      display: afficherOriginalSeul ? 'none' : undefined,
                      margin: margeArgument({ memeParagraphe, enRegard: grille }),
                      scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)`,
                    }}>
                      <div lang={langueCorps} className="seg-p" {...gestesArgument(s)}
                        style={styleArgument({ actif: segActif === s.id })}>
                        {corpsArgument(s)}
                      </div>
                    </div>
                  ))
                }
                // ⛔ L'ombre de la LETTRINE se retire avant de composer, comme dans le
                // corps : une capitale ornée pousse les premiers vers vers la droite, et
                // l'océrisation mesure ce déplacement comme un alinéa.
                const rangs = ombreDeLettrine(niveauxAlinea(segs.map(s => s.alinea)))
                return enveloppe(`intro-poeme-${segs[0].id}`, (
                  <div lang={langueCorps} style={styleBlocArgumentEnVers({ enRegard: grille, masque: afficherOriginalSeul })}>
                    {segs.map((s, i) => (
                      <div key={`intro-${s.id}`} id={`segment-${s.id}`} className="seg-wrapper"
                        style={{ position: 'relative', margin: 0, scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)` }}>
                        <div className="seg-p" {...gestesArgument(s)}
                          style={styleLigneArgumentEnVers({
                            rang: rangs[i],
                            ouvreStrophe: ouvreStrophe(
                              { strophe_avant: s.stropheAvant, paragraphe: s.paragraphe },
                              i > 0 ? segs[i - 1] : undefined,
                            ),
                            actif: segActif === s.id,
                          })}>
                          {corpsArgument(s)}
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              })}
              {groupesFiltres.map((groupe) => {
              const itemsReels = groupe.itemIds.filter(id => segMap.get(id)?.nature !== 'introduction')
              if (itemsReels.length === 0) return null
              const notesTitre = notesDuTitre(
                [groupe.niv1, groupe.niv1_texte, groupe.niv2, groupe.niv2_texte, groupe.niv3, groupe.niv3_texte, groupe.niv4, groupe.niv4_texte],
                segMap.get(itemsReels[0])?.notes,
              )
              // ⛔ Le titre RENDU porte ses appels de note ; le titre CANONIQUE reste
              // l'identité, celle sur quoi la navigation et le sommaire s'appuient.
              // ⚠️ Et la COMPOSITION passe avant tout (2026-09-20) : c'est le même partage
              // que `titre` / `titre_affichage` sur le frontispice, l'identité d'un côté,
              // la mise en page de l'autre. Elle l'emporte donc aussi sur les appels de
              // note projetés : un titre composé porte les siens, écrits à la main.
              const rendu = (champ: ChampTitre, brut: string) => titreComposeDe(titresComposes, champ, groupe) ?? groupe.titresAffichage?.[champ] ?? brut
              // Le complément d'un titre est FACULTATIF, et il ne se compose que s'il
              // dit autre chose que le titre lui-même (cf. `complementDeTitre`).
              const sousTitre1 = complementDeTitre(groupe.niv1, groupe.niv1_texte)
              const sousTitre2 = complementDeTitre(groupe.niv2, groupe.niv2_texte)
              const sousTitre3 = complementDeTitre(groupe.niv3, groupe.niv3_texte)
              const sousTitre4 = complementDeTitre(groupe.niv4, groupe.niv4_texte)
              const titres = titresDuGroupe(groupe, montres, reglageDesTitres)
              montres = titres.montres
              const { niv1: showNiv1, niv2: showNiv2, niv3: showNiv3, niv4: showNiv4 } = titres
              const marginTop = isFirstGroupe ? '0' : showNiv1 ? '2.8rem' : showNiv2 ? '2.5rem' : showNiv3 ? '1.5rem' : '0.8rem'
              if (isFirstGroupe) isFirstGroupe = false
              return (
                <div key={groupe.anchor} id={groupe.anchor} style={{ scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)` }}>
                  {showNiv1 && (
                    <div style={{ textAlign: 'center', marginTop, marginBottom: '1.5rem', paddingTop: '0.5rem', position: 'relative' }}>
                      <h2 style={styleTitreNiveau(1)}>{rendreTitreColophonAvecNotes(rendu('niv1', groupe.niv1), notesTitre, 'titre')}</h2>
                      {sousTitre1 && configNiveaux.txtCorps[0] && <p style={styleSousTitreNiveau(1)}>{rendreTexteAvecNotes(preparerTitreColophon(rendu('niv1_texte', sousTitre1)), notesTitre)}</p>}
                    </div>
                  )}
                  {showNiv2 && (
                    <div style={{ textAlign: 'center', marginTop: marginTop, marginBottom: '1rem', paddingTop: '0.5rem', position: 'relative' }}>
                      <h3 style={styleTitreNiveau(2)}>{rendreTitreColophonAvecNotes(rendu('niv2', groupe.niv2), notesTitre, 'titre')}</h3>
                      {sousTitre2 && configNiveaux.txtCorps[1] && <p style={styleSousTitreNiveau(2)}>{rendreTitreColophonAvecNotes(rendu('niv2_texte', sousTitre2), notesTitre)}</p>}
                      {estAdmin && (
                        <div className="cs-outils-titre" style={{ position: 'absolute', right: mobile ? 0 : '-52px', top: '0.5rem', display: 'flex', gap: '3px', alignItems: 'center' }}>
                          <button onClick={() => setEditionCible(cibleTitre(2, groupe, false, groupe.niv2))}
                            title="Modifier le titre" style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}><IconeCrayon size={12} /></button>
                          <button onClick={() => setEditionCible(cibleTitre(2, groupe, true, groupe.niv2_texte ?? ''))}
                            title="Modifier le sous-titre" style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontStyle: 'italic' }}><IconeCrayon size={12} /></button>
                        </div>
                      )}
                    </div>
                  )}
                  {showNiv3 && (
                    <div style={{ marginTop: isFirstGroupe ? '0' : '1rem', marginBottom: '0.4rem', paddingLeft: '11px', borderLeft: '1px solid var(--cs-bord)', position: 'relative' }}>
                      <h4 style={{ ...styleTitreNiveau(3), textAlign: groupe.niv3.length >= SEUIL_TITRE_COLOPHON ? 'center' : undefined }}>{rendreTitreColophonAvecNotes(rendu('niv3', groupe.niv3), notesTitre)}</h4>
                      {sousTitre3 && configNiveaux.txtCorps[2] && <p style={styleSousTitreNiveau(3)}>{rendreTitreColophonAvecNotes(rendu('niv3_texte', sousTitre3), notesTitre)}</p>}
                      {estAdmin && (
                        <div className="cs-outils-titre" style={{ position: 'absolute', right: mobile ? 0 : '-52px', top: 0, display: 'flex', gap: '3px', alignItems: 'center' }}>
                          <button onClick={() => setEditionCible(cibleTitre(3, groupe, false, groupe.niv3))}
                            title="Modifier le titre" style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}><IconeCrayon size={12} /></button>
                          <button onClick={() => setEditionCible(cibleTitre(3, groupe, true, groupe.niv3_texte ?? ''))}
                            title="Modifier le sous-titre" style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontStyle: 'italic' }}><IconeCrayon size={12} /></button>
                        </div>
                      )}
                    </div>
                  )}
                  {showNiv4 && (
                    <h5 style={{ ...styleTitreNiveau(4), position: 'relative' }}>
                      {rendreTitreColophonAvecNotes(rendu('niv4', groupe.niv4), notesTitre)}
                      {sousTitre4 && configNiveaux.txtCorps[3] && <span style={styleSousTitreNiveau(4)}>{rendreTitreColophonAvecNotes(rendu('niv4_texte', sousTitre4), notesTitre)}</span>}
                      {estAdmin && (
                        <span style={{ position: 'absolute', right: mobile ? 0 : '-52px', top: 0, display: 'inline-flex', gap: '3px', alignItems: 'center', textTransform: 'none' }}>
                          <button onClick={() => setEditionCible(cibleTitre(4, groupe, false, groupe.niv4))}
                            title="Modifier le titre" style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', letterSpacing: 0 }}><IconeCrayon size={12} /></button>
                          <button onClick={() => setEditionCible(cibleTitre(4, groupe, true, groupe.niv4_texte ?? ''))}
                            title="Modifier le sous-titre" style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontStyle: 'italic', letterSpacing: 0 }}><IconeCrayon size={12} /></button>
                        </span>
                      )}
                    </h5>
                  )}
                  {/* ⚠️ On refait le POÈME avant de composer. Le découpage par
                      `paragraphe` est juste pour de la prose et faux pour des vers :
                      Ceriziers laisse `paragraphe` à 1 sur ses 1 213 vers, Mirandol y
                      range une strophe de douze. Sans fusion, la même œuvre se
                      composait en un bloc par poème d'un côté et un bloc par strophe
                      de l'autre.
                      ⚠️ On ne fond QUE si l'original n'est pas montré. Le latin d'une
                      strophe vit sur son vers de rang 1 (charte, § Textes originaux
                      parallèles) : fondre le poème en regard n'en garderait qu'un seul
                      et jetterait les autres. En français seul, rien ne s'apparie et
                      le poème se refait. */}
                  {blocsDeLecture(itemsReels).map((chunk, iBloc, blocs) => {
                    const original = originalDuBloc(chunk)
                    // ⛔ Le lasso prend la colonne originale comme il prend le français : la
                    // clé du bloc, et la SOURCE de son texte canonique (voir plus haut).
                    const marqueOriginal = marqueDeLOriginal(chunk)
                    // ⛔ La GRILLE se garde même sans original à composer, dès lors que
                    // l'alignement couvre le bloc : un paragraphe dont l'empan est
                    // composé plus haut ne reprend pas toute la largeur au milieu d'une
                    // page en regard. C'est `couvert` qui le dit, non la présence d'un
                    // original.
                    const grilleBilingue = affichageBilingue && (Boolean(original) || chunk.couvert)
                    // ⛔ Le filet et le blanc appartiennent au PARAGRAPHE : seul son
                    // dernier rang le ferme. Les rangs d'un même paragraphe se COUSENT —
                    // ils ne sont deux que parce que la mise en regard l'exige.
                    const clotParagraphe = chunk.clot
                    const toutRubrique = chunk.ids.every(sid => segMap.get(sid)?.nature === 'rubrique')
                    // Bloc de signatures : composé au fer à droite, interligne resserré.
                    // ⚠️ SEPT segments du corpus l'atteignent (compositionOeuvre.ts) : les
                    // mentions de traducteur que Bar-le-Duc imprime en clôture d'une pièce,
                    // qui ferment le texte et se lisent donc avec lui. Les onze autres
                    // `signature` — approbations, censeurs, privilèges — vivent dans l'apparat.
                    // ⛔ Le blanc qui suit une signature se juge sur le bloc SUIVANT : cousu
                    // s'il en est une (c'est une liste), coupé sinon (elle ferme sa pièce).
                    const toutSignature = estBlocDeSignatures(chunk.ids.map(sid => segMap.get(sid)?.nature))
                    const signatureSuit = estBlocDeSignatures(
                      (blocs[iBloc + 1]?.ids ?? []).map(sid => segMap.get(sid)?.nature),
                    )
                    const placeSignature = placeDeLaSignature(toutSignature, signatureSuit)
                    // EXERGUE : le verset posé en seuil de la pièce, et sa traduction.
                    // Rentré du quart de la mesure et justifié — la règle et ses mesures
                    // vivent dans `app/lib/compositionExergue.ts`, que la comparaison des
                    // traductions emploie aussi : une seule composition, deux surfaces.
                    // ⛔ Le blanc qui le suit se juge lui aussi sur le bloc SUIVANT : cousu
                    // quand la traduction reprend le même verset, ouvert en seuil quand le
                    // texte commence.
                    const toutExergue = estBlocExergue(chunk.ids.map(sid => segMap.get(sid)?.nature))
                    const exergueSuit = estBlocExergue(
                      (blocs[iBloc + 1]?.ids ?? []).map(sid => segMap.get(sid)?.nature),
                    )
                    const placeExergue = placeDeLExergue(toutExergue, exergueSuit)
                    // Strophe : un poème ne se compose pas comme de la prose. Toute la
                    // règle vit dans `app/lib/compositionVers.ts`, que les traductions
                    // parallèles emploient aussi — une seule composition, deux surfaces.
                                    // ⚠️ `estBlocDeVers` lit les DEUX façons de déclarer un vers : la
                    // nature héritée `vers`, et `segment_metadata.forme`. La seconde est
                    // la seule possible dans l'apparat, où la nature est déjà prise.
                    const toutVers = estBlocDeVers(chunk.ids.map(sid => segMap.get(sid)))
                    // Citation biblique posée VERSET PAR VERSET : la coupure vient de
                    // l'édition, non de la segmentation, et ne se recolle donc pas comme
                    // celle d'une `citation` sortie. Règle et mesures dans
                    // `app/lib/compositionVersets.ts`, partagées avec la comparaison.
                    const toutVerset = estBlocVersets(chunk.ids.map(sid => segMap.get(sid)?.nature))
                    // L'original a sa PROPRE nature : un original en vers se compose en
                    // vers même si la traduction d'en face est en prose, et l'inverse.
                    // Le repli n'en sait rien et suit la colonne française, comme avant.
                    const originalEnVers = original?.toutVers ?? toutVers
                    return (
                    // ⚠️ « data-grille-bilingue » borne la cellule d'actions à la colonne
                    // FRANÇAISE : c'est par lui que « colonneDuSegment » la retrouve, et
                    // il n'est posé que lorsque la grille existe vraiment.
                    <div key={`para-${chunk.ids[0]}`} data-grille-bilingue={grilleBilingue ? '' : undefined} className={grilleBilingue ? `para-bilingue${(toutVers || originalEnVers) ? ' para-bilingue--vers' : ''}${clotParagraphe ? '' : ' para-bilingue--couture'}` : undefined}>
                      {toutVers ? (
                        /* ⛔ Une ligne de vers est une BOÎTE, jamais un fragment en ligne.
                           Un seul `<p>` ne peut pas rentrer chaque ligne : `text-indent`
                           ne s'applique qu'à la PREMIÈRE ligne d'un bloc, et jamais après
                           un saut forcé. D'où une boîte par vers — et le retrait de suite
                           qui distingue une ligne trop longue du vers d'après.
                           Ni justification ni césure : on ne coupe pas un alexandrin. */
                        <div lang={langueCorps} style={styleBlocDeVers({ masque: afficherOriginalSeul })}>
                          {(() => {
                            // ⛔ L'ombre de la LETTRINE se retire avant de composer : une
                            // capitale ornée pousse les premiers vers vers la droite, et
                            // l'océrisation mesure ce déplacement comme un alinéa. Vérifié
                            // sur le fac-similé de Ceriziers 1646, page 19.
                            const rangs = ombreDeLettrine(niveauxAlinea(chunk.ids.map(sid => segMap.get(sid)?.alinea)))
                            return chunk.ids.map((sid, i) => {
                              const s = segMap.get(sid)
                              if (!s) return null
                              const actif = segActif === sid
                              // ⛔ Un VERS ne prend pas de lettrine. Le drop cap est un
                              // flottant : posé dans la boîte d'une ligne, il déborde sur
                              // les suivantes, qui sont des boîtes sœurs. La capitale ornée
                              // d'un poème appartient au POÈME, pas à son premier vers, et
                              // la rendre demande de faire flotter l'ornement sur le bloc
                              // entier — chantier à part, pas un réglage.
                              const estPremier = false
                              const strophe = ouvreStrophe(
                                { strophe_avant: s.stropheAvant, paragraphe: s.paragraphe },
                                i > 0 ? segMap.get(chunk.ids[i - 1]) : undefined,
                              )
                              return (
                                <span key={sid} style={styleLigneDeVers({ rang: rangs[i], ouvreStrophe: strophe })}>
                                  <span id={`segment-${sid}`} className={`seg-inline${actif ? ' seg-inline--actif' : ''}`} style={{ scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)` }}
                                    onClick={(e) => tapSegmentParagraphe(e.currentTarget as HTMLElement, sid, actif)}
                                    {...clavierSegment(sid, actif)}
                                    onMouseEnter={mobile ? undefined : (e) => positionnerToolbar(e.currentTarget as HTMLElement, sid)}
                                    onMouseLeave={mobile ? undefined : () => masquerToolbar(sid)}>
                                    {rendreCorpsSegment(s, estPremier)}
                                  </span>
                                </span>
                              )
                            })
                          })()}
                        </div>
                      ) : toutVerset ? (
                        /* Citation biblique DÉCOUPÉE EN VERSETS : un verset = une boîte.
                           Le style de la citation sortie — corps réduit, justification,
                           ni guillemets ni filet — avec un retrait à GAUCHE seulement et
                           un léger blanc entre versets au lieu du blanc de paragraphe.
                           ⛔ Pas de lettrine ici, pour la raison qui l'interdit aux vers :
                           le drop cap est un flottant, et posé dans la boîte d'une ligne
                           il déborde sur les suivantes, qui sont des boîtes sœurs. */
                        <div lang={langueCorps} className="citation-versets" style={{ display: afficherOriginalSeul ? 'none' : undefined }}>
                          {chunk.ids.map((sid) => {
                            const s = segMap.get(sid)
                            if (!s) return null
                            const actif = segActif === sid
                            return (
                              <span key={sid} className="citation-verset">
                                <span id={`segment-${sid}`} className={`seg-inline${actif ? ' seg-inline--actif' : ''}`} style={{ scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)` }}
                                  onClick={(e) => tapSegmentParagraphe(e.currentTarget as HTMLElement, sid, actif)}
                                  {...clavierSegment(sid, actif)}
                                  onMouseEnter={mobile ? undefined : (e) => positionnerToolbar(e.currentTarget as HTMLElement, sid)}
                                  onMouseLeave={mobile ? undefined : () => masquerToolbar(sid)}>
                                  {rendreCorpsSegment(s, false, null, true)}
                                </span>
                              </span>
                            )
                          })}
                        </div>
                      ) : (
                      <p lang={langueCorps} style={styleParagrapheLecture({ signature: placeSignature, exergue: placeExergue, rubrique: toutRubrique, masque: afficherOriginalSeul })}>
                        {regrouperCitationsStructurelles(
                          chunk.ids,
                          sid => segMap.get(sid)?.nature === 'citation',
                        ).map((blocCitation) => {
                          const sortieStructurelle = blocCitation.citation && citationStructurelleEstLongue(
                            blocCitation.elements.map(sid => {
                              const s = segMap.get(sid)
                              return s ? composerCorps(preparerTexteSegment(s.texteAffichage ?? s.texte)) : ''
                            }),
                          )
                          const textesStructurels = sortieStructurelle
                            ? textesCitationStructurelleSansEncadrement(blocCitation.elements.map(sid => {
                                const s = segMap.get(sid)
                                return s ? composerCorps(preparerTexteSegment(s.texteAffichage ?? s.texte)) : ''
                              }))
                            : []
                          const contenu = blocCitation.elements.map((sid, i) => {
                            const s = segMap.get(sid)
                            if (!s) return null
                            const actif = segActif === sid
                            const estPremier = sid === premierSegmentId
                            // À l'intérieur d'un bloc structurel, seule la jointure
                            // entre ses propres segments subsiste. Son premier segment
                            // commence le bloc : l'espace qui le rattachait à la prose
                            // d'annonce n'a plus de fonction visible.
                            const afficherLiant = sortieStructurelle
                              ? i > 0
                              : sid !== chunk.ids[0]
                            return (
                              <Fragment key={sid}>
                                {afficherLiant ? liantAvantSegment(s.joinBefore) : null}
                                <span id={`segment-${sid}`} className={`seg-inline${actif ? ' seg-inline--actif' : ''}`} style={{ scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)` }}
                                  onClick={(e) => tapSegmentParagraphe(e.currentTarget as HTMLElement, sid, actif)}
                                  {...clavierSegment(sid, actif)}
                                  onMouseEnter={mobile ? undefined : (e) => positionnerToolbar(e.currentTarget as HTMLElement, sid)}
                                  onMouseLeave={mobile ? undefined : () => masquerToolbar(sid)}>
                                  {rendreCorpsSegment(s, estPremier, sortieStructurelle ? textesStructurels[i] : null)}
                                </span>
                              </Fragment>
                            )
                          })
                          return sortieStructurelle
                            ? <span key={`citation-${blocCitation.elements[0]}`} className="citation-sortie citation-sortie--structurelle">{contenu}</span>
                            : <Fragment key={`prose-${blocCitation.elements[0]}`}>{contenu}</Fragment>
                        })}
                      </p>
                      )}
                      {(affichageBilingue || afficherOriginalSeul) && original && (
                        originalEnVers ? (
                          /* ⛔ L'ORIGINAL d'un poème se compose en vers, lui aussi. Le latin
                             d'une strophe entière vit sur le vers de rang 1, ses lignes
                             séparées par des sauts. Rendu dans un paragraphe de prose, il se
                             justifiait et se coupait à la césure pendant que le français
                             d'en face était composé en vers : les deux colonnes ne disaient
                             plus la même chose (relevé par l'auteur, 2026-08-23).
                             ⚠️ Pas de rang d'alinéa ici : la source ne mesure l'indentation
                             que du texte TRADUIT. On ne pose donc que l'alinéa de base, et
                             le retrait de suite, qui appartiennent à la composition. */
                          <div lang={codeLangue(oeuvre.langue_originale)} className="texte-original" {...marqueOriginal} style={styleColonneOriginale({ surface: 'lecture', seul: afficherOriginalSeul, grec: estGrec, vers: true })}>
                            {lignesDeVers(original.affichage).map((ligne, i) => (
                              <span key={i} style={{ display: 'block', lineHeight: 1.4, marginLeft: `${retraitVers(0)}em`, paddingLeft: `${RETRAIT_SUITE}em`, textIndent: `-${RETRAIT_SUITE}em`, hyphens: 'none', WebkitHyphens: 'none' } as React.CSSProperties}>
                                {composerOriginal(ligne, original.notes)}
                              </span>
                            ))}
                          </div>
                        ) : (
                        // En « Latin/Grec seul », l'original occupe seul la colonne, au gabarit du
                        // français (mêmes taille et teinte). La langue de l'original commande la
                        // césure (latine ou grecque) et l'attribut `lang` : un texte grec composé
                        // avec le syllabateur latin coupait faux et se déclarait à tort « la ».
                        <p lang={codeLangue(oeuvre.langue_originale)} className="texte-original" {...marqueOriginal} style={styleColonneOriginale({ surface: 'lecture', seul: afficherOriginalSeul, grec: estGrec })}>
                          {composerOriginal(original.affichage, original.notes)}
                        </p>
                        )
                      )}
                    </div>
                    )
                  })}
                </div>
              )
            })}
            </>)
          })()}

          {/* Navigation de pages — bas de page */}
          {vue === 'texte' && !modeComparaisonActif && pages.length > 1 && (
            <NavPages pages={pages} pageActuelle={pageActuelle} setPageActuelle={changerPage} bas />
          )}

          {/* Vue apparat critique */}
          {/* ⛔ Les titres de l'apparat se centrent sur le MÊME axe que ceux du texte suivi.
              Ils ne le faisaient pas : du temps de la gouttière d'actions, le frontispice, le
              fleuron, les titres de rang 1 et 2 du texte et les paragraphes de l'apparat
              lui-même retranchaient 60px à droite avant de centrer, et ces deux titres-là
              étaient les seuls à l'ignorer. La gouttière est retirée (voir `largeurLecture`) :
              l'axe est celui du bloc, et il n'y en a plus qu'un pour tout le monde. Ce qui
              reste vrai, c'est qu'un titre d'apparat se centre comme le titre de même rang
              posé au-dessus de lui, dans le texte.

              ⛔ Ils s'écrivent aussi dans la même ENCRE, `--cs-encre`, qui tire sur le vert.
              Ils portaient `--cs-texte-fort` au rang 1 et `--cs-texte` au rang 2, deux noirs
              neutres : trois encres différentes se partageaient donc les titres d'une même
              œuvre selon la vue où on les lisait, alors qu'un apparat critique n'est pas un
              autre livre. Un titre de rang 1 doit se reconnaître comme tel des deux côtés. */}
          {vue === 'apparat' && (() => {
            let dniv1 = '', dniv2 = ''
            let dsection: string | null = null
            let isFirst = true
            // ⚠️ Deux mains dans la même vue, ou une seule ? L'en-tête ne se pose que
            // s'il DISTINGUE : la plupart des dix textes qui portent un apparat d'éditeur
            // n'ont aucune pièce de l'auteur, et un titre seul y nommerait une opposition
            // que le lecteur ne peut pas voir.
            const deuxMains = new Set(groupesApparat.map(g => g.section ?? 'editeur')).size > 1
            // Un segment d'apparat EN LIGNE, le même dans un paragraphe et dans une entrée de
            // bibliographie : même repère, mêmes gestes, même notice.
            const segmentDApparat = (sid: number, i: number) => {
              const s = segMapApparat.get(sid)
              if (!s) return null
              const actif = segActif === sid
              // Un segment qui cite un OUVRAGE se compose depuis la base, par le
              // moteur bibliographique ; son texte n'est plus que la projection de
              // secours, servie si la notice n'a pu être lue (charte § 47.1).
              const notice = s.ouvrageId != null ? noticesBibliographiques[s.ouvrageId] : undefined
              return (
                <Fragment key={sid}>
                  {i > 0 ? liantAvantSegment(s.joinBefore) : null}
                  <span id={`segment-${sid}`} className={`seg-inline${actif ? ' seg-inline--actif' : ''}`} style={{ scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)` }}
                    onClick={(e) => tapSegmentParagraphe(e.currentTarget as HTMLElement, sid, actif)}
                    {...clavierSegment(sid, actif)}
                    onMouseEnter={mobile ? undefined : (e) => positionnerToolbar(e.currentTarget as HTMLElement, sid)}
                    onMouseLeave={mobile ? undefined : () => masquerToolbar(sid)}>
                    {configNiveaux.afficherNumeros && <sup style={STYLE_NUMERO_SEGMENT}>{s.numero}</sup>}
                    {notice
                      ? <ReferenceBibliographique notice={notice} />
                      : rendreTexteAvecNotes(composerCorps(preparerTexteSegment(s.texteAffichage ?? s.texte)), s.notes ?? {})}
                  </span>
                </Fragment>
              )
            }
            const estBibliographique = (bloc: { ids: number[] } | undefined) =>
              bloc !== undefined && estBlocBibliographique(bloc.ids.map(sid => segMapApparat.get(sid)))
            // L'ouvrage que le TRI lit dans un bloc d'entrée : sa notice quand un segment
            // porte un `ouvrage_id`, sinon la LIGNE elle-même — un renvoi (« Xénophane, voir
            // Ammien Marcellin ») se classe à sa propre vedette, comme dans un index.
            // ⚠️ `rang` est le rang MATÉRIEL du bloc, dernier recours du tri : c'est lui qui
            // garde aux douze traductions de Boèce l'ordre des siècles.
            const ouvrageDuBloc = (bloc: { ids: number[] }, rang: number): OuvrageBibliographique => {
              const notice = bloc.ids
                .map(sid => segMapApparat.get(sid)?.ouvrageId)
                .map(id => (id != null ? noticesBibliographiques[id] : undefined))
                .find(Boolean)
              if (notice) return ouvrageDeLaNotice(notice, rang)
              const ligne = bloc.ids.map(sid => segMapApparat.get(sid)?.texte ?? '').join(' ')
              return { id: -rang - 1, ordre: rang, titre: ligne, sousTitre: null, lieu: null, editeur: null, annee: null, auteur: null }
            }
            return (
              <>
                {groupesApparat.map((groupe) => {
                  const showNiv1 = groupe.niv1 && groupe.niv1 !== dniv1
                  if (showNiv1) { dniv1 = groupe.niv1; dniv2 = '' }
                  const showNiv2 = groupe.niv2 && groupe.niv2 !== dniv2
                  if (showNiv2) dniv2 = groupe.niv2
                  const notesTitre = notesDuTitre(
                    [groupe.niv1, groupe.niv1_texte, groupe.niv2, groupe.niv2_texte],
                    segMapApparat.get(groupe.itemIds[0])?.notes,
                  )
                  // Même règle que dans le texte suivi, pour le complément comme pour
                  // les appels de note que le titre RENDU porte.
                  const rendu = (champ: ChampTitre, brut: string) => titreComposeDe(titresComposes, champ, groupe) ?? groupe.titresAffichage?.[champ] ?? brut
                  const sousTitre1 = complementDeTitre(groupe.niv1, groupe.niv1_texte)
                  const sousTitre2 = complementDeTitre(groupe.niv2, groupe.niv2_texte)
                  // La MAIN change-t-elle ici ? L'apparat de l'auteur ouvre la vue, celui
                  // de l'éditeur suit, et la coupure se voit une fois, à la frontière.
                  const section = groupe.section ?? 'editeur'
                  const ouvreLaSection = deuxMains && section !== dsection
                  if (ouvreLaSection) dsection = section
                  // Même valeur qu'au niveau 1 du texte suivi : l'apparat prenait 2,5rem
                  // quand le texte en prend 2,8, écart que rien ne justifiait.
                  // ⚠️ Un en-tête de section porte DÉJÀ son blanc : le titre qui le suit
                  // n'y ajoute rien, sans quoi la coupure et le titre s'éloigneraient
                  // l'un de l'autre au point de ne plus se répondre.
                  const premierGroupe = isFirst
                  const marginTop = premierGroupe || ouvreLaSection ? '0' : '2.8rem'
                  if (isFirst) isFirst = false
                  return (
                    <div key={groupe.anchor} id={groupe.anchor} style={{ scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)` }}>
                      {ouvreLaSection && (
                        <div style={styleEnteteSectionApparat({ premiere: premierGroupe })}>
                          {LIBELLE_SECTION_APPARAT[section as keyof typeof LIBELLE_SECTION_APPARAT]}
                        </div>
                      )}
                      {showNiv1 && (
                        // Mise en page reprise TELLE QUELLE du niveau 1 du texte suivi : le
                        // centrage porté par le bloc et non par chaque ligne, un demi-rem de
                        // respiration en tête, et surtout 1,5rem sous le titre au lieu de 0,5.
                        // Ce demi-rem collait « Avis au lecteur » à son premier paragraphe,
                        // alors que le même titre, dans le texte, en est détaché de trois fois
                        // plus. Un titre a besoin d'un blanc au moins égal à son propre corps
                        // pour cesser de faire partie de ce qui le suit.
                        <div style={{ textAlign: 'center', marginTop, marginBottom: '1.5rem', paddingTop: '0.5rem', position: 'relative' }}>
                          <h2 style={styleTitreNiveau(1)}>{rendreTitreColophonAvecNotes(rendu('niv1', groupe.niv1), notesTitre, 'titre')}</h2>
                          {sousTitre1 && <p style={styleSousTitreNiveau(1)}>{rendreTitreColophonAvecNotes(rendu('niv1_texte', sousTitre1), notesTitre)}</p>}
                          {estAdmin && (
                            <button onClick={() => setEditionCible(cibleTitre(1, groupe, true, groupe.niv1_texte || groupe.niv1))}
                              title="Modifier ce titre (admin)" style={{ position: 'absolute', right: 0, top: 0, fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}><IconeCrayon size={12} /></button>
                          )}
                        </div>
                      )}
                      {showNiv2 && (
                        <div style={{ margin: showNiv1 ? '1rem 0 0.6rem' : '2rem 0 0.6rem', textAlign: 'center' }}>
                          <h3 style={styleTitreNiveau(2)}>{rendreTitreColophonAvecNotes(rendu('niv2', groupe.niv2), notesTitre, 'titre')}</h3>
                          {sousTitre2 && <p style={styleSousTitreNiveau(2)}>{rendreTitreColophonAvecNotes(rendu('niv2_texte', sousTitre2), notesTitre)}</p>}
                        </div>
                      )}
                      {paragraphesDe(groupe.itemIds, segMapApparat).map((chunk, iChunk, chunks) => {
                        // ⛔ Une BIBLIOGRAPHIE que la donnée déclare (charte § 47.2) se compose
                        // dans la famille commune : une liste, le retrait suspendu, un cran sous
                        // le corps, au fer. Elle sortait en paragraphes de lecture justifiés
                        // jusqu'au 11 septembre 2026. La liste se pose d'un tenant au rang de sa
                        // PREMIÈRE entrée ; les suivantes y sont déjà.
                        if (estBibliographique(chunk)) {
                          if (estBibliographique(chunks[iChunk - 1])) return null
                          const fin = chunks.findIndex((bloc, j) => j > iChunk && !estBibliographique(bloc))
                          // ⛔ L'ORDRE D'UNE BIBLIOGRAPHIE SE CALCULE (charte § 47.3) : la vedette,
                          // puis, à vedette égale, l'ordre du volume. La liste de Mirandol gardait
                          // ici son ordre matériel jusqu'au 12 septembre 2026. ⛔ Les rangs
                          // documentaires ne bougent pas : c'est l'AFFICHAGE qui range.
                          const entrees = chunks.slice(iChunk, fin === -1 ? chunks.length : fin)
                            .map((bloc, rang) => ({ bloc, ouvrage: ouvrageDuBloc(bloc, rang) }))
                            .sort((a, b) => comparerOuvragesDUnVolume(a.ouvrage, b.ouvrage))
                            .map(({ bloc }) => bloc)
                          return (
                            <div key={`apparat-biblio-${chunk.ids[0]}`} lang={langueCorps} style={styleHoteBibliographieApparat()}>
                              <div className={CLASSES_BIBLIOGRAPHIE.bloc}>
                                <ul className={CLASSES_BIBLIOGRAPHIE.liste}>
                                  {entrees.map(entree => (
                                    <li key={entree.ids[0]} className={CLASSES_BIBLIOGRAPHIE.entree}>
                                      {entree.ids.map(segmentDApparat)}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )
                        }
                        // ⛔ L'APPARAT compose ses vers comme la lecture les siens.
                        // La nature y vaut `apparat_critique` — c'est par là que le
                        // segment est SÉLECTIONNÉ — et elle ne peut pas dire en plus
                        // que le passage est en vers : c'est `segment_metadata.forme`
                        // qui le déclare, et c'est la SEULE écriture depuis le 29 août
                        // 2026, dans le corps comme dans l'apparat.
                        const versApparat = estBlocDeVers(chunk.ids.map(sid => segMapApparat.get(sid)))
                        if (versApparat) {
                          const rangs = ombreDeLettrine(niveauxAlinea(chunk.ids.map(sid => segMapApparat.get(sid)?.alinea)))
                          return (
                            <div key={`apparat-vers-${chunk.ids[0]}`} lang={langueCorps} style={styleBlocDeVers()}>
                              {chunk.ids.map((sid, i) => {
                                const s = segMapApparat.get(sid)
                                if (!s) return null
                                const actif = segActif === sid
                                const strophe = ouvreStrophe(
                                  { strophe_avant: s.stropheAvant, paragraphe: s.paragraphe },
                                  i > 0 ? segMapApparat.get(chunk.ids[i - 1]) : undefined,
                                )
                                return (
                                  <span key={sid} style={styleLigneDeVers({ rang: rangs[i], ouvreStrophe: strophe })}>
                                    <span id={`segment-${sid}`} className={`seg-inline${actif ? ' seg-inline--actif' : ''}`} style={{ scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)` }}
                                      onClick={(e) => tapSegmentParagraphe(e.currentTarget as HTMLElement, sid, actif)}
                                      {...clavierSegment(sid, actif)}
                                      onMouseEnter={mobile ? undefined : (e) => positionnerToolbar(e.currentTarget as HTMLElement, sid)}
                                      onMouseLeave={mobile ? undefined : () => masquerToolbar(sid)}>
                                      {rendreTexteAvecNotes(composerCorps(preparerTexteSegment(s.texteAffichage ?? s.texte)), s.notes ?? {})}
                                    </span>
                                  </span>
                                )
                              })}
                            </div>
                          )
                        }
                        // Bloc de SIGNATURES : au fer à droite, interligne resserré, blanc
                        // réduit entre lignes de même nature. ⛔ Onze des dix-huit signatures
                        // du corpus vivent ici — approbations, censeurs, privilèges ; les sept
                        // autres ferment leur pièce dans le CORPS, qui les compose de même.
                        // ⛔ Et le blanc qui la SUIT se juge sur le bloc suivant : 0,3 rem
                        // entre deux signatures, qui sont une liste ; une ligne de prose
                        // entière quand la pièce reprend — sans quoi « Signé Du Bray. » se
                        // colle à l'acte qui vient après.
                        const toutSignature = estBlocDeSignatures(chunk.ids.map(sid => segMapApparat.get(sid)?.nature))
                        const signatureSuit = estBlocDeSignatures(
                          (chunks[iChunk + 1]?.ids ?? []).map(sid => segMapApparat.get(sid)?.nature),
                        )
                        // ⛔ L'EXERGUE compose ici AUSSI. Aucun n'y vit au 8 septembre 2026 —
                        // les trente-huit des Catéchèses portent tous `espace_textuel = corps` —
                        // mais la signature a été rendue sur la seule surface où sa donnée ne
                        // va jamais, et la forme y est restée morte jusqu'au 6 septembre 2026.
                        const toutExergue = estBlocExergue(chunk.ids.map(sid => segMapApparat.get(sid)?.nature))
                        const exergueSuit = estBlocExergue(
                          (chunks[iChunk + 1]?.ids ?? []).map(sid => segMapApparat.get(sid)?.nature),
                        )
                        return (
                        <div key={`apparat-para-${chunk.ids[0]}`}>
                          <p lang={langueCorps} style={styleParagrapheApparat({ signature: placeDeLaSignature(toutSignature, signatureSuit), exergue: placeDeLExergue(toutExergue, exergueSuit) })}>
                            {chunk.ids.map(segmentDApparat)}
                          </p>
                        </div>
                        )
                      })}
                    </div>
                  )
                })}
              </>
            )
          })()}
        </div></main>
        {/* La réponse au clic, comme sur la Bible : un anneau au centre du bloc de
            texte tant qu'un autre texte (`navigation`) ou une autre division
            (`niv1Loading`) se prépare. Il ne paraît qu'au bout de 160 ms. */}
        <MarqueAttente enAttente={navigation || niv1Loading} />
        </div>

        {/* ── PANNEAU DROIT ── */}
        {mobile && (
          <BarreVoletMobile cote="bas" ouvert={panneauOuvert} libelle={libelleBarreVolet} refBouton={barreBibleRef}
            titre={panneauOuvert ? 'Fermer les références et commentaires' : 'Ouvrir les références et commentaires'}
            onBasculer={() => setPanneauOuvert(o => !o)} />
        )}
        {panneauOuvert ? (
        <>
        {/* Mobile : tiroir montant du bas, par-dessus le texte. */}
        {mobile && <div onClick={() => setPanneauOuvert(false)} style={{ position: 'fixed', inset: 0, background: 'var(--cs-calque-modale)', zIndex: Z_TIROIR_VOILE }} />}
        <aside ref={refAside} id={idVoletDroit} data-visite="oeuvre-bible" aria-label="Références et commentaires"
          role={tiroirReferences ? 'dialog' : undefined} aria-modal={tiroirReferences || undefined}
          style={mobile ? {
          position: 'fixed', bottom: HAUTEUR_BARRE_VOLET, left: 0, right: 0, zIndex: Z_TIROIR, maxHeight: `calc(100dvh - ${HAUTEUR_NAVBAR} - ${HAUTEUR_BARRE_VOLET} - 2rem)`, borderTop: '1px solid var(--cs-bord)', display: 'flex', flexDirection: 'column', background: 'var(--cs-surface)', boxShadow: 'var(--cs-ombre-modale-haut)',
        } : { width: pannWidth == null ? 'clamp(280px, 21vw, 480px)' : pannWidth + 'px', flexShrink: 0, position: 'sticky', top: HAUTEUR_NAVBAR, alignSelf: 'flex-start', height: HAUTEUR_SOUS_NAVBAR, borderLeft: '1px solid var(--cs-bord)', display: 'flex', flexDirection: 'column', background: 'var(--cs-surface)' }}>
          {!mobile && <div {...poigneeDroite} title="Glisser pour redimensionner"
            style={{ position: 'absolute', left: '-4px', top: 0, bottom: 0, width: '9px', cursor: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%235f574b%27 stroke-width=%271.7%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M8 7L3 12l5 5%27/%3E%3Cpath d=%27M3 12h18%27/%3E%3Cpath d=%27M16 7l5 5-5 5%27/%3E%3C/svg%3E") 12 12, ew-resize', zIndex: 10 }}
            className="cs-poignee-volet cs-poignee-volet--gauche"
          />}

          {/* ⛔ LA BARRE EST LE MODÈLE DU SITE, non une huitième barre recomposée.
              Elle était écrite en styles en ligne — filet posé à la main, trait vert de
              deux pixels, graisse qui change avec l'état, donc des libellés qui se
              DÉPLACENT au premier clic. `OngletsPage` réserve la largeur d'avance
              (`data-libelle`), et l'en-tête du composant partagé proscrit la recopie
              depuis sa création. ⚠️ La variante `cs-onglets--volet` est celle du volet
              de la Bible : le modèle est dessiné pour une page de 46 rem, et un volet
              n'en fait pas le quart. Elle retire aussi le séparateur, qui entre deux mots
              dans une colonne étroite se voit avant les mots qu'il sépare. */}
          <div style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'stretch' }}>
            {/* ⛔ ELLE NE PARAÎT PLUS SUR TÉLÉPHONE : elle y regardait à DROITE, vers un
                rail de BUREAU qui n’existe pas là. C’est la barre du bas qui ferme. */}
            {!mobile && <button ref={refChevronDroit} onClick={() => setPanneauOuvert(false)} title="Réduire le volet" aria-label="Réduire le volet"
              aria-expanded={true} aria-controls={idVoletDroit}
              /* ⛔ `.cs-volet-reduire` porte l'encre et le survol vert du chevron, comme sur la
                 page Bible : une couleur posée en ligne battrait la règle de survol. */
              className="cs-volet-reduire"
              style={{ position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 1, minWidth: '24px', padding: '0 6px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconeChevron dir="right" taille="0.875rem" strokeWidth={1.5} />
            </button>}
            <OngletsPage
              className="cs-onglets--volet"
              style={{ flex: 1, minWidth: 0 }}
              intitule="Ce que montre le volet"
              onglets={ongletsDuVolet.map(cle => ({ cle, libelle: LIBELLE_ONGLET_VOLET[cle] }))}
              actif={ongletDroit}
              choisir={setOngletDroit}
              idPanneau={idPanneauDroit}
              idOnglet={idOngletDroit}
            />
          </div>

          {/* ⚠️ `scrollbar-gutter: stable`, comme le défileur du volet des Pères : un contenu
              plus court fait disparaître la barre, et tout le volet sautait de quinze pixels. */}
          <div id={idPanneauDroit} role="tabpanel" aria-labelledby={idOngletDroit(ongletDroit)} style={ongletDroit === 'refs'
            ? { flex: 1, overflowY: 'auto', padding: '0 12px 16px', display: 'flex', flexDirection: 'column', ...(mobile ? {} : { scrollbarGutter: 'stable' }) }
            : { flex: 1, minHeight: 0, overflow: 'hidden', padding: '0 12px', display: 'flex', flexDirection: 'column' }}>
            {ongletDroit === 'refs' ? (
              <>
                {/* Sélecteur traduction */}
                <div ref={tradSelectRef} style={{ padding: '10px 0 8px', borderBottom: '1px solid var(--cs-fond-doux)', marginBottom: '10px', position: 'relative' }}>
                  {/* ⛔ PLUS D'ÉTIQUETTE « TRADUCTION » AU-DESSUS DU MENU (décision de l'auteur,
                      2026-09-15) : le bouton nomme la bible qu'on lit. Son nom accessible
                      reprend ce libellé visible en tête, puis dit le geste (WCAG 2.5.3).
                      ⛔ LE BOUTON RESTE CELUI DU VOLET, LA LISTE EST CELLE DE LA PAGE BIBLE
                      (même décision : « reprendre le menu de la page Bible classique, mise en
                      forme intérieure, quand on a cliqué ; pas le bouton lui-même ») :
                      `ListeMenuBibles`, que `SelecteurTraductionBible` ouvre aussi.
                      ⛔ ET LA LISTE PORTE MAINTENANT LES MÊMES BIBLES QUE CETTE PAGE-LÀ
                      (2026-09-16) : les familles s'y replient sous leur nom commun, et leur
                      sous-menu décline les langues et les graphies d'un même témoin. Ce sont
                      les entrées qui ont changé, non le composant : il regroupait déjà, mais
                      le volet ne lui donnait que des bibles sans famille.
                      ⛔ ET LE SOUS-MENU S'OUVRE À GAUCHE, VERS LE TEXTE, son chevron en tête de
                      ligne (décision de l'auteur, 2026-09-16) : le volet borde l'écran à droite.
                      Il vit dans un portail, parce que ce défileur rognait tout ce qui sortait du
                      volet, et le sous-menu paraissait passer SOUS le bloc central. */}
                  <button ref={tradBoutonRef} type="button" onClick={() => setTradOuverte(o => !o)}
                    aria-haspopup="menu" aria-expanded={tradOuverte} aria-controls={tradOuverte ? idMenuTraductions : undefined}
                    aria-label={`${lecture.label}, choisir la traduction biblique`}
                    title="Choisir la traduction biblique"
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', width: '100%', padding: '5px 10px', borderRadius: '4px', border: `1px solid ${tradOuverte ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: 'var(--cs-surface)', fontSize: '0.6875rem', color: 'var(--cs-encre)', cursor: 'pointer', transition: 'border-color var(--cs-duree-courte)' }}>
                    <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{rendreEnrichi(lecture.label)}</span>
                    <span aria-hidden="true" style={{ display: 'flex', flexShrink: 0, color: 'var(--cs-texte-doux)', transform: tradOuverte ? 'rotate(180deg)' : 'none', transition: 'transform var(--cs-duree-courte)' }}><IconeChevron dir="down" taille="0.6rem" strokeWidth={2.2} /></span>
                  </button>
                  {tradOuverte && (
                    <ListeMenuBibles id={idMenuTraductions} libelle="Traductions bibliques"
                      traductions={lecturesBible} traductionIndex={tradIndex}
                      choisir={choisirTraduction} fermer={fermerMenuTraductions} cadre={tradSelectRef} cote="gauche"
                      style={{ position: 'absolute', top: 'calc(100% - 4px)', left: 0, right: 0, zIndex: 50 }} />
                  )}
                </div>

                {/* Références du segment actif.
                    ⚠️ Le bloc se REMONTE à chaque segment (`key`) et paraît en fondu : ce
                    qu'on quitte s'en va d'un coup, ce qui arrive se pose doucement.
                    ⛔ Aucune marque d'attente ici, et il n'en faut pas : les liens bibliques
                    d'un segment sont chargés avec sa tranche de texte, donc déjà en mémoire
                    quand on clique. Le volet de la page Bible, lui, va les chercher. */}
                <div key={segActif ?? 'aucun'} className="cs-volet-echange"
                  style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column' }}>
                {segActifData ? (
                  <>
                    {segActifData.versets.length === 0 ? (
                      <EtatVideVolet>
                        {/* L'absence se dit, puis un fleuron la ferme (demande de l'auteur, 21 septembre
                            2026 : les gravures d'état vide cèdent aux fleurons du registre). Même composition
                            que « Aucune occurrence. » : au MILIEU de la zone, la mention au-dessus. Voir
                            `FleuronDiscret`, qui dit quel fleuron ferme quel vide. */}
                        <MentionVide>Aucun lien biblique pour ce passage.</MentionVide>
                        <FleuronDiscret vide="liensBibliques" />
                      </EtatVideVolet>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {regrouperVersetsConsecutifs(ordonnerAuCanon(segActifData.versets)).map(groupe => {
                          const premier = groupe[0]
                          const dernier = groupe[groupe.length - 1]
                          const multiple = groupe.length > 1
                          // Versets réunis : label en fourchette (« Genèse 1, 1-3 ») et corps mis à la suite.
                          const labelGroupe = multiple
                            ? `${premier.label.replace(/\d+\s*$/, '')}${premier.verset}-${dernier.verset}`
                            : premier.label
                          // Le verset est montré SEUL, hors de son contexte, et hérite donc d'une
                          // ponctuation qui désigne un texte absent. Deux remèdes, de sens opposé.
                          //
                          // Le guillemet orphelin s'AJOUTE : une citation qui court sur plusieurs
                          // versets se borne des deux côtés (app/lib/guillemets.ts), car on sait de
                          // quel côté manque le signe. Le tiret d'incise, lui, se RETRANCHE quand il
                          // touche un bord (app/lib/tirets.ts) : il sépare l'extrait de ce qu'on ne
                          // montre pas, et on ne va pas inventer le segment auquel il renvoie.
                          //
                          // Les deux se font APRÈS la fusion du groupe, qui peut s'équilibrer de
                          // lui-même ; et les tirets d'abord, sans quoi le bornage viendrait poser
                          // son guillemet derrière un tiret qui doit partir.
                          //
                          // ⚠️ Le texte vient de `texteDeLaLecture`, non de la seule table des
                          // versets cités : la bible choisie peut vivre ailleurs que dans la vue
                          // large, et c'est là qu'on va la chercher.
                          const textesDuGroupe = groupe.map(v => texteDeLaLecture(v))
                          const corps = bornerGuillemets(effacerTiretsDeBordure(textesDuGroupe
                            .map(t => extraireNoteVerset(t).corps)
                            .filter(Boolean)
                            .join(' ')))
                          // La note éditoriale n'est portée que par un verset seul (sinon on fond
                          // simplement les corps).
                          const note = multiple ? null : extraireNoteVerset(textesDuGroupe[0] ?? '').note
                          // Objet synthétique pour les actions (copie/enregistrement) sur le groupe :
                          // textes fondus par traduction, label en fourchette.
                          // ⚠️ La traduction LUE y est réécrite avec ce qui est à l'écran : un
                          // verset prélevé dans Fillion doit se retrouver en Fillion dans les
                          // prélèvements, et non dans la bible que la vue large portait sous le
                          // même code (`BoutonEnregistrerVerset` lit `textes[trad]`).
                          const versetAction: any = multiple
                            ? { ...premier, label: labelGroupe, textes: { ...Object.fromEntries(Object.keys(premier.textes).map(code => [code, groupe.map(v => (v.textes as any)[code] || '').filter(Boolean).join(' ')])), [trad]: textesDuGroupe.filter(Boolean).join(' ') } }
                            : { ...premier, textes: { ...premier.textes, [trad]: textesDuGroupe[0] ?? '' } }
                          const key = groupe.map(v => v.id).join('_')
                          return (
                            // ⛔ La case prend la forme de celle du volet des Pères (`carteVolet.ts`) :
                            // fond au survol, actions au survol seulement, un filet entre deux cases.
                            <div key={key} className={CLASSE_CARTE_VOLET} style={STYLE_CARTE_VOLET}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: note ? '2px' : '6px' }}>
                                {/* ⚠️ Ligne de BASE, non milieu : le lien et « Supprimer le lien » n'ont pas le même corps,
                                    et centrés sur leur boîte ils ne tombaient pas sur la même ligne. */}
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minWidth: 0 }}>
                                  {/* ⚠️ La graphie part AVEC l'adresse : on ouvre la page Bible sur
                                      le texte qu'on avait sous les yeux, et non sur un autre état du
                                      même témoin. La page Bible la normalise contre les graphies
                                      qu'elle expose vraiment, et ne s'en trouble pas si elle ne la
                                      connaît pas (`normaliserCouche899`). */}
                                  <a href={`/?livre=${encodeURIComponent(premier.livre)}&chapitre=${encodeURIComponent(premier.chapitre)}&verset=${encodeURIComponent(premier.verset)}&trad=${encodeURIComponent(trad)}${lecture.couche ? `&couche=${encodeURIComponent(lecture.couche)}` : ''}`} target="_blank" rel="noopener noreferrer" className="ref-lien" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cs-vert)', margin: 0, textDecoration: 'none' }}>{labelGroupe}{/* Nouvel onglet dit à la synthèse vocale seulement : le pictogramme qui le montrait est retiré (décision de l'auteur, 2026-09-23). */}<span className="cs-hors-ecran"> (nouvel onglet)</span></a>
                                  {/* ⛔ La nature du rapport (citation, reprise…) ne s'affiche plus
                                      (décision de l'auteur, 21 septembre 2026), comme dans le volet
                                      des Pères. */}
                                  {estAdmin && (
                                    <button onClick={() => supprimerLiensBibliques(segActifData.id, groupe.map(v => v.id))} title="Supprimer ce lien biblique"
                                      style={{ fontSize: '0.6875rem', fontFamily: 'inherit', color: 'var(--cs-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 'inherit', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                      {multiple ? 'Supprimer les liens' : 'Supprimer le lien'}
                                    </button>
                                  )}
                                </div>
                                <div className={CLASSE_ACTIONS_CARTE_VOLET} style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                                  <BoutonEnregistrerVerset verset={versetAction} trad={trad} userId={userId} />
                                  <BoutonCopieVerset texte={corps} label={labelGroupe} />
                                  <BoutonSignalerVerset versetId={premier.id} label={labelGroupe} texte={corps} segmentId={segActifData.id} />
                                </div>
                              </div>
                              {note && (
                                <p style={{ fontSize: '0.6875rem', fontStyle: 'italic', color: 'var(--cs-etiquette)', margin: '0 0 3px', lineHeight: 1.3 }}>
                                  ↳ {note}
                                </p>
                              )}
                              {/* Texte du/des verset(s) réuni(s) : SANS SÉRIF, même mise en forme que les
                                  citations patristiques du panneau Bible — justifié, wordSpacing serré,
                                  césure. Enrichissement (« <i> » de Sacy) rendu. */}
                              <p lang="fr" style={{ fontSize: CORPS_CARTE_VOLET, lineHeight: INTERLIGNE_CARTE_VOLET, color: 'var(--cs-texte-fort)', textAlign: 'justify', textJustify: 'inter-word', wordSpacing: '-0.08em', hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word', margin: '0 0 1px' } as React.CSSProperties}>
                                {corps ? rendreTexteEnrichi(corps) : '—'}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <EtatVideVolet>
                    {/* ⛔ PLUS D'ARBRE ARDENT (décision de l'auteur, 2026-09-15 : « supprimer
                        l'arbre, garder centré »). L'invite reste seule, CENTRÉE dans la hauteur
                        que le volet laisse sous le sélecteur de traduction, comme « Aucune
                        occurrence » l'est dans le volet de la page Bible. La planche est rangée
                        au dépôt, en réserve (inventaire des illustrations).
                        ⚠️ Le centrage vertical demande une chaîne de colonnes flexibles : le
                        défileur de l'onglet et l'enveloppe du fondu en sont, et c'est la seule
                        raison pour laquelle ils le sont.
                        ⚠️ Son encre passe à `--cs-texte-second` : l'invite porte seule ce qu'elle
                        dit, et `--cs-texte-doux` restait sous le seuil de 4,5 sur le volet. */}
                    <MentionVide>Cliquez sur un paragraphe.</MentionVide>
                  </EtatVideVolet>
                )}
                </div>
              </>
            ) : (ongletDroit === 'notes' && estAdmin) ? (
              notesDuTextePretes ? (
                <OngletNotes
                  sources={sourcesNotes}
                  noteCourante={noteCourante}
                  onAller={allerALaNote}
                />
              ) : notesDuTexteEchec ? (
                <EtatVideVolet>
                  <MentionVide>Les notes n’ont pas pu être chargées.</MentionVide>
                </EtatVideVolet>
              ) : <MotAttente />
            ) : (
              <div style={{ flex: 1, minHeight: 0, paddingTop: '14px', display: 'flex', flexDirection: 'column' }}>
                <OngletCommentaires segActif={segActif} estAdmin={estAdmin} />
              </div>
            )}
          </div>

          {/* ⛔ LE GESTE QUI AJOUTE UN LIEN SE TIENT EN BAS DU VOLET (demande de l'auteur,
              2026-09-21), hors du défileur : il reste à la même place quelle que soit la
              longueur de la liste des versets, et ne se perd pas sous elle. Un filet le
              sépare de ce qu'il complète. */}
          {ongletDroit === 'refs' && segActifData && (estAdmin || userId) && (
            <div style={{ flexShrink: 0, minHeight: '2.75rem', boxSizing: 'border-box', borderTop: '1px solid var(--cs-fond-doux)', padding: '0.5rem 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              {estAdmin
                ? <AssocierVerset segId={segActifData.id} onAssocie={associerVersetLocal(segActifData.id)} />
                : <ProposerLienBiblique segId={segActifData.id} />}
            </div>
          )}

        </aside>
        </>
        ) : mobile ? null : (
          // ⚠️ Le libellé nomme l'ACTION et tient sur la bande : « Commentaires et
          // références bibliques » faisait trente-six signes dans une hauteur qui en porte
          // la moitié, et s'écrêtait donc sans qu'on sache où.
          <div style={{ position: 'sticky', top: HAUTEUR_NAVBAR, height: HAUTEUR_SOUS_NAVBAR, alignSelf: 'flex-start', flexShrink: 0, display: 'flex' }}>
            <RailVolet ref={refRailDroit} cote="droite" libelle="Ouvrir les références" onOuvrir={() => setPanneauOuvert(true)} />
          </div>
        )}
      </div>

      {/* L'indication que les segments nomment par `aria-describedby` : une seule par page. */}
      <span id={ID_AIDE_SEGMENT} className="cs-hors-ecran">{AIDE_SEGMENT}</span>

      <LassoLecture
        zone={mainRef}
        actif={lassoActif}
        contexte={`${idTexte}|${niv1Actif}|${pageActuelle}|${vue}|${modeTexteEffectif}`}
        selecteurCibles='.seg-inline[id^="segment-"], .seg-wrapper[id^="segment-"], [data-lasso-original]'
        cleDe={element => element.getAttribute('data-lasso-original')
          ?? (element.id.startsWith('segment-') ? element.id.slice('segment-'.length) : null)}
        surbrillance={cle => estCleOriginal(cle)
          ? `[data-lasso-original="${cle}"]`
          : `#segment-${cle}.seg-inline, #segment-${cle} > .seg-p, #segment-${cle} .citation-sortie`}
        horsLasso=".seg-p, .texte-original"
        refus={refusDuLasso}
        enregistrable={lassoEnregistrable}
        unite={UNITE_PASSAGES}
        dejaEnregistres={cles => segmentsDuLasso(cles).filter(s => sauvegardesSegs.has(s.id)).length}
        onEnregistrer={enregistrerLasso}
        onRetirer={retirerLasso}
        onCopier={copierLasso}
      />

      {/* La cellule d'actions du segment survolé ou retenu : lecture en paragraphes et
          arguments de tête. La position, le suivi au défilement et la fermeture au tap
          dehors vivent dans le composant partagé. */}
      {vue === 'texte' && (() => {
        const s = cellule.ancre ? segMap.get(cellule.ancre.cle) : null
        if (!cellule.ancre || !s) return null
        return (
          <CelluleActions
            ancre={cellule.ancre} onRetenir={cellule.retenir} onRelacher={cellule.relacher}
            onFermer={cellule.fermer} sansSurvol={sansSurvol} onQuitterFoyer={cellule.quitterFoyer}
            boutons={(userId ? 1 : 0) + 2 + (estAdmin ? 1 : 0)}>
            {userId && <BoutonEnregistrerSegment seg={s} auteur={auteur} titreOeuvre={oeuvre.titre} idOeuvre={idOeuvre} userId={userId} dejaSauvegarde={sauvegardesSegs.has(s.id)} onChangement={preleve => marquerSauvegardeSeg(s.id, preleve)} />}
            <BoutonCopieSegment texte={s.texte} auteur={auteur} titre={oeuvreAffichee.titre} sousTitre={oeuvreAffichee.sous_titre} tradAuteur={oeuvreAffichee.trad_auteur} editeur={oeuvreAffichee.editeur} collection={oeuvreAffichee.collection} ville={oeuvreAffichee.ville} datePublication={oeuvreAffichee.date_publication} responsable={versionActive?.responsableEdition ?? undefined} />
            <BoutonSignalerSegment segId={s.id} texteObjet={texteSansEnrichissement(s.texte)} titreOeuvre={oeuvre.titre} />
            {estAdmin && (
              <button onClick={() => setEditionCible({ type: 'segment', seg: s })} title="Modifier ce segment (admin)" aria-label="Modifier ce segment"
                style={{ ...BTN_STYLE, color: 'var(--cs-texte-doux)' }}><IconeCrayon size={12} /></button>
            )}
          </CelluleActions>
        )
      })()}


      {/* ⛔ EN LECTURE BILINGUE, LA FICHE PORTE LES DEUX ÉDITIONS (demande de l'auteur,
          2026-09-08). Elle n'en montrait qu'une — celle du texte « principal » —, si bien
          qu'on pouvait lire le latin de Knöll pendant qu'elle décrivait la traduction de
          Moreau, sans qu'un mot le dise. Les deux colonnes sont à l'écran : les deux
          doivent être à la fiche.
          ⚠️ Le premier volet est TOUJOURS celui qu'on lit — `versionActive` —, l'autre
          celui d'en regard : la fiche s'ouvre sur ce que le lecteur vient de cliquer.
          ⚠️ L'onglet prend la LANGUE pour nom, qui est ce qui sépare les deux colonnes et
          le mot que le menu « Mode de lecture » emploie déjà ; à défaut, le libellé court de
          l'édition. */}
      {infoEditionOuverte && (
        <FicheEdition
          volets={voletsFiche}
          onOuvrirAuteur={setAuteurModalId}
          onFermer={() => setInfoEditionOuverte(false)} />
      )}

      {/* ⛔ Le menu n'offre QUE les axes qui se posent : pas de division, pas d'étendue à
          choisir ; pas de colonne originale, pas de regard ; pas d'apparat, pas de case.
          Et il extrait l'édition qu'on LIT — le choix d'une édition se prend au volet. */}
      {extractionOuverte && (
        <MenuExtraction
          donnees={{
            idOeuvre,
            idTexte,
            edition: versionsTextuelles.length > 1 && versionActive ? libelleVersionComplet(versionActive) : null,
            division: niv1Actif && niv1Actif !== NIV1_LIMINAIRES ? niv1Actif : null,
            divisionLibelle: niv1Actif
              ? intituleDeNiveau1(niv1Actif, niv1TexteMap)
              : null,
            original: aTexteOriginal,
            apparat: tocApparat.length > 0 || segmentsApparat.length > 0,
            nbSignes: oeuvre.nb_signes ?? null,
          }}
          onFermer={() => setExtractionOuverte(false)} />
      )}

      {/* ⚠️ Le sujet, et rien de plus : la ligne se compose dans `app/lib/partage.ts`,
          et l'adresse partagée est celle qu'on lit, habits de lecture compris. */}
      {ancrePartage && (
        <BullePartage
          sujet={{ genre: 'oeuvre', titre: oeuvre.titre, auteur }}
          ancre={ancrePartage}
          onFermer={() => setAncrePartage(null)} />
      )}

      {/* Fiche auteur en fenêtre, ouverte depuis « À propos de cette édition ». */}
      <ModaleAuteur id={auteurModalId} onClose={() => setAuteurModalId(null)} />

      {/* La visite, en dernier : elle se rend dans un portail vers le corps du
          document, et son voile passe au-dessus de tout ce que la page porte. */}
      {visite > 0 && (
        <VisiteGuidee
          key={visite}
          visite={VISITE_OEUVRE}
          onScene={preparerScene}
          onFin={() => setVisite(0)}
        />
      )}

      {estAdmin && configOuverte && typeof document !== 'undefined' && createPortal(
        /* ⛔ Le voile part SOUS la barre de navigation, et sa mesure se compose sur
            HAUTEUR_NAVBAR. Il partait de `inset: 0`, donc du bord haut de la fenêtre,
            alors que la barre est `fixed` et porte un z-index de 3000 contre 1200 ici :
            l'en-tête de la fenêtre passait donc DERRIÈRE elle, et « Niveaux d'affichage »
            se lisait à moitié.

            ⛔ Et la carte se BORNE en hauteur, faute de quoi elle dépassait de l'écran par
            le bas sans que rien ne défile : sur une fenêtre courte, le pied — donc
            « Enregistrer » — devenait hors de portée, et le réglage ne pouvait plus être
            validé du tout. Trois étages désormais : en-tête et pied fixes, corps défilant
            entre les deux. C'est le pied qui devait rester visible, non le haut du texte.

            La largeur est en `min(25rem, 100%)` : elle suit la police racine, donc l'écran,
            et ne peut jamais dépasser la place disponible. */
        <div style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0, background: 'var(--cs-calque-modale)', zIndex: Z_MODALE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}
          onClick={() => setConfigOuverte(false)}>
          <div ref={boiteConfig} role="dialog" aria-modal="true" aria-label="Niveaux d’affichage"
            onClick={e => e.stopPropagation()} style={{ background: 'var(--cs-surface)', borderRadius: '12px', width: 'min(25rem, 100%)', maxHeight: `calc(100dvh - ${HAUTEUR_NAVBAR} - 2.5rem)`, display: 'flex', flexDirection: 'column', boxShadow: 'var(--cs-ombre-modale)' }}>
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 22px 12px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cs-vert)', margin: 0 }}>Niveaux d’affichage</p>
              <button onClick={() => setConfigOuverte(false)} aria-label="Fermer" className="cs-croix-fermer"><IconeCroix /></button>
            </div>
            {/* `minHeight: 0` est ce qui autorise un enfant de flexbox à devenir plus court
                que son contenu : sans lui, le corps refuse de rétrécir et la carte déborde
                de nouveau, le plafond de hauteur n'y faisant rien. */}
            <div className="cs-defilement-discret" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '0 22px' }}>
            {/* ⛔ La barre reprend le MODÈLE unique du site, à la mesure du volet : le
                modèle est dessiné pour une page de 46 rem, ce panneau en fait 25. On
                prend le modèle, on ne le redessine pas. */}
            <OngletsPage
              onglets={[{ cle: 'niveaux' as const, libelle: 'Niveaux' }, { cle: 'fleuron' as const, libelle: 'Fleuron' }]}
              actif={ongletConfig}
              choisir={setOngletConfig}
              intitule="Ce que règle ce panneau"
              className="cs-onglets--volet"
              style={{ marginBottom: '14px' }} />
            {ongletConfig === 'niveaux' && (<>
            <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', lineHeight: 1.5, margin: '0 0 16px' }}>
              Réglez la finesse des titres affichés, séparément pour le <strong style={{ color: 'var(--cs-texte-second)' }}>sommaire</strong> (colonne de gauche) et le <strong style={{ color: 'var(--cs-texte-second)' }}>corps</strong> du texte.
            </p>
            <div style={{ marginBottom: '14px', padding: '12px 14px', background: 'var(--cs-fond-clair)', borderRadius: '8px', border: '1px solid var(--cs-fond-doux)' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--cs-vert)', margin: '0 0 10px' }}>Mode de lecture</p>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                {[
                  { valeur: false, libelle: 'Par niveau 1' },
                  { valeur: true, libelle: 'Texte entier paginé' },
                ].map(option => (
                  <button key={option.libelle} onClick={() => setConfigNiveaux(prev => ({ ...prev, texteEntier: option.valeur }))}
                    style={{ flex: 1, minHeight: '34px', padding: '5px 8px', borderRadius: '4px', border: `1px solid ${configNiveaux.texteEntier === option.valeur ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: configNiveaux.texteEntier === option.valeur ? 'var(--cs-vert-aplat)' : 'var(--cs-surface)', color: configNiveaux.texteEntier === option.valeur ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-second)', fontSize: '0.6875rem', cursor: 'pointer', fontWeight: configNiveaux.texteEntier === option.valeur ? 700 : 400 }}>
                    {option.libelle}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', lineHeight: 1.45, margin: 0 }}>Le texte entier conserve ses titres et son sommaire. La pagination ne s’arrête plus à chaque niveau 1.</p>
            </div>
            {(['sommaire', 'corps'] as Surface[]).map(type => {
              const { profondeur: key, chapeaux: txtKey } = clesDeSurface(type)
              const titre = type === 'sommaire' ? 'Sommaire' : 'Corps du texte'
              return (
                <div key={type} style={{ marginBottom: '14px', padding: '12px 14px', background: 'var(--cs-fond-clair)', borderRadius: '8px', border: '1px solid var(--cs-fond-doux)' }}>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--cs-vert)', margin: '0 0 10px' }}>{titre}</p>

                  {/* ⛔ Le panneau n'offre que les niveaux que CETTE surface sait rendre :
                      trois pour le sommaire, quatre pour le corps. Il en proposait cinq
                      de chaque côté, dont aucun rendu ne s'occupe. */}
                  <label style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-second)', display: 'block', margin: '0 0 6px', fontWeight: 600 }}>Niveaux de titres affichés</label>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                    {niveauxOfferts(type).map(n => {
                      const choisi = configNiveaux[key] === n
                      // ⛔ UN NIVEAU VIDE SE GRISE ET NE SE CLIQUE PLUS. Deux gardes le
                      // rendent sûr : une sonde qui échoue rend « on ne sait pas », et
                      // rien n'est alors fermé ; et le niveau CHOISI n'est jamais dit
                      // vide — une œuvre mal réglée (Job, enregistré à 2 pour un seul
                      // niveau) reste donc corrigible.
                      const vide = niveauVide(profondeurExistante, n, choisi)
                      // ⚠️ L'infobulle est portée par l'ENVELOPPE, non par le bouton : un
                      // bouton désactivé ne reçoit aucun événement de pointeur sous Chrome,
                      // et la raison du verrou se serait posée sur le seul élément incapable
                      // de la dire.
                      return (
                        <span key={n} style={{ display: 'flex' }}
                          title={vide ? `Le niveau ${n} ne porte aucun titre dans cette œuvre` : `Afficher jusqu’au niveau ${n}`}>
                          <button disabled={vide}
                            onClick={() => setConfigNiveaux(prev => poserProfondeur(prev, type, n))}
                            style={{ width: '34px', height: '30px', borderRadius: '4px', border: `1px solid ${choisi ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: choisi ? 'var(--cs-vert-aplat)' : 'var(--cs-surface)', color: choisi ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-second)', fontSize: '0.75rem', cursor: vide ? 'default' : 'pointer', fontWeight: choisi ? 700 : 400, opacity: vide ? 0.4 : 1 }}>
                            {n}
                          </button>
                        </span>
                      )
                    })}
                  </div>

                  {/* ⛔ Un chapeau au-dessus du niveau affiché ne rend RIEN : il se montre
                      donc ÉTEINT, et non vert-et-grisé — c'est-à-dire coché sans qu'on
                      puisse le décocher. Baisser le niveau l'éteint pour de bon
                      (`poserProfondeur`), si bien que la donnée dit ce que l'écran dit. */}
                  <label style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-second)', display: 'block', margin: '0 0 6px', fontWeight: 600 }}>Chapeaux descriptifs</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {niveauxOfferts(type).map(n => {
                      const disponible = n <= configNiveaux[key]
                      const actif = disponible && configNiveaux[txtKey][n - 1]
                      return (
                        <button key={n} disabled={!disponible}
                          onClick={() => setConfigNiveaux(prev => basculerChapeau(prev, type, n))}
                          title={disponible ? `Chapeau du niveau ${n}` : `Le niveau ${n} n’est pas affiché`}
                          style={{ width: '34px', height: '30px', borderRadius: '4px', border: `1px solid ${actif ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: actif ? 'var(--cs-vert-aplat)' : 'var(--cs-surface)', color: actif ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-gris)', fontSize: '0.6875rem', cursor: disponible ? 'pointer' : 'default', opacity: disponible ? 1 : 0.4 }}>
                          N{n}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ ...STYLE_RUBRIQUE, margin: 0 }}>Numéros de segments</p>
              <button onClick={() => setConfigNiveaux(prev => ({ ...prev, afficherNumeros: !prev.afficherNumeros }))}
                style={{ fontSize: '0.6875rem', padding: '4px 12px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: configNiveaux.afficherNumeros ? 'var(--cs-vert-aplat)' : 'var(--cs-surface)', color: configNiveaux.afficherNumeros ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-gris)', cursor: 'pointer' }}>
                {configNiveaux.afficherNumeros ? 'Affichés' : 'Masqués'}
              </button>
            </div>
            </>)}
            {ongletConfig === 'fleuron' && (<>
            <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', lineHeight: 1.5, margin: '0 0 16px' }}>
              L’ornement qui sépare la page de titre du texte, pour <strong style={{ color: 'var(--cs-texte-second)' }}>cette œuvre</strong>. Sans choix, elle porte le fleuron du site.
            </p>
            {/* ⚠️ Chaque ornement paraît À SA POSE, non à une hauteur commune : c'est ce
                que la page en fera, et une galerie qui les mettrait tous à la même taille
                mentirait sur ce qu'on choisit. La case est haute de la plus grande d'entre
                elles. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '16px' }}>
              {[null, ...FLEURONS.map(f => f.cle)].map(cle => {
                const choisi = fleuronChoisi === cle
                const duSite = cle === null
                const nom = duSite ? 'Du site' : (FLEURONS.find(f => f.cle === cle)?.nom ?? cle)
                return (
                  <button key={cle ?? '__site'} onClick={() => setFleuronChoisi(cle)}
                    title={duSite ? `Le fleuron du site : ${fleuronDe(FLEURON_DU_SITE).nom}` : nom}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', minHeight: '92px', padding: '8px 4px 6px', borderRadius: '4px', border: `1px solid ${choisi ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, boxShadow: choisi ? 'inset 0 0 0 1px var(--cs-vert)' : 'none', background: 'var(--cs-surface)', cursor: 'pointer' }}>
                    {/* ⛔ Pas d'aplat vert sous la case retenue : l'ornement est une encre
                        grise, et il s'y perdrait. C'est le CADRE qui dit le choix. */}
                    <span style={{ display: 'flex', flex: '1 1 auto', alignItems: 'center' }}>
                      <Fleuron cle={duSite ? FLEURON_DU_SITE : cle} />
                    </span>
                    <span style={{ fontSize: '0.6875rem', lineHeight: 1.25, textAlign: 'center', color: choisi ? 'var(--cs-vert)' : 'var(--cs-texte-gris)', fontWeight: choisi ? 700 : 400 }}>{nom}</span>
                  </button>
                )
              })}
            </div>
            </>)}
            </div>
            {configErreur && (
              <p role="alert" style={{ flexShrink: 0, margin: 0, padding: '10px 22px 0', fontSize: '0.6875rem', lineHeight: 1.45, color: 'var(--cs-danger-fonce)' }}>{configErreur}</p>
            )}
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 22px 20px', borderTop: '1px solid var(--cs-fond-doux)' }}>
              <button onClick={() => setConfigOuverte(false)} style={{ fontSize: '0.6875rem', padding: '5px 12px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
              <button disabled={configEnvoi} onClick={async () => {
                setConfigEnvoi(true)
                setConfigErreur(null)
                const appels = [
                  { champ: 'niveaux_sommaire', valeur: configNiveaux.sommaire },
                  { champ: 'niveaux_corps', valeur: configNiveaux.corps },
                  { champ: 'texte_sommaire', valeur: chapeauxEnTexte(configNiveaux.txtSommaire) },
                  { champ: 'texte_corps', valeur: chapeauxEnTexte(configNiveaux.txtCorps) },
                  { champ: 'afficher_numeros', valeur: configNiveaux.afficherNumeros },
                  { champ: 'lecture_texte_entier', valeur: configNiveaux.texteEntier },
                  { champ: 'fleuron', valeur: fleuronChoisi },
                ]
                const reponses = await Promise.all(appels.map(({ champ, valeur }) =>
                  fetch('/api/admin/update-oeuvre', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_oeuvre: idOeuvre, champ, valeur }) })
                ))
                const refusees = appels.filter((_, i) => !reponses[i].ok).map(a => a.champ)
                if (refusees.length > 0) {
                  setConfigErreur(`Enregistrement refusé pour : ${refusees.join(", ")}. Rien n’a été rechargé ; réessayez, ou reconnectez-vous si la session a expiré.`)
                  setConfigEnvoi(false)
                  return
                }
                const modeModifie = configNiveaux.texteEntier !== lectureTexteEntier
                setConfigEnvoi(false)
                setConfigOuverte(false)
                if (modeModifie) window.location.reload()
              }}
                className="cs-bouton-plein cs-bouton-plein--compact">
                {configEnvoi ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {editionCible && (
        <ModaleEditionAdmin
          cible={editionCible}
          idOeuvre={idOeuvre}
          onTitreOeuvreModifie={(champ, valeur) => {
            if (champ === 'titre') setTitreAffiche(valeur)
            setOeuvreLocale(prev => ({ ...prev, [champ]: valeur || undefined }))
          }}
          onTitreComposeModifie={(cle, valeur) => setTitresComposes(prev => {
            // Une composition retirée SORT de l'objet : une chaîne vide s'y lirait comme un
            // titre composé vide, et l'intertitre ne reviendrait pas à son catalogue.
            const suite = { ...prev }
            if (valeur.trim()) suite[cle] = valeur
            else delete suite[cle]
            return suite
          })}
          onClose={() => setEditionCible(null)}
          onEnregistre={() => vue === 'apparat' ? chargerApparatData() : changerNiv1(niv1Actif, { forceRefresh: true, conserverPosition: true })}
        />
      )}
      {!mobile && voletsDirty && <BoutonProportions onRetablir={resetVolets} />}
    </div>
    </ProvisionNotesConnues>
  )
}

function NavPages({ pages, pageActuelle, setPageActuelle, bas = false }: {
  pages: any[][]
  pageActuelle: number
  setPageActuelle: (p: number) => void
  bas?: boolean
}) {
  if (pages.length <= 1) return null
  const total = pages.length
  const peutReculer = pageActuelle > 0
  const peutAvancer = pageActuelle < total - 1
  return (
    <div style={{ paddingTop: bas ? '2.5rem' : '0', paddingBottom: bas ? '0.5rem' : '1.5rem' }}>
      {/* Plus de filets de part et d'autre. Ils tiraient un trait sur toute la largeur de
          la colonne pour annoncer trois signes, et faisaient du simple passage à la page
          suivante une fin de chapitre. Le groupe se centre maintenant de lui-même. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', color: 'var(--cs-texte-doux)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px' }}>
          {/* ⛔ 9,6 × 21 px MESURÉS le 9 septembre 2026, pour un plancher de 24 (WCAG
              2.2 § 2.5.8). Ces deux boutons tournent la page d’un texte : ils sont sur le
              chemin de lecture, et ils ne portaient aucune zone de frappe. ⚠️ Le débord de
              « .cs-cible-fine » vit sous « @media (hover: none) » : rien ne bouge à la
              souris, tout change au doigt, et c’est l’axe que la charte impose — le
              POINTEUR, jamais la largeur de la page. */}
          <button
            onClick={() => peutReculer && setPageActuelle(pageActuelle - 1)}
            disabled={!peutReculer}
            title="Page précédente"
            aria-label="Page précédente"
            className="cs-cible-fine"
            style={{ background: 'none', border: 'none', cursor: peutReculer ? 'pointer' : 'default', color: peutReculer ? 'var(--cs-texte-second)' : 'var(--cs-bord)', fontSize: '0.9375rem', padding: '0 2px', lineHeight: 1, transition: 'color var(--cs-duree-courte)' }}>
            ‹
          </button>
          {/* « sur » plutôt qu'une barre oblique. La barre est un signe de fraction : on y
              lit d'abord un quart de quelque chose, et il faut un temps pour comprendre
              qu'il s'agit d'une page dans un tout. Le rapport se lit, il ne se calcule
              pas. */}
          <span style={{ ...STYLE_POSITION_PAGE, minWidth: '5.5rem', textAlign: 'center' }}>
            {pageActuelle + 1} sur {total}
          </span>
          <button
            onClick={() => peutAvancer && setPageActuelle(pageActuelle + 1)}
            disabled={!peutAvancer}
            title="Page suivante"
            aria-label="Page suivante"
            className="cs-cible-fine"
            style={{ background: 'none', border: 'none', cursor: peutAvancer ? 'pointer' : 'default', color: peutAvancer ? 'var(--cs-texte-second)' : 'var(--cs-bord)', fontSize: '0.9375rem', padding: '0 2px', lineHeight: 1, transition: 'color var(--cs-duree-courte)' }}>
            ›
          </button>
        </div>
      </div>
    </div>
  )
}

