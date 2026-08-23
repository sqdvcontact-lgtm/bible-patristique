"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAffichageAdmin } from "@/app/lib/contexteAffichageAdmin";
import { LIVRES } from "@/app/lib/bible";
import { HAUTEUR_NAVBAR } from "@/app/lib/mesures";
import { lireOeuvresRecentes, type OeuvreRecente } from "@/app/lib/oeuvresRecentes";
import { sansPointFinal } from "@/app/lib/titres";
import { appliquerTheme, lireTheme } from "@/app/lib/theme";
import { chercherPericopes, referencePericope, correspondanceVisible, libelleCategoriePericope, type PericopeSearchResult } from "@/app/lib/pericopes";

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
const LIENS_LECTURE: { href: string; label: string; exact?: boolean }[] = [
  { href: "/?livre=GEN&chapitre=1", label: "Bible", exact: true },
  { href: "/polyglotte", label: "Polyglotte" },
];
const LIENS_PRIMAIRES: { href: string; label: string; exact?: boolean; discret?: boolean }[] = [
  { href: "/bibliotheque", label: "Patristique" },
  { href: "/essais", label: "Publications" },
  { href: "/traductions", label: "Aller plus loin", discret: true },
];
// Pages regroupées sous « Aller plus loin » : anciennement des onglets d'une même page,
// désormais des pages indépendantes. Le menu déroulant (au survol) les recense.
const LIENS_ALLER_PLUS_LOIN: { href: string; label: string }[] = [
  { href: "/traductions", label: "Les traductions" },
  { href: "/librairies", label: "Acheter des livres" },
  { href: "/statistiques", label: "Statistiques" },
  { href: "/pericopes", label: "Péricopes" },
  { href: "/histoire", label: "Histoire de l’Église" },
];
// Sections d'administration (menu déroulant « Administration », réservé aux admins) :
// chaque entrée ouvre /admin sur la section voulue. Bible 899 est un outil d'atelier
// rattaché à ce menu, ajouté après un séparateur.
// Familles d'administration, chacune sa couleur (division visuelle du menu).
const FAMILLES_ADMIN = [
  // `couleur` : menu déroulant (fond clair). `couleurMobile` : variante claire,
  // lisible sur le fond vert foncé du panneau mobile.
  { cle: "corpus",     label: "Corpus & catalogue",  couleur: "var(--cs-vert)", couleurMobile: "var(--cs-vert-clair)" },
  { cle: "communaute", label: "Communauté",           couleur: "var(--cs-or)", couleurMobile: "var(--cs-or-clair)" },
  { cle: "systeme",    label: "Système & doctrine",   couleur: "var(--cs-systeme)", couleurMobile: "var(--cs-systeme-clair)" },
] as const;
// `principal` : les deux entrées par lesquelles on entre presque toujours dans
// l'administration. Elles se distinguent par la GRAISSE, non par une place à part :
// l'ordre des familles reste celui du travail, et l'œil trouve seul ses deux portes
// dans une liste qui en compte dix-sept.
const LIENS_ADMIN: { href: string; label: string; famille: string; principal?: boolean }[] = [
  { href: "/admin/controle", label: "Centre de contrôle", famille: "corpus", principal: true },
  { href: "/admin?onglet=bibliotheque", label: "Bibliothèque", famille: "corpus", principal: true },
  { href: "/admin?onglet=controle-oeuvres", label: "Contrôle œuvres", famille: "corpus" },
  { href: "/admin?onglet=ouvrages", label: "Ouvrages", famille: "corpus" },
  { href: "/admin?onglet=validation-notices", label: "Validation notices", famille: "corpus" },
  { href: "/admin?onglet=traductions", label: "Traductions", famille: "corpus" },
  { href: "/admin?onglet=editeurs", label: "Éditeurs", famille: "corpus" },
  { href: "/admin?onglet=fiabilite", label: "Valeur académique", famille: "corpus" },
  { href: "/admin?onglet=evenements", label: "Chronologie", famille: "corpus" },
  { href: "/admin?onglet=essais", label: "Essais", famille: "communaute" },
  { href: "/admin?onglet=verifications", label: "Vérifications", famille: "communaute" },
  { href: "/admin?onglet=constituer-liens", label: "Constituer liens", famille: "communaute" },
  { href: "/admin?onglet=moderation", label: "Modération", famille: "communaute" },
  { href: "/admin?onglet=propositions", label: "Propositions", famille: "communaute" },
  { href: "/admin?onglet=charte", label: "Charte IA", famille: "systeme" },
  { href: "/admin?onglet=charte-accentuation", label: "Accentuation", famille: "systeme" },
];
// Bible 899 : outil d'atelier, rattaché à la famille « Système ».
const LIEN_BIBLE_899 = { href: "/manuscrits/bible-899", label: "Bible 899", famille: "systeme" };

// Couleurs de domaine pour la recherche rapide : chaque catégorie de résultats est
// rattachée à un grand domaine par une couleur FORTE (filet gauche + libellé + fond
// léger) — Bible (bleu), Patristique (vert), Publications (ocre). Les sous-ensembles
// d'un même domaine partagent la couleur et se distinguent plus légèrement (libellé
// + fins séparateurs).
const DOMAINE = {
  bible:        { base: "#3a5a8c", fond: "rgba(58,90,140,0.12)",  survol: "rgba(58,90,140,0.22)" },
  patristique:  { base: "var(--cs-vert)", fond: "rgba(var(--cs-vert-rgb),0.12)",  survol: "rgba(var(--cs-vert-rgb),0.20)" },
  publications: { base: "var(--cs-lacune)", fond: "rgba(154,106,46,0.13)", survol: "rgba(154,106,46,0.22)" },
  chronologie:  { base: "#6d5a86", fond: "rgba(109,90,134,0.12)", survol: "rgba(109,90,134,0.22)" },
} as const;

// ── Données statiques pour la recherche rapide ───────────────────────────────
const LIVRES_RECHERCHE = LIVRES.map(({ code, nom }) => ({ code, nom }));
const TRADUCTIONS_RECHERCHE: { code: string; nom: string }[] = [
  { code: 'TR0001', nom: 'Bible de Sacy' }, { code: 'TR0002', nom: 'Bible Segond' },
  { code: 'TR0003', nom: 'Bible Crampon' }, { code: 'TR0004', nom: 'Vulgate' },
];
function sansAccents(s: string): string { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() }

// Onglet \u00ab Patristique \u00bb : au survol, un menu d\u00e9roulant pr\u00e9sente les trois derni\u00e8res
// \u0153uvres consult\u00e9es (suivi local, cf. oeuvresRecentes). S'il n'y en a aucune, l'onglet
// se comporte comme un simple lien.
function OngletPatristique({ href, label, style }: { href: string; label: string; style: React.CSSProperties }) {
  const [ouvert, setOuvert] = useState(false);
  const [recentes, setRecentes] = useState<OeuvreRecente[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ouvrir = () => {
    if (timer.current) clearTimeout(timer.current);
    setRecentes(lireOeuvresRecentes(3));
    setOuvert(true);
  };
  const fermer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOuvert(false), 160);
  };
  return (
    <span style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={ouvrir} onMouseLeave={fermer}
      onFocus={ouvrir} onBlur={fermer}>
      <Link href={href} className="cs-onglet" style={style}>{label}</Link>
      {ouvert && recentes.length > 0 && (
        <div onMouseEnter={ouvrir} onMouseLeave={fermer}
          style={{ position: "absolute", top: "100%", left: 0, marginTop: "6px", minWidth: "15rem", maxWidth: "20rem", background: "var(--cs-surface)", border: "1px solid var(--cs-bord-clair)", borderRadius: "8px", boxShadow: "var(--cs-ombre-modale)", padding: "7px", zIndex: 3000 }}>
          <p style={{ fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--cs-texte-faible)", margin: "2px 8px 6px" }}>{"Derni\u00e8res \u0153uvres consult\u00e9es"}</p>
          {recentes.map(o => (
            <Link key={o.id} href={`/oeuvre/${o.id}`} onClick={() => setOuvert(false)}
              style={{ display: "block", padding: "6px 8px", borderRadius: "4px", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(var(--cs-vert-rgb),0.07)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <span style={{ display: "block", fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.75rem", color: "var(--cs-texte-second)", lineHeight: 1.2 }}>{sansPointFinal(o.titre)}</span>
              {o.auteur && <span style={{ display: "block", fontSize: "0.5625rem", color: "var(--cs-texte-faible)", fontStyle: "italic", marginTop: "1px" }}>{o.auteur}</span>}
            </Link>
          ))}
        </div>
      )}
    </span>
  );
}

// \u00ab Aller plus loin \u00bb : un menu d\u00e9roulant (Traductions + Histoire de l'\u00c9glise).
// Le clic sur le libell\u00e9 m\u00e8ne aux Traductions (utile au tactile, sans survol).
function OngletAllerPlusLoin({ label, style }: { label: string; style: React.CSSProperties }) {
  return (
    <span className="cs-plus" style={{ display: "inline-flex" }}>
      <Link href="/traductions" className="cs-onglet" style={{ ...style, display: "inline-flex", alignItems: "center", gap: "3px" }}>
        {label}
        <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ opacity: 0.55, flexShrink: 0 }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      <div className="cs-plus-menu cs-defilement-discret">
        {LIENS_ALLER_PLUS_LOIN.map(l => (
          <Link key={l.href} href={l.href} className="cs-plus-lien">{l.label}</Link>
        ))}
      </div>
    </span>
  );
}

// « Administration » : onglet réservé aux admins ; au survol, le menu recense chaque
// section d'admin (chacune ouvre /admin sur la bonne section), puis, après un filet,
// l'outil « Bible 899 ». Le clic sur le libellé ouvre /admin (section par défaut).
function OngletAdministration({ label, style }: { label: string; style: React.CSSProperties }) {
  return (
    <span className="cs-plus" style={{ display: "inline-flex" }}>
      <Link href="/admin" className="cs-onglet" style={{ ...style, display: "inline-flex", alignItems: "center", gap: "3px" }}>
        {label}
        <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ opacity: 0.55, flexShrink: 0 }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      <div className="cs-plus-menu cs-defilement-discret">
        {FAMILLES_ADMIN.map((fam, i) => {
          const liens = LIENS_ADMIN.filter(l => l.famille === fam.cle)
            .concat(fam.cle === "systeme" ? [LIEN_BIBLE_899] : []);
          return (
            <div key={fam.cle}>
              {i > 0 && <div className="cs-plus-sep" />}
              <div className="cs-admin-fam" style={{ color: fam.couleur }}>{fam.label}</div>
              {liens.map(l => (
                <Link key={l.href} href={l.href} className={`cs-plus-lien cs-admin-lien${l.principal ? " cs-plus-lien--fort" : ""}`} style={{ borderLeft: `2px solid ${fam.couleur}` }}>{l.label}</Link>
              ))}
            </div>
          );
        })}
      </div>
    </span>
  );
}

function normaliserExtrait(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function surlignerMatch(texte: string, query: string): React.ReactNode {
  if (!query) return texte
  const tN = normaliserExtrait(texte)
  const qN = normaliserExtrait(query)
  const idx = tN.indexOf(qN)
  if (idx < 0) return texte
  return (
    <>
      {texte.slice(0, idx)}
      <strong style={{ color: 'var(--cs-vert)', fontWeight: 700, background: 'rgba(var(--cs-vert-rgb),0.14)', borderRadius: '4px', padding: '0 1px' }}>{texte.slice(idx, idx + query.length)}</strong>
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
      {prefix ? '\u2026' : ''}{extrait.slice(0, mIdx)}<strong style={{ color: 'var(--cs-vert)', fontWeight: 700, background: 'rgba(var(--cs-vert-rgb),0.14)', borderRadius: '4px', padding: '0 1px' }}>{extrait.slice(mIdx, mIdx + q.length)}</strong>{extrait.slice(mIdx + q.length)}{suffix ? '\u2026' : ''}
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
// premier n'a pas suffi. Ce qui coûte le moins au lecteur cède le premier ; les mots
// des sections cèdent en dernier, et jamais tous ensemble.
//
//   1 — « Soutenir le projet » se réduit à son cœur, le mot « Admin » s'efface
//   2 — le pseudonyme s'efface, « Les Saintes Écritures » devient « La Bible »
//   3 — la recherche se replie en loupe et se déploie sous la barre
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
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [pseudo, setPseudo] = useState<string | null>(null);
  const [estAdmin, setEstAdmin] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [mobileOuvert, setMobileOuvert] = useState(false);
  // Faux au rendu SERVEUR et au premier rendu client, comme `useEstMobile` : le thème
  // réel est déjà posé sur <html> par le script du gabarit, on ne lit ici que de quoi
  // dessiner l'interrupteur. Partir de la valeur mémorisée ferait diverger les deux
  // rendus et React reprocherait l'hydratation.
  const [themeSombre, setThemeSombre] = useState(false);
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
  const titreBibleCourt = cran >= 2;
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
  const [oeuvresTrouvees, setOeuvresTrouvees] = useState<{ id_oeuvre: string; titre: string; auteurs: { nom: string } | null; note?: string | null }[]>([]);
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

  // Le thème est DÉJÀ posé sur <html> par le script du gabarit ; cet effet ne fait que
  // rattraper l'interrupteur au montage. Lire un système extérieur dans un effet est
  // ici le bon outil, et non un `set-state-in-effect` à corriger.
  useEffect(() => { setThemeSombre(lireTheme() === 'sombre') }, []);

  const basculerThemeSombre = () => {
    const sombre = !themeSombre;
    setThemeSombre(sombre);
    appliquerTheme(sombre ? 'sombre' : 'clair');
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
    if (!q) { setAuteursTrouves([]); setEssaisTrouves([]); setOeuvresTrouvees([]); setSegmentsTrouves([]); setEvenementsTrouves([]); setRechercheRapideLoading(false); setNbResultatsProgressif(0); setNbTotalReel(0); setRechercheTerminee(false); return; }
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
  // Préfixe de MOT (comme le reste de la recherche rapide) : « am » trouve « Amos »,
  // jamais « Samuel » (am au milieu). On teste le début de chaque mot du nom.
  const motCommencePar = (nom: string) => sansAccents(nom).split(/[\s'’-]+/).some(w => w.startsWith(qNorm));
  const livresTrouves = qNorm ? LIVRES_RECHERCHE.filter(l => motCommencePar(l.nom)).slice(0, 5) : [];
  const traductionsTrouvees = qNorm ? TRADUCTIONS_RECHERCHE.filter(t => motCommencePar(t.nom)) : [];

  // Navigation clavier : liste À PLAT de tous les rangs cliquables, dans l'ordre du menu
  // (mêmes tranches que le rendu). `id="nav-<cle>"` sur chaque rang pour le défilement.
  const itemsNavigables: { cle: string; href: string }[] = [];
  pericopes.forEach(p => itemsNavigables.push({ cle: `p:${p.pericope_id}`, href: `/pericopes/${p.pericope_id}` }));
  evenementsTrouves.forEach(e => itemsNavigables.push({ cle: `ev:${e.id}`, href: `/histoire#${e.id}` }));
  auteursTrouves.slice(0, 3).forEach(a => itemsNavigables.push({ cle: `au:${a.id_auteur}`, href: `/auteur/${a.id_auteur}` }));
  oeuvresTrouvees.slice(0, 3).forEach(o => itemsNavigables.push({ cle: `oe:${o.id_oeuvre}`, href: `/oeuvre/${o.id_oeuvre}` }));
  essaisTrouves.slice(0, 3).forEach(e => itemsNavigables.push({ cle: `es:${e.id}`, href: `/essais/${e.id}` }));
  livresTrouves.slice(0, 3).forEach(l => itemsNavigables.push({ cle: `li:${l.code}`, href: `/?livre=${l.code}&chapitre=1` }));
  traductionsTrouvees.slice(0, 3).forEach(t => itemsNavigables.push({ cle: `tr:${t.code}`, href: `/traductions#${t.code}` }));
  const cleActive = actifIndex >= 0 ? (itemsNavigables[actifIndex]?.cle ?? null) : null;
  useEffect(() => {
    document.querySelectorAll('[data-nav-actif]').forEach(el => el.removeAttribute('data-nav-actif'));
    if (cleActive) {
      const el = document.getElementById('nav-' + cleActive);
      if (el) { el.setAttribute('data-nav-actif', 'true'); el.scrollIntoView({ block: 'nearest' }); }
    }
  }, [cleActive]);
  const aucunResultat = !rechercheRapideLoading && !pericopesLoading && qNorm.length > 0 && auteursTrouves.length === 0 && oeuvresTrouvees.length === 0 && segmentsTrouves.length === 0 && livresTrouves.length === 0 && traductionsTrouvees.length === 0 && essaisTrouves.length === 0 && pericopes.length === 0 && evenementsTrouves.length === 0;

  const fermerRechercheRapide = () => { setRechercheOuverte(false); setRequeteRapide(""); setMobileOuvert(false); };
  const validerRechercheRapide = () => {
    if (!requeteRapide.trim()) return;
    router.push(`/recherche?q=${encodeURIComponent(requeteRapide.trim())}&mode=prefixe`);
    fermerRechercheRapide();
  };

  useEffect(() => {
    const chargerProfil = (uid: string) =>
      supabase.from('profils').select('pseudo, est_admin').eq('id', uid).maybeSingle().then(({ data }) => {
        setPseudo(data?.pseudo ?? null);
        setEstAdmin(data?.est_admin ?? false);
      });
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setUser(u ? { id: u.id, email: u.email ?? '' } : null);
      if (u) chargerProfil(u.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? '' } : null);
      if (session?.user) chargerProfil(session.user.id);
      else { setPseudo(null); setEstAdmin(false); setNbNotifications(0); setNbMessages(0); setNbActionsAdmin(0); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

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
          setToastNotification({ id: Date.now(), titre: n.titre, message: String(n.message || n.objet).slice(0, 120) })
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
    // de feuille, et `.cs-onglet:hover` n'aurait donc jamais pu s'appliquer. Il passe
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
        [data-nav-actif] { background: var(--cs-fond-doux) !important; }
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
          /* La largeur se prend sur la FENÊTRE, non sur une valeur fixe. À 13,75rem le
             champ était le plus large des outils, et le même à 1 024 px qu'à 2 400 : trop
             gourmand en bas, où il précipitait le repli de la barre, trop court en haut, où
             il restait un ruban étroit au milieu du vide. En `vw` il suit l'écran, de 154 px
             à 1 024 à 360 px à 2 400. Les deux bornes restent en rem, donc accordées à la
             police racine : le champ ne descend jamais sous une dizaine de caractères et ne
             s'étale pas jusqu'à faire concurrence aux sections. */
          style={{ width: mobile ? "100%" : "clamp(8.75rem, 15vw, 20rem)", height: "1.875rem", fontSize: "0.84375rem", padding: "0 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.10)", color: "var(--cs-sur-aplat)", outline: "none", boxSizing: "border-box", flex: mobile ? 1 : undefined }}
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
        <div style={{ position: mobile ? "static" : "absolute", marginTop: mobile ? "8px" : 0, top: "calc(100% + 8px)", left: 0, right: 0, width: mobile ? "100%" : "auto", background: "var(--cs-surface)", border: "1px solid var(--cs-bord)", borderRadius: "8px", boxShadow: mobile ? "none" : "0 12px 36px rgba(0,0,0,0.16)", zIndex: 100, overflow: "hidden", maxHeight: mobile ? "70vh" : "min(72vh, 640px)", overflowY: "auto" }}>

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
              {/* ── Péricopes (RPC) : section distincte, en tête. Domaine biblique (bleu). ── */}
              {(pericopesLoading || pericopes.length > 0 || (pericopesFait && !pericopesErreur) || pericopesErreur) && (
                <div style={{ padding: "5px 0 3px", borderLeft: `3px solid ${DOMAINE.bible.base}`, background: DOMAINE.bible.fond }}>
                  <p style={{ fontSize: "0.59375rem", fontWeight: 700, letterSpacing: "0.09em", color: DOMAINE.bible.base, textTransform: "uppercase", margin: "0 12px 2px" }}>Péricopes</p>
                  {pericopes.length > 0 ? (
                    pericopes.map((p, idx) => {
                      const ref = referencePericope(p);
                      const corr = correspondanceVisible(p);
                      const actif = idx === actifIndex;
                      return (
                        <Link key={p.pericope_id} id={`nav-p:${p.pericope_id}`} href={`/pericopes/${p.pericope_id}`} onClick={fermerRechercheRapide}
                          onMouseEnter={e => { e.currentTarget.style.background = DOMAINE.bible.survol; }}
                          onMouseLeave={e => { e.currentTarget.style.background = actif ? DOMAINE.bible.survol : "transparent"; }}
                          style={{ display: "block", padding: "3px 12px", textDecoration: "none", background: actif ? DOMAINE.bible.survol : "transparent" }}>
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
                    <p style={{ fontSize: "0.75rem", color: "var(--cs-texte-faible)", margin: "1px 12px 3px" }}>…</p>
                  ) : pericopesErreur ? (
                    <p style={{ fontSize: "0.71875rem", color: "var(--cs-texte-faible)", fontStyle: "italic", margin: "1px 12px 3px" }}>Recherche de péricopes momentanément indisponible.</p>
                  ) : (
                    <p style={{ fontSize: "0.71875rem", color: "var(--cs-texte-doux)", fontStyle: "italic", margin: "1px 12px 3px" }}>Aucune péricope trouvée.</p>
                  )}
                </div>
              )}
              {evenementsTrouves.length > 0 && (
                <div style={{ padding: "5px 0 3px", borderLeft: `3px solid ${DOMAINE.chronologie.base}`, background: DOMAINE.chronologie.fond }}>
                  <p style={{ fontSize: "0.59375rem", fontWeight: 700, letterSpacing: "0.09em", color: DOMAINE.chronologie.base, textTransform: "uppercase", margin: "0 12px 2px" }}>Chronologie</p>
                  {evenementsTrouves.map(e => {
                    const titrePropre = e.titre.replace(/\*{1,2}|\+\+|\^\^/g, '');
                    return (
                      <Link key={e.id} id={`nav-ev:${e.id}`} href={`/histoire#${e.id}`} onClick={fermerRechercheRapide}
                        style={{ display: "block", padding: "3px 12px", textDecoration: "none" }}
                        onMouseEnter={ev => (ev.currentTarget.style.background = DOMAINE.chronologie.survol)}
                        onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}>
                        <span style={{ display: "block", fontSize: "0.84375rem", lineHeight: 1.28, color: "var(--cs-encre)" }}>{surlignerMatch(titrePropre, requeteRapide.trim())}</span>
                        {e.date_affichage && <span style={{ display: "block", fontSize: "0.71875rem", color: "var(--cs-texte-doux)", lineHeight: 1.25 }}>{e.date_affichage}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
              {auteursTrouves.length > 0 && (
                <div style={{ padding: "5px 0 3px", borderLeft: `3px solid ${DOMAINE.patristique.base}`, background: DOMAINE.patristique.fond }}>
                  <p style={{ fontSize: "0.59375rem", fontWeight: 700, letterSpacing: "0.09em", color: DOMAINE.patristique.base, textTransform: "uppercase", margin: "0 12px 2px" }}>Auteurs</p>
                  {auteursTrouves.slice(0, 3).map(a => (
                    <Link key={a.id_auteur} id={`nav-au:${a.id_auteur}`} href={`/auteur/${a.id_auteur}`} onClick={fermerRechercheRapide}
                      style={{ display: "block", padding: "3px 12px", fontSize: "0.84375rem", lineHeight: 1.28, color: "var(--cs-encre)", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = DOMAINE.patristique.survol)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {surlignerMatch(a.nom, requeteRapide.trim())}
                    </Link>
                  ))}
                </div>
              )}
              {oeuvresTrouvees.length > 0 && (
                <div style={{ padding: "4px 0 3px", borderLeft: `3px solid ${DOMAINE.patristique.base}`, background: DOMAINE.patristique.fond, borderTop: auteursTrouves.length > 0 ? "1px solid rgba(var(--cs-vert-rgb),0.14)" : "none" }}>
                  <p style={{ fontSize: "0.59375rem", fontWeight: 700, letterSpacing: "0.09em", color: DOMAINE.patristique.base, textTransform: "uppercase", margin: "2px 12px 2px" }}>Œuvres patristiques</p>
                  {oeuvresTrouvees.slice(0, 3).map(o => (
                    <Link key={o.id_oeuvre} id={`nav-oe:${o.id_oeuvre}`} href={`/oeuvre/${o.id_oeuvre}`} onClick={fermerRechercheRapide}
                      style={{ display: "block", padding: "3px 12px", fontSize: "0.84375rem", lineHeight: 1.28, color: "var(--cs-encre)", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = DOMAINE.patristique.survol)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {surlignerMatch(o.titre, requeteRapide.trim())}
                      {o.auteurs?.nom && <span style={{ fontSize: "0.71875rem", color: "var(--cs-texte-doux)", marginLeft: "7px" }}>{o.auteurs.nom}</span>}
                    </Link>
                  ))}
                </div>
              )}
              {essaisTrouves.length > 0 && (
                <div style={{ padding: "4px 0 3px", borderLeft: `3px solid ${DOMAINE.publications.base}`, background: DOMAINE.publications.fond, borderTop: (auteursTrouves.length > 0 || oeuvresTrouvees.length > 0 || segmentsTrouves.length > 0) ? "1px solid rgba(154,106,46,0.16)" : "none" }}>
                  <p style={{ fontSize: "0.59375rem", fontWeight: 700, letterSpacing: "0.09em", color: DOMAINE.publications.base, textTransform: "uppercase", margin: "2px 12px 2px" }}>Essais et méditations</p>
                  {essaisTrouves.slice(0, 3).map(e => (
                    <Link key={e.id} id={`nav-es:${e.id}`} href={`/essais/${e.id}`} onClick={fermerRechercheRapide}
                      style={{ display: "block", padding: "3px 12px", fontSize: "0.84375rem", lineHeight: 1.28, color: "var(--cs-encre)", textDecoration: "none" }}
                      onMouseEnter={ev => (ev.currentTarget.style.background = DOMAINE.publications.survol)}
                      onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}>
                      {surlignerMatch(e.titre, requeteRapide.trim())}
                    </Link>
                  ))}
                </div>
              )}
              {livresTrouves.length > 0 && (
                <div style={{ padding: "4px 0 3px", borderLeft: `3px solid ${DOMAINE.bible.base}`, background: DOMAINE.bible.fond, borderTop: (auteursTrouves.length > 0 || oeuvresTrouvees.length > 0 || segmentsTrouves.length > 0 || essaisTrouves.length > 0) ? "1px solid rgba(58,90,140,0.16)" : "none" }}>
                  <p style={{ fontSize: "0.59375rem", fontWeight: 700, letterSpacing: "0.09em", color: DOMAINE.bible.base, textTransform: "uppercase", margin: "2px 12px 2px" }}>Livres bibliques</p>
                  {livresTrouves.slice(0, 3).map(l => (
                    <Link key={l.code} id={`nav-li:${l.code}`} href={`/?livre=${l.code}&chapitre=1`} onClick={fermerRechercheRapide}
                      style={{ display: "block", padding: "3px 12px", fontSize: "0.84375rem", lineHeight: 1.28, color: "var(--cs-encre)", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = DOMAINE.bible.survol)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {surlignerMatch(l.nom, requeteRapide.trim())}
                    </Link>
                  ))}
                </div>
              )}
              {traductionsTrouvees.length > 0 && (
                <div style={{ padding: "4px 0 6px", borderLeft: `3px solid ${DOMAINE.bible.base}`, background: DOMAINE.bible.fond, borderTop: (auteursTrouves.length > 0 || livresTrouves.length > 0) ? "1px solid rgba(58,90,140,0.16)" : "none" }}>
                  <p style={{ fontSize: "0.59375rem", fontWeight: 700, letterSpacing: "0.09em", color: DOMAINE.bible.base, textTransform: "uppercase", margin: "2px 12px 2px" }}>Traductions</p>
                  {traductionsTrouvees.slice(0, 3).map(t => (
                    <Link key={t.code} id={`nav-tr:${t.code}`} href={`/traductions#${t.code}`} onClick={fermerRechercheRapide}
                      style={{ display: "block", padding: "3px 12px", fontSize: "0.84375rem", lineHeight: 1.28, color: "var(--cs-encre)", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = DOMAINE.bible.survol)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {surlignerMatch(t.nom, requeteRapide.trim())}
                    </Link>
                  ))}
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
  const blocCompte = (mobile: boolean) => user ? (
    <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", alignItems: mobile ? "stretch" : "center", gap: mobile ? "2px" : "6px", width: mobile ? "100%" : undefined }}>
      {!mobile && (
        <button onClick={() => setMenuOuvert(!menuOuvert)} aria-label={`Compte de ${pseudo ?? user.email.split("@")[0]}`} aria-expanded={menuOuvert}
          style={{ display: "flex", alignItems: "center", gap: "0.3125rem", height: "1.875rem", background: "rgba(255,255,255,0.11)", border: "1px solid rgba(255,255,255,0.17)", borderRadius: "8px", padding: "0 0.5rem 0 0.4375rem", cursor: "pointer", color: "rgba(255,255,255,0.92)", fontSize: "0.84375rem", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="5" r="2.8" stroke="currentColor" strokeWidth="1.2" fill="none"/><path d="M1.5 13c0-3 2.5-4.5 5.5-4.5S12.5 10 12.5 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/></svg>
          {/* Le pseudonyme est le SEUL élément de la barre dont la largeur ne se connaît
              pas d'avance (jusqu'à 6rem). À l'étroit il s'efface : c'est ce qui rend la
              tenue de la barre calculable, et non dépendante de la longueur d'un nom. */}
          {!pseudoMasque && <span style={{ maxWidth: "6rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pseudo ?? user.email.split("@")[0]}</span>}
          <span style={{ fontSize: "0.625rem", opacity: 0.6 }}>▼</span>
        </button>
      )}
      <div style={mobile ? { display: "flex", flexDirection: "column", gap: "2px", background: "rgba(255,255,255,0.06)", borderRadius: "8px", overflow: "hidden" } : { position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--cs-surface)", border: "1px solid var(--cs-bord)", borderRadius: "8px", boxShadow: "var(--cs-ombre-flottante)", minWidth: "190px", zIndex: 3100, overflow: "hidden", display: menuOuvert ? "block" : "none" }}>
        {!mobile && (
          <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--cs-fond-doux)" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--cs-texte-doux)", margin: 0 }}>Connecté en tant que</p>
            <p style={{ fontSize: "0.8125rem", color: "var(--cs-encre)", fontWeight: 500, margin: "2px 0 0", wordBreak: "break-all" }}>{pseudo ?? user.email}</p>
          </div>
        )}
        {[
          { href: "/compte", label: "Mon compte", badge: 0, icone: null },
          ...(pseudo ? [{ href: `/profil/${encodeURIComponent(pseudo)}`, label: "Ma page", badge: 0, icone: null }] : []),
          { href: "/prelevements", label: "Mes citations", badge: 0, icone: null },
          { href: "/progression", label: "Ma progression", badge: 0, icone: null },
          // Le lien Administration reste toujours accessible à un vrai admin, quel que
          // soit l'état de l'interrupteur d'affichage « mode utilisateur standard ».
          ...((estAdmin || estAdminEmail) ? [{ href: "/admin", label: "Administration", badge: nbActionsAdmin + nbVerifAdmin, icone: "epee" }] : []),
        ].map(item => (
          <Link key={item.href} href={item.href} onClick={() => { setMenuOuvert(false); setMobileOuvert(false) }}
            style={mobile
              ? { display: "flex", alignItems: "center", gap: "7px", padding: "10px 12px", fontSize: "0.9375rem", color: "rgba(255,255,255,0.85)", textDecoration: "none" }
              : { display: "flex", alignItems: "center", gap: "7px", padding: "10px 14px", fontSize: "0.875rem", color: "var(--cs-encre)", textDecoration: "none", borderBottom: "1px solid var(--cs-fond-doux)" }}>
            {/* Administration : plus d'icône ; libellé simplement mis en vert (menu desktop). */}
            <span style={item.icone === "epee" && !mobile ? { color: "var(--cs-vert)", fontWeight: 600 } : undefined}>{item.label}</span>
            {item.badge > 0 && (
              <span style={{ marginLeft: '4px', fontSize: '0.6875rem', background: 'var(--cs-danger)', color: 'var(--cs-sur-aplat)', borderRadius: '8px', padding: '1px 6px', fontWeight: 700 }}>{item.badge}</span>
            )}
          </Link>
        ))}
        {/* Mode sombre — un réglage de LECTURE, rangé avec le compte parce que c'est
            là que le lecteur vient chercher ce qui le concerne lui, et non le corpus.
            Il n'a donc pas d'entrée dans la barre : celle-ci est déjà la plus disputée
            du site, et un cran de repli de plus la rendrait incalculable. */}
        <label
          style={mobile
            ? { display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", fontSize: "0.9375rem", color: "rgba(255,255,255,0.85)", cursor: "pointer", userSelect: "none" }
            : { display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", fontSize: "0.875rem", color: "var(--cs-encre)", cursor: "pointer", userSelect: "none", borderBottom: "1px solid var(--cs-fond-doux)" }}>
          <span style={{ flex: 1 }}>Mode sombre</span>
          <button type="button" role="switch" aria-checked={themeSombre} onClick={basculerThemeSombre}
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
        </label>
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
  const lienMobile = (href: string, label: string) => {
    const chemin = href.split("?")[0] || "/";
    const actif = pathname === chemin || (chemin !== "/" && pathname.startsWith(chemin));
    return (
      <Link key={href} href={href} onClick={() => setMobileOuvert(false)}
        aria-current={actif ? "page" : undefined}
        // `display: block` OBLIGATOIRE : dans les groupes d'« Administration », les liens
        // sont enfants d'un <div> bloc (et non du flex-colonne principal) ; sans cela, les
        // <a> restent inline et se chevauchent (pastilles superposées, texte illisible).
        style={{ display: "block", padding: "9px 10px", borderRadius: "8px", fontSize: "1rem", color: "var(--cs-sur-aplat)", textDecoration: "none", background: actif ? "rgba(255,255,255,0.12)" : "transparent" }}>
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
        style={{ background: "var(--cs-vert-aplat)", borderColor: "rgba(255,255,255,0.10)", zIndex: 3000 }}>
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
             quand on la quitte. */
          .cs-onglet {
            background: var(--fond, transparent);
            transition: background 260ms cubic-bezier(.33,.68,.36,1),
                        color 200ms cubic-bezier(.33,.68,.36,1);
          }
          .cs-onglet:hover {
            background: var(--fond-survol, rgba(255,255,255,0.085));
            color: var(--cs-sur-aplat);
            transition-duration: 140ms;
          }
          /* Onglet « Bible » : au repos, un onglet plat comme les autres liens de la barre
             — ni cadre ni fond qui le détachent. Au survol la face s'efface et laisse
             paraître SUR PLACE « Classique » et « Polyglotte » — la barre ne bouge pas.

             ⛔ La face ne dimensionne PLUS le bloc à elle seule. Elle le faisait, en flux
             normal, pendant que les deux segments étaient en « position:absolute » : ils se
             trouvaient donc bornés à SA largeur, et rognés par l'« overflow:hidden » dès qu'ils
             la dépassaient. Le défaut restait invisible tant que la face disait « Les Saintes
             Écritures », plus large que les deux segments réunis. Il paraissait au cran 2, où
             elle se réduit à « La Bible », moitié moins large : « Polyglotte », qui vient en
             second, se faisait couper. C'était donc un défaut de LARGEUR DE FENÊTRE, ce qui le
             rendait intermittent, et proprement incompréhensible pour qui le rencontrait.

             Les deux faces occupent maintenant LA MÊME cellule de grille. Elles se superposent
             toujours, mais aucune ne sort du flux : le bloc prend la largeur de la PLUS LARGE
             des deux, à tous les crans, et plus rien ne peut être rogné. Cette largeur ne
             change pas au survol, donc la barre ne bouge toujours pas. */
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
          /* « Aller plus loin » : petit menu déroulant au survol (CSS :hover, sans gap
             mort — le menu touche le déclencheur).

             ⛔ Le menu ne peut PAS déborder de l'écran, et « Administration » en compte dix-sept
             entrées réparties en trois familles. Il était en overflow:hidden, donc ce qui
             dépassait du bas de la fenêtre était simplement inatteignable : sur un écran bas, les
             dernières familles n'existaient plus, sans que rien ne le dise. Le menu se borne
             maintenant à la hauteur disponible sous la barre et défile. Le plafond se compose sur
             HAUTEUR_NAVBAR, jamais sur un nombre recopié (cf. AGENTS.md, § Responsive), et le
             dernier terme laisse respirer le bas de la fenêtre.

             overscroll-behavior:contain — sans lui, la molette poursuivie au bas de la liste
             emporte la PAGE, et le menu se ferme sous le curseur qui a bougé avec elle. */
          .cs-plus { position: relative; }
          .cs-plus-menu { position: absolute; top: 100%; left: 0; min-width: 13rem; background: var(--cs-surface); border: 1px solid var(--cs-bord); border-radius: 8px; box-shadow: var(--cs-ombre-modale); overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; max-height: calc(100dvh - ${HAUTEUR_NAVBAR} - 1.5rem); z-index: 3000; padding: 3px; display: none; }
          .cs-plus:hover .cs-plus-menu, .cs-plus:focus-within .cs-plus-menu { display: block; }
             /* Interlignage POSÉ, et non hérité : c'est lui qui gouverne la hauteur d'une
             rangée, et sans lui le resserrement des rembourrages se serait fait manger par
             un interlignage de confort dont la valeur ne se lisait nulle part. */
          .cs-plus-lien { display: block; padding: 4px 11px; font-size: 0.8125rem; line-height: 1.32; color: var(--cs-encre); text-decoration: none; border-radius: 4px; white-space: nowrap; }
          .cs-plus-lien:hover { background: rgba(var(--cs-vert-rgb),0.08); }
             /* Les deux portes de l'administration. La graisse suffit à les lever d'une liste
             de dix-sept : ni couleur, ni puce, ni place à part, qui déferaient l'ordre des
             familles. */
          .cs-plus-lien--fort { font-weight: 600; }
          .cs-plus-sep { height: 1px; background: var(--cs-fond-doux); margin: 3px 6px; }
          /* Familles d'administration : intertitre coloré + filet coloré à gauche de
             chaque entrée, pour différencier les catégories par domaine. */
          .cs-admin-fam { font-size: 0.5rem; font-weight: 700; letter-spacing: 0.11em; text-transform: uppercase; padding: 6px 12px 2px; opacity: 0.9; }
          .cs-admin-lien { margin-left: 4px; padding-left: 10px; border-radius: 0 4px 4px 0; }
          @media (prefers-reduced-motion: reduce) {
            .cs-onglet, .cs-bible, .cs-bible-face, .cs-bible-split { transition: none; }
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
                  style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.8125rem", fontStyle: "italic", lineHeight: 1, color: "rgba(255,255,255,0.5)", position: "relative", top: "1.5px" }}>bêta</span>
              </>
            )}
          </Link>

          {/* ── Navigation desktop ──────────────────────────────────────────────
              Seuil du hamburger : `lg` (1024px), conservé. Mesuré sur la barre d'un
              admin connecté : version complète 94,9 rem (1519px à 16px), elle ne tient
              donc qu'au-delà de ~1700px ; entièrement repliée 52,5 rem (841px), qui tient
              partout dès 1024px. Entre les deux, la barre descend les crans un par un et
              n'en prend jamais plus qu'il ne faut. Le palier desktop n'a pas besoin d'un
              plancher plus haut : c'est le repli qui fait le travail. */}
          <nav ref={navRef} aria-label="Navigation principale" className="cs-nav-principale hidden lg:flex flex-1 items-center gap-1 min-w-0">
            {/* Bouton « Bible » unique : au survol il se décompose en « Classique »
                (lecture suivie) et « Polyglotte » (comparaison). Un clic direct sur la face
                mène à la lecture classique — utile au tactile, où il n'y a pas de survol. */}
            <div className="cs-bible">
              <Link href="/?livre=GEN&chapitre=1" className="cs-bible-face">
                {titreBibleCourt ? "La Bible" : "Les Saintes Écritures"}
              </Link>
              <div className="cs-bible-split">
                <Link href="/?livre=GEN&chapitre=1" aria-current={pathname === "/" ? "page" : undefined} className={`cs-bible-seg${pathname === "/" ? " cs-bible-seg--actif" : ""}`}>Classique</Link>
                <Link href="/polyglotte" aria-current={pathname.startsWith("/polyglotte") ? "page" : undefined} className={`cs-bible-seg${pathname.startsWith("/polyglotte") ? " cs-bible-seg--actif" : ""}`}>Polyglotte</Link>
              </div>
            </div>
            {LIENS_PRIMAIRES.map(({ href, label, exact, discret }) => (
              href === "/bibliotheque"
                ? <OngletPatristique key={href} href={href} label={label} style={styleLien(href, exact, !discret)} />
                : href === "/traductions"
                // « Aller plus loin » garde sa place à toute largeur : c'est une entrée de
                // lecture, et elle ne se range pas sous un nom de compte.
                ? <OngletAllerPlusLoin key={href} label={label} style={styleLien(href, exact, !discret)} />
                : <Link key={href} href={href} className="cs-onglet" aria-current={estCheminActif(href, exact) ? "page" : undefined} style={styleLien(href, exact, !discret)}>{label}</Link>
            ))}
            {(estAdmin || estAdminEmail) && (
              <OngletAdministration label="Administration" style={styleLien("/admin", false, true)} />
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
                  <span style={{ position: 'absolute', top: '-1px', right: '-2px', minWidth: '14px', height: '14px', background: 'var(--cs-danger)', color: 'var(--cs-sur-aplat)', borderRadius: '8px', fontSize: '0.625rem', fontWeight: 700, lineHeight: '14px', textAlign: 'center', padding: '0 3px', boxSizing: 'border-box' }}>
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
                  <span style={{ position: 'absolute', top: '-1px', right: '-2px', minWidth: '14px', height: '14px', background: 'var(--cs-danger)', color: 'var(--cs-sur-aplat)', borderRadius: '8px', fontSize: '0.625rem', fontWeight: 700, lineHeight: '14px', textAlign: 'center', padding: '0 3px', boxSizing: 'border-box' }}>
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
          <div className="hidden lg:block" style={{ background: "var(--cs-vert-aplat-fonce)", borderTop: "1px solid rgba(255,255,255,0.10)", padding: "10px 16px 12px" }}>
            {blocRecherche(true)}
          </div>
        )}

        {/* ── Panneau mobile déplié ───────────────────────────────────────────── */}
        {mobileOuvert && (
          <div className="lg:hidden" style={{ background: "var(--cs-vert-aplat-fonce)", borderTop: "1px solid rgba(255,255,255,0.10)", padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {/* Liste verticale : lecture, puis Patristique/Publications, puis les pages
                  d'« Aller plus loin » dépliées, et enfin les sections d'admin. */}
              {[...LIENS_LECTURE, ...LIENS_PRIMAIRES.filter(l => l.href !== "/traductions")].map(({ href, label }) => lienMobile(href, label))}

              <p style={styleSectionMobile}>Aller plus loin</p>
              {LIENS_ALLER_PLUS_LOIN.map(({ href, label }) => lienMobile(href, label))}

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
                        const liens = LIENS_ADMIN.filter(l => l.famille === fam.cle)
                          .concat(fam.cle === "systeme" ? [LIEN_BIBLE_899] : []);
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
