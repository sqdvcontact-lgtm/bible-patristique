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

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cesurerGrec, codeLangue, copierSansCesures } from "@/app/lib/grec";
import { cesurerLatin } from "@/app/lib/cesuresLatines";
import { supabase } from "@/app/lib/supabase";
import NavLivres, { NB_CHAPITRES } from "@/app/components/NavLivres";
import IconeCrayon from "@/app/components/IconeCrayon";
import IconeDrapeau from "@/app/components/IconeDrapeau";
import IconeChevron from "@/app/components/IconeChevron";
import { HAUTEUR_NAVBAR, HAUTEUR_SOUS_NAVBAR } from "@/app/lib/mesures";
import { MarqueAttente } from "@/app/lib/attenteNavigation";
import { DUREE_ENTREE_MS, ordonnerBlocsVisibles } from "@/app/lib/passageTexte";
import { hauteurNavbarPx } from "@/app/lib/fenetreContextuelle";
import { useAffichageAdmin } from "@/app/lib/contexteAffichageAdmin";
import { ABREV_FR } from "@/app/lib/bible";
import { rendreTexteEnrichi, texteSansEnrichissement } from "@/app/oeuvre/[id]/texteEnrichi";
import ModalSignalement from "@/app/components/ModalSignalement";
import BoutonCopierTexte from "@/app/components/BoutonCopierTexte";
import { citationBiblique } from "@/app/lib/citation";
import { useCompte } from "@/app/lib/contexteCompte";
import { aRevoir899, chargerVersets899, rendu899, texteCouche899, TRAD_ID_BIBLE899, type Couche899 } from "@/app/lib/bible899";
import { rendreMarqueurs899 } from "@/app/lib/marqueurs899";
import { ENCRE_TITRE_CARTE, GRAISSE_TITRE, TITRE_CARTE } from '@/app/lib/hierarchieTitres'
import { signalerProgression } from '@/app/components/AnnonceHautsFaits'
import {
  MENTION_ABSENT, MENTION_ABSENT_TITRE, MENTION_DEUTERO, MENTION_LACUNE, MENTION_LACUNE_TITRE,
  STYLE_INVITE, STYLE_MENTION, STYLE_MENTION_LACUNE,
} from '@/app/lib/compositionBible'
import { colorMix } from '@/app/lib/couleurs'

type Livre = { code: string; nom_fr: string; ordre: number };
type Trad = { trad_id: string; nom: string; ordre: number | null; edition: string | null; lang: string; variante?: string };

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
function editionTrad(t: { source_edition?: string | null; publication_fin_annee?: number | null }): string | null {
  let annee: string | null = null;
  if (t.source_edition) {
    const millesimes = t.source_edition.match(/\d{4}/g);
    if (millesimes?.length) annee = millesimes[millesimes.length - 1];
  }
  if (!annee && t.publication_fin_annee) annee = String(t.publication_fin_annee);
  return annee;
}
type Point = { livre: string | null; reference: string | null; type: string | null; description: string | null; statut: string | null; notes: string | null };
type CanonRow = { id: string; livre: string; ch_canon: number; v_canon: number; est_suscription: boolean };
type V2Row = { id: string; canon_id: string | null; livre: string; trad_id: string; ch_orig: number; v_orig: number; v_orig_suffixe: string | null; texte: string | null; notes: string | null; estLacune899?: boolean };

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

function texteEnrichi(t: string | null) {
  if (!t) return null;
  // Rendu commun au reste du site (gras **, italique <i>/*, petites capitales ++,
  // exposant ^^, siècles en romain). Compat : l'ancien balisage <b> devient **.
  const norm = t.replace(/<b>([\s\S]*?)<\/b>/g, "**$1**");
  return rendreTexteEnrichi(norm);
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
function texteCesure(t: string | null, lang?: string) {
  if (!t) return texteEnrichi(t);
  if (lang === "grc") return texteEnrichi(cesurerGrec(t));
  if (lang === "la") return texteEnrichi(cesurerLatin(t));
  return texteEnrichi(t);
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
const ROSE_FOND = "var(--cs-danger-fond)";
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
// ⛔ CE QUI ALIGNE LA RÉFÉRENCE SUR SA PREMIÈRE LIGNE DE TEXTE, ce n'est pas un rembourrage
// choisi à l'œil : c'est d'avoir la MÊME BOÎTE DE LIGNE que la cellule qu'elle accompagne.
// La référence est composée en sans à 11 px, le verset en sérif à 14 : à interligne relatif,
// leurs boîtes ne font pas la même hauteur, leurs lignes de base divergent de trois pixels,
// et le numéro flotte au-dessus de son verset. On lui donne donc l'interligne du texte en
// valeur ABSOLUE — la boîte cesse alors de dépendre du corps de ce qu'elle porte —, et le
// même rembourrage haut que la cellule. Les deux lignes de base tombent à moins d'un pixel.
// ⚠️ Les deux facteurs sont ceux de `.poly-texte-cell` : les changer là demande de les
// changer ici, et le calc() est écrit pour qu'on le voie.
const HAUT_LIGNE_TEXTE = "calc(0.875rem * 1.36)";
// ⚠️ UN PIXEL DE PLUS que le rembourrage de la cellule (7 px), et ce pixel est MESURÉ, non
// estimé : à boîte de ligne égale, la ligne de base tombe à `(hauteur − corps)/2 + ascendante`,
// et Source Sans à 11 px n'a pas la même ascendante que Source Serif à 14. Relevé au navigateur
// sur la géométrie réelle (`tmp/planche-alignement-reference.html`), écart des lignes de base :
// 7 px → −1,00 · 7,5 → −0,50 · **8 → 0,00** · 8,5 → +0,50 · 9 → +1,00. Pour mémoire, l'ancien
// réglage (rembourrage 8 px, interligne relatif 1,15) donnait −4,00, ce qui se voyait.
// ⛔ À REMESURER si l'un des deux corps, l'interligne ou l'une des deux polices change.
const HAUT_PAD_MARGE = 8;
const ORDRE_NT = 52;
const ORDRE_CANON_MAX = 78;     // au-delà : écrits non canoniques
const FOND = "var(--cs-fond)";   // le fond du site, celui de --cs-fond

// ── Analyse des points sensibles → ensembles de versets/chapitres concernés ──
function construireSensibilite(points: Point[]) {
  const chap = new Set<string>();
  const vers = new Set<string>();
  const libelle = new Map<string, string[]>();
  const addChap = (l: string, c: number, desc: string) => { chap.add(`${l}|${c}`); const k = `${l}|${c}`; libelle.set(k, [...(libelle.get(k) ?? []), desc]); };
  const addVers = (l: string, c: number, v: number, desc: string) => { vers.add(`${l}|${c}|${v}`); const k = `${l}|${c}`; libelle.set(k, [...(libelle.get(k) ?? []), desc]); };

  for (const p of points) {
    const ref = (p.reference ?? "").trim();
    const desc = `${p.type ?? ""} — ${p.description ?? ""}`.trim();
    if (/^([1-4]?[A-Z]{2,3})(\/[1-4]?[A-Z]{2,3})+$/.test(ref)) { for (const code of ref.split("/")) addChap(code, 0, desc); continue; }
    if (/\(\d+\s+psaumes?\)/i.test(ref) && p.notes) { const nums = (p.notes.match(/\d+/g) ?? []).map(Number).filter(n => n >= 1 && n <= 150); for (const n of nums) addChap("PSA", n, desc); continue; }
    let dernierLivre = p.livre && /^[1-4]?[A-Z]{2,3}$/.test(p.livre) ? p.livre : "";
    for (let tok of ref.split(/[\/,]/)) {
      tok = tok.trim(); if (!tok) continue;
      const m = tok.match(/^(?:([1-4]?[A-Z]{2,3})\s+)?(\d+)(?:\s*[:.]\s*(\d+)(?:\s*-\s*(\d+))?)?(?:\s*-\s*(\d+))?$/);
      if (!m) continue;
      const l = m[1] || dernierLivre; if (!l) continue; dernierLivre = l;
      const c = Number(m[2]);
      if (m[3]) { const v1 = Number(m[3]); const v2 = m[4] ? Number(m[4]) : v1; for (let v = v1; v <= v2; v++) addVers(l, c, v, desc); }
      else if (m[5]) { for (let cc = c; cc <= Number(m[5]); cc++) addChap(l, cc, desc); }
      else addChap(l, c, desc);
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
  const suite = await Promise.all(Array.from({ length: Math.ceil(total / PAGE) - 1 }, (_, i) => page(i + 1)));
  for (const r of suite) if (r.error) throw r.error;
  return [...lignes, ...suite.flatMap(r => (r.data ?? []) as T[])];
}

// Ce que le tableau demande à la base, d'un bloc : les livres, les traductions et le
// chapitre (`null` pour le livre entier). C'est la clé qui dit si ce qui est chargé
// RÉPOND à ce qui est demandé — et donc si l'on attend, et si l'on doit repartir. La
// couche de la Bible 899 n'y figure plus : elle est portée par l'identifiant de la
// colonne (voir `couche899De`), et les deux couches arrivent ensemble au cache.
type Portee = { codes: string[]; tradIds: string[]; chScope: number | null };
const memeListe = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
// Ce qui est chargé couvre la demande quand ce sont les mêmes livres et les mêmes
// traductions, et que le chapitre demandé est celui qu'on a — ou que l'on a le livre
// entier, qui contient tous ses chapitres : revenir du livre entier à un chapitre ne
// coûte alors rien.
function couvre(chargee: Portee | null, demande: Portee): boolean {
  return chargee !== null
    && memeListe(chargee.codes, demande.codes)
    && memeListe([...chargee.tradIds].sort(), [...demande.tradIds].sort())
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
    ?? (scope === "*" ? undefined : cacheTexte.get(`${trad}|${cleLivre(livre, "*")}`)?.filter(r => r.canon_id?.startsWith(`${livre}.${scope}.`)));
}
function lire899(livre: string, scope: Scope): Brutes899 | undefined {
  return cache899.get(cleLivre(livre, scope))
    ?? (scope === "*" ? undefined : cache899.get(cleLivre(livre, "*"))?.filter(l => l.chapitre === scope));
}

// Colonne synthétique TR0009 (Bible 899) : texte recomposé en direct des tables
// éditoriales, aligné sur canon_id, sans copie vers versets_v2. Les lacunes du
// manuscrit (CANONICAL_GAP) sont conservées ; les matières hors canon
// (MANUSCRIPT_EXTRA) n'ont pas de canon_id et sont écartées par `chargerVersets899`.
function lignes899(brutes: Brutes899, tradId: string): V2Row[] {
  const couche = couche899De(tradId);
  return brutes.map(l => {
    const lacune = rendu899(l) === "lacune";
    return {
      // L'identifiant porte la colonne : le manuscrit développé et sa transcription
      // diplomatique se lisent côte à côte, et leurs lignes ne se confondent pas.
      id: `899:${tradId}:${l.canon_id}`,
      canon_id: l.canon_id,
      livre: l.livre ?? "",
      trad_id: tradId,
      ch_orig: l.chapitre ?? 0,
      v_orig: l.verset ?? 0,
      v_orig_suffixe: null,
      texte: lacune ? null : texteCouche899(l, couche),
      notes: aRevoir899(l) ? "Alignement à revoir" : null,
      estLacune899: lacune,
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
async function completerCache(demande: Portee): Promise<void> {
  const { codes, tradIds, chScope } = demande;
  const scope = scopeDe(chScope);
  const canonManquant = codes.filter(code => !lireCanon(code, scope));
  const groupes = new Map<string, { trads: string[]; livres: string[] }>();
  for (const trad of tradIds) {
    if (est899(trad)) continue;
    const livres = codes.filter(code => !lireTexte(trad, code, scope));
    if (!livres.length) continue;
    const g = groupes.get(livres.join(",")) ?? { trads: [], livres };
    g.trads.push(trad);
    groupes.set(livres.join(","), g);
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
      taches.push(partager(`texte|${g.trads.join(",")}|${livres.join(",")}|${scope}`, () =>
        fetchPaged<V2Row>("versets_v2", "id, canon_id, livre, trad_id, ch_orig, v_orig, v_orig_suffixe, texte, notes",
          q => { const x = q.in("livre", livres).in("trad_id", g.trads); return scope !== "*" ? x.like("canon_id", `${livres[0]}.${scope}.%`) : x; })
          .then(rows => {
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
    <div onClick={onFermer} style={{ position: "fixed", inset: 0, background: "rgba(30,25,20,0.4)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--cs-surface)", borderRadius: 8, padding: "18px 20px", width: 520, maxWidth: "100%", boxShadow: "var(--cs-ombre-modale)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
          <p style={{ margin: 0, fontSize: '0.78125rem', fontWeight: 600, color: VERT }}>Modifier — {reference}</p>
          <button onClick={onFermer} style={{ border: "none", background: "none", cursor: "pointer", fontSize: '0.9375rem', color: "var(--cs-texte-faible)", lineHeight: 1, padding: 0 }}>✕</button>
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
        <textarea ref={ta} autoFocus value={valeur} onChange={e => setValeur(e.target.value)}
          onKeyDown={e => { if (e.key === "Escape") onFermer(); if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onEnregistrer(valeur); }}
          rows={5}
          style={{ width: "100%", boxSizing: "border-box", fontSize: '0.84375rem', lineHeight: 1.5, fontFamily: "var(--font-source-serif), Georgia, serif", padding: "9px 11px", border: "1px solid var(--cs-bord)", borderRadius: 4, background: "var(--cs-fond-clair)", color: "var(--cs-texte-fort)", outline: "none", resize: "vertical" }} />
        {/* Aperçu en direct : l'apparence enrichie du verset, telle qu'elle s'affichera. */}
        <div style={{ marginTop: 8 }}>
          <span style={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: "var(--cs-texte-faible)" }}>Aperçu</span>
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
// citations », le fanion ouvre un signalement. Discrets, révélés au survol de la ligne.
const ACT_BTN: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", padding: 0, width: 19, height: 19, borderRadius: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: '0.875rem', lineHeight: 1, transition: "color .15s" };
function IconeSignet({ rempli }: { rempli?: boolean }) {
  return (
    <svg width="11" height="12" viewBox="0 0 12 13" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <path d="M3 2.2C3 1.75 3.35 1.4 3.8 1.4H8.2C8.65 1.4 9 1.75 9 2.2V11L6 9.15L3 11V2.2Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" fill={rempli ? "currentColor" : "none"} />
    </svg>
  );
}
// Signalement : le composant partagé IconeDrapeau (SVG), au même gabarit exact que le
// signet de prélèvement — les deux SVG restent donc toujours de la même taille.

// Bouton « citer » à bascule : ajoute le verset à « mes citations » s'il n'y est pas,
// l'en retire s'il y est déjà (signet plein = enregistré). Réservé aux comptes connectés.
function BoutonCiterVerset({ userId, saved, cle, refLivre, refAbr, chapitre, verset, texte, traductionLabel, onSaved, onRemoved }: {
  userId: string | null; saved: string | null; cle: string; refLivre: string; refAbr: string; chapitre: number; verset: number;
  texte: string; traductionLabel: string; onSaved: (cle: string, id: string) => void; onRemoved: (cle: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [survol, setSurvol] = useState(false);
  if (!userId) return null;
  const basculer = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    if (saved) {
      await supabase.from("prelevements").delete().eq("id", saved);
      onRemoved(cle);
    } else {
      const { data, error } = await supabase.from("prelevements").insert({
        user_id: userId, type: "biblique",
        ref_livre: refLivre, ref_livre_abr: refAbr,
        ref_chapitre: chapitre, ref_verset: verset,
        texte: texteSansEnrichissement(texte), traduction: traductionLabel,
      }).select("id").single();
      if (!error && data) { onSaved(cle, data.id); signalerProgression(); }
    }
    setBusy(false);
  };
  // Enregistré : signet plein (vert) ; au survol, il devient une croix pour signifier
  // « cliquer = retirer de la liste ».
  const montrerCroix = !!saved && survol && !busy;
  return (
    <button onClick={basculer} title={saved ? "Retirer de mes citations" : "Ajouter à mes citations"} className="poly-act"
      onMouseEnter={() => setSurvol(true)} onMouseLeave={() => setSurvol(false)}
      style={{ ...ACT_BTN, color: montrerCroix ? "var(--cs-danger)" : saved ? VERT : "var(--cs-texte-faible)" }}
      aria-label={saved ? "Retirer de mes citations" : "Ajouter à mes citations"}>
      {busy ? "…" : montrerCroix ? "✕" : <IconeSignet rempli={!!saved} />}
    </button>
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
    if (!res.ok) throw new Error("échec du signalement");
  };
  return (
    <>
      <button onClick={e => { e.stopPropagation(); if (exigerCompte("signaler une erreur")) setOuvert(true); }} title="Signaler une erreur" className="poly-act"
        style={{ ...ACT_BTN, color: "var(--cs-texte-faible)" }} aria-label="Signaler"><IconeDrapeau /></button>
      {ouvert && <ModalSignalement titre={refLisible} texteObjet={texte || undefined} avecNiveauImportance onClose={() => setOuvert(false)} onEnvoyer={envoyer} />}
    </>
  );
}

// Cellule sans texte : une mention centrée, de la voix commune aux deux grilles de
// comparaison (`STYLE_MENTION`, `app/lib/compositionBible.ts`), qui dit clairement que la
// traduction ne porte pas ce verset au lieu d'un tiret muet. Pour les passages
// deutérocanoniques, l'infobulle explique POURQUOI la case est vide.
function CelluleAbsente({ deutero }: { deutero?: boolean }) {
  return (
    <span
      title={deutero ? "Ce passage nous est parvenu en grec, non en hébreu. Les Bibles catholique et orthodoxe le reçoivent ; la Bible protestante et la Bible hébraïque ne le comptent pas parmi les livres canoniques. La case est donc vide pour cette traduction, et non par oubli." : MENTION_ABSENT_TITRE}
      style={{ ...STYLE_MENTION, cursor: "help" }}>
      {deutero ? MENTION_DEUTERO : MENTION_ABSENT}
    </span>
  );
}

// Cellule de la colonne « Notes » : vide, elle montre une invite centrée et discrète
// (« Note sur Gn 1, 6 ») ; au clic, elle devient une vraie zone de saisie (sans poignée
// d'étirement). L'enregistrement se fait via `onChange` (débouncé côté parent).
function CelluleNote({ valeur, refLisible, onChange }: {
  valeur: string; refLisible: string; onChange: (t: string) => void;
}) {
  const [focus, setFocus] = useState(false);
  const demarrer = useRef(false);
  const vide = !valeur.trim();
  if (vide && !focus) {
    return (
      <button onClick={() => { demarrer.current = true; setFocus(true); }}
        style={{ ...STYLE_INVITE, width: "100%", minHeight: "1.9rem", display: "flex", alignItems: "center", justifyContent: "center",
          background: "none", border: "none", borderRadius: 4, cursor: "text", padding: "3px 6px" }}>
        Prendre une note sur {refLisible}
      </button>
    );
  }
  return (
    <textarea value={valeur} onChange={e => onChange(e.target.value)}
      ref={el => { if (el && demarrer.current) { el.focus(); demarrer.current = false; } }}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{ width: "100%", resize: "none", minHeight: "1.9rem", boxSizing: "border-box", border: "1px solid var(--cs-bord-clair)", borderRadius: 4,
        background: "var(--cs-surface)", padding: "3px 6px", fontFamily: "var(--font-source-sans), Arial, sans-serif",
        fontSize: "0.71875rem", lineHeight: 1.35, color: "var(--cs-texte-fort)", outline: "none" }} />
  );
}

// Choix d'une traduction : un menu déroulant SOIGNÉ (popover) à la place du select
// natif. Un clic sur le nom ouvre une liste claire — nom + millésime, coche sur la
// traduction active, et mention d'échange quand la traduction est déjà affichée
// ailleurs. Le panneau est rendu en portail (fixed) pour échapper à l'`overflow`
// de l'en-tête collant.
// Groupes du menu de traductions, par langue.
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
type MembreFamille = { id: string; libelle: string; titre?: string };
const FAMILLES: MembreFamille[][] = [
  [
    { id: "TR0010", libelle: "Traduction française" },
    { id: "TR0011", libelle: "Texte latin en regard", titre: "La Vulgate latine, imprimée en regard du français dans l’édition Fillion" },
  ],
  [
    { id: TRAD_ID_BIBLE899, libelle: "Texte du manuscrit", titre: "Le texte du manuscrit, abréviations développées" },
    { id: TRAD_ID_899_DIPLO, libelle: "Transcription diplomatique", titre: "Le manuscrit lettre à lettre, ses abréviations non résolues" },
    { id: "TR0013", libelle: "Traduction en français moderne" },
  ],
];

type Membre = { trad: Trad; libelle: string; titre?: string };
type Famille = { cle: string; principal: Trad; membres: Membre[] };
type Entree = { sorte: "trad"; trad: Trad } | { sorte: "famille"; famille: Famille };

// Le menu, groupe de langue par groupe de langue, familles comprises. L'ordre reste
// celui de la base ; une famille prend simplement la place de son membre principal.
function entreesParLangue(trads: Trad[]): Map<string, Entree[]> {
  const parId = new Map(trads.map(t => [t.trad_id, t]));
  const familles = new Map<string, Famille>();   // trad_id du principal → sa famille
  const absorbes = new Set<string>();            // membres que la famille porte déjà
  for (const def of FAMILLES) {
    const membres: Membre[] = [];
    for (const m of def) {
      const trad = parId.get(m.id);
      if (trad) membres.push({ trad, libelle: m.libelle, titre: m.titre });
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
  return parLangue;
}

const LARGEUR_VOLET = 238;   // le volet d'une famille, posé au côté du menu

function ChoixTraduction({ trads, slots, index, onChoisir }: {
  trads: Trad[]; slots: string[]; index: number; onChoisir: (index: number, val: string) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  // La famille déployée, et l'endroit où poser son volet — mesuré sur la ligne survolée
  // au moment où on la survole, jamais déduit du panneau : le panneau défile.
  const [volet, setVolet] = useState<{ cle: string; top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panRef = useRef<HTMLDivElement>(null);
  const voletRef = useRef<HTMLDivElement>(null);
  // Fermeture DIFFÉRÉE : entre la ligne et son volet, le curseur traverse quelques pixels
  // qui n'appartiennent ni à l'une ni à l'autre. Sans ce délai, le volet se referme au
  // moment même où l'on tend la main pour le prendre.
  const fermeture = useRef<number | null>(null);
  const courante = trads.find(t => t.trad_id === slots[index]) ?? null;
  const groupes = useMemo(() => entreesParLangue(trads), [trads]);
  const familleDeployee = useMemo(() => {
    if (!volet) return null;
    for (const entrees of groupes.values()) {
      for (const e of entrees) if (e.sorte === "famille" && e.famille.cle === volet.cle) return e.famille;
    }
    return null;
  }, [groupes, volet]);

  useEffect(() => {
    if (!ouvert) return;
    const onDoc = (e: MouseEvent) => {
      const cible = e.target as Node;
      if (btnRef.current?.contains(cible) || panRef.current?.contains(cible) || voletRef.current?.contains(cible)) return;
      setVolet(null); setOuvert(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setVolet(null); setOuvert(false); } };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [ouvert]);
  // Le compte à rebours du volet ne survit pas au démontage.
  useEffect(() => () => { if (fermeture.current) window.clearTimeout(fermeture.current); }, []);

  // Fermer le menu emporte le volet : sans quoi il reparaîtrait tel quel à la prochaine
  // ouverture, déployé sur une famille que l'on ne survole plus.
  const basculer = () => {
    if (ouvert) { retenirVolet(); setVolet(null); setOuvert(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setRect({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 236) });
    setOuvert(true);
  };
  const choisir = (val: string) => { onChoisir(index, val); setVolet(null); setOuvert(false); };
  const retenirVolet = () => { if (fermeture.current) { window.clearTimeout(fermeture.current); fermeture.current = null; } };
  const fermerVolet = () => {
    retenirVolet();
    fermeture.current = window.setTimeout(() => { fermeture.current = null; setVolet(null); }, 160);
  };
  const deployer = (cle: string, el: HTMLElement, nb: number) => {
    retenirVolet();
    const r = el.getBoundingClientRect();
    // À droite de la ligne ; à gauche quand il n'y tient pas. Le volet chevauche la ligne
    // de deux pixels : aucun interstice ne sépare alors l'une de l'autre.
    const aDroite = r.right + LARGEUR_VOLET + 8 <= window.innerWidth;
    const haut = 30 + nb * 46;
    setVolet({
      cle,
      left: aDroite ? r.right - 2 : Math.max(8, r.left - LARGEUR_VOLET + 2),
      top: Math.max(8, Math.min(r.top - 6, window.innerHeight - 8 - haut)),
    });
  };

  const ligne = (actif: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "flex-start", gap: 8, width: "100%", textAlign: "left",
    padding: "7px 10px", borderRadius: 4, border: "none", cursor: "pointer",
    background: actif ? "rgba(var(--cs-vert-rgb),0.10)" : "transparent",
    fontFamily: "var(--font-source-sans), Arial, sans-serif",
  });
  const coche = (actif: boolean) => (
    <span aria-hidden style={{ width: 12, flexShrink: 0, color: VERT, paddingTop: 2, fontSize: "0.75rem" }}>{actif ? "✓" : ""}</span>
  );
  const NOM_OPTION: React.CSSProperties = { display: "block", fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.8125rem", color: "var(--cs-encre-fonce)", lineHeight: 1.25 };
  const SOUS_OPTION: React.CSSProperties = { display: "block", fontSize: "0.625rem", color: "var(--cs-texte-doux)", marginTop: 1 };
  const ENTETE_GROUPE: React.CSSProperties = { padding: "6px 10px 3px", fontFamily: "var(--font-source-sans), Arial, sans-serif", fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--cs-texte-doux)" };

  // Une traduction, dans la liste ou dans un volet de famille. Dans un volet, `libelle`
  // dit ce que ce texte est DANS son édition (« Texte latin en regard ») : le nom de la
  // traduction est déjà porté par la famille, au-dessus.
  const optionTrad = (t: Trad, libelle?: string, titre?: string) => {
    const actif = slots[index] === t.trad_id;
    const ailleurs = slots.some((x, idx) => idx !== index && x === t.trad_id);
    return (
      <button key={t.trad_id} role="menuitemradio" aria-checked={actif} title={titre} onClick={() => choisir(t.trad_id)}
        style={ligne(actif)}
        onMouseEnter={e => { if (!actif) e.currentTarget.style.background = "rgba(var(--cs-vert-rgb),0.06)"; }}
        onMouseLeave={e => { if (!actif) e.currentTarget.style.background = "transparent"; }}>
        {coche(actif)}
        <span style={{ minWidth: 0 }}>
          <span style={NOM_OPTION}>{libelle ?? t.nom}</span>
          <span style={SOUS_OPTION}>
            {t.edition ?? ""}
            {ailleurs && courante && <span style={{ color: 'var(--cs-attente)' }}>{t.edition ? " · " : ""}Échange avec la position de {courante.nom}</span>}
          </span>
        </span>
      </button>
    );
  };

  // Une édition à plusieurs textes : une seule ligne, un chevron, et le volet au survol.
  // La coche vaut pour la famille entière, et la seconde ligne nomme alors le texte
  // affiché dans cette colonne — sans quoi deux colonnes de la même édition porteraient
  // le même intitulé sans qu'on sache laquelle donne quoi.
  const optionFamille = (f: Famille) => {
    const actifMembre = f.membres.find(m => m.trad.trad_id === slots[index]) ?? null;
    const deploye = volet?.cle === f.cle;
    const sous = actifMembre
      ? actifMembre.libelle
      : `${f.principal.edition ?? ""}${f.principal.edition ? " · " : ""}${f.membres.length} textes`;
    const survol = (e: React.MouseEvent<HTMLButtonElement> | React.FocusEvent<HTMLButtonElement>) => deployer(f.cle, e.currentTarget, f.membres.length);
    return (
      <button key={f.cle} role="menuitem" aria-haspopup="menu" aria-expanded={deploye}
        onMouseEnter={survol} onFocus={survol} onClick={survol} onMouseLeave={fermerVolet}
        onKeyDown={e => { if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") { e.preventDefault(); deployer(f.cle, e.currentTarget, f.membres.length); } }}
        style={{ ...ligne(!!actifMembre), background: deploye && !actifMembre ? "rgba(var(--cs-vert-rgb),0.06)" : ligne(!!actifMembre).background, alignItems: "center" }}>
        {coche(!!actifMembre)}
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={NOM_OPTION}>{f.principal.nom}</span>
          <span style={SOUS_OPTION}>{sous}</span>
        </span>
        <svg aria-hidden width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, color: "var(--cs-texte-doux)" }}>
          <path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    );
  };

  return (
    <>
      <button ref={btnRef} onClick={basculer} className="poly-trad-pick" title="Changer de traduction"
        aria-haspopup="menu" aria-expanded={ouvert}
        style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", minWidth: 0, padding: "7px 18px 7px 6px", borderRadius: 4, background: "none", border: "none", cursor: "pointer", color: "inherit", transition: "background .15s, box-shadow .15s" }}>
        {/* ⚠️ Les trois encres étaient du BLANC translucide, juste tant que ce nom se posait
            sur un aplat vert. Sur le papier, elles prennent l'échelle de gris du site : le nom
            en petites capitales de l'échelle haute, le millésime un rang plus bas, le chevron
            plus bas encore — c'est une marque d'ouverture, pas un accent. */}
        <span aria-hidden style={{ minWidth: 0, textAlign: "center", lineHeight: 1.12 }}>
          <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.875rem", color: "var(--cs-encre-fonce)" }}>
            {courante?.nom ?? "Choisir une traduction"}
          </span>
          {/* Sous le nom : l'état du texte quand l'édition en porte plusieurs (deux
              colonnes de la Bible du XIIIe siècle ne se distingueraient pas autrement),
              le millésime sinon. */}
          {(courante?.variante ?? courante?.edition) && (
            <span style={{ display: "block", marginTop: 8, fontFamily: "var(--font-source-sans), Arial, sans-serif", fontSize: "0.5625rem", fontWeight: 600, letterSpacing: "0.15em", textIndent: "0.15em", color: "var(--cs-texte-gris)" }}>
              {courante?.variante ?? courante?.edition}
            </span>
          )}
        </span>
        <svg aria-hidden width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ position: "absolute", right: 7, top: "50%", transform: `translateY(-50%) rotate(${ouvert ? 180 : 0}deg)`, transition: "transform .15s", pointerEvents: "none", color: "var(--cs-texte-doux)" }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {ouvert && rect && createPortal(
        <div ref={panRef} role="menu"
          // Le volet est posé d'après la position de la ligne : si le panneau défile
          // sous la souris, cette position n'a plus cours et le volet se retire.
          onScroll={() => { retenirVolet(); setVolet(null); }}
          style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 3000,
            background: "var(--cs-surface)", border: "1px solid var(--cs-bord)", borderRadius: 8, boxShadow: "var(--cs-ombre-modale)",
            padding: 5, maxHeight: "62vh", overflowY: "auto" }}>
          {GROUPES_LANG.map(g => {
            const membres = groupes.get(g.code) ?? [];
            if (!membres.length) return null;
            return (
              <div key={g.code} role="group" aria-label={g.label}>
                {/* En-tête de groupe de langue : Français / Latin / Grec. */}
                <div style={ENTETE_GROUPE}>{g.label}</div>
                {membres.map(e => (e.sorte === "famille" ? optionFamille(e.famille) : optionTrad(e.trad)))}
              </div>
            );
          })}
        </div>,
        document.body,
      )}

      {ouvert && volet && familleDeployee && createPortal(
        <div ref={voletRef} role="menu" aria-label={familleDeployee.principal.nom}
          onMouseEnter={retenirVolet} onMouseLeave={fermerVolet}
          style={{ position: "fixed", top: volet.top, left: volet.left, width: LARGEUR_VOLET, zIndex: 3001,
            background: "var(--cs-surface)", border: "1px solid var(--cs-bord)", borderRadius: 8, boxShadow: "var(--cs-ombre-modale)",
            padding: 5, maxHeight: "62vh", overflowY: "auto" }}>
          <div style={ENTETE_GROUPE}>{familleDeployee.principal.nom}</div>
          {familleDeployee.membres.map(m => optionTrad(m.trad, m.libelle, m.titre))}
        </div>,
        document.body,
      )}
    </>
  );
}

export default function PolyglottePage() {
  const [livres, setLivres] = useState<Livre[]>([]);
  // trad_id → code du livre → nom qu'il porte dans cette édition. Seuls les écarts au canon.
  const [livresEd, setLivresEd] = useState<Record<string, Record<string, { nom: string; abrege: string }>>>({});
  const [trads, setTrads] = useState<Trad[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [onglet, setOnglet] = useState<Onglet | null>(null);   // la page s'ouvre vide : on choisit un ensemble
  const [slots, setSlots] = useState<string[]>([]);
  // Nombre de colonnes tenant à l'écran (mesuré), et conteneur du tableau observé.
  const [maxSlots, setMaxSlots] = useState(NB_SLOTS);
  // Préférence utilisateur du nombre de traductions visibles (null = automatique, selon
  // la largeur d'écran). Mémorisée. Un ref évite la fermeture périmée dans le ResizeObserver.
  const [nbTradPref, setNbTradPref] = useState<number | null>(null);
  const prefRef = useRef<number | null>(null);
  const autoRef = useRef<number>(NB_SLOTS);
  useEffect(() => {
    try { const v = window.localStorage.getItem("polyglotte-nbtrad"); if (v === "auto") setNbTradPref(null); else if (v) { const n = parseInt(v, 10); if (n >= MIN_SLOTS && n <= MAX_SLOTS) setNbTradPref(n); } } catch { /* stockage indisponible */ }
  }, []);
  useEffect(() => { prefRef.current = nbTradPref; }, [nbTradPref]);
  // Applique la préférence (ou revient à la valeur automatique mesurée).
  const nbTradEcrit = useRef(false);
  useEffect(() => {
    setMaxSlots(nbTradPref != null ? Math.max(MIN_SLOTS, Math.min(MAX_SLOTS, nbTradPref)) : autoRef.current);
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
      const dispo = el.clientWidth - 24 - LARGEUR_REF - (notesReduites ? 26 : 208);
      const n = Math.max(MIN_SLOTS, Math.min(MAX_SLOTS, Math.floor(dispo / MIN_COL_PX)));
      autoRef.current = n;
      // La préférence utilisateur prime sur la mesure ; sinon on suit la largeur d'écran.
      setMaxSlots(prefRef.current != null ? Math.max(MIN_SLOTS, Math.min(MAX_SLOTS, prefRef.current)) : n);
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [notesReduites]);
  // Actions « Prélever / Signaler » : visibles au survol TANT QUE le curseur bouge.
  // Après une seconde sans mouvement, on retire la classe et les boutons s'effacent,
  // pour ne pas encombrer la lecture. (Classe basculée sur le nœud, sans re-rendu.)
  useEffect(() => {
    const el = refTable.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Petit seuil : de menus tremblements du curseur ne rallument pas les boutons ;
    // il faut un déplacement franc (> SEUIL px depuis le dernier point retenu).
    const SEUIL = 10;
    let refX = 0, refY = 0, initialise = false;
    const onMove = (e: MouseEvent) => {
      if (!initialise) { refX = e.clientX; refY = e.clientY; initialise = true; }
      if (Math.hypot(e.clientX - refX, e.clientY - refY) < SEUIL) return;   // trop léger : on ignore
      refX = e.clientX; refY = e.clientY;
      el.classList.add("poly-curseur-actif");
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove("poly-curseur-actif"), 1000);
    };
    el.addEventListener("mousemove", onMove);
    return () => { el.removeEventListener("mousemove", onMove); if (timer) clearTimeout(timer); };
  }, []);
  // Ajuste le nombre de slots à la largeur : préserve les traductions déjà choisies,
  // complète par des slots vides, ou retire les colonnes qui ne tiennent plus.
  useEffect(() => {
    if (slots.length === maxSlots) return;
    setSlots(prev => {
      if (prev.length > maxSlots) return prev.slice(0, maxSlots);   // écran plus étroit : on retire les colonnes en trop
      // Écran plus large : on complète les nouveaux slots avec des traductions
      // pas encore affichées (plutôt que des colonnes vides), pour que le grand
      // écran montre directement plus de traductions.
      const used = new Set(prev.filter(Boolean));
      const libres = trads.map(t => t.trad_id).filter(id => !used.has(id));
      let k = 0;
      return Array.from({ length: maxSlots }, (_, i) => prev[i] ?? (libres[k++] ?? ""));
    });
  }, [maxSlots, slots.length, trads]);
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
  const [toutAfficher, setToutAfficher] = useState(false);              // …sauf demande explicite
  // Édition en place (admin). L'affordance dépend du client, mais l'autorisation réelle
  // est revérifiée côté serveur par /api/admin/verset-modifier (charte §17).
  // `estAdminReel` = les droits ; `estAdmin` = ce qu'on montre. Un admin qui bascule
  // en « mode utilisateur standard » doit voir la page comme un lecteur : les réglages
  // de relecture et les crayons disparaissent, ses droits ne changent pas.
  const [estAdminReel, setEstAdmin] = useState(false);
  const { modeUtilisateurStandard } = useAffichageAdmin();
  const estAdmin = estAdminReel && !modeUtilisateurStandard;
  const [userId, setUserId] = useState<string | null>(null);   // pour « mes citations »
  // Versets déjà dans « mes citations » : clé « ABR|ch|v » → id du prélèvement (pour retirer).
  const [prelevs, setPrelevs] = useState<Map<string, string>>(new Map());
  const marquerCite = useCallback((cle: string, id: string) => setPrelevs(m => new Map(m).set(cle, id)), []);
  const retirerCite = useCallback((cle: string) => setPrelevs(m => { const n = new Map(m); n.delete(cle); return n; }), []);
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
  const ensembleDe = useCallback((code: string): Onglet => {
    const o = livres.find(l => l.code === code)?.ordre ?? 0;
    if (code === "PSA") return "PSA";
    if (o > ORDRE_CANON_MAX) return "AUTRES";
    return o >= ORDRE_NT ? "NT" : "AT";
  }, [livres]);

  const choisirLivre = useCallback((code: string) => {
    setOnglet(ensembleDe(code));
    setLivreChoisi(code);
    setToutAfficher(false);
    setChapitreChoisi(1);   // on ouvre sur le premier chapitre, pas le livre entier
  }, [ensembleDe]);

  // Le volet de navigation attend le vocabulaire de la page Bible.
  const livresNav = useMemo(() => livres.map(l => ({
    code: l.code, nom: l.nom_fr,
    testament: l.ordre > ORDRE_CANON_MAX ? "AUTRES" : l.ordre >= ORDRE_NT ? "NT" : "AT",
  })), [livres]);

  const sens = useMemo(() => construireSensibilite(points), [points]);
  const ordreDe = useMemo(() => new Map(livres.map(l => [l.code, l.ordre])), [livres]);

  // Chargement initial (livres, points, traductions migrées)
  useEffect(() => {
    supabase.from("livres").select("code, nom_fr, ordre").order("ordre").then(({ data, error }) => {
      // ⚠️ Lire l'erreur : un volet vide se lit « rien à comparer », ce qui ment sur une panne.
      if (error) console.error("Polyglotte : les livres n’ont pas pu être lus.", error);
      setLivres((data ?? []).filter(l => !LIVRES_FONDUS_DANS_DANIEL.has(l.code)));
    });
    // Désignation des livres propre à chaque édition, quand elle diffère du canon : la
    // Sacy de 1730 compte quatre livres des Rois là où le canon en compte deux de Samuel
    // et deux des Rois. Seuls les écarts sont enregistrés (voir scripts/livres-editions.mjs).
    // Passe par une route serveur : la table `parametres` est protégée par RLS et le client
    // public n'y voit rien — elle contient aussi la charte éditoriale, qui doit le rester.
    fetch("/api/livres-editions").then(r => r.json()).then(setLivresEd).catch(() => setLivresEd({}));
    (async () => {
      // ⛔ `est_biblique` : voir le commentaire dans app/page.tsx — la table tient aussi
      // les notices des traductions patristiques, qui n'ont rien à faire ici.
      const { data: tr, error: erreurTr } = await supabase.from("traductions").select("trad_id, nom, ordre, source_edition, publication_fin_annee, langue").eq("est_biblique", true).order("ordre");
      if (erreurTr) console.error("Polyglotte : les traductions n’ont pas pu être lues.", erreurTr);
      const liste = tr ?? [];
      // Une SONDE par traduction pour savoir laquelle est migrée dans versets_v2, toutes
      // en parallèle. Une ligne suffit : le compte exact d'avant parcourait l'index
      // entier de la traduction (36 000 lignes pour la Vulgate, 13 ms chacune, mesuré),
      // pour n'en retenir que « plus de zéro ». La vue `livres_par_traduction` ferait
      // une seule requête, mais elle balaie la table entière (487 ms) : dix sondes
      // parallèles coûtent moins qu'elle. ⚠️ Sous la RLS du lecteur : une traduction
      // privée (TR0013) ne répond qu'à l'administrateur, et n'entre que chez lui.
      const presentes = await Promise.all(liste.map(t =>
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
        if (presentes[i]) migres.push({ trad_id: t.trad_id, nom: t.nom, ordre: t.ordre, edition: editionTrad(t), lang: codeLangue((t as { langue?: string | null }).langue) });
      });
      // TR0009 (Bible 899) n'est pas migrée dans `versets_v2` : son texte est recomposé
      // à la volée depuis les tables éditoriales (colonne synthétique). On l'ajoute donc
      // explicitement, comme n'importe quelle autre traduction comparable.
      const t899 = liste.find(t => t.trad_id === TRAD_ID_BIBLE899);
      if (t899) {
        const commun = { nom: t899.nom, ordre: t899.ordre, edition: editionTrad(t899), lang: codeLangue((t899 as { langue?: string | null }).langue) };
        if (!migres.some(m => m.trad_id === TRAD_ID_BIBLE899)) migres.push({ trad_id: TRAD_ID_BIBLE899, ...commun, variante: "Texte du manuscrit" });
        // La transcription diplomatique est une colonne à part entière (voir
        // TRAD_ID_899_DIPLO) : même édition, même langue, autre état du texte.
        migres.push({ trad_id: TRAD_ID_899_DIPLO, ...commun, variante: "Transcription diplomatique" });
      }
      setTrads(migres);
      // Choix des colonnes : celui que l'utilisateur a laissé la dernière fois (localStorage),
      // sinon par défaut les quatre premières traductions distinctes. On ne retient d'un choix
      // sauvegardé que les traductions encore disponibles.
      const dispo = new Set(migres.map(m => m.trad_id));
      let init: string[] | null = null;
      try {
        const brut = typeof window !== "undefined" ? window.localStorage.getItem(CLE_SLOTS) : null;
        const parse = brut ? JSON.parse(brut) : null;
        if (Array.isArray(parse) && parse.some((x: string) => dispo.has(x))) {
          init = parse.map((x: string) => (dispo.has(x) ? x : ""));
        }
      } catch { /* localStorage indisponible ou corrompu : on retombe sur le défaut */ }
      setSlots(init ?? Array.from({ length: NB_SLOTS }, (_, i) => migres[i]?.trad_id ?? ""));
    })();
    // l'utilisateur connecté est-il admin ? (affichage seulement — le serveur revérifie)
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { data: p } = await supabase.from("profils").select("est_admin").eq("id", uid).maybeSingle();
      setEstAdmin(p?.est_admin === true);
      // Les points sensibles ne servent qu'à la RELECTURE (lignes en rouge, en rose,
      // filtre « Lignes problématiques »), c'est-à-dire à l'administrateur : le lecteur
      // n'a pas à les charger.
      if (p?.est_admin === true) {
        supabase.from("points_sensibles").select("livre, reference, type, description, statut, notes").then(({ data }) => setPoints(data ?? []));
      }
    })();
  }, []);

  // Enregistrement d'un verset modifié
  const enregistrerVerset = useCallback(async (id: string, texte: string) => {
    setEnregistre("envoi");
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    const res = await fetch("/api/admin/verset-modifier", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ id, texte }),
    });
    if (res.ok) {
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
    return { codes: livresAffiches.map(l => l.code), tradIds: slots.filter(Boolean), chScope };
  }, [livresAffiches, slots, chapitreChoisi, toutAfficher, sensiblesOnly, surnumOnly]);
  // Ce que `canon` et `v2` portent réellement. Posé AVEC les données, jamais avant.
  const [porteeChargee, setPorteeChargee] = useState<Portee | null>(null);
  // La demande dont le chargement a échoué, pour ne pas la rejouer sans fin ; le
  // bouton « Réessayer » la lève. Une référence, et non un état dans les dépendances
  // de l'effet : un échec qui relancerait l'effet relancerait la requête, en boucle.
  const [erreurChargement, setErreurChargement] = useState<Portee | null>(null);
  const erreurRef = useRef<Portee | null>(null);
  const [relance, setRelance] = useState(0);
  // Le numéro de la dernière demande partie : une réponse qui n'est plus la dernière
  // est jetée (deux chapitres cliqués coup sur coup, le premier répondant en second).
  const numeroDemandeRef = useRef(0);
  const demandeVide = !demande.codes.length || !demande.tradIds.length;
  // Servi du CACHE sans attendre. L'ajustement se fait PENDANT le rendu, comme le retour
  // à la première page de la Bibliothèque : l'attente n'est jamais vraie, rien ne
  // s'efface pour reparaître aussitôt, et le tableau change avant la peinture.
  if (!demandeVide && !couvre(porteeChargee, demande)) {
    const enCache = assemblerDepuisCache(demande, ordreDe);
    if (enCache) { setCanon(enCache.canon); setV2(enCache.lignes); setPorteeChargee(demande); }
  }
  const enChargement = !demandeVide && !couvre(porteeChargee, demande) && erreurChargement !== demande;
  useEffect(() => {
    if (demandeVide || couvre(porteeChargee, demande) || erreurRef.current === demande) return;
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
    if (suivant > (NB_CHAPITRES[demande.codes[0]] ?? 1)) return;
    const t = window.setTimeout(() => { void precharger({ ...demande, chScope: suivant }); }, 400);
    return () => window.clearTimeout(t);
  }, [enChargement, demandeVide, demande]);
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
      void precharger({ codes: [code], tradIds: d.tradIds, chScope: ch });
    }, 150);
  }, []);

  // ── Le passage d'un texte à l'autre est FLUIDE, ici aussi (2026-09-03) ─────
  // Même dispositif que la page d'œuvre et la page Bible (`app/lib/passageTexte.ts`,
  // animations dans `globals.css`) : au DÉPART, les lignes visibles reçoivent leur
  // rang et s'effacent l'une après l'autre, puis le corps entier ; à l'ARRIVÉE, le
  // corps remonte en tête si le chapitre ou le livre a changé, et les lignes
  // paraissent de même. Le départ, c'est le moment où l'attente commence
  // (`enChargement` passe à vrai) ; l'arrivée, celui où les données la couvrent.
  // ⛔ Les lignes de l'ancien chapitre restent dans le document jusqu'à l'arrivée
  // (voir `livresRendus`) : c'est ce qui donne à l'effacement quelque chose à effacer.
  const [passage, setPassage] = useState<"sortie" | "entree" | null>(null);
  const corpsRef = useRef<HTMLDivElement>(null);
  const enteteRef = useRef<HTMLDivElement>(null);
  const porteeRendueRef = useRef<Portee | null>(null);
  useLayoutEffect(() => {
    if (!enChargement || passage === "sortie") return;
    const corps = corpsRef.current;
    if (!corps || ordonnerBlocsVisibles(corps, hautDeLecture(enteteRef.current), SELECTEUR_BLOCS_POLYGLOTTE) === 0) return;
    setPassage("sortie");
  }, [enChargement, passage]);
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
    // Venu du cache, rien ne s'est effacé : rien ne paraît non plus, même parti que
    // l'échange de bible en mémoire sur la page Bible. Le défilement dit qu'on a tourné.
    if (passage !== "sortie") return;
    ordonnerBlocsVisibles(corps, hautDeLecture(enteteRef.current), SELECTEUR_BLOCS_POLYGLOTTE);
    setPassage("entree");
    const fin = window.setTimeout(() => setPassage(null), DUREE_ENTREE_MS);
    return () => window.clearTimeout(fin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [porteeChargee]);

  // Charge les citations déjà enregistrées par l'utilisateur pour le(s) livre(s) affiché(s),
  // afin que le signet apparaisse plein sur les versets favoris et qu'un clic les retire.
  useEffect(() => {
    if (!userId || !livresAffiches.length) { setPrelevs(new Map()); return; }
    const abrs = livresAffiches.map(l => ABREV_FR[l.code] ?? l.code);
    supabase.from("prelevements").select("id, ref_livre_abr, ref_chapitre, ref_verset, traduction")
      .eq("user_id", userId).eq("type", "biblique").in("ref_livre_abr", abrs)
      .then(({ data }) => {
        const m = new Map<string, string>();
        // Clé étendue au nom d'édition : chaque colonne (traduction) a son propre signet.
        for (const p of data ?? []) m.set(`${p.ref_livre_abr}|${p.ref_chapitre}|${p.ref_verset}|${p.traduction}`, p.id);
        setPrelevs(m);
      });
  }, [userId, livresAffiches]);

  // Charge toutes les notes personnelles de l'utilisateur (peu volumineuses), indexées
  // par canon_id, pour remplir la colonne « Notes » des versets déjà annotés.
  useEffect(() => {
    if (!userId) { setNotes(new Map()); return; }
    supabase.from("polyglotte_notes").select("canon_id, texte").eq("user_id", userId)
      .then(({ data }) => {
        const m = new Map<string, string>();
        for (const n of data ?? []) if (n.texte) m.set(n.canon_id, n.texte);
        setNotes(m);
      });
  }, [userId]);

  // Verset ciblé (barre de recherche du volet) : une fois le chapitre chargé, on y défile
  // et l'on efface le surlignage après un instant. Dépend de `canon` pour attendre le rendu.
  useEffect(() => {
    if (!versetCible || !livreChoisi) return;
    const id = `poly-${livreChoisi}-${versetCible.ch}-${versetCible.v}`;
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    const t2 = setTimeout(() => setVersetCible(null), 2600);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [versetCible, livreChoisi, canon]);

  // Index (canon_id, trad_id) → cellule ; canon groupé par livre
  const cellule = useMemo(() => {
    const m = new Map<string, V2Row[]>();
    for (const r of v2) { const k = `${r.canon_id}|${r.trad_id}`; m.set(k, [...(m.get(k) ?? []), r]); }
    // versets fusionnés (many→1) : afficher dans l'ordre d'origine (ch_orig, v_orig)
    for (const arr of m.values()) if (arr.length > 1) arr.sort((a, b) => a.ch_orig - b.ch_orig || a.v_orig - b.v_orig);
    return m;
  }, [v2]);
  const parLivre = useMemo(() => {
    const m = new Map<string, CanonRow[]>();
    for (const r of canon) m.set(r.livre, [...(m.get(r.livre) ?? []), r]);
    return m;
  }, [canon]);
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
        const cle = `${r.livre}|${r.ch_orig}|${r.v_orig}`;
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
  const slotCols = slots.map((id, i) => ({ slot: i, trad: trads.find(t => t.trad_id === id) ?? null }));
  const colonnes = slotCols.map(s => s.trad).filter((t): t is Trad => !!t);
  const nomDe = (code: string) => livres.find(l => l.code === code)?.nom_fr ?? code;

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
  const LARGEUR_NOTES = notesReduites ? "26px" : "13rem";
  const tmpl = `${LARGEUR_REF}px ${slotCols.map(() => "minmax(0, 1fr)").join(" ")} ${LARGEUR_NOTES}`;
  const HAUT_ENTETE = 52;   // titre et date de l'édition, sur deux lignes (ligne desserrée)
  const HAUT_NAV    = 10;   // blanc entre la NavBar et le haut de la page
  // Sommet du corps : sous la navbar, le blanc de séparation et la ligne des éditions.
  // C'est là que viennent se poser les bandeaux de nom de livre quand plusieurs livres se
  // suivent. ⚠️ La barre de titre n'y entre plus : le nom du livre est passé au volet.
  // HAUTEUR_NAVBAR est une chaîne rem ; on compose en calc() CSS (pas d'addition
  // numérique). La hauteur de l'en-tête reste en px.
  const SOMMET_CORPS = `calc(${HAUTEUR_NAVBAR} + ${HAUT_NAV + HAUT_ENTETE}px)`;
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
    <div style={{ background: FOND, minHeight: "calc(100vh - 3.5rem)" }}>
      {/* La comparaison en colonnes exige une largeur d'écran : indisponible sur téléphone. */}
      <style>{`
        .poly-outil { display: block; }
        .poly-mobile { display: none; }
        @media (max-width: 820px) {
          .poly-outil { display: none; }
          .poly-mobile { display: block; }
        }
        /* Citer / signaler : un jeu DANS chaque cellule (une action par traduction),
           posé en haut à droite, révélé au seul survol de la cellule. */
        .poly-cellact {
          position: absolute; top: 2px; right: 4px; z-index: 2;
          display: flex; align-items: center; gap: 8px;
          padding: 2px 7px; border-radius: 8px;
          background: transparent; box-shadow: none;
          transition: background .12s, box-shadow .12s;
        }
        /* Le bandeau clair n'apparaît qu'au survol de la cellule ET tant que le curseur
           bouge : la classe poly-curseur-actif est retirée après une seconde d'immobilité
           (JS), ce qui efface les actions pour ne pas gêner la lecture. */
        .poly-curseur-actif .poly-texte-cell:hover .poly-cellact {
          background: var(--cs-surface); box-shadow: var(--cs-ombre-nette);
        }
        .poly-act { opacity: 0; transition: opacity .12s, color .15s; }
        .poly-curseur-actif .poly-texte-cell:hover .poly-act { opacity: .9; }
        .poly-act:hover { opacity: 1 !important; color: var(--cs-texte-second); }
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
        /* Ligne survolée : une légère surbrillance permanente (sans mouvement), PLUS un
           bref pulse discret TOUTES LES 3 s pour rappeler où se trouve le lecteur. */
        .poly-row:hover, .poly-surnum-row:hover { filter: brightness(0.955); animation: poly-rappel-ligne 3s ease-in-out infinite; }
        @keyframes poly-rappel-ligne {
          0%, 82%, 100% { filter: brightness(0.955); }
          91% { filter: brightness(0.915); }
        }
        @media (prefers-reduced-motion: reduce) {
          .poly-row:hover, .poly-surnum-row:hover { animation: none; }
        }
        /* Le nom d'édition ouvre son menu sur toute sa surface, mais son choix est composé
           en deux lignes : titre en sérif, millésime plus discret. ⚠️ Les deux états
           prenaient un voile BLANC translucide, juste sur l'ancien aplat vert et invisible
           sur le papier : ils passent à l'accent du site. */
        .poly-trad-pick:hover { background: rgba(var(--cs-vert-rgb),0.07); }
        .poly-trad-pick:focus-within { box-shadow: inset 0 0 0 1px rgba(var(--cs-vert-rgb),0.45); }
        /* La référence d'origine en LETTRINE : un petit bloc flottant, posé au début du
           verset, que le texte vient habiller comme une initiale ornée. Le filet à droite
           la tient à distance sans l'enfermer dans un cadre. */
        /* Texte justifié, serré, et césuré généreusement : sans césure, la justification
           d'une colonne étroite creuse des lézardes. hyphenate-limit-chars autorise des
           fragments courts, faute de quoi le navigateur renonce à couper. La langue de la
           cellule (attribut lang) décide du dictionnaire — voir codeLangue(). */
        /* Le texte biblique passe en SÉRIF de lecture (Source Serif) : la page cesse de
           lire comme un tableur pour lire comme une édition. La lettrine, les millésimes
           et les boutons restent en sans (chacun porte sa propre font-family). ATTENTION :
           line-height est repris À L'IDENTIQUE par .poly-lettrine-item (hauteur du
           flottant = une ligne de texte) : garder les deux valeurs synchronisées. */
        .poly-texte-cell {
          position: relative;
          min-width: 0;
          /* ⛔ Le blanc entre versets vient d'ICI, et de nulle part ailleurs : un écart posé
             entre les lignes de la grille interromprait la réglure verticale à chaque verset,
             et la page redeviendrait un tableau. La gouttière latérale s'ouvre d'un cran, le
             filet n'étant plus doublé d'un fond de cellule pour l'en écarter. */
          padding: 7px 14px 8px;
          font-family: var(--font-source-serif), Georgia, serif;
          text-align: justify;
          text-align-last: left;
          hyphens: auto; -webkit-hyphens: auto;
          hyphenate-limit-chars: 5 2 2;
          /* Un peu plus dense (goût de l'auteur) : interligne juste resserré, et surtout
             les mots rapprochés d'un cran. line-height reste synchronisé avec
             .poly-lettrine-item (hauteur du flottant = une ligne). */
          word-spacing: -0.04em;
          line-height: 1.36;
        }
        .poly-texte-cell::after { content: ""; display: block; clear: both; }
        /* Aucune marge ni rembourrage VERTICAL, et pas de taille propre : la lettrine
           garde la taille de police de la ligne, si bien que la hauteur de ses éléments
           s'exprime en em de la ligne — voir .poly-lettrine-item. */
        .poly-lettrine {
          float: left;
          display: flex; flex-direction: column; align-items: flex-end;
          margin: 0 8px 0 0; padding: 0 7px 0 0;
          border-right: 1px solid rgba(var(--cs-vert-rgb),0.22);
          font-family: var(--font-source-sans), Arial, sans-serif;
          font-weight: 400; letter-spacing: 0.03em;
          font-variant-numeric: tabular-nums;
          color: var(--cs-texte-doux); text-align: right;
        }
        /* Le numéro est petit, mais son étui fait EXACTEMENT une ligne de texte (1.36em,
           l'interligne de la cellule) : le flottant ne repousse donc qu'une seule ligne,
           et deux versets partageant un créneau en repoussent deux.
           ⚠️ Il descend d'un cran (12 px → 11) : c'est la numérotation PROPRE à l'édition,
           qui accompagne le verset sans le nommer — la référence canonique, en marge, est le
           repère de la ligne. Deux numéros de même corps dans le même champ de vision se
           disputaient le regard. La taille de l'étui, elle, ne bouge pas : elle est en em de
           la CELLULE, non du numéro (voir .poly-lettrine-item). */
        .poly-lettrine-ref { display: block; white-space: nowrap; font-size: 0.6875rem; line-height: 1; }
        /* Le chapitre s'efface derrière le verset : les deux sont là, mais l'œil qui
           parcourt la colonne accroche le numéro qui change. */
        .poly-lettrine-ch { font-weight: 400; color: var(--cs-texte-faible); }
        .poly-lettrine-item { position: relative; display: flex; align-items: center; justify-content: flex-end; height: 1.36em; }
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
      `}</style>

      <div className="poly-mobile" style={{ maxWidth: '32.5rem', margin: "0 auto", padding: "56px 22px 48px", fontFamily: "var(--font-source-sans), Arial, sans-serif", textAlign: "center", color: 'var(--cs-texte-second)' }}>
        <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: TITRE_CARTE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE_CARTE, margin: "0 0 16px" }}>Polyglotte</h1>
        <p style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
          Cette page compare plusieurs traductions côte à côte : elle demande un écran large.
          <br /><br />
          <strong>Ouvrez-la depuis un ordinateur ou une tablette.</strong>
        </p>
        {/* CUL-DE-LAMPE, et non frontispice. Placée en tête, la gravure devenait l'enseigne
            de la page et l'on butait dessus avant de savoir de quoi il retournait. En pied,
            elle fait ce que font les autres ornements du site : elle ferme le propos et le
            commente. L'ordinateur sous les langues de feu de la Pentecôte, l'alpha et
            l'oméga sur le moniteur, c'est la Polyglotte dite en une image, celle des langues
            rassemblées ; le grand écran qu'on demande s'entend alors comme une promesse
            plutôt que comme une porte fermée.
            L'INTENSITÉ et l'ENCRE sont celles de la tour de Babel, à l'autre bout de la même
            page : cet écran n'a lui non plus qu'une gravure pour tout contenu, et elle porte le
            propos au lieu d'orner un vide.
            ⛔ Deux MAXIMA, aucune largeur ni hauteur posée (charte). Le plafond de hauteur n'est
            pas décoratif ici : la planche est en hauteur là où la précédente était en largeur,
            et sur un téléphone bas elle chasserait le texte hors de l'écran.
            PNG DÉTOURÉ, jamais mix-blend-mode. L'opacité posée sur la même image crée un
            contexte d'empilement qui isole l'élément et annule le mélange : le fond crème
            réapparaîtrait (voir la note des ornements dans app/chantier/page.tsx). Ici la
            luminance du papier est passée en canal alpha, et l'encre REPOSÉE en une teinte
            unique, mesurée sur la planche : la décomposition par pixel divise par l'alpha et
            fait virer les bords au bruit coloré sur un papier presque blanc. */}
        <img className="cs-ornement" src="/ornements/ordinateur-ardent.png" alt="" aria-hidden="true"
          style={{ display: "block", maxWidth: "min(16rem, 76%)", maxHeight: "46dvh", margin: "34px auto 0", opacity: 0.92 }} />
      </div>

      {/* Le MÊME volet que la page Bible — pas un cousin qui lui ressemble. Un seul composant
          pour les deux pages, donc une seule navigation à maintenir et à apprendre. */}
      <div className="poly-outil">
        <div style={{ display: "flex", alignItems: "flex-start", minHeight: "calc(100vh - 3.5rem)" }}>
        {/* `top: 0` collait le volet au bord du viewport, c'est-à-dire DERRIÈRE la
            navbar fixe : sa barre de recherche disparaissait sous elle dès qu'on
            descendait. Le volet se cale donc sous la navbar, et n'occupe que la
            hauteur restante. */}
        <div style={{ position: "sticky", top: HAUTEUR_NAVBAR, height: HAUTEUR_SOUS_NAVBAR, flexShrink: 0, display: "flex", flexDirection: "column" }}>
          {voletReduit ? (
            // Volet rabattu : un mince rail cliquable pour le rouvrir, sur le modèle du
            // rail de la page Bible (fond clair, filet à droite, chevron discret).
            <button onClick={() => setVoletReduit(false)} title="Afficher le volet des livres" aria-label="Afficher le volet"
              style={{ width: "30px", flex: 1, background: "var(--cs-fond-clair)", border: "none", borderRight: "1px solid var(--cs-bord)", cursor: "pointer", color: "var(--cs-texte-doux)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: "12px", gap: "10px" }}>
              <IconeChevron dir="right" size={14} strokeWidth={1.5} />
              {/* ⚠️ Le rail porte ce que le volet portait : sans lui, replier le volet ferait
                  perdre de vue le passage qu'on lit, puisque le tableau ne le nomme plus.
                  Écrit en hauteur, dans le sens de la lecture d'un dos de livre. */}
              {libellePassage && (
                <span aria-hidden style={{ writingMode: "vertical-rl", fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.71875rem", color: "var(--cs-texte-gris)", letterSpacing: "0.04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxHeight: "60%" }}>
                  {libellePassage}
                </span>
              )}
            </button>
          ) : (
            <>
          {/* Titre de la page, en tête du volet de gauche, avec le bouton de repli à sa droite. */}
          <div style={{ flexShrink: 0, background: "var(--cs-fond-clair)", borderRight: "1px solid var(--cs-bord)", borderBottom: "1px solid var(--cs-bord)", padding: "12px 14px 11px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <h1 style={{ margin: 0, fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1rem', fontWeight: 600, color: VERT, letterSpacing: "0.01em", lineHeight: 1.2 }}>Bible polyglotte</h1>
              {/* Même bouton « réduire » que la page Bible et les pages d'œuvre : nu, sans
                  cadre, chevron discret. */}
              <button onClick={() => setVoletReduit(true)} title="Rabattre le volet" aria-label="Rabattre le volet"
                style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: "3px", color: "var(--cs-texte-faible)", display: "flex", alignItems: "center" }}>
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
          <div style={{ flexShrink: 0, background: "var(--cs-fond-clair)", borderRight: "1px solid var(--cs-bord)", borderBottom: "1px solid var(--cs-bord)", padding: "8px 14px 9px" }}>
            <span style={{ display: "block", fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cs-texte-doux)", marginBottom: "5px" }}>Traductions visibles</span>
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {([["Auto", null], ["2", 2], ["3", 3], ["4", 4], ["5", 5]] as const).map(([lbl, val]) => {
                const actif = nbTradPref === val;
                return (
                  <button key={lbl} onClick={() => setNbTradPref(val)}
                    style={{ fontSize: "0.625rem", fontWeight: actif ? 600 : 400, padding: "2px 9px", borderRadius: "999px", cursor: "pointer",
                      border: `1px solid ${actif ? VERT : "var(--cs-bord)"}`, background: actif ? "rgba(var(--cs-vert-rgb),0.10)" : "var(--cs-surface)", color: actif ? VERT : "var(--cs-texte-second)",
                      fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Les deux réglages de relecture de l'administrateur. Ils étaient posés en absolu
              sur le bandeau du livre, qui n'existe plus ; ils descendent auprès de « Traductions
              visibles », dont ils sont les voisins naturels — ce sont des réglages, non des
              titres. ⚠️ Ils s'excluent l'un l'autre : activer l'un éteint l'autre. */}
          {estAdmin && (
            <div style={{ flexShrink: 0, background: "var(--cs-fond-clair)", borderRight: "1px solid var(--cs-bord)", borderBottom: "1px solid var(--cs-bord)", padding: "8px 14px 9px" }}>
              <span style={{ display: "block", fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cs-texte-doux)", marginBottom: "5px" }}>Relecture</span>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {([["sensibles", sensiblesOnly, "var(--cs-danger)", "Lignes problématiques"],
                   ["surnum", surnumOnly, "var(--cs-surnum)", "Surnuméraires"]] as const).map(([cle, actif, teinte, libelle]) => (
                  <button key={cle}
                    onClick={() => {
                      if (cle === "sensibles") { setSensiblesOnly(!actif); if (!actif) { setSurnumOnly(false); setToutAfficher(false); } }
                      else { setSurnumOnly(!actif); if (!actif) { setSensiblesOnly(false); setToutAfficher(false); } }
                    }}
                    aria-pressed={actif}
                    style={{ fontSize: "0.625rem", fontWeight: actif ? 600 : 400, padding: "2px 9px", borderRadius: "999px", cursor: "pointer",
                      border: `1px solid ${actif ? teinte : "var(--cs-bord)"}`,
                      background: actif ? colorMix(teinte, 12) : "var(--cs-surface)",
                      color: actif ? teinte : "var(--cs-texte-second)",
                      fontFamily: "var(--font-source-sans), Arial, sans-serif", whiteSpace: "nowrap" }}>
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
              onChoisirLivreEntier={(code) => { if (code !== livreChoisi) choisirLivre(code); setChapitreChoisi(null); setToutAfficher(false); setVersetCible(null); }}
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
      <div ref={refTable} style={{ flex: 1, minWidth: 0, padding: "0 12px 60px", fontFamily: "var(--font-source-sans), Arial, sans-serif", color: "var(--cs-texte-fort)" }}>
        {/* Aucun livre choisi : la page reste vide et l'explique */}
        {!onglet && (
          // Le groupe (image + légende) est centré VERTICALEMENT et HORIZONTALEMENT dans le bloc.
          <div style={{ position: "relative", minHeight: "calc(100dvh - 3.5rem - 6rem)" }}>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "min(56rem, 94%)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              {/* Tour de Babel (gravure) : image de la Polyglotte — la confusion des langues,
                  que la lecture en regard rassemble. PNG détouré (fond blanc rendu transparent) :
                  la gravure se pose sur le crème, sans rectangle clair ni mix-blend-mode.

                  ⛔ Sa largeur était posée en PIXELS (816), donc absolue : elle ne suivait ni
                  la colonne ni la police racine. Sur un grand écran, où la racine passe de 16
                  à 22 (§ Responsive), tout grandissait autour d'elle d'un tiers pendant qu'elle
                  gardait ses 816 px — la gravure rapetissait donc à mesure que l'écran
                  s'agrandissait, et flottait au milieu d'une colonne devenue trop vaste. En rem
                  (51rem = les mêmes 816 px à la racine 16), elle grandit avec le reste, jusqu'à
                  1 122 px à la racine 22, et les 96 % la gardent dans sa colonne quand le volet
                  des livres est ouvert.

                  Le PLAFOND DE HAUTEUR est l'autre moitié du réglage, et il vaut pour les écrans
                  BAS, non pour les petits : la gravure est large de 1436 sur 870, donc presque
                  deux fois plus large que haute. Le groupe est centré par translate(-50%, -50%)
                  dans un bloc qui ne mesure que la hauteur restante ; dès que l'image dépasse,
                  elle déborde des DEUX côtés à la fois et sa tête passe sous l'en-tête collant.
                  À 816 px de large elle en fait 494 de haut, ce qui ne tient plus sous une
                  fenêtre de moins de 700 px. Le plafond réserve la légende et les marges, puis
                  laisse la hauteur commander.

                  ⚠️ Les deux bornes sont des MAXIMA, et width reste auto : c'est la seule
                  écriture qui garde les proportions. Avec une largeur POSÉE plus un plafond de
                  hauteur, la largeur est définitive et le plafond écrase l'image sans la
                  recalculer — mesuré sous une fenêtre de 600 px : 816 sur 400, soit un rapport
                  de 2,04 au lieu de 1,651, une tour de Babel étirée en travers. Quand les deux
                  dimensions sont automatiques et bornées, le navigateur applique les maxima l'un
                  après l'autre en tenant le rapport (CSS 2.1, § 10.4). */}
              <img className="cs-ornement" src="/ornements/tour-babel-ruinee.png" alt="" aria-hidden="true"
                style={{ maxWidth: "min(68rem, 96%)", maxHeight: "calc(100dvh - 3.5rem - 15rem)", opacity: 0.72, marginBottom: "16px" }} />
              <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.9375rem', fontStyle: "italic", color: "var(--cs-mention)", letterSpacing: "0.02em", margin: 0 }}>Ouvrez un livre</p>
            </div>
          </div>
        )}

        {onglet && (
          <>

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
              <div style={{ display: "grid", gridTemplateColumns: tmpl, fontSize: '0.75rem', minHeight: HAUT_ENTETE, borderBottom: "1px solid var(--cs-bord)" }}>
                {/* La marge de la référence : la réglure ne commence qu'après elle. */}
                <div />
                {/* Un en-tête par colonne de traduction, exactement : la numérotation
                    d'origine ayant rejoint le texte en lettrine, il n'y a plus de seconde
                    piste à couvrir. ⚠️ Le filet de gauche est le HAUT de la réglure : il doit
                    tomber au même pixel que celui des cellules, sans quoi la verticale se
                    briserait sous l'en-tête. */}
                {slotCols.map((sc, k) => {
                  const i = sc.slot;
                  return (
                    // Une seule colonne par traduction depuis que la référence d'origine est
                    // passée en lettrine : le « span 2 » d'avant faisait déborder chaque
                    // en-tête sur sa voisine, et les quatre retombaient à la ligne en escalier.
                    <div key={k} style={{ borderLeft: `1px solid ${FILET_COL}`, padding: "0 4px", display: "flex", alignItems: "stretch", justifyContent: "center", minWidth: 0 }}>
                      {/* Le nom est un menu déroulant : chevron pour qu'on voie qu'il se
                          clique. Une traduction déjà affichée ailleurs peut être choisie : les
                          deux colonnes s'échangent alors leur place (indiqué dans l'option). */}
                      <ChoixTraduction trads={trads} slots={slots} index={i} onChoisir={choisirTraduction} />
                    </div>
                  );
                })}
                {/* En-tête de la colonne Notes — réductible en rail. Beaucoup de lecteurs
                    n'écriront jamais de note : la colonne se ferme d'un clic, et la place
                    qu'elle rend peut aller jusqu'à ouvrir une colonne de traduction de plus
                    (voir le calcul de largeur adaptative). */}
                <div style={{ borderLeft: `1px solid ${FILET_COL}`, padding: notesReduites ? 0 : "0 6px", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, minWidth: 0 }}>
                  {notesReduites ? (
                    /* Colonne fermée : un simple crayon, propre et discret, pour rouvrir. */
                    <button onClick={() => setNotesReduites(false)} title="Afficher la colonne Notes" aria-label="Afficher la colonne Notes" className="poly-notes-rail"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cs-texte-doux)", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", padding: 0 }}>
                      <IconeCrayon size={13} />
                    </button>
                  ) : (
                    /* Colonne ouverte : toute la cellule est cliquable ; au survol, « Notes »
                       laisse place à « Fermer ». */
                    <button onClick={() => setNotesReduites(true)} title="Fermer la colonne Notes" className="poly-notes-head"
                      style={{ background: "none", border: "none", cursor: "pointer", width: "100%", height: "100%", padding: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cs-texte-faible)" }}>
                      <span className="lbl-notes" style={{ fontFamily: "var(--font-source-sans), Arial, sans-serif", fontSize: "0.53125rem", fontWeight: 700, letterSpacing: "0.16em", textIndent: "0.16em", textTransform: "uppercase" }}>Notes</span>
                      <span className="lbl-fermer" style={{ fontFamily: "var(--font-source-sans), Arial, sans-serif", fontSize: "0.53125rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--cs-texte-second)" }}>
                        Fermer
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Corps : un bloc par livre, rendu paresseux (content-visibility). L'enveloppe
                porte la marque d'attente, centrée sur le corps du tableau — sur ce qu'on
                lit, et non sur l'écran ; un plancher de hauteur lui laisse la place
                quand rien n'est encore chargé. */}
            <div data-passage={passage ?? undefined} style={{ position: "relative" }}>
            {/* `cs-lecture-colonne` : ce qui s'efface et paraît quand on passe d'un texte
                à l'autre (voir « passage » plus haut). L'en-tête collant, lui, ne bouge pas. */}
            {/* ⛔ Ni cadre, ni fond de surface, ni coins arrondis : le corps EST la page. Il
                portait une carte blanche bordée, qui s'arrêtait avant le bord du bloc et
                donnait à lire un objet posé sur le papier plutôt qu'une page imprimée. */}
            <div ref={corpsRef} className="cs-lecture-colonne" style={{ minHeight: enChargement ? "12rem" : undefined }}>
              {colonnes.length === 0 && <div style={{ padding: 20, color: "var(--cs-texte-doux)" }}>Choisir au moins une traduction dans l’en-tête ci-dessus.</div>}
              {erreurChargement && !enChargement && (
                <div role="alert" style={{ padding: 20, display: "flex", alignItems: "center", gap: 12, fontSize: "0.8125rem", color: "var(--cs-danger)" }}>
                  Le chargement a échoué.
                  <button onClick={reessayer}
                    style={{ fontSize: "0.6875rem", padding: "2px 8px", borderRadius: 4, border: "1px solid var(--cs-danger-bord)", background: "var(--cs-surface)", color: "var(--cs-danger)", cursor: "pointer", fontFamily: "inherit" }}>
                    Réessayer
                  </button>
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
            const titre = editions > 1
              ? `Verset hors ossature canonique, porté par ${editions} éditions au même numéro (${g.ch}, ${g.v})`
              : `Verset propre à cette édition — hors ossature canonique (${g.ch}, ${g.v})`;
            return (
              <div key={cle} className="poly-surnum-row" style={{ display: "grid", gridTemplateColumns: tmpl, background: SURNUM_FOND, borderTop: "1px solid var(--cs-surnum-bord)", fontSize: '0.875rem' }}>
                {/* « ✦ » plutôt que « ＋ » : le plus disait « on a ajouté quelque chose », ce qui
                    est faux et un peu comptable. L'étoile marque un verset qui existe hors de
                    l'ossature, sans porter de jugement sur sa légitimité.
                    ⚠️ C'est la SEULE ligne du corps à porter encore des filets, en haut et
                    dans sa marge, et c'est délibéré : la page n'a plus d'horizontale, si bien
                    qu'un filet y devient un signal fort au lieu d'être une trame. */}
                <div title={titre} style={{ padding: `${HAUT_PAD_MARGE}px 6px 0 0`, textAlign: "right", whiteSpace: "nowrap", fontWeight: 700, fontSize: '0.71875rem', lineHeight: HAUT_LIGNE_TEXTE, color: SURNUM, borderRight: `2px solid ${SURNUM}` }}>✦</div>
                {slotCols.map((sc, i) => {
                  const r = sc.trad ? g.par.get(sc.trad.trad_id) : undefined;
                  return (
                    <div key={i} className="poly-texte-cell" lang={sc.trad?.lang} onCopy={copierSansCesures}
                      style={{ borderLeft: "1px solid var(--cs-surnum-bord)", color: r ? 'var(--cs-surnum-fort)' : 'var(--cs-surnum-bord)' }}>
                      {/* Même lettrine que les versets canoniques, au violet des surnuméraires :
                          la référence d'origine est ici la seule qui existe. */}
                      {r && (
                        <span className="poly-lettrine" style={{ color: SURNUM, borderRightColor: "rgba(90,75,156,0.22)" }}>
                          <span className="poly-lettrine-item">
                            <span className="poly-lettrine-ref">
                              <span className="poly-lettrine-ch" style={{ color: 'var(--cs-surnum-doux)' }}>{r.ch_orig},</span> {r.v_orig}
                            </span>
                          </span>
                        </span>
                      )}
                      {/* Signalement au survol : un surnuméraire n'a pas de référence canonique,
                          on signale donc sur sa numérotation d'origine. */}
                      {r && sc.trad && (
                        <span className="poly-cellact" onClick={e => e.stopPropagation()}>
                          <BoutonCopierTexte className="poly-act" style={ACT_BTN} titre="Copier ce verset"
                            texte={citationBiblique(r.texte ?? "", `${ABREV_FR[g.livre] ?? g.livre} ${g.ch}, ${g.v}`)} />
                          <BoutonSignalerVerset refLisible={`${ABREV_FR[g.livre] ?? g.livre} ${g.ch}, ${g.v}`} texte={r.texte ?? undefined} />
                        </span>
                      )}
                      {!sc.trad ? "" : r ? texteCesure(r.texte, sc.trad.lang) : <CelluleAbsente />}
                    </div>
                  );
                })}
                {/* Colonne Notes : pas de note sur un surnuméraire (hors ossature du canon). */}
                <div style={{ borderLeft: "1px solid var(--cs-surnum-bord)" }} />
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
              {rows.map(r => {
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
                return (
                  <Fragment key={r.id}>
                    <div className="poly-row" id={`poly-${l.code}-${r.ch_canon}-${r.v_canon}`}
                      style={{ display: "grid", gridTemplateColumns: tmpl, background: (versetCible && versetCible.ch === r.ch_canon && versetCible.v === r.v_canon) ? 'var(--cs-vise-fond)' : fond, fontSize: '0.875rem', scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + ${HAUT_NAV + HAUT_ENTETE + 8}px)`, transition: "background .4s" }}>
                      {/* La référence canonique, EN MARGE : elle accompagne le verset au lieu
                          d'occuper une colonne bordée. Alignée à droite pour que les numéros
                          tombent tous au même fer, et calée sur la première ligne du texte.
                          ⚠️ Le filet ne subsiste que sur un point signalé, où il DIT quelque
                          chose ; ailleurs, la marge est nue. */}
                      <div title={signaler ? desc : undefined} style={{ padding: `${HAUT_PAD_MARGE}px 8px 0 0`, textAlign: "right", fontSize: '0.6875rem', fontWeight: 500, lineHeight: HAUT_LIGNE_TEXTE, fontVariantNumeric: "tabular-nums", color: signaler ? ROUGE : ligneVide ? 'var(--cs-texte-faible)' : VERT, borderRight: signaler ? `2px solid ${ROUGE}` : undefined }}>
                        <div style={{ whiteSpace: "nowrap", lineHeight: "inherit" }}>{r.ch_canon}, {r.v_canon}{signaler ? " ⚠" : ""}</div>
                      </div>
                      {slotCols.map((sc, i) => {
                        if (!sc.trad) return <div key={i} style={{ borderLeft: `1px solid ${FILET_COL}` }} />;
                        const t = sc.trad;
                        const cs = cellule.get(`${r.id}|${t.trad_id}`) ?? [];
                        // Actions propres à CETTE cellule : citer / signaler la traduction qu'elle
                        // porte. Clé de citation étendue au nom d'édition pour que chaque colonne
                        // ait son propre état « enregistré ».
                        const texteCell = cs.map(c => c.texte).filter(Boolean).join(" ");
                        // TR0009 : une lacune du manuscrit se rend « [lacune du manuscrit] », sans
                        // lettrine ni actions (rien à citer), et non par la case « absente » générique.
                        const lacuneCell = cs.length > 0 && cs[0]?.estLacune899 === true;
                        const cleCite = `${abr}|${r.ch_canon}|${r.v_canon}|${t.nom}`;
                        return (
                          <div key={i} className="poly-texte-cell" lang={t.lang} onCopy={copierSansCesures}
                            style={{ borderLeft: `1px solid ${FILET_COL}`, color: signaler ? 'var(--cs-danger-fonce)' : "var(--cs-encre-fonce)" }}>
                            {/* La lettrine : référence(s) d'origine et crayon, en bloc flottant que
                                le texte habille. Plusieurs versets de l'édition peuvent partager un
                                créneau du canon — leurs numéros s'écrivent alors l'un sous l'autre,
                                en tête du texte réuni. */}
                            {cs.length > 0 && !lacuneCell && (
                              <span className="poly-lettrine">
                                {cs.map((c, k) => (
                                  <span key={k} className="poly-lettrine-item">
                                    <span className="poly-lettrine-ref" title={`${c.ch_orig}, ${c.v_orig}${t.trad_id === "TR0004" ? "" : (c.v_orig_suffixe ?? "")}`}>
                                      {/* Chapitre ET verset, toujours : la référence d'origine ne se
                                          lit qu'entière. Le chapitre est simplement composé plus clair
                                          pour que le verset, lui, se détache. */}
                                      <span className="poly-lettrine-ch">{c.ch_orig},</span> {c.v_orig}{t.trad_id === "TR0004" ? "" : (c.v_orig_suffixe ?? "")}
                                      {/* Une intervention d'alignement laisse toujours sa trace dans
                                          `notes` : le lecteur voit QU'il y a eu intervention, et le
                                          survol lui dit LAQUELLE. Rien n'est corrigé en silence. */}
                                      {c.notes ? <span title={c.notes} style={{ marginLeft: 3, color: 'var(--cs-surnum)', cursor: "help", display: "inline-flex", verticalAlign: "middle" }}><IconeCrayon size={9} /></span> : null}
                                    </span>
                                    {estAdmin && !est899(t.trad_id) && (
                                      <button title="Modifier ce verset" aria-label="Modifier ce verset" className="poly-edit"
                                        onClick={() => { setCibleEdition({ id: c.id, texte: c.texte ?? "", reference: `${l.nom_fr} ${c.ch_orig}, ${c.v_orig}` }); setEnregistre("idle"); }}
                                        style={{ border: "none", cursor: "pointer", color: 'var(--cs-texte-second)', fontSize: '0.65625rem', lineHeight: 1, background: fond, transition: "color .15s" }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = VERT; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--cs-texte-second)'; }}>
                                        <IconeCrayon size={11} />
                                      </button>
                                    )}
                                  </span>
                                ))}
                              </span>
                            )}
                            {/* Citer / signaler cette traduction — au survol de la cellule. */}
                            {cs.length > 0 && !lacuneCell && (
                              <span className="poly-cellact" onClick={e => e.stopPropagation()}>
                                <BoutonCiterVerset userId={userId} saved={prelevs.get(cleCite) ?? null} cle={cleCite} refLivre={l.nom_fr} refAbr={abr} chapitre={r.ch_canon} verset={r.v_canon} texte={texteCell} traductionLabel={t.nom} onSaved={marquerCite} onRemoved={retirerCite} />
                                <BoutonCopierTexte className="poly-act" style={ACT_BTN} titre="Copier ce verset"
                                  texte={citationBiblique(texteCell ?? "", refLisible)} />
                                <BoutonSignalerVerset refLisible={refLisible} texte={texteCell} />
                              </span>
                            )}
                            {cs.length === 0 ? (
                              <CelluleAbsente deutero={deuterocanonique(r.id)} />
                            ) : lacuneCell ? (
                              // Fait du témoin, et non défaut de traduction : la mention garde la
                              // forme commune (STYLE_MENTION) et n'en change que la teinte, l'ocre des
                              // lacunes. Même mot que la page Bible, sans crochets.
                              <span title={MENTION_LACUNE_TITRE} style={STYLE_MENTION_LACUNE}>{MENTION_LACUNE}</span>
                            ) : cs.map((c, k) => (
                              // Colonne TR0009 : le texte porte des marqueurs éditoriaux inline
                              // (`[lecture incertaine : …]`, `[lacune : …]`, `[ajout marginal : …]`).
                              // Bruts, ils s'affichaient tels quels (« [lacune : déchirure] »).
                              // On les rend par le MÊME tokeniseur que la page Bible : lacune → un
                              // discret « [Lacune] », lecture incertaine en gris, motif masqué.
                              <span key={k}>{k > 0 ? " " : ""}{est899(t.trad_id) ? rendreMarqueurs899(c.texte ?? "") : texteCesure(c.texte, t.lang)}</span>
                            ))}
                          </div>
                        );
                      })}
                      {/* Colonne Notes : note personnelle du verset (enregistrée sur le compte). */}
                      <div style={{ borderLeft: `1px solid ${FILET_COL}`, padding: notesReduites ? 0 : "3px 5px", display: "flex" }} onClick={e => e.stopPropagation()}>
                        {notesReduites ? null : userId ? (
                          <CelluleNote valeur={notes.get(r.id) ?? ""} refLisible={refLisible} onChange={t => majNote(r.id, t)} />
                        ) : (
                          <span style={{ ...STYLE_INVITE, alignSelf: "center", margin: "0 auto" }}>Connectez-vous pour noter</span>
                        )}
                      </div>
                    </div>
                    {apres.map((sr, i) => ligneSurnum(sr, `sa-${r.id}-${i}`))}
                  </Fragment>
                );
              })}
            </section>
          );
        })}
            </div>
            <MarqueAttente enAttente={enChargement} />
            </div>

          </>
        )}
      </div>
        </div>
      </div>

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
