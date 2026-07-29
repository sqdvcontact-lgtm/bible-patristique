"use client";

// Page d'ouverture — le chantier.
//
// Elle vivait sous /compte, qui servait deux choses selon qu'on était connecté
// ou non : les réglages du compte d'un côté, l'annonce publique de l'autre. Une
// seule adresse pour deux pages sans rapport. Le chantier a désormais la sienne.

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import Image from "next/image";
import { STYLE_ROMAIN, STYLE_ORDINAL, enChiffresRomains } from "@/app/lib/siecles";

type Mode = "connexion" | "inscription";

// Même bouton PayPal que la page « Soutenir » : un seul compte de don sur le site.
const LIEN_PAYPAL = "https://www.paypal.com/donate/?hosted_button_id=9M463NPH2RQXL";

// Mordoré : le brun doré des reliures, entre l'or des filets et le brun du texte.
const MORDORE = "#7d5f28";

const inputStyle: React.CSSProperties = { width: "100%", padding: "0.5625rem 0.75rem", fontSize: "0.84375rem", border: "1px solid #d6d0c4", borderRadius: "0.375rem", background: "#f9f7f4", color: "#1e1a16", outline: "none", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { fontSize: "0.6875rem", fontWeight: 600, color: "#566150", letterSpacing: "0.06em", display: "block", marginBottom: "0.3125rem" };

/** Où revenir après avoir confirmé son adresse par courriel. */
function urlCompte(): string {
  if (typeof window !== "undefined") return `${window.location.origin}/compte`;
  return "/compte";
}

export default function ChantierPage() {
  const router = useRouter();
  return <ConnexionInscription router={router} />;
}

// ── Pictogrammes ─────────────────────────────────────────────────────────────
// Tracés au trait, dans la couleur du texte, pour qu'ils vieillissent avec la
// charte plutôt que contre elle.
const traits = { stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

function IcoColonnes() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="3.5" width="6" height="17" rx="1" {...traits} />
      <rect x="9.5" y="3.5" width="6" height="17" rx="1" {...traits} />
      <rect x="16.5" y="3.5" width="5" height="17" rx="1" {...traits} />
    </svg>
  );
}
function IcoPeres() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" {...traits} />
      <path d="M9 8h6M9 11.5h6" {...traits} />
    </svg>
  );
}
function IcoBible() {
  // Un livre ouvert : l'Écriture. Distinct du codex des Pères (rectangle à dos).
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 6.6C10.4 5.3 8.1 4.8 5.2 5v13c2.9-.2 5.2.3 6.8 1.6 1.6-1.3 3.9-1.8 6.8-1.6V5c-2.9-.2-5.2.3-6.8 1.6z" {...traits} />
      <path d="M12 6.6v13" {...traits} />
    </svg>
  );
}
function IcoLien() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3A4 4 0 0 0 13 5.34l-1.5 1.5" {...traits} />
      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3A4 4 0 0 0 11 18.66l1.5-1.5" {...traits} />
    </svg>
  );
}
function IcoLibre() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" {...traits} />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" {...traits} />
    </svg>
  );
}
function IcoPlume() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      {/* Une plume : l'écriture des lecteurs, non le simple trait d'une signature. */}
      <path d="M4 20c6-1 9.5-4 12.5-9C18 8.5 19 5.5 19.5 3c-2.7.5-5.7 1.6-8.2 3.6C7.5 9.5 6 13.5 4 20z" {...traits} />
      <path d="M4 20l5.5-5.5" {...traits} />
    </svg>
  );
}

// ── Ornements ────────────────────────────────────────────────────────────────
// Gravures au trait du dossier d'ornements.
//
// Leur fond est VRAIMENT transparent : la luminance du gris a été convertie en
// canal alpha, si bien que le trait garde son anti-crénelage et que rien de
// blanc ne subsiste. La première version s'appuyait sur mix-blend-mode:
// multiply, qui ne pouvait pas fonctionner — l'opacité posée sur la même image
// crée un contexte d'empilement, lequel isole l'élément et annule le mélange.
// Le blanc restait donc visible partout où l'ornement était atténué.
const POSE: React.CSSProperties = { display: "block", margin: "0 auto", height: "auto" };

/** Trois ornements, pas davantage : au-delà, ils cessent de ponctuer la page
 *  pour l'encombrer. Chacun ne paraît qu'une fois. */
const ORNEMENTS = {
  batisseurs: { src: "/ornements/chantier.png",     w: 880, h: 471 },
  vigne:      { src: "/ornements/vigne-grappe.png", w: 460, h: 219 },
  clochettes: { src: "/ornements/clochettes.png",   w: 520, h: 102 },
} as const;

function Ornement({ nom, largeur, opacite = 1, alt = "" }: { nom: keyof typeof ORNEMENTS; largeur: number | string; opacite?: number; alt?: string }) {
  const o = ORNEMENTS[nom];
  return (
    // `unoptimized` n'est pas une facilité. À certaines largeurs — 640 px, mais
    // pas 384 ni 828 —, l'optimiseur rend un PNG à trois canaux : la couche
    // alpha est aplatie sur du blanc, et le fond réapparaît. Le défaut est donc
    // intermittent, fonction de la largeur d'écran. Ces fichiers sont déjà
    // détourés, dimensionnés et légers ; les servir tels quels est plus sûr.
    <Image src={o.src} alt={alt} aria-hidden={alt ? undefined : true} width={o.w} height={o.h}
      unoptimized
      style={{ ...POSE, width: largeur, maxWidth: "100%", opacity: opacite }} />
  );
}

/** Colophon : pyramide pointe en bas, comme sur la page « Soutenir ».
 *
 *  Chaque ligne porte sa largeur maximale, décroissante ; le texte s'y replie
 *  de lui-même et le bloc s'affine vers le bas. On ne coupe pas aux mots à la
 *  main : une coupe fixe se briserait au premier changement de corps ou de
 *  langue, alors qu'une largeur décroissante tient dans tous les cas.
 */
function Colophon({ lignes, couleur, taille = "0.78125rem", interligne = 1.7 }: {
  lignes: [string, string][]; couleur: string; taille?: string; interligne?: number;
}) {
  return (
    <div style={{ textAlign: "center", fontFamily: "var(--font-source-serif), Georgia, serif" }}>
      {lignes.map(([texte, largeur]) => (
        <p key={texte} style={{ maxWidth: largeur, margin: "0 auto", color: couleur, fontSize: taille, lineHeight: interligne }}>
          {texte}
        </p>
      ))}
    </div>
  );
}

/** Siècle : la règle vit dans app/lib/siecles.tsx. Ici le siècle est écrit à la
 *  main dans le texte des encarts, d'où l'appel par son numéro. */
function Siecle({ n }: { n: number }) {
  return (
    <span style={STYLE_ROMAIN}>
      {enChiffresRomains(n)}<sup style={STYLE_ORDINAL}>{n === 1 ? "er" : "e"}</sup>
    </span>
  );
}

// Les cinq encarts disent, dans l'ordre, ce qu'on trouve sur le site et à quelles
// conditions. Les titres annoncent le contenu plutôt que de le désigner de loin :
// « Le lien entre les deux » ne parlait qu'à qui avait déjà lu les deux encarts
// précédents, et « Exigence et collaboration » ne disait rien de ce qu'on peut y
// faire. Un titre d'encart doit se comprendre seul.
const PRINCIPES: { ico: React.ReactNode; titre: string; texte: React.ReactNode }[] = [
  // L'ordre du tableau dessine les colonnes : la grille se remplit ligne par
  // ligne, donc les rangs impairs tombent à gauche et les pairs à droite.
  // Colonne de gauche (lecture de l'Écriture) : la Bible, puis la polyglotte,
  // puis la contribution des lecteurs. Colonne de droite (les Pères et le reste) :
  // les Pères retrouvés, puis les renvois verset↔Pères, puis la gratuité.
  { ico: <IcoBible />, titre: "La Bible dans ses meilleures traductions",
    texte: <>Un même passage se lit dans plusieurs traductions françaises de référence, choisies
      avec soin et souvent libres de droit. Le grec, le latin, l’hébreu et d’autres langues
      bibliques viendront peu à peu enrichir la lecture.</> },
  // Les Pères en français et les textes rares réunis : c'est un même travail —
  // retrouver des ouvrages qui ne subsistent que dans de vieilles éditions,
  // introuvables ou coûteuses, et les rééditer avec soin.
  { ico: <IcoPeres />, titre: "Les Pères retrouvés",
    texte: <>Les grands textes des Pères ne subsistent souvent que dans des éditions anciennes,
      introuvables ou coûteuses. Nous les retrouvons et les rééditons avec soin, dans leurs
      traductions françaises du <Siecle n={17} /> au <Siecle n={20} /> siècle, libres de droit.
      Les langues originales suivront.</> },
  // Le dispositif de lecture en colonnes a son propre encart (et bientôt son
  // onglet) : plusieurs traductions d'un même passage affichées en regard.
  { ico: <IcoColonnes />, titre: "Le mode polyglotte",
    texte: <>Un même passage s’affiche en colonnes, plusieurs traductions en regard, sur le modèle
      de la <i>Sainte Bible polyglotte</i> de Fulcran Vigouroux. Le grec et le latin viendront s’y
      ranger, puis d’autres langues anciennes.</> },
  // Les deux anciens encarts « Chaque verset… » et « Des rapprochements vérifiés » réunis :
  // le renvoi aux Pères et sa vérification disaient une même chose en deux temps.
  { ico: <IcoLien />, titre: "Chaque verset et ses commentaires",
    texte: <>En regard du texte biblique s’affichent les passages des Pères qui le citent ou le
      commentent : c’est le cœur du site. Chaque rapprochement est établi puis relu ; les passages
      incertains sont signalés comme tels, et vos signalements servent à corriger le site.</> },
  { ico: <IcoPlume />, titre: "Somme collaborative",
    texte: <>Les lecteurs inscrits publient leurs propres essais, dans le registre qu’ils veulent :
      exégétique, théologique, spirituel ou littéraire. Chacun peut les lire, les commenter et en
      discuter.</> },
  { ico: <IcoLibre />, titre: "Gratuit, sans publicité",
    texte: <>Le site est accessible gratuitement, sans abonnement ni publicité, et les données
      personnelles ne sont jamais revendues. Le travail est bénévole et le restera.</> },
];

// ── Feuille de route ─────────────────────────────────────────────────────────
// Trois temps en regard : ce qui est déjà en place, ce qui reste à faire avant
// d'ouvrir, ce qui suivra une fois le site ouvert. Trois colonnes de longueur
// égale, chacune coiffée d'un titre sérif. On ne date pas : une date tenue de
// loin est une promesse qu'on rompt.
const PHASES: { titre: string; etat: "fait" | "avant" | "apres"; items: string[] }[] = [
  { titre: "Déjà en place", etat: "fait", items: [
    "Cinq versions de la Bible, dont le grec et le latin",
    "Lecture simple ou polyglotte",
    "Lecture des œuvres des Pères",
    "Renvois entre la Bible et les textes patristiques",
    "Bibliothèque de passages favoris",
    "Comptes, commentaires et publications des lecteurs",
    "Moteur de recherche",
  ] },
  { titre: "Avant l’ouverture", etat: "avant", items: [
    "Publier au moins trente œuvres patristiques",
    "Achever l’alignement des traductions bibliques",
    "Ajouter les textes originaux disponibles",
    "Reprendre les traductions anciennes libres de droit",
    "Élargir aux langues anciennes et aux apocryphes",
    "Adapter pleinement le site aux mobiles",
    "Tester et corriger l’ensemble du site",
  ] },
  { titre: "Après l’ouverture", etat: "apres", items: [
    "Enrichir progressivement la bibliothèque patristique",
    "Ajouter de nouvelles traductions bibliques",
    "Développer les correspondances entre les textes",
    "Améliorer la recherche et la navigation",
    "Corriger les erreurs signalées par les lecteurs",
    "Encourager les publications et les commentaires",
    "Constituer une communauté de contributeurs",
  ] },
];

function FeuilleDeRoute() {
  return (
    <section className="cs-route">
      <p className="cs-route-kicker">Feuille de route</p>
      <p className="cs-route-chapeau">
        Ce qui est déjà en place, ce qui reste avant l’ouverture, et ce qui suivra.<br />
        Nous n’annonçons pas de date.
      </p>
      <div className="cs-route-phases">
        {PHASES.map(ph => (
          <div key={ph.titre} className={`cs-phase cs-phase--${ph.etat}`}>
            <h3 className="cs-phase-titre">{ph.titre}</h3>
            <ul className="cs-route-liste">
              {ph.items.map(t => (
                <li key={t} className="cs-route-item">
                  <span className="cs-route-puce" aria-hidden="true">{ph.etat === "fait" ? "✓" : "○"}</span>
                  <span className="cs-route-titre">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Chiffres du corpus ───────────────────────────────────────────────────────
function Chiffres() {
  const [n, setN] = useState<{ oeuvres: number; traductions: number; auteurs: number } | null>(null);

  // Par une route serveur, et non plus par le client public : le rôle `anon`
  // n'a plus aucun droit de lecture sur la base.
  useEffect(() => {
    fetch("/api/chiffres", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.oeuvres !== null) setN(d); })
      .catch(() => {});
  }, []);

  // Tant que le compte n'est pas revenu, on n'affiche rien plutôt qu'un zéro :
  // un chiffre faux est pire qu'un chiffre absent sur une page de présentation.
  if (!n) return <div style={{ height: "4.5rem" }} />;

  const cases: [number, string][] = [
    [n.oeuvres, n.oeuvres > 1 ? "œuvres disponibles" : "œuvre disponible"],
    [n.traductions, n.traductions > 1 ? "traductions bibliques" : "traduction biblique"],
    [n.auteurs, n.auteurs > 1 ? "auteurs répertoriés" : "auteur répertorié"],
  ];

  return (
    <div className="cs-chiffres">
      {cases.map(([valeur, libelle]) => (
        <div key={libelle} style={{ textAlign: "center" }}>
          <div className="cs-chiffre-valeur" style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1.875rem", color: "#3d6b4f", lineHeight: 1 }}>
            {valeur}
          </div>
          <div className="cs-chiffre-libelle" style={{ fontSize: "0.625rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6a6259", marginTop: "0.375rem" }}>
            {libelle}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Être prévenu de l'ouverture ──────────────────────────────────────────────
function Prevenir() {
  const [adresse, setAdresse] = useState("");
  const [etat, setEtat] = useState<"repos" | "envoi" | "fait">("repos");
  const [erreur, setErreur] = useState<string | null>(null);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null); setEtat("envoi");
    try {
      const res = await fetch("/api/attente", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courriel: adresse.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErreur(j.error ?? "L’enregistrement a échoué."); setEtat("repos"); return;
      }
      setEtat("fait");
    } catch {
      setErreur("Connexion impossible. Réessayez plus tard."); setEtat("repos");
    }
  };

  if (etat === "fait") {
    return (
      <div style={{ background: "rgba(61,107,79,0.07)", border: "1px solid rgba(61,107,79,0.22)", borderRadius: "0.5rem", padding: "1rem 1.125rem" }}>
        <p style={{ fontSize: "0.8125rem", color: "#2a6040", margin: 0, lineHeight: 1.6 }}>
          C’est noté. Vous recevrez un message le jour de l’ouverture. Un seul, et rien d’autre.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={envoyer}>
      <p style={{ fontSize: "0.78125rem", color: "#6a6259", margin: "0 0 0.75rem", lineHeight: 1.6 }}>
        Les travaux avancent, la date reste incertaine. Laissez votre adresse : elle ne servira
        qu’à vous prévenir, une fois.
      </p>
      {erreur && (
        <p style={{ fontSize: "0.75rem", color: "#9a2a2a", margin: "0 0 0.625rem", lineHeight: 1.5 }}>{erreur}</p>
      )}
      <div className="cs-prevenir-champs" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <input type="email" required autoComplete="email" value={adresse} onChange={e => setAdresse(e.target.value)}
          placeholder="vous@exemple.fr" aria-label="Votre adresse e-mail"
          style={{ ...inputStyle, flex: "1 1 11.25rem", width: "auto" }} />
        <button type="submit" disabled={etat === "envoi"}
          style={{ padding: "0.5625rem 1.125rem", borderRadius: "0.375rem", border: "none", background: etat === "envoi" ? "#8aaa96" : "#3d6b4f", color: "#fff", fontSize: "0.8125rem", fontWeight: 500, cursor: etat === "envoi" ? "default" : "pointer", whiteSpace: "nowrap" }}>
          {etat === "envoi" ? "Envoi…" : "Me prévenir"}
        </button>
      </div>
    </form>
  );
}

// ── Connexion / inscription ──────────────────────────────────────────────────
function ConnexionInscription({ router }: { router: ReturnType<typeof useRouter> }) {
  const [mode, setMode] = useState<Mode>("connexion");
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    if (mode === "inscription" && !pseudo.trim()) { setErreur("Le pseudonyme est requis."); return; }
    setChargement(true);
    if (mode === "connexion") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: mdp });
      if (error) setErreur("Identifiants incorrects. Vérifiez votre adresse et votre mot de passe.");
      else {
        // Le proxy, en refusant l'accès, a mis la page demandée dans `suite` :
        // on y revient plutôt que de retomber sur un point d'arrivée arbitraire.
        // Seuls les chemins internes sont acceptés — une URL absolue permettrait
        // de renvoyer l'utilisateur connecté vers un site tiers.
        const suite = new URLSearchParams(window.location.search).get("suite");
        const cible = suite && suite.startsWith("/") && !suite.startsWith("//") ? suite : "/accueil";
        router.push(cible);
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password: mdp, options: { emailRedirectTo: urlCompte() } });
      if (error) {
        setErreur(error.message.includes("already registered") ? "Cette adresse est déjà associée à un compte. Essayez de vous connecter." : "Une erreur est survenue. Réessayez.");
      } else if (data.user) {
        const res = await fetch("/api/compte/creer-profil", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: data.user.id, pseudo: pseudo.trim() }) });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setErreur(json.error ?? "Le compte a été créé, mais le pseudonyme n’a pas pu être enregistré.");
          setChargement(false); return;
        }
        setMode("connexion"); setMdp(""); setPseudo(""); setErreur("__confirm__");
      }
    }
    setChargement(false);
  };

  return (
    <main className="cs-ouverture">
      {/* La page d'ouverture se passe de barre de navigation : il n'y a rien à
          naviguer tant que le site est fermé, et la barre promettait des liens
          qui renvoyaient tous ici. Le masquage se fait en CSS, présent dès le
          HTML rendu par le serveur — un retrait en JavaScript ferait clignoter
          la barre le temps du premier rendu. */}
      <style>{`
        body:has(.cs-ouverture) [data-cs-navbar],
        body:has(.cs-ouverture) [data-cs-bandeau-mobile] { display: none !important; }
        body:has(.cs-ouverture) #cs-corps { padding-top: 0 !important; }

        .cs-ouverture { background: #f3efe3; }
        .cs-ouverture-corps { width: 100%; max-width: 48.75rem; margin: 0 auto; padding: 0 1.25rem; }

        /* ── Premier écran ────────────────────────────────────────────────────
           Il occupe exactement la hauteur visible et se centre : le visiteur
           découvre un bloc entier — enseigne, titre, phrase, avis de travaux —
           sans qu'aucun paragraphe soit tranché par le bas de l'écran. On mesure
           en dvh et non en vh : sur téléphone, vh ignore la barre d'adresse et
           déborde toujours d'une cinquantaine de pixels. */
        .cs-ecran { min-height: 100dvh; display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    text-align: center; padding: 2rem 1.25rem 1.625rem; }
        .cs-enseigne { font-family: var(--font-source-serif), Georgia, serif; font-weight: normal;
                       color: #3d6b4f; letter-spacing: 0.16em; text-transform: uppercase;
                       font-size: 1.875rem; line-height: 1.1; margin: 1rem 0 0.25rem; }
        .cs-titre { font-family: var(--font-source-serif), Georgia, serif; font-weight: normal;
                    color: #1e2e22; line-height: 1.3; letter-spacing: -0.005em;
                    font-size: 1.25rem; font-style: italic; margin: 0.625rem 0 1rem; }
        .cs-chapeau { font-size: 0.90625rem; color: #6a6259; line-height: 1.75;
                      max-width: 32.5rem; margin: 0 auto; }
        /* Chevron d'invite à descendre : bouton discret, un peu plus grand, qui
           oscille doucement pour signaler qu'il y a une suite, et pousse au clic
           jusqu'au corps de la page. L'oscillation se coupe si l'on préfère moins
           de mouvement. */
        .cs-suite { display: inline-flex; align-items: center; justify-content: center;
                    margin-top: 1.25rem; width: 2.75rem; height: 2.75rem; padding: 0;
                    border: none; background: none; color: #b0a48f; cursor: pointer;
                    border-radius: 50%; transition: color 0.2s ease;
                    animation: cs-suite-bob 2.4s ease-in-out infinite; }
        .cs-suite:hover { color: #7d5f28; }
        .cs-suite:focus-visible { outline: 2px solid #a9c3b1; outline-offset: 0.125rem; }
        @keyframes cs-suite-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(0.25rem); } }
        @media (prefers-reduced-motion: reduce) { .cs-suite { animation: none; } }
        /* Grille des six encarts. grid-auto-rows:1fr donne à toutes les rangées
           la même hauteur : les six cartes sont ainsi rigoureusement égales, quel
           que soit le nombre de lignes du texte. L'écart (gap) est le même dans
           les deux sens, pour que l'ensemble respire régulièrement. */
        .cs-principes { display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 1fr;
                        gap: 1.5rem; margin-bottom: 2.375rem; }
        /* Encart : pictogramme, titre, filet, texte — empilés et centrés, à
           distances fixes pour que les titres tombent au même niveau dans chaque
           rangée. Ivoire léger (distinct du fond, sans blanc froid), angles peu
           arrondis, filet fin beige, ombre à peine perceptible. */
        .cs-encart { display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
                     text-align: center; padding: 2rem 2.125rem; border: 1px solid #e7e0d4;
                     border-radius: 0.5rem; background: #faf6ec; box-shadow: 0 1px 2px rgba(60,50,30,0.04); }
        .cs-encart-ico { display: flex; align-items: center; justify-content: center;
                         width: 2.875rem; height: 2.875rem; border-radius: 50%; margin-bottom: 0.75rem;
                         color: #3d6b4f; background: #eef3ee; border: 1px solid #dbe6dd; }
        /* Vert et mordoré mêlés : une teinte par encart, en alternance. Sur deux colonnes,
           cela pose le vert d'un côté et le mordoré de l'autre — les deux couleurs de la
           charte (le vert des reliures, le brun doré des filets) se répondent. */
        .cs-encart--mordore .cs-encart-ico { color: #7d5f28; background: #f5efe1; border-color: #e6d8ba; }
        .cs-encart--mordore .cs-encart-titre { color: #4a3d24; }
        .cs-encart--vert .cs-encart-titre::after { background: #a9c3b1; }
        .cs-encart-titre { font-family: var(--font-source-serif), Georgia, serif; font-weight: normal;
                           font-size: 1.0625rem; color: #2a3d30; margin: 0 0 0.625rem; padding-bottom: 0.625rem;
                           position: relative; }
        .cs-encart-titre::after { content: ""; position: absolute; left: 50%; bottom: 0;
                                  width: 1.625rem; height: 1px; background: #cdb98c; transform: translateX(-50%); }
        .cs-encart-texte { font-size: 0.78125rem; color: #6a6259; line-height: 1.65; margin: 0; max-width: 34ch; }
        /* Le point surnuméraire enjambe les deux colonnes et se centre. */
        .cs-principe-seul { grid-column: 1 / -1; max-width: 21.25rem; margin: 0 auto; }
        .cs-cartes { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
        /* Cartes du bas (prévenir, soutenir, connexion) accordées aux encarts :
           même ivoire, mêmes angles, même filet, même ombre à peine perceptible. */
        .cs-carte, .cs-connexion { background: #faf6ec; border: 1px solid #e7e0d4;
                     border-radius: 0.5rem; box-shadow: 0 1px 2px rgba(60,50,30,0.04); }
        /* Titre de bloc : sérif, sobre, centré — la voix des titres du site. */
        .cs-bloc-titre { font-family: var(--font-source-serif), Georgia, serif; font-weight: normal;
                         font-size: 1rem; color: #2a3d30; text-align: center; margin: 0 0 1rem; }

        /* ── Feuille de route ─────────────────────────────────────────────────
           Trois colonnes en regard (déjà / avant / après), chacune coiffée d'un
           titre sérif ; le corps des listes est sans-serif. Les colonnes se
           replient d'elles-mêmes (auto-fit) dès que la largeur vient à manquer. */
        /* Pas de filet autour de la section : le muguet cul-de-lampe qui la
           précède fait la séparation, et une ligne juste en dessous lui coupait
           l'herbe sous le pied. L'espace seul délimite désormais la feuille de
           route, en haut comme en bas. */
        .cs-route { padding: 0.75rem 0 0.5rem; margin-bottom: 2.75rem; }
        .cs-route-kicker { font-family: var(--font-source-serif), Georgia, serif; font-weight: normal;
                           font-size: 1.375rem; color: #2a3d30; margin: 0 0 0.625rem;
                           text-align: center; }
        .cs-route-chapeau { font-size: 0.84375rem; color: #6a6259; line-height: 1.7;
                            max-width: 34rem; margin: 0 auto 2rem; text-align: center; }
        .cs-route-phases { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
                           gap: 2rem 2.25rem; max-width: 46rem; margin: 0 auto; }
        .cs-phase-titre { font-family: var(--font-source-serif), Georgia, serif; font-weight: normal;
                          font-size: 1.1875rem; color: #2a3d30; text-align: center;
                          margin: 0 0 1rem; padding-bottom: 0.625rem; border-bottom: 1px solid #e5ddce; }
        .cs-route-liste { list-style: none; margin: 0; padding: 0;
                          display: flex; flex-direction: column; gap: 0.75rem; }
        .cs-route-item { display: flex; align-items: baseline; gap: 0.5625rem; }
        /* La puce tient sa case pour que les intitulés restent alignés à gauche,
           et que les lignes repliées reviennent sous l'intitulé, non sous la puce. */
        .cs-route-puce { flex: 0 0 auto; width: 0.875rem; text-align: center;
                         font-size: 0.6875rem; color: #bca877; }
        .cs-phase--fait .cs-route-puce { color: #3d6b4f; }
        .cs-phase--apres .cs-route-puce { color: #c3b9a6; }
        .cs-route-titre { font-size: 0.84375rem; line-height: 1.45; color: #4a463f; }
        .cs-chiffres { display: flex; justify-content: center; gap: 3.375rem; flex-wrap: wrap; margin: 0.375rem 0 2.125rem; }

        /* ── Cartes en écran étroit ───────────────────────────────────────────
           Sous ~750px, les six cartes passent sur une seule colonne, pleine
           largeur, et leur corps de texte remonte à 15px : lu de près sur un
           téléphone, le petit corps de la version deux-colonnes se lirait mal. */
        @media (max-width: 750px) {
          .cs-principes { grid-template-columns: 1fr; gap: 1.125rem; }
          .cs-encart-texte { font-size: 0.9375rem; line-height: 1.6; max-width: 40ch; }
        }

        /* ── Téléphone ────────────────────────────────────────────────────────
           Une colonne, marges resserrées, et surtout des cibles tactiles qui
           tiennent le doigt : le champ et le bouton passent l'un sous l'autre
           plutôt que de se partager une ligne trop étroite. */
        @media (max-width: 640px) {
          .cs-ouverture-corps { padding: 0 1rem; }
          .cs-ecran { padding: 1.625rem 1rem 1.375rem; }
          .cs-enseigne { font-size: 1.375rem; letter-spacing: 0.13em; }
          .cs-titre { font-size: 1.03125rem; margin: 0.5rem 0 0.875rem; }
          .cs-chapeau { font-size: 0.84375rem; line-height: 1.7; }
          .cs-suite { margin-top: 0.75rem; }
          .cs-principes { grid-template-columns: 1fr; gap: 1.125rem; margin-bottom: 1.875rem; }
          .cs-cartes { grid-template-columns: 1fr; }
          .cs-route { padding: 1.375rem 0 1.5rem; }
          .cs-route-liste { gap: 0.75rem; }
          .cs-chiffres { gap: 0; justify-content: space-between; margin: 0.25rem 0 1.75rem; }
          .cs-chiffre-valeur { font-size: 1.5625rem !important; }
          .cs-chiffre-libelle { font-size: 0.5625rem !important; letter-spacing: 0.06em !important; }
          .cs-prevenir-champs { flex-direction: column; }
          .cs-prevenir-champs > * { width: 100%; }
          .cs-prevenir-champs button { padding: 0.75rem 1.125rem !important; }
          .cs-carte { padding: 1.25rem 1.125rem !important; }
          .cs-connexion { padding: 1.5rem 1.25rem 1.75rem !important; }
        }
        /* iOS zoome sur tout champ dont le texte descend sous 1rem. */
        @media (max-width: 640px) { .cs-ouverture input { font-size: 16px !important; } }
      `}</style>

      {/* ── Premier écran : un bloc entier, rien de coupé ── */}
      <header className="cs-ecran">
        {/* La gravure des bâtisseurs ouvre la page : c'est le seul ornement à
            porter un sujet, et il dit le chantier mieux que le bandeau qui
            l'annonce. Elle était en bas, où l'on ne la voyait qu'après tout
            avoir lu — donc rarement. */}
        <Ornement nom="batisseurs" largeur="25rem"
          alt="Des anges et des ouvriers bâtissant la muraille d’une cité" />
        <h1 className="cs-enseigne">Corpus Scriptura</h1>
        <p className="cs-titre">L’Écriture, et ce que les Pères en ont dit</p>

        {/* L'avis de travaux suit le titre, en colophon et sans cadre : encadré,
            il avait l'air d'une alerte technique posée sur la page ; composé, il
            appartient à l'ensemble. Le mordoré le distingue sans le détacher. */}
        <div style={{ marginTop: "1rem" }}>
          <Colophon couleur={MORDORE} taille="0.8125rem" lignes={[
            ["Le site est en travaux. Rien n’est encore ouvert :", "26.875rem"],
            ["ni la lecture, ni la recherche, ni les comptes.", "21.875rem"],
            ["Cette page est une annonce, pas une porte.", "18.125rem"],
          ]} />
        </div>

        {/* Les chiffres tiennent dans le premier écran depuis que le chapeau en
            est parti : l'état du chantier se lit sans avoir à faire défiler. */}
        <div style={{ marginTop: "1.625rem" }}><Chiffres /></div>

        {/* Invite à faire défiler : sans elle, un premier écran qui tient dans la
            fenêtre laisse croire qu'il n'y a rien en dessous. Au clic, elle pousse
            le lecteur jusqu'au corps de la page (les encarts). */}
        <button type="button" className="cs-suite" aria-label="Voir la suite"
          onClick={() => document.getElementById("cs-corps-chantier")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 9.5 12 16.5 19 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      <div className="cs-ouverture-corps" id="cs-corps-chantier" style={{ paddingBottom: "3.5rem" }}>

        <div className="cs-principes" style={{ paddingTop: "2.75rem" }}>
          {PRINCIPES.map((p, i) => {
            // Cinq encarts dans deux colonnes : le dernier resterait seul, comme
            // oublié dans un coin. Il enjambe donc les deux colonnes et se centre.
            const seul = i === PRINCIPES.length - 1 && PRINCIPES.length % 2 === 1;
            const teinte = i % 2 === 0 ? " cs-encart--vert" : " cs-encart--mordore";
            return (
              <div key={p.titre} className={`cs-encart${teinte}${seul ? " cs-principe-seul" : ""}`}>
                <span className="cs-encart-ico">{p.ico}</span>
                <h3 className="cs-encart-titre">{p.titre}</h3>
                <p className="cs-encart-texte">{p.texte}</p>
              </div>
            );
          })}
        </div>

        <div style={{ margin: "0.375rem 0 2.125rem" }}><Ornement nom="clochettes" largeur="13.125rem" opacite={0.7} /></div>

        {/* ── Feuille de route ──
            Elle suit l'exposé du travail et précède l'invitation à laisser son
            adresse : on annonce ce qui reste à faire juste avant de proposer
            d'être prévenu quand ce sera fait. */}
        <FeuilleDeRoute />

        {/* ── Être prévenu, et soutenir ── */}
        <div className="cs-cartes">
          <div className="cs-carte" style={{ padding: "1.75rem 1.875rem" }}>
            <p className="cs-bloc-titre">Recevoir un mail à l’ouverture</p>
            <Prevenir />
          </div>
          <div className="cs-carte" style={{ padding: "1.75rem 1.875rem", display: "flex", flexDirection: "column" }}>
            <p className="cs-bloc-titre">Soutenir le projet</p>
            <p style={{ fontSize: "0.78125rem", color: "#6a6259", margin: "0 0 0.875rem", lineHeight: 1.6, flex: 1 }}>
              Le travail est bénévole, les frais ne le sont pas : hébergement, achat des
              éditions, numérisation. Un don avance le chantier.
            </p>
            <a href={LIEN_PAYPAL} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.5625rem 1.125rem", borderRadius: "0.375rem", border: "1px solid #3d6b4f", background: "#fff", color: "#3d6b4f", fontSize: "0.8125rem", fontWeight: 500, textDecoration: "none" }}>
              <svg width="14" height="14" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <path d="M20 34S4 23 4 13a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 10-16 21-16 21z"
                  stroke="currentColor" strokeWidth="2.5" fill="rgba(61,107,79,0.08)" strokeLinejoin="round" />
              </svg>
              Faire un don
            </a>
          </div>
        </div>

        {/* ── Connexion ── */}
        <div className="cs-connexion" style={{ padding: "1.875rem 2rem 2.125rem", width: "100%", maxWidth: "23.75rem", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1.125rem", fontWeight: "normal", color: "#2a3d30", margin: 0 }}>
            {mode === "connexion" ? "Connexion" : "Créer un compte"}
          </h2>
        </div>
        {erreur === "__confirm__" ? (
          <div style={{ background: "rgba(61,107,79,0.07)", border: "1px solid rgba(61,107,79,0.2)", borderRadius: "0.375rem", padding: "0.875rem 1rem", marginBottom: "1.25rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "#2a6040", lineHeight: 1.65, margin: 0 }}>Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse, puis connectez-vous.</p>
          </div>
        ) : erreur ? (
          <div style={{ background: "rgba(180,50,40,0.06)", border: "1px solid rgba(180,50,40,0.18)", borderRadius: "0.375rem", padding: "0.625rem 0.875rem", marginBottom: "1.125rem" }}>
            <p style={{ fontSize: "0.78125rem", color: "#9a2a2a", margin: 0, lineHeight: 1.55 }}>{erreur}</p>
          </div>
        ) : null}
        <form onSubmit={soumettre} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {mode === "inscription" && (
            <div>
              <label htmlFor="cs-pseudo" style={labelStyle}>PSEUDONYME *</label>
              <input id="cs-pseudo" autoComplete="nickname" type="text" value={pseudo} onChange={e => setPseudo(e.target.value)} required maxLength={32} placeholder="Visible publiquement, doit être unique" style={inputStyle} />
            </div>
          )}
          <div>
            <label htmlFor="cs-email" style={labelStyle}>ADRESSE E-MAIL</label>
            <input id="cs-email" autoComplete="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="vous@exemple.fr" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="cs-mdp" style={labelStyle}>MOT DE PASSE</label>
            <input id="cs-mdp" autoComplete={mode === "connexion" ? "current-password" : "new-password"} type="password" value={mdp} onChange={e => setMdp(e.target.value)} required minLength={6} placeholder="··········" style={inputStyle} />
          </div>
          <button type="submit" disabled={chargement}
            style={{ marginTop: "0.375rem", padding: "0.625rem", borderRadius: "0.375rem", border: "none", background: chargement ? "#8aaa96" : "#3d6b4f", color: "#fff", fontSize: "0.84375rem", fontWeight: 500, cursor: chargement ? "default" : "pointer" }}>
            {chargement ? "Chargement…" : mode === "connexion" ? "Se connecter" : "Créer le compte"}
          </button>
        </form>
        {/* INSCRIPTIONS FERMÉES. Le site est en test : la bascule vers la création
            de compte disparaît tant que `NEXT_PUBLIC_INSCRIPTIONS_OUVERTES` ne vaut
            pas « 1 ». Ce n'est qu'un retrait d'affordance — le vrai verrou est le
            proxy, et l'inscription doit AUSSI être coupée dans Supabase
            (Authentication → Sign In / Providers → Allow new users to sign up),
            sans quoi l'API reste ouverte à qui la connaît. */}
        {process.env.NEXT_PUBLIC_INSCRIPTIONS_OUVERTES === "1" ? (
          <div style={{ marginTop: "1.25rem", textAlign: "center", borderTop: "1px solid #ede9e2", paddingTop: "1.125rem" }}>
            <p style={{ fontSize: "0.78125rem", color: "#6a6259", margin: 0 }}>
              {mode === "connexion" ? "Pas encore de compte ?" : "Déjà un compte ?"}
              {" "}
              <button onClick={() => { setMode(mode === "connexion" ? "inscription" : "connexion"); setErreur(null); setMdp(""); setPseudo(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.78125rem", color: "#3d6b4f", fontWeight: 500, padding: 0, textDecoration: "underline" }}>
                {mode === "connexion" ? "Créer un compte" : "Se connecter"}
              </button>
            </p>
          </div>
        ) : (
          <div style={{ marginTop: "1.25rem", textAlign: "center", borderTop: "1px solid #ede9e2", paddingTop: "1.125rem" }}>
            <p style={{ fontSize: "0.78125rem", color: "#6a6259", margin: 0, lineHeight: 1.55 }}>
              Pour l’heure, les comptes sont réservés aux personnes qui participent au projet. Les inscriptions seront ouvertes lors du lancement du site. Il est toutefois possible de demander un accès anticipé depuis la page de contact.
            </p>
          </div>
        )}
        </div>

        {/* Les mentions légales doivent être atteignables d'ici : c'est sur
            cette page qu'on recueille des adresses. */}
        <nav style={{ marginTop: "1.875rem", textAlign: "center", fontSize: "0.71875rem", color: "#6a6259" }}>
          <a href="/confidentialite" style={{ color: "#6a6259", textDecoration: "underline", textUnderlineOffset: "2px" }}>
            Politique de confidentialité
          </a>
          <span style={{ margin: "0 0.625rem" }}>·</span>
          <a href="/conditions-utilisation" style={{ color: "#6a6259", textDecoration: "underline", textUnderlineOffset: "2px" }}>
            Conditions d’utilisation
          </a>
          <span style={{ margin: "0 0.625rem" }}>·</span>
          <a href="/contact" style={{ color: "#6a6259", textDecoration: "underline", textUnderlineOffset: "2px" }}>
            Contact
          </a>
        </nav>

        {/* ── Démarchage ── */}
        <aside style={{ marginTop: "2.125rem", border: "1px solid #ddc9c2", background: "#fdf6f4", borderRadius: "0.5rem", padding: "1.375rem 1.625rem", maxWidth: "41.25rem", marginLeft: "auto", marginRight: "auto" }}>
          <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.9375rem", color: "#9a4a3a", margin: "0 0 0.5rem" }}>
            Aucun démarchage
          </p>
          <p style={{ fontSize: "0.78125rem", color: "#6a5a54", lineHeight: 1.7, margin: 0 }}>
            Toute sollicitation commerciale relative à ce site est
            <strong style={{ color: "#8a3a2a" }}> refusée par avance</strong>, qu’elle soit
            envoyée par une personne ou par un automate. Cela vaut pour le référencement,
            la refonte, l’audit, la publicité, l’intelligence artificielle ou la prestation
            de développement. Les adresses figurant sur ce site ne valent pas consentement
            et ne sont pas collectables.
          </p>
          <p style={{ fontSize: "0.78125rem", color: "#6a5a54", lineHeight: 1.7, margin: "0.625rem 0 0" }}>
            La prospection par voie électronique sans accord préalable est interdite en France
            (article L. 34-5 du code des postes et des communications électroniques) et
            constitue un traitement de données sans base légale au sens du RGPD. Tout message
            de cette nature sera conservé, horodaté et signalé à la CNIL.
          </p>
        </aside>

        {/* ── Cul-de-lampe ── */}
        <div style={{ marginTop: "2.875rem" }}><Ornement nom="vigne" largeur="11.25rem" opacite={0.75} /></div>

      </div>
    </main>
  );
}
