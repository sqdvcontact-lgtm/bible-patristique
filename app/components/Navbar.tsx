"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAffichageAdmin } from "@/app/lib/contexteAffichageAdmin";
import { useCompte } from "@/app/lib/contexteCompte";
import { LIVRES } from "@/app/lib/bible";
import { lirePositionBible } from "@/app/lib/repriseLecture";
import { HAUTEUR_NAVBAR } from "@/app/lib/mesures";
import { lireOeuvresRecentes, type OeuvreRecente } from "@/app/lib/oeuvresRecentes";
import EmblemeNavigation from "@/app/components/EmblemesNavigation";
import { ligneEdition, type EditionOeuvre } from "@/app/lib/editionOeuvre";
import { chargerEditeurs, indexEditeursNavigateur } from "@/app/lib/editeurs";
import type { IndexEditeurs } from "@/app/lib/editeursNormalisation";
import { chercherPericopes, referencePericope, correspondanceVisible, libelleCategoriePericope, type PericopeSearchResult } from "@/app/lib/pericopes";
import { STYLE_TERME_TAPE } from "@/app/lib/surlignageRecherche";
import { referenceBiblique } from "@/app/lib/rechercheRequete";
import { FAMILLES_ADMIN, entreesDeFamille } from "@/app/lib/adminNavigation";
import PortraitLecteur from "@/app/components/PortraitLecteur";

const ModaleMessagerie = dynamic(() => import("@/app/components/ModaleMessagerie"), { ssr: false });
const VoletNotifications = dynamic(() => import("@/app/components/VoletNotifications"), { ssr: false });

function planifierTacheSecondaire(tache: () => void, delai: number) {
  let idleId: number | null = null;
  const timeoutId = window.setTimeout(() => {
    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(tache, { timeout: 2000 });
    } else {
      tache();
    }
  }, delai);
  return () => {
    window.clearTimeout(timeoutId);
    if (idleId !== null && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId);
  };
}

// Bible et Polyglotte sont deux entrées dans le même texte : l'une le donne à lire,
// l'autre à comparer. Elles vont donc ensemble, accolées en un seul bloc, plutôt
// que dispersées de part et d'autre de la barre — et la Polyglotte cesse d'être un
// lien discret, puisqu'elle pèse autant que la lecture suivie.
// La lecture suivie s'ouvre sur Genèse 1 : un chapitre, non une page vide. Une seule
// écriture de cette adresse, reprise par l'onglet des bibles comme par le panneau mobile.
/** Là où « Bible classique » mène quand on n'a encore rien lu : au commencement. */
const HREF_BIBLE_CLASSIQUE = "/?livre=GEN&chapitre=1";

/**
 * ⚠️ « BIBLE CLASSIQUE » ROUVRE OÙ L'ON EN ÉTAIT (demande de l'auteur, 2026-09-04 :
 * « ouvrir Bible classique soit sur la Genèse soit sur le dernier livre ouvert par
 * l'utilisateur »). C'est la règle que la Polyglotte suit depuis le matin même, et la
 * place est celle que `BibleLayout` retient à chaque chapitre lu.
 *
 * ⛔ Elle se lit dans un EFFET, jamais au rendu : `localStorage` n'existe pas au rendu
 * serveur, et une adresse qui différerait entre les deux ferait diverger l'hydratation.
 * Le lien part donc de la Genèse et se rectifie au montage, ce qui ne se voit pas — on
 * ne clique pas dans les vingt millisecondes qui suivent la peinture.
 *
 * ⛔ L'adresse ne porte PAS la bible : elle se décide sur le SERVEUR, par le cookie puis
 * le profil (voir `preferenceBible`). Un `?trad=` ici la figerait dans le lien.
 */
function useHrefBibleClassique(): string {
  const [href, setHref] = useState(HREF_BIBLE_CLASSIQUE);
  useEffect(() => {
    const place = lirePositionBible();
    if (!place) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHref(`/?livre=${encodeURIComponent(place.livre)}&chapitre=${place.chapitre}`);
  }, []);
  return href;
}
const LIENS_LECTURE: { href: string; label: string; exact?: boolean }[] = [
  { href: HREF_BIBLE_CLASSIQUE, label: "Bible", exact: true },
  { href: "/polyglotte", label: "Polyglotte" },
];
// `discret` : encre plus pâle ET graisse ordinaire. Deux onglets le portent, et
//   la barre n'a donc que deux rangs : les entrées de LECTURE, qui ouvrent le corpus
//   (les bibles, Patristique), et celles qui l'accompagnent (Communauté, Aller plus
//   loin).
// ⚠️ Un état INTERMÉDIAIRE a existé une journée — l'encre des primaires et la graisse
//   ordinaire — pour retirer à « Communauté » son demi-gras sans la pâlir. Il ne se
//   voyait pas : à graisse égale, c'est l'encre qui fait le poids, et blanc à 85 %
//   contre 60 % se lit comme une graisse de plus. Un rang qui ne se distingue que par
//   une valeur que personne ne mesure n'est pas un rang.
const LIENS_PRIMAIRES: { href: string; label: string; exact?: boolean; discret?: boolean }[] = [
  { href: "/bibliotheque", label: "Patristique" },
  { href: "/essais", label: "Communauté", discret: true },
  // ⚠️ L'onglet ouvre sur « Acheter des livres », et non sur « Les traductions »
  // (demande de l'auteur, 2026-09-04). Le menu du survol n'a pas changé d'ordre : c'est
  // le CLIC sur le libellé qui mène ailleurs, vers la page la plus utile à qui n'a rien
  // demandé de précis.
  { href: "/librairies", label: "Aller plus loin", discret: true },
];
// Pages regroupées sous « Aller plus loin » : anciennement des onglets d'une même page,
// désormais des pages indépendantes. Le menu déroulant (au survol) les recense.
// ⚠️ Chaque entrée porte ce que sa page CONTIENT, en une ligne. Un nom de page ne
// dit pas toujours ce qu'on y trouve — « Statistiques » et « Péricopes » surtout —
// et le menu était une liste de cinq mots sans un indice. Les phrases sont tirées
// de la description de chaque page : ⛔ on ne promet ici que ce qu'elle porte.
const LIENS_ALLER_PLUS_LOIN: { href: string; label: string; dit: string }[] = [
  { href: "/traductions", label: "Les traductions", dit: "Chaque bible servie ici, sa notice et l’édition dont elle vient." },
  // L'outil bibliographique (2026-09-06) : entre ce qu'on LIT ici et où l'on ACHÈTE,
  // ce sur quoi les notices s'appuient, à chercher et à citer.
  { href: "/bibliographie", label: "Bibliographie", dit: "Les ouvrages qui fondent les notices : commentaires, éditions, études, à citer." },
  { href: "/librairies", label: "Acheter des livres", dit: "Où trouver les éditions imprimées, neuves ou anciennes." },
  { href: "/statistiques", label: "Statistiques", dit: "Les versets les plus cités par les Pères, et les plus lus ici." },
  { href: "/pericopes", label: "Péricopes", dit: "Les passages nommés de l’Écriture, et ce que les Pères en disent." },
  { href: "/histoire", label: "Histoire de l’Église", dit: "La frise des Pères, de leurs œuvres et des grands événements." },
];
// ⛔ Les entrées d'administration NE SONT PLUS ÉCRITES ICI. Elles vivent dans
// `app/lib/adminNavigation.ts`, avec celles de la barre d'onglets de /admin : le menu
// et la barre disaient deux listes différentes, et l'on ne trouvait plus dans l'une ce
// que l'autre nommait. Une seule table, un seul ordre (voir le préambule du module).

// ── Les FAMILLES DE CORPUS, dans la liste déroulante de la barre ─────────────
//
// ⛔ Elles sont celles de la page de résultats, et ce sont les MÊMES jetons
// (`app/globals.css`, § familles de corpus). La barre avait sa propre table :
// la Bible y était BLEUE quand elle est verte sur la page de résultats, les
// Pères VERTS quand ils y sont pourpres, et les publications portaient l'ocre
// de lacune. Deux codes de couleur contradictoires à quarante pixels l'un de
// l'autre, sur le même mot cherché : ce que la liste apprenait au lecteur, la
// page le démentait aussitôt.
//
// ⚠️ La CHRONOLOGIE rejoint les Pères, dont elle raconte le monde. Elle portait
// un violet à elle, ce qui faisait un quatrième domaine vivant dans cette seule
// liste. La rubrique nomme déjà le genre de ce qu'on trouve ; la couleur, elle,
// dit le domaine — et trois sections peuvent partager un domaine, comme Bible et
// Polyglotte partagent le vert sur la page de résultats.
//
// Chaque famille tient en deux valeurs : l'ENCRE et l'APLAT de la rubrique. Le
// fond lavé du groupe, son filet et le survol s'en DÉRIVENT par `color-mix`,
// depuis `--fam` (voir `styleDomaine`) : ils suivent donc les deux thèmes sans
// être nommés.
const DOMAINE = {
  bible:        { encre: "var(--cs-ecriture)",   aplat: "var(--cs-ecriture-aplat)" },
  patristique:  { encre: "var(--cs-peres)",      aplat: "var(--cs-peres-aplat)" },
  publications: { encre: "var(--cs-communaute)", aplat: "var(--cs-communaute-aplat)" },
} as const;

/** Pose une famille sur un groupe de la liste ; tout son CSS en dérive. */
function styleDomaine(d: keyof typeof DOMAINE): React.CSSProperties {
  return { "--fam": DOMAINE[d].encre, "--fam-aplat": DOMAINE[d].aplat } as React.CSSProperties;
}

// ── Données statiques pour la recherche rapide ───────────────────────────────
const LIVRES_RECHERCHE = LIVRES.map(({ code, nom }) => ({ code, nom }));
const TRADUCTIONS_RECHERCHE: { code: string; nom: string }[] = [
  { code: 'TR0001', nom: 'Bible de Sacy' }, { code: 'TR0002', nom: 'Bible Segond' },
  { code: 'TR0003', nom: 'Bible Crampon' }, { code: 'TR0004', nom: 'Vulgate' },
];
function sansAccents(s: string): string { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() }

// ── LE MENU NE PARAÎT QUE SI LA MAIN SE POSE ─────────────────────────────────
//
// La barre porte quatre menus au survol — les bibles, Patristique, Aller plus
// loin, Administration. Ils étaient gouvernés par DEUX mécaniques étrangères
// l'une à l'autre : trois par une règle :hover de la feuille de styles, le
// quatrième par un état React. Ils n'avaient donc ni la même boîte, ni le même
// délai, ni la même façon de se refermer, et le lecteur ne pouvait rien
// apprendre de l'un qui lui servît pour l'autre. Ils passent tous par
// OngletMenu, ci-dessous.
//
// ⛔ Deux gestes se ressemblent et n'ont rien de commun : on POSE son curseur sur
// un onglet pour en voir le menu, ou on le PASSE dessus en allant ailleurs. Les
// distinguer PAR LA DURÉE mène à une impasse, et nous l'avons parcourue en
// entier : attendre avant de montrer fait payer à la main sûre l'hésitation de
// l'autre ; montrer aussitôt et retirer ensuite fait clignoter la barre à chaque
// traversée — « inutile et peu élégant », et c'est exact.
//
// ⚠️ Ce n'est pas dans la DURÉE que se lit l'intention, c'est dans la VITESSE.
// Une main qui file ne demande rien ; une main qui se pose demande à voir. Et la
// vitesse, elle, se connaît DÈS L'ENTRÉE, sans rien faire attendre — d'où une
// règle qui n'a plus de délai du tout :
//
//   • le curseur entre en filant → rien ne paraît, et l'on guette ;
//   • il se calme sur l'onglet → le menu paraît à l'instant même ;
//   • il quitte l'ensemble {onglet + menu} → le menu tombe, sans sursis.
//
// Il n'y a donc plus de menu « ouvert par accident » à refermer : il ne s'ouvre
// pas. Et rien n'attend celui qui vient le chercher — la main s'immobilise, le
// menu est déjà là.

// Seuil de POSE, en pixels par milliseconde (0,35 px/ms = 350 px/s environ).
// ⛔ Ce n'est pas un réglage de confort mais une frontière de geste : un balayage
// de barre court entre 800 et 3 000 px/s, tandis qu'une main qui vise un onglet
// franchit ce seuil quelques centièmes de seconde avant de s'arrêter — le menu
// paraît donc au moment où elle se pose, et non après.
const VITESSE_POSE_PX_MS = 0.35;
// Filet de sécurité, et rien d'autre : une souris qui arrive vite et s'ARRÊTE NET
// n'émet plus aucun mouvement, si bien que le ralentissement ne peut plus se
// lire. Au bout de ce silence, curseur toujours sur l'onglet, on conclut au
// repos. ⚠️ Chaque mouvement le réarme : une traversée continue, si longue que
// soit la cellule, ne le laisse jamais échoir.
const DELAI_REPOS_MS = 90;

// ── LE POULS DU CURSEUR ──────────────────────────────────────────────────────
// Un seul écouteur pour toute la barre. Un onglet a besoin de savoir, à l'instant
// où le curseur entre sur lui, s'il file ou s'il se pose — et cela ne se lit pas
// dans l'entrée, qui n'est qu'un point, mais dans le mouvement qui la PRÉCÈDE.
//
// ⚠️ L'écouteur range la VITESSE, non le dernier point. Il est en capture sur la
// fenêtre, donc il tourne avant les gestionnaires de React : un point rafraîchi
// juste avant d'être lu donnerait toujours une distance nulle.
let vitesseCurseur = 0;
let dernierPoint: { x: number; y: number; t: number } | null = null;
let ongletsAbonnes = 0;

function noterLeMouvement(e: PointerEvent) {
  const t = performance.now();
  if (dernierPoint) {
    const dt = t - dernierPoint.t;
    if (dt > 0) vitesseCurseur = Math.hypot(e.clientX - dernierPoint.x, e.clientY - dernierPoint.y) / dt;
  }
  dernierPoint = { x: e.clientX, y: e.clientY, t };
}

/** Abonne un onglet au pouls ; le dernier parti éteint l'écouteur. */
function suivreLeCurseur() {
  if (ongletsAbonnes++ === 0) {
    window.addEventListener("pointermove", noterLeMouvement, { passive: true, capture: true });
  }
  return () => {
    if (--ongletsAbonnes === 0) {
      window.removeEventListener("pointermove", noterLeMouvement, { capture: true });
      dernierPoint = null;
      vitesseCurseur = 0;
    }
  };
}

/**
 * Ouvre dès que la main se pose sur l'onglet, ferme dès qu'elle quitte l'ensemble
 * {onglet + menu}. Rend l'état et DEUX jeux de gestionnaires, qui ne surveillent
 * pas la même chose :
 *
 *   `onglet` — l'entrée et les mouvements, où se juge la POSE.
 *   `groupe` — la sortie de l'ensemble {onglet + menu}, qui ferme.
 *
 * ⛔ Tant que le menu est caché, la boîte du groupe est celle de l'onglet : sortir
 * de l'un, c'est sortir de l'autre, et le guet en cours s'arrête avec lui. C'est
 * ce qui garantit qu'une traversée ne laisse rien derrière elle.
 *
 * `auSurvol` est appelé dès l'entrée du curseur, avant même que le menu paraisse :
 * c'est là que « Patristique » relit ses dernières œuvres.
 */
function useMenuSurvol(auSurvol?: () => void) {
  const [ouvert, setOuvert] = useState(false);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arreter = () => {
    if (minuterie.current) { clearTimeout(minuterie.current); minuterie.current = null; }
  };
  useEffect(suivreLeCurseur, []);
  useEffect(() => arreter, []);
  const ouvrir = () => { arreter(); setOuvert(true); };
  const fermer = () => { arreter(); setOuvert(false); };
  // La main file encore : on ne montre rien, et l'on guette son immobilité.
  const guetterLeRepos = () => {
    arreter();
    minuterie.current = setTimeout(() => setOuvert(true), DELAI_REPOS_MS);
  };
  // Le même jugement à l'entrée et à chaque mouvement : la main est-elle posée ?
  const jugerLaMain = () => {
    if (vitesseCurseur <= VITESSE_POSE_PX_MS) ouvrir(); else guetterLeRepos();
  };
  // ⚠️ À la SOURIS seulement. Au doigt il n'y a pas de survol : l'onglet est un
  // lien qu'on suit, et un menu ouvert par le `pointerenter` que le navigateur
  // émet après la frappe viendrait couvrir la page qu'on vient d'appeler.
  const surLOnglet = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    auSurvol?.();
    if (ouvert) return;
    jugerLaMain();
  };
  const mouvementSurLOnglet = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || ouvert) return;
    jugerLaMain();
  };
  const horsDuGroupe = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    fermer();
  };
  return {
    ouvert,
    // Un clic dans le groupe emmène ailleurs : le menu n'a plus lieu d'être, et
    // la barre survit à la navigation (elle n'est pas remontée d'une page à
    // l'autre).
    groupe: { onPointerLeave: horsDuGroupe, onClick: fermer },
    onglet: { onPointerEnter: surLOnglet, onPointerMove: mouvementSurLOnglet },
  };
}
/**
 * Un onglet de la barre qui porte un menu déroulant : UNE boîte, UN chevron, UN
 * délai. Le libellé reste un LIEN — au doigt, où il n'y a pas de survol, il mène
 * à la page principale de la rubrique.
 *
 * Le menu demeure dans le document et ne fait que se cacher (`display: none`,
 * cf. la feuille de styles) : c'est ce qui permet au clavier de l'ouvrir par
 * `:focus-visible`, sans que la souris ait rien à faire.
 *
 * ⛔ Les gestionnaires du GROUPE et ceux de l'ONGLET ne sont pas
 * interchangeables : le groupe englobe le menu, l'onglet non. Le premier ferme,
 * le second guette la main qui se pose (voir useMenuSurvol).
 */
function OngletMenu({ href, label, style, actif, classeMenu, auSurvol, children }: {
  href: string;
  label: string;
  style: React.CSSProperties;
  actif?: boolean;
  classeMenu?: string;
  auSurvol?: () => void;
  children?: React.ReactNode;
}) {
  const { ouvert, groupe, onglet } = useMenuSurvol(auSurvol);
  return (
    <span className={ouvert ? "cs-plus cs-plus--ouvert" : "cs-plus"} {...groupe}>
      <Link href={href} className="cs-nav-onglet" aria-current={actif ? "page" : undefined} {...onglet}
        style={{ ...style, display: "inline-flex", alignItems: "center", gap: "3px" }}>
        {label}
        {/* Le chevron dit qu'il y a un menu là-dessous. Les quatre onglets le
            portent — un seul qui s'en passerait ferait douter des trois autres. */}
        <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true"
          style={{ opacity: 0.55, flexShrink: 0 }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      {children ? (
        <div className={classeMenu ? `cs-plus-menu cs-defilement-discret ${classeMenu}` : "cs-plus-menu cs-defilement-discret"}>
          {children}
        </div>
      ) : null}
    </span>
  );
}

// Onglet « Patristique » : au survol, le menu présente les dernières œuvres
// consultées (suivi local, cf. oeuvresRecentes).
//
// ⚠️ La liste est relue À CHAQUE SURVOL, et jamais au montage : elle vit dans le
// stockage local, que le rendu serveur ne connaît pas, et la lire dans un effet
// ferait re-rendre la barre à chaque page ouverte pour trois lignes que personne
// ne regarde encore. Le chevron, lui, est posé d'emblée comme sur les trois
// autres onglets — d'où le mot qui tient la place quand rien n'a été consulté :
// un chevron qui n'ouvrirait rien serait une promesse en l'air.
function OngletPatristique({ href, label, style, actif }: { href: string; label: string; style: React.CSSProperties; actif?: boolean }) {
  const [recentes, setRecentes] = useState<OeuvreRecente[]>([]);
  return (
    <OngletMenu href={href} label={label} style={style} actif={actif}
      classeMenu="cs-plus-menu--riche cs-plus-menu--oeuvres"
      auSurvol={() => setRecentes(lireOeuvresRecentes())}>
      {/* ⛔ LA PORTE DE LA RUBRIQUE, EN TÊTE DE SON PROPRE MENU. Le libellé de
          l'onglet y mène déjà, mais rien ne le dit : un menu qui s'ouvre au survol
          capture l'œil, et l'on cherche dedans ce qu'on est venu chercher. Les trois
          autres menus nomment tous leurs pages ; celui-ci ne montrait qu'un journal
          de lecture, et la bibliothèque n'y figurait nulle part.
          ⚠️ Elle prend « href », celui de l'onglet, jamais une adresse recopiée :
          les deux ne peuvent pas diverger. */}
      <Link href={href} className="cs-plus-riche">
        <span className="cs-plus-riche-texte">
          <span className="cs-plus-riche-nom cs-plus-riche-nom--fort">Les Pères de l’Église</span>
          <span className="cs-plus-riche-dit">La bibliothèque, auteur par auteur.</span>
        </span>
      </Link>
      <div className="cs-plus-sep" />
      <p className="cs-plus-titre">Dernières œuvres consultées</p>
      {recentes.length > 0 ? recentes.map(o => (
        <Link key={o.id} href={`/oeuvre/${o.id}`} className="cs-plus-riche">
          <span className="cs-plus-riche-texte">
            <span className="cs-plus-riche-nom cs-plus-riche-nom--oeuvre">{o.titre}</span>
            {o.auteur && <span className="cs-plus-riche-dit">{o.auteur}</span>}
          </span>
        </Link>
      )) : (
        <p className="cs-plus-vide">Aucune encore : les œuvres ouvertes viendront se ranger ici.</p>
      )}
    </OngletMenu>
  );
}

// « Aller plus loin » : les pages qui prolongent la lecture. Le clic sur le
// libellé mène aux Traductions (utile au tactile, sans survol).
function OngletAllerPlusLoin({ label, style, actif }: { label: string; style: React.CSSProperties; actif?: boolean }) {
  return (
    // Le menu DIT ce que chaque page contient, et le montre d'un emblème.
    // « Statistiques » et « Péricopes » surtout ne s'expliquent pas d'eux-mêmes :
    // une liste de cinq mots laissait le lecteur ouvrir au hasard.
    <OngletMenu href="/librairies" label={label} style={style} actif={actif}
      classeMenu="cs-plus-menu--riche cs-plus-menu--pages">
      {LIENS_ALLER_PLUS_LOIN.map(l => (
        <Link key={l.href} href={l.href} className="cs-plus-riche">
          <span className="cs-plus-riche-emb" aria-hidden="true">
            <EmblemeNavigation href={l.href} />
          </span>
          <span className="cs-plus-riche-texte">
            <span className="cs-plus-riche-nom">{l.label}</span>
            <span className="cs-plus-riche-dit">{l.dit}</span>
          </span>
        </Link>
      ))}
    </OngletMenu>
  );
}

// « Administration » : onglet réservé aux admins. Le menu recense, famille par famille,
// TOUTE l'administration — les sections de /admin comme les pages qui vivent à part —
// dans l'ordre exact de la barre d'onglets de /admin, puisque les deux se lisent dans la
// même table (`app/lib/adminNavigation.ts`). Le clic sur le libellé ouvre /admin.
function OngletAdministration({ label, style, actif }: { label: string; style: React.CSSProperties; actif?: boolean }) {
  return (
    <OngletMenu href="/admin" label={label} style={style} actif={actif}>
      {FAMILLES_ADMIN.map((fam, i) => {
        const liens = entreesDeFamille(fam.cle);
        return (
          <div key={fam.cle}>
            {i > 0 && <div className="cs-plus-sep" />}
            <div className="cs-plus-titre cs-admin-fam" style={{ color: fam.couleur }}>{fam.label}</div>
            {liens.map(l => (
              <Link key={l.href} href={l.href} className={`cs-plus-lien cs-admin-lien${l.principal ? " cs-plus-lien--fort" : ""}`} style={{ borderLeft: `2px solid ${fam.couleur}` }}>{l.label}</Link>
            ))}
          </div>
        );
      })}
    </OngletMenu>
  );
}

// ── Onglet des bibles : quatre états, un par palier de place ─────────────────
// La lecture suivie et la Polyglotte sont deux entrées dans le même texte : l'une le
// donne à lire, l'autre à comparer. Elles tiennent donc ensemble, et se resserrent en
// QUATRE temps à mesure que la barre manque de place (voir CRAN_MAX) :
//
//   « deux »  — chacune son onglet, en toutes lettres : rien à survoler pour les voir
//   « fendu » — « Les Saintes Écritures », qui se fend SUR PLACE au survol
//   « long »  — « La Bible », et le choix dans un menu déroulant
//   « court » — « Bible », et le même menu
//
// ⛔ La fente SUR PLACE ne vaut QUE pour « fendu », et c'est ce qui commande le passage
// au menu. Les deux faces occupent la même cellule de grille (cf. la feuille de styles,
// § .cs-bible) : le bloc prend donc la largeur de la PLUS LARGE des deux. Tant que
// l'intitulé dit « Les Saintes Écritures », c'est lui qui mesure l'onglet et le repli
// gagne quelque chose ; sous « La Bible », deux fois plus courte que
// « Classique | Polyglotte », ce sont les segments qui mesurent l'onglet et raccourcir
// l'intitulé ne rend plus un pixel. Le menu déroulant, lui, sort du flux : l'onglet ne
// pèse plus alors que son propre mot.
type EtatBible = 'deux' | 'fendu' | 'long' | 'court';

function OngletBibles({ etat, pathname, styleLien }: {
  etat: EtatBible;
  pathname: string;
  styleLien: (href: string, exact: boolean | undefined, primaire: boolean) => React.CSSProperties;
}) {
  const surClassique = pathname === "/";
  const surPolyglotte = pathname.startsWith("/polyglotte");
  const hrefBible = useHrefBibleClassique();

  // Très large : les deux bibles s'annoncent chacune par son nom entier. C'est l'état le
  // plus clair du site — on lit ce qu'il offre sans avoir à survoler quoi que ce soit.
  if (etat === 'deux') {
    return (
      <>
        <Link href={hrefBible} className="cs-nav-onglet" aria-current={surClassique ? "page" : undefined}
          style={styleLien("/", true, true)}>Bible classique</Link>
        <Link href="/polyglotte" className="cs-nav-onglet" aria-current={surPolyglotte ? "page" : undefined}
          style={styleLien("/polyglotte", undefined, true)}>Bible polyglotte</Link>
      </>
    );
  }

  // Large : un seul onglet, qui se fend au survol sans que la barre bouge d'un pixel.
  if (etat === 'fendu') {
    return (
      <div className="cs-bible">
        <Link href={hrefBible} className="cs-bible-face">Les Saintes Écritures</Link>
        <div className="cs-bible-split">
          <Link href={hrefBible} aria-current={surClassique ? "page" : undefined} className={`cs-bible-seg${surClassique ? " cs-bible-seg--actif" : ""}`}>Classique</Link>
          <Link href="/polyglotte" aria-current={surPolyglotte ? "page" : undefined} className={`cs-bible-seg${surPolyglotte ? " cs-bible-seg--actif" : ""}`}>Polyglotte</Link>
        </div>
      </div>
    );
  }

  // Moyen et petit : l'intitulé seul, et le choix dans un menu déroulant. Le clic sur
  // l'intitulé mène à la lecture classique, utile au tactile où il n'y a pas de survol.
  // L'onglet se marque actif sur l'une comme sur l'autre : à ces paliers il les porte
  // toutes deux, et rien d'autre ne dirait au lecteur qu'il est dans une bible.
  const styleFace = surPolyglotte ? styleLien("/polyglotte", undefined, true) : styleLien("/", true, true);
  return (
    // Deux entrées seulement : le menu se borne à sa mesure, au lieu des 13rem
    // qu'appellent « Aller plus loin » et « Administration ».
    <OngletMenu href={hrefBible} label={etat === 'long' ? "La Bible" : "Bible"}
      style={styleFace} actif={surClassique} classeMenu="cs-plus-menu--bibles">
      <Link href={hrefBible} className="cs-plus-lien" aria-current={surClassique ? "page" : undefined}>Bible classique</Link>
      <Link href="/polyglotte" className="cs-plus-lien" aria-current={surPolyglotte ? "page" : undefined}>Bible polyglotte</Link>
    </OngletMenu>
  );
}

function normaliserExtrait(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// ⛔ LE SURLIGNAGE DU TERME TAPÉ NE PORTE AUCUNE COULEUR.
//
// Il portait une pastille VERTE — encre `--cs-vert` sur un fond translucide de la
// même teinte. Tant que la liste était bleue, verte et ocre, elle passait ; depuis
// que les sections prennent les trois familles de corpus, elle est une QUATRIÈME
// couleur, et la seule qui se répète à CHAQUE rang. La liste en devenait bariolée,
// et le vert disait « Bible » au milieu d'un groupe pourpre.
//
// ⚠️ La PAGE DES RÉSULTATS a rejoint cette forme le 2026-09-04 : elle portait un
// fond jaune (`--cs-vise-fond`), que l'auteur a refusé — « ne pas surligner en jaune
// les termes trouvés ; le gras suffit ». Le raisonnement écrit ici distinguait les
// deux surfaces : sur la page, on cherche un mot des yeux dans un paragraphe de
// prose, et le jaune passait pour le repère qu'on y poursuit. Il était le même mot
// mis cinq fois en pastille dans la même ligne, et le texte cessait de se lire
// comme un texte.
//
// ⛔ UNE SEULE DÉFINITION POUR LES TROIS SURLIGNEURS DU SITE, dans
// `app/lib/surlignageRecherche.ts` : les deux d'ici, qui portaient la même déclaration
// recopiée, et celui de la page des résultats, qui en disait une autre. Une forme
// recopiée à trois endroits ne reste identique que par accident.

function surlignerMatch(texte: string, query: string): React.ReactNode {
  if (!query) return texte
  const tN = normaliserExtrait(texte)
  const qN = normaliserExtrait(query)
  const idx = tN.indexOf(qN)
  if (idx < 0) return texte
  return (
    <>
      {texte.slice(0, idx)}
      <strong style={STYLE_TERME_TAPE}>{texte.slice(idx, idx + query.length)}</strong>
      {texte.slice(idx + query.length)}
    </>
  )
}

function extraireEtSurligner(texte: string, q: string, longueur = 110): React.ReactNode {
  const texteN = normaliserExtrait(texte)
  const qN = normaliserExtrait(q)
  const idx = texteN.indexOf(qN)
  const debut = idx < 0 ? 0 : Math.max(0, idx - 40)
  const fin = idx < 0 ? Math.min(texte.length, longueur) : Math.min(texte.length, idx + q.length + 70)
  const prefix = debut > 0
  const suffix = fin < texte.length
  const extrait = texte.slice(debut, fin)
  const extractN = normaliserExtrait(extrait)
  const mIdx = extractN.indexOf(qN)
  if (mIdx < 0) return <>{prefix ? '\u2026' : ''}{extrait}{suffix ? '\u2026' : ''}</>
  return (
    <>
      {prefix ? '\u2026' : ''}{extrait.slice(0, mIdx)}<strong style={STYLE_TERME_TAPE}>{extrait.slice(mIdx, mIdx + q.length)}</strong>{extrait.slice(mIdx + q.length)}{suffix ? '\u2026' : ''}
    </>
  )
}


function IconCoeur() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 11S1 7.5 1 4a2.5 2.5 0 0 1 5-.8A2.5 2.5 0 0 1 11 4c0 3.5-5 7-5 7z" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinejoin="round"/>
    </svg>
  );
}

function IconParchemin() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: '19px',
        height: '25px',
        background: 'currentColor',
        WebkitMask: 'url("/icons/parchemin-message-silhouette.png") center / contain no-repeat',
        mask: 'url("/icons/parchemin-message-silhouette.png") center / contain no-repeat',
      }}
    />
  )
}

function IconAngeTrompette() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: '28px',
        height: '27px',
        background: 'currentColor',
        WebkitMask: 'url("/icons/ange-trompette-silhouette.png") center / contain no-repeat',
        mask: 'url("/icons/ange-trompette-silhouette.png") center / contain no-repeat',
      }}
    />
  )
}

// Durée d'affichage d'une notification surgissante. La jauge de la vignette est
// réglée sur cette même valeur : une seule constante, sinon la barre ment.
const DUREE_TOAST_MS = 3000;

// ── Barre à l'étroit : une MESURE, jamais un seuil en pixels ─────────────────
// Quand la barre déborde, ce sont les OUTILS qui cèdent d'abord — jamais les mots des
// sections : sur un site d'érudition, les intitulés font partie du ton. Et ils cèdent
// UN À UN (voir CRAN_MAX plus bas) : une barre qui perdrait cinq choses d'un coup au
// premier pixel de trop laisserait un grand vide entre l'écran large et l'écran moyen,
// où presque tout le monde lit.
//
// ⚠️ Pourquoi pas un seuil en pixels : la police racine GRANDIT avec la fenêtre
// au-delà de 1440px (jusqu'à ×1,375, cf. AGENTS.md § Responsive). Le contenu de la
// barre s'élargit donc en même temps que l'écran, et aucune largeur fixe ne peut
// dire si elle tient. La barre le constate elle-même, en comparant la largeur de son
// contenu à la place disponible.
//
// Marge de garde entre les deux bascules : sans elle, la barre oscillerait autour de
// la largeur exacte de bascule à chaque pixel de redimensionnement.
const MARGE_BASCULE_PX = 32;

// Crans de repli, du moins coûteux au plus coûteux. La barre ne se replie pas d'un
// bloc : elle abandonne un cran à la fois, et n'en abandonne un second que si le
// premier n'a pas suffi.
//
// Deux pièces se resserrent PAR PALIERS au lieu de céder d'un coup, parce qu'elles sont
// les plus larges de la barre et que les faire disparaître d'un bloc laisserait un grand
// vide entre l'écran très large et l'écran moyen : l'onglet des bibles (voir
// OngletBibles) et le champ de recherche (voir largeurRecherche). Les autres sections
// gardent leurs mots à toute largeur — sur un site d'érudition, les intitulés font
// partie du ton.
//
//   0 — « Bible classique » et « Bible polyglotte », chacune son onglet ; champ large
//   1 — les deux bibles se rangent sous « Les Saintes Écritures », qui se fend au
//       survol ; le champ se resserre ; « Soutenir le projet » se réduit à son cœur et
//       le mot « Admin » s'efface
//   2 — « La Bible », le choix passant dans un menu déroulant ; le champ se resserre
//       encore ; le pseudonyme s'efface
//   3 — « Bible » ; la recherche se replie en loupe et se déploie sous la barre
//   4 — le nom du site se réduit à son monogramme
//
// ⛔ « Aller plus loin » ne quitte JAMAIS la barre. Il descendait autrefois dans le
// menu de compte, où une rubrique de lecture n'a rien à faire : personne ne va chercher
// les traductions ou l'histoire de l'Église sous son propre nom d'utilisateur, et une
// entrée qui change de place selon la largeur de la fenêtre ne s'apprend jamais. La
// place qu'il fallait se prend désormais sur les outils, qui sont faits pour céder.
const CRAN_MAX = 4;

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const hrefBibleMobile = useHrefBibleClassique();
  // Session et profil viennent du contexte partagé, jamais d'une requête à soi : la
  // barre tenait son propre abonnement et sa propre lecture de `profils`, qui partait
  // en double (`getSession` puis l'événement de session initiale). Voir contexteCompte.
  const { userId, email: emailCompte, pseudo, estAdmin, portrait, cadragePortrait, theme, changerTheme } = useCompte();
  const user = useMemo(
    () => (userId ? { id: userId, email: emailCompte ?? '' } : null),
    [userId, emailCompte],
  );
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [mobileOuvert, setMobileOuvert] = useState(false);
  // Clair au rendu SERVEUR et au premier rendu client, comme `useEstMobile` : le thème
  // réel est déjà posé sur <html> par le script du gabarit, on ne lit ici que de quoi
  // dessiner l'interrupteur. Partir de la valeur mémorisée ferait diverger les deux
  // rendus et React reprocherait l'hydratation.
  const themeSombre = theme === 'sombre';
  // Les seize sections d'administration allongeaient le panneau mobile de trois écrans,
  // au-dessus de la recherche et du compte : elles se déplient maintenant à la demande.
  const [adminMobileOuvert, setAdminMobileOuvert] = useState(false);
  const [nbNotifications, setNbNotifications] = useState(0);
  const [notifsOuvertes, setNotifsOuvertes] = useState(false);
  const [nbMessages, setNbMessages] = useState(0);
  const [messagerieOuverte, setMessagerieOuverte] = useState(false);
  const [nbActionsAdmin, setNbActionsAdmin] = useState(0);
  const [nbVerifAdmin, setNbVerifAdmin] = useState(0);
  // `id` distingue deux notifications de suite : il sert de `key` à la vignette, ce qui
  // relance l'animation de la jauge au lieu de la laisser courir depuis la précédente.
  const [toastNotification, setToastNotification] = useState<{ id: number; titre: string; message: string } | null>(null);
  // `0` au rendu serveur et au premier rendu client : la barre paraît d'abord
  // complète, se mesure, puis se replie cran par cran — pas de désaccord d'hydratation.
  const [cran, setCran] = useState(0);
  const navRef = useRef<HTMLElement | null>(null);
  const cranRef = useRef(0);
  // `largeurRetourRef[n]` : largeur de fenêtre à partir de laquelle le cran n peut être
  // abandonné. Déduite du débordement CONSTATÉ au moment où l'on a pris ce cran — une
  // fois repliée la barre ne déborde plus, et sans ce repère on n'aurait aucun moyen de
  // savoir quand la déplier. Un repère PAR CRAN : la remontée est aussi graduée que la
  // descente, et chaque cran retrouve exactement la largeur où il avait cédé.
  const largeurRetourRef = useRef<number[]>([]);
  const [rechercheDeployee, setRechercheDeployee] = useState(false);
  // Ce que chaque cran retire. On nomme les conséquences plutôt que de comparer des
  // nombres au fil du rendu : on lit ce que la barre perd, non à quel palier elle est.
  const soutenirCompact = cran >= 1;
  const pseudoMasque = cran >= 2;
  // L'onglet des bibles a son état propre à chaque palier, du plus disert au plus court.
  const etatBible: EtatBible = cran === 0 ? 'deux' : cran === 1 ? 'fendu' : cran === 2 ? 'long' : 'court';
  // Le champ de recherche se resserre d'un palier à l'autre avant de se replier en loupe.
  // Les bornes restent en rem, donc accordées à la police racine ; la valeur préférée est
  // en vw, donc accordée à l'écran : dans chaque palier le champ suit encore la fenêtre,
  // au lieu de rester le même ruban de 1 024 px à 2 400.
  const largeurRecherche = cran === 0 ? "clamp(11rem, 17vw, 22rem)"
    : cran === 1 ? "clamp(9.5rem, 13vw, 16rem)"
    : "clamp(7.5rem, 9vw, 11rem)";
  const rechercheRepliee = cran >= 3;
  // Dernier cran : le nom du site s'efface et le monogramme reste seul à porter le retour
  // à l'accueil. C'est la marque qui cède, jamais une section de lecture, et le monogramme
  // garde le lien entier sous une infobulle.
  const nomSiteMasque = cran >= 4;
  const { modeUtilisateurStandard, setModeUtilisateurStandard } = useAffichageAdmin();
  const estAdminEmail = !!(user && user.email && user.email.trim().toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase());
  const estAdminAffiche = (estAdmin || estAdminEmail) && !modeUtilisateurStandard;

  // ── Recherche rapide (remplace l'ancien lien « Recherche ») ──────────────────
  const [requeteRapide, setRequeteRapide] = useState("");
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const [auteursTrouves, setAuteursTrouves] = useState<{ id_auteur: string; nom: string }[]>([]);
  const [essaisTrouves, setEssaisTrouves] = useState<{ id: number; titre: string }[]>([]);
  const [oeuvresTrouvees, setOeuvresTrouvees] = useState<{ id_oeuvre: string; titre: string; auteurs: { nom: string } | null }[]>([]);
  // L'ÉDITION de chaque œuvre montrée, chargée juste après les titres (voir plus bas) :
  // un même titre du même auteur paraît plusieurs fois, une ligne par édition, et rien
  // ne disait laquelle on allait ouvrir. Une carte à part, pour que les titres
  // s'affichent sans attendre cette seconde lecture.
  const [editionsOeuvres, setEditionsOeuvres] = useState<Record<string, EditionOeuvre>>({});
  // Table de référence des éditeurs, qui rend aux maisons leur nom RÉPERTORIÉ
  // (« L. Guérin & Cie » → « Louis Guérin »). Lue à la première œuvre trouvée qui porte
  // un éditeur, et pas avant : la barre est sur toutes les pages, elle n'a pas à charger
  // cette table tant qu'on ne cherche rien. `null` en attendant — la ligne d'édition rend
  // alors la forme rencontrée, qui vaut mieux que rien.
  const [indexEditeurs, setIndexEditeurs] = useState<IndexEditeurs | null>(null);
  const [segmentsTrouves, setSegmentsTrouves] = useState<{ id: number; segment_texte: string; id_oeuvre: string; auteur_nom: string; oeuvre_titre: string }[]>([]);
  const [evenementsTrouves, setEvenementsTrouves] = useState<{ id: string; titre: string; date_affichage: string }[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const [rechercheRapideLoading, setRechercheRapideLoading] = useState(false);
  const [nbResultatsProgressif, setNbResultatsProgressif] = useState(0);
  const [rechercheTerminee, setRechercheTerminee] = useState(false);
  const [nbTotalReel, setNbTotalReel] = useState(0);

  // ── Recherche de péricodes (RPC `rechercher_pericopes`, authentifié) ─────────
  // Menée EN PARALLÈLE de la recherche rapide, dans son propre effet, pour qu'elle ne
  // bloque jamais les autres résultats. Rien sous deux caractères ; debounce ~200 ms ;
  // chaque frappe annule la requête précédente (abort), donc aucune réponse obsolète.
  const [pericopes, setPericopes] = useState<PericopeSearchResult[]>([]);
  const [pericopesLoading, setPericopesLoading] = useState(false);
  const [pericopesFait, setPericopesFait] = useState(false);
  const [pericopesErreur, setPericopesErreur] = useState(false);
  const [actifIndex, setActifIndex] = useState(-1);

  // L'interrupteur ne retient plus rien de lui-même : le thème est une préférence de
  // COMPTE, tenue par `ProvisionCompte`, qui l'écrit sur l'écran, dans le miroir local
  // et dans `profils.theme_lecture`. Il ne restait sinon qu'un bouton, et rien de
  // conservé d'un poste à l'autre.
  // L'écran suit tout de suite ; seule l'écriture en base peut échouer, et elle se
  // signale en console plutôt que d'interrompre une lecture. La page du compte, elle,
  // en rend compte à l'écran.
  const basculerThemeSombre = () => {
    changerTheme(themeSombre ? 'clair' : 'sombre')
      .catch(e => console.error('Thème : la préférence n’a pas pu être enregistrée sur le compte.', e));
  };

  useEffect(() => {
    setActifIndex(-1);
    const q = requeteRapide.trim();
    if (q.length < 2) { setPericopes([]); setPericopesLoading(false); setPericopesFait(false); setPericopesErreur(false); return; }
    setPericopesLoading(true); setPericopesErreur(false);
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      chercherPericopes(q, ctrl.signal)
        .then(res => { if (!ctrl.signal.aborted) { setPericopes(res); setPericopesFait(true); setPericopesLoading(false); } })
        .catch(err => {
          if (ctrl.signal.aborted || err?.name === 'AbortError') return;
          setPericopes([]); setPericopesErreur(true); setPericopesFait(true); setPericopesLoading(false);
        });
    }, 200);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [requeteRapide]);


  useEffect(() => {
    const q = requeteRapide.trim();
    if (!q) { setAuteursTrouves([]); setEssaisTrouves([]); setOeuvresTrouvees([]); setEditionsOeuvres({}); setSegmentsTrouves([]); setEvenementsTrouves([]); setRechercheRapideLoading(false); setNbResultatsProgressif(0); setNbTotalReel(0); setRechercheTerminee(false); return; }
    setRechercheRapideLoading(true);
    setNbResultatsProgressif(0);
    setNbTotalReel(0);
    setRechercheTerminee(false);
    const timer = setTimeout(() => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;
      // Un SEUL appel serveur : `recherche_globale` réunit auteurs, œuvres publiées, essais
      // et événements. Insensible aux accents (« gregoire » trouve « Grégoire »), par PRÉFIXE
      // de mot, classée par pertinence (préfixe en tête de champ d'abord), avec le total réel
      // par catégorie (`total_cat`). Les péricopes gardent leur propre RPC (effet séparé).
      supabase.rpc('recherche_globale', { p_terme: q, p_limite: 6 }).abortSignal(signal)
        .then(({ data }) => {
          if (signal.aborted) return;
          const rows = (data ?? []) as { type: string; id: string; titre: string; sous_titre: string | null; total_cat: number }[];
          const cat = (ty: string) => rows.filter(r => r.type === ty);
          const au = cat('auteur'), oe = cat('oeuvre'), es = cat('essai'), ev = cat('evenement');
          const totalCat = (arr: typeof rows) => (arr.length ? Number(arr[0].total_cat ?? arr.length) : 0);
          setAuteursTrouves(au.map(r => ({ id_auteur: r.id, nom: r.titre })));
          setOeuvresTrouvees(oe.map(r => ({ id_oeuvre: r.id, titre: r.titre, auteurs: r.sous_titre ? { nom: r.sous_titre } : null })));
          // ── L'ÉDITION des œuvres montrées ──────────────────────────────────────
          // `recherche_globale` rend un titre et son auteur, rien de plus : c'est une
          // recherche, pas un catalogue, et l'on ne va pas lui faire porter les
          // colonnes de la bibliothèque pour six lignes. Une seconde lecture, bornée
          // aux TROIS œuvres effectivement affichées, va chercher de quoi les
          // distinguer. Elle ne retarde pas les titres : ils sont déjà posés.
          const idsMontres = oe.slice(0, 3).map(r => r.id);
          setEditionsOeuvres({});
          if (idsMontres.length) {
            supabase.from('v_oeuvres_dates')
              .select('id_oeuvre, trad_auteur, editeur, ville, date_publication_affichage_courte, langue_trad, langue_originale')
              .in('id_oeuvre', idsMontres)
              .abortSignal(signal)
              .then(({ data: lignes }) => {
                if (signal.aborted) return;
                const parId: Record<string, EditionOeuvre> = {};
                (lignes ?? []).forEach((l: Record<string, string | null>) => {
                  parId[l.id_oeuvre as string] = {
                    trad_auteur: l.trad_auteur, editeur: l.editeur, ville: l.ville,
                    date: l.date_publication_affichage_courte,
                    langue_trad: l.langue_trad, langue_originale: l.langue_originale,
                  };
                });
                setEditionsOeuvres(parId);
                // Les maisons d'édition ne se lisent qu'ici, et seulement s'il y en a une.
                if (Object.values(parId).some(e => (e.editeur ?? '').trim())) {
                  chargerEditeurs().then(() => setIndexEditeurs(indexEditeursNavigateur()));
                }
              }, () => { /* l'édition manque : le titre et l'auteur suffisent à ouvrir */ });
          }
          setEssaisTrouves(es.map(r => ({ id: Number(r.id), titre: r.titre })));
          setEvenementsTrouves(ev.slice(0, 4).map(r => ({ id: r.id, titre: r.titre, date_affichage: r.sous_titre ?? '' })));
          setNbTotalReel(totalCat(au) + totalCat(oe) + totalCat(es) + totalCat(ev));
          setNbResultatsProgressif(0);
          setRechercheRapideLoading(false);
          setRechercheTerminee(true);
        }, () => { if (!signal.aborted) { setRechercheRapideLoading(false); setRechercheTerminee(true); } });
      // Les « Extraits patristiques » (plein texte des segments) restent réservés à la
      // page /recherche (touche Entrée) : trop volumineux pour le menu déroulant.
    }, 250);
    return () => { clearTimeout(timer); abortRef.current?.abort(); setRechercheRapideLoading(false); };
  }, [requeteRapide]);

  const qNorm = sansAccents(requeteRapide.trim());
  // Le PASSAGE que la saisie désigne (« Jn 3, 16 », « Genèse 22 ») : il s'ouvre, il ne se
  // cherche pas. La grammaire est celle des péricopes, la même que la page des résultats.
  const refBiblique = referenceBiblique(requeteRapide);
  // Préfixe de MOT (comme le reste de la recherche rapide) : « am » trouve « Amos »,
  // jamais « Samuel » (am au milieu). On teste le début de chaque mot du nom.
  const motCommencePar = (nom: string) => sansAccents(nom).split(/[\s'’-]+/).some(w => w.startsWith(qNorm));
  const livresTrouves = qNorm ? LIVRES_RECHERCHE.filter(l => motCommencePar(l.nom)).slice(0, 5) : [];
  const traductionsTrouvees = qNorm ? TRADUCTIONS_RECHERCHE.filter(t => motCommencePar(t.nom)) : [];

  // Navigation clavier : liste À PLAT de tous les rangs cliquables, dans l'ordre du menu
  // (mêmes tranches que le rendu). `id="nav-<cle>"` sur chaque rang pour le défilement.
  // ⛔ L'ordre suit EXACTEMENT celui du rendu, sinon la flèche descend dans une liste
  // et le surlignage se pose dans une autre : les œuvres ouvrent, leurs auteurs suivent.
  const itemsNavigables: { cle: string; href: string }[] = [];
  if (refBiblique) itemsNavigables.push({ cle: 'ref', href: refBiblique.href });
  oeuvresTrouvees.slice(0, 3).forEach(o => itemsNavigables.push({ cle: `oe:${o.id_oeuvre}`, href: `/oeuvre/${o.id_oeuvre}` }));
  livresTrouves.slice(0, 3).forEach(l => itemsNavigables.push({ cle: `li:${l.code}`, href: `/?livre=${l.code}&chapitre=1` }));
  auteursTrouves.slice(0, 3).forEach(a => itemsNavigables.push({ cle: `au:${a.id_auteur}`, href: `/auteur/${a.id_auteur}` }));
  pericopes.forEach(p => itemsNavigables.push({ cle: `p:${p.pericope_id}`, href: `/pericopes/${p.pericope_id}` }));
  evenementsTrouves.forEach(e => itemsNavigables.push({ cle: `ev:${e.id}`, href: `/histoire#${e.id}` }));
  essaisTrouves.slice(0, 3).forEach(e => itemsNavigables.push({ cle: `es:${e.id}`, href: `/essais/${e.id}` }));
  traductionsTrouvees.slice(0, 3).forEach(t => itemsNavigables.push({ cle: `tr:${t.code}`, href: `/traductions#${t.code}` }));
  const cleActive = actifIndex >= 0 ? (itemsNavigables[actifIndex]?.cle ?? null) : null;
  useEffect(() => {
    document.querySelectorAll('[data-nav-actif]').forEach(el => el.removeAttribute('data-nav-actif'));
    if (cleActive) {
      const el = document.getElementById('nav-' + cleActive);
      if (el) { el.setAttribute('data-nav-actif', 'true'); el.scrollIntoView({ block: 'nearest' }); }
    }
  }, [cleActive]);
  const aucunResultat = !rechercheRapideLoading && !pericopesLoading && qNorm.length > 0 && !refBiblique && auteursTrouves.length === 0 && oeuvresTrouvees.length === 0 && segmentsTrouves.length === 0 && livresTrouves.length === 0 && traductionsTrouvees.length === 0 && essaisTrouves.length === 0 && pericopes.length === 0 && evenementsTrouves.length === 0;

  const fermerRechercheRapide = () => { setRechercheOuverte(false); setRequeteRapide(""); setMobileOuvert(false); };
  const validerRechercheRapide = () => {
    if (!requeteRapide.trim()) return;
    // Entrée sur une référence chiffrée OUVRE le passage ; sur un mot, la recherche entière.
    router.push(refBiblique ? refBiblique.href : `/recherche?q=${encodeURIComponent(requeteRapide.trim())}&mode=prefixe`);
    fermerRechercheRapide();
  };

  // Rien à faire ici : session, pseudonyme et droits viennent du contexte, et les
  // trois compteurs se remettent à zéro d'eux-mêmes dans les effets qui les chargent.

  useEffect(() => {
    if (!user?.id) { setNbNotifications(0); return }

    const chargerNotifications = async (avecToast: boolean) => {
      try {
        const outils = await import("@/app/lib/notificationsClient")
        const cleArchives = outils.cleArchivesNotifications(user.id)
        const cleConnues = outils.cleNotificationsConnues(user.id)
        const toutes = await outils.chargerNotificationsUtilisateur(user.id)
        const archives = outils.lireSetLocalStorage(cleArchives)
        const connues = outils.lireSetLocalStorage(cleConnues)
        const actives = toutes.filter(n => !archives.has(n.key))
        const nouvelles = actives.filter(n => !connues.has(n.key))
        setNbNotifications(actives.length)
        if (avecToast && nouvelles.length > 0 && connues.size > 0) {
          const n = nouvelles[0]
          // La fermeture est confiée à un effet dédié (voir ci-dessous) : un compte à
          // rebours posé ici survivait à la vignette et fermait la suivante trop tôt.
          // ⚠️ Le modèle n’a plus de `titre` : l’OBJET tient ce rôle, et le corps
          // peut être vide quand l’objet dit déjà tout (voir notificationsClient).
          setToastNotification({ id: Date.now(), titre: n.objet, message: String(n.message || '').slice(0, 120) })
        }
        localStorage.setItem(cleConnues, JSON.stringify(toutes.map(n => n.key)))
      } catch {
        // fail silencieux : les notifications sont non-critiques
      }
    }

    let dernierChargement = 0
    const chargerEtDater = async (avecToast: boolean) => {
      dernierChargement = Date.now()
      await chargerNotifications(avecToast)
    }
    const annulerDepart = planifierTacheSecondaire(() => { void chargerEtDater(false) }, 1200)
    // On ne sonde pas quand l'onglet est caché ; on rafraîchit au retour à l'onglet.
    const frequence = 120000
    const interval = window.setInterval(() => { if (!document.hidden) void chargerEtDater(true) }, frequence)
    const onArchivees = () => void chargerEtDater(false)
    const onVisible = () => {
      if (!document.hidden && Date.now() - dernierChargement >= frequence) void chargerEtDater(true)
    }
    window.addEventListener('notifications-archivees', onArchivees)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      annulerDepart()
      window.clearInterval(interval)
      window.removeEventListener('notifications-archivees', onArchivees)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user?.id]);

  // Échap referme, de la couche la plus superficielle à la plus profonde : on ferme
  // UNE chose par pression, celle que l'on vient d'ouvrir, plutôt que tout d'un coup.
  // La recherche gère sa propre touche Échap dans son champ (elle ne ferme que la liste
  // de résultats) : on ne la double pas ici tant que ce champ a le focus.
  useEffect(() => {
    const surEchap = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const dansLeChamp = (e.target as HTMLElement | null)?.classList?.contains('recherche-rapide-input');
      if (dansLeChamp) return;
      if (mobileOuvert) { setMobileOuvert(false); return; }
      if (menuOuvert) { setMenuOuvert(false); return; }
      if (notifsOuvertes) { setNotifsOuvertes(false); return; }
      if (rechercheDeployee) { setRechercheDeployee(false); return; }
      if (rechercheOuverte) { setRechercheOuverte(false); }
    };
    window.addEventListener('keydown', surEchap);
    return () => window.removeEventListener('keydown', surEchap);
  }, [mobileOuvert, menuOuvert, notifsOuvertes, rechercheDeployee, rechercheOuverte]);

  // Retrait de la vignette au terme des trois secondes. Le compte à rebours est
  // rattaché à la vignette elle-même : une nouvelle notification repart de zéro, et
  // un clic (qui la ferme et ouvre le volet) annule le minuteur au lieu de le laisser
  // courir à vide.
  useEffect(() => {
    if (!toastNotification) return;
    const minuteur = window.setTimeout(() => setToastNotification(null), DUREE_TOAST_MS);
    return () => window.clearTimeout(minuteur);
  }, [toastNotification]);

  // ── La barre constate elle-même si elle déborde ────────────────────────────
  // Se remesure au redimensionnement et à chaque changement susceptible d'allonger la
  // barre : ouverture de session, pseudo, droits d'admin, pastilles de compteurs.
  useEffect(() => {
    const mesurer = () => {
      const nav = navRef.current;
      // Sous 1024px la navigation desktop est masquée (`hidden lg:flex`) : rien à mesurer,
      // et une largeur nulle ferait conclure à tort à un débordement.
      if (!nav || nav.clientWidth === 0) return;
      const debord = nav.scrollWidth - nav.clientWidth;
      if (debord > 0) {
        // Un cran à la fois : on retient la largeur qu'il aurait fallu, puis on cède le
        // cran suivant. L'effet se rejoue sur `cran`, donc la barre se remesure aussitôt
        // et en reprend un autre si celui-ci n'a pas suffi. La descente s'arrête d'elle-même
        // dès que la barre tient — ou au dernier cran, s'il n'y a plus rien à replier.
        if (cranRef.current < CRAN_MAX) {
          largeurRetourRef.current[cranRef.current] = window.innerWidth + debord + MARGE_BASCULE_PX;
          cranRef.current += 1;
          setCran(cranRef.current);
        }
      } else if (cranRef.current > 0) {
        // On ne rend un cran que si la fenêtre a retrouvé la largeur où IL avait cédé —
        // pas celle d'un autre. On le rend seul : la mesure suivante tranchera pour le
        // précédent, et si la barre déborde de nouveau (la police racine ayant grandi
        // avec la fenêtre), elle le reprend aussitôt en retenant une largeur plus grande.
        const largeurRetour = largeurRetourRef.current[cranRef.current - 1] ?? Number.POSITIVE_INFINITY;
        if (window.innerWidth >= largeurRetour) {
          cranRef.current -= 1;
          setCran(cranRef.current);
        }
      }
    };
    let image = 0;
    const planifier = () => { cancelAnimationFrame(image); image = requestAnimationFrame(mesurer); };
    planifier();
    window.addEventListener('resize', planifier);
    return () => { cancelAnimationFrame(image); window.removeEventListener('resize', planifier); };
  }, [cran, user, pseudo, estAdmin, estAdminEmail, nbNotifications, nbMessages, pathname]);

  useEffect(() => {
    if (!user?.id) { setNbMessages(0); return }
    const chargerMessages = async () => {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) return
      try {
        const res = await fetch('/api/messagerie/nb-non-lus', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) { const d = await res.json(); setNbMessages(d.nb ?? 0) }
      } catch { /* non-critique */ }
    }
    let dernierChargement = 0
    const chargerEtDater = async () => {
      dernierChargement = Date.now()
      await chargerMessages()
    }
    const annulerDepart = planifierTacheSecondaire(() => { void chargerEtDater() }, 1600)
    // Idem : pas de sondage onglet caché, rafraîchissement au retour.
    const frequence = 120000
    const interval = window.setInterval(() => { if (!document.hidden) void chargerEtDater() }, frequence)
    const onVisible = () => {
      if (!document.hidden && Date.now() - dernierChargement >= frequence) void chargerEtDater()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => { annulerDepart(); window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisible) }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !estAdminAffiche) { setNbActionsAdmin(0); setNbVerifAdmin(0); return }
    const charger = async () => {
      const [r0, r1, r2, r3, r4] = await Promise.all([
        supabase.from('commentaires').select('id', { count: 'exact', head: true }).eq('valide', false).or('demande_validation.is.null,demande_validation.eq.false'),
        supabase.from('signalements').select('id', { count: 'exact', head: true }).eq('traite', false),
        supabase.from('commentaires').select('id', { count: 'exact', head: true }).eq('demande_validation', true),
        supabase.from('essais').select('id', { count: 'exact', head: true }).in('statut', ['en_attente', 'a_reviser']),
        supabase.rpc('count_verifications_pending'),
      ])
      const moderation = (r0.count ?? 0) + (r1.count ?? 0) + (r2.count ?? 0) + (r3.count ?? 0)
      const verif = (r4.data as number | null) ?? 0
      setNbActionsAdmin(moderation)
      setNbVerifAdmin(verif)
    }
    let dernierChargement = 0
    const chargerEtDater = async () => {
      dernierChargement = Date.now()
      await charger()
    }
    const annulerDepart = planifierTacheSecondaire(() => { void chargerEtDater() }, 2200)
    const frequence = 300000
    const interval = window.setInterval(() => { if (!document.hidden) void chargerEtDater() }, frequence)
    const onVisible = () => {
      if (!document.hidden && Date.now() - dernierChargement >= frequence) void chargerEtDater()
    }
    const onVerif = (e: Event) => setNbVerifAdmin((e as CustomEvent<number>).detail)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('admin-verif-count', onVerif)
    return () => { annulerDepart(); window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('admin-verif-count', onVerif) }
  }, [user?.id, estAdminAffiche]);

  const seDeconnecter = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Continuer même si signOut échoue côté réseau : le token est invalidé localement
    }
    setMenuOuvert(false)
    router.push("/accueil")
  };

  // L'état actif ne se disait qu'en couleur : `aria-current` le dit aussi à qui lit la
  // page à l'oreille. Une seule règle, partagée par le style et par l'attribut.
  const estCheminActif = (href: string, exact?: boolean) => {
    const chemin = href.split("?")[0] || "/";
    return exact ? pathname === chemin : pathname.startsWith(chemin);
  };

  const styleLien = (href: string, exact: boolean | undefined, primaire: boolean) => {
    const actif = estCheminActif(href, exact);
    // Le fond ne s'écrit PAS en ligne : un style en ligne l'emporte sur toute règle
    // de feuille, et `.cs-nav-onglet:hover` n'aurait donc jamais pu s'appliquer. Il passe
    // par deux variables que la classe lit — l'une pour l'état, l'autre pour le survol.
    return {
      display: "inline-block", padding: "0.25rem 0.5rem", borderRadius: "4px",
      fontSize: "0.9375rem", letterSpacing: "0.01em", textDecoration: "none", whiteSpace: "nowrap",
      fontWeight: primaire ? 600 : 400,
      color: actif ? "var(--cs-sur-aplat)" : primaire ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.60)",
      "--fond": actif ? "rgba(255,255,255,0.14)" : "transparent",
      "--fond-survol": actif ? "rgba(255,255,255,0.19)" : "rgba(255,255,255,0.085)",
    } as React.CSSProperties;
  };

  const styleLienDiscret = (href: string) => ({
    ...styleLien(href, undefined, false),
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 7px",
    fontSize: "0.9375rem",
  } as const);

  // ── Bloc recherche rapide, réutilisé en version desktop et mobile ────────────
  const nbLocalStatique = livresTrouves.length + traductionsTrouvees.length;
  // Le total AFFICHÉ est le compte réel des sources en base (non plafonné) + les
  // résultats locaux. Tant que le compte réel n'est pas revenu, on retombe sur la somme
  // des aperçus, pour ne jamais afficher un nombre INFÉRIEUR à ce qu'on montre déjà.
  const nbTotalResultats = Math.max(nbTotalReel, nbResultatsProgressif) + nbLocalStatique;

  const blocRecherche = (mobile: boolean) => (
    <div style={{ position: "relative", width: mobile ? "100%" : "fit-content" }}>
      <style>{`
        .recherche-rapide-input::placeholder { color: rgba(255,255,255,0.45); }
        @keyframes spin-search { to { transform: rotate(360deg); } }
        .spinner-search { animation: spin-search 0.8s linear infinite; }
        /* ── LES GROUPES DE LA LISTE, au modèle de la page de résultats ──────────
           Une rubrique en aplat, puis un bloc lavé de la même famille dont les
           lignes se séparent d'un filet. La famille se pose une fois, par --fam
           et --fam-aplat (voir styleDomaine), et tout le reste s'en dérive.

           ⛔ Plus de filet de trois pixels au flanc des sections. Il a été essayé
           et refusé sur la page de résultats : un trait dit moins bien le domaine
           qu'un fond qui le porte sur toute la hauteur du groupe, et il ajoute un
           objet là où l'on en retire. Les sept rubriques portaient chacune le
           leur, plus un fond translucide, plus un filet de séparation en haut.

           ⚠️ La rubrique garde sa TYPOGRAPHIE : petites capitales espacées au
           même corps qu'avant. Ce n'est pas un titre — elle nomme un genre de
           résultat, non une œuvre. Seule la couleur a changé de place, du texte
           vers la bande. */
        .rr-hd { padding:2px 12px 3px; background:var(--fam-aplat); color:var(--cs-sur-aplat); font-size:0.59375rem; font-weight:700; letter-spacing:0.09em; text-transform:uppercase; }
        .rr-corps { background:color-mix(in srgb, var(--fam) 7%, var(--cs-surface)); }
        .rr-ligne { display:block; padding:3px 12px; text-decoration:none; transition:background 0.1s; }
        .rr-ligne + .rr-ligne { border-top:1px solid color-mix(in srgb, var(--fam) 18%, var(--cs-surface)); }
        .rr-ligne:hover { background:color-mix(in srgb, var(--fam) 14%, var(--cs-surface)); }
        .rr-vide { margin:0; padding:3px 12px; font-size:0.71875rem; color:var(--cs-texte-doux); font-style:italic; }
        /* Le rang atteint au CLAVIER prend la teinte de sa propre famille, et non
           plus un gris commun : la flèche descend d'un domaine à l'autre, et le
           surlignage doit le dire. */
        [data-nav-actif] { background: color-mix(in srgb, var(--fam, var(--cs-texte-doux)) 20%, var(--cs-surface)) !important; }
      `}</style>
      {/* Champ + bouton page de recherche */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <input
          type="text"
          value={requeteRapide}
          onChange={e => setRequeteRapide(e.target.value)}
          onFocus={() => setRechercheOuverte(true)}
          onKeyDown={e => {
            if (e.key === 'ArrowDown' && itemsNavigables.length) { e.preventDefault(); setActifIndex(i => Math.min(i + 1, itemsNavigables.length - 1)); }
            else if (e.key === 'ArrowUp' && itemsNavigables.length) { e.preventDefault(); setActifIndex(i => Math.max(i - 1, -1)); }
            else if (e.key === 'Enter') {
              const cible = actifIndex >= 0 ? itemsNavigables[actifIndex] : null;
              if (cible) { e.preventDefault(); router.push(cible.href); fermerRechercheRapide(); }
              else validerRechercheRapide();
            }
            else if (e.key === 'Escape') { setRechercheOuverte(false); setActifIndex(-1); }
          }}
          placeholder="Rechercher…"
          className="recherche-rapide-input cs-focus-clair"
          /* La largeur se prend sur la FENÊTRE et sur le PALIER, jamais sur une valeur
             fixe. À 13,75rem le champ était le plus large des outils, et le même à 1 024 px
             qu'à 2 400 : trop gourmand en bas, où il précipitait le repli de la barre, trop
             court en haut, où il restait un ruban étroit au milieu du vide. Le palier donne
             le `clamp` (cf. largeurRecherche) et le `vw` le fait suivre l'écran à
             l'intérieur du palier. */
          style={{ width: mobile ? "100%" : largeurRecherche, height: "1.875rem", fontSize: "0.84375rem", padding: "0 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.10)", color: "var(--cs-sur-aplat)", outline: "none", boxSizing: "border-box", flex: mobile ? 1 : undefined }}
        />
        {/* Bouton « Nouvelle recherche » : conduit à la page de recherche VIERGE (pas de
            ?q), pour repartir de zéro. Si l'on y est DÉJÀ (l'URL peut être « /recherche »
            sans ?q, la navigation client ne rejouerait alors rien), on force un rechargement
            propre pour vider les résultats précédents.

            Le mot « Recherche » a disparu et le bouton est devenu carré, de la taille du
            champ : il coûtait près de quatre rem à côté d'un champ qui porte déjà
            « Rechercher… » en filigrane, et redisait donc ce qu'on venait de lire. La loupe
            marquée d'une croix se lit d'un coup et dit ce que le mot ne disait pas — que
            cette recherche-ci part de zéro. L'intitulé reste en infobulle et pour les
            lecteurs d'écran. */}
        <Link href="/recherche" title="Ouvrir une recherche vierge" aria-label="Nouvelle recherche"
          onClick={e => {
            fermerRechercheRapide();
            if (pathname.startsWith("/recherche")) { e.preventDefault(); window.location.assign("/recherche"); }
          }}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "1.875rem", height: "1.875rem", boxSizing: "border-box", padding: 0, borderRadius: "8px", border: "1px solid rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.82)", textDecoration: "none", flexShrink: 0, transition: "background 0.13s, color 0.13s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.20)"; e.currentTarget.style.color = "var(--cs-surface)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.10)"; e.currentTarget.style.color = "rgba(255,255,255,0.82)"; }}>
          {/* Une loupe marquée d'une croix : la recherche, et qu'elle recommence. */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <circle cx="5.9" cy="5.9" r="4.1" stroke="currentColor" strokeWidth="1.25"/>
            <path d="M5.9 4.1v3.6M4.1 5.9h3.6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
            <path d="M9 9l3.3 3.3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
          </svg>
        </Link>
      </div>

      {rechercheOuverte && qNorm && (
        /* Le panneau de résultats ne se mesure PAS sur le champ. Il l'a longtemps fait
           (`left: 0; right: 0` dans un conteneur en `fit-content`) et valait donc la
           largeur du champ plus la loupe : 154 px mesurés à 1 280, où « Anonyme /
           Symboles et confessions de foi » se pliait en trois lignes et où l'édition
           d'une œuvre n'avait aucune place. Le champ, lui, se resserre par paliers
           (cf. largeurRecherche) — le panneau aurait donc rétréci à mesure qu'il avait
           davantage à dire.
           Il s'accroche maintenant par la DROITE, au bord des outils, et se déplie vers
           la gauche, sur la place libre du milieu de la barre : c'est le seul côté où
           l'on est sûr de ne buter contre rien. La largeur reste en rem, donc accordée
           à la police racine, qui grandit avec la fenêtre au-delà de 1 440 px. */
        <div style={{ position: mobile ? "static" : "absolute", marginTop: mobile ? "8px" : 0, top: "calc(100% + 8px)", left: mobile ? 0 : "auto", right: 0, width: mobile ? "100%" : "min(32rem, calc(100vw - 3rem))", background: "var(--cs-surface)", border: "1px solid var(--cs-bord)", borderRadius: "8px", boxShadow: mobile ? "none" : "0 12px 36px rgba(0,0,0,0.16)", zIndex: 100, overflow: "hidden", maxHeight: mobile ? "70vh" : "min(72vh, 640px)", overflowY: "auto" }}>

          {/* Barre de statut : nb résultats + spinner/smiley */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 12px 4px", borderBottom: "1px solid var(--cs-fond-doux)", background: "var(--cs-fond-clair)" }}>
            <span style={{ fontSize: "0.71875rem", color: "var(--cs-texte-second)", fontWeight: 500 }}>
              {(rechercheRapideLoading || pericopesLoading) && (nbTotalResultats + pericopes.length) === 0
                ? "Recherche…"
                : (nbTotalResultats + pericopes.length) === 0 && rechercheTerminee && pericopesFait
                  ? "Aucun résultat"
                  : <>{nbTotalResultats + pericopes.length} <span style={{ color: "var(--cs-texte-doux)", fontWeight: 400 }}>résultat{(nbTotalResultats + pericopes.length) > 1 ? 's' : ''}</span></>}
            </span>
            {(rechercheRapideLoading || pericopesLoading) ? (
              <svg className="spinner-search" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-label="Chargement" style={{ color: 'var(--cs-vert)' }}>
                <circle cx="7" cy="7" r="5.5" stroke="var(--cs-bord)" strokeWidth="1.6" fill="none"/>
                <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
              </svg>
            ) : rechercheTerminee ? (
              /* Smiley au trait, épuré comme les autres symboles du site. Son cercle
                 extérieur reprend EXACTEMENT celui du spinner (r 5.5, centre 7,7, même
                 trait) : quand le chargement s'achève, l'anneau devient visage sans que
                 le contour bouge. */
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" role="img" aria-label="Recherche terminée" style={{ color: 'var(--cs-vert)' }}>
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.6" fill="none"/>
                <circle cx="5" cy="5.8" r="0.65" fill="currentColor"/>
                <circle cx="9" cy="5.8" r="0.65" fill="currentColor"/>
                <path d="M4.6 8.6a2.6 2.6 0 0 0 4.8 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
              </svg>
            ) : null}
          </div>

          {rechercheRapideLoading && pericopes.length === 0 && !pericopesLoading && auteursTrouves.length === 0 && oeuvresTrouvees.length === 0 && segmentsTrouves.length === 0 && essaisTrouves.length === 0 && livresTrouves.length === 0 && traductionsTrouvees.length === 0 && evenementsTrouves.length === 0 ? (
            <p style={{ fontSize: "0.78125rem", color: "var(--cs-texte-faible)", textAlign: "center", padding: "11px 12px", margin: 0 }}>…</p>
          ) : aucunResultat ? (
            <p style={{ fontSize: "0.78125rem", color: "var(--cs-texte-doux)", fontStyle: "italic", textAlign: "center", padding: "11px 12px", margin: 0 }}>Aucun résultat — Entrée pour une recherche complète.</p>
          ) : (
            <>
              {/* ── EN TÊTE, et au premier plan : les TITRES, c'est-à-dire ce qu'on ouvre
                     pour lire — une œuvre patristique, un livre de la Bible. C'est ce qu'on
                     vient chercher le plus souvent dans cette barre, et cela passait après
                     quatre rubriques. Ils prennent donc le caractère des titres du site (le
                     sérif) et un corps supérieur au reste du menu ; sous une œuvre, l'auteur
                     descend sur sa propre ligne au lieu de talonner le titre.
                     ⚠️ Les deux domaines ne sont plus contigus (vert puis bleu, et leurs
                     autres rubriques plus bas) : c'est le prix de la mise en tête, et le
                     filet de gauche continue de dire le domaine de chacun. ── */}
              {/* Avant tout : le PASSAGE que la saisie désigne, s'il y en a un. « Jn 3, 16 »
                  n'est pas un titre à chercher, c'est un endroit où aller (2026-09-06). */}
              {refBiblique && (
                <div style={styleDomaine("bible")}>
                  <p className="rr-hd" style={{ margin: 0 }}>Passage biblique</p>
                  <div className="rr-corps">
                    <Link id="nav-ref" href={refBiblique.href} onClick={fermerRechercheRapide}
                      className="rr-ligne"
                      style={{ padding: "4px 12px", fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1rem", fontWeight: 600, lineHeight: 1.24, color: "var(--cs-encre)" }}>
                      Ouvrir {refBiblique.libelle}
                    </Link>
                  </div>
                </div>
              )}
              {oeuvresTrouvees.length > 0 && (
                <div style={styleDomaine("patristique")}>
                  <p className="rr-hd" style={{ margin: 0 }}>Œuvres patristiques</p>
                  <div className="rr-corps">
                  {oeuvresTrouvees.slice(0, 3).map(o => {
                    // Ce qui distingue CETTE édition des autres du même titre : son
                    // traducteur (ou sa langue, si c'est le texte original), sa maison,
                    // sa ville, son année. Muette tant que la seconde lecture n'est pas
                    // revenue, et absente si l'œuvre ne porte aucune de ces mentions.
                    const edition = ligneEdition(editionsOeuvres[o.id_oeuvre] ?? {}, indexEditeurs);
                    return (
                    <Link key={o.id_oeuvre} id={`nav-oe:${o.id_oeuvre}`} href={`/oeuvre/${o.id_oeuvre}`} onClick={fermerRechercheRapide}
                      className="rr-ligne" style={{ padding: "4px 12px" }}>
                      <span style={{ display: "block", fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1rem", fontWeight: 600, lineHeight: 1.24, color: "var(--cs-encre)" }}>{surlignerMatch(o.titre, requeteRapide.trim())}</span>
                      {o.auteurs?.nom && <span style={{ display: "block", fontSize: "0.71875rem", fontStyle: "italic", color: "var(--cs-texte-second)", lineHeight: 1.25, marginTop: "1px" }}>{o.auteurs.nom}</span>}
                      {edition && <span style={{ display: "block", fontSize: "0.6875rem", color: "var(--cs-texte-doux)", lineHeight: 1.3, marginTop: "1px" }}>{edition}</span>}
                    </Link>
                    );
                  })}
                  </div>
                </div>
              )}
              {livresTrouves.length > 0 && (
                <div style={styleDomaine("bible")}>
                  <p className="rr-hd" style={{ margin: 0 }}>Livres bibliques</p>
                  <div className="rr-corps">
                  {livresTrouves.slice(0, 3).map(l => (
                    <Link key={l.code} id={`nav-li:${l.code}`} href={`/?livre=${l.code}&chapitre=1`} onClick={fermerRechercheRapide}
                      className="rr-ligne"
                      style={{ padding: "4px 12px", fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1rem", fontWeight: 600, lineHeight: 1.24, color: "var(--cs-encre)" }}>
                      {surlignerMatch(l.nom, requeteRapide.trim())}
                    </Link>
                  ))}
                  </div>
                </div>
              )}
              {auteursTrouves.length > 0 && (
                <div style={styleDomaine("patristique")}>
                  <p className="rr-hd" style={{ margin: 0 }}>Auteurs</p>
                  <div className="rr-corps">
                  {auteursTrouves.slice(0, 3).map(a => (
                    <Link key={a.id_auteur} id={`nav-au:${a.id_auteur}`} href={`/auteur/${a.id_auteur}`} onClick={fermerRechercheRapide}
                      className="rr-ligne" style={{ fontSize: "0.84375rem", lineHeight: 1.28, color: "var(--cs-encre)" }}>
                      {surlignerMatch(a.nom, requeteRapide.trim())}
                    </Link>
                  ))}
                  </div>
                </div>
              )}
              {/* ── Péricopes (RPC) : section distincte, famille de l'Écriture. ── */}
              {(pericopesLoading || pericopes.length > 0 || (pericopesFait && !pericopesErreur) || pericopesErreur) && (
                <div style={styleDomaine("bible")}>
                  <p className="rr-hd" style={{ margin: 0 }}>Péricopes</p>
                  <div className="rr-corps">
                  {pericopes.length > 0 ? (
                    pericopes.map(p => {
                      const ref = referencePericope(p);
                      const corr = correspondanceVisible(p);
                      // Le rang actif se reconnaît à sa CLÉ, jamais à son indice : la liste
                      // à plat ne commence plus par les péricopes.
                      const actif = cleActive === `p:${p.pericope_id}`;
                      return (
                        <Link key={p.pericope_id} id={`nav-p:${p.pericope_id}`} href={`/pericopes/${p.pericope_id}`} onClick={fermerRechercheRapide}
                          className="rr-ligne" {...(actif ? { 'data-nav-actif': '' } : {})}>
                          <span style={{ display: "block", fontSize: "0.84375rem", lineHeight: 1.28, color: "var(--cs-encre)" }}>{p.titre}</span>
                          <span style={{ display: "block", fontSize: "0.71875rem", color: "var(--cs-texte-second)", lineHeight: 1.25 }}>
                            {ref}
                            {ref && p.categorie ? <span style={{ color: "var(--cs-texte-faible)" }}> · </span> : null}
                            {p.categorie ? <span style={{ color: "var(--cs-texte-doux)" }}>{libelleCategoriePericope(p.categorie)}</span> : null}
                          </span>
                          {corr && <span style={{ display: "block", fontSize: "0.65625rem", color: "var(--cs-texte-doux)", fontStyle: "italic", lineHeight: 1.2 }}>Correspond à : {corr}</span>}
                        </Link>
                      );
                    })
                  ) : pericopesLoading ? (
                    <p className="rr-vide" style={{ color: "var(--cs-texte-faible)", fontStyle: "normal" }}>…</p>
                  ) : pericopesErreur ? (
                    <p className="rr-vide" style={{ color: "var(--cs-texte-faible)" }}>Recherche de péricopes momentanément indisponible.</p>
                  ) : (
                    <p className="rr-vide">Aucune péricope trouvée.</p>
                  )}
                  </div>
                </div>
              )}
              {/* La CHRONOLOGIE porte la famille des Pères : voir la note de DOMAINE. */}
              {evenementsTrouves.length > 0 && (
                <div style={styleDomaine("patristique")}>
                  <p className="rr-hd" style={{ margin: 0 }}>Chronologie</p>
                  <div className="rr-corps">
                  {evenementsTrouves.map(e => {
                    const titrePropre = e.titre.replace(/\*{1,2}|\+\+|\^\^/g, '');
                    return (
                      <Link key={e.id} id={`nav-ev:${e.id}`} href={`/histoire#${e.id}`} onClick={fermerRechercheRapide} className="rr-ligne">
                        <span style={{ display: "block", fontSize: "0.84375rem", lineHeight: 1.28, color: "var(--cs-encre)" }}>{surlignerMatch(titrePropre, requeteRapide.trim())}</span>
                        {e.date_affichage && <span style={{ display: "block", fontSize: "0.71875rem", color: "var(--cs-texte-doux)", lineHeight: 1.25 }}>{e.date_affichage}</span>}
                      </Link>
                    );
                  })}
                  </div>
                </div>
              )}
              {essaisTrouves.length > 0 && (
                <div style={styleDomaine("publications")}>
                  <p className="rr-hd" style={{ margin: 0 }}>Essais et méditations</p>
                  <div className="rr-corps">
                  {essaisTrouves.slice(0, 3).map(e => (
                    <Link key={e.id} id={`nav-es:${e.id}`} href={`/essais/${e.id}`} onClick={fermerRechercheRapide}
                      className="rr-ligne" style={{ fontSize: "0.84375rem", lineHeight: 1.28, color: "var(--cs-encre)" }}>
                      {surlignerMatch(e.titre, requeteRapide.trim())}
                    </Link>
                  ))}
                  </div>
                </div>
              )}
              {traductionsTrouvees.length > 0 && (
                <div style={styleDomaine("bible")}>
                  <p className="rr-hd" style={{ margin: 0 }}>Traductions</p>
                  <div className="rr-corps">
                  {traductionsTrouvees.slice(0, 3).map(t => (
                    <Link key={t.code} id={`nav-tr:${t.code}`} href={`/traductions#${t.code}`} onClick={fermerRechercheRapide}
                      className="rr-ligne" style={{ fontSize: "0.84375rem", lineHeight: 1.28, color: "var(--cs-encre)" }}>
                      {surlignerMatch(t.nom, requeteRapide.trim())}
                    </Link>
                  ))}
                  </div>
                </div>
              )}
              {(auteursTrouves.length > 3 || oeuvresTrouvees.length > 3 || segmentsTrouves.length > 3 || essaisTrouves.length > 3 || livresTrouves.length > 3 || traductionsTrouvees.length > 3) && (
                <div style={{ borderTop: "1px solid var(--cs-fond-doux)", padding: "4px 0" }}>
                  <Link href={`/recherche?q=${encodeURIComponent(requeteRapide.trim())}&mode=prefixe`} onClick={fermerRechercheRapide}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "5px 12px", fontSize: "0.78125rem", color: "var(--cs-vert)", fontWeight: 600, textDecoration: "none", letterSpacing: "0.02em" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(var(--cs-vert-rgb),0.06)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    Tout voir
                    <span style={{ fontSize: "0.875rem", lineHeight: 1 }}>→</span>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {rechercheOuverte && !mobile && <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setRechercheOuverte(false)} />}
    </div>
  );

  // ── Interrupteur admin / utilisateur standard — visible directement dans la barre ─
  const toggleAdmin = (mobile: boolean) => (estAdmin || estAdminEmail) && (
    <div style={mobile
      ? { display: "flex", alignItems: "center", gap: "8px", padding: "9px 12px", fontSize: "0.9375rem", color: "rgba(255,255,255,0.85)" }
      : { display: "inline-flex", alignItems: "center", gap: "0.3125rem", height: "1.75rem", padding: "0 0.375rem 0 0.125rem", fontSize: "0.78125rem", color: "rgba(255,255,255,0.74)", letterSpacing: "0.01em" }}>
      <button type="button" role="switch" aria-checked={modeUtilisateurStandard}
        onClick={() => setModeUtilisateurStandard(!modeUtilisateurStandard)}
        aria-label="Affichage administrateur"
        title="Affichage seulement — vos droits réels ne changent pas"
        style={{
          width: "30px", height: "17px", borderRadius: "999px", border: modeUtilisateurStandard ? "1px solid var(--cs-vert-clair)" : "1px solid rgba(255,255,255,0.72)", cursor: "pointer", padding: 0, flexShrink: 0,
          background: modeUtilisateurStandard ? "var(--cs-vert-aplat)" : "var(--cs-fond)",
          boxShadow: modeUtilisateurStandard ? "0 0 0 1px rgba(var(--cs-vert-rgb),0.35)" : "0 0 0 1px rgba(0,0,0,0.18)",
          position: "relative", transition: "background 0.15s, border-color 0.15s",
        }}>
        <span style={{ position: "absolute", top: "2px", left: modeUtilisateurStandard ? "14px" : "2px", width: "11px", height: "11px", borderRadius: "50%", background: modeUtilisateurStandard ? "var(--cs-surface)" : "var(--cs-vert-aplat)", transition: "left 0.15s, background 0.15s" }} />
      </button>
      {/* À l'étroit, l'interrupteur parle seul : son infobulle et son `aria-label`
          portent le sens, le mot cède la place. */}
      {(mobile || !soutenirCompact) && <span>Admin</span>}
    </div>
  );

  // ── Bloc compte, réutilisé en version desktop et mobile ──────────────────────
  // ⚠️ La page publique se nomme ICI depuis la refonte du 1er septembre 2026 : le
  // sommaire de l'espace ne porte plus de destinations, seulement des ancres, et il
  // n'y a donc plus de table où la prendre. Le nom et l'adresse ne vivent plus qu'à
  // un endroit — celui-ci.
  const pagePublique = pseudo
    ? { href: `/profil/${encodeURIComponent(pseudo)}`, label: "Ma page publique" }
    : null;

  const blocCompte = (mobile: boolean) => user ? (
    <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", alignItems: mobile ? "stretch" : "center", gap: mobile ? "2px" : "6px", width: mobile ? "100%" : undefined }}>
      {!mobile && (
        <button onClick={() => setMenuOuvert(!menuOuvert)} aria-label={`Compte de ${pseudo ?? user.email.split("@")[0]}`} aria-expanded={menuOuvert}
          style={{ display: "flex", alignItems: "center", gap: "0.3125rem", height: "1.875rem", background: "rgba(255,255,255,0.11)", border: "1px solid rgba(255,255,255,0.17)", borderRadius: "8px", padding: "0 0.5rem 0 0.25rem", cursor: "pointer", color: "rgba(255,255,255,0.92)", fontSize: "0.84375rem", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}>
          {/* Le visage choisi tient lieu de silhouette dès qu'il y en a un. Il ne coûte
              aucune requête de plus : le contexte rapporte la référence avec le
              pseudonyme, d'une seule lecture (voir contexteCompte). */}
          {portrait ? (
            <span style={{ display: "inline-flex", width: "1.375rem", height: "1.375rem" }}>
              <PortraitLecteur refPortrait={portrait} cadrage={cadragePortrait} initiale={pseudo ?? user.email} taille={22} />
            </span>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ marginLeft: "0.1875rem" }}><circle cx="7" cy="5" r="2.8" stroke="currentColor" strokeWidth="1.2" fill="none"/><path d="M1.5 13c0-3 2.5-4.5 5.5-4.5S12.5 10 12.5 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/></svg>
          )}
          {/* Le pseudonyme est le SEUL élément de la barre dont la largeur ne se connaît
              pas d'avance (jusqu'à 6rem). À l'étroit il s'efface : c'est ce qui rend la
              tenue de la barre calculable, et non dépendante de la longueur d'un nom. */}
          {!pseudoMasque && <span style={{ maxWidth: "6rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pseudo ?? user.email.split("@")[0]}</span>}
          <span style={{ fontSize: "0.625rem", opacity: 0.6 }}>▼</span>
        </button>
      )}
      <div style={mobile ? { display: "flex", flexDirection: "column", gap: "2px", background: "rgba(255,255,255,0.06)", borderRadius: "8px", overflow: "hidden" } : { position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--cs-surface)", border: "1px solid var(--cs-bord)", borderRadius: "8px", boxShadow: "var(--cs-ombre-flottante)", minWidth: "190px", zIndex: 3100, overflow: "hidden", display: menuOuvert ? "block" : "none" }}>
        {!mobile && (
          <div style={{ display: "flex", alignItems: "center", gap: "9px", padding: "10px 14px 9px", borderBottom: "1px solid var(--cs-fond-doux)" }}>
            <PortraitLecteur refPortrait={portrait} cadrage={cadragePortrait} initiale={pseudo ?? user.email} taille={30} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: "0.6875rem", color: "var(--cs-texte-doux)", margin: 0 }}>Connecté en tant que</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--cs-encre)", fontWeight: 500, margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pseudo ?? user.email}</p>
            </div>
          </div>
        )}
        {[
          // ⚠️ La page publique vient EN PREMIER, et son nom vient de la table des
          // rubriques (app/lib/espaceLecteurNavigation.ts) : le menu et la colonne de
          // /compte la nomment donc pareil, quoi qu'il advienne de l'une ou de l'autre.
          // Elle s'appelait « Ma page », entre « Mon compte » et « Mes citations », et
          // rien ne disait qu'elle menait à ce que les autres voient.
          ...(pagePublique ? [{ href: pagePublique.href, label: pagePublique.label, badge: 0, icone: "sortant" }] : []),
          { href: "/compte", label: "Réglages du compte", badge: 0, icone: null },
          { href: "/prelevements", label: "Mes citations", badge: 0, icone: null },
          // Le lien Administration reste toujours accessible à un vrai admin, quel que
          // soit l'état de l'interrupteur d'affichage « mode utilisateur standard ».
          ...((estAdmin || estAdminEmail) ? [{ href: "/admin", label: "Administration", badge: nbActionsAdmin + nbVerifAdmin, icone: "epee" }] : []),
        ].map(item => (
          <Link key={item.href} href={item.href} onClick={() => { setMenuOuvert(false); setMobileOuvert(false) }}
            {...(item.icone === "sortant" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            style={mobile
              ? { display: "flex", alignItems: "center", gap: "7px", padding: "10px 12px", fontSize: "0.9375rem", color: "rgba(255,255,255,0.85)", textDecoration: "none" }
              : { display: "flex", alignItems: "center", gap: "7px", padding: "10px 14px", fontSize: "0.875rem", color: "var(--cs-encre)", textDecoration: "none", borderBottom: "1px solid var(--cs-fond-doux)" }}>
            {/* Administration : plus d'icône ; libellé simplement mis en vert (menu desktop). */}
            <span style={item.icone === "epee" && !mobile ? { color: "var(--cs-vert)", fontWeight: 600 } : undefined}>{item.label}</span>
            {/* ⚠️ La page publique s'ouvre à part, et l'icône le DIT : sans elle, un
                onglet qui surgit passe pour une bizarrerie. Même dessin que dans la
                colonne de /compte, pour que la même entrée se reconnaisse. */}
            {item.icone === "sortant" && (
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.55 }}>
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {item.badge > 0 && (
              <span style={{ marginLeft: '4px', fontSize: '0.6875rem', background: 'var(--cs-danger-aplat)', color: 'var(--cs-sur-aplat)', borderRadius: '8px', padding: '1px 6px', fontWeight: 700 }}>{item.badge}</span>
            )}
          </Link>
        ))}
        {/* Mode sombre — un réglage de LECTURE, rangé avec le compte parce que c'est
            là que le lecteur vient chercher ce qui le concerne lui, et non le corpus.
            Il n'a donc pas d'entrée dans la barre : celle-ci est déjà la plus disputée
            du site, et un cran de repli de plus la rendrait incalculable.

            ⚠️ La rangée est un `div` et non un `label`. Un `<button>` n'est PAS un
            élément étiquetable : enveloppé dans un `<label>`, il en recevait le
            curseur de pointeur sans en recevoir le clic, si bien que le mot « Mode
            sombre » avait l'air cliquable et ne l'était pas. On porte donc le clic
            sur la rangée elle-même, et le bouton arrête sa propagation pour ne pas
            basculer deux fois. */}
        <div
          onClick={basculerThemeSombre}
          style={mobile
            ? { display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", fontSize: "0.9375rem", color: "rgba(255,255,255,0.85)", cursor: "pointer", userSelect: "none" }
            : { display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", fontSize: "0.875rem", color: "var(--cs-encre)", cursor: "pointer", userSelect: "none", borderBottom: "1px solid var(--cs-fond-doux)" }}>
          <span style={{ flex: 1 }}>Mode sombre</span>
          <button type="button" role="switch" aria-checked={themeSombre}
            onClick={e => { e.stopPropagation(); basculerThemeSombre() }}
            aria-label="Mode sombre"
            style={{
              width: "32px", height: "18px", borderRadius: "999px", cursor: "pointer", padding: 0, flexShrink: 0, position: "relative",
              border: mobile ? "1px solid rgba(255,255,255,0.35)" : "none",
              background: themeSombre ? "var(--cs-vert-aplat)" : (mobile ? "rgba(255,255,255,0.22)" : "var(--cs-bord)"),
              transition: "background 0.15s",
            }}>
            {/* Le panneau mobile est vert sombre EN TOUTES CIRCONSTANCES : son pion ne
                peut pas prendre --cs-surface, qui virerait au brun en Cuir et
                disparaîtrait sur le vert. */}
            <span style={{ position: "absolute", top: "3px", left: themeSombre ? "15px" : "3px", width: "12px", height: "12px", borderRadius: "50%", background: mobile ? "#fff" : "var(--cs-surface)", transition: "left 0.15s" }} />
          </button>
        </div>
        <button onClick={seDeconnecter}
          style={mobile
            ? { display: "block", width: "100%", textAlign: "left", padding: "10px 12px", fontSize: "0.9375rem", color: "var(--cs-danger-bord)", background: "none", border: "none", cursor: "pointer" }
            : { width: "100%", textAlign: "left", padding: "10px 14px", fontSize: "0.875rem", color: "var(--cs-danger-fonce)", background: "none", border: "none", cursor: "pointer" }}>
          Se déconnecter
        </button>
      </div>
      {!mobile && menuOuvert && <div style={{ position: "fixed", inset: 0, zIndex: 3090 }} onClick={() => setMenuOuvert(false)} />}
    </div>
  ) : (
    <Link href="/chantier" onClick={() => setMobileOuvert(false)} style={mobile
      ? { display: "block", textAlign: "center", padding: "9px 12px", borderRadius: "8px", fontSize: "0.9375rem", color: "var(--cs-sur-aplat)", textDecoration: "none", border: "1px solid rgba(255,255,255,0.25)" }
      : { display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.25rem 0.6875rem", borderRadius: "4px", fontSize: "0.875rem", color: "rgba(255,255,255,0.75)", textDecoration: "none", border: "1px solid rgba(255,255,255,0.20)" }}>
      Se connecter
    </Link>
  );

  // Lien du menu mobile (liste verticale dépliée sous la barre).
  // ⚠️ `embleme` n'est pas un ornement de plus : sur un téléphone il n'y a pas de
  // survol, donc pas de glose, et le dessin est alors le seul indice de ce que la
  // page contient. Le panneau garde une ligne par entrée — quinze entrées à deux
  // lignes en feraient un rouleau.
  const lienMobile = (href: string, label: string, embleme = false) => {
    const chemin = href.split("?")[0] || "/";
    const actif = pathname === chemin || (chemin !== "/" && pathname.startsWith(chemin));
    return (
      <Link key={href} href={href} onClick={() => setMobileOuvert(false)}
        aria-current={actif ? "page" : undefined}
        // `display: block` OBLIGATOIRE hors emblème : dans les groupes d'« Administration »,
        // les liens sont enfants d'un <div> bloc (et non du flex-colonne principal) ; sans
        // cela, les <a> restent inline et se chevauchent (pastilles superposées, texte
        // illisible). Avec un emblème, le flex range les deux sur une ligne.
        style={{ display: embleme ? "flex" : "block", alignItems: "center", gap: "10px", padding: "9px 10px", borderRadius: "8px", fontSize: "1rem", color: "var(--cs-sur-aplat)", textDecoration: "none", background: actif ? "rgba(255,255,255,0.12)" : "transparent" }}>
        {embleme && <EmblemeNavigation href={chemin} taille={18} />}
        {label}
      </Link>
    );
  };
  const styleSectionMobile: React.CSSProperties = { fontSize: "0.65625rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", margin: "8px 10px 2px" };

  return (
    <>
      {/* `data-cs-navbar` sert de prise à la page d'ouverture, qui se passe de
          barre de navigation : rien à naviguer tant que le site est fermé. */}
      <header data-cs-navbar className="fixed top-0 left-0 right-0 border-b"
        style={{ background: "var(--cs-barre-fond)", borderColor: "rgba(255,255,255,0.10)", zIndex: 3000 }}>
        <style>{`
          /* Jauge de la vignette de notification : elle se vide de la droite vers la
             gauche pendant la durée d'affichage. On anime la transformation, pas la largeur :
             pas de recalcul de mise en page à chaque image. La durée est posée en
             ligne, depuis DUREE_TOAST_MS, pour qu'elle ne puisse pas diverger. */
          /* Aucun onglet ne rétrécit : « Les Saintes Écritures » se laissait tronquer en
             « Les Sain… » (la face Bible est en overflow:hidden), ce qui masquait le
             débordement au lieu de le montrer — et rendait la mesure aveugle. Le trop-plein
             doit se voir pour être mesuré, puis résorbé en repliant les outils. */
          .cs-nav-principale > * { flex-shrink: 0; }

          @keyframes cs-toast-jauge { from { transform: scaleX(1) } to { transform: scaleX(0) } }
          .cs-toast-jauge {
            transform-origin: left center;
            animation-name: cs-toast-jauge;
            animation-timing-function: linear;
            animation-fill-mode: forwards;
          }
          /* Mouvement réduit : la jauge cesse de courir, mais reste visible — c'est
             une indication de durée, pas une décoration. */
          @media (prefers-reduced-motion: reduce) {
            .cs-toast-jauge { animation: none; transform: scaleX(1) }
          }

          /* Onglets de la barre. Le fond vient des variables posées en ligne par
             styleLien : la classe peut ainsi le reprendre au survol, ce qu'un fond
             écrit en ligne aurait rendu impossible.
             La montée est un peu plus lente que la descente — l'éclaircissement se
             pose doucement sous le curseur, mais la barre s'éteint sans traîner
             quand on la quitte.

             ⛔ « cs-nav-onglet », et non « cs-onglet » : ce dernier appartient depuis
             le modèle unique d'onglets de PAGE (globals.css, .cs-onglets) à des boutons
             qui se partagent une barre en parts égales — flex: 1. Les liens de la barre
             de navigation portaient le même nom, et ont hérité de ce partage :
             « Communauté », seul onglet primaire rendu en lien NU (les autres sont
             enveloppés d'un span), était le seul enfant direct du flex de la barre à
             porter la classe, et s'étalait donc sur toute la place restante — 204,8 px
             mesurés pour un mot qui en demande 95. Il en tenait aussi un filet bas de
             2 px et un décalage de −1 px, faits pour souligner un onglet retenu.
             Deux dessins sans rapport ne partagent pas un nom de classe. */
          .cs-nav-onglet {
            background: var(--fond, transparent);
            transition: background 260ms cubic-bezier(.33,.68,.36,1),
                        color 200ms cubic-bezier(.33,.68,.36,1);
          }
          .cs-nav-onglet:hover {
            background: var(--fond-survol, rgba(255,255,255,0.085));
            color: var(--cs-sur-aplat);
            transition-duration: 140ms;
          }
          /* Onglet « Bible » fendu — le SEUL palier « fendu » (cran 1), où l'intitulé dit
             « Les Saintes Écritures ». Au repos, un onglet plat comme les autres liens de la
             barre : ni cadre ni fond qui le détachent. Au survol la face s'efface et laisse
             paraître SUR PLACE « Classique » et « Polyglotte » — la barre ne bouge pas.

             ⛔ La face ne dimensionne PAS le bloc à elle seule. Elle le faisait, en flux
             normal, pendant que les deux segments étaient en « position:absolute » : ils se
             trouvaient donc bornés à SA largeur, et rognés par l'« overflow:hidden » dès qu'ils
             la dépassaient. Le défaut restait invisible tant que la face disait « Les Saintes
             Écritures », plus large que les deux segments réunis. Il paraissait sous « La
             Bible », moitié moins large : « Polyglotte », qui vient en second, se faisait
             couper. C'était donc un défaut de LARGEUR DE FENÊTRE, ce qui le rendait
             intermittent, et proprement incompréhensible pour qui le rencontrait.

             Les deux faces occupent maintenant LA MÊME cellule de grille. Elles se superposent
             toujours, mais aucune ne sort du flux : le bloc prend la largeur de la PLUS LARGE
             des deux et plus rien ne peut être rogné. Cette largeur ne change pas au survol,
             donc la barre ne bouge toujours pas.

             ⚠️ C'est la même mesure qui interdit d'aller plus bas AVEC la fente : sous un
             intitulé court, ce sont les segments qui mesurent l'onglet, et le raccourcir ne
             rend plus un pixel. Les paliers suivants passent donc au menu déroulant, qui sort
             du flux (cf. OngletBibles). */
          /* overflow:hidden — les surbrillances internes (survol des segments, segment
             actif) sont rognées par le rayon du conteneur : plus de coins carrés qui débordent
             sur les angles arrondis. */
          .cs-bible { position: relative; display: inline-grid; grid-template-columns: auto; border-radius: 4px; overflow: hidden; transition: background 220ms ease-in-out; }
          .cs-bible > * { grid-area: 1 / 1; }
          .cs-bible:hover, .cs-bible:focus-within { background: rgba(255,255,255,0.085); }
          .cs-bible-face { display: inline-flex; align-items: center; justify-content: center; padding: 0.25rem 0.5rem; color: rgba(255,255,255,0.85); font-weight: 600; font-size: 0.9375rem; letter-spacing: 0.01em; text-decoration: none; white-space: nowrap; transition: opacity 220ms ease-in-out; }
          .cs-bible:hover .cs-bible-face, .cs-bible:focus-within .cs-bible-face { opacity: 0; pointer-events: none; }
          .cs-bible-split { display: flex; opacity: 0; pointer-events: none; transition: opacity 220ms ease-in-out; }
          .cs-bible:hover .cs-bible-split, .cs-bible:focus-within .cs-bible-split { opacity: 1; pointer-events: auto; }
          .cs-bible-seg { flex: 1; display: flex; align-items: center; justify-content: center; padding: 0 0.375rem; color: rgba(255,255,255,0.82); font-size: 0.75rem; font-weight: 500; text-decoration: none; white-space: nowrap; transition: background 160ms ease, color 160ms ease; }
          .cs-bible-seg:hover { background: rgba(255,255,255,0.13); color: var(--cs-sur-aplat); }
          .cs-bible-seg + .cs-bible-seg { box-shadow: inset 1px 0 0 rgba(255,255,255,0.16); }
          .cs-bible-seg--actif { color: var(--cs-sur-aplat); background: rgba(255,255,255,0.10); }
          /* ── LA BOÎTE COMMUNE AUX QUATRE MENUS DÉROULANTS DE LA BARRE ──
             Les bibles, Patristique, Aller plus loin, Administration : même cadre, même
             ombre, même rembourrage, même façon de s'ouvrir. Seule la LARGEUR les
             distingue, parce que leur contenu la commande (variantes plus bas).

             ⛔ Le menu ne s'ouvre PLUS sur :hover : une règle de survol ne connaît que la
             POSITION du curseur, quand tout se joue ici sur sa VITESSE — une main qui file
             ne doit rien ouvrir, fût-elle sur l'onglet (voir VITESSE_POSE_PX_MS, plus
             haut). C'est OngletMenu qui pose .cs-plus--ouvert et qui l'ôte. Le menu reste
             collé sous le déclencheur : aucun vide à franchir pour l'atteindre.

             ⛔ Le menu ne peut PAS déborder de l'écran, et « Administration » en compte dix-sept
             entrées réparties en trois familles. Il était en overflow:hidden, donc ce qui
             dépassait du bas de la fenêtre était simplement inatteignable : sur un écran bas, les
             dernières familles n'existaient plus, sans que rien ne le dise. Le menu se borne
             maintenant à la hauteur disponible sous la barre et défile. Le plafond se compose sur
             HAUTEUR_NAVBAR, jamais sur un nombre recopié (cf. AGENTS.md, § Responsive), et le
             dernier terme laisse respirer le bas de la fenêtre.

             overscroll-behavior:contain — sans lui, la molette poursuivie au bas de la liste
             emporte la PAGE, et le menu se ferme sous le curseur qui a bougé avec elle. */
          .cs-plus { position: relative; display: inline-flex; }
          .cs-plus-menu { position: absolute; top: 100%; left: 0; min-width: 13rem; background: var(--cs-surface); border: 1px solid var(--cs-bord); border-radius: 8px; box-shadow: var(--cs-ombre-modale); overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; max-height: calc(100dvh - ${HAUTEUR_NAVBAR} - 1.5rem); z-index: 3000; padding: 3px; display: none; }
          /* ⚠️ DEUX RÈGLES, et non une seule à deux sélecteurs : un navigateur qui
             ignore :has() jette la déclaration ENTIÈRE dès qu'un sélecteur inconnu
             figure dans la même liste — les menus ne s'ouvriraient plus du tout, souris
             comprise. Séparées, seule la seconde tombe.

             :focus-visible et non :focus-within : au clavier le menu doit s'ouvrir
             sans attendre, mais un clic de SOURIS sur l'onglet laisse lui aussi le lien
             focalisé, et :focus-within gardait alors le menu ouvert sur la page qu'on
             venait d'appeler, le curseur parti depuis longtemps. */
          .cs-plus--ouvert > .cs-plus-menu { display: block; }
          .cs-plus:has(:focus-visible) > .cs-plus-menu { display: block; }
             /* Interlignage POSÉ, et non hérité : c'est lui qui gouverne la hauteur d'une
             rangée, et sans lui le resserrement des rembourrages se serait fait manger par
             un interlignage de confort dont la valeur ne se lisait nulle part. */
          .cs-plus-lien { display: block; padding: 4px 11px; font-size: 0.8125rem; line-height: 1.32; color: var(--cs-encre); text-decoration: none; border-radius: 4px; white-space: nowrap; }
          .cs-plus-lien:hover { background: rgba(var(--cs-vert-rgb),0.08); }
             /* Les deux portes de l'administration. La graisse suffit à les lever d'une liste
             de dix-sept : ni couleur, ni puce, ni place à part, qui déferaient l'ordre des
             familles. */
          .cs-plus-lien--fort { font-weight: 600; }
          /* ── Le menu qui EXPLIQUE ──
             Une entrée y tient sur deux lignes : ce que la page s'appelle, et ce
             qu'elle contient, précédées d'un emblème au trait. ⛔ Classe à part, et
             non un élargissement de .cs-plus-lien : le menu de l'administration
             partage ce dernier et n'a rien à faire de dix-sept entrées à rallonge.
             ⚠️ La phrase S'ENROULE, donc le menu se borne en largeur : sans
             maximum, il s'étirerait à la plus longue et couvrirait la moitié de
             la barre. */
          .cs-plus-menu--riche { max-width: 24rem; padding: 5px; }
          /* Seule la largeur MINIMALE sépare les deux menus qui glosent : cinq pages
             décrites d'un côté, quelques titres d'œuvres de l'autre. */
          .cs-plus-menu--pages { min-width: 21rem; }
          .cs-plus-menu--oeuvres { min-width: 17rem; }
          /* Deux entrées de deux mots : la boîte des bibles se borne à sa mesure. */
          .cs-plus-menu--bibles { min-width: 9.5rem; }
          .cs-plus-riche {
            display: flex; align-items: flex-start; gap: 10px;
            padding: 7px 10px; border-radius: 4px; text-decoration: none;
          }
          .cs-plus-riche:hover { background: rgba(var(--cs-vert-rgb),0.08); }
          /* L'emblème se cale sur la LIGNE DE BASE du nom, non sur le haut de la
             boîte : posé au ras, il flotte au-dessus du texte qu'il annonce. */
          .cs-plus-riche-emb { display: flex; padding-top: 2px; color: var(--cs-vert); }
          .cs-plus-riche:hover .cs-plus-riche-emb { color: var(--cs-vert-fonce); }
          .cs-plus-riche-texte { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
          .cs-plus-riche-nom { font-size: 0.8125rem; line-height: 1.3; color: var(--cs-encre); }
          /* Un TITRE D'ŒUVRE, non un nom de page : il prend le romain à empattements du
             site, comme partout ailleurs où une œuvre est nommée. */
          .cs-plus-riche-nom--oeuvre { font-family: var(--font-source-serif), Georgia, serif; }
          /* L'entrée par laquelle on entre presque toujours. ⛔ Ni couleur, ni puce,
             ni place à part : la graisse SEULE la lève, comme les deux entrées fortes
             du menu d'administration. Un menu ne fabrique pas de bouton. */
          .cs-plus-riche-nom--fort { font-weight: 600; }
          /* ⚠️ La glose ne se met pas en italique : à onze pixels et sur deux
             lignes, l'italique se lit moins bien qu'un gris franc, et le site
             réserve l'italique aux titres cités. */
          .cs-plus-riche-dit {
            font-size: 0.6875rem; line-height: 1.35; color: var(--cs-texte-gris);
            white-space: normal;
          }
          .cs-plus-sep { height: 1px; background: var(--cs-fond-doux); margin: 3px 6px; }
          /* Le mot qui tient la place quand un menu n'a encore rien à montrer. Ni
             rembourrage de lien ni surbrillance : il ne se clique pas. */
          .cs-plus-vide { padding: 4px 12px 8px; font-size: 0.6875rem; line-height: 1.35; color: var(--cs-texte-gris); margin: 0; }
          /* Intertitre d'un menu — familles d'administration, « Dernières œuvres
             consultées ». Les deux menus le portaient à deux tailles et deux approches
             différentes ; une seule mesure désormais. La COULEUR, elle, reste au menu :
             chaque famille d'administration a la sienne, quand les œuvres gardent le gris. */
          .cs-plus-titre { font-size: 0.5625rem; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--cs-texte-faible); padding: 6px 12px 2px; margin: 0; }
          /* Familles d'administration : l'intertitre prend la couleur du domaine (posée
             en ligne), et un filet de la même couleur borde chaque entrée. */
          .cs-admin-fam { opacity: 0.9; }
          .cs-admin-lien { margin-left: 4px; padding-left: 10px; border-radius: 0 4px 4px 0; }
          @media (prefers-reduced-motion: reduce) {
            .cs-nav-onglet, .cs-bible, .cs-bible-face, .cs-bible-split { transition: none; }
          }
        `}</style>
        {/* Plus de `max-w-screen-xl mx-auto` : la barre bridait sa largeur à 1 280 px et
            se centrait, si bien qu'au-delà elle se serrait — et débordait — alors que
            l'écran offrait la place de part et d'autre. Elle prend maintenant toute la
            largeur, ce qui ramène du même coup le titre contre le bord gauche. */}
        <div className="w-full px-4 flex items-center gap-3" style={{ height: "3.5rem" }}>

          <Link href="/accueil" className="flex items-center gap-1.5 shrink-0"
            title={nomSiteMasque ? "Corpus Scriptura" : undefined}
            aria-label={nomSiteMasque ? "Corpus Scriptura, retour à l’accueil" : undefined}
            style={{ color: "rgba(255,255,255,0.93)", textDecoration: "none" }}>
            {/* Le monogramme du site remplace le fleuron ✦. En crème plutôt qu'en
                encre, la barre étant verte, et en <img> : l'optimiseur de Next
                aplatit par intermittence la couche alpha sur du blanc (charte,
                « Les ornements se DÉTOURENT »), et l'on verrait le rectangle. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/monogramme-creme.png" alt="" aria-hidden="true"
              style={{ height: "1.875rem", width: "auto", display: "block", opacity: 0.92 }} />
            {/* Dernier cran de repli : le nom et sa mention de version s'effacent, et le
                monogramme porte seul le retour à l'accueil. Le nom complet revient alors en
                infobulle sur le lien, posée plus haut. */}
            {!nomSiteMasque && (
              <>
                <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1.1875rem", fontWeight: 600, letterSpacing: "0.01em" }}>Corpus Scriptura</span>
                {/* « bêta » sobre : un petit mot en italique, posé contre le nom, sans cercle
                    ni capitales — un simple murmure de version. */}
                <span title="Version bêta" aria-label="Version bêta"
                  style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.8125rem", fontStyle: "italic", lineHeight: 1, color: "rgba(255,255,255,0.72)", position: "relative", top: "1.5px" }}>bêta</span>
              </>
            )}
          </Link>

          {/* ── Navigation desktop ──────────────────────────────────────────────
              Seuil du hamburger : `lg` (1024px), conservé. Entièrement repliée, la barre
              d'un admin connecté mesurait 52,5 rem (841px) : elle tient partout dès 1024px,
              et le palier desktop n'a donc pas besoin d'un plancher plus haut — c'est le
              repli qui fait le travail. Le cran 0 est en revanche plus large qu'avant (les
              deux bibles en toutes lettres, le champ de recherche à son maximum) : c'est
              voulu, il est l'état des très grands écrans, et la barre descend d'elle-même
              les crans un par un partout ailleurs, sans jamais en prendre plus qu'il ne
              faut. ⚠️ Les chiffres ci-dessus datent de la composition précédente : les
              remesurer avant de s'en servir pour décider quoi que ce soit. */}
          <nav ref={navRef} aria-label="Navigation principale" className="cs-nav-principale hidden lg:flex flex-1 items-center gap-1 min-w-0">
            {/* Les deux bibles, en quatre états selon la place : deux onglets, un onglet
                qui se fend au survol, puis « La Bible » et « Bible » avec menu déroulant. */}
            <OngletBibles etat={etatBible} pathname={pathname} styleLien={styleLien} />
            {LIENS_PRIMAIRES.map(({ href, label, exact, discret }) => (
              href === "/bibliotheque"
                ? <OngletPatristique key={href} href={href} label={label} style={styleLien(href, exact, !discret)} actif={estCheminActif(href, exact)} />
                : href === "/librairies"
                // « Aller plus loin » garde sa place à toute largeur : c'est une entrée de
                // lecture, et elle ne se range pas sous un nom de compte.
                ? <OngletAllerPlusLoin key={href} label={label} style={styleLien(href, exact, !discret)} actif={estCheminActif(href, exact)} />
                : <Link key={href} href={href} className="cs-nav-onglet" aria-current={estCheminActif(href, exact) ? "page" : undefined} style={styleLien(href, exact, !discret)}>{label}</Link>
            ))}
            {(estAdmin || estAdminEmail) && (
              <OngletAdministration label="Administration" style={styleLien("/admin", false, true)} actif={estCheminActif("/admin", false)} />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "0.25rem", paddingLeft: "0.5rem", minWidth: 0, borderLeft: "1px solid rgba(255,255,255,0.30)", boxShadow: "inset 1px 0 0 rgba(0,0,0,0.08)" }}>
              {/* Le champ de recherche est le plus large des outils (13,75rem) : c'est lui
                  qui cède le premier. À l'étroit il se replie en loupe et se déploie sous la
                  barre, sur toute sa largeur — la même vue que sur téléphone. */}
              {rechercheRepliee ? (
                <button type="button" onClick={() => setRechercheDeployee(v => !v)}
                  aria-label="Rechercher" aria-expanded={rechercheDeployee}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "1.875rem", height: "1.875rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.22)", background: rechercheDeployee ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.82)", cursor: "pointer", padding: 0, flexShrink: 0, transition: "background 0.13s" }}>
                  <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <circle cx="5" cy="5" r="3.6" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M7.7 7.7L10.6 10.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </button>
              ) : blocRecherche(false)}
            </div>
          </nav>

          {/* ── Compte desktop ──────────────────────────────────────────────── */}
          <div className="hidden lg:flex items-center" style={{ marginLeft: "auto", flexShrink: 0, gap: "0.125rem", paddingLeft: "0.25rem" }}>
            {toggleAdmin(false)}
            {(estAdmin || estAdminEmail) && (
              <span aria-hidden="true" style={{ width: "1px", height: "20px", margin: "0 4px", background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.24), transparent)" }} />
            )}
            {/* À l'étroit, le cœur seul : l'intitulé revient en infobulle. */}
            <Link href="/soutenir" style={soutenirCompact
              ? { ...styleLienDiscret("/soutenir"), padding: "0.25rem 0.4375rem" }
              : styleLienDiscret("/soutenir")}
              title={soutenirCompact ? "Soutenir le projet" : undefined}
              aria-label={soutenirCompact ? "Soutenir le projet" : undefined}>
              <IconCoeur />{!soutenirCompact && " Soutenir le projet"}
            </Link>
            {user && (
              <span aria-hidden="true" style={{ width: "1px", height: "20px", margin: "0 2px", background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.24), transparent)" }} />
            )}
            {user && (
              <button onClick={() => setMessagerieOuverte(v => !v)} aria-label="Messages" aria-expanded={messagerieOuverte} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '8px', border: 'none', cursor: 'pointer', padding: 0, color: nbMessages > 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.58)', background: nbMessages > 0 ? 'rgba(255,255,255,0.14)' : 'transparent', transition: 'background 0.13s, color 0.13s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(255,255,255,0.95)' }}
                onMouseLeave={e => { e.currentTarget.style.background = nbMessages > 0 ? 'rgba(255,255,255,0.14)' : 'transparent'; e.currentTarget.style.color = nbMessages > 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.58)' }}>
                <IconParchemin />
                {nbMessages > 0 && (
                  <span style={{ position: 'absolute', top: '-1px', right: '-2px', minWidth: '14px', height: '14px', background: 'var(--cs-danger-aplat)', color: 'var(--cs-sur-aplat)', borderRadius: '8px', fontSize: '0.625rem', fontWeight: 700, lineHeight: '14px', textAlign: 'center', padding: '0 3px', boxSizing: 'border-box' }}>
                    {nbMessages > 99 ? '99+' : nbMessages}
                  </span>
                )}
              </button>
            )}
            {user && (
              <button type="button" onClick={() => setNotifsOuvertes(o => !o)} aria-label="Notifications" aria-expanded={notifsOuvertes}
                style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '8px', border: 'none', cursor: 'pointer', color: (nbNotifications > 0 || notifsOuvertes) ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.58)', background: (nbNotifications > 0 || notifsOuvertes) ? 'rgba(255,255,255,0.14)' : 'transparent', transition: 'background 0.13s, color 0.13s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(255,255,255,0.95)' }}
                onMouseLeave={e => { e.currentTarget.style.background = (nbNotifications > 0 || notifsOuvertes) ? 'rgba(255,255,255,0.14)' : 'transparent'; e.currentTarget.style.color = (nbNotifications > 0 || notifsOuvertes) ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.58)' }}>
                <IconAngeTrompette />
                {nbNotifications > 0 && (
                  <span style={{ position: 'absolute', top: '-1px', right: '-2px', minWidth: '14px', height: '14px', background: 'var(--cs-danger-aplat)', color: 'var(--cs-sur-aplat)', borderRadius: '8px', fontSize: '0.625rem', fontWeight: 700, lineHeight: '14px', textAlign: 'center', padding: '0 3px', boxSizing: 'border-box' }}>
                    {nbNotifications > 99 ? '99+' : nbNotifications}
                  </span>
                )}
              </button>
            )}
            {user && notifsOuvertes && <VoletNotifications uid={user.id} onFermer={() => setNotifsOuvertes(false)} />}
            <div style={{ position: "relative", marginLeft: "4px" }}>
              {blocCompte(false)}
            </div>
          </div>

          {/* ── Bouton hamburger mobile ─────────────────────────────────────── */}
          <button onClick={() => setMobileOuvert(!mobileOuvert)} className="lg:hidden"
            style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--cs-sur-aplat)", padding: "6px", cursor: "pointer" }}
            aria-label="Menu">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              {mobileOuvert ? (
                <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              ) : (
                <><line x1="3" y1="6" x2="17" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><line x1="3" y1="14" x2="17" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></>
              )}
            </svg>
          </button>
        </div>

        {/* ── Recherche dépliée sous la barre (palier étroit) ─────────────────── */}
        {rechercheRepliee && rechercheDeployee && (
          <div className="hidden lg:block" style={{ background: "var(--cs-barre-fond-profond)", borderTop: "1px solid rgba(255,255,255,0.10)", padding: "10px 16px 12px" }}>
            {blocRecherche(true)}
          </div>
        )}

        {/* ── Panneau mobile déplié ───────────────────────────────────────────── */}
        {mobileOuvert && (
          <div className="lg:hidden" style={{ background: "var(--cs-barre-fond-profond)", borderTop: "1px solid rgba(255,255,255,0.10)", padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {/* Liste verticale : lecture, puis Patristique/Publications, puis les pages
                  d'« Aller plus loin » dépliées, et enfin les sections d'admin. */}
              {/* ⚠️ Le premier lien est celui des bibles : il rouvre où l'on en était. */}
              {[...LIENS_LECTURE.map(l => (l.href === HREF_BIBLE_CLASSIQUE ? { ...l, href: hrefBibleMobile } : l)), ...LIENS_PRIMAIRES.filter(l => l.href !== "/librairies")].map(({ href, label }) => lienMobile(href, label))}

              <p style={styleSectionMobile}>Aller plus loin</p>
              {LIENS_ALLER_PLUS_LOIN.map(({ href, label }) => lienMobile(href, label, true))}

              {(estAdmin || estAdminEmail) && (
                <>
                  {/* Repliée par défaut : sur un téléphone, l'administration est l'exception,
                      la lecture la règle. Le chevron dit l'état ; le bouton porte la même
                      graisse que les autres intertitres pour ne pas se donner d'importance. */}
                  <button type="button" onClick={() => setAdminMobileOuvert(v => !v)}
                    aria-expanded={adminMobileOuvert} aria-controls="cs-admin-mobile"
                    style={{ ...styleSectionMobile, display: "flex", alignItems: "center", gap: "6px", width: "100%", background: "none", border: "none", cursor: "pointer", padding: "8px 10px 4px", textAlign: "left" }}>
                    Administration
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true"
                      style={{ opacity: 0.7, transform: adminMobileOuvert ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                      <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {adminMobileOuvert && (
                    <div id="cs-admin-mobile">
                      {FAMILLES_ADMIN.map(fam => {
                        const liens = entreesDeFamille(fam.cle);
                        return (
                          <div key={fam.cle}>
                            <p style={{ ...styleSectionMobile, color: fam.couleurMobile, fontSize: "0.5rem", marginTop: "9px" }}>{fam.label}</p>
                            {liens.map(({ href, label }) => lienMobile(href, label))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
            {blocRecherche(true)}
            <Link href="/soutenir" onClick={() => setMobileOuvert(false)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 10px", borderRadius: "8px", fontSize: "1rem", color: "var(--cs-sur-aplat)", textDecoration: "none" }}>
              <IconCoeur /> Soutenir le projet
            </Link>
            {toggleAdmin(true)}
            {blocCompte(true)}
          </div>
        )}
        {toastNotification && (
          <div key={toastNotification.id} role="button" tabIndex={0} onClick={() => { setToastNotification(null); setNotifsOuvertes(true); }}
            style={{ position: "fixed", top: "calc(3.5rem + 0.75rem)", right: "18px", width: "17.5rem", background: "var(--cs-surface)", border: "1px solid var(--cs-bord)", borderLeft: "3px solid var(--cs-vert-aplat)", borderRadius: "8px", boxShadow: "var(--cs-ombre-modale)", padding: "11px 13px 13px", zIndex: 4000, cursor: "pointer", overflow: "hidden" }}>
            <p style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cs-vert)", margin: "0 0 4px" }}>Nouvelle notification</p>
            <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1rem", color: "var(--cs-encre-fonce)", margin: "0 0 4px" }}>{toastNotification.titre}</p>
            <p style={{ fontSize: "0.8125rem", color: "var(--cs-texte-second)", lineHeight: 1.35, margin: 0 }}>{toastNotification.message}</p>
            {/* Jauge du temps restant : elle court sur toute la largeur, en pied de
                vignette, et se retire vers la gauche pendant les trois secondes. */}
            <div aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "2px", background: "rgba(var(--cs-vert-rgb),0.14)" }}>
              <div className="cs-toast-jauge" style={{ height: "100%", background: "var(--cs-vert-aplat)", animationDuration: `${DUREE_TOAST_MS}ms` }} />
            </div>
          </div>
        )}
      </header>
      {/* Messagerie EN FENÊTRE (plus une page) : ouverte depuis l'icône parchemin. */}
      {messagerieOuverte && <ModaleMessagerie ouvert onClose={() => { setMessagerieOuverte(false); }} />}
    </>
  );
}
