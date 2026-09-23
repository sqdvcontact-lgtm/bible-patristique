"use client";

// ────────────────────────────────────────────────────────────────────────────
// Page « Polyglotte » — comparaison des traductions, outil de suivi de la refonte.
// La page s'ouvre vide ; on choisit un livre dans le volet de gauche, le même que
// celui de la page Bible, et l'on lit UN chapitre à la fois (le livre entier et
// « tout afficher » restent des options explicites). Jusqu'à cinq traductions en
// regard, choisies dans l'en-tête du tableau ; numérotation propre de chaque
// édition en lettrine, zébrage une ligne sur deux, lignes problématiques en rouge
// pour l'administrateur. Ce qui est chargé reste en CACHE par traduction et par
// chapitre, et le chapitre suivant se met en cache d'avance (voir « Le cache »).
// En mode admin, un crayon paraît au survol d'une cellule et ouvre une petite fenêtre
// pour corriger le verset (route serveur).
// Écran large requis : la page est signalée indisponible sous 820 px.
// ────────────────────────────────────────────────────────────────────────────

import { activerAuClavier } from '@/app/lib/activerAuClavier'
import { Z_MENU_PORTE, Z_MODALE, Z_SOUS_MENU_PORTE } from '@/app/lib/empilement'
import { Fragment, startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFenetreModale } from '@/app/lib/useFenetreModale'
import { cesurerGrec, codeLangue, copierSansCesures } from "@/app/lib/grec";
import { cesurerLatin } from "@/app/lib/cesuresLatines";
import { supabase } from "@/app/lib/supabase";
import { chargerToutesPagesSupabase, lancerEnParallele } from "@/app/lib/paginationSupabase";
import { codeLangueBible } from "@/app/lib/langueBible";
import { chapitreVoisin, sensDeLaTouche, type PlaceChapitre } from "@/app/lib/chapitresVoisins";
import NavigationBasChapitre from "@/app/components/NavigationBasChapitre";
import { nomLivreReference } from "@/app/lib/referencesBibliques";
import FleuronDiscret from "@/app/components/FleuronDiscret";
import NavLivres from "@/app/components/NavLivres";
import { chargerChapitresParLivre, nombreDeChapitres, type ChapitresParLivre } from "@/app/lib/chapitresCanon";
import IconeCrayon from "@/app/components/IconeCrayon";
import IconeSignalement from "@/app/components/IconeSignalement";
import IconeSignet from "@/app/components/IconeSignet";
import IconeCroix from "@/app/components/IconeCroix";
import { codeDeTraduction } from "@/app/lib/prelevementsBibliques";
// La cellule d'actions du site : au-dessus du texte survolé, jamais dessus.
import { CelluleActions, useCelluleActions } from "@/app/components/CelluleActions";
import { STYLE_BOUTON_ACTION } from "@/app/lib/celluleActions";
import IconeChevron from "@/app/components/IconeChevron";
import { DELAI_REPLI_MS, FOND_SURVOL_MENU, LARGEUR_SOUS_MENU_REM, rangDeCirculation, STYLE_CADRE_MENU, STYLE_CHEVRON_MENU, styleLigneMenu, TAILLE_CHEVRON_MENU } from "@/app/lib/stylesMenuBibles";
import { HAUTEUR_NAVBAR, HAUTEUR_SOUS_NAVBAR } from "@/app/lib/mesures";
import { MarqueAttente } from "@/app/lib/attenteNavigation";
import { DUREE_ENTREE_MS, ordonnerBlocsVisibles, ordonnerColonnesVisibles } from "@/app/lib/passageTexte";
import { LIVRE_PAR_DEFAUT, ouvertureDeLaPolyglotte, retenirPositionPolyglotte } from "@/app/lib/repriseLecture";
import { colonnesPolyglotteDemandees, livreEntierDemande, placePolyglotteDemandee, urlEtatPolyglotte } from "@/app/lib/bibleNavigation";
import { allerAElement } from "@/app/lib/defilement";
import { hauteurNavbarPx } from "@/app/lib/fenetreContextuelle";
import { useEstMobile, useSansSurvol } from "@/app/lib/useEstMobile";
import { POINTS_DE_RUPTURE } from '@/app/lib/pointsDeRupture';
import VisiteGuidee from "@/app/components/VisiteGuidee";
import { CLE_VISITE_POLYGLOTTE, VISITE_POLYGLOTTE } from "@/app/lib/visitePolyglotte";
import { type SceneVisite } from "@/app/lib/visiteGuidee";
import { offrirLaVisite } from "@/app/lib/demandeDeVisite";
import { useAffichageAdmin } from "@/app/lib/contexteAffichageAdmin";
import { ABREV_FR } from "@/app/lib/bible";
import { rendreTexteEnrichi, texteSansEnrichissement } from "@/app/oeuvre/[id]/texteEnrichi";
import ModalSignalement from "@/app/components/ModalSignalement";
import BoutonCopierTexte from "@/app/components/BoutonCopierTexte";
import { Bulle } from "@/app/components/Bulle";
import { citationBiblique, copierCitation } from "@/app/lib/citation";
import LassoLecture, { type RefusDeLasso } from "@/app/components/LassoLecture";
import { colonnesTouchees } from "@/app/lib/lasso";
import { referenceDesVersets, texteDesVersets, UNITE_VERSETS } from "@/app/lib/selectionPassages";
import { texteLisibleDeLaBible } from "@/app/lib/texteLisible899";
import { enumererNoms } from "@/app/lib/traducteurs";
import AvisLivreEntier, { avisLivreEntierEteint } from "./AvisLivreEntier";
import TraductionsAffichees, { type ColonneAffichee, type FicheTraductionPoly } from "./TraductionsAffichees";
import { useCompte } from "@/app/lib/contexteCompte";
import { aRevoir899, chargerVersets899, estGlose899, estTraductionModerne899, NOTE_ALIGNEMENT_A_REVOIR, rendu899, texteCouche899, TRAD_ID_BIBLE899, type Couche899 } from "@/app/lib/bible899";
import { marquerLacunesDuTemoin, rendreMarqueurs899 } from "@/app/lib/marqueurs899";
import { ENCRE_TITRE_CARTE, GRAISSE_TITRE, TITRE_CARTE } from '@/app/lib/hierarchieTitres'
import { signalerProgression } from '@/app/components/AnnonceHautsFaits'
import {
  CORPS_GLOSE, LIBELLE_GLOSE,
  MENTION_ABSENT, MENTION_ATTENTE, MENTION_DEUTERO, MENTION_EMPAN_TITRE, MENTION_LACUNE, MENTION_LACUNE_TITRE, mentionEmpan,
  STYLE_INVITE, STYLE_MENTION, STYLE_MENTION_LACUNE,
} from '@/app/lib/compositionBible'
// ⛔ `colorMix` est parti avec les pilules de « Traductions visibles » : plus aucun
// réglage du volet ne pose de fond teinté.
import { rendreEnrichi } from '@/app/lib/enrichissements'
import { nomCommun } from "@/app/lib/menuTraductionsBible";
import { comparerParMillesime, millesimeEdition, type RangeableParMillesime } from '@/app/lib/millesimeEdition'
import RailVolet from "@/app/components/RailVolet";
import {
  indexerLivresFillion,
  masquerTraductionsIndisponibles,
  traductionsDisponiblesPourLivres,
  type LivreFillion,
  type LivresParTraduction,
} from '@/app/lib/polyglotteFillion'

type Livre = { code: string; nom_fr: string; ordre: number };
// `sourceFillion` : la traduction ne vit pas dans `versets_v2` ; son texte se lit dans la
// table de lecture de la Fillion (voir `TABLE_FILLION`).
// ⚠️ `lang` range la colonne dans le menu (`GROUPES_LANG`) et choisit sa césure ; `langHtml`
// est la langue que la cellule DÉCLARE (`codeLangueBible`) : l'ancien français du témoin
// (« fro ») et l'hébreu (« he ») n'ont pas de groupe à eux, mais ils ne se composent pas
// comme le français (audit du 2026-09-23).
type Trad = { trad_id: string; nom: string; ordre: number | null; edition: string | null; lang: string; langHtml?: string; variante?: string; sourceFillion?: boolean };
type TraductionCatalogue = { trad_id: string; nom: string; ordre: number | null; source_edition: string | null; publication_fin_annee: number | null; langue: string | null; auteur?: string | null; dates?: string | null; date_publication?: string | null };

// ── La Bible du XIIIe siècle porte DEUX états de son texte ────────────────────
// TR0009 n'est pas une traduction de plus : c'est un manuscrit, dont on lit soit les
// abréviations développées, soit la transcription diplomatique. Un interrupteur du volet
// de gauche commandait ces deux états pour la page entière, si bien qu'on ne pouvait pas
// les lire EN REGARD l'un de l'autre — le premier usage qu'un philologue en fait. La
// transcription reçoit donc un identifiant à elle, tenu pour une traduction comme une
// autre par les colonnes, le cache et le menu. Rien de plus n'est demandé à la base :
// `chargerVersets899` rapporte déjà les deux couches d'un seul coup, et le cache les
// garde brutes. `tradBase` retrouve l'identifiant réel pour ce qui s'adresse à la base,
// `est899` reconnaît les deux.
const SUFFIXE_DIPLO = "#diplomatic";
const TRAD_ID_899_DIPLO = `${TRAD_ID_BIBLE899}${SUFFIXE_DIPLO}`;
const tradBase = (id: string) => (id.endsWith(SUFFIXE_DIPLO) ? id.slice(0, -SUFFIXE_DIPLO.length) : id);
const est899 = (id: string) => tradBase(id) === TRAD_ID_BIBLE899;
const couche899De = (id: string): Couche899 => (id === TRAD_ID_899_DIPLO ? "diplomatic" : "expanded");


// Le millésime SEUL, sans « Édition de » ni ponctuation : posé sous le nom de la
// traduction, en petites capitales espacées, il se lit pour ce qu'il est. Une date sous
// un titre n'a pas besoin qu'on la présente. L'année retenue est celle de l'édition-source
// (dernier millésime qu'elle cite), à défaut la fin de la période de publication.
// ⛔ La dérivation et l'ordre vivent dans `app/lib/millesimeEdition.ts`, module PUR
// testé sur les dix notices réelles du corpus : lire une date dans de la prose est la
// partie fragile du dispositif, et elle ne s'éprouve pas depuis une page.
const editionTrad = millesimeEdition;
type Point = { livre: string | null; reference: string | null; type: string | null; description: string | null; statut: string | null; notes: string | null };
type CanonRow = { id: string; livre: string; ch_canon: number; v_canon: number; est_suscription: boolean };
// ⚠️ `estGlose899` et `cleGlose899` ne se posent que sur une glose du témoin 899 : la seconde
// est sa clé de segment, qui lui donne SA ligne parmi les surnuméraires.
type V2Row = { id: string; canon_id: string | null; canon_id_fin: string | null; livre: string; trad_id: string; ch_orig: number; v_orig: number; v_orig_suffixe: string | null; texte: string | null; notes: string | null; estLacune899?: boolean; estGlose899?: boolean; cleGlose899?: string; lectureSeule?: boolean };

// ⛔ UNE LIGNE SANS TEXTE N'EST PAS UN VERSET À MONTRER (décision de l'auteur, 14 septembre
// 2026 : « à l'affichage, il ne faut pas afficher une ligne vide »). Une ligne vide posait son
// numéro en lettrine sans rien en face, et se lisait comme un verset que l'édition aurait laissé
// en blanc. La case retombe alors sur ce que dit la grille : absente, couverte, ou en attente.
// ⚠️ La lacune du témoin fait exception : elle n'a pas de texte, et c'est ce qu'elle dit.
const porteDuTexte = (r: V2Row) => r.estLacune899 === true || Boolean(r.texte?.trim());

// ── Passages que toutes les traditions ne reçoivent pas ────────────────────────────────
// Une case vide n'a pas toujours le même sens. Le plus souvent elle signale un travail en
// cours ou un défaut de source ; mais pour les livres et passages deutérocanoniques, elle
// dit quelque chose de tout autre : cette traduction ne les compte PAS parmi les Écritures.
// Le lecteur doit pouvoir faire la différence, sans quoi il conclut à un oubli.
// Ces passages nous sont parvenus en grec, non en hébreu ; les Bibles catholique et
// orthodoxe les reçoivent, la Bible protestante et la Bible hébraïque non.
const LIVRES_DEUTERO = new Set(["TOB", "JDT", "WIS", "SIR", "BAR", "1MA", "2MA", "ESG", "LJE", "SUS", "BEL", "S3Y"]);
function deuterocanonique(canonId: string): boolean {
  const [livre, ch, v] = canonId.split(".");
  if (LIVRES_DEUTERO.has(livre)) return true;
  // Daniel : le cantique des trois enfants, Suzanne et Bel — que le canon range dans le
  // livre lui-même, aux chapitres 3, 13 et 14.
  if (livre === "DAN") return (+ch === 3 && +v >= 24 && +v <= 90) || +ch === 13 || +ch === 14;
  return false;
}

// Suzanne, Bel et le Cantique des trois enfants sont des additions grecques à Daniel : leur
// texte est servi À L'INTÉRIEUR de Daniel (Dn 3,24-90 / 13 / 14), et non comme livres séparés.
// Le canon leur donne un code (SUS/BEL/S3Y) mais ils n'ont aucun verset propre ; les laisser
// dans le sommaire y créait trois entrées vides, doublant Daniel. On les retire de la seule
// liste de navigation — Daniel, lui, garde ces passages. (À distinguer des autres livres
// deutéro/apocryphes encore vides — Esther grec, Hénoch… — qui sont de vraies œuvres à charger.)
const LIVRES_FONDUS_DANS_DANIEL = new Set(["SUS", "BEL", "S3Y"]);

// Un surnuméraire regroupé : le même verset hors ossature, tel que plusieurs éditions le
// portent au même numéro d'origine. `par` associe chaque traduction à sa version du verset ;
// `ancre` est le dernier créneau du canon rencontré, qui fixe la place de la ligne.
type Surnum = { cle: string; livre: string; ch: number; v: number; ancre: string | null; par: Map<string, V2Row> };

// Certaines éditions portent un enrichissement typographique dans le texte : l'italique
// <i>…</i> (Sacy 1730 : mots ajoutés par le traducteur, absents de la Vulgate) et le gras
// <b>…</b>. On le rend en vrais éléments React — jamais via dangerouslySetInnerHTML.

function texteEnrichi(t: string | null, transform?: (s: string, cle: string) => React.ReactNode) {
  if (!t) return null;
  // Rendu commun au reste du site (gras **, italique <i> ou * … *, petites capitales ++,
  // exposant ^^, siècles en romain). Compat : l'ancien balisage <b> devient **.
  const norm = t.replace(/<b>([\s\S]*?)<\/b>/g, "**$1**");
  return rendreTexteEnrichi(norm, transform);
}

// Enrichit le texte APRÈS avoir posé les tirets conditionnels. Un tiret conditionnel est
// invisible ailleurs qu'au point de coupe.
//
// ⛔ LE LATIN AUSSI, et c'est lui qui en a le plus besoin. Les cellules sont justifiées avec
// `hyphens: auto` (voir `.poly-texte-cell`) — or aucun navigateur ne livre de dictionnaire de
// coupure pour le latin, si bien que la déclaration n'y fait RIEN : mesuré dans
// `app/lib/cesuresLatines.ts`, 23 lignes avec, 23 sans, et 21 dès que les points de coupe
// sont posés. La Vulgate clémentine (36 046 versets) était donc la seule colonne justifiée
// sans aucun point de coupe — celle qui creuse les lézardes —, et cela dans la page où les
// colonnes sont les plus étroites du site. Le français a son dictionnaire, le grec a
// `cesurerGrec` ; il ne manquait que le latin.
//
// ⚠️ La césure vient AVANT l'enrichissement, et c'est sans danger : `cesurerLatin` comme
// `cesurerGrec` ne touchent que des suites de LETTRES assez longues — jamais la ponctuation,
// jamais les marques `**`, `++`, `^^` ni `<i>`, dont le nom de balise n'a qu'une lettre.
function texteCesure(t: string | null, lang?: string, transform?: (s: string, cle: string) => React.ReactNode) {
  if (!t) return texteEnrichi(t, transform);
  // ⛔ UN TEXTE SE COMPOSE UNE FOIS, NON À CHAQUE RENDU (audit du 2026-09-23, « livre entier »
  // : « toujours pas fluide »). La page est un seul composant : un survol, un changement du
  // nombre de colonnes la rendent en entier, et chaque rendu reposait les césures du grec et
  // du latin puis réanalysait l'enrichissement de TOUS les versets affichés — un livre entier
  // en compte des milliers par colonne. Le résultat ne dépend que du texte et de la langue :
  // il se garde. ⚠️ Rendre le MÊME élément React d'un rendu à l'autre fait aussi sauter à
  // React la comparaison de tout le sous-arbre. Une transformation (lacunes de la 899) n'a
  // pas d'identité stable : elle ne passe pas par la réserve.
  if (!transform) {
    const cle = `${lang ?? ""}|${t}`;
    const garde = COMPOSITIONS.get(cle);
    if (garde !== undefined) return garde;
    const compose = composerCesure(t, lang);
    if (COMPOSITIONS.size >= COMPOSITIONS_MAX) COMPOSITIONS.clear();
    COMPOSITIONS.set(cle, compose);
    return compose;
  }
  return composerCesure(t, lang, transform);
}
// La réserve des compositions : bornée, et vidée d'un coup quand elle déborde (un livre
// entier sur six colonnes en demande quelques milliers ; au-delà, on repart de zéro).
const COMPOSITIONS = new Map<string, React.ReactNode>();
const COMPOSITIONS_MAX = 40000;
function composerCesure(t: string, lang?: string, transform?: (s: string, cle: string) => React.ReactNode) {
  if (lang === "grc") return texteEnrichi(cesurerGrec(t), transform);
  if (lang === "la") return texteEnrichi(cesurerLatin(t), transform);
  return texteEnrichi(t, transform);
}

const VERT = "var(--cs-vert)";
// ⛔ PLUS AUCUN APLAT EN TÊTE DE LA COMPARAISON (2026-09-04, décision de l'auteur). La page
// se composait comme un TABLEAU DANS UN BLOC : une carte à coins arrondis posée sur le papier
// avec son ombre et sa marge, deux bandeaux verts empilés, un zébrage et un maillage de filets.
// Elle se compose désormais comme une PAGE IN-FOLIO : le papier du site d'un bord à l'autre,
// aucune horizontale, et pour tout appareil la réglure verticale d'un livre imprimé.
//
// Ce qui a disparu avec les aplats, et où c'est allé :
//   · le nom du livre et son chapitre montent dans le VOLET DE GAUCHE, sous « Bible
//     polyglotte » — c'est là qu'on choisit ce qu'on lit, c'est là qu'on doit lire ce qu'on
//     a choisi. Le volet rabattu le porte encore, écrit en hauteur dans son rail ;
//   · les deux réglages de relecture de l'administrateur descendent eux aussi dans le volet,
//     avec « Traductions visibles » : ce sont des réglages, non des titres ;
//   · les noms d'éditions restent en tête de leurs colonnes, mais en petites capitales sur le
//     papier, sous un unique filet.
const ROUGE = 'var(--cs-danger-fonce)';
const ROUGE_FOND = "var(--cs-danger-fond)";
// Rose : les cas qui RÉSISTENT (statut « resiste » dans points_sensibles). Examinés,
// correction tentée ou pesée, non résolue — souvent parce que le contrôle de contenu
// a refusé le déplacement que le comptage suggérait. À distinguer du rouge, qui
// signale un point à vérifier : ici, on a déjà cherché et l'on a buté.
// ⚠️ Il valait EXACTEMENT le rouge (audit du 2026-09-23) : la distinction que ce commentaire
// décrit ne se voyait pas. Le rose est le même fond, à moitié fondu dans le papier.
const ROSE_FOND = "color-mix(in srgb, var(--cs-danger-fond) 50%, var(--cs-fond))";
// ⛔ PLUS DE ZÉBRAGE : une ligne sur deux teintée est la marque d'un tableur, et c'est
// précisément ce dont la page devait sortir. Toutes les lignes portent le papier.
// ⚠️ Elles le portent EN DUR, et non en transparent, et ce n'est pas la même chose : la
// surbrillance de survol passe par un `filter: brightness()` (voir `.poly-row:hover`), qui
// n'assombrit que ce qui est peint. Sur une ligne transparente, il n'assombrirait que le
// texte, et le survol cesserait de désigner la ligne. C'est aussi ce qui laisse intacts les
// fonds signalétiques — rouge, rose, violet, verset visé — qui, eux, veulent dire quelque chose.
const FOND_LIGNE = "var(--cs-fond)";
// La RÉGLURE : un seul filet, vertical, qui court d'un bout à l'autre de la page sans jamais
// rien croiser. Il sépare deux textes distincts, ce qui est le seul partage que la page ait à
// dire. ⛔ Aucune horizontale ne lui répond : le blanc entre versets vient du rembourrage des
// cellules, et non d'un écart entre les lignes, sans quoi le filet serait interrompu à chaque
// verset et l'on retomberait dans la grille.
const FILET_COL = "var(--cs-bord-clair)";
const SURNUM = 'var(--cs-surnum)';       // versets propres à la Septante (hors ossature canonique)
const SURNUM_FOND = "var(--cs-fond)";
const NB_SLOTS = 4;   // valeur de repli au premier rendu (avant mesure de l'écran)
// Une colonne qui s'ouvre ou se ferme : la durée de la transition de sa piste.
// ⚠️ Elle est écrite UNE fois et passée à la feuille (`.poly-grille`) : deux écritures,
// l'une en millisecondes et l'autre en secondes, se désaccorderaient au premier réglage.
// ⚠️ 640 ms et non plus 280 (demande de l'auteur, 2026-09-23 : « l'animation doit être plus
// lente, plus smooth »). L'accélération est une ease-in-out douce (`COURBE_COLONNE`) : la
// colonne part sans à-coup et se pose sans rebond.
const DUREE_COLONNE_MS = 640;
const COURBE_COLONNE = "cubic-bezier(.45,.05,.25,1)";
// Les rangées qui changent de hauteur à la fin d'un élargissement se déplient en ce temps.
const DUREE_DEPLI_MS = 420;
type SlotCol = { slot: number; trad: Trad | null };
type ColRendue = SlotCol & { etat: "stable" | "entrante" | "sortante" };
// La clé de lasso d'une cellule : sa colonne, puis son créneau canonique.
const cleLasso = (slot: number, canonId: string) => `${slot}:${canonId}`;
const colonneDeLaCleLasso = (cle: string): number | null => {
  const n = Number(cle.slice(0, cle.indexOf(":")));
  return Number.isInteger(n) ? n : null;
};
const CLE_SLOTS = "polyglotte-slots2";  // choix des traductions, mémorisé (v2 : colonnes adaptatives)
// Nombre de colonnes de traduction ADAPTATIF : calculé d'après la largeur réelle
// du tableau (une colonne lisible ≈ MIN_COL_PX), plafonné à MAX_SLOTS sur grand
// écran, plancher MIN_SLOTS. Voir l'effet ResizeObserver plus bas.
const MIN_COL_PX = 250;
const MAX_SLOTS = 5;
const MIN_SLOTS = 2;
// La marge où se pose la référence canonique. ⚠️ Elle est en PIXELS, et c'est du chrome à
// hauteur fixe (charte, § conversion px → rem) : elle tient la plus longue référence du
// corpus, « 119, 176 », composée en chiffres tabulaires au corps de la marge.
const LARGEUR_REF = 44;
// ⛔ CE QUI ALIGNE UNE RÉFÉRENCE SUR SA LIGNE DE TEXTE vit désormais dans la feuille, et
// non dans deux nombres : la marge et la lettrine EMPRUNTENT le strut de la cellule (voir
// `.poly-marge-ref` et `.poly-lettrine-item`). Les deux constantes d'ici — un interligne
// absolu et un rembourrage calibrés à l'œil — étaient en PIXELS quand les deux boîtes se
// mesurent en rem : elles n'étaient justes qu'à une seule taille de police racine, et
// elles se sont déréglées dès que le blanc de la cellule et l'interligne ont bougé.
const ORDRE_NT = 52;
const ORDRE_CANON_MAX = 78;     // au-delà : écrits non canoniques
const FOND = "var(--cs-fond)";   // le fond du site, celui de --cs-fond

// ⛔ LE ROUGE DIT « À VÉRIFIER », IL NE DIT PAS « ON EN A PARLÉ ». Un point clos — corrigé,
// documenté, constaté — a été traité : le teindre comme un point ouvert use le seul signal
// dont l'administrateur dispose pour retrouver son travail. La liste comptait déjà 124
// points clos sur 210 quand le relevé structurel du 2026-09-07 l'a portée à 634 ; sans ce
// partage, « Lignes problématiques » aurait cessé de désigner quoi que ce soit.
// ⚠️ La liste nomme les statuts CLOS, non les statuts ouverts : un statut qu'on n'aurait pas
// prévu tombe alors du côté rouge, c'est-à-dire du côté qui se voit. Une valeur inconnue
// mérite un regard, pas un silence.
const STATUTS_CLOS = new Set(["corrigé", "documenté", "constate", "resolu", "verifie", "validé"]);
const pointOuvert = (p: Point) => !STATUTS_CLOS.has((p.statut ?? "").trim());

// ── Analyse des points sensibles → ensembles de versets/chapitres concernés ──
function construireSensibilite(points: Point[]) {
  const chap = new Set<string>();
  const vers = new Set<string>();
  const libelle = new Map<string, string[]>();
  // ⚠️ Le LIBELLÉ se nourrit de TOUS les points, la teinte des seuls points ouverts : ce
  // qu'un point clos a établi reste à lire au survol de la marge, et c'est souvent là que
  // se trouve l'explication d'une case vide.
  const addChap = (l: string, c: number, desc: string, ouvert: boolean) => { if (ouvert) chap.add(`${l}|${c}`); const k = `${l}|${c}`; libelle.set(k, [...(libelle.get(k) ?? []), desc]); };
  const addVers = (l: string, c: number, v: number, desc: string, ouvert: boolean) => { if (ouvert) vers.add(`${l}|${c}|${v}`); const k = `${l}|${c}`; libelle.set(k, [...(libelle.get(k) ?? []), desc]); };

  for (const p of points) {
    const ref = (p.reference ?? "").trim();
    const desc = `${p.type ?? ""} — ${p.description ?? ""}`.trim();
    const ouvert = pointOuvert(p);
    if (/^([1-4]?[A-Z]{2,3})(\/[1-4]?[A-Z]{2,3})+$/.test(ref)) { for (const code of ref.split("/")) addChap(code, 0, desc, ouvert); continue; }
    if (/\(\d+\s+psaumes?\)/i.test(ref) && p.notes) { const nums = (p.notes.match(/\d+/g) ?? []).map(Number).filter(n => n >= 1 && n <= 150); for (const n of nums) addChap("PSA", n, desc, ouvert); continue; }
    let dernierLivre = p.livre && /^[1-4]?[A-Z]{2,3}$/.test(p.livre) ? p.livre : "";
    for (let tok of ref.split(/[\/,]/)) {
      tok = tok.trim(); if (!tok) continue;
      const m = tok.match(/^(?:([1-4]?[A-Z]{2,3})\s+)?(\d+)(?:\s*[:.]\s*(\d+)(?:\s*-\s*(\d+))?)?(?:\s*-\s*(\d+))?$/);
      if (!m) continue;
      const l = m[1] || dernierLivre; if (!l) continue; dernierLivre = l;
      const c = Number(m[2]);
      if (m[3]) { const v1 = Number(m[3]); const v2 = m[4] ? Number(m[4]) : v1; for (let v = v1; v <= v2; v++) addVers(l, c, v, desc, ouvert); }
      else if (m[5]) { for (let cc = c; cc <= Number(m[5]); cc++) addChap(l, cc, desc, ouvert); }
      else addChap(l, c, desc, ouvert);
    }
  }
  const estSensible = (l: string, c: number, v: number) => chap.has(`${l}|0`) || chap.has(`${l}|${c}`) || vers.has(`${l}|${c}|${v}`);

  // Les points de statut « resiste » forment leur propre catégorie : examinés, dont la
  // correction a été tentée ou pesée sans aboutir. On les recense à part pour les
  // teindre autrement — le rouge dit « à vérifier », le rose dit « on a buté ici ».
  const chapR = new Set<string>(), versR = new Set<string>();
  for (const p of points.filter(x => x.statut === "resiste")) {
    const ref = (p.reference ?? "").trim();
    let dernierLivre = p.livre && /^[1-4]?[A-Z]{2,3}$/.test(p.livre) ? p.livre : "";
    for (let tok of ref.split(/[\/,]/)) {
      tok = tok.trim(); if (!tok) continue;
      const m = tok.match(/^(?:([1-4]?[A-Z]{2,3})\s+)?(\d+)(?:\s*[:.]\s*(\d+)(?:\s*-\s*(\d+))?)?$/);
      if (!m) continue;
      const l = m[1] || dernierLivre; if (!l) continue; dernierLivre = l;
      const c = Number(m[2]);
      if (m[3]) { const v1 = Number(m[3]), v2 = m[4] ? Number(m[4]) : v1; for (let v = v1; v <= v2; v++) versR.add(`${l}|${c}|${v}`); }
      else chapR.add(`${l}|${c}`);
    }
  }
  const resiste = (l: string, c: number, v: number) => chapR.has(`${l}|${c}`) || versR.has(`${l}|${c}|${v}`);
  return { estSensible, resiste, libelle };
}

// Chargement paginé (1000 lignes par requête). La PREMIÈRE page part seule et
// rapporte le compte avec elle (`count: 'exact'` sur une requête qui rend des
// lignes) ; les suivantes, s'il en faut, partent ensemble. Un chapitre — quelques
// dizaines à quelques centaines de lignes — tient dans la première page : il ne
// coûte donc qu'UN aller-retour, là où le compte préalable en faisait deux en
// cascade (mesuré : ~65 ms l'aller-retour, quoi qu'il transporte). Un livre entier
// en coûte deux — les Psaumes : 2 461 lignes du canon, jusqu'à 12 000 de texte.
// ⚠️ Une erreur est LEVÉE, non rendue en liste vide : une liste vide se lit
// « absent de cette traduction », ce qui est un mensonge sur une panne.
const PAGE = 1000;
async function fetchPaged<T>(table: string, cols: string, addFilters: (q: any) => any): Promise<T[]> {
  const page = (p: number) =>
    addFilters(supabase.from(table).select(cols, p === 0 ? { count: "exact" } : undefined)).order("id").range(p * PAGE, p * PAGE + PAGE - 1);
  const premiere = await page(0);
  if (premiere.error) throw premiere.error;
  const lignes = (premiere.data ?? []) as T[];
  const total = premiere.count ?? lignes.length;
  if (total <= lignes.length) return lignes;
  // ⚠️ Les pages suivantes partent BORNÉES (`lancerEnParallele`, six en vol) : un livre
  // entier en demande une douzaine par source, et toutes ensemble elles occupaient le
  // pool au détriment des requêtes voisines (règle des lectures découpées en lots).
  const suite = await lancerEnParallele<{ data: unknown[] | null; error: unknown }>(Array.from({ length: Math.ceil(total / PAGE) - 1 }, (_, i) => () => page(i + 1)));
  for (const r of suite) if (r.error) throw r.error;
  return [...lignes, ...suite.flatMap(r => (r.data ?? []) as T[])];
}

// Ce que le tableau demande à la base, d'un bloc : les livres, les traductions et le
// chapitre (`null` pour le livre entier). C'est la clé qui dit si ce qui est chargé
// RÉPOND à ce qui est demandé — et donc si l'on attend, et si l'on doit repartir. La
// couche de la Bible 899 n'y figure plus : elle est portée par l'identifiant de la
// colonne (voir `couche899De`), et les deux couches arrivent ensemble au cache.
type Portee = { codes: string[]; tradIds: string[]; tradIdsFillion: string[]; chScope: number | null };
const memeListe = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
// Ce qui est chargé couvre la demande quand ce sont les mêmes livres et les mêmes
// traductions, et que le chapitre demandé est celui qu'on a — ou que l'on a le livre
// entier, qui contient tous ses chapitres : revenir du livre entier à un chapitre ne
// coûte alors rien.
function couvre(chargee: Portee | null, demande: Portee): boolean {
  return chargee !== null
    && memeListe(chargee.codes, demande.codes)
    && memeListe([...chargee.tradIds].sort(), [...demande.tradIds].sort())
    && memeListe([...chargee.tradIdsFillion].sort(), [...demande.tradIdsFillion].sort())
    && (chargee.chScope === null || chargee.chScope === demande.chScope);
}

// ── Le CACHE : par traduction et par chapitre ─────────────────────────────────
// Ce qui est venu de la base reste en mémoire, rangé par traduction ET par chapitre
// (2026-09-03). Changer une colonne ne charge que la colonne ; revenir à un chapitre
// ne coûte rien ; et le chapitre suivant se met en cache d'avance (voir la page). Le
// livre entier se range sous « * » et couvre chacun de ses chapitres. La Bible 899 se
// garde BRUTE : la couche (développée, diplomatique) s'applique à la lecture, si bien
// qu'en changer ne recharge rien.
// ⚠️ Au niveau du module, et non dans un état : le cache survit aux rendus et aux
// allers et retours sur la page, et il est BORNÉ, les entrées les plus anciennes
// partant les premières. Un chapitre à cinq colonnes pèse quelques dizaines de Ko.
type Scope = number | "*";
type Brutes899 = Awaited<ReturnType<typeof chargerVersets899>>;
const cacheCanon = new Map<string, CanonRow[]>();   // « livre|scope »
const cacheTexte = new Map<string, V2Row[]>();      // « trad|livre|scope »
const cache899 = new Map<string, Brutes899>();      // « livre|scope »
const CACHE_MAX = 60;
function retenir<T>(cache: Map<string, T>, cle: string, valeur: T) {
  cache.delete(cle);
  cache.set(cle, valeur);
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
}
const scopeDe = (chScope: number | null): Scope => chScope ?? "*";
const cleLivre = (livre: string, scope: Scope) => `${livre}|${scope}`;
// Un chapitre se lit dans son entrée, ou dans celle du livre entier quand elle y est.
function lireCanon(livre: string, scope: Scope): CanonRow[] | undefined {
  return cacheCanon.get(cleLivre(livre, scope))
    ?? (scope === "*" ? undefined : cacheCanon.get(cleLivre(livre, "*"))?.filter(r => r.ch_canon === scope));
}
// Le même partage que la base : un chapitre, ce sont les lignes dont le créneau du
// canon est dans ce chapitre ; les surnuméraires, sans créneau, restent au livre entier.
function lireTexte(trad: string, livre: string, scope: Scope): V2Row[] | undefined {
  return cacheTexte.get(`${trad}|${cleLivre(livre, scope)}`)
    ?? (scope === "*" ? undefined : cacheTexte.get(`${trad}|${cleLivre(livre, "*")}`)?.filter(r => ligneDuChapitre(r, livre, scope)));
}
// ⛔ UN CHAPITRE PORTE AUSSI SES VERSETS HORS OSSATURE (audit du 2026-09-23). Le filtre ne
// retenait que les lignes dont le créneau du canon tombe dans le chapitre : les 1 369
// lignes sans créneau (additions de la Septante à Judith, à Esther, à Daniel…) ne
// paraissaient qu'en livre entier, et le chapitre les taisait sans un mot. Une ligne sans
// créneau appartient au chapitre de sa numérotation d'édition ; un prologue (chapitre 0)
// s'ouvre avec le chapitre 1.
function ligneDuChapitre(r: V2Row, livre: string, ch: number): boolean {
  if (r.canon_id) return r.canon_id.startsWith(`${livre}.${ch}.`);
  return r.ch_orig === ch || (ch === 1 && r.ch_orig === 0);
}
function lire899(livre: string, scope: Scope): Brutes899 | undefined {
  return cache899.get(cleLivre(livre, scope))
    ?? (scope === "*" ? undefined : cache899.get(cleLivre(livre, "*"))?.filter(l => l.chapitre === scope));
}

// Colonne synthétique TR0009 (Bible 899) : texte recomposé en direct des tables
// éditoriales, aligné sur canon_id, sans copie vers versets_v2. Les lacunes du
// manuscrit (CANONICAL_GAP) sont conservées. Des matières hors canon (MANUSCRIPT_EXTRA),
// `chargerVersets899` ne garde que les GLOSES : sans canon_id, elles deviennent des lignes
// surnuméraires, chacune la sienne (charte § 15.4 ; voir `cleGlose899`).
function lignes899(brutes: Brutes899, tradId: string): V2Row[] {
  const couche = couche899De(tradId);
  return brutes.map(l => {
    const lacune = rendu899(l) === "lacune";
    const glose = estGlose899(l);
    // ⛔ La clé d'une glose est sa clé de segment : les gloses d'un même verset portent toutes
    // le numéro de leur hôte, et sous cette clé commune la dernière écrasait les autres.
    const cleGlose = glose ? (l.segment_key ?? `ordre-${l.alignment_order}`) : undefined;
    return {
      // L'identifiant porte la colonne : le manuscrit développé et sa transcription
      // diplomatique se lisent côte à côte, et leurs lignes ne se confondent pas.
      // ⚠️ Une glose n'a pas de canon_id : sans sa clé, toutes celles d'un chapitre
      // portaient le même identifiant, « 899:TR0009:null ».
      id: `899:${tradId}:${l.canon_id ?? `glose:${cleGlose ?? l.alignment_order}`}`,
      canon_id: l.canon_id,
      // ⚠️ La couche 899 porte SA propre borne de fin (`bible_canonical_alignments`), que
      // la recomposition par créneau a déjà résolue : une ligne y vaut un créneau, et il
      // n'y a donc pas d'empan à reporter ici.
      canon_id_fin: null,
      livre: l.livre ?? "",
      trad_id: tradId,
      ch_orig: l.chapitre ?? 0,
      v_orig: l.verset ?? 0,
      v_orig_suffixe: null,
      texte: lacune ? null : texteCouche899(l, couche),
      notes: aRevoir899(l) ? NOTE_ALIGNEMENT_A_REVOIR : null,
      estLacune899: lacune,
      ...(glose ? { estGlose899: true, cleGlose899: cleGlose } : {}),
    };
  });
}

function trierCanon(c: CanonRow[], ordreDe: Map<string, number>) {
  c.sort((a, b) => ((ordreDe.get(a.livre) ?? 0) - (ordreDe.get(b.livre) ?? 0)) || (a.ch_canon - b.ch_canon) || (a.v_canon - b.v_canon));
}

// Assemble une demande depuis le cache, ou rend null s'il y manque quelque chose.
// SYNCHRONE : c'est ce qui permet de servir un chapitre sans passer par l'attente.
function assemblerDepuisCache(demande: Portee, ordreDe: Map<string, number>): { canon: CanonRow[]; lignes: V2Row[] } | null {
  const scope = scopeDe(demande.chScope);
  const canon: CanonRow[] = [];
  const lignes: V2Row[] = [];
  for (const code of demande.codes) {
    const c = lireCanon(code, scope);
    if (!c) return null;
    canon.push(...c);
    for (const trad of demande.tradIds) {
      if (est899(trad)) {
        const b = lire899(code, scope);
        if (!b) return null;
        lignes.push(...lignes899(b, trad));
      } else {
        const t = lireTexte(trad, code, scope);
        if (!t) return null;
        lignes.push(...t);
      }
    }
  }
  trierCanon(canon, ordreDe);
  return { canon, lignes };
}

// Une même requête ne part pas deux fois : le chapitre demandé au clic et le même
// chapitre mis en cache d'avance partagent leur promesse.
const enVol = new Map<string, Promise<void>>();
function partager(cle: string, lancer: () => Promise<void>): Promise<void> {
  const deja = enVol.get(cle);
  if (deja) return deja;
  const p = lancer().finally(() => { enVol.delete(cle); });
  enVol.set(cle, p);
  return p;
}

// Charge ce qui MANQUE au cache pour une demande, et rien d'autre. Une requête par
// groupe de traductions auxquelles il manque les mêmes livres : au changement de
// chapitre toutes en manquent, et c'est UN aller-retour, comme avant ; au changement
// d'une colonne, une seule traduction part. Le canon et la Bible 899 partent dans la
// même vague. Les identifiants du canon ont la forme « LIVRE.chapitre.verset », d'où le
// filtre `like` sur `canon_id` pour un chapitre — servi par l'index à préfixe de la
// migration `versets_v2_index_chapitre_canonique` (sans lui, la base lisait tout le
// livre pour en garder un chapitre : 391 ms pour Genèse 1, 4 ms avec).
// ⚠️ Une erreur est LEVÉE, non rendue en liste vide, et rien n'entre alors au cache.
//
// ── La Fillion se lit ailleurs, et de la même façon ──────────────────────────
// Son texte n'est pas dans `versets_v2` : il est recomposé depuis les tables
// éditoriales, puis posé sur l'axe canonique par les alignements vérifiés. La base en
// tient le résultat figé dans `v_polyglotte_fillion`, aux colonnes de `versets_v2` —
// la page ne change donc que de table, et garde son cache, ses filtres et sa grille.
// ⛔ Ne pas lire la chaîne de vues qui produit cette table : elle recalcule ses 18 000
// lignes à chaque requête (4,9 s pour un chapitre, 22,8 s pour le recensement des
// livres), quand le rôle du lecteur coupe à 8 s — c'est ce qui fermait le menu.
const TABLE_FILLION = "v_polyglotte_fillion";
// Ce que le MENU doit savoir : dans quels livres la Fillion se lit déjà.
const COUVERTURE_FILLION = "v_polyglotte_fillion_livres";
const COLONNES_TEXTE = "id, canon_id, canon_id_fin, livre, trad_id, ch_orig, v_orig, v_orig_suffixe, texte, notes";
async function completerCache(demande: Portee): Promise<void> {
  const { codes, tradIds, tradIdsFillion, chScope } = demande;
  const scope = scopeDe(chScope);
  const canonManquant = codes.filter(code => !lireCanon(code, scope));
  // Les groupes sont rangés PAR SOURCE : une même vague ne mêle pas `versets_v2` et la
  // table de lecture de la Fillion, qui ne se filtrent pas par le même chemin.
  const groupes = new Map<string, { trads: string[]; livres: string[]; fillion: boolean }>();
  const surFillion = new Set(tradIdsFillion);
  for (const trad of tradIds) {
    if (est899(trad)) continue;
    const livres = codes.filter(code => !lireTexte(trad, code, scope));
    if (!livres.length) continue;
    const fillion = surFillion.has(trad);
    const cle = `${fillion ? "fillion" : "v2"}|${livres.join(",")}`;
    const g = groupes.get(cle) ?? { trads: [], livres, fillion };
    g.trads.push(trad);
    groupes.set(cle, g);
  }
  const manquant899 = tradIds.some(est899) ? codes.filter(code => !lire899(code, scope)) : [];

  const taches: Promise<void>[] = [];
  if (canonManquant.length) {
    taches.push(partager(`canon|${canonManquant.join(",")}|${scope}`, () =>
      fetchPaged<CanonRow>("versets_canon", "id, livre, ch_canon, v_canon, est_suscription",
        q => { const x = q.in("livre", canonManquant); return scope !== "*" ? x.eq("ch_canon", scope) : x; })
        .then(rows => { for (const code of canonManquant) retenir(cacheCanon, cleLivre(code, scope), rows.filter(r => r.livre === code)); })));
  }
  for (const g of groupes.values()) {
    // Un chapitre ne se demande que pour un livre à la fois (le préfixe du `like` ne
    // sait nommer qu'un livre) ; le livre entier, lui, peut en réunir plusieurs.
    const lots = scope === "*" ? [g.livres] : g.livres.map(l => [l]);
    for (const livres of lots) {
      taches.push(partager(`texte|${g.fillion ? "fillion" : "v2"}|${g.trads.join(",")}|${livres.join(",")}|${scope}`, () =>
        fetchPaged<V2Row>(g.fillion ? TABLE_FILLION : "versets_v2", COLONNES_TEXTE,
          q => {
            const x = q.in("livre", livres).in("trad_id", g.trads);
            if (scope === "*") return x;
            // La table de la Fillion porte son chapitre canonique en clair, et un entier
            // indexé vaut mieux qu'un préfixe : `versets_v2` n'a que le `canon_id`.
            // ⚠️ Les lignes sans créneau du chapitre viennent avec lui (`ligneDuChapitre`) :
            // mesuré sous la RLS du lecteur, le `or` ne coûte rien (19 ms sur Esther 1).
            if (g.fillion) return x.eq("ch_canon", scope);
            const chapitres = scope === 1 ? "(0,1)" : `(${scope})`;
            return x.or(`canon_id.like.${livres[0]}.${scope}.*,and(canon_id.is.null,ch_orig.in.${chapitres})`);
          })
          .then(brutes => {
            // ⛔ Le crayon d'édition ne se pose jamais sur la Fillion : ses lignes sont
            // recomposées depuis les tables éditoriales, et ne s'écrivent pas d'ici.
            const rows = g.fillion ? brutes.map(r => ({ ...r, lectureSeule: true })) : brutes;
            for (const trad of g.trads) for (const livre of livres) {
              retenir(cacheTexte, `${trad}|${cleLivre(livre, scope)}`, rows.filter(r => r.trad_id === trad && r.livre === livre));
            }
          })));
    }
  }
  for (const code of manquant899) {
    taches.push(partager(`899|${code}|${scope}`, () =>
      chargerVersets899(supabase, { livre: code, chapitre: chScope }).then(b => { retenir(cache899, cleLivre(code, scope), b); })));
  }
  await Promise.all(taches);
}

// Le chargement d'une portée : complète le cache, puis assemble. Fonction de module :
// elle ne lit aucun état, et l'effet qui l'appelle décide seul de ce qu'il en fait.
async function chargerPortee(demande: Portee, ordreDe: Map<string, number>): Promise<{ canon: CanonRow[]; lignes: V2Row[] }> {
  await completerCache(demande);
  const r = assemblerDepuisCache(demande, ordreDe);
  if (!r) throw new Error("Le cache ne couvre pas la demande après chargement.");
  return r;
}

// Mise en cache d'AVANCE : la même chose, sans rien attendre et sans rien dire. Un
// échec n'alarme pas : la demande réelle le redira, si elle vient.
function precharger(demande: Portee): Promise<void> {
  return completerCache(demande).catch((e: unknown) => { console.debug("Polyglotte : préchargement abandonné.", e); });
}

// Un verset corrigé par l'administration se corrige aussi dans le cache : sinon le
// chapitre reviendrait de mémoire avec l'ancien texte.
function corrigerTexteEnCache(id: string, texte: string) {
  for (const [cle, rows] of cacheTexte) {
    if (rows.some(r => r.id === id)) cacheTexte.set(cle, rows.map(r => (r.id === id ? { ...r, texte } : r)));
  }
}


// Les blocs qui s'effacent et paraissent un par un : une ligne de verset, une ligne
// surnuméraire, un bandeau de livre. Le haut de la lecture est le bas de l'en-tête
// collant, sinon la barre.
const SELECTEUR_BLOCS_POLYGLOTTE = ".poly-row, .poly-surnum-row, h2";

// ── UN LONG TABLEAU SE PEINT PAR TRANCHES (audit du 2026-09-23) ──
// Un livre entier compte jusqu'à 2 500 lignes, un grand chapitre près de 200. Au-delà de
// `SEUIL_BLOCS`, les lignes se rangent par tranches de `LIGNES_PAR_BLOC` en
// `content-visibility: auto` (`.poly-bloc`) : le navigateur ne compose ni ne peint ce qui
// est loin de l'écran, si bien que le glissement d'une colonne ne recalcule que les lignes
// qu'on voit, au lieu du livre entier à chaque image. ⚠️ La hauteur d'une tranche encore
// jamais peinte s'ESTIME (`hauteurLigne`) ; `auto` retient ensuite la vraie. Le texte reste
// cherchable (Ctrl+F) et atteignable par ancre, ce que `hidden` ne serait pas.
const SEUIL_BLOCS = 60;
const LIGNES_PAR_BLOC = 16;
function enBlocs(lignes: React.ReactNode[], cle: string, hauteurLigne: number): React.ReactNode {
  if (lignes.length <= SEUIL_BLOCS) return lignes;
  const blocs: React.ReactNode[] = [];
  for (let i = 0; i < lignes.length; i += LIGNES_PAR_BLOC) {
    const tranche = lignes.slice(i, i + LIGNES_PAR_BLOC);
    blocs.push(
      <div key={`${cle}-${i / LIGNES_PAR_BLOC}`} className="poly-bloc"
        style={{ containIntrinsicBlockSize: `auto ${tranche.length * hauteurLigne}px` }}>
        {tranche}
      </div>,
    );
  }
  return blocs;
}
/** Ce qu'il faut pour composer les actions d'une cellule. ⚠️ Le TEXTE est celui de la
 *  cellule, versets d'origine réunis ; `citer` manque sur un surnuméraire, qui n'a pas
 *  de référence canonique où ranger un prélèvement. */
type ActionsDeCellule = {
  cle: string;
  refLisible: string;
  texte: string;
  citer: { cle: string; refLivre: string; refAbr: string; chapitre: number; verset: number; traductionLabel: string; tradId: string } | null;
};

const hautDeLecture = (entete: HTMLElement | null) => entete?.getBoundingClientRect().bottom ?? hauteurNavbarPx();

type Onglet = "AT" | "PSA" | "NT" | "AUTRES";
const LIBELLE_ONGLET: Record<Onglet, string> = {
  AT: "Ancien Testament", PSA: "Psaumes", NT: "Nouveau Testament", AUTRES: "Écrits non canoniques",
};

// ── Petite fenêtre d'édition d'un verset (administrateur) ─────────────────────────────
// Ouverte par le crayon qui paraît au survol d'une cellule. Une barre d'outils insère les
// marques que le corpus admet dans le texte biblique : l'italique se porte en <i>…</i>
// (Sacy : mots ajoutés par le traducteur, absents de la Vulgate), plus les espaces
// insécables et les guillemets. Le droit réel est revérifié côté serveur (charte §17).
function ModaleEditionVerset({ reference, valeurInitiale, statut, onEnregistrer, onFermer }: {
  reference: string; valeurInitiale: string; statut: "idle" | "envoi" | "ok" | "erreur";
  onEnregistrer: (valeur: string) => void; onFermer: () => void;
}) {
  const [valeur, setValeur] = useState(valeurInitiale);
  const ta = useRef<HTMLTextAreaElement>(null);
  const boite = useRef<HTMLDivElement>(null);
  useFenetreModale(boite);
  const outil: React.CSSProperties = { fontSize: '0.6875rem', padding: "4px 9px", borderRadius: 4, border: "1px solid var(--cs-bord)", background: "var(--cs-surface)", color: "var(--cs-texte-fort)", cursor: "pointer", fontFamily: "inherit", lineHeight: 1 };
  const entourer = (avant: string, apres: string = avant) => {
    const el = ta.current; if (!el) return;
    const d = el.selectionStart, f = el.selectionEnd, sel = valeur.slice(d, f) || "texte";
    setValeur(valeur.slice(0, d) + avant + sel + apres + valeur.slice(f));
    setTimeout(() => { el.focus(); el.setSelectionRange(d + avant.length, d + avant.length + sel.length); }, 0);
  };
  const inserer = (t: string) => {
    const el = ta.current; if (!el) return;
    const d = el.selectionStart, f = el.selectionEnd;
    setValeur(valeur.slice(0, d) + t + valeur.slice(f));
    setTimeout(() => { el.focus(); el.setSelectionRange(d + t.length, d + t.length); }, 0);
  };
  return (
    <div onClick={onFermer} style={{ position: "fixed", inset: 0, background: "rgba(30,25,20,0.4)", zIndex: Z_MODALE, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div ref={boite} role="dialog" aria-modal="true" aria-label={`Modifier ${reference}`} onClick={e => e.stopPropagation()} style={{ background: "var(--cs-surface)", borderRadius: 8, padding: "18px 20px", width: 520, maxWidth: "100%", boxShadow: "var(--cs-ombre-modale)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
          <p style={{ margin: 0, fontSize: '0.78125rem', fontWeight: 600, color: VERT }}>Modifier — {reference}</p>
          <button onClick={onFermer} aria-label="Fermer" title="Fermer" style={{ border: "none", background: "none", cursor: "pointer", fontSize: '0.9375rem', color: "var(--cs-texte-doux)", lineHeight: 1, padding: 0 }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => entourer("**", "**")} title="Gras" style={{ ...outil, fontWeight: 700 }}>G</button>
          <button onClick={() => entourer("<i>", "</i>")} title="Italique — mots ajoutés par le traducteur" style={{ ...outil, fontStyle: "italic" }}>I</button>
          <button onClick={() => entourer("++", "++")} title="Petites capitales" style={{ ...outil, fontVariant: "small-caps", letterSpacing: "0.03em" }}>Pc</button>
          <button onClick={() => entourer("^^", "^^")} title="Exposant" style={outil}>x<sup style={{ fontSize: "0.7em" }}>2</sup></button>
          <span style={{ width: 1, alignSelf: "stretch", background: "var(--cs-bord-clair)" }} />
          <button onClick={() => inserer(" ")} title="Espace insécable" style={outil}>Esp. inséc.</button>
          <button onClick={() => inserer(" ")} title="Espace fine insécable" style={outil}>Esp. fine</button>
          <button onClick={() => entourer("« ", " »")} title="Guillemets français" style={outil}>« »</button>
          <button onClick={() => entourer("“", "”")} title="Guillemets anglais (citation imbriquée)" style={outil}>“”</button>
        </div>
        <textarea aria-label="Texte du verset" ref={ta} autoFocus value={valeur} onChange={e => setValeur(e.target.value)}
          onKeyDown={e => { if (e.key === "Escape") onFermer(); if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onEnregistrer(valeur); }}
          rows={5}
          style={{ width: "100%", boxSizing: "border-box", fontSize: '0.84375rem', lineHeight: 1.5, fontFamily: "var(--font-source-serif), Georgia, serif", padding: "9px 11px", border: "1px solid var(--cs-bord)", borderRadius: 4, background: "var(--cs-fond-clair)", color: "var(--cs-texte-fort)", outline: "none", resize: "vertical" }} />
        {/* Aperçu en direct : l'apparence enrichie du verset, telle qu'elle s'affichera. */}
        <div style={{ marginTop: 8 }}>
          <span style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: "var(--cs-texte-second)" }}>Aperçu</span>
          <div style={{ marginTop: 3, minHeight: "2.4em", fontSize: '0.84375rem', lineHeight: 1.55, fontFamily: "var(--font-source-serif), Georgia, serif", color: "var(--cs-texte-fort)", padding: "8px 11px", border: "1px solid var(--cs-fond-doux)", borderRadius: 4, background: "var(--cs-surface)" }}>
            {valeur.trim() ? texteEnrichi(valeur) : <span style={{ color: "var(--cs-bord)", fontStyle: "italic" }}>—</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
          {statut === "erreur" && <span style={{ fontSize: '0.6875rem', color: ROUGE, marginRight: "auto" }}>échec de l’enregistrement</span>}
          <button onClick={onFermer} style={{ padding: "5px 12px", fontSize: '0.71875rem', borderRadius: 4, border: "1px solid var(--cs-bord)", background: "var(--cs-surface)", color: "var(--cs-texte-gris)", cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          <button onClick={() => onEnregistrer(valeur)} disabled={statut === "envoi"}
            style={{ padding: "5px 15px", fontSize: '0.71875rem', borderRadius: 4, border: "none", background: VERT, color: "var(--cs-sur-aplat)", cursor: statut === "envoi" ? "default" : "pointer", fontFamily: "inherit", fontWeight: 500 }}>
            {statut === "envoi" ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Petites actions de la colonne N° (lecteur) : citer, signaler ──────────────────────
// Mêmes symboles que les pages Bible et Œuvre : le signet ajoute le verset à « mes
// citations », le point d'exclamation ouvre un signalement. Discrets, révélés au survol.
// ⛔ Le gabarit vient du module partagé : les quatre surfaces montraient la même
// marque dans des boîtes de 16, 18 et 19 px. Le signet aussi — la Polyglotte en
// gardait une copie, au tracé près identique à `IconeSignet`.
const ACT_BTN = STYLE_BOUTON_ACTION;
// Signalement : le composant partagé IconeSignalement (SVG), au même gabarit exact que le
// signet de prélèvement — les deux SVG restent donc toujours de la même taille.

// Bouton « citer » à bascule : ajoute le verset à « mes citations » s'il n'y est pas,
// l'en retire s'il y est déjà (signet plein = enregistré). Réservé aux comptes connectés.
function BoutonCiterVerset({ userId, saved, cle, refLivre, refAbr, chapitre, verset, texte, traductionLabel, tradId, onSaved, onRemoved }: {
  userId: string | null; saved: string | null; cle: string; refLivre: string; refAbr: string; chapitre: number; verset: number;
  texte: string; traductionLabel: string; tradId: string; onSaved: (cle: string, id: string) => void; onRemoved: (cle: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [survol, setSurvol] = useState(false);
  if (!userId) return null;
  const basculer = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    // ⛔ Le signet ne dit « retiré » que si la base l'a retiré (audit du 2026-09-23) : il
    // se vidait sur un échec, et le prélèvement reparaissait au rechargement.
    try {
      if (saved) {
        const { error } = await supabase.from("prelevements").delete().eq("id", saved).eq("user_id", userId);
        if (error) console.error("[polyglotte] retrait d'une citation impossible :", error);
        else onRemoved(cle);
      } else {
        const { data, error } = await supabase.from("prelevements").insert({
          user_id: userId, type: "biblique",
          ref_livre: refLivre, ref_livre_abr: refAbr,
          ref_chapitre: chapitre, ref_verset: verset,
          texte: texteSansEnrichissement(texte), traduction: traductionLabel, trad_id: codeDeTraduction(tradId),
        }).select("id").single();
        if (error) console.error("[polyglotte] enregistrement d'une citation impossible :", error);
        else if (data) { onSaved(cle, data.id); signalerProgression(); }
      }
    } finally {
      setBusy(false);
    }
  };
  // Enregistré : signet plein (vert) ; au survol, il cède la place à une croix pour
  // signifier « cliquer = retirer de la liste ».
  // ⛔ UNE PETITE CROIX ROUGE TRACÉE, EN FONDU (demande de l'auteur, 2026-09-23 : « la croix
  // est immonde, pas fluide ; faire une petite croix rouge sobre »). C'était le glyphe ✕,
  // posé à la place du signet d'un coup : plus gros que lui, dessiné par la police, et le
  // bouton changeait de contenu sous le curseur. Les deux marques vivent désormais l'une
  // sur l'autre, et c'est leur opacité qui passe de l'une à l'autre.
  const montrerCroix = !!saved && survol && !busy;
  return (
    <Bulle texte={saved ? "Retirer de mes citations" : "Ajouter à mes citations"}>
    <button onClick={basculer} className="poly-act"
      onMouseEnter={() => setSurvol(true)} onMouseLeave={() => setSurvol(false)}
      onFocus={() => setSurvol(true)} onBlur={() => setSurvol(false)}
      style={{ ...ACT_BTN, color: saved ? VERT : "var(--cs-texte-doux)" }}
      aria-label={saved ? "Retirer de mes citations" : "Ajouter à mes citations"}>
      {busy ? "…" : (
        <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ display: "inline-flex", opacity: montrerCroix ? 0 : 1, transition: "opacity .15s ease" }}>
            <IconeSignet plein={!!saved} />
          </span>
          <span aria-hidden="true" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cs-danger)", opacity: montrerCroix ? 1 : 0, transition: "opacity .15s ease", pointerEvents: "none" }}>
            <IconeCroix size={8} />
          </span>
        </span>
      )}
    </button>
    </Bulle>
  );
}

function BoutonSignalerVerset({ refLisible, texte }: { refLisible: string; texte?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const { exigerCompte } = useCompte();
  const envoyer = async (message: string, importance?: string) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch("/api/signalements", {
      method: "POST", headers,
      body: JSON.stringify({ reference: refLisible, message, importance, url_source: typeof window !== "undefined" ? window.location.href : null }),
    });
    // ⚠️ Le verrou de bêta REDIRIGE au lieu de refuser : sa page revient en 200.
    if (!res.ok || res.redirected) throw new Error("échec du signalement");
  };
  return (
    <>
      <Bulle texte="Signaler une erreur">
        <button onClick={e => { e.stopPropagation(); if (exigerCompte("signaler une erreur")) setOuvert(true); }} className="poly-act"
          style={{ ...ACT_BTN, color: "var(--cs-texte-doux)" }} aria-label="Signaler"><IconeSignalement /></button>
      </Bulle>
      {ouvert && <ModalSignalement titre={refLisible} texteObjet={texte || undefined} avecNiveauImportance onClose={() => setOuvert(false)} onEnvoyer={envoyer} />}
    </>
  );
}

// Cellule sans texte : une mention centrée, de la voix commune aux deux grilles de
// comparaison (`STYLE_MENTION`, `app/lib/compositionBible.ts`), qui dit clairement que la
// traduction ne porte pas ce verset au lieu d'un tiret muet. Pour les passages
// deutérocanoniques, l'infobulle explique POURQUOI la case est vide.
function CelluleAbsente({ deutero }: { deutero?: boolean }) {
  // ⛔ PLUS DE CURSEUR D'AIDE SUR L'ABSENCE ORDINAIRE (demande de l'auteur, 2026-09-04 :
  // « au survol de "Absent de cette traduction" j'ai un curseur différent, avec un point
  // d'interrogation, mais aucun texte ne s'affiche ; ça n'a donc aucun sens »).
  // L'infobulle ne disait que « Cette traduction ne porte pas ce verset », c'est-à-dire
  // la mention elle-même en d'autres mots : le curseur promettait une explication qui
  // n'existait pas. La mention se suffit — c'est ce pour quoi elle a été écrite.
  // ⚠️ Le cas DEUTÉROCANONIQUE garde les deux : là, l'infobulle dit POURQUOI la case est
  // vide, ce que quatre mots ne peuvent pas tenir.
  if (!deutero) return <span style={STYLE_MENTION}>{MENTION_ABSENT}</span>;
  return (
    <span
      title="Ce passage nous est parvenu en grec, non en hébreu. Les Bibles catholique et orthodoxe le reçoivent ; la Bible protestante et la Bible hébraïque ne le comptent pas parmi les livres canoniques. La case est donc vide pour cette traduction, et non par oubli."
      style={{ ...STYLE_MENTION, cursor: "help" }}>
      {MENTION_DEUTERO}
    </span>
  );
}

// ⛔ La case qu'un verset COUVRE sans y commencer : elle dit où le texte se lit, et elle
// le dit dans la numérotation de l'ÉDITION — jamais dans celle du canon (charte § 15.1.2 :
// « les références natives du témoin restent accessibles et ne sont jamais remplacées par
// le numéro AELF »). ⚠️ Le texte n'est PAS répété : un verset ne se lit qu'une fois.
// ⚠️ Le suffixe natif se tait pour la Vulgate, comme il se tait dans sa lettrine.
function CelluleEmpan({ ligne, chapitreDuCreneau, sansSuffixe }: { ligne: V2Row; chapitreDuCreneau: number; sansSuffixe?: boolean }) {
  const suffixe = sansSuffixe ? "" : (ligne.v_orig_suffixe ?? "");
  const ref = ligne.ch_orig === chapitreDuCreneau
    ? `${ligne.v_orig}${suffixe}`
    : `${ligne.ch_orig}, ${ligne.v_orig}${suffixe}`;
  return (
    <span title={MENTION_EMPAN_TITRE} style={{ ...STYLE_MENTION, cursor: "help" }}>{mentionEmpan(ref)}</span>
  );
}

// La colonne qu'on vient de choisir, dont le texte arrive : la cellule le DIT, au lieu
// de se donner pour absente. ⚠️ Même voix que les autres mentions — c'est l'éditeur qui
// parle à la place d'un texte qui n'est pas là, et ici il ne le sera qu'un instant.
function CelluleEnAttente() {
  return <span style={STYLE_MENTION}>{MENTION_ATTENTE}</span>;
}

// ── La référence d'origine d'un verset, et sa note ─────────────────────────────────
// Chapitre ET verset, toujours : la référence d'origine ne se lit qu'entière. Le chapitre est
// composé plus clair, pour que le verset se détache. ⚠️ Le suffixe se tait pour la Vulgate.
const suffixeOrigine = (ligne: V2Row) => (ligne.trad_id === "TR0004" ? "" : (ligne.v_orig_suffixe ?? ""));
const referenceOrigine = (ligne: V2Row) => `${ligne.ch_orig}, ${ligne.v_orig}${suffixeOrigine(ligne)}`;

// Une intervention d'alignement laisse sa trace dans `notes` : le lecteur voit QU'il y a eu
// intervention, et le survol lui dit LAQUELLE. Rien n'est corrigé en silence.
// ⚠️ Charte § 52.3 : un alignement « à revoir » est un doute d'atelier, montré à
// l'administration seule.
const noteMontree = (ligne: V2Row, estAdmin: boolean): string | null =>
  ligne.notes && (estAdmin || ligne.notes !== NOTE_ALIGNEMENT_A_REVOIR) ? ligne.notes : null;
// ⚠️ L'infobulle et le nom accessible sont du TEXTE BRUT : les balises d'italique qu'une note
// d'édition porte (argument d'un psaume chez Sacy, note de saint Jérôme) s'y liraient telles
// quelles, et l'entité « &amp; » avec elles.
const noteEnTexteBrut = (note: string) => note.replace(/<\/?i>/g, "").replace(/&amp;/g, "&");

function RefOrigine({ ligne, note }: { ligne: V2Row; note: string | null }) {
  return (
    <>
      <span className="poly-lettrine-ch">{ligne.ch_orig},</span> {ligne.v_orig}{suffixeOrigine(ligne)}
      {/* ⛔ Un cercle à point d'exclamation, et non plus un crayon (décision de l'auteur,
          14 septembre 2026) : le crayon disait « modifier », qui est le geste de
          l'administrateur, posé juste à côté. Sa mesure vit dans la feuille. */}
      {note ? (
        <span className="poly-note-marque" role="img" aria-label={`Note éditoriale : ${noteEnTexteBrut(note)}`} title={noteEnTexteBrut(note)}>
          <IconeSignalement />
        </span>
      ) : null}
    </>
  );
}

// Le crayon de l'administrateur : il se pose SUR la référence et la recouvre au survol de la
// cellule (voir « .poly-edit »). Son fond est celui de la ligne, qu'on lui passe.
function BoutonEditionVerset({ ligne, fond, onEditer }: { ligne: V2Row; fond: string; onEditer: (ligne: V2Row) => void }) {
  return (
    <button title="Modifier ce verset" aria-label="Modifier ce verset" className="poly-edit"
      onClick={() => onEditer(ligne)}
      style={{ border: "none", cursor: "pointer", color: 'var(--cs-texte-second)', fontSize: '0.6875rem', lineHeight: 1, background: fond, transition: "color .15s" }}
      onMouseEnter={e => { e.currentTarget.style.color = VERT; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--cs-texte-second)'; }}>
      <IconeCrayon size={11} />
    </button>
  );
}

// Cellule de la colonne « Notes » : vide, elle montre une invite centrée et discrète
// (« Note sur Gn 1, 6 ») ; au clic, elle devient une vraie zone de saisie (sans poignée
// d'étirement). L'enregistrement se fait via `onChange` (débouncé côté parent).
function CelluleNote({ valeur, refLisible, onChange, cleFoyer }: {
  valeur: string; refLisible: string; onChange: (t: string) => void; cleFoyer: string;
}) {
  const [focus, setFocus] = useState(false);
  const demarrer = useRef(false);
  const vide = !valeur.trim();
  if (vide && !focus) {
    return (
      <button onClick={() => { demarrer.current = true; setFocus(true); }} tabIndex={-1}
        data-poly-cellule={cleFoyer} data-poly-colonne="notes"
        style={{ ...STYLE_INVITE, width: "100%", minHeight: "1.9rem", display: "flex", alignItems: "center", justifyContent: "center",
          background: "none", border: "none", borderRadius: 4, cursor: "text", padding: "3px 6px" }}>
        Prendre une note sur {refLisible}
      </button>
    );
  }
  return (
    <textarea aria-label={`Note sur ${refLisible}`} value={valeur} onChange={e => onChange(e.target.value)}
      ref={el => { if (el && demarrer.current) { el.focus(); demarrer.current = false; } }}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{ width: "100%", resize: "none", minHeight: "1.9rem", boxSizing: "border-box", border: "1px solid var(--cs-bord-clair)", borderRadius: 4,
        background: "var(--cs-surface)", padding: "3px 6px", fontFamily: "var(--font-source-sans), Arial, sans-serif",
        fontSize: "0.71875rem", lineHeight: 1.35, color: "var(--cs-texte-fort)", outline: "none" }} />
  );
}

// Groupes du menu de traductions, par langue. Leur ORDRE seul survit dans le menu : les
// rubriques sont parties avec le modèle de la page Bible (voir `ChoixTraduction`).
const GROUPES_LANG: { code: string; label: string }[] = [
  { code: "fr", label: "Français" },
  { code: "la", label: "Latin" },
  { code: "grc", label: "Grec" },
];

// ── Les éditions qui portent PLUSIEURS textes ─────────────────────────────────
// Une même édition donne parfois plusieurs textes, et ce sont eux que l'on veut lire en
// regard l'un de l'autre : la Fillion imprime le latin en face de sa traduction
// française ; la Bible du XIIIe siècle se lit dans l'état du manuscrit, dans sa
// transcription diplomatique, ou dans la traduction moderne qu'on en a faite. Dispersés
// dans une liste rangée par langue, ces textes n'ont plus l'air d'appartenir au même
// livre. Le menu les réunit donc sous le nom de l'édition, et les déploie AU SURVOL dans
// un volet posé sur le côté.
//
// Le premier membre disponible donne son nom à la famille et sa place dans le menu. Un
// membre d'une AUTRE langue que lui reste par ailleurs listé dans son propre groupe (la
// Vulgate de Fillion sous « Latin ») : la famille rassemble, elle ne cache rien, et l'on
// continue de lire les langues d'un coup d'œil. Une famille dont un seul texte est
// disponible ne se déploie pas — TR0013 est privée et ne répond qu'à l'administrateur :
// chez le lecteur, elle redevient une ligne ordinaire.
type MembreFamille = { id: string; libelle: string; titre?: string; source?: boolean };
const FAMILLES: MembreFamille[][] = [
  [
    { id: "TR0010", libelle: "Traduction française" },
    { id: "TR0011", libelle: "Texte latin en regard", titre: "La Vulgate latine, imprimée en regard du français dans l’édition Fillion", source: true },
  ],
  [
    { id: TRAD_ID_BIBLE899, libelle: "Texte du manuscrit", titre: "Le texte du manuscrit, abréviations développées", source: true },
    { id: TRAD_ID_899_DIPLO, libelle: "Transcription diplomatique", titre: "Le manuscrit lettre à lettre, ses abréviations non résolues" },
    { id: "TR0013", libelle: "Traduction en français moderne" },
  ],
];

type Membre = { trad: Trad; libelle: string; titre?: string; source?: boolean };
type Famille = { cle: string; principal: Trad; membres: Membre[] };
type Entree = { sorte: "trad"; trad: Trad } | { sorte: "famille"; famille: Famille };

// Ce qu'il faut d'une entrée pour la ranger : son millésime et son rang de base. Une
// FAMILLE se range sur son membre PRINCIPAL, qui est le nom sous lequel elle paraît.
const clefDeRang = (e: Entree): RangeableParMillesime => {
  const t = e.sorte === "famille" ? e.famille.principal : e.trad;
  return { millesime: t.edition, ordre: t.ordre };
};
const comparerParDate = (a: Entree, b: Entree) => comparerParMillesime(clefDeRang(a), clefDeRang(b));

// Le menu, groupe de langue par groupe de langue, familles comprises. Chaque groupe est
// rangé par DATE (demande de l'auteur, 2026-09-04) ; une famille prend la place de son
// membre principal, et se range donc au millésime de celui-ci.
function entreesParLangue(trads: Trad[]): Map<string, Entree[]> {
  const parId = new Map(trads.map(t => [t.trad_id, t]));
  const familles = new Map<string, Famille>();   // trad_id du principal → sa famille
  const absorbes = new Set<string>();            // membres que la famille porte déjà
  for (const def of FAMILLES) {
    const membres: Membre[] = [];
    for (const m of def) {
      const trad = parId.get(m.id);
      if (trad) membres.push({ trad, libelle: m.libelle, titre: m.titre, source: m.source });
    }
    if (membres.length < 2) continue;
    const principal = membres[0].trad;
    familles.set(principal.trad_id, { cle: principal.trad_id, principal, membres });
    for (const m of membres) if (m.trad.lang === principal.lang) absorbes.add(m.trad.trad_id);
  }
  const parLangue = new Map<string, Entree[]>();
  const poser = (lang: string, e: Entree) => {
    const liste = parLangue.get(lang) ?? [];
    liste.push(e);
    parLangue.set(lang, liste);
  };
  for (const t of trads) {
    const f = familles.get(t.trad_id);
    if (f) poser(t.lang, { sorte: "famille", famille: f });
    else if (!absorbes.has(t.trad_id)) poser(t.lang, { sorte: "trad", trad: t });
  }
  for (const [lang, liste] of parLangue) parLangue.set(lang, [...liste].sort(comparerParDate));
  return parLangue;
}

// ── Un RÉGLAGE du volet ne se compose pas en boutons ──────────────────────────
// « Traductions visibles » alignait cinq pilules bordées et arrondies pour un réglage
// qu'on touche une fois par visite : cinq cadres, cinq fonds, cinq rayons, dans un volet
// où la liste des livres n'en porte aucun (décision de l'auteur, 2026-09-04 : « remettre
// en forme de façon plus élégante, sans effet “bouton” »). Les valeurs se lisent
// désormais en clair ; la retenue prend l'accent et la demi-graisse, les autres l'encre
// douce. ⛔ Ni cadre, ni fond, ni rayon.
//
// ⚠️ UNE ÉCHELLE se lit en RANG, des interrupteurs INDÉPENDANTS se lisent en COLONNE.
// « Auto · 2 · 3 · 4 · 5 » est une échelle de cinq valeurs courtes dont on ne retient
// qu'une : le rang la donne d'un coup d'œil, et le point médian est le séparateur du
// site. « Lignes problématiques » et « Surnuméraires » sont deux états qu'on allume ou
// qu'on éteint, et longs : une option par ligne, comme le volet de la page Bible.
const CHOIX_DISCRET = (actif: boolean, teinte: string): React.CSSProperties => ({
  background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left",
  fontFamily: "var(--font-source-sans), Arial, sans-serif",
  fontSize: "0.6875rem", lineHeight: 1.4,
  fontWeight: actif ? 600 : 400,
  color: actif ? teinte : "var(--cs-texte-gris)",
  whiteSpace: "nowrap",
});

// ── L'ÉCHELLE se compose en CASES, sur toute la largeur du volet ──────────────
// Rectification du 2026-09-04, le soir : « pas de points médians moches ; plutôt de
// jolies cases propres sur l'ensemble de la largeur ». La veille, les cinq pilules
// bordées avaient cédé la place à cinq valeurs en clair séparées par le point médian
// du site — le remède avait retiré un ornement de trop et laissé un rang de mots qui
// ne se lisait plus comme un réglage. Cinq cases égales, un seul cadre autour d'elles,
// un filet entre elles : c'est le contrôle segmenté, il occupe la mesure du volet, et
// l'on voit d'un coup d'œil combien de valeurs il offre et laquelle est retenue.
//
// ⛔ CE N'EST PAS LE RETOUR DES PILULES. Une pilule est un objet par valeur — cinq
// cadres, cinq fonds, cinq rayons ; ici il n'y a qu'UN cadre et qu'UN rayon pour les
// cinq, et les cases n'existent que par le filet qui les sépare. Un réglage reste un
// réglage, il ne devient pas cinq boutons.
//
// ⚠️ NI FOND NI ENCRE EN LIGNE : ils vivent dans la feuille, avec le survol et l'état
// retenu. Une déclaration en ligne bat toujours une règle de feuille sans
// « important », et c'est ainsi que le survol du titre de colonne était mort sans que
// rien ne le dise (voir la note de la feuille, plus bas).
const RANGEE_CASES: React.CSSProperties = {
  display: "flex", width: "100%",
  border: "1px solid var(--cs-bord)", borderRadius: 4, overflow: "hidden",
};
const CASE_ECHELLE = (premiere: boolean): React.CSSProperties => ({
  flex: 1, minWidth: 0, padding: "4px 0", textAlign: "center", cursor: "pointer",
  border: "none", borderLeft: premiere ? "none" : "1px solid var(--cs-bord)", borderRadius: 0,
  fontFamily: "var(--font-source-sans), Arial, sans-serif",
  fontSize: "0.6875rem", lineHeight: 1.4,
});

// Le menu ne dépasse jamais cette largeur : deux noms de bible et leur flèche y tiennent
// d'ordinaire sur une ligne, et une ligne plus longue se replie plutôt que de sortir de la
// fenêtre.
const LARGEUR_MAX_MENU_REM = 24;

// ⛔ LE MENU DES TRADUCTIONS PREND LE MODÈLE DE LA PAGE BIBLE (décision de l'auteur,
// 14 septembre 2026 : « dans le menu déroulant des bibles, reprendre le modèle de la page
// Bible classique »). Il portait seul une coche, un millésime, des rubriques de langue et un
// sous-menu coiffé du nom de sa famille. Ses lignes, son cadre, son chevron et sa circulation
// au clavier viennent désormais de `app/lib/stylesMenuBibles.ts`, que la page Bible emploie
// aussi. Les langues gardent leur ORDRE (français, latin, grec, chacune rangée par date) et
// perdent leur rubrique : le nom dit la bible, et la page Bible n'en dit pas davantage.
//
// ⚠️ Deux choses restent propres à cette page, et elles tiennent à la grille. Le menu vit
// dans un PORTAIL : l'en-tête collant rognerait sinon sa boîte. Et une traduction déjà
// affichée dans une autre colonne se choisit quand même, les deux colonnes s'échangeant.
// ⛔ Le nom de celle qu'on déplace n'est plus écrit (décision de l'auteur, 2026-09-23 : « je
// veux qu'on y renonce ») : au survol d'une autre traduction, c'est la ligne de la traduction
// RETENUE qui passe au rouge, avec « Remplacer ? ». Elle dit ce qui va partir.
// La ligne de la traduction RETENUE, quand la main se pose sur une autre : elle va partir.
const STYLE_LIGNE_A_REMPLACER: React.CSSProperties = { background: "var(--cs-danger-fond)", color: "var(--cs-danger-fonce)" };

function MentionRemplacer() {
  return (
    <span style={{ marginLeft: "auto", flexShrink: 0, fontFamily: "var(--font-source-sans), Arial, sans-serif", fontSize: "0.6875rem", fontWeight: 600, fontStyle: "italic", letterSpacing: "0.01em", color: "var(--cs-danger-fonce)" }}>
      Remplacer ?
    </span>
  );
}

function ChoixTraduction({ trads, disponibles, slots, index, onChoisir }: {
  trads: Trad[]; disponibles: Trad[]; slots: string[]; index: number; onChoisir: (index: number, val: string) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; minWidth: number } | null>(null);
  // La famille déployée, et l'endroit où poser son sous-menu : mesuré sur la ligne au moment
  // où on la survole, jamais déduit du menu, qui défile. À gauche de la ligne, le sous-menu
  // se pose par son bord DROIT, pour grandir vers la gauche sans recouvrir la ligne.
  const [volet, setVolet] = useState<{ cle: string; top: number; left?: number; right?: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panRef = useRef<HTMLDivElement>(null);
  const voletRef = useRef<HTMLDivElement>(null);
  const lignes = useRef<(HTMLButtonElement | null)[]>([]);
  const sousLignes = useRef<(HTMLButtonElement | null)[]>([]);
  // Repli DIFFÉRÉ : entre la ligne et son sous-menu, le curseur traverse quelques pixels qui
  // n'appartiennent ni à l'une ni à l'autre. Sans ce délai, le sous-menu se replierait au
  // moment même où l'on tend la main pour le prendre.
  const fermeture = useRef<number | null>(null);
  // La liste où la main se pose sur une AUTRE traduction que la retenue : la ligne retenue de
  // cette liste passe alors au rouge, avec « Remplacer ? » (2026-09-23).
  const [survolAutre, setSurvolAutre] = useState<"menu" | "volet" | null>(null);
  const courante = trads.find(t => t.trad_id === slots[index]) ?? null;
  const entrees = useMemo(() => {
    const parLangue = entreesParLangue(disponibles);
    return GROUPES_LANG.flatMap(g => parLangue.get(g.code) ?? []);
  }, [disponibles]);
  const rangActif = Math.max(0, entrees.findIndex(e => e.sorte === "trad"
    ? e.trad.trad_id === slots[index]
    : e.famille.membres.some(m => m.trad.trad_id === slots[index])));
  const rangDeploye = volet ? entrees.findIndex(e => e.sorte === "famille" && e.famille.cle === volet.cle) : -1;
  const entreeDeployee = rangDeploye >= 0 ? entrees[rangDeploye] : null;
  const familleDeployee = entreeDeployee?.sorte === "famille" ? entreeDeployee.famille : null;
  // Le texte d'origine de l'édition ouvre son sous-menu (décision de l'auteur, 2026-09-13,
  // la même que sur la page Bible).
  const membresDeployes = familleDeployee
    ? [...familleDeployee.membres].sort((a, b) => Number(Boolean(b.source)) - Number(Boolean(a.source)))
    : [];

  const retenirVolet = useCallback(() => {
    if (fermeture.current) { window.clearTimeout(fermeture.current); fermeture.current = null; }
  }, []);
  const replierBientot = () => {
    retenirVolet();
    fermeture.current = window.setTimeout(() => { fermeture.current = null; setVolet(null); }, DELAI_REPLI_MS);
  };
  // Fermer le menu emporte le sous-menu : sans quoi il reparaîtrait tel quel à la prochaine
  // ouverture, déployé sur une famille qu'on ne survole plus.
  const fermer = useCallback((rendreLeFoyer: boolean) => {
    retenirVolet();
    setVolet(null);
    setSurvolAutre(null);
    setOuvert(false);
    if (rendreLeFoyer) btnRef.current?.focus();
  }, [retenirVolet]);

  // Le menu se referme comme tout menu du site : au pointeur posé à côté, et à la touche
  // d'échappement. Les deux écouteurs ne vivent que tant qu'il est ouvert.
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: PointerEvent) => {
      const cible = e.target as Node;
      if (btnRef.current?.contains(cible) || panRef.current?.contains(cible) || voletRef.current?.contains(cible)) return;
      fermer(false);
    };
    const touche = (e: KeyboardEvent) => { if (e.key === "Escape") fermer(true); };
    document.addEventListener("pointerdown", dehors);
    document.addEventListener("keydown", touche);
    return () => { document.removeEventListener("pointerdown", dehors); document.removeEventListener("keydown", touche); };
  }, [ouvert, fermer]);
  // Le compte à rebours du sous-menu ne survit pas au démontage.
  useEffect(() => () => { if (fermeture.current) window.clearTimeout(fermeture.current); }, []);
  // À l'ouverture, le clavier arrive sur la bible de la colonne, ou sur sa famille : c'est le
  // point de départ naturel pour en changer.
  useEffect(() => {
    if (ouvert) lignes.current[rangActif]?.focus({ preventScroll: true });
  }, [ouvert, rangActif]);

  const basculer = () => {
    if (ouvert) { fermer(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const racine = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const largeurMax = LARGEUR_MAX_MENU_REM * racine;
      setRect({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - largeurMax - 8)), minWidth: Math.max(r.width, 230) });
    }
    setOuvert(true);
  };
  const choisir = (val: string) => { onChoisir(index, val); fermer(true); };
  // Un sous-menu s'ouvre du côté où il tient : à droite de la ligne, à gauche sinon.
  const deployer = (cle: string, el: HTMLElement, nb: number) => {
    retenirVolet();
    const r = el.getBoundingClientRect();
    const racine = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const largeur = LARGEUR_SOUS_MENU_REM * racine;
    // La hauteur d'une ligne : son rembourrage, son filet et une ligne de texte.
    const haut = nb * (23 + 0.8125 * racine * 1.3) + 2;
    const top = Math.max(8, Math.min(r.top - 1, window.innerHeight - 8 - haut));
    setVolet(r.right + 4 + largeur + 8 <= window.innerWidth
      ? { cle, top, left: r.right + 4 }
      : { cle, top, right: Math.max(8, window.innerWidth - r.left + 4) });
  };
  // Flèches, début et fin : on ne change de bible qu'à la validation, se déplacer ne recharge rien.
  const circuler = (e: React.KeyboardEvent, rang: number, liste: (HTMLButtonElement | null)[], total: number) => {
    const cible = rangDeCirculation(e.key, rang, total);
    if (cible === null) return false;
    e.preventDefault();
    liste[cible]?.focus();
    return true;
  };

  // Une traduction, dans le menu ou dans le sous-menu d'une famille. Dans un sous-menu,
  // `libelle` dit ce que ce texte est DANS son édition (« Texte latin en regard ») : le nom de
  // l'édition est porté par la ligne de la famille.
  // ⛔ Une traduction déjà affichée dans une autre colonne se choisit quand même. Son nom
  // garde la forme de la ligne ; la flèche à double sens et le nom de la colonne courante,
  // celui qu'elle va déplacer, la suivent en glose plus petite et grisée (2026-09-23).
  const optionTrad = (t: Trad, rang: number, total: number, dansVolet: boolean, libelle?: string, titre?: string) => {
    const actif = slots[index] === t.trad_id;
    const aRemplacer = actif && survolAutre === (dansVolet ? "volet" : "menu");
    const liste = dansVolet ? sousLignes : lignes;
    return (
      <button key={t.trad_id} type="button" role="menuitemradio" aria-checked={actif} title={titre}
        ref={el => { liste.current[rang] = el; }}
        onClick={() => choisir(t.trad_id)}
        onKeyDown={e => {
          if (circuler(e, rang, liste.current, total)) return;
          if (dansVolet && e.key === "ArrowLeft") {
            e.preventDefault();
            retenirVolet();
            setVolet(null);
            lignes.current[rangDeploye]?.focus();
          }
        }}
        onMouseEnter={e => {
          if (!dansVolet && volet) { retenirVolet(); setVolet(null); }
          if (!actif) { e.currentTarget.style.background = FOND_SURVOL_MENU; setSurvolAutre(dansVolet ? "volet" : "menu"); }
        }}
        onMouseLeave={e => { if (!actif) { e.currentTarget.style.background = "var(--cs-surface)"; setSurvolAutre(null); } }}
        onFocus={() => setSurvolAutre(actif ? null : dansVolet ? "volet" : "menu")}
        style={{ ...styleLigneMenu(actif, rang === 0, rang === total - 1), ...(aRemplacer ? STYLE_LIGNE_A_REMPLACER : null) }}>
        <span style={{ minWidth: 0 }}>{rendreEnrichi(libelle ?? t.nom)}</span>
        {aRemplacer && <MentionRemplacer />}
      </button>
    );
  };

  // Une FAMILLE : son nom commun, un chevron, et au survol le sous-menu de ses textes.
  // ⛔ Le clic ne se perd pas dans le sous-menu : il ouvre le texte d'origine, que le
  // sous-menu met en tête (décision de l'auteur, 2026-09-13). Le clavier suit : Entrée
  // choisit, la flèche droite déploie.
  const optionFamille = (f: Famille, rang: number, total: number) => {
    const actif = f.membres.some(m => m.trad.trad_id === slots[index]);
    const deploye = volet?.cle === f.cle;
    const aRemplacer = actif && survolAutre === "menu";
    const defaut = (f.membres.find(m => m.source) ?? f.membres[0])?.trad.trad_id;
    const nom = nomCommun(f.principal.nom);
    return (
      <button key={f.cle} type="button" role="menuitem" aria-haspopup="menu" aria-expanded={deploye}
        ref={el => { lignes.current[rang] = el; }}
        title={`${nom} : ${f.membres.map(m => m.libelle).join(", ")}`}
        onClick={() => { if (defaut) choisir(defaut); }}
        onMouseEnter={e => { deployer(f.cle, e.currentTarget, f.membres.length); setSurvolAutre(actif ? null : "menu"); }}
        onMouseLeave={() => { replierBientot(); if (!actif) setSurvolAutre(null); }}
        onFocus={() => setSurvolAutre(actif ? null : "menu")}
        onKeyDown={e => {
          if (circuler(e, rang, lignes.current, total)) return;
          if (e.key === "ArrowRight") {
            e.preventDefault();
            deployer(f.cle, e.currentTarget, f.membres.length);
            window.setTimeout(() => sousLignes.current[0]?.focus(), 0);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            retenirVolet();
            setVolet(null);
          }
        }}
        style={{ ...styleLigneMenu(actif, rang === 0, rang === total - 1), ...(deploye && !actif ? { background: FOND_SURVOL_MENU } : null), ...(aRemplacer ? STYLE_LIGNE_A_REMPLACER : null) }}>
        <span style={{ flex: 1, minWidth: 0 }}>{rendreEnrichi(nom)}</span>
        {aRemplacer && <MentionRemplacer />}
        {/* ⚠️ Le chevron déploie SANS choisir : au doigt, la main ne survole pas, et c'est lui
            qui donne accès aux autres textes. */}
        <span aria-hidden="true" style={STYLE_CHEVRON_MENU}
          onClick={e => {
            e.stopPropagation();
            if (deploye) { retenirVolet(); setVolet(null); }
            else deployer(f.cle, e.currentTarget.parentElement ?? e.currentTarget, f.membres.length);
          }}>
          <IconeChevron dir="right" taille={TAILLE_CHEVRON_MENU} strokeWidth={1.6} />
        </span>
      </button>
    );
  };

  return (
    <>
      <button ref={btnRef} onClick={basculer} className="poly-trad-pick" title="Changer de traduction"
        aria-haspopup="menu" aria-expanded={ouvert}
        // ⛔ AUCUN `background` EN LIGNE ICI : il vit dans la feuille, avec le survol et
        // l'état ouvert. Une déclaration en ligne bat toujours une règle de feuille sans
        // « important », et le `background: none` qui se trouvait là rendait la règle de
        // survol MORTE depuis qu'elle avait été écrite — voir la note de la feuille.
        style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", minWidth: 0, padding: "7px 18px 7px 6px", borderRadius: 4, border: "none", cursor: "pointer", color: "inherit", transition: "background .15s" }}>
        {/* ⚠️ Les trois encres étaient du BLANC translucide, juste tant que ce nom se posait
            sur un aplat vert. Sur le papier, elles prennent l'échelle de gris du site : le nom
            en petites capitales de l'échelle haute, le millésime un rang plus bas, le chevron
            plus bas encore — c'est une marque d'ouverture, pas un accent. */}
        <span aria-hidden style={{ minWidth: 0, textAlign: "center", lineHeight: 1.12 }}>
          {/* ⚠️ Le nom se COMPOSE (`rendreEnrichi`) : « Bible française du XIIIe siècle »
              y prend ses petites capitales et son exposant. */}
          <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.875rem", color: "var(--cs-encre-fonce)" }}>
            {courante ? rendreEnrichi(courante.nom) : "Choisir une traduction"}
          </span>
          {/* ⛔ SOUS LE NOM, IL N'Y A QUE LA DATE (décision de l'auteur, 2026-09-04 :
              « “Texte du manuscrit” : ne pas l'indiquer ; seulement indiquer une date »).
              L'état du texte s'y substituait d'abord à la date, si bien que la Bible du
              XIIIe siècle était la seule colonne du tableau sans millésime ; il était
              descendu d'une ligne dessous, en glose. Il n'y est plus du tout : un en-tête
              de colonne porte le nom de l'édition et sa date, et une troisième ligne y
              faisait un second repère là où il n'en faut qu'un.
              ⚠️ L'état du texte se lit LÀ OÙ L'ON CHOISIT, dans le volet de la famille —
              « Texte du manuscrit », « Transcription diplomatique », « Traduction en
              français moderne ». C'est le menu qui distingue, l'en-tête qui nomme.
              ⛔ Conséquence assumée : deux colonnes d'une MÊME édition portent le même
              en-tête. Le cas ne se présente que si l'on ouvre deux états du témoin 899
              côte à côte, et l'auteur l'a tranché. */}
          {courante?.edition && (
            <span style={{ display: "block", marginTop: 3, fontFamily: "var(--font-source-sans), Arial, sans-serif", fontSize: "0.625rem", fontWeight: 600, letterSpacing: "0.15em", textIndent: "0.15em", color: "var(--cs-texte-second)" }}>
              {courante.edition}
            </span>
          )}
        </span>
        <svg aria-hidden width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ position: "absolute", right: 7, top: "50%", transform: `translateY(-50%) rotate(${ouvert ? 180 : 0}deg)`, transition: "transform .15s", pointerEvents: "none", color: "var(--cs-texte-doux)" }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {ouvert && rect && createPortal(
        <div ref={panRef} role="menu" aria-label="Traductions disponibles"
          // Le sous-menu est posé d'après la position de sa ligne : si le menu défile sous la
          // main, cette position n'a plus cours et il se replie.
          onScroll={() => { retenirVolet(); setVolet(null); }}
          style={{ ...STYLE_CADRE_MENU, position: "fixed", top: rect.top, left: rect.left, minWidth: rect.minWidth,
            maxWidth: `${LARGEUR_MAX_MENU_REM}rem`, zIndex: Z_MENU_PORTE, maxHeight: "62vh", overflowY: "auto" }}>
          {entrees.map((e, rang) => e.sorte === "famille"
            ? optionFamille(e.famille, rang, entrees.length)
            : optionTrad(e.trad, rang, entrees.length, false))}
        </div>,
        document.body,
      )}

      {/* ⛔ PLUS DE NOM EN TÊTE DU SOUS-MENU (décision de l'auteur, 14 septembre 2026 : « ne pas
          réafficher le nom de la bible dans le sous-menu »). La ligne qui l'ouvre le porte déjà,
          à quelques pixels de là, et c'était le seul menu du site à coiffer ses choix d'un titre. */}
      {ouvert && volet && familleDeployee && createPortal(
        <div ref={voletRef} role="menu" aria-label={nomCommun(familleDeployee.principal.nom)}
          onMouseEnter={retenirVolet} onMouseLeave={replierBientot}
          style={{ ...STYLE_CADRE_MENU, position: "fixed", top: volet.top, left: volet.left, right: volet.right,
            minWidth: `${LARGEUR_SOUS_MENU_REM}rem`, maxWidth: `${LARGEUR_MAX_MENU_REM}rem`, zIndex: Z_SOUS_MENU_PORTE, maxHeight: "62vh", overflowY: "auto" }}>
          {membresDeployes.map((m, k) => optionTrad(m.trad, k, membresDeployes.length, true, m.libelle, m.titre))}
        </div>,
        document.body,
      )}
    </>
  );
}

/** L'ensemble (le « tiroir ») auquel un livre appartient : le lecteur ne le choisit pas,
 *  il se déduit de l'ordre canonique du livre demandé. */
function ensembleDeLivre(livres: Livre[], code: string): Onglet {
  const o = livres.find(l => l.code === code)?.ordre ?? 0;
  if (code === "PSA") return "PSA";
  if (o > ORDRE_CANON_MAX) return "AUTRES";
  return o >= ORDRE_NT ? "NT" : "AT";
}

export default function PolyglottePage() {
  // La mémoire des visites vit sur le COMPTE, miroitée sur ce poste : une seule porte.
  // ⛔ LA SESSION ET LES DROITS VIENNENT DE LA PROVISION DU COMPTE (audit du 2026-09-23) :
  // la page relisait la session et le profil pour son compte, une fois, au montage, et ne
  // suivait ni une déconnexion ni un changement de compte.
  const { visiteFaite, oublierVisite, profilPret, exigerCompte, userId, estAdmin: estAdminCompte, aUnCompte } = useCompte();
  const [livres, setLivres] = useState<Livre[]>([]);
  // trad_id → code du livre → nom qu'il porte dans cette édition. Seuls les écarts au canon.
  const [livresEd, setLivresEd] = useState<Record<string, Record<string, { nom: string; abrege: string }>>>({});
  const [trads, setTrads] = useState<Trad[]>([]);
  // La Fillion n'est alignée que sur une partie du canon : le menu ne l'offre que là où
  // elle se lit vraiment (voir `traductionsDisponiblesPourLivres`).
  const [livresFillion, setLivresFillion] = useState<LivresParTraduction>(new Map());
  // Ce que le volet « Traductions affichées » dit de chaque bible : auteur et édition.
  const [fichesTrad, setFichesTrad] = useState<Map<string, FicheTraductionPoly>>(new Map());
  const [points, setPoints] = useState<Point[]>([]);
  // ⛔ LA PAGE NE S'OUVRE PLUS VIDE (demande de l'auteur, 2026-09-04 : « supprimer le
  // dessin et afficher soit le dernier emplacement de lecture de l'utilisateur — il faut
  // donc l'enregistrer — soit la Genèse »). L'ensemble reste nul le temps que les livres
  // arrivent, et il est posé dans la réponse même : voir le chargement initial.
  const [onglet, setOnglet] = useState<Onglet | null>(null);
  // Les livres ont-ils été demandés ET rendus ? Sert au seul cas où la liste revient vide :
  // sans elle, un échec de lecture et une page qui charge se ressemblent trait pour trait.
  const [livresLus, setLivresLus] = useState(false);
  // ⚠️ Le catalogue des traductions a-t-il échoué ? Sans lui, aucune colonne ne se choisit,
  // et la page disait « Choisir au moins une traduction », ce qui est faux (audit du 2026-09-23).
  const [catalogueEnPanne, setCatalogueEnPanne] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  // Nombre de colonnes tenant à l'écran (mesuré), et conteneur du tableau observé.
  // ⛔ LE NOMBRE DE COLONNES SE DÉDUIT, IL NE SE RECOPIE PAS (audit du 2026-09-23, « livre
  // entier » : « toujours pas fluide »). Un clic sur « 3 » enchaînait TROIS rendus complets
  // du tableau avant que la moindre colonne ne glisse — la préférence, puis un effet qui
  // recopiait `maxSlots`, puis un effet qui ajustait `slots` —, soit trois fois des milliers
  // de lignes sur un livre entier. La mesure seule reste un état (`autoSlots`) ; le compte
  // en dérive pendant le rendu, et les colonnes s'y ajustent dans le même rendu.
  const [autoSlots, setAutoSlots] = useState(NB_SLOTS);
  // Préférence utilisateur du nombre de traductions visibles (null = automatique, selon
  // la largeur d'écran). Mémorisée.
  const [nbTradPref, setNbTradPref] = useState<number | null>(null);
  useEffect(() => {
    try { const v = window.localStorage.getItem("polyglotte-nbtrad"); if (v === "auto") setNbTradPref(null); else if (v) { const n = parseInt(v, 10); if (n >= MIN_SLOTS && n <= MAX_SLOTS) setNbTradPref(n); } } catch { /* stockage indisponible */ }
  }, []);
  const maxSlots = nbTradPref != null ? Math.max(MIN_SLOTS, Math.min(MAX_SLOTS, nbTradPref)) : autoSlots;
  // Mémorise la préférence (la valeur, elle, se déduit ci-dessus).
  const nbTradEcrit = useRef(false);
  useEffect(() => {
    // Ne JAMAIS écrire au premier rendu : la valeur lue du localStorage (effet ci-dessus)
    // n'est pas encore appliquée, et l'état initial `null` écraserait la préférence mémorisée.
    if (!nbTradEcrit.current) { nbTradEcrit.current = true; return; }
    try { window.localStorage.setItem("polyglotte-nbtrad", nbTradPref == null ? "auto" : String(nbTradPref)); } catch { /* stockage indisponible */ }
  }, [nbTradPref]);
  const refTable = useRef<HTMLDivElement>(null);
  // ⚠️ La colonne Notes se déclare ICI, et non avec les notes elles-mêmes, parce qu'elle
  // ENTRE dans le calcul de largeur ci-dessous : un tableau de dépendances est évalué
  // pendant le rendu, donc à la ligne de son effet, et une déclaration plus basse tomberait
  // dans la zone morte temporelle. Beaucoup de lecteurs ne prendront jamais de note ; la
  // colonne se ferme d'un clic, se souvient de son état d'une visite à l'autre, et la place
  // qu'elle rend va aux traductions.
  const [notesReduites, setNotesReduites] = useState(false);   // colonne Notes repliée en rail
  // ⛔ LA COLONNE « NOTES » N'EXISTE PAS SANS COMPTE PERSONNEL (décision de l'auteur,
  // 2026-09-23) : ni en-tête, ni cellule, ni rail. Le compte de démonstration partagé n'en a
  // pas non plus : ses notes seraient celles de tous ses visiteurs.
  const notesVisibles = aUnCompte;
  useEffect(() => {
    try { if (window.localStorage.getItem("polyglotte-notes-reduites") === "1") setNotesReduites(true); } catch { /* stockage indisponible */ }
  }, []);
  const notesInit = useRef(false);
  useEffect(() => {
    if (!notesInit.current) { notesInit.current = true; return; }   // ne pas écraser au montage
    try { window.localStorage.setItem("polyglotte-notes-reduites", notesReduites ? "1" : "0"); } catch { /* stockage indisponible */ }
  }, [notesReduites]);
  // Mémorise le choix des colonnes dès qu'il est renseigné (jamais l'état initial vide).
  useEffect(() => {
    if (slots.length >= MIN_SLOTS && slots.some(Boolean)) {
      try { window.localStorage.setItem(CLE_SLOTS, JSON.stringify(slots)); } catch { /* stockage indisponible */ }
    }
  }, [slots]);
  // Largeur adaptative : combien de colonnes de traduction tiennent, d'après la
  // largeur RÉELLE du tableau (recalculé au redimensionnement de la fenêtre).
  useEffect(() => {
    const el = refTable.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const calc = () => {
      // Paddings du corps, marge de la référence (LARGEUR_REF), colonne Notes — laquelle
      // ne coûte que son rail quand elle est fermée. ⚠️ La fermer rend donc de la place, et
      // parfois une colonne de traduction entière : c'est la raison de la dépendance
      // ci-dessous, un lecteur qui ne prend pas de notes lit une édition de plus.
      const dispo = el.clientWidth - 24 - LARGEUR_REF - (!notesVisibles ? 0 : notesReduites ? 26 : 208);
      const n = Math.max(MIN_SLOTS, Math.min(MAX_SLOTS, Math.floor(dispo / MIN_COL_PX)));
      // La préférence utilisateur prime sur la mesure (`maxSlots`, déduit) ; on ne retient
      // ici que ce que l'écran permet.
      setAutoSlots(n);
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [notesReduites, notesVisibles]);
  // ⛔ LE GARDE-FOU DU CURSEUR EN MOUVEMENT EST RETIRÉ (2026-09-07), et ce n'est pas un
  // oubli. Une classe « poly-curseur-actif » allumait les actions au survol TANT QUE le
  // curseur bougeait, et les effaçait après une seconde d'immobilité « pour ne pas
  // encombrer la lecture ». Elle n'existait que parce que le pavé se posait DANS la
  // cellule, en haut à droite, c'est-à-dire sur la première ligne du verset qu'on venait
  // de survoler — le défaut même que l'auteur a relevé le 2026-09-07. La cellule d'actions
  // passe désormais AU-DESSUS du texte, hors du chemin de lecture : le garde-fou n'a plus
  // rien à garder, et une surface qui se comporterait autrement que les quatre autres
  // rouvrirait la disparité qu'on vient de fermer. ⚠️ Une seconde d'immobilité effaçait
  // aussi les boutons sous le curseur qui les visait.
  // Ajuste le nombre de slots à la largeur : préserve les traductions déjà choisies,
  // complète par des slots vides, ou retire les colonnes qui ne tiennent plus.
  // ⚠️ PENDANT LE RENDU, non dans un effet : un effet laissait passer un rendu complet du
  // tableau à l'ancien nombre de colonnes avant de rendre le bon.
  if (slots.length !== maxSlots) {
    if (slots.length > maxSlots) setSlots(slots.slice(0, maxSlots));   // écran plus étroit : on retire les colonnes en trop
    else {
      // Écran plus large : on complète les nouveaux slots avec des traductions
      // pas encore affichées (plutôt que des colonnes vides), pour que le grand
      // écran montre directement plus de traductions.
      const used = new Set(slots.filter(Boolean));
      const libres = trads.map(t => t.trad_id).filter(id => !used.has(id));
      let k = 0;
      setSlots(Array.from({ length: maxSlots }, (_, i) => slots[i] ?? (libres[k++] ?? "")));
    }
  }
  const [canon, setCanon] = useState<CanonRow[]>([]);
  const [v2, setV2] = useState<V2Row[]>([]);
  const [sensiblesOnly, setSensiblesOnly] = useState(false);
  const [surnumOnly, setSurnumOnly] = useState(false);
  const [livreChoisi, setLivreChoisi] = useState<string | null>(null);  // un seul livre à la fois
  // Par défaut on n'affiche QU'UN chapitre (l'affichage du livre entier est trop lourd) :
  // `chapitreChoisi` = le chapitre montré ; `null` = livre entier (option explicite au survol).
  const [chapitreChoisi, setChapitreChoisi] = useState<number | null>(1);
  // Verset ciblé par la barre de recherche du volet (« Gn 1 1 ») : on y défile et on le
  // surligne brièvement, à la manière de la page Bible.
  const [versetCible, setVersetCible] = useState<{ ch: number; v: number } | null>(null);
  // Le verset que l'ADRESSE désigne (bouton « Voir dans la Polyglotte » de la page Bible).
  // ⛔ Il reste marqué en vert tant que son chapitre est affiché : la fenêtre s'ouvre à
  // côté de la lecture, et l'on doit y retrouver le verset d'un coup d'œil.
  const [versetDesigne, setVersetDesigne] = useState<{ livre: string; ch: number; v: number } | null>(null);
  const [toutAfficher, setToutAfficher] = useState(false);              // …sauf demande explicite
  // Édition en place (admin). L'affordance dépend du client, mais l'autorisation réelle
  // est revérifiée côté serveur par /api/admin/verset-modifier (charte §17).
  // `estAdminReel` = les droits ; `estAdmin` = ce qu'on montre. Un admin qui bascule
  // en « mode utilisateur standard » doit voir la page comme un lecteur : les réglages
  // de relecture et les crayons disparaissent, ses droits ne changent pas.
  const estAdminReel = estAdminCompte;
  const { modeUtilisateurStandard } = useAffichageAdmin();
  const estAdmin = estAdminReel && !modeUtilisateurStandard;
  // ⛔ UN FILTRE DE RELECTURE NE SURVIT PAS À L'AFFICHAGE STANDARD. Ses interrupteurs ne
  // paraissent qu'à l'administrateur ; restés allumés quand l'affichage redevient celui d'un
  // lecteur, ils gardaient la page réduite aux lignes filtrées, sans plus rien pour les éteindre.
  // On les éteint pendant le rendu, dès qu'ils n'ont plus de maître.
  if (!estAdmin && (sensiblesOnly || surnumOnly)) { setSensiblesOnly(false); setSurnumOnly(false); }
  // Versets déjà dans « mes citations » : clé « ABR|ch|v » → id du prélèvement (pour retirer).
  const [prelevs, setPrelevs] = useState<Map<string, string>>(new Map());
  const marquerCite = useCallback((cle: string, id: string) => setPrelevs(m => new Map(m).set(cle, id)), []);
  const retirerCite = useCallback((cle: string) => setPrelevs(m => { const n = new Map(m); n.delete(cle); return n; }), []);

  // ── LA CELLULE D'ACTIONS ─────────────────────────────────────────────────────
  // Elle se pose AU-DESSUS du verset survolé, jamais dessus : dans une colonne de
  // tableau, « à droite de la ligne » tombe sur la traduction voisine, et la règle
  // (app/lib/celluleActions.ts) le sait dès qu'on lui donne la colonne pour bornes.
  //
  // ⚠️ Ce que porte l'ancre : la donnée d'une cellule vit au fond de quatre boucles
  // imbriquées (livre, ligne du canon, colonne, versets d'origine réunis), et la
  // retrouver au-dehors demanderait autant d'index. L'ancre l'emporte avec elle.
  const celluleActions = useCelluleActions<string, ActionsDeCellule>();
  const sansSurvol = useSansSurvol();
  // ⛔ SOUS 820 PX, RIEN NE SE CHARGE (audit du 2026-09-23) : la page y rend l'écran
  // « largeur requise », et le tableau n'est pas peint. Déclaré ICI, avant la demande,
  // pour qu'elle le lise ; la visite et le lasso le lisent aussi.
  const ecranEtroit = useEstMobile(POINTS_DE_RUPTURE.tablette);
  // Le haut de la lecture est le BAS de l'en-tête collant, non celui de la barre de
  // navigation : une cellule qui monterait plus haut passerait derrière les noms
  // d'édition. Mesuré à l'ancrage, la racine du site étant fluide.
  // (`ancrerActions` vit plus bas, avec `enteteRef`, dont il lit la boîte.)
  // Notes personnelles par verset (colonne « Notes ») : canon_id → texte. Enregistrées
  // sur le compte (table polyglotte_notes, RLS par utilisateur). Écriture débouncée.
  const [notes, setNotes] = useState<Map<string, string>>(new Map());
  const [voletReduit, setVoletReduit] = useState(false);       // volet de navigation gauche rabattu
  const timersNotes = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const majNote = useCallback((canonId: string, texte: string) => {
    setNotes(m => new Map(m).set(canonId, texte));
    if (!userId) return;
    const timers = timersNotes.current;
    const t0 = timers.get(canonId);
    if (t0) clearTimeout(t0);
    timers.set(canonId, setTimeout(() => {
      timers.delete(canonId);
      supabase.from("polyglotte_notes").upsert(
        { user_id: userId, canon_id: canonId, texte, updated_at: new Date().toISOString() },
        { onConflict: "user_id,canon_id" },
      ).then(({ error }) => { if (error) console.error("Polyglotte : la note n’a pas été enregistrée.", error); });
    }, 700));
  }, [userId]);
  // Choix d'une traduction dans une colonne : si elle est déjà affichée ailleurs,
  // les deux colonnes échangent leur place ; sinon la colonne est simplement remplie.
  const choisirTraduction = useCallback((index: number, val: string) => {
    setSlots(s => {
      const n = [...s];
      const j = n.findIndex((x, idx) => idx !== index && x && x === val);
      if (j !== -1) n[j] = n[index] ?? "";
      n[index] = val;
      return n;
    });
  }, []);
  // Verset en cours d'édition dans la petite fenêtre (ouverte par le crayon de survol).
  const [cibleEdition, setCibleEdition] = useState<{ id: string; texte: string; reference: string } | null>(null);
  const [enregistre, setEnregistre] = useState<"idle" | "envoi" | "ok" | "erreur">("idle");

  // LE LIVRE COMMANDE, L'ENSEMBLE SUIT. Les onglets ont disparu : on choisit un livre dans le
  // sommaire, et l'ensemble à charger (AT / Psaumes / NT / non canoniques) s'en déduit. Le
  // lecteur n'a plus à savoir dans quel tiroir ranger sa demande.
  // ⚠️ Le calcul est une fonction PURE (`ensembleDeLivre`, hors du composant) : la
  // reprise d'ouverture s'en sert dans la réponse même de la requête des livres, où
  // l'état `livres` n'est pas encore posé.
  const ensembleDe = useCallback((code: string): Onglet => ensembleDeLivre(livres, code), [livres]);

  // ⚠️ CE QU'ON LIT SE RETIENT, pour la prochaine ouverture de la page. ⛔ Le livre
  // ENTIER ne se retient pas comme tel : c'est un geste explicite et coûteux, et une
  // ouverture de page doit être brève (voir `repriseLecture`, qui le ramène au premier
  // chapitre). Aucune requête, aucun état : une écriture dans le stockage local.
  useEffect(() => {
    if (!livreChoisi) return;
    retenirPositionPolyglotte(livreChoisi, chapitreChoisi);
  }, [livreChoisi, chapitreChoisi]);

  // ── LA PLACE ET LES COLONNES S'INSCRIVENT DANS L'ADRESSE (audit ergonomique 2026-09-21) ──
  // Livre, chapitre (ou livre entier) et colonnes affichées : l'adresse désigne ce qu'on
  // voit, et l'on peut la partager, la recharger, et revenir en arrière. Un changement de
  // LIVRE ou de CHAPITRE empile une entrée d'historique ; un changement de colonnes la
  // remplace, un clic mineur ne devant pas remplir le bouton Précédent.
  // ⛔ `history.pushState` / `replaceState`, jamais le routeur : la page est rendue dans le
  // navigateur, et une navigation redemanderait au serveur une page qu'on a déjà.
  // ⚠️ Rien ne s'écrit avant que les colonnes soient connues : l'adresse d'arrivée en porte
  // peut-être, et une réécriture prématurée les effacerait. Le verset désigné par l'adresse
  // reste tant qu'on ne quitte pas son chapitre.
  const placeEcriteRef = useRef<string | null>(null);
  useEffect(() => {
    if (!livreChoisi || !trads.length || !slots.length) return;
    const ici = new URLSearchParams(window.location.search);
    const place = `${livreChoisi}|${chapitreChoisi ?? "entier"}`;
    const memeLieu = ici.get("livre") === livreChoisi
      && (chapitreChoisi == null ? ici.get("entier") === "1" : ici.get("chapitre") === String(chapitreChoisi));
    const verset = memeLieu ? Number(ici.get("verset")) || null : null;
    const url = urlEtatPolyglotte({ livre: livreChoisi, chapitre: chapitreChoisi, colonnes: slots, verset });
    const empiler = placeEcriteRef.current !== null && placeEcriteRef.current !== place;
    placeEcriteRef.current = place;
    if (url === window.location.pathname + window.location.search) return;
    if (empiler) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, [livreChoisi, chapitreChoisi, slots, trads.length]);

  // Précédent / Suivant : la page reprend la place et les colonnes que l'adresse nomme.
  useEffect(() => {
    const surRetour = () => {
      const recherche = window.location.search;
      const place = placePolyglotteDemandee(recherche);
      if (!place || !livres.some(l => l.code === place.livre)) return;
      const entier = livreEntierDemande(recherche);
      placeEcriteRef.current = `${place.livre}|${entier ? "entier" : place.chapitre}`;
      setOnglet(ensembleDeLivre(livres, place.livre));
      setLivreChoisi(place.livre);
      setChapitreChoisi(entier ? null : place.chapitre);
      setToutAfficher(false);
      setVersetCible(null);
      const colonnes = colonnesPolyglotteDemandees(recherche);
      if (colonnes) {
        const dispo = new Set(trads.map(t => t.trad_id));
        setSlots(colonnes.map(c => (dispo.has(c) ? c : "")));
      }
    };
    window.addEventListener("popstate", surRetour);
    return () => window.removeEventListener("popstate", surRetour);
  }, [livres, trads]);

  const choisirLivre = useCallback((code: string) => {
    setOnglet(ensembleDe(code));
    setLivreChoisi(code);
    setToutAfficher(false);
    setChapitreChoisi(1);   // on ouvre sur le premier chapitre, pas le livre entier
  }, [ensembleDe]);

  // ── LE LIVRE ENTIER SE DEMANDE, IL NE SE CHARGE PAS D'EMBLÉE (demande de l'auteur, 2026-09-23) ──
  // Une petite fenêtre prévient que ce mode mobilise beaucoup de texte, et rien ne se charge
  // avant qu'on l'ait confirmé. `avisLivreEntier` porte le livre visé tant que la question est
  // posée. ⚠️ Une adresse partagée qui ouvre sur le livre entier n'y passe pas : c'est un choix
  // déjà fait, non un geste.
  const [avisLivreEntier, setAvisLivreEntier] = useState<string | null>(null);
  const ouvrirLivreEntier = useCallback((code: string) => {
    if (code !== livreChoisi) choisirLivre(code);
    setChapitreChoisi(null); setToutAfficher(false); setVersetCible(null);
  }, [livreChoisi, choisirLivre]);
  const demanderLivreEntier = useCallback((code: string) => {
    if (code === livreChoisi && chapitreChoisi === null && !toutAfficher) return;   // déjà ouvert
    if (avisLivreEntierEteint()) ouvrirLivreEntier(code);
    else setAvisLivreEntier(code);
  }, [livreChoisi, chapitreChoisi, toutAfficher, ouvrirLivreEntier]);
  const annulerLivreEntier = useCallback(() => setAvisLivreEntier(null), []);

  // Le volet de navigation attend le vocabulaire de la page Bible.
  const livresNav = useMemo(() => livres.map(l => ({
    code: l.code, nom: l.nom_fr,
    testament: l.ordre > ORDRE_CANON_MAX ? "AUTRES" : l.ordre >= ORDRE_NT ? "NT" : "AT",
  })), [livres]);

  const sens = useMemo(() => construireSensibilite(points), [points]);
  const ordreDe = useMemo(() => new Map(livres.map(l => [l.code, l.ordre])), [livres]);

  // Chargement initial (livres, points, traductions migrées)
  useEffect(() => {
    // ⛔ L'ADRESSE D'ARRIVÉE SE LIT UNE FOIS, AU MONTAGE : la page la réécrit dès que
    // l'état est posé, et les deux réponses qui s'en servent arrivent plus tard.
    const rechercheInitiale = window.location.search;
    supabase.from("livres").select("code, nom_fr, ordre").order("ordre").then(({ data, error }) => {
      // ⚠️ Lire l'erreur : un volet vide se lit « rien à comparer », ce qui ment sur une panne.
      if (error) console.error("Polyglotte : les livres n’ont pas pu être lus.", error);
      const liste = (data ?? []).filter(l => !LIVRES_FONDUS_DANS_DANIEL.has(l.code));
      setLivres(liste);
      setLivresLus(true);
      if (!liste.length) return;
      // ⛔ L'OUVERTURE SE DÉCIDE ICI, et non au premier rendu : la place retenue vit dans
      // `localStorage`, que le rendu serveur ne connaît pas, et le livre demandé doit
      // être confronté à la liste réellement servie — un code retenu de longue date peut
      // avoir disparu du canon offert. On retombe alors sur la Genèse, puis sur le premier
      // livre venu, pour que la page ouvre TOUJOURS sur un texte.
      // ⚠️ Le chapitre ne suit que si c'est bien le livre retenu qu'on ouvre.
      // ⛔ UNE ADRESSE QUI NOMME UN VERSET L'EMPORTE sur la reprise de lecture : c'est le
      // bouton « Voir dans la Polyglotte » de la page Bible qui l'écrit (2026-09-20). Le
      // verset se désigne et se surligne un instant, comme depuis la recherche du volet.
      const demande = placePolyglotteDemandee(rechercheInitiale);
      const livreDemande = demande ? liste.find(l => l.code === demande.livre) : undefined;
      if (demande && livreDemande) {
        setOnglet(ensembleDeLivre(liste, livreDemande.code));
        setLivreChoisi(livreDemande.code);
        setChapitreChoisi(livreEntierDemande(rechercheInitiale) ? null : demande.chapitre);
        placeEcriteRef.current = `${livreDemande.code}|${livreEntierDemande(rechercheInitiale) ? "entier" : demande.chapitre}`;
        if (demande.verset !== null) {
          setVersetCible({ ch: demande.chapitre, v: demande.verset });
          setVersetDesigne({ livre: livreDemande.code, ch: demande.chapitre, v: demande.verset });
        }
        return;
      }
      const ou = ouvertureDeLaPolyglotte();
      const livre = liste.find(l => l.code === ou.livre)
        ?? liste.find(l => l.code === LIVRE_PAR_DEFAUT)
        ?? liste[0];
      setOnglet(ensembleDeLivre(liste, livre.code));
      setLivreChoisi(livre.code);
      setChapitreChoisi(livre.code === ou.livre ? ou.chapitre : 1);
    });
    // Désignation des livres propre à chaque édition, quand elle diffère du canon : la
    // Sacy de 1730 compte quatre livres des Rois là où le canon en compte deux de Samuel
    // et deux des Rois. Seuls les écarts sont enregistrés (voir scripts/livres-editions.mjs).
    // Passe par une route serveur : la table `parametres` est protégée par RLS et le client
    // public n'y voit rien — elle contient aussi la charte éditoriale, qui doit le rester.
    fetch("/api/livres-editions").then(r => r.json()).then(setLivresEd).catch(() => setLivresEd({}));
    (async () => {
      // ⚠️ La session Supabase se restaure APRÈS le premier rendu. Sans cette attente, la
      // couverture de la Fillion — réservée aux lecteurs authentifiés — part avec le rôle
      // anonyme, revient vide, et n'est jamais relue : la Fillion reste alors hors du menu.
      await supabase.auth.getSession();
      // ⛔ `est_biblique` : voir le commentaire dans app/page.tsx — la table tient aussi
      // les notices des traductions patristiques, qui n'ont rien à faire ici.
      // La TABLE porte le nom, la langue et le millésime de chaque bible ; la couverture
      // de la Fillion dit, elle, où son texte est réellement aligné. Les deux se lisent
      // ensemble : aucune liste d'identifiants n'est codée en dur ici, et un livre qui
      // s'ajoute au chantier entre au menu sans toucher à la page.
      // ⚠️ `auteur`, `dates`, `date_publication` et la fiche d'édition (`editions_sources`,
      // sept lignes) servent le volet « Traductions affichées » (2026-09-23) : ils partent
      // dans la même vague et ne coûtent pas un aller-retour de plus. Un échec n'ôte que
      // ces lignes du volet, jamais une colonne.
      const [catalogue, couvertureFillion, fichesEdition] = await Promise.all([
        supabase.from("traductions").select("trad_id, nom, ordre, source_edition, publication_fin_annee, langue, auteur, dates, date_publication").eq("est_biblique", true).order("ordre"),
        supabase.from(COUVERTURE_FILLION).select("trad_id, livre, nb_versets"),
        supabase.from("editions_sources").select("trad_id, titre_edition, sous_titre_edition, mention_edition, lieu_edition, editeur, annee_edition, nombre_tomes, depot_manuscrit, cote_manuscrit"),
      ]);
      const { data: tr, error: erreurTr } = catalogue;
      if (erreurTr) { console.error("Polyglotte : les traductions n’ont pas pu être lues.", erreurTr); setCatalogueEnPanne(true); }
      if (couvertureFillion.error) console.error("Polyglotte : les livres alignés de la Fillion n’ont pas pu être lus.", couvertureFillion.error);
      if (fichesEdition.error) console.error("Polyglotte : les fiches d’édition n’ont pas pu être lues.", fichesEdition.error);
      const liste = (tr ?? []) as TraductionCatalogue[];
      const parEdition = new Map(((fichesEdition.data ?? []) as { trad_id: string; titre_edition: string | null; sous_titre_edition: string | null; mention_edition: string | null; lieu_edition: string | null; editeur: string | null; annee_edition: string | null; nombre_tomes: number | null; depot_manuscrit: string | null; cote_manuscrit: string | null }[]).map(f => [f.trad_id, f]));
      setFichesTrad(new Map(liste.map(t => {
        const e = parEdition.get(t.trad_id);
        return [t.trad_id, {
          auteur: t.auteur ?? null, dates: t.dates ?? null, datePublication: t.date_publication ?? null,
          lieuEdition: e?.lieu_edition ?? null, editeur: e?.editeur ?? null, anneeEdition: e?.annee_edition ?? null,
          depotManuscrit: e?.depot_manuscrit ?? null, coteManuscrit: e?.cote_manuscrit ?? null,
          titreEdition: e?.titre_edition ?? null, sousTitreEdition: e?.sous_titre_edition ?? null,
          mentionEdition: e?.mention_edition ?? null, nombreTomes: e?.nombre_tomes ?? null,
        }];
      })));
      const couverture = indexerLivresFillion((couvertureFillion.data ?? []) as LivreFillion[]);
      setLivresFillion(couverture);
      // Une SONDE par traduction pour savoir laquelle est migrée dans versets_v2, toutes
      // en parallèle. Une ligne suffit : le compte exact d'avant parcourait l'index
      // entier de la traduction (36 000 lignes pour la Vulgate, 13 ms chacune, mesuré),
      // pour n'en retenir que « plus de zéro ». La vue `livres_par_traduction` ferait
      // une seule requête, mais elle balaie la table entière (487 ms) : dix sondes
      // parallèles coûtent moins qu'elle. ⚠️ Sous la RLS du lecteur : une traduction
      // privée (TR0013) ne répond qu'à l'administrateur, et n'entre que chez lui.
      const presentesDansV2 = await Promise.all(liste.map(t =>
        supabase.from("versets_v2").select("trad_id").eq("trad_id", t.trad_id).limit(1)
          .then(({ data, error }) => {
            // ⚠️ Une sonde qui ÉCHOUE ne fait pas disparaître la traduction du menu : on la
            // tient pour présente, et c'est le chargement du texte qui dira l'erreur.
            if (error) { console.error(`Polyglotte : sonde impossible pour ${t.trad_id}.`, error); return true; }
            return (data?.length ?? 0) > 0;
          })
      ));
      const migres: Trad[] = [];
      liste.forEach((t, i) => {
        // Une bible entre au menu si elle est dans `versets_v2`, ou si la Fillion la
        // porte : le latin et le français de la Fillion sont deux colonnes à part
        // entière, chacune sous sa langue (voir `FAMILLES` et `GROUPES_LANG`).
        const surFillion = couverture.has(t.trad_id);
        if (!presentesDansV2[i] && !surFillion) return;
        migres.push({
          trad_id: t.trad_id,
          nom: t.nom,
          ordre: t.ordre,
          edition: editionTrad(t),
          lang: codeLangue(t.langue),
          langHtml: codeLangueBible(t.langue),
          sourceFillion: !presentesDansV2[i] && surFillion,
        });
      });
      // TR0009 (Bible 899) n'est pas migrée dans `versets_v2` : son texte est recomposé
      // à la volée depuis les tables éditoriales (colonne synthétique). On l'ajoute donc
      // explicitement, comme n'importe quelle autre traduction comparable.
      const t899 = liste.find(t => t.trad_id === TRAD_ID_BIBLE899);
      if (t899) {
        const commun = { nom: t899.nom, ordre: t899.ordre, edition: editionTrad(t899), lang: codeLangue((t899 as { langue?: string | null }).langue), langHtml: codeLangueBible((t899 as { langue?: string | null }).langue) ?? "fro" };
        if (!migres.some(m => m.trad_id === TRAD_ID_BIBLE899)) migres.push({ trad_id: TRAD_ID_BIBLE899, ...commun, variante: "Texte du manuscrit" });
        // La transcription diplomatique est une colonne à part entière (voir
        // TRAD_ID_899_DIPLO) : même édition, même langue, autre état du texte.
        migres.push({ trad_id: TRAD_ID_899_DIPLO, ...commun, variante: "Transcription diplomatique" });
      }
      setTrads(migres);
      // Choix des colonnes : celui que l'ADRESSE nomme (lien partagé, rechargement), sinon
      // celui que l'utilisateur a laissé la dernière fois (localStorage), sinon par défaut les
      // quatre premières traductions distinctes. On ne retient d'un choix que les traductions
      // encore disponibles.
      const dispo = new Set(migres.map(m => m.trad_id));
      let init: string[] | null = null;
      const demandees = colonnesPolyglotteDemandees(rechercheInitiale);
      if (demandees && demandees.some(x => dispo.has(x))) init = demandees.map(x => (dispo.has(x) ? x : ""));
      if (!init) try {
        const brut = typeof window !== "undefined" ? window.localStorage.getItem(CLE_SLOTS) : null;
        const parse = brut ? JSON.parse(brut) : null;
        if (Array.isArray(parse) && parse.some((x: string) => dispo.has(x))) {
          init = parse.map((x: string) => (dispo.has(x) ? x : ""));
        }
      } catch { /* localStorage indisponible ou corrompu : on retombe sur le défaut */ }
      setSlots(init ?? Array.from({ length: NB_SLOTS }, (_, i) => migres[i]?.trad_id ?? ""));
    })();
  }, []);

  // Les points sensibles ne servent qu'à la RELECTURE (lignes en rouge, en rose, filtre
  // « Lignes problématiques »), c'est-à-dire à l'administrateur : le lecteur n'a pas à les
  // charger. ⚠️ Un échec se dit au journal : la relecture n'en montre alors aucun.
  useEffect(() => {
    if (!estAdminReel) return;
    let vivant = true;
    supabase.from("points_sensibles").select("livre, reference, type, description, statut, notes").then(({ data, error }) => {
      if (!vivant) return;
      if (error) { console.error("[polyglotte] points sensibles illisibles :", error); return; }
      setPoints(data ?? []);
    });
    return () => { vivant = false; };
  }, [estAdminReel]);

  // Enregistrement d'un verset modifié
  const enregistrerVerset = useCallback(async (id: string, texte: string) => {
    setEnregistre("envoi");
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    // ⚠️ Le verrou de bêta REDIRIGE au lieu de refuser : sa page revient en 200 et passait
    // pour un enregistrement réussi. On exige donc une réponse JSON, et non redirigée.
    const res = await fetch("/api/admin/verset-modifier", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ id, texte }),
    }).catch((e: unknown) => { console.error("[polyglotte] enregistrement du verset impossible :", e); return null; });
    if (res && res.ok && !res.redirected && (res.headers.get("content-type") ?? "").includes("application/json")) {
      setV2(rows => rows.map(r => (r.id === id ? { ...r, texte } : r)));   // mise à jour locale
      corrigerTexteEnCache(id, texte);
      setEnregistre("ok"); setCibleEdition(null);
      setTimeout(() => setEnregistre("idle"), 1500);
    } else setEnregistre("erreur");
  }, []);

  // Livres de l'onglet courant (dans l'ordre canonique)
  const livresOnglet = useMemo(() => {
    if (!onglet) return [];
    if (onglet === "PSA") return livres.filter(l => l.code === "PSA");
    if (onglet === "NT") return livres.filter(l => l.ordre >= ORDRE_NT && l.ordre <= ORDRE_CANON_MAX);
    if (onglet === "AUTRES") return livres.filter(l => l.ordre > ORDRE_CANON_MAX);
    return livres.filter(l => l.ordre < ORDRE_NT && l.code !== "PSA");
  }, [livres, onglet]);

  // Le livre est choisi dans le sommaire ; on ne lui en substitue un autre que si celui qui
  // est retenu n'appartient pas à l'ensemble chargé — cas qui ne survient qu'au premier rendu.
  useEffect(() => {
    if (livreChoisi && livresOnglet.some(l => l.code === livreChoisi)) return;
    setLivreChoisi(livresOnglet[0]?.code ?? null);
  }, [livresOnglet, livreChoisi]);

  // Livres réellement rendus (et chargés) : un seul, sauf « tout afficher »
  const livresAffiches = useMemo(
    () => (toutAfficher ? livresOnglet : livresOnglet.filter(l => l.code === livreChoisi)),
    [livresOnglet, livreChoisi, toutAfficher]
  );
  const traductionsDisponibles = useMemo(
    () => traductionsDisponiblesPourLivres(trads, livresAffiches.map(l => l.code), livresFillion),
    [trads, livresAffiches, livresFillion],
  );
  // Ce que les colonnes MONTRENT : le choix gardé, moins ce que les livres affichés ne
  // portent pas. Le choix lui-même ne bouge pas (voir `masquerTraductionsIndisponibles`).
  const slotsDisponibles = useMemo(
    () => masquerTraductionsIndisponibles(slots, trads, traductionsDisponibles),
    [slots, trads, traductionsDisponibles],
  );

  // Chargement de ce qui est affiché (canon + traductions migrées).
  // On ne charge QUE les traductions réellement affichées. Auparavant la requête
  // ramenait le texte de toutes les éditions en base pour n'en montrer trois ou
  // quatre : sur les Psaumes, cela faisait deux fois plus de lignes que nécessaire,
  // et autant de pages de 1 000 à parcourir. Changer une colonne relance le
  // chargement, mais sur un volume bien moindre.
  //
  // LA DEMANDE est une valeur (`Portee`), et l'attente s'en DÉDUIT : on attend tant
  // que ce qui est chargé (`porteeChargee`) ne couvre pas ce qui est demandé. Aucun
  // témoin « en cours » à allumer et à éteindre, donc rien qui puisse rester allumé
  // sur une réponse perdue, ni s'éteindre sur la réponse d'une demande périmée.
  const demande = useMemo<Portee>(() => {
    // AFFICHAGE PLUS RAPIDE : dans la vue par défaut (un seul chapitre d'un seul livre),
    // on ne charge QUE ce chapitre — quelques dizaines de lignes au lieu du livre
    // entier. Les modes qui ont besoin de tout le livre (livre entier, tout afficher,
    // lignes problématiques, surnuméraires) lèvent ce filtre.
    const monoLivre = livresAffiches.length === 1;
    const chScope = (!toutAfficher && !sensiblesOnly && !surnumOnly && monoLivre && chapitreChoisi != null) ? chapitreChoisi : null;
    const tradIds = slotsDisponibles.filter(Boolean);
    const sourcesFillion = new Set(trads.filter(t => t.sourceFillion).map(t => t.trad_id));
    return { codes: livresAffiches.map(l => l.code), tradIds, tradIdsFillion: tradIds.filter(id => sourcesFillion.has(id)), chScope };
  }, [livresAffiches, slotsDisponibles, trads, chapitreChoisi, toutAfficher, sensiblesOnly, surnumOnly]);
  // Ce que `canon` et `v2` portent réellement. Posé AVEC les données, jamais avant.
  const [porteeChargee, setPorteeChargee] = useState<Portee | null>(null);
  // Le compte des chapitres, pour borner la mise en cache du chapitre SUIVANT. Même
  // promesse que celle du volet : une seule requête pour la page (`chapitresCanon`).
  const [chapitresParLivre, setChapitresParLivre] = useState<ChapitresParLivre | null>(null);
  useEffect(() => {
    let vivant = true;
    void chargerChapitresParLivre(supabase).then(t => { if (vivant) setChapitresParLivre(t); });
    return () => { vivant = false; };
  }, []);
  // La demande dont le chargement a échoué, pour ne pas la rejouer sans fin ; le
  // bouton « Réessayer » la lève. Une référence, et non un état dans les dépendances
  // de l'effet : un échec qui relancerait l'effet relancerait la requête, en boucle.
  const [erreurChargement, setErreurChargement] = useState<Portee | null>(null);
  const erreurRef = useRef<Portee | null>(null);
  const [relance, setRelance] = useState(0);
  // Le numéro de la dernière demande partie : une réponse qui n'est plus la dernière
  // est jetée (deux chapitres cliqués coup sur coup, le premier répondant en second).
  const numeroDemandeRef = useRef(0);
  const demandeVide = ecranEtroit || !demande.codes.length || !demande.tradIds.length;
  // Servi du CACHE sans attendre. L'ajustement se fait PENDANT le rendu, comme le retour
  // à la première page de la Bibliothèque : l'attente n'est jamais vraie, rien ne
  // s'efface pour reparaître aussitôt, et le tableau change avant la peinture.
  if (!demandeVide && !couvre(porteeChargee, demande)) {
    const enCache = assemblerDepuisCache(demande, ordreDe);
    if (enCache) { setCanon(enCache.canon); setV2(enCache.lignes); setPorteeChargee(demande); }
  }
  const enChargement = !demandeVide && !couvre(porteeChargee, demande) && erreurChargement !== demande;
  // ── CHANGER UNE COLONNE NE RECHARGE PAS LA TABLE ────────────────────────────
  // Demande de l'auteur (2026-09-04) : « quand je change de traduction sur une colonne,
  // il ne faut pas tout recharger ; seulement le texte de cette colonne ».
  // ⛔ L'attente était GLOBALE : elle voilait la table entière et rejouait le passage,
  // alors que les autres colonnes n'avaient pas bougé et que leur texte était déjà là.
  // ⚠️ Quand seules les TRADUCTIONS changent — mêmes livres, même chapitre —, l'ossature
  // et les lignes des colonnes inchangées restent valables : la table ne bouge pas, et
  // seule la colonne neuve dit qu'elle arrive.
  const attenteColonneSeule = enChargement && porteeChargee !== null
    && memeListe(porteeChargee.codes, demande.codes)
    && (porteeChargee.chScope === null || porteeChargee.chScope === demande.chScope);
  const attenteGlobale = enChargement && !attenteColonneSeule;
  // Les traductions dont le texte n'est pas encore là. ⚠️ Lu dans le CACHE, et non dans
  // `porteeChargee` : une colonne déjà venue s'affiche à l'instant même, sans attente —
  // c'est le cas ordinaire dès qu'on revient à une traduction déjà lue.
  const tradsEnAttente = useMemo(() => {
    const s = new Set<string>();
    if (!attenteColonneSeule) return s;
    const scope = scopeDe(demande.chScope);
    for (const trad of demande.tradIds) {
      const present = demande.codes.every(code => est899(trad) ? !!lire899(code, scope) : !!lireTexte(trad, code, scope));
      if (!present) s.add(trad);
    }
    return s;
  }, [attenteColonneSeule, demande]);
  useEffect(() => {
    if (demandeVide || couvre(porteeChargee, demande) || erreurRef.current === demande) return;
    // ⚠️ À l'hydratation, `ecranEtroit` suit l'indice du serveur (faux sur une page
    // prérendue) le temps d'un rendu : on relit la fenêtre, pour ne rien charger pour rien.
    if (typeof window.matchMedia === "function" && window.matchMedia(`(max-width: ${POINTS_DE_RUPTURE.tablette}px)`).matches) return;
    const numero = ++numeroDemandeRef.current;
    chargerPortee(demande, ordreDe).then(({ canon, lignes }) => {
      if (numero !== numeroDemandeRef.current) return;
      setCanon(canon); setV2(lignes); setPorteeChargee(demande);
    }).catch((e: unknown) => {
      if (numero !== numeroDemandeRef.current) return;
      console.error("Chargement de la Polyglotte impossible :", e);
      erreurRef.current = demande;
      setErreurChargement(demande);
    });
  }, [demande, demandeVide, porteeChargee, ordreDe, relance]);
  const reessayer = () => { erreurRef.current = null; setErreurChargement(null); setRelance(n => n + 1); };

  // ── Le chapitre SUIVANT se met en cache d'avance ────────────────────────────
  // Une lecture est une suite : une fois le chapitre courant rendu, le suivant part en
  // tâche de fond, dans le même cache. Tourner la page ne coûte alors plus rien, et la
  // Bible 899, qui charge en trois vagues, y gagne le plus. Seulement le suivant, et
  // seulement en vue d'un chapitre : le livre entier des Psaumes à chaque lecteur qui
  // n'en lit qu'un serait de l'égress pour rien. Jamais pendant qu'on attend.
  useEffect(() => {
    if (enChargement || demandeVide || demande.chScope == null || demande.codes.length !== 1) return;
    const suivant = demande.chScope + 1;
    if (suivant > nombreDeChapitres(demande.codes[0], chapitresParLivre)) return;
    const t = window.setTimeout(() => { void precharger({ ...demande, chScope: suivant }); }, 400);
    return () => window.clearTimeout(t);
  }, [enChargement, demandeVide, demande, chapitresParLivre]);
  // Et le chapitre qu'on SURVOLE dans le sommaire, avec un court délai pour ne pas tirer
  // sur tout ce que le curseur traverse (même patron que les modes de lecture de la Bible).
  const demandeRef = useRef(demande);
  demandeRef.current = demande;
  const timerPreparation = useRef<number | null>(null);
  const preparerChapitre = useCallback((code: string, ch: number) => {
    if (timerPreparation.current) window.clearTimeout(timerPreparation.current);
    timerPreparation.current = window.setTimeout(() => {
      timerPreparation.current = null;
      const d = demandeRef.current;
      if (!d.tradIds.length) return;
      void precharger({ ...d, codes: [code], chScope: ch });
    }, 150);
  }, []);

  // ── Le passage d'un texte à l'autre est FLUIDE, ici aussi (2026-09-03) ─────
  // Même dispositif que la page d'œuvre et la page Bible (`app/lib/passageTexte.ts`,
  // animations dans « globals.css ») : au DÉPART, les lignes visibles reçoivent leur
  // rang et s'effacent l'une après l'autre, puis le corps entier ; à l'ARRIVÉE, le
  // corps remonte en tête si le chapitre ou le livre a changé, et les lignes
  // paraissent de même. Le départ, c'est le moment où l'attente commence
  // (`enChargement` passe à vrai) ; l'arrivée, celui où les données la couvrent.
  // ⛔ Les lignes de l'ancien chapitre restent dans le document jusqu'à l'arrivée
  // (voir `livresRendus`) : c'est ce qui donne à l'effacement quelque chose à effacer.
  const [passage, setPassage] = useState<"sortie" | "entree" | null>(null);
  const corpsRef = useRef<HTMLDivElement>(null);
  const enteteRef = useRef<HTMLDivElement>(null);
  // Le haut de la lecture est le BAS de l'en-tête collant, non celui de la barre de
  // navigation : une cellule d'actions qui monterait plus haut passerait derrière les
  // noms d'édition. Mesuré à l'ancrage, la racine du site étant fluide.
  // ⚠️ La dépendance est `ancrer`, non l'objet rendu par le crochet : celui-ci est un
  // littéral neuf à chaque rendu, et le rappel se refabriquerait pour rien.
  const ancrerCellule = celluleActions.ancrer;
  const ancrerActions = useCallback((el: HTMLElement, donnees: ActionsDeCellule) => {
    ancrerCellule(el, donnees.cle, { borne: el, sommet: hautDeLecture(enteteRef.current), donnees });
  }, [ancrerCellule]);
  const porteeRendueRef = useRef<Portee | null>(null);
  useLayoutEffect(() => {
    if (!attenteGlobale || passage === "sortie") return;
    const corps = corpsRef.current;
    if (!corps || ordonnerBlocsVisibles(corps, hautDeLecture(enteteRef.current), SELECTEUR_BLOCS_POLYGLOTTE) === 0) return;
    setPassage("sortie");
  }, [attenteGlobale, passage]);
  useLayoutEffect(() => {
    const precedente = porteeRendueRef.current;
    porteeRendueRef.current = porteeChargee;
    if (!porteeChargee) return;
    const corps = corpsRef.current;
    if (!corps) return;
    // Un autre chapitre ou un autre livre s'ouvre en tête ; la même portée rechargée
    // (une colonne changée) garde sa place. Un verset visé fait son propre défilement.
    const autreTexte = precedente !== null && (precedente.chScope !== porteeChargee.chScope || !memeListe(precedente.codes, porteeChargee.codes));
    if (autreTexte && !versetCible) {
      const haut = corps.getBoundingClientRect().top + window.scrollY - hautDeLecture(enteteRef.current);
      if (window.scrollY > haut) window.scrollTo(0, Math.max(0, haut));
    }
    // ⚠️ LA PREMIÈRE ARRIVÉE N'A PAS DE DÉPART, et c'est le seul cas où l'on paraît sans
    // s'être effacé (demande de l'auteur, 2026-09-04 : « faire un affichage plus doux que
    // le texte qui apparaît brutalement »). La page s'ouvre maintenant sur un livre, et
    // son texte vient du NAVIGATEUR : rien n'est à l'écran avant lui, donc rien n'a à
    // s'effacer, et le fondu se joue sur ce qui arrive. ⛔ C'est aussi pourquoi cette page
    // n'emprunte pas l'ouverture en fondu de la Bible classique, qui vaut pour un texte
    // déjà peint par le serveur : ici la colonne est vide au premier rendu.
    // Ailleurs, venu du cache, rien ne s'est effacé et rien ne paraît non plus : même
    // parti que l'échange de bible en mémoire sur la page Bible, le défilement dit qu'on
    // a tourné.
    if (passage !== "sortie" && precedente !== null) return;
    // ⚠️ À L'OUVERTURE, LE TEXTE TOMBE EN DOMINO — colonne par colonne, de gauche à droite
    // (demande de l'auteur, 2026-09-04). ⛔ Seulement à l'ouverture : la même chute jouée à
    // chaque chapitre tourné cesserait d'être un accueil pour devenir une attente. Les
    // arrivées suivantes gardent la chute ligne par ligne, qui suit la lecture.
    if (precedente === null) ordonnerColonnesVisibles(corps, hautDeLecture(enteteRef.current), ".poly-texte-cell");
    else ordonnerBlocsVisibles(corps, hautDeLecture(enteteRef.current), SELECTEUR_BLOCS_POLYGLOTTE);
    setPassage("entree");
    const fin = window.setTimeout(() => setPassage(null), DUREE_ENTREE_MS);
    return () => window.clearTimeout(fin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [porteeChargee]);

  // Charge les citations déjà enregistrées par l'utilisateur pour le(s) livre(s) affiché(s),
  // afin que le signet apparaisse plein sur les versets favoris et qu'un clic les retire.
  useEffect(() => {
    if (!userId || !livresAffiches.length || ecranEtroit) { setPrelevs(new Map()); return; }
    let vivant = true;
    const abrs = livresAffiches.map(l => ABREV_FR[l.code] ?? l.code);
    supabase.from("prelevements").select("id, ref_livre_abr, ref_chapitre, ref_verset, traduction, trad_id")
      .eq("user_id", userId).eq("type", "biblique").in("ref_livre_abr", abrs)
      .then(({ data, error }) => {
        // ⚠️ Une réponse d'un autre livre est jetée ; un échec se dit au journal et laisse
        // les signets tels qu'ils étaient, au lieu de les vider en silence.
        if (!vivant) return;
        if (error) { console.error("[polyglotte] citations enregistrées illisibles :", error); return; }
        const m = new Map<string, string>();
        // Clé étendue au CODE de la traduction : chaque colonne a son propre signet. ⚠️ Le code
        // plutôt que le nom : un nom d'édition change (« Vulgate publiée par Fillion » est
        // devenue « Bible Fillion – Latin (Vulgate) »), le code non (2026-09-23).
        for (const p of data ?? []) m.set(`${p.ref_livre_abr}|${p.ref_chapitre}|${p.ref_verset}|${p.trad_id ?? p.traduction}`, p.id);
        setPrelevs(m);
      });
    return () => { vivant = false; };
  }, [userId, livresAffiches, ecranEtroit]);

  // Charge toutes les notes personnelles de l'utilisateur (peu volumineuses), indexées
  // par canon_id, pour remplir la colonne « Notes » des versets déjà annotés.
  useEffect(() => {
    if (!userId || ecranEtroit) { setNotes(new Map()); return; }
    let vivant = true;
    // ⚠️ PAGINÉ : PostgREST plafonne à mille lignes, et un lecteur assidu les dépasse ;
    // les notes d'au-delà se seraient montrées vides, et réécrites vides au premier geste.
    chargerToutesPagesSupabase<{ canon_id: string; texte: string | null }>((debut, fin) =>
      supabase.from("polyglotte_notes").select("canon_id, texte").eq("user_id", userId).order("canon_id").range(debut, fin))
      .then(lignes => {
        if (!vivant) return;
        const m = new Map<string, string>();
        for (const n of lignes) if (n.texte) m.set(n.canon_id, n.texte);
        setNotes(m);
      })
      .catch((e: unknown) => { if (vivant) console.error("[polyglotte] notes personnelles illisibles :", e); });
    return () => { vivant = false; };
  }, [userId, ecranEtroit]);

  // Verset ciblé (barre de recherche du volet) : une fois le chapitre chargé, on y défile
  // et l'on efface le surlignage après un instant. Dépend de `canon` pour attendre le rendu.
  useEffect(() => {
    if (!versetCible || !livreChoisi) return;
    const id = `poly-${livreChoisi}-${versetCible.ch}-${versetCible.v}`;
    // ⚠️ Le surlignage ne s'éteint qu'une fois le verset TROUVÉ : à l'ouverture de la
    // page, le chapitre peut mettre plus longtemps à venir que le surlignage à durer.
    let t2: ReturnType<typeof setTimeout> | undefined;
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      // ⛔ Pas de défilement doux nu : il peut ne rien faire du tout (voir defilement.ts).
      allerAElement(el);
      t2 = setTimeout(() => setVersetCible(null), 2600);
    }, 120);
    return () => { clearTimeout(t); if (t2) clearTimeout(t2); };
  }, [versetCible, livreChoisi, canon]);

  // Index (canon_id, trad_id) → cellule ; canon groupé par livre
  const cellule = useMemo(() => {
    const m = new Map<string, V2Row[]>();
    for (const r of v2) {
      if (!porteDuTexte(r)) continue;
      const k = `${r.canon_id}|${r.trad_id}`;
      const liste = m.get(k);
      if (liste) liste.push(r); else m.set(k, [r]);   // ⚠️ push : recopier la liste à chaque ligne coûtait un livre entier au carré
    }
    // versets fusionnés (many→1) : afficher dans l'ordre d'origine (ch_orig, v_orig)
    for (const arr of m.values()) if (arr.length > 1) arr.sort((a, b) => a.ch_orig - b.ch_orig || a.v_orig - b.v_orig);
    return m;
  }, [v2]);
  const parLivre = useMemo(() => {
    const m = new Map<string, CanonRow[]>();
    for (const r of canon) { const liste = m.get(r.livre); if (liste) liste.push(r); else m.set(r.livre, [r]); }
    return m;
  }, [canon]);
  // ⛔ UN CRÉNEAU COUVERT PAR UN EMPAN N'EST PAS UN CRÉNEAU VIDE. Quand une édition réunit
  // en un seul verset ce que le canon compte en plusieurs, `canon_id_fin` le dit — et la
  // colonne n'a rien à mettre dans les créneaux SUIVANTS, non parce qu'elle ne les porte
  // pas, mais parce qu'on les lit plus haut. La Polyglotte n'a jamais lu cette colonne :
  // 32 cellules déclaraient « Absent de cette traduction » sur des versets bel et bien
  // portés, dont trois dans la colonne de l'AELF, qui est la référence de l'ossature.
  // ⚠️ On ne retient QUE les créneaux qui suivent le départ : celui du départ porte le
  // texte, et l'écraser masquerait le verset.
  const empans = useMemo(() => {
    const m = new Map<string, V2Row>();
    for (const r of v2) {
      if (!porteDuTexte(r) || !r.canon_id || !r.canon_id_fin || r.canon_id_fin === r.canon_id) continue;
      const liste = parLivre.get(r.livre);
      if (!liste) continue;
      const debut = liste.findIndex(c => c.id === r.canon_id);
      const fin = liste.findIndex(c => c.id === r.canon_id_fin);
      // ⚠️ Un empan dont la fin PRÉCÈDE le départ est une donnée fautive : on ne devine pas.
      if (debut < 0 || fin <= debut) continue;
      for (let k = debut + 1; k <= fin; k++) m.set(`${liste[k].id}|${r.trad_id}`, r);
    }
    return m;
  }, [v2, parLivre]);
  // Le chapitre à montrer quand les données portent le livre ENTIER : le chapitre
  // choisi. Quand elles ne portent qu'un chapitre, on montre ce qu'elles portent —
  // y compris le chapitre d'AVANT, sous la marque d'attente, le temps que le suivant
  // arrive : le tableau ne se vide pas, la lecture reste sous les yeux (même parti
  // que la page Bible, `attenteNavigation.tsx`).
  const chFiltre = (!toutAfficher && !sensiblesOnly && chapitreChoisi != null && porteeChargee?.chScope == null) ? chapitreChoisi : null;

  // Surnuméraires (versets sans slot canon) ancrés à leur position logique : après le
  // dernier verset mappé de la MÊME traduction (ordre livre → chapitre → verset d'origine).
  const { surnumApres, surnumStart, surnumCount, surnumParLivre } = useMemo(() => {
    const apres = new Map<string, Surnum[]>();   // canon_id → surnuméraires qui le suivent
    const start = new Map<string, Surnum[]>();   // livre → surnuméraires en tête de livre
    const count = new Map<string, number>();     // livre → nb (pour l'estimation de hauteur)
    const parLiv = new Map<string, Surnum[]>();  // livre → tous les surnuméraires (vue « seulement »)
    const parTrad = new Map<string, V2Row[]>();
    for (const r of v2) (parTrad.get(r.trad_id) ?? parTrad.set(r.trad_id, []).get(r.trad_id)!).push(r);

    // Un surnuméraire n'a pas de créneau du canon, mais plusieurs éditions peuvent porter LE
    // MÊME verset au même numéro d'origine — Tobie 1,23 existe chez Sacy comme chez Crampon.
    // On les regroupe alors sur UNE ligne, colonne par colonne, au lieu d'en faire deux lignes
    // sans rapport. La clé est la numérotation d'ÉDITION, seule chose qu'ils ont en commun.
    const groupes = new Map<string, Surnum>();
    for (const [trad, rows] of parTrad) {
      rows.sort((a, b) => (ordreDe.get(a.livre) ?? 999) - (ordreDe.get(b.livre) ?? 999) || a.ch_orig - b.ch_orig || a.v_orig - b.v_orig);
      let last: string | null = null, curLivre: string | null = null;
      for (const r of rows) {
        if (r.livre !== curLivre) { curLivre = r.livre; last = null; }
        if (r.canon_id) { last = r.canon_id; continue; }
        // ⛔ UNE GLOSE A SA PROPRE LIGNE, désignée par sa clé de segment : les gloses d'un même
        // verset portent toutes le numéro de leur hôte, et sous la clé commune la dernière
        // écrasait les autres. 48 versets du témoin en portent plusieurs, et 56 gloses ne
        // paraissaient pas (relevé du 2026-09-11). La clé ne porte pas la colonne : le texte
        // développé et la transcription diplomatique d'une même glose partagent sa ligne.
        const cle = r.cleGlose899 ? `glose|${r.livre}|${r.cleGlose899}` : `${r.livre}|${r.ch_orig}|${r.v_orig}`;
        let g = groupes.get(cle);
        if (!g) {
          g = { cle, livre: r.livre, ch: r.ch_orig, v: r.v_orig, ancre: last, par: new Map() };
          groupes.set(cle, g);
          count.set(r.livre, (count.get(r.livre) ?? 0) + 1);
          (parLiv.get(r.livre) ?? parLiv.set(r.livre, []).get(r.livre)!).push(g);
          if (last) (apres.get(last) ?? apres.set(last, []).get(last)!).push(g);
          else (start.get(r.livre) ?? start.set(r.livre, []).get(r.livre)!).push(g);
        }
        g.par.set(trad, r);
      }
    }
    return { surnumApres: apres, surnumStart: start, surnumCount: count, surnumParLivre: parLiv };
  }, [v2, ordreDe]);
  // Les livres RENDUS sont ceux que les données portent, non ceux qu'on demande : le
  // temps d'un chargement, c'est le livre d'avant qui reste à l'écran, sous la marque
  // d'attente, au lieu d'un tableau vide. `livres` est dans l'ordre canonique.
  const livresRendus = useMemo(
    () => livres.filter(l => parLivre.has(l.code) || surnumParLivre.has(l.code)),
    [livres, parLivre, surnumParLivre]
  );

  // Une colonne par SLOT (toujours NB_SLOTS) : un slot vidé (« — aucune — ») garde sa
  // place, colonne vide, au lieu de disparaître. `colonnes` = seulement les slots pourvus
  // d'une traduction, pour les calculs qui n'ont de sens que sur du texte réel.
  const slotCols = slotsDisponibles.map((id, i) => ({ slot: i, trad: trads.find(t => t.trad_id === id) ?? null }));
  const colonnes = slotCols.map(s => s.trad).filter((t): t is Trad => !!t);
  // Hauteur d'une ligne jamais encore peinte (voir `enBlocs`) : plus il y a de colonnes,
  // plus chacune est étroite, et plus son verset court sur de lignes.
  const hauteurLigneEstimee = 26 + 18 * Math.max(1, colonnes.length);

  // ── UNE COLONNE S'OUVRE ET SE FERME, ELLE NE SAUTE PAS (demande de l'auteur, 2026-09-23) ──
  // « Je passe de 4 à 3 colonnes : la colonne de droite est poussée, écrasée par les autres,
  // qui gagnent progressivement en largeur. » La colonne qui part reste rendue le temps d'une
  // transition (`fantomes`), sa piste passant de `1fr` à `0fr` ; celle qui arrive naît à
  // `0fr` et gagne `1fr` à l'image suivante (`entree`). C'est la grille qui s'anime
  // (`grid-template-columns`, interpolé tant que le nombre de pistes ne change pas), et la
  // colonne en transit ne compte pas dans la hauteur des lignes (`contain: size`, voir
  // `.poly-col-sortante`). ⛔ Rien ne se pose dans le corps d'un effet : la bascule se
  // reconnaît PENDANT LE RENDU, sur la clé des colonnes, et seuls les minuteurs éteignent.
  // ⚠️ Un échange de colonnes, qui garde leur nombre, ne s'anime pas : rien n'y part.
  const cleCols = slotCols.map(c => c.trad?.trad_id ?? "").join("|");
  const [colsPrec, setColsPrec] = useState<{ cle: string; cols: SlotCol[] }>({ cle: cleCols, cols: slotCols });
  const [fantomes, setFantomes] = useState<{ jeton: number; cols: SlotCol[] } | null>(null);
  const [entree, setEntree] = useState<{ jeton: number; depuis: number } | null>(null);
  // Chaque ouverture ou fermeture de colonne : c'est sur lui que se mesure le texte figé.
  const [transit, setTransit] = useState(0);
  if (colsPrec.cle !== cleCols) {
    const avant = colsPrec.cols.length;
    const apres = slotCols.length;
    const avaitDuTexte = colsPrec.cols.some(c => c.trad);
    setColsPrec({ cle: cleCols, cols: slotCols });
    if (avaitDuTexte && apres < avant) {
      setFantomes(f => ({ jeton: (f?.jeton ?? 0) + 1, cols: colsPrec.cols.slice(apres) }));
      setEntree(null);
      setTransit(t => t + 1);
    } else if (avaitDuTexte && apres > avant) {
      setEntree(e => ({ jeton: (e?.jeton ?? 0) + 1, depuis: avant }));
      setFantomes(null);
      setTransit(t => t + 1);
    }
  }
  // ⛔ AUCUN RENDU DE LA PAGE PENDANT LE GLISSEMENT (audit du 2026-09-23, « livre entier » :
  // « pas fluide du tout »). L'ouverture de la colonne qui arrive se faisait par un second
  // rendu React, 34 ms après le premier, c'est-à-dire en pleine animation : sur un livre
  // entier, mille cinq cents lignes se recomposaient au moment même où la grille devait
  // glisser. Elle passe désormais par la TABLE (variable `--poly-piste-entree` et attribut
  // `data-poly-entree-ouverte`, posés par l'effet de mise en page ci-dessous), et le seul
  // rendu qui reste — celui qui range les colonnes une fois le glissement fini — part en
  // transition, qui cède la main au navigateur au lieu de la lui prendre.
  // ⚠️ Des minuteurs et non des images d'animation : dans un onglet caché, une image ne se
  // joue jamais, et la colonne resterait à zéro jusqu'au retour du lecteur.
  const minuteurOuverture = useRef<number | null>(null);
  // Le glissement fini ET les colonnes rangées : la table rend leur largeur aux textes.
  // ⚠️ Pas avant : une colonne qui part, rendue à sa largeur réelle (zéro), recomposerait
  // son texte mot à mot sur toutes les lignes pour rien.
  // ── LA RECOMPOSITION FINALE SE DÉPLIE, ELLE NE SAUTE PAS (demande de l'auteur, 2026-09-23) ──
  // Quand une colonne arrive, le texte des colonnes en place ne se recompose qu'à la fin du
  // glissement, et les rangées prennent alors d'un coup leur nouvelle hauteur. Deux gestes
  // l'adoucissent, sur les seules rangées À L'ÉCRAN : chacune garde un instant sa hauteur
  // d'avant puis se déplie jusqu'à la nouvelle (le texte est rogné en bas le temps du
  // dépli), et le défilement se corrige pour que la première rangée visible ne bouge pas.
  // ⚠️ On cherche d'abord les TRANCHES visibles : interroger la géométrie de toutes les
  // rangées d'un livre entier forcerait la mise en page de ce que « content-visibility »
  // épargne. ⛔ Aucun état React : les hauteurs s'écrivent sur les rangées et se retirent.
  const minuteurDepli = useRef<number | null>(null);
  const rangeesDepliees = useRef<HTMLElement[]>([]);
  const finirDepli = useCallback(() => {
    if (minuteurDepli.current) { window.clearTimeout(minuteurDepli.current); minuteurDepli.current = null; }
    for (const rg of rangeesDepliees.current) { rg.style.height = ""; rg.style.overflow = ""; rg.style.transition = ""; }
    rangeesDepliees.current = [];
  }, []);
  useLayoutEffect(() => {
    if (fantomes || entree) return;
    const table = refTable.current;
    if (!table) return;
    const ouverture = table.getAttribute("data-poly-transit") === "ouvre";
    const calme = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let rangees: HTMLElement[] = [];
    if (ouverture && !calme) {
      const sommet = hautDeLecture(enteteRef.current);
      const pied = window.innerHeight;
      const visible = (el: Element) => { const b = el.getBoundingClientRect(); return b.bottom > sommet && b.top < pied; };
      const tranches = Array.from(table.querySelectorAll<HTMLElement>(".poly-bloc"));
      const sources = tranches.length ? tranches.filter(visible) : [table];
      rangees = sources.flatMap(t => Array.from(t.querySelectorAll<HTMLElement>(".poly-row, .poly-surnum-row"))).filter(visible);
    }
    const avant = rangees.map(rg => rg.getBoundingClientRect().height);
    const repere = rangees[0];
    const hautRepere = repere ? repere.getBoundingClientRect().top : 0;
    table.removeAttribute("data-poly-transit");
    table.removeAttribute("data-poly-entree-ouverte");
    if (!repere) return;
    finirDepli();
    const apres = rangees.map(rg => rg.getBoundingClientRect().height);
    const aDeplier = rangees.filter((rg, i) => Math.abs(apres[i] - avant[i]) >= 1);
    aDeplier.forEach(rg => { const i = rangees.indexOf(rg); rg.style.height = `${avant[i]}px`; rg.style.overflow = "hidden"; });
    // La première rangée visible reste où l'œil l'avait laissée.
    const decalage = repere.getBoundingClientRect().top - hautRepere;
    if (Math.abs(decalage) >= 1) window.scrollBy(0, decalage);
    if (!aDeplier.length) return;
    void table.offsetHeight;   // les hauteurs d'avant sont posées avant que la transition parte
    aDeplier.forEach(rg => {
      const i = rangees.indexOf(rg);
      rg.style.transition = `height ${DUREE_DEPLI_MS}ms ${COURBE_COLONNE}`;
      rg.style.height = `${apres[i]}px`;
    });
    rangeesDepliees.current = aDeplier;
    minuteurDepli.current = window.setTimeout(finirDepli, DUREE_DEPLI_MS + 60);
  }, [fantomes, entree, finirDepli]);
  useEffect(() => finirDepli, [finirDepli]);
  // ── LES LETTRES NE SAUTENT PAS D'UNE LIGNE À L'AUTRE (demande de l'auteur, 2026-09-23) ──
  // « Les lettres devraient se déplacer plus élégamment. » Tant que la piste d'une colonne
  // s'élargit ou se resserre, son texte se recomposait à CHAQUE image : les mots passaient
  // d'une ligne à l'autre sans cesse, et c'est ce va-et-vient qui se lisait comme un défaut.
  // Le texte se compose donc UNE fois, à la largeur qu'il aura à l'arrivée, dans une
  // enveloppe de largeur fixe (`.poly-cell-corps`) : la colonne le découvre en s'ouvrant, et
  // il glisse d'un bloc avec elle. Celle qui part garde la largeur qu'elle avait, et se fait
  // recouvrir. Les deux largeurs se MESURENT ici, avant la peinture : la zone des traductions
  // est la grille moins sa marge de référence et sa colonne de notes, partagée à parts égales.
  // ⚠️ Écrites dans le document (variables et attribut sur la table), jamais dans l'état : elles
  // ne changent rien au rendu React, seulement à la feuille.
  const minuteurTransit = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (transit === 0) return;
    finirDepli();
    const table = refTable.current;
    const grille = enteteRef.current?.querySelector<HTMLElement>('[data-visite="poly-entete"]');
    // ⚠️ La dernière case n'est la colonne des notes que si elle est rendue (`data-notes`).
    const cases = Array.from(grille?.children ?? []) as HTMLElement[];
    const avecNotes = cases.at(-1)?.hasAttribute("data-notes") ?? false;
    if (!table || !grille || cases.length < (avecNotes ? 3 : 2)) return;
    const colonnes = cases.slice(1, avecNotes ? -1 : undefined);
    const zone = grille.getBoundingClientRect().width - cases[0].getBoundingClientRect().width - (avecNotes ? cases[cases.length - 1].getBoundingClientRect().width : 0);
    const sortantes = colonnes.filter(c => c.classList.contains("poly-col-sortante")).length;
    const entrantes = colonnes.filter(c => c.classList.contains("poly-col-entrante")).length;
    const avant = colonnes.length - entrantes;
    const apres = colonnes.length - sortantes;
    if (zone <= 0 || avant <= 0 || apres <= 0) return;
    table.style.setProperty("--poly-col-depart", `${zone / avant}px`);
    table.style.setProperty("--poly-col-cible", `${zone / apres}px`);
    table.setAttribute("data-poly-transit", entrantes > 0 ? "ouvre" : "ferme");
    // La colonne qui arrive naît fermée (piste à 0fr), et s'ouvre à la tâche suivante.
    table.removeAttribute("data-poly-entree-ouverte");
    table.style.setProperty("--poly-piste-entree", "minmax(0, 0fr)");
    if (minuteurOuverture.current) window.clearTimeout(minuteurOuverture.current);
    if (entrantes > 0) {
      minuteurOuverture.current = window.setTimeout(() => {
        minuteurOuverture.current = null;
        table.style.setProperty("--poly-piste-entree", "minmax(0, 1fr)");
        table.setAttribute("data-poly-entree-ouverte", "");
      }, 34);
    }
    if (minuteurTransit.current) window.clearTimeout(minuteurTransit.current);
    minuteurTransit.current = window.setTimeout(() => {
      minuteurTransit.current = null;
      startTransition(() => { setFantomes(null); setEntree(null); });
    }, DUREE_COLONNE_MS + 60);
  }, [transit, finirDepli]);
  useEffect(() => () => {
    if (minuteurTransit.current) window.clearTimeout(minuteurTransit.current);
    if (minuteurOuverture.current) window.clearTimeout(minuteurOuverture.current);
  }, []);
  const colsRendues: ColRendue[] = [
    ...slotCols.map(c => ({ ...c, etat: entree && c.slot >= entree.depuis ? "entrante" as const : "stable" as const })),
    ...(fantomes?.cols ?? []).map(c => ({ ...c, etat: "sortante" as const })),
  ];

  // ── LA VISITE ──────────────────────────────────────────────────────────────
  // ⛔ ELLE NE S'OUVRE QUE LÀ OÙ LE TABLEAU EXISTE. Sous 820 px la page rend un
  // écran « largeur requise » et l'outil n'est pas peint : ses repères sont bien
  // dans le document, mais de taille nulle, si bien que toutes les étapes se
  // déroberaient l'une après l'autre et que la visite s'ouvrirait pour se fermer
  // aussitôt. Et elle attend que les colonnes soient venues : le texte de cette
  // page est chargé par le NAVIGATEUR, à la différence de la Bible classique, dont
  // le serveur rend le chapitre.
  const visitePrete = !ecranEtroit && colonnes.length > 0 && !attenteGlobale;

  // ⚠️ Un COMPTEUR, non un drapeau : rappelée par la barre alors qu'elle est déjà
  // ouverte, la visite doit repartir de son grand message, et le composant ne s'y
  // remet qu'en se remontant. Le compteur lui sert de clé (même patron que la Bible).
  const [visite, setVisite] = useState(0);
  // ⛔ ON ATTEND `profilPret` : la décision de passer une visite vit sur le COMPTE,
  // et tant que le profil n'est pas arrivé on ne sait pas ce qu'il en dit. Sans cette
  // garde, un lecteur qui a passé la visite ailleurs la reverrait sur ce poste — le
  // défaut même que la colonne `visites_faites` corrige. ⚠️ Ce n'est PAS un délai pour
  // le visiteur sans compte : `profilPret` ne vaut alors que « la session est connue »,
  // ce que `getSession` rend depuis le stockage local, sans réseau.
  useEffect(() => {
    if (!visitePrete || !profilPret) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("visite")) oublierVisite(CLE_VISITE_POLYGLOTTE);
    else if (visiteFaite(CLE_VISITE_POLYGLOTTE)) return;
    const depart = window.setTimeout(() => setVisite(1), DUREE_ENTREE_MS / 2);
    return () => window.clearTimeout(depart);
  }, [visitePrete, profilPret, visiteFaite, oublierVisite]);

  // L'offre au bouton d'administration de la barre. ⚠️ Elle se retire quand la page
  // cesse d'être en état d'en montrer une : le bouton disparaît alors de lui-même.
  useEffect(() => {
    if (!visitePrete) return;
    return offrirLaVisite(() => setVisite(n => n + 1));
  }, [visitePrete]);

  // ⛔ L'ÉTAPE DES NOTES OUVRE LA COLONNE, ET LA PAGE LA REND. Repliée — ce que le
  // lecteur garde souvent, le réglage étant enregistré dans son navigateur — elle
  // n'est qu'un rail de vingt-six pixels, et la cerner désignerait une boîte dont
  // rien ne dit ce qu'elle contient. On l'ouvre donc le temps de le montrer, puis on
  // remet le pli tel qu'il était : une visite explique, elle ne règle pas la page à
  // la place de celui qui la lit.
  const pliDesNotesRef = useRef<boolean | null>(null);
  const preparerScene = useCallback((scene: SceneVisite | undefined) => {
    if (!scene?.ouvrirNotes) return;
    setNotesReduites(plie => {
      if (pliDesNotesRef.current === null) pliDesNotesRef.current = plie;
      return false;
    });
  }, []);
  const rendreLePliDesNotes = useCallback(() => {
    const plie = pliDesNotesRef.current;
    pliDesNotesRef.current = null;
    if (plie !== null) setNotesReduites(plie);
  }, []);

  // ── LE TOUR CLAVIER DU TABLEAU (audit du 2026-09-23) ──────────────────────────
  // ⛔ UN SEUL ARRÊT DE TABULATION pour tout le tableau : chaque cellule en posait un, et
  // un chapitre en offrait des centaines à traverser avant d'atteindre la suite de la page.
  // Les flèches circulent ensuite de cellule en cellule (↑ ↓ dans la colonne, ← → dans la
  // rangée) ; Entrée ouvre les actions, comme avant. La souris ne voit rien de tout cela.
  // ⚠️ Le tabIndex se règle dans le DOCUMENT, non dans l'état : la cellule retenue change
  // au geste, et un rendu de la page pour elle serait un rendu de trop. React ne réécrit
  // pas une propriété qui n'a pas changé : la valeur posée ici tient.
  const foyerCelluleRef = useRef<string | null>(null);
  useEffect(() => {
    const table = refTable.current;
    if (!table) return;
    const premiere = table.querySelector<HTMLElement>("[data-poly-cellule]");
    if (!premiere) return;
    const retenue = foyerCelluleRef.current
      ? table.querySelector<HTMLElement>(`[data-poly-cellule="${CSS.escape(foyerCelluleRef.current)}"]`)
      : null;
    const cible = retenue ?? premiere;
    for (const c of table.querySelectorAll<HTMLElement>('[data-poly-cellule][tabindex="0"]')) if (c !== cible) c.tabIndex = -1;
    if (cible.tabIndex !== 0) cible.tabIndex = 0;
  });
  const surFoyerDuTableau = useCallback((e: React.FocusEvent<HTMLElement>) => {
    const cellule = (e.target as HTMLElement).closest<HTMLElement>("[data-poly-cellule]");
    if (!cellule || cellule !== e.target) return;
    foyerCelluleRef.current = cellule.dataset.polyCellule ?? null;
    for (const c of refTable.current?.querySelectorAll<HTMLElement>('[data-poly-cellule][tabindex="0"]') ?? []) if (c !== cellule) c.tabIndex = -1;
    cellule.tabIndex = 0;
  }, []);
  const surToucheDuTableau = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    const ici = e.target as HTMLElement;
    if (!ici.hasAttribute("data-poly-cellule") || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const table = refTable.current;
    if (!table) return;
    let voisine: HTMLElement | undefined;
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const colonne = ici.dataset.polyColonne;
      const liste = Array.from(table.querySelectorAll<HTMLElement>(`[data-poly-colonne="${colonne}"]`));
      voisine = liste[liste.indexOf(ici) + (e.key === "ArrowUp" ? -1 : 1)];
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const rangee = ici.closest(".poly-row, .poly-surnum-row");
      const liste = rangee ? Array.from(rangee.querySelectorAll<HTMLElement>("[data-poly-cellule]")) : [];
      voisine = liste[liste.indexOf(ici) + (e.key === "ArrowLeft" ? -1 : 1)];
    } else return;
    // ⛔ La flèche reste au tableau, même au bord : sans quoi ← et → changeraient de
    // chapitre sous une cellule retenue (`sensDeLaTouche` lit `defaultPrevented`).
    e.preventDefault();
    voisine?.focus();
  }, []);

  // ── LES CHAPITRES VOISINS (audit du 2026-09-23) ────────────────────────────────
  // Sous le tableau, ‹ « N sur M » ›, et les touches ← et →, sur le modèle de la page Bible
  // (`NavigationBasChapitre`, `chapitreVoisin`, `sensDeLaTouche`). Au bout d'un livre, le
  // livre voisin. ⚠️ Aucun livre n'est tenu pour absent (`absents` vide) : la Polyglotte
  // ne lit pas UNE bible, et l'absence d'un livre se dit dans sa colonne.
  // ⛔ En vue d'un chapitre seulement : ni livre entier, ni relecture filtrée.
  const enVueDeChapitre = !!livreChoisi && chFiltre != null && !surnumOnly && !sensiblesOnly && !ecranEtroit;
  const voisinsPoly = useMemo(() => {
    if (!enVueDeChapitre || !livreChoisi || chapitreChoisi == null) return null;
    const ctx = { ordre: livres.map(l => l.code), chapitres: chapitresParLivre, absents: new Set<string>() };
    const cible = (place: PlaceChapitre | null) => place && {
      ...place,
      nom: `${nomLivreReference(place.livre)} ${place.chapitre}`,
      href: urlEtatPolyglotte({ livre: place.livre, chapitre: place.chapitre, colonnes: slots, verset: null }),
    };
    return {
      precedent: cible(chapitreVoisin(livreChoisi, chapitreChoisi, "precedent", ctx)),
      suivant: cible(chapitreVoisin(livreChoisi, chapitreChoisi, "suivant", ctx)),
      position: { actuel: chapitreChoisi, total: nombreDeChapitres(livreChoisi, chapitresParLivre) },
    };
  }, [enVueDeChapitre, livreChoisi, chapitreChoisi, livres, chapitresParLivre, slots]);
  const allerAuChapitre = useCallback((href: string) => {
    const place = placePolyglotteDemandee(new URL(href, window.location.origin).search);
    if (!place) return;
    if (place.livre !== livreChoisi) choisirLivre(place.livre);
    setChapitreChoisi(place.chapitre); setToutAfficher(false); setVersetCible(null);
  }, [livreChoisi, choisirLivre]);
  // ⚠️ L'écoute ne se repose pas à chaque rendu : elle lit les voisins dans une référence.
  const toucheChapitreRef = useRef({ voisinsPoly, allerAuChapitre, attenteGlobale });
  useEffect(() => { toucheChapitreRef.current = { voisinsPoly, allerAuChapitre, attenteGlobale }; });
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      const { voisinsPoly: v, allerAuChapitre: aller, attenteGlobale: attente } = toucheChapitreRef.current;
      if (!v || attente) return;
      const modale = document.querySelector('[role="dialog"], [role="alertdialog"]') !== null;
      const sensTouche = sensDeLaTouche(e, document.activeElement, modale);
      const cible = sensTouche ? v[sensTouche] : null;
      if (!cible) return;
      e.preventDefault();
      aller(cible.href);
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, []);

  // ── LE LASSO (demande de l'auteur, 2026-09-23) ─────────────────────────────────
  // Le lasso des pages Bible et Œuvre (app/components/LassoLecture.tsx) : on tire depuis un
  // blanc, et les cellules touchées se prélèvent ou se copient d'un coup. ⛔ UNE SEULE
  // COLONNE : une citation ne mêle pas deux traductions, et un lasso tiré en travers se
  // teinte de rouge et le crie au centre, comme la lecture en regard de la page Bible.
  // ⚠️ Un chapitre à la fois : le prélèvement se range sous un chapitre, et le livre entier
  // en mêlerait plusieurs dans une seule citation. Pas au doigt, où glisser fait défiler.
  // ⚠️ La clé porte la COLONNE, non la traduction : l'identifiant de la transcription
  // diplomatique du témoin (« TR0009#diplomatic ») n'entre pas dans un sélecteur.
  const lassoActif = !sansSurvol && !ecranEtroit && chFiltre != null && !surnumOnly && colonnes.length > 0;
  const livreLasso = livreChoisi ? livres.find(l => l.code === livreChoisi) ?? null : null;
  const abrLasso = livreChoisi ? (ABREV_FR[livreChoisi] ?? livreChoisi) : "";
  type PassagePoly = { numero: number; texte: string; label: string; trad: string | null; canonId: string; clePrelev: string };
  const cellulesDuLasso = useMemo(() => {
    const table = new Map<string, PassagePoly>();
    if (!lassoActif || !livreChoisi) return table;
    const colonnesDuLasso = slotsDisponibles.map(id => trads.find(t => t.trad_id === id) ?? null);
    for (const r of parLivre.get(livreChoisi) ?? []) {
      if (r.ch_canon !== chFiltre) continue;
      colonnesDuLasso.forEach((t, slot) => {
        if (!t) return;
        const cs = cellule.get(`${r.id}|${t.trad_id}`) ?? [];
        if (!cs.length || cs[0]?.estLacune899) return;
        const brut = cs.map(c => c.texte).filter(Boolean).join(" ");
        if (!brut.trim()) return;
        const code = codeDeTraduction(t.trad_id);
        table.set(cleLasso(slot, r.id), {
          numero: r.v_canon,
          texte: texteLisibleDeLaBible(brut, tradBase(t.trad_id)),
          label: t.nom, trad: code, canonId: r.id,
          clePrelev: `${abrLasso}|${r.ch_canon}|${r.v_canon}|${code ?? t.nom}`,
        });
      });
    }
    return table;
  }, [lassoActif, livreChoisi, chFiltre, slotsDisponibles, trads, parLivre, cellule, abrLasso]);
  const passagesDuLasso = (cles: readonly string[]) => cles
    .map(cle => cellulesDuLasso.get(cle))
    .filter((p): p is PassagePoly => p !== undefined);
  const refusDuLasso = (cles: readonly string[]): RefusDeLasso | null => {
    const touchees = colonnesTouchees(cles, colonneDeLaCleLasso);
    if (touchees.length < 2) return null;
    const noms = touchees.map(slot => trads.find(t => t.trad_id === slotsDisponibles[slot])?.nom ?? `colonne ${slot + 1}`);
    return {
      titre: "Une seule traduction à la fois",
      detail: `Le lasso tient plusieurs traductions ensemble : ${enumererNoms(noms)}. Reprenez le geste dans une seule colonne.`,
    };
  };
  // ⛔ Les gestes refusent eux aussi une sélection qui mêle deux colonnes.
  const garderUneColonne = (cles: readonly string[]) => {
    const refus = refusDuLasso(cles);
    if (refus) throw new Error(refus.titre);
  };
  const dejaPreleves = (cles: readonly string[]) =>
    new Set(passagesDuLasso(cles).map(p => prelevs.get(p.clePrelev)).filter(Boolean)).size;
  // ⚠️ La clé des prélèvements est celle du signet de la cellule d'actions : le lasso et le
  // signet disent donc la même chose d'un verset.
  const enregistrerLasso = async (cles: readonly string[]): Promise<number | null> => {
    garderUneColonne(cles);
    if (!exigerCompte("prélever ces versets") || !userId || !livreLasso || chFiltre == null) return null;
    const vus = new Set<string>();
    const aEcrire = passagesDuLasso(cles).filter(p => {
      if (vus.has(p.clePrelev) || prelevs.has(p.clePrelev)) return false;
      vus.add(p.clePrelev);
      return true;
    });
    if (!aEcrire.length) return 0;
    const { data, error } = await supabase.from("prelevements").insert(aEcrire.map(p => ({
      user_id: userId, type: "biblique",
      ref_livre: livreLasso.nom_fr, ref_livre_abr: abrLasso,
      ref_chapitre: chFiltre, ref_verset: p.numero, canon_id: p.canonId,
      texte: p.texte, traduction: p.label, trad_id: p.trad,
    }))).select("id, ref_verset, trad_id, traduction");
    if (error) throw error;
    setPrelevs(m => {
      const n = new Map(m);
      for (const l of (data ?? []) as { id: string; ref_verset: number; trad_id: string | null; traduction: string | null }[]) {
        n.set(`${abrLasso}|${chFiltre}|${l.ref_verset}|${l.trad_id ?? l.traduction}`, l.id);
      }
      return n;
    });
    signalerProgression();
    return aEcrire.length;
  };
  const retirerLasso = async (cles: readonly string[]): Promise<number | null> => {
    garderUneColonne(cles);
    if (!userId) return null;
    const cibles = new Map<string, string>();   // identifiant du prélèvement → sa clé
    for (const p of passagesDuLasso(cles)) {
      const id = prelevs.get(p.clePrelev);
      if (id) cibles.set(id, p.clePrelev);
    }
    if (!cibles.size) return 0;
    const { error } = await supabase.from("prelevements").delete().eq("user_id", userId).in("id", [...cibles.keys()]);
    if (error) throw error;
    setPrelevs(m => {
      const n = new Map(m);
      for (const cle of cibles.values()) n.delete(cle);
      return n;
    });
    return cibles.size;
  };
  // La citation d'une sélection : « … » (Gn 1, 3-5.7), une élision là où un verset manque.
  const copierLasso = async (cles: readonly string[]) => {
    garderUneColonne(cles);
    const passages = passagesDuLasso(cles);
    if (!passages.length || chFiltre == null) return;
    await copierCitation(citationBiblique(
      texteDesVersets(passages.map(p => ({ numero: p.numero, texte: p.texte }))),
      `${abrLasso} ${chFiltre}, ${referenceDesVersets(passages.map(p => p.numero))}`,
    ));
  };

  // Les colonnes du tableau, pour le volet « Traductions affichées ». ⚠️ La notice est celle
  // de la bible : les deux états du témoin 899 ouvrent la même.
  const colonnesAffichees: ColonneAffichee[] = slotCols
    .filter((c): c is { slot: number; trad: Trad } => c.trad !== null)
    .map(c => ({ cle: c.trad.trad_id, code: tradBase(c.trad.trad_id), nom: c.trad.nom, variante: c.trad.variante }));

  // Sous le titre canonique du livre, la désignation que lui donnent les éditions affichées
  // quand elle diffère. C'est la seule façon pour le lecteur de savoir que la Sacy de 1730
  // appelle « Rois, livre troisième » ce que le canon nomme « 1 Rois ».
  const titresEdition = (code: string) =>
    colonnes
      .map(c => ({ id: c.trad_id, trad: c.nom, ed: livresEd[tradBase(c.trad_id)]?.[code] }))
      .filter((x): x is { id: string; trad: string; ed: { nom: string; abrege: string } } => Boolean(x.ed));
  // `minmax(0, 1fr)` et non `minmax(150px, 1fr)` : c'est la seule forme qui donne
  // des colonnes STRICTEMENT égales. Avec un minimum autre que zéro, une colonne
  // dont le contenu ne se laisse pas rétrécir (mot long, numéro d'origine en
  // `nowrap`) impose sa largeur et vole la place aux autres — les traductions ne
  // se lisaient plus sur un peigne régulier. Le zéro laisse la répartition `fr`
  // seule maîtresse, et toutes les colonnes de texte tombent à la même largeur.
  // Une seule colonne par traduction : la référence d'origine n'a plus de colonne à elle,
  // elle est passée EN LETTRINE dans le bloc de texte, que le texte vient habiller. Tout
  // ce qu'occupait la colonne étroite revient donc au texte.
  // Dernière colonne : les NOTES personnelles du lecteur (largeur fixe, hors du
  // partage `fr` des traductions). Enregistrées par verset sur le compte.
  const LARGEUR_NOTES = !notesVisibles ? "" : notesReduites ? "26px" : "13rem";
  // Une colonne en transit tient sa piste à `0fr` : c'est la grille qui l'ouvre ou la ferme.
  // ⚠️ La piste d'une colonne qui ARRIVE se lit dans une variable de la table : c'est elle,
  // non un nouveau rendu, qui l'ouvre (voir « Aucun rendu de la page pendant le glissement »).
  const tmpl = `${LARGEUR_REF}px ${colsRendues.map(c => (c.etat === "stable" ? "minmax(0, 1fr)" : c.etat === "entrante" ? "var(--poly-piste-entree, minmax(0, 0fr))" : "minmax(0, 0fr)")).join(" ")}${LARGEUR_NOTES ? ` ${LARGEUR_NOTES}` : ""}`;
  const HAUT_ENTETE = 52;   // titre et date de l'édition, sur deux lignes (ligne desserrée)
  const HAUT_NAV    = 10;   // blanc entre la NavBar et le haut de la page
  // Sommet du corps : sous la navbar, le blanc de séparation et la ligne des éditions.
  // C'est là que viennent se poser les bandeaux de nom de livre quand plusieurs livres se
  // suivent. ⚠️ La barre de titre n'y entre plus : le nom du livre est passé au volet.
  // HAUTEUR_NAVBAR est une chaîne rem ; on compose en calc() CSS (pas d'addition
  // numérique). La hauteur de l'en-tête reste en px.
  const SOMMET_CORPS = `calc(${HAUTEUR_NAVBAR} + ${HAUT_NAV + HAUT_ENTETE}px)`;
  // Ce qui reste à l'écran SOUS l'en-tête collant : la part visible du tableau. C'est
  // sur elle que l'anneau d'attente se centre, et c'est le plancher qu'on donne au corps
  // tant que rien n'est chargé — sans quoi l'anneau se centrerait dans un bloc de douze
  // rem posé en haut d'un écran vide, au lieu du milieu du tableau.
  const HAUTEUR_CORPS = `calc(100dvh - ${HAUTEUR_NAVBAR} - ${HAUT_NAV + HAUT_ENTETE}px)`;
  // Ce qu'on lit, écrit là où on l'a choisi.
  // ⛔ NI FLEURON, NI LE MOT « CHAPITRE » : la forme « Genèse ❧ Chapitre 35 » est celle
  // d'une page de TITRE, où le fleuron sépare deux lignes d'apparat et où la place ne manque
  // pas. Dans un volet de 200 px, sous un titre de page, elle faisait une seconde ligne qui
  // se disputait la première. Le passage se nomme donc comme partout ailleurs sur le site,
  // par sa RÉFÉRENCE : « Genèse 35 ». Le numéro se compose un rang plus pâle que le nom,
  // ce qui donne la hiérarchie sans ajouter un mot.
  const nomPassage = !onglet ? null : toutAfficher
    ? LIBELLE_ONGLET[onglet]
    : (livres.find(l => l.code === livreChoisi)?.nom_fr ?? LIBELLE_ONGLET[onglet]);
  const chapitrePassage = onglet && !toutAfficher ? chapitreChoisi : null;
  // La même chose d'un seul tenant, pour le rail du volet rabattu, qui n'a qu'une encre.
  const libellePassage = nomPassage == null ? null
    : chapitrePassage != null ? `${nomPassage} ${chapitrePassage}` : nomPassage;

  return (
    <div style={{ background: FOND, minHeight: "calc(100dvh - 3.5rem)" }}>
      {/* La comparaison en colonnes exige une largeur d'écran : indisponible sur téléphone. */}
      <style>{`
        .poly-outil { display: block; }
        .poly-mobile { display: none; }
        @media (max-width: 820px) {
          .poly-outil { display: none; }
          .poly-mobile { display: block; }
        }
        /* ⛔ Citer / copier / signaler ne vivent PLUS dans la cellule : la cellule
           d'actions du site se pose au-dessus du verset survolé, dans un portail
           (voir app/components/CelluleActions.tsx). Il ne reste ici que la teinte de
           survol d'un bouton ; son opacité et sa boîte viennent du module partagé, et
           l'ancien « .poly-act { opacity: 0 } » les aurait rendus invisibles dans le
           portail, où aucun sélecteur de cette page ne peut plus les atteindre. */
        .poly-act { transition: color .15s; }
        /* ── UNE COLONNE S'OUVRE ET SE FERME ──
           La piste passe de 1fr à 0fr (ou l'inverse), et les autres gagnent la place qu'elle
           rend. ⚠️ Le fond d'une ligne garde sa propre transition, ici et non plus en ligne :
           une déclaration en ligne battrait celle-ci. La colonne en transit s'efface et ne
           compte pas dans la hauteur des lignes (« contain: size ») : écrasée, son texte
           irait à la ligne à chaque mot et gonflerait toute la rangée. */
        .poly-grille { transition: background .4s ease, grid-template-columns ${DUREE_COLONNE_MS}ms ${COURBE_COLONNE}; }
        .poly-col { transition: opacity ${Math.round(DUREE_COLONNE_MS * 0.75)}ms ease; }
        .poly-bloc { content-visibility: auto; }
        .poly-col-entrante, .poly-col-sortante { contain: size; overflow: hidden; opacity: 0; pointer-events: none; }
        /* La colonne qui arrive s'OUVRE sans nouveau rendu de la page : la table porte
           « data-poly-entree-ouverte » et la piste passe à 1fr par une variable. */
        [data-poly-entree-ouverte] .poly-col-entrante { opacity: 1; }
        /* Pendant le transit, le texte d'une colonne est composé à sa largeur d'arrivée (celle
           qui part : à sa largeur de départ), et la cellule le rogne. La piste glisse, les
           lignes ne bougent plus. ⛔ Pas de fondu sur le texte qui se recompose : il se
           lisait comme un éclair (relevé de l'auteur, 2026-09-23). */
        [data-poly-transit] .poly-texte-cell { overflow: hidden; }
        [data-poly-transit] .poly-col-stable > .poly-cell-corps,
        [data-poly-transit] .poly-col-entrante > .poly-cell-corps { width: calc(var(--poly-col-cible) - 1px - 2 * var(--poly-marge-x)); }
        [data-poly-transit] .poly-col-sortante > .poly-cell-corps { width: calc(var(--poly-col-depart) - 1px - 2 * var(--poly-marge-x)); }
        /* ⛔ QUAND UNE COLONNE ARRIVE, C'EST LE MIROIR DE LA RÉDUCTION (demande de l'auteur,
           2026-09-23 : « quand on veut l'augmenter, le texte se replace de façon brutale »).
           Les colonnes en place gardent leur texte composé à leur largeur de DÉPART et se font
           recouvrir, comme la colonne qui part se fait recouvrir quand on en retire une ; la
           colonne qui arrive, composée à sa largeur d'arrivée, entre par la droite. Elle garde
           « contain: size » pendant tout le transit : sa hauteur ne compte pas, et les lignes
           ne bougent pas pendant le glissement. Le texte ne se recompose qu'une fois, à la
           fin, quand la table perd « data-poly-transit ». */
        [data-poly-transit="ouvre"] .poly-col-stable > .poly-cell-corps { width: calc(var(--poly-col-depart) - 1px - 2 * var(--poly-marge-x)); }
        @media (prefers-reduced-motion: reduce) {
          .poly-grille { transition: background .4s ease; }
          .poly-col { transition: none; }
        }
        .poly-act:hover { color: var(--cs-texte-second); }
        /* En-tête « Notes » : au survol de toute la cellule, « Notes » s'efface et
           « Fermer » apparaît à sa place (fondu croisé). */
        .poly-notes-head .lbl-notes { transition: opacity .15s ease; }
        .poly-notes-head .lbl-fermer { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 3px; opacity: 0; transition: opacity .15s ease; pointer-events: none; }
        .poly-notes-head:hover .lbl-notes { opacity: 0; }
        .poly-notes-head:hover .lbl-fermer { opacity: 1; }
        /* Rail réduit : le crayon s'éclaire au survol. ⚠️ Sur le papier, un voile blanc
           translucide ne se remarquerait pas : c'est le fond doux du site qui le désigne. */
        .poly-notes-rail { transition: background .14s ease, color .14s ease; }
        .poly-notes-rail:hover { background: var(--cs-fond-doux) !important; color: var(--cs-vert) !important; }
        /* Surbrillance très légère de la ligne survolée. Elle passe par un filtre
           (et non par le background) pour agir par-dessus les fonds inline — zébrage,
           signalétique, surnuméraires — sans les remplacer. */
        /* Ligne survolée : une légère surbrillance, sans mouvement. ⛔ Le pouls qui la
           rappelait toutes les trois secondes est retiré (audit du 2026-09-23) : une ligne
           qui palpite sous le curseur distrait de ce qu'on y lit. */
        .poly-row:hover, .poly-surnum-row:hover { filter: brightness(0.955); }
        /* Le nom d'édition ouvre son menu sur toute sa surface, mais son choix est composé
           en deux lignes : titre en sérif, millésime plus discret. ⚠️ Les deux états
           prenaient un voile BLANC translucide, juste sur l'ancien aplat vert et invisible
           sur le papier : ils passent à l'accent du site. */
        /* Un réglage du volet, en clair : au survol il se fonce d'un rang, il ne
           s'encadre pas. ⛔ La valeur RETENUE ne bouge pas au survol — elle porte déjà
           l'accent, et la faire changer d'encre laisserait croire qu'on va l'éteindre. */
        .poly-choix:not([aria-pressed="true"]):hover { color: var(--cs-texte-second); }
        /* ── LES CASES DE L'ÉCHELLE ──
           ⛔ Fond, encre et graisse SE DÉCLARENT ICI, jamais en ligne : une déclaration
           en ligne bat toute règle de feuille sans « important », et c'est ainsi que le
           survol du titre de colonne est resté mort pendant des semaines (note plus bas).
           ⚠️ La case retenue ne réagit pas au survol : elle porte déjà l'accent, et la
           faire changer d'encre laisserait croire qu'on va l'éteindre. */
        .poly-case { background: transparent; color: var(--cs-texte-doux); font-weight: 400; transition: background .12s, color .12s; }
        .poly-case:not([aria-pressed="true"]):hover { background: rgba(var(--cs-vert-rgb),0.06); color: var(--cs-texte-second); }
        .poly-case[aria-pressed="true"] { background: rgba(var(--cs-vert-rgb),0.12); color: var(--cs-vert); font-weight: 600; }
        /* Au doigt, une case d'échelle atteint le plancher de 24 px (charte, « LE DOIGT »). */
        @media (hover: none) { .poly-case { min-height: 24px; } }
        /* ⛔ LE FOND DU TITRE SE DÉCLARE ICI, ET NULLE PART EN LIGNE. Le bouton portait
           « background: none » dans son style en ligne : une déclaration en ligne bat
           toujours une règle de feuille sans « important », si bien que ce survol-ci ne
           s'est JAMAIS appliqué depuis qu'il a été écrit. Rien ne le signalait — il ne
           restait que l'anneau de foyer, que l'auteur a fini par relever comme le seul
           état visible, et qui n'en était pas un. C'est le piège du style en ligne déjà
           consigné pour les volets, pris par un autre bout. */
        .poly-trad-pick { background: none; }
        /* ⛔ PAS DE FILET AUTOUR DU TITRE quand le menu s'ouvre (décision de l'auteur,
           2026-09-04). Un cadre d'un pixel posé sur un en-tête de colonne redessine une
           boîte là où la page n'en porte aucune, et il paraissait au CLIC de souris —
           une règle « focus-within » sur un bouton sans enfant focalisable n'est qu'un
           « focus ». Le menu ouvert garde le sol du survol : la colonne reste désignée,
           sans qu'un trait s'ajoute à la réglure du tableau. ⚠️ Le clavier, lui, garde
           son anneau : c'est la règle « focus-visible » globale de globals.css, qui pose
           un contour et non un cadre intérieur. */
        .poly-trad-pick:hover,
        .poly-trad-pick[aria-expanded="true"] { background: rgba(var(--cs-vert-rgb),0.07); }
        /* ⛔ LA COMPOSITION DE LA COLONNE A QUITTÉ CETTE PAGE POUR « globals.css »
           (2026-09-04) — les mesures nommées, la marge de référence, la cellule de texte
           et la lettrine. Elle sert DEUX surfaces : cette page, et la Polyglotte de la
           page des résultats, qui portait une copie de ces classes sous le commentaire
           « REPRISES TELLES QUELLES de la page de lecture » — et qui avait dérivé sur
           tout : sans au lieu de sérif, référence dans une colonne bordée au lieu de la
           marge, lettrine centrée dans son étui au lieu de se poser sur la ligne de base.
           ⚠️ Ne restent ici que les règles PROPRES à cette page : le survol d'une rangée,
           le crayon, les boutons d'action, le curseur. */
        /* Le crayon SE POSE SUR le numéro de référence d'origine : au survol de la cellule,
           il recouvre le numéro (fond opaque = celui de la ligne, passé en style inline, donc
           accordé au zébrage alterné) et le remplace. Hors survol, il ne réserve aucune place. */
        .poly-edit {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: flex-end;
          opacity: 0; pointer-events: none;
          border-radius: 4px; padding: 0 1px;
        }
        .poly-texte-cell:hover .poly-edit,
        .poly-edit:focus-visible { opacity: 1; pointer-events: auto; }
        /* ⛔ L'ANCIEN FRANÇAIS NE SE JUSTIFIE PAS (audit du 2026-09-23) : aucun navigateur n'a
           de dictionnaire de coupure pour lui, et un texte justifié sans césure s'y creuse de
           lézardes. Il se ferre, comme le lecteur du témoin (charte § 3.11). */
        /* L'anneau du clavier : deux pixels, dans la cellule, et seulement au clavier. */
        .poly-texte-cell:focus-visible { outline: 2px solid var(--cs-vert); outline-offset: -2px; }
        .poly-texte-cell:lang(fro) { text-align: left; text-align-last: left; hyphens: manual; -webkit-hyphens: manual; }
        .poly-texte-cell[dir="rtl"] { text-align: right; text-align-last: right; }
      `}</style>

      <div className="poly-mobile" style={{ maxWidth: '32.5rem', margin: "0 auto", padding: "56px 22px 48px", fontFamily: "var(--font-source-sans), Arial, sans-serif", textAlign: "center", color: 'var(--cs-texte-second)' }}>
        <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: TITRE_CARTE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE_CARTE, margin: "0 0 16px" }}>Polyglotte</h1>
        <p style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
          Cette page compare plusieurs traductions côte à côte : elle demande un écran large, et ne tient pas sur un téléphone.
          <br /><br />
          <strong>Ouvrez-la sur un écran plus large.</strong>
        </p>
        {/* Le renvoi vers la Bible classique, qui se lit au téléphone (audit du 2026-09-23). */}
        {livreChoisi && (
          <p style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: "18px 0 0" }}>
            <a className="cs-lien-phrase" href={`/?livre=${livreChoisi}&chapitre=${chapitreChoisi ?? 1}`}>
              Lire {nomLivreReference(livreChoisi)} {chapitreChoisi ?? 1} dans la Bible classique
            </a>
          </p>
        )}
        {/* Un fleuron du registre ferme le message (21 septembre 2026 : l'ordinateur ardent a
            cédé sa place). Voir `FleuronDiscret`, qui dit quel fleuron ferme quel vide. */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "34px" }}><FleuronDiscret vide="polyglotte" /></div>
      </div>

      {/* Le MÊME volet que la page Bible — pas un cousin qui lui ressemble. Un seul composant
          pour les deux pages, donc une seule navigation à maintenir et à apprendre. */}
      <div className="poly-outil">
        <div style={{ display: "flex", alignItems: "flex-start", minHeight: "calc(100dvh - 3.5rem)" }}>
        {/* `top: 0` collait le volet au bord du viewport, c'est-à-dire DERRIÈRE la
            navbar fixe : sa barre de recherche disparaissait sous elle dès qu'on
            descendait. Le volet se cale donc sous la navbar, et n'occupe que la
            hauteur restante. */}
        <div style={{ position: "sticky", top: HAUTEUR_NAVBAR, height: HAUTEUR_SOUS_NAVBAR, flexShrink: 0, display: "flex", flexDirection: "column" }}>
          {voletReduit ? (
            // ⚠️ Le rail de ce volet a servi de MODÈLE aux deux volets de la page Bible
            // (demande de l'auteur, 2026-09-04) : les trois passent désormais par le même
            // composant, plutôt que par trois dessins voisins qui divergeaient déjà.
            // ⚠️ Il porte en complément le passage qu'on lit : sans lui, replier le volet
            // ferait perdre de vue le chapitre ouvert, que le tableau ne nomme plus.
            <RailVolet cote="gauche" libelle="Ouvrir les livres" complement={libellePassage}
              onOuvrir={() => setVoletReduit(false)} />
          ) : (
            <>
          {/* Titre de la page, en tête du volet de gauche, avec le bouton de repli à sa droite. */}
          <div style={{ flexShrink: 0, background: "var(--cs-fond-clair)", borderRight: "1px solid var(--cs-bord)", borderBottom: "1px solid var(--cs-bord)", padding: "12px 14px 11px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <h1 style={{ margin: 0, fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1rem', fontWeight: 600, color: VERT, letterSpacing: "0.01em", lineHeight: 1.2 }}>Bible polyglotte</h1>
              {/* Même bouton « réduire » que la page Bible et les pages d'œuvre : nu, sans
                  cadre, chevron discret. */}
              <button onClick={() => setVoletReduit(true)} title="Rabattre le volet" aria-label="Rabattre le volet"
                style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: "3px", color: "var(--cs-texte-doux)", display: "flex", alignItems: "center" }}>
                <IconeChevron dir="left" size={14} strokeWidth={1.5} />
              </button>
            </div>
            {/* Le passage lu, sous le nom de la page : il tenait dans un bandeau vert en tête
                du tableau, il est ici, là où on le choisit. ⚠️ Il se compose un rang SOUS le
                titre — même sérif, mais plus petit et sans graisse, dans l'encre du texte
                second — parce qu'il ne nomme pas la page mais ce qu'on y a ouvert. À la même
                taille et à la même encre, les deux lignes se lisaient comme deux titres.
                ⚠️ Pas de `nowrap` : « Ecclésiastique 44 » ne tient pas dans un volet de
                200 px, et il vaut mieux deux lignes qu'un nom coupé. */}
            {nomPassage && (
              <div style={{ marginTop: "3px", fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.8125rem', color: "var(--cs-texte-second)", lineHeight: 1.3, letterSpacing: "0.01em" }}>
                {nomPassage}
                {chapitrePassage != null && (
                  <span style={{ color: "var(--cs-texte-doux)", fontVariantNumeric: "tabular-nums" }}> {chapitrePassage}</span>
                )}
              </div>
            )}
          </div>
          {/* Choix du nombre de traductions affichées (Auto = selon la largeur d'écran). */}
          <div data-visite="poly-colonnes" style={{ flexShrink: 0, background: "var(--cs-fond-clair)", borderRight: "1px solid var(--cs-bord)", borderBottom: "1px solid var(--cs-bord)", padding: "8px 14px 9px" }}>
            <span style={{ display: "block", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cs-texte-second)", marginBottom: "5px" }}>Nombre de colonnes</span>
            <div role="group" aria-label="Nombre de traductions visibles" style={RANGEE_CASES}>
              {([["Auto", null], ["2", 2], ["3", 3], ["4", 4], ["5", 5]] as const).map(([lbl, val], rang) => (
                <button key={lbl} onClick={() => startTransition(() => setNbTradPref(val))} aria-pressed={nbTradPref === val}
                  className="poly-case" style={CASE_ECHELLE(rang === 0)}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          {/* Les colonnes du tableau, nommées avec leur édition ; le nom ouvre la notice. */}
          <TraductionsAffichees colonnes={colonnesAffichees} fiches={fichesTrad} />
          {/* Les deux réglages de relecture de l'administrateur. Ils étaient posés en absolu
              sur le bandeau du livre, qui n'existe plus ; ils descendent auprès de « Traductions
              visibles », dont ils sont les voisins naturels — ce sont des réglages, non des
              titres. ⚠️ Ils s'excluent l'un l'autre : activer l'un éteint l'autre. */}
          {estAdmin && (
            <div style={{ flexShrink: 0, background: "var(--cs-fond-clair)", borderRight: "1px solid var(--cs-bord)", borderBottom: "1px solid var(--cs-bord)", padding: "8px 14px 9px" }}>
              <span style={{ display: "block", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cs-texte-second)", marginBottom: "5px" }}>Relecture</span>
              {/* Deux interrupteurs INDÉPENDANTS, donc une option par ligne : leurs
                  libellés sont longs, et un rang les ferait retomber en escalier dans un
                  volet de 200 px. La teinte reste celle de chacun — c'est elle qui dit
                  ce que le filtre montre. */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
                {([["sensibles", sensiblesOnly, "var(--cs-danger)", "Lignes problématiques"],
                   ["surnum", surnumOnly, "var(--cs-surnum)", "Surnuméraires"]] as const).map(([cle, actif, teinte, libelle]) => (
                  <button key={cle}
                    onClick={() => {
                      if (cle === "sensibles") { setSensiblesOnly(!actif); if (!actif) { setSurnumOnly(false); setToutAfficher(false); } }
                      else { setSurnumOnly(!actif); if (!actif) { setSensiblesOnly(false); setToutAfficher(false); } }
                    }}
                    aria-pressed={actif}
                    className="poly-choix" style={CHOIX_DISCRET(actif, teinte)}>
                    {libelle}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
            <NavLivres
              livres={livresNav}
              livreActif={livreChoisi ?? ""}
              chapitreActif={chapitreChoisi ?? 0}
              traductionIndex={0}
              traductions={[]}
              onChoisirLivre={choisirLivre}
              onChoisirChapitre={(code, ch) => { if (code !== livreChoisi) choisirLivre(code); setChapitreChoisi(ch); setToutAfficher(false); setVersetCible(null); }}
              onChoisirLivreEntier={demanderLivreEntier}
              onChoisirVerset={(code, ch, v) => { if (code !== livreChoisi) choisirLivre(code); setChapitreChoisi(ch); setToutAfficher(false); setVersetCible({ ch, v }); }}
              entierActif={chapitreChoisi === null && !toutAfficher}
              onPreparerChapitre={preparerChapitre}
              titre="Livres à comparer"
              sansReduire
            />
          </div>
            </>
          )}
        </div>

      {/* ⚠️ Le rembourrage latéral est celui d'une marge de page, non celui d'une carte : il
          valait 18 px de chaque côté pour dégager l'ombre du bloc, qui n'existe plus. Toute
          largeur reprise ici revient au texte, et le calcul de largeur adaptative la compte. */}
      <div ref={refTable} onFocus={surFoyerDuTableau} onKeyDown={surToucheDuTableau} style={{ flex: 1, minWidth: 0, padding: "0 12px 60px", fontFamily: "var(--font-source-sans), Arial, sans-serif", color: "var(--cs-texte-fort)" }}>
        {/* ⛔ PLUS DE GRAVURE NI D'INVITE « Ouvrez un livre » (demande de l'auteur,
            2026-09-04 : « supprimer le dessin et afficher soit le dernier emplacement de
            lecture de l'utilisateur, soit la Genèse »). La tour de Babel ruinée occupait
            seule l'écran tant qu'aucun livre n'était ouvert ; or la page a maintenant
            toujours un livre à ouvrir, et l'écran qu'elle ornait n'existe plus. La planche
            passe en réserve (voir l'inventaire des illustrations).
            ⚠️ Il reste UN cas où rien ne s'ouvre, et lui seul se dit : la liste des livres
            n'a pas pu être lue. Un panneau discret journalise son erreur — un centre vide
            et muet se lirait comme une page qui charge encore. */}
        {!onglet && livresLus && (
          <div role="alert" style={{ minHeight: "calc(100dvh - 3.5rem - 6rem)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.9375rem', fontStyle: "italic", color: "var(--cs-mention)", letterSpacing: "0.02em", textAlign: "center" }}>
            La liste des livres n’a pas pu être lue.
          </div>
        )}

        {onglet && (
          <>

            {/* ── LE BLOC QUI ATTEND : L'EN-TÊTE ET LE CORPS ENSEMBLE ─────────────────
                ⛔ LE VOILE D'ATTENTE COUVRE LES EN-TÊTES DE COLONNE (demande de l'auteur,
                2026-09-04 : « quand on charge un texte, le fond change légèrement de
                couleur ; c'est ok, mais il faut aussi qu'il change au niveau des en-têtes
                de colonne »). Il ne couvrait que le corps, si bien que la teinte s'arrêtait
                net sous le filet de l'en-tête : la page se donnait comme à moitié en
                attente, et la bande qui porte le nom des éditions — c'est-à-dire ce qu'on
                vient de changer — restait la seule chose qui ne bougeait pas.
                ⚠️ C'est le BLOC POSITIONNÉ qui décide de ce que le voile couvre : il est en
                « position: absolute; inset: 0 », donc il s'étend à son parent positionné,
                et rien d'autre. Le remonter d'un cran suffit ; le corps garde le sien, dont
                dépendent les cellules d'actions.
                ⚠️ L'en-tête est COLLANT et porte « z-index: 5 » ; le voile monte à 900 et le
                recouvre donc, à l'arrêt comme au défilement. Il reste sans événements de
                pointeur : on peut changer une colonne pendant qu'une autre charge.
                ⚠️ L'anneau, lui, ne bouge pas d'un pixel : il vit dans un enfant collant à
                « SOMMET_CORPS », c'est-à-dire sous l'en-tête, et sa boîte est bornée par
                « 100dvh - SOMMET_CORPS », que le voile plus haut ne change pas. */}
            <div style={{ position: "relative" }}>

            {/* ── L'EN-TÊTE, SUR LE PAPIER ────────────────────────────────────────────
                Une seule ligne : le nom de chaque édition en tête de sa colonne, et un
                unique filet dessous. ⛔ Plus de barre de titre — le nom du livre est passé
                au volet — ni d'aplat vert : deux bandeaux empilés ouvraient la page comme
                un tableau, et c'est cela qu'on a défait.
                Il se colle SOUS la navbar, et non au bord du viewport : avec `top: 0` il se
                rangeait derrière elle et disparaissait dès qu'on descendait. Le `paddingTop`
                porte le blanc de séparation dans le bloc collant lui-même, sur un fond
                opaque, si bien que le texte ne défile jamais dans l'interstice. */}
            <div ref={enteteRef} style={{ position: "sticky", top: HAUTEUR_NAVBAR, zIndex: 5, background: FOND, paddingTop: HAUT_NAV }}>
              <div data-visite="poly-entete" className="poly-grille" style={{ display: "grid", gridTemplateColumns: tmpl, fontSize: '0.75rem', minHeight: HAUT_ENTETE, borderBottom: "1px solid var(--cs-bord)" }}>
                {/* La marge de la référence : la réglure ne commence qu'après elle. */}
                <div />
                {/* Un en-tête par colonne de traduction, exactement : la numérotation
                    d'origine ayant rejoint le texte en lettrine, il n'y a plus de seconde
                    piste à couvrir. ⚠️ Le filet de gauche est le HAUT de la réglure : il doit
                    tomber au même pixel que celui des cellules, sans quoi la verticale se
                    briserait sous l'en-tête. */}
                {colsRendues.map((sc, k) => {
                  const i = sc.slot;
                  // Une colonne qui part n'offre plus son menu : elle ne montre que son nom,
                  // le temps de s'effacer.
                  if (sc.etat === "sortante") return (
                    <div key={k} className="poly-col poly-col-sortante" style={{ borderLeft: `1px solid ${FILET_COL}`, padding: "5px 6px", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 0 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.875rem", color: "var(--cs-encre-fonce)" }}>
                        {sc.trad ? rendreEnrichi(sc.trad.nom) : null}
                      </span>
                    </div>
                  );
                  return (
                    // Une seule colonne par traduction depuis que la référence d'origine est
                    // passée en lettrine : le « span 2 » d'avant faisait déborder chaque
                    // en-tête sur sa voisine, et les quatre retombaient à la ligne en escalier.
                    // ⚠️ LA CELLULE DONNE DE L'AIR AU BLOC TEINTÉ (demande de l'auteur,
                    // 2026-09-04 : « l'encadrement me convient, mais il semble dépasser un
                    // peu ou toucher le bord de la case »). Elle n'avait AUCUN rembourrage
                    // vertical : mesuré, le bouton faisait 69 px dans une cellule de 69, si
                    // bien que le fond du survol et du menu ouvert courait d'un filet à
                    // l'autre et venait toucher la réglure. Cinq pixels en haut et en bas,
                    // six sur les côtés : le bloc se pose DANS la case au lieu de la remplir.
                    <div key={k} className={`poly-col poly-col-${sc.etat}`} style={{ borderLeft: `1px solid ${FILET_COL}`, padding: "5px 6px", display: "flex", alignItems: "stretch", justifyContent: "center", minWidth: 0 }}>
                      {/* Le nom est un menu déroulant : chevron pour qu'on voie qu'il se
                          clique. Une traduction déjà affichée ailleurs peut être choisie : les
                          deux colonnes s'échangent alors leur place (indiqué dans l'option). */}
                      <ChoixTraduction trads={trads} disponibles={traductionsDisponibles} slots={slotsDisponibles} index={i} onChoisir={choisirTraduction} />
                    </div>
                  );
                })}
                {/* En-tête de la colonne Notes — réductible en rail. Beaucoup de lecteurs
                    n'écriront jamais de note : la colonne se ferme d'un clic, et la place
                    qu'elle rend peut aller jusqu'à ouvrir une colonne de traduction de plus
                    (voir le calcul de largeur adaptative). */}
                {notesVisibles && <div data-visite="poly-notes" data-notes="" style={{ borderLeft: `1px solid ${FILET_COL}`, padding: notesReduites ? 0 : "0 6px", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, minWidth: 0 }}>
                  {notesReduites ? (
                    /* Colonne fermée : un simple crayon, propre et discret, pour rouvrir. */
                    <button onClick={() => setNotesReduites(false)} title="Afficher la colonne Notes" aria-label="Afficher la colonne Notes" className="poly-notes-rail"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cs-texte-doux)", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", padding: 0 }}>
                      {/* ⚠️ Un cran plus grand que le crayon d'une cellule (demande de
                          l'auteur) : seul contenu d'un rail de dix-huit pixels, il est ce
                          qu'on vise, non ce qu'on remarque en passant. */}
                      <IconeCrayon size={16} />
                    </button>
                  ) : (
                    /* Colonne ouverte : toute la cellule est cliquable ; au survol, « Notes »
                       laisse place à « Fermer ». */
                    <button onClick={() => setNotesReduites(true)} title="Fermer la colonne Notes" className="poly-notes-head"
                      style={{ background: "none", border: "none", cursor: "pointer", width: "100%", height: "100%", padding: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cs-texte-second)" }}>
                      <span className="lbl-notes" style={{ fontFamily: "var(--font-source-sans), Arial, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.16em", textIndent: "0.16em", textTransform: "uppercase" }}>Notes</span>
                      <span className="lbl-fermer" style={{ fontFamily: "var(--font-source-sans), Arial, sans-serif", fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--cs-texte-second)" }}>
                        Fermer
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                    </button>
                  )}
                </div>}
              </div>
            </div>

            {/* Corps : un bloc par livre, rendu paresseux (content-visibility). Un plancher
                de hauteur lui laisse la place quand rien n'est encore chargé, pour que
                l'anneau d'attente ait où se centrer.
                ⚠️ Il garde « position: relative », dont dépendent les cellules d'actions
                posées en absolu ; la marque d'attente, elle, a rejoint le bloc du dessus,
                qui porte aussi l'en-tête. */}
            <div data-passage={passage ?? undefined} style={{ position: "relative" }}>
            {/* `cs-lecture-colonne` : ce qui s'efface et paraît quand on passe d'un texte
                à l'autre (voir « passage » plus haut). L'en-tête collant, lui, ne bouge pas. */}
            {/* ⛔ Ni cadre, ni fond de surface, ni coins arrondis : le corps EST la page. Il
                portait une carte blanche bordée, qui s'arrêtait avant le bord du bloc et
                donnait à lire un objet posé sur le papier plutôt qu'une page imprimée. */}
            <div ref={corpsRef} className="cs-lecture-colonne" style={{ minHeight: attenteGlobale ? HAUTEUR_CORPS : undefined }}>
              {colonnes.length === 0 && (catalogueEnPanne ? (
                <div role="alert" style={{ padding: 20, display: "flex", alignItems: "center", gap: 12, fontSize: "0.8125rem", color: "var(--cs-danger)" }}>
                  Les traductions n’ont pas pu être lues.
                  <button onClick={() => window.location.reload()}
                    style={{ fontSize: "0.6875rem", padding: "2px 8px", borderRadius: 4, border: "1px solid var(--cs-danger-bord)", background: "var(--cs-surface)", color: "var(--cs-danger)", cursor: "pointer", fontFamily: "inherit" }}>
                    Réessayer
                  </button>
                </div>
              ) : <div style={{ padding: 20, color: "var(--cs-texte-second)" }}>Choisir au moins une traduction dans l’en-tête ci-dessus.</div>)}
              {erreurChargement && !attenteGlobale && (
                <div role="alert" style={{ padding: 20, display: "flex", alignItems: "center", gap: 12, fontSize: "0.8125rem", color: "var(--cs-danger)" }}>
                  Le chargement a échoué.
                  <button onClick={reessayer}
                    style={{ fontSize: "0.6875rem", padding: "2px 8px", borderRadius: 4, border: "1px solid var(--cs-danger-bord)", background: "var(--cs-surface)", color: "var(--cs-danger)", cursor: "pointer", fontFamily: "inherit" }}>
                    Réessayer
                  </button>
                </div>
              )}
              {/* ⛔ UN FILTRE QUI RETIRE DES LIGNES LE DIT (14 septembre 2026). « Lignes
                  problématiques » et « Surnuméraires » réduisent le livre aux seules lignes qu'ils
                  retiennent, et rien, dans le tableau, ne le disait : un livre dont un seul verset
                  est signalé paraissait tronqué. La mention nomme le filtre et rend le livre entier
                  d'un clic. */}
              {(sensiblesOnly || surnumOnly) && (
                <div role="status" style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "center", gap: "4px 14px", padding: "10px 12px", fontFamily: "var(--font-source-serif), Georgia, serif", fontStyle: "italic", fontSize: "0.8125rem", letterSpacing: "0.02em", color: "var(--cs-mention)" }}>
                  <span>{sensiblesOnly ? "Filtre de relecture : seules les lignes problématiques sont affichées." : "Filtre de relecture : seuls les versets surnuméraires sont affichés."}</span>
                  <button type="button" className="cs-bouton-lien" onClick={() => { setSensiblesOnly(false); setSurnumOnly(false); }}>Tout afficher</button>
                </div>
              )}
        {/* On NE démonte PAS le corps pendant un rechargement : changer de traduction ne
            fait que remplacer le texte des cellules, la structure (lignes du canon) reste
            en place — la position de lecture ne bouge donc pas et la transition est fluide.
            Changer de chapitre ou de livre garde de même l'ancien à l'écran, sous la
            marque, jusqu'à l'arrivée du nouveau (`livresRendus`, `chFiltre`). */}
        {colonnes.length > 0 && livresRendus.map(l => {
          // Ligne d'un verset surnuméraire — hors ossature canonique, en violet.
          // Plusieurs éditions peuvent porter le même verset au même numéro d'origine : elles
          // partagent alors cette ligne, chacune dans sa colonne. Une édition qui ne l'a pas
          // affiche un tiret, comme pour un verset du canon qui lui manquerait.
          const ligneSurnum = (g: Surnum, cle: string) => {
            const editions = [...g.par.keys()].length;
            // ⛔ UNE GLOSE DU TÉMOIN se compose en italique, un point sous le texte (charte
            // § 15.4), et porte son libellé à la place d'un numéro : celui de son hôte la ferait
            // lire comme ce verset. Le corps se pose sur la cellule ET sur la marge, qui
            // partagent un strut ; la lettrine, sans corps propre, suit sa cellule.
            const glose = [...g.par.values()].some(r => r.estGlose899);
            const titre = glose
              ? `Glose du témoin, après le verset ${g.ch}, ${g.v}`
              : editions > 1
                ? `Verset hors ossature canonique, porté par ${editions} éditions au même numéro (${g.ch}, ${g.v})`
                : `Verset propre à cette édition, hors de l'ossature canonique (${g.ch}, ${g.v})`;
            return (
              <div key={cle} className="poly-surnum-row poly-grille" style={{ display: "grid", gridTemplateColumns: tmpl, background: SURNUM_FOND, borderTop: "1px solid var(--cs-surnum-bord)", fontSize: '0.875rem' }}>
                {/* « ✦ » plutôt que « ＋ » : le plus disait « on a ajouté quelque chose », ce qui
                    est faux et un peu comptable. L'étoile marque un verset qui existe hors de
                    l'ossature, sans porter de jugement sur sa légitimité.
                    ⚠️ C'est la SEULE ligne du corps à porter encore des filets, en haut et
                    dans sa marge, et c'est délibéré : la page n'a plus d'horizontale, si bien
                    qu'un filet y devient un signal fort au lieu d'être une trame. */}
                <div title={titre} className="poly-marge-ref" style={{ paddingRight: '6px', color: SURNUM, borderRight: `2px solid ${SURNUM}`, ...(glose ? { fontSize: CORPS_GLOSE.sousVerset } : {}) }}>
                  <span style={{ fontWeight: 700, fontSize: '0.71875rem' }}>✦</span>
                </div>
                {colsRendues.map((sc, i) => {
                  const r = sc.trad ? g.par.get(sc.trad.trad_id) : undefined;
                  // Un surnuméraire n'a pas de référence canonique : on signale sur sa
                  // numérotation d'origine, et l'on n'y prélève pas.
                  const actionsSurnum: ActionsDeCellule | null = r && sc.trad && sc.etat === "stable" ? {
                    cle: `surnum|${cle}|${sc.trad.trad_id}`,
                    refLisible: `${ABREV_FR[g.livre] ?? g.livre} ${g.ch}, ${g.v}${r.estGlose899 ? ', glose' : ''}`,
                    texte: r.texte ?? "",
                    citer: null,
                  } : null;
                  return (
                    <div key={i} className={`poly-texte-cell poly-col poly-col-${sc.etat}`} lang={sc.trad?.langHtml ?? sc.trad?.lang} dir={sc.trad?.langHtml === "he" ? "rtl" : undefined} onCopy={copierSansCesures}
                      onMouseEnter={actionsSurnum ? e => ancrerActions(e.currentTarget, actionsSurnum) : undefined}
                      onMouseLeave={actionsSurnum ? () => celluleActions.relacher(actionsSurnum.cle) : undefined}
                      onClick={actionsSurnum ? e => celluleActions.basculer(e.currentTarget, actionsSurnum.cle, sansSurvol && celluleActions.ancre?.cle === actionsSurnum.cle, { borne: e.currentTarget, sommet: hautDeLecture(enteteRef.current), donnees: actionsSurnum }) : undefined}
                      tabIndex={actionsSurnum ? -1 : undefined}
                      data-poly-cellule={actionsSurnum ? `s|${cle}|${sc.slot}` : undefined} data-poly-colonne={actionsSurnum ? sc.slot : undefined}
                      onKeyDown={actionsSurnum ? e => activerAuClavier(e, () => celluleActions.basculer(e.currentTarget, actionsSurnum.cle, celluleActions.ancre?.cle === actionsSurnum.cle, { borne: e.currentTarget, sommet: hautDeLecture(enteteRef.current), donnees: actionsSurnum })) : undefined}
                      style={{ borderLeft: "1px solid var(--cs-surnum-bord)", color: r ? 'var(--cs-surnum-fort)' : 'var(--cs-surnum-bord)', ...(r?.estGlose899 ? { fontStyle: 'italic', fontSize: CORPS_GLOSE.sousVerset } : {}) }}>
                      {/* Même lettrine que les versets canoniques, au violet des surnuméraires :
                          la référence d'origine est ici la seule qui existe. Une glose y porte
                          son libellé, non le numéro de son hôte. */}
                      <div className="poly-cell-corps">
                      {r && (
                        <span className="poly-lettrine" style={{ color: SURNUM, borderRightColor: "rgba(90,75,156,0.22)" }}>
                          <span className="poly-lettrine-item">
                            <span className="poly-lettrine-ref">
                              {r.estGlose899 ? LIBELLE_GLOSE : (
                                <><span className="poly-lettrine-ch" style={{ color: 'var(--cs-surnum-doux)' }}>{r.ch_orig},</span> {r.v_orig}</>
                              )}
                            </span>
                          </span>
                        </span>
                      )}
                      {!sc.trad ? "" : r ? texteCesure(r.texte, sc.trad.lang) : <CelluleAbsente />}
                      </div>
                    </div>
                  );
                })}
                {/* Colonne Notes : pas de note sur un surnuméraire (hors ossature du canon). */}
                {notesVisibles && <div style={{ borderLeft: "1px solid var(--cs-surnum-bord)" }} />}
              </div>
            );
          };

          // Vue « surnuméraires seulement » : uniquement les versets propres à la Septante.
          if (surnumOnly) {
            const srs = surnumParLivre.get(l.code) ?? [];
            if (!srs.length) return null;
            return (
              <section key={l.code} style={{ contentVisibility: "auto", containIntrinsicSize: `0 ${srs.length * 34 + 40}px` } as React.CSSProperties}>
                <h2 style={{ margin: 0, padding: "10px 12px 10px 44px", fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1rem', color: VERT, background: "var(--cs-fond)", borderTop: "1px solid var(--cs-vert-pale)", borderBottom: "1px solid var(--cs-vert-pale)", position: "sticky", top: SOMMET_CORPS, zIndex: 3, textAlign: "center" }}>
                  {l.nom_fr} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: SURNUM }}>· {srs.length} surnuméraire{srs.length > 1 ? "s" : ""}</span>
                {titresEdition(l.code).map(({ id, trad, ed }) => (
                  <span key={id} style={{ display: "block", fontSize: '0.71875rem', fontWeight: 400, fontStyle: "italic", color: "var(--cs-texte-gris)", marginTop: 2 }}>
                    {trad} : {ed.nom}
                  </span>
                ))}
                </h2>
                {srs.map((sr, i) => ligneSurnum(sr, `so-${l.code}-${i}`))}
              </section>
            );
          }

          const rows0 = parLivre.get(l.code) ?? [];
          // Filtre chapitre (`chFiltre`, plus haut) : par défaut on ne montre qu'un
          // chapitre, le livre entier étant trop lourd.
          const rowsCh = chFiltre != null ? rows0.filter(r => r.ch_canon === chFiltre) : rows0;
          const rows = sensiblesOnly ? rowsCh.filter(r => sens.estSensible(l.code, r.ch_canon, r.v_canon)) : rowsCh;
          // Les surnuméraires de tête de livre ne s'affichent qu'au chapitre 1 (ou en livre entier).
          const debut = (sensiblesOnly || (chFiltre != null && chFiltre !== 1)) ? [] : (surnumStart.get(l.code) ?? []);
          if (!rows.length && !debut.length) return null;
          const hauteur = (rows.length + (sensiblesOnly ? 0 : surnumCount.get(l.code) ?? 0)) * 34 + 40;

          return (
            <section key={l.code} style={{ contentVisibility: "auto", containIntrinsicSize: `0 ${hauteur}px` } as React.CSSProperties}>
              {/* Le nom du livre ne s'écrit ici QUE si plusieurs livres se suivent : quand un
                  seul est ouvert, la barre de titre collante le porte déjà, et le répéter juste
                  en dessous le donnait à lire deux fois. Les désignations propres aux éditions,
                  elles, restent dans tous les cas — l'en-tête ne les porte pas. */}
              {(toutAfficher || titresEdition(l.code).length > 0) && (
                <h2 style={{ margin: 0, padding: "10px 12px 10px 44px", fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1rem', color: VERT, background: "var(--cs-fond)", borderTop: "1px solid var(--cs-vert-pale)", borderBottom: "1px solid var(--cs-vert-pale)", position: "sticky", top: SOMMET_CORPS, zIndex: 3, textAlign: "center" }}>
                  {toutAfficher && l.nom_fr}
                  {titresEdition(l.code).map(({ id, trad, ed }) => (
                    <span key={id} style={{ display: "block", fontSize: '0.71875rem', fontWeight: 400, fontStyle: "italic", color: "var(--cs-texte-gris)", marginTop: 2 }}>
                      {trad} : {ed.nom}
                    </span>
                  ))}
                </h2>
              )}
              {debut.map((sr, i) => ligneSurnum(sr, `sd-${l.code}-${i}`))}
              {/* ⚠️ Le rang de la ligne ne sert plus : il ne servait qu'au zébrage. */}
              {enBlocs(rows.map(r => {
                const sensible = sens.estSensible(l.code, r.ch_canon, r.v_canon);
                // UN DOUTE DE TRAVAIL N'EST PAS UNE INFORMATION DE LECTURE. Le rouge et le « ⚠ »
                // disent « ce verset est peut-être mal aligné » : c'est une consigne d'atelier.
                // Au lecteur, ils donnaient à croire que le texte lui-même est suspect. Ils ne
                // paraissent donc qu'en mode administrateur. Le violet des surnuméraires reste,
                // lui, visible de tous : il ne signale pas un doute mais un fait — ce verset
                // n'appartient pas à l'ossature canonique.
                const signaler = sensible && estAdmin;
                const desc = (sens.libelle.get(`${l.code}|${r.ch_canon}`) ?? []).join(" ; ");
                // Ligne que AUCUNE des traductions affichées ne porte. Elle reste à sa place
                // — le créneau existe dans l'ossature, et le taire ferait croire à un saut de
                // numérotation — mais elle se retire du regard : on la grise, pour qu'elle ne
                // se lise plus comme une ligne de texte qu'on aurait oublié de remplir.
                const ligneVide = colonnes.every(t => (cellule.get(`${r.id}|${t.trad_id}`) ?? []).length === 0);
                // Les fonds qui DISENT quelque chose, et eux seuls : le rose d'un cas qui a
                // résisté à la correction (plus précis qu'un point simplement à vérifier, il
                // prime donc sur le rouge), le rouge d'un point à vérifier, le gris d'un
                // créneau qu'aucune colonne ne porte, le vert pâle d'une suscription. Toutes
                // les autres lignes portent le papier, sans alternance.
                const resiste = estAdmin && sens.resiste(l.code, r.ch_canon, r.v_canon);
                const fond = resiste ? ROSE_FOND : signaler ? ROUGE_FOND : ligneVide ? "var(--cs-fond-doux)" : r.est_suscription ? "var(--cs-vert-pale)" : FOND_LIGNE;
                const apres = sensiblesOnly ? [] : (surnumApres.get(r.id) ?? []);
                // Référence canonique lisible, partagée par les actions de chaque cellule
                // (chaque cellule cite et signale SA propre traduction).
                const abr = ABREV_FR[l.code] ?? l.code;
                const refLisible = `${abr} ${r.ch_canon}, ${r.v_canon}`;
                // Le crayon de l'administrateur ouvre la fenêtre de correction d'un verset d'origine.
                const editerVerset = (ligne: V2Row) => {
                  setCibleEdition({ id: ligne.id, texte: ligne.texte ?? "", reference: `${l.nom_fr} ${ligne.ch_orig}, ${ligne.v_orig}` });
                  setEnregistre("idle");
                };
                return (
                  <Fragment key={r.id}>
                    <div className="poly-row poly-grille" id={`poly-${l.code}-${r.ch_canon}-${r.v_canon}`}
                      style={{ display: "grid", gridTemplateColumns: tmpl, background: ((versetCible && versetCible.ch === r.ch_canon && versetCible.v === r.v_canon) || (versetDesigne && versetDesigne.livre === livreChoisi && versetDesigne.ch === r.ch_canon && versetDesigne.v === r.v_canon)) ? 'rgba(var(--cs-vert-rgb),0.14)' : fond, fontSize: '0.875rem', scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + ${HAUT_NAV + HAUT_ENTETE + 8}px)` }}>
                      {/* La référence canonique, EN MARGE : elle accompagne le verset au lieu
                          d'occuper une colonne bordée. Alignée à droite pour que les numéros
                          tombent tous au même fer, et calée sur la première ligne du texte.
                          ⚠️ Le filet ne subsiste que sur un point signalé, où il DIT quelque
                          chose ; ailleurs, la marge est nue. */}
                      {/* ⚠️ L'infobulle paraît dès qu'un point — ouvert ou CLOS — a été
                          consigné sur ce chapitre : c'est là que se lit l'explication d'une
                          case vide, et un point corrigé garde tout son pouvoir d'explication
                          quand il a cessé d'être une tâche. */}
                      <div title={estAdmin && desc ? desc : undefined} className="poly-marge-ref"
                        style={{ color: signaler ? ROUGE : ligneVide ? 'var(--cs-texte-doux)' : VERT, borderRight: signaler ? `2px solid ${ROUGE}` : undefined }}>
                        <span>{r.ch_canon}, {r.v_canon}{signaler ? " ⚠" : ""}</span>
                      </div>
                      {colsRendues.map((sc, i) => {
                        if (!sc.trad) return <div key={i} className={`poly-col poly-col-${sc.etat}`} style={{ borderLeft: `1px solid ${FILET_COL}` }} />;
                        const t = sc.trad;
                        const enTransit = sc.etat !== "stable";
                        const cs = cellule.get(`${r.id}|${t.trad_id}`) ?? [];
                        // La case n'a pas de texte à elle : est-elle COUVERTE par un verset
                        // qu'on lit plus haut, ou l'édition ne la porte-t-elle pas du tout ?
                        const couvrant = cs.length === 0 ? empans.get(`${r.id}|${t.trad_id}`) : undefined;
                        // Actions propres à CETTE cellule : citer / signaler la traduction qu'elle
                        // porte. Clé de citation étendue au nom d'édition pour que chaque colonne
                        // ait son propre état « enregistré ».
                        const texteCell = cs.map(c => c.texte).filter(Boolean).join(" ");
                        // TR0009 : une lacune du manuscrit se rend « [lacune du manuscrit] », sans
                        // lettrine ni actions (rien à citer), et non par la case « absente » générique.
                        const lacuneCell = cs.length > 0 && cs[0]?.estLacune899 === true;
                        const cleCite = `${abr}|${r.ch_canon}|${r.v_canon}|${codeDeTraduction(t.trad_id) ?? t.nom}`;
                        // ⚠️ Une lacune du témoin n'a rien à citer ni à copier : pas d'actions.
                        const actionsCell: ActionsDeCellule | null = cs.length > 0 && !lacuneCell && !enTransit ? {
                          cle: `${r.id}|${t.trad_id}`,
                          refLisible,
                          // Le texte qu'on copie, cite ou signale est le texte LISIBLE : sans les marqueurs du témoin.
                          texte: texteLisibleDeLaBible(texteCell, tradBase(t.trad_id)),
                          citer: { cle: cleCite, refLivre: l.nom_fr, refAbr: abr, chapitre: r.ch_canon, verset: r.v_canon, traductionLabel: t.nom, tradId: t.trad_id },
                        } : null;
                        return (
                          <div key={i} className={`poly-texte-cell poly-col poly-col-${sc.etat}`} lang={t.langHtml ?? t.lang} dir={t.langHtml === "he" ? "rtl" : undefined} onCopy={copierSansCesures}
                            data-lasso-cellule={lassoActif && actionsCell && cellulesDuLasso.has(cleLasso(sc.slot, r.id)) ? cleLasso(sc.slot, r.id) : undefined}
                            // ⛔ Le BLANC d'une cellule ouvre le lasso, bien qu'elle soit focalisable
                            // (voir `SELECTEUR_FOND_DECLARE`) : sans quoi le tableau n'en offrait nulle part.
                            data-lasso-fond={lassoActif ? "" : undefined}
                            onMouseEnter={actionsCell ? e => ancrerActions(e.currentTarget, actionsCell) : undefined}
                            onMouseLeave={actionsCell ? () => celluleActions.relacher(actionsCell.cle) : undefined}
                            onClick={actionsCell ? e => celluleActions.basculer(e.currentTarget, actionsCell.cle, sansSurvol && celluleActions.ancre?.cle === actionsCell.cle, { borne: e.currentTarget, sommet: hautDeLecture(enteteRef.current), donnees: actionsCell }) : undefined}
                            tabIndex={actionsCell ? -1 : undefined}
                            data-poly-cellule={actionsCell ? `${r.id}|${sc.slot}` : undefined} data-poly-colonne={actionsCell ? sc.slot : undefined}
                            onKeyDown={actionsCell ? e => activerAuClavier(e, () => celluleActions.basculer(e.currentTarget, actionsCell.cle, celluleActions.ancre?.cle === actionsCell.cle, { borne: e.currentTarget, sommet: hautDeLecture(enteteRef.current), donnees: actionsCell })) : undefined}
                            style={{ borderLeft: `1px solid ${FILET_COL}`, color: signaler ? 'var(--cs-danger-fonce)' : "var(--cs-encre-fonce)" }}>
                            {/* La lettrine : la PREMIÈRE référence d'origine et son crayon, en bloc
                                flottant que le texte habille. ⛔ Les suivantes ne s'y empilent plus
                                (décision du 14 septembre 2026) : quand plusieurs versets de l'édition
                                partagent un créneau du canon, chacun pose sa référence EN LIGNE,
                                devant son propre texte (voir « .poly-ref-en-ligne »). Empilées, elles
                                laissaient un numéro seul sur sa ligne en face d'un texte court. */}
                            {/* L'enveloppe ne compte que pendant qu'une colonne s'ouvre ou se ferme :
                                elle y reçoit la largeur d'arrivée (voir `data-poly-transit`). */}
                            <div className="poly-cell-corps">
                            {cs.length > 0 && !lacuneCell && (
                              <span className="poly-lettrine">
                                <span className="poly-lettrine-item">
                                  <span className="poly-lettrine-ref" title={referenceOrigine(cs[0])}>
                                    <RefOrigine ligne={cs[0]} note={noteMontree(cs[0], estAdmin)} />
                                  </span>
                                  {estAdmin && !est899(t.trad_id) && !cs[0].lectureSeule && <BoutonEditionVerset ligne={cs[0]} fond={fond} onEditer={editerVerset} />}
                                </span>
                              </span>
                            )}
                            {cs.length === 0 ? (
                              // ⚠️ Une colonne dont le texte n'est pas encore venu n'est pas
                              // une colonne qui ne porte pas le verset : voir `tradsEnAttente`.
                              // ⛔ Et une case COUVERTE par un empan n'est pas une case absente :
                              // elle renvoie au verset de l'édition où le texte se lit.
                              tradsEnAttente.has(t.trad_id) ? <CelluleEnAttente />
                                : couvrant ? <CelluleEmpan ligne={couvrant} chapitreDuCreneau={r.ch_canon} sansSuffixe={t.trad_id === "TR0004"} />
                                : <CelluleAbsente deutero={deuterocanonique(r.id)} />
                            ) : lacuneCell ? (
                              // Fait du témoin, et non défaut de traduction. ⛔ La mention prend la
                              // voix de « Absent de cette traduction », ENCRE COMPRISE (décision du
                              // 14 septembre 2026) : c'est le mot qui distingue les deux faits.
                              <span title={MENTION_LACUNE_TITRE} style={STYLE_MENTION_LACUNE}>{MENTION_LACUNE}</span>
                            ) : cs.map((c, k) => (
                              // Colonne du TÉMOIN (TR0009) : le texte porte des marqueurs éditoriaux
                              // inline (`[lecture incertaine : …]`, `[lacune : …]`, `[ajout marginal : …]`).
                              // Bruts, ils s'affichaient tels quels (« [lacune : déchirure] »).
                              // On les rend par le MÊME tokeniseur que la page Bible : la lacune devient
                              // un discret « […] », la lecture incertaine passe en gris, le motif est masqué.
                              //
                              // Colonne de la TRADUCTION MODERNE du même témoin (TR0013) : elle n’est pas
                              // recomposée, mais elle porte les mêmes lacunes en clair. Elle passe donc par
                              // l’enrichissement ordinaire, la lacune seule recevant sa mise en forme.
                              <span key={k}>
                                {k > 0 ? " " : ""}
                                {/* ⛔ Le numéro d'un verset réuni se pose EN LIGNE, devant son texte :
                                    le premier seul tient la lettrine (voir plus haut). */}
                                {k > 0 && (
                                  <span className="poly-ref-en-ligne" title={referenceOrigine(c)}>
                                    <RefOrigine ligne={c} note={noteMontree(c, estAdmin)} />
                                    {estAdmin && !est899(t.trad_id) && !c.lectureSeule && <BoutonEditionVerset ligne={c} fond={fond} onEditer={editerVerset} />}
                                  </span>
                                )}
                                {est899(t.trad_id)
                                  ? rendreMarqueurs899(c.texte ?? "")
                                  : texteCesure(c.texte, t.lang, estTraductionModerne899(t.trad_id) ? marquerLacunesDuTemoin : undefined)}
                              </span>
                            ))}
                            </div>
                          </div>
                        );
                      })}
                      {/* Colonne Notes : note personnelle du verset (enregistrée sur le compte). */}
                      {notesVisibles && (
                        <div style={{ borderLeft: `1px solid ${FILET_COL}`, padding: notesReduites ? 0 : "3px 5px", display: "flex" }} onClick={e => e.stopPropagation()}>
                          {notesReduites ? null : <CelluleNote valeur={notes.get(r.id) ?? ""} refLisible={refLisible} onChange={t => majNote(r.id, t)} cleFoyer={`n|${r.id}`} />}
                        </div>
                      )}
                    </div>
                    {apres.map((sr, i) => ligneSurnum(sr, `sa-${r.id}-${i}`))}
                  </Fragment>
                );
              }), l.code, hauteurLigneEstimee)}
            </section>
          );
        })}
            {voisinsPoly && colonnes.length > 0 && !attenteGlobale && (
              <NavigationBasChapitre precedent={voisinsPoly.precedent} suivant={voisinsPoly.suivant} position={voisinsPoly.position} onAller={allerAuChapitre} />
            )}
            </div>
            </div>
            <MarqueAttente enAttente={attenteGlobale} sommet={SOMMET_CORPS} />
            </div>

          </>
        )}
      </div>
        </div>
      </div>

      {/* La cellule d'actions du verset survolé : citer, copier, signaler. En portail
          vers <body>, au-dessus du texte et jamais dessus (app/lib/celluleActions.ts).
          ⛔ Les boutons ne portent plus « poly-act » pour leur opacité : dans un portail,
          aucun sélecteur de cette page ne les atteint — c'est la cellule qui paraît ou
          non, et la classe ne garde que la teinte de survol. */}
      {celluleActions.ancre?.donnees && (
        <CelluleActions
          ancre={celluleActions.ancre} onRetenir={celluleActions.retenir}
          onRelacher={celluleActions.relacher} onFermer={celluleActions.fermer}
          sansSurvol={sansSurvol}
          boutons={celluleActions.ancre.donnees.citer && userId ? 3 : 2}>
          {celluleActions.ancre.donnees.citer && (
            <BoutonCiterVerset
              userId={userId} saved={prelevs.get(celluleActions.ancre.donnees.citer.cle) ?? null}
              cle={celluleActions.ancre.donnees.citer.cle}
              refLivre={celluleActions.ancre.donnees.citer.refLivre}
              refAbr={celluleActions.ancre.donnees.citer.refAbr}
              chapitre={celluleActions.ancre.donnees.citer.chapitre}
              verset={celluleActions.ancre.donnees.citer.verset}
              texte={celluleActions.ancre.donnees.texte}
              traductionLabel={celluleActions.ancre.donnees.citer.traductionLabel}
              tradId={celluleActions.ancre.donnees.citer.tradId}
              onSaved={marquerCite} onRemoved={retirerCite} />
          )}
          <BoutonCopierTexte className="poly-act" style={ACT_BTN} titre="Copier ce verset" bulle
            texte={citationBiblique(celluleActions.ancre.donnees.texte, celluleActions.ancre.donnees.refLisible)} />
          <BoutonSignalerVerset refLisible={celluleActions.ancre.donnees.refLisible} texte={celluleActions.ancre.donnees.texte} />
        </CelluleActions>
      )}

      {/* ⛔ Le lasso naît d'un BLANC : la marge de la page, une case sans texte. Une cellule
          qui porte un verset se clique (elle ouvre ses actions) et n'en est pas un départ ;
          l'en-tête des colonnes non plus. */}
      <LassoLecture
        zone={refTable}
        actif={lassoActif}
        contexte={`${livreChoisi}|${chFiltre}|${slotsDisponibles.join(",")}`}
        selecteurCibles="[data-lasso-cellule]"
        cleDe={element => element.getAttribute("data-lasso-cellule")}
        surbrillance={cle => `[data-lasso-cellule="${cle}"]`}
        horsLasso='[data-visite="poly-entete"]'
        unite={UNITE_VERSETS}
        refus={refusDuLasso}
        dejaEnregistres={dejaPreleves}
        onEnregistrer={enregistrerLasso}
        onRetirer={retirerLasso}
        onCopier={copierLasso}
      />

      {/* La visite, en portail vers <body> : elle passe au-dessus de tout ce que la
          page peut ouvrir, la fenêtre d'édition d'un verset comprise. */}
      {visite > 0 && (
        <VisiteGuidee key={visite} visite={VISITE_POLYGLOTTE} onScene={preparerScene}
          onFin={() => { setVisite(0); rendreLePliDesNotes(); }} />
      )}

      {avisLivreEntier && (
        <AvisLivreEntier
          nomLivre={livres.find(l => l.code === avisLivreEntier)?.nom_fr ?? avisLivreEntier}
          onAnnuler={annulerLivreEntier}
          onConfirmer={() => { const code = avisLivreEntier; setAvisLivreEntier(null); ouvrirLivreEntier(code); }}
        />
      )}

      {cibleEdition && (
        <ModaleEditionVerset
          reference={cibleEdition.reference}
          valeurInitiale={cibleEdition.texte}
          statut={enregistre}
          onEnregistrer={(valeur) => enregistrerVerset(cibleEdition.id, valeur)}
          onFermer={() => { setCibleEdition(null); setEnregistre("idle"); }}
        />
      )}
    </div>
  );
}
