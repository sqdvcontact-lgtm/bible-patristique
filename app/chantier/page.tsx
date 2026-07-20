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

type Mode = "connexion" | "inscription";

// Même bouton PayPal que la page « Soutenir » : un seul compte de don sur le site.
const LIEN_PAYPAL = "https://www.paypal.com/donate/?hosted_button_id=9M463NPH2RQXL";

const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", fontSize: "13.5px", border: "1px solid #d6d0c4", borderRadius: "6px", background: "#f9f7f4", color: "#1e1a16", outline: "none", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { fontSize: "11px", fontWeight: 600, color: "#6a7b6e", letterSpacing: "0.06em", display: "block", marginBottom: "5px" };

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
function IcoLien() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3A4 4 0 0 0 13 5.34l-1.5 1.5" {...traits} />
      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3A4 4 0 0 0 11 18.66l1.5-1.5" {...traits} />
    </svg>
  );
}
function IcoExigence() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      {/* une balance : la rigueur, et le partage du jugement */}
      <path d="M12 4.5v15M7 19.5h10" {...traits} />
      <path d="M5 8.5h14" {...traits} />
      <path d="M5 8.5 2.5 14h5z" {...traits} />
      <path d="M19 8.5 16.5 14h5z" {...traits} />
      <circle cx="12" cy="6.6" r="1.6" {...traits} />
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

function Ornement({ nom, largeur, opacite = 1, alt = "" }: { nom: keyof typeof ORNEMENTS; largeur: number; opacite?: number; alt?: string }) {
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

/** Siècle en petites capitales : « XVII<sup>e</sup> » composé en capitales
 *  pleines fait une tache dans une ligne de bas-de-casse. */
function Siecle({ n }: { n: string }) {
  return (
    <span style={{ fontVariant: "small-caps", textTransform: "lowercase" }}>
      {n}<sup style={{ fontVariant: "normal", fontSize: "0.72em" }}>e</sup>
    </span>
  );
}

const PRINCIPES: { ico: React.ReactNode; titre: string; texte: React.ReactNode }[] = [
  { ico: <IcoColonnes />, titre: "Les traductions en regard",
    texte: <>Sur le modèle de la <i>Sainte Bible polyglotte</i> de Fulcran Vigouroux, Corpus Scriptura
      permettra de consulter en regard les meilleures traductions françaises de la Bible. Nous prévoyons
      également d’y proposer les textes bibliques en grec, en latin et dans d’autres langues anciennes.</> },
  { ico: <IcoPeres />, titre: "Les Pères de l’Église",
    texte: <>Les grands textes patristiques seront proposés en français dans des traductions anciennes,
      du <Siecle n="xvii" /> au <Siecle n="xx" /> siècle, toutes libres de droit. Nous espérons pouvoir
      bientôt mettre également à votre disposition les textes dans leur langue originale et, peut-être,
      des éditions critiques sous licence.</> },
  { ico: <IcoLien />, titre: "Le lien entre les deux",
    texte: <>La base de données met en relation la Bible et les œuvres des Pères de l’Église au moyen
      d’une interface épurée et facile à utiliser. Grâce notamment à un système de recherche avancée,
      le site s’adresse aussi bien aux curieux qu’aux chercheurs.</> },
  { ico: <IcoExigence />, titre: "Exigence et collaboration",
    texte: <>Corpus Scriptura rassemble d’immenses quantités de textes, une matière complexe à traiter
      et à organiser. Nous nous attachons néanmoins à garantir un haut niveau de rigueur et de fiabilité.
      Grâce à votre collaboration – notamment par vos signalements –, nous espérons améliorer sans cesse
      le site.</> },
  { ico: <IcoLibre />, titre: "Libre d’accès",
    texte: <>Corpus Scriptura est sans publicité et sans abonnement. Le travail est bénévole,
      et le restera.</> },
];

// ── Chiffres du corpus ───────────────────────────────────────────────────────
function Chiffres() {
  const [n, setN] = useState<{ oeuvres: number; traductions: number; auteurs: number } | null>(null);

  // Par une route serveur, et non plus par le client public : le rôle `anon`
  // n'a plus aucun droit de lecture sur la base.
  useEffect(() => {
    fetch("/api/chiffres")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.oeuvres !== null) setN(d); })
      .catch(() => {});
  }, []);

  // Tant que le compte n'est pas revenu, on n'affiche rien plutôt qu'un zéro :
  // un chiffre faux est pire qu'un chiffre absent sur une page de présentation.
  if (!n) return <div style={{ height: "72px" }} />;

  const cases: [number, string][] = [
    [n.oeuvres, n.oeuvres > 1 ? "œuvres disponibles" : "œuvre disponible"],
    [n.traductions, n.traductions > 1 ? "traductions bibliques" : "traduction biblique"],
    [n.auteurs, n.auteurs > 1 ? "auteurs répertoriés" : "auteur répertorié"],
  ];

  return (
    <div className="cs-chiffres">
      {cases.map(([valeur, libelle]) => (
        <div key={libelle} style={{ textAlign: "center" }}>
          <div className="cs-chiffre-valeur" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "30px", color: "#3d6b4f", lineHeight: 1 }}>
            {valeur}
          </div>
          <div className="cs-chiffre-libelle" style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#9a958d", marginTop: "6px" }}>
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
      <div style={{ background: "rgba(61,107,79,0.07)", border: "1px solid rgba(61,107,79,0.22)", borderRadius: "8px", padding: "16px 18px" }}>
        <p style={{ fontSize: "13px", color: "#2a6040", margin: 0, lineHeight: 1.6 }}>
          C’est noté. Vous recevrez un message le jour de l’ouverture – un seul, et rien d’autre.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={envoyer}>
      <p style={{ fontSize: "12.5px", color: "#6a6259", margin: "0 0 12px", lineHeight: 1.6 }}>
        Les travaux avancent, la date reste incertaine. Laissez votre adresse : elle ne servira
        qu’à vous prévenir, une fois.
      </p>
      {erreur && (
        <p style={{ fontSize: "12px", color: "#9a2a2a", margin: "0 0 10px", lineHeight: 1.5 }}>{erreur}</p>
      )}
      <div className="cs-prevenir-champs" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <input type="email" required value={adresse} onChange={e => setAdresse(e.target.value)}
          placeholder="vous@exemple.fr" aria-label="Votre adresse e-mail"
          style={{ ...inputStyle, flex: "1 1 180px", width: "auto" }} />
        <button type="submit" disabled={etat === "envoi"}
          style={{ padding: "9px 18px", borderRadius: "6px", border: "none", background: etat === "envoi" ? "#8aaa96" : "#3d6b4f", color: "#fff", fontSize: "13px", fontWeight: 500, cursor: etat === "envoi" ? "default" : "pointer", whiteSpace: "nowrap" }}>
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
        router.push(suite && suite.startsWith("/") && !suite.startsWith("//") ? suite : "/prelevements");
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
        .cs-ouverture-corps { width: 100%; max-width: 780px; margin: 0 auto; padding: 0 20px; }

        /* ── Premier écran ────────────────────────────────────────────────────
           Il occupe exactement la hauteur visible et se centre : le visiteur
           découvre un bloc entier — enseigne, titre, phrase, avis de travaux —
           sans qu'aucun paragraphe soit tranché par le bas de l'écran. On mesure
           en dvh et non en vh : sur téléphone, vh ignore la barre d'adresse et
           déborde toujours d'une cinquantaine de pixels. */
        .cs-ecran { min-height: 100dvh; display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    text-align: center; padding: 32px 20px 26px; }
        .cs-enseigne { font-family: Georgia, 'Times New Roman', serif; font-weight: normal;
                       color: #3d6b4f; letter-spacing: 0.16em; text-transform: uppercase;
                       font-size: 30px; line-height: 1.1; margin: 16px 0 4px; }
        .cs-titre { font-family: Georgia, 'Times New Roman', serif; font-weight: normal;
                    color: #1e2e22; line-height: 1.3; letter-spacing: -0.005em;
                    font-size: 20px; font-style: italic; margin: 10px 0 16px; }
        .cs-chapeau { font-size: 14.5px; color: #6a6259; line-height: 1.75;
                      max-width: 520px; margin: 0 auto; }
        .cs-suite { display: block; margin-top: 30px; color: #a89e8e; }
        .cs-principes { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 26px; margin-bottom: 38px; }
        .cs-cartes { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }
        .cs-chiffres { display: flex; justify-content: center; gap: 54px; flex-wrap: wrap; margin: 6px 0 34px; }

        /* ── Téléphone ────────────────────────────────────────────────────────
           Une colonne, marges resserrées, et surtout des cibles tactiles qui
           tiennent le doigt : le champ et le bouton passent l'un sous l'autre
           plutôt que de se partager une ligne trop étroite. */
        @media (max-width: 640px) {
          .cs-ouverture-corps { padding: 0 16px; }
          .cs-ecran { padding: 26px 16px 22px; }
          .cs-enseigne { font-size: 22px; letter-spacing: 0.13em; }
          .cs-titre { font-size: 16.5px; margin: 8px 0 14px; }
          .cs-chapeau { font-size: 13.5px; line-height: 1.7; }
          .cs-suite { margin-top: 22px; }
          .cs-principes { grid-template-columns: 1fr; gap: 18px; margin-bottom: 30px; }
          .cs-cartes { grid-template-columns: 1fr; }
          .cs-chiffres { gap: 0; justify-content: space-between; margin: 4px 0 28px; }
          .cs-chiffre-valeur { font-size: 25px !important; }
          .cs-chiffre-libelle { font-size: 9px !important; letter-spacing: 0.06em !important; }
          .cs-prevenir-champs { flex-direction: column; }
          .cs-prevenir-champs > * { width: 100%; }
          .cs-prevenir-champs button { padding: 12px 18px !important; }
          .cs-carte { padding: 20px 18px !important; }
          .cs-connexion { padding: 24px 20px 28px !important; }
        }
        /* iOS zoome sur tout champ dont le texte descend sous 16px. */
        @media (max-width: 640px) { .cs-ouverture input { font-size: 16px !important; } }
      `}</style>

      {/* ── Premier écran : un bloc entier, rien de coupé ── */}
      <header className="cs-ecran">
        {/* La gravure des bâtisseurs ouvre la page : c'est le seul ornement à
            porter un sujet, et il dit le chantier mieux que le bandeau qui
            l'annonce. Elle était en bas, où l'on ne la voyait qu'après tout
            avoir lu — donc rarement. */}
        <Ornement nom="batisseurs" largeur={400}
          alt="Des anges et des ouvriers bâtissant la muraille d’une cité" />
        <h1 className="cs-enseigne">Corpus Scriptura</h1>
        <p className="cs-titre">L’Écriture, et ce que les Pères en ont dit</p>

        <div style={{ display: "flex", gap: "11px", alignItems: "flex-start", textAlign: "left", background: "#faf3e4", border: "1px solid #e0cfa4", borderRadius: "10px", padding: "14px 18px", marginTop: "22px", maxWidth: "480px" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" style={{ color: "#9a7a38", flexShrink: 0, marginTop: "1px" }}>
            <path d="M12 8.5v4.5M12 16.2v.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M10.3 3.9 2.5 17.5A2 2 0 0 0 4.2 20.5h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
          </svg>
          <p style={{ fontSize: "12.5px", color: "#6a5a38", lineHeight: 1.65, margin: 0 }}>
            <strong style={{ color: "#7a5c20" }}>Le site est en travaux.</strong>{" "}
            Rien n’est encore ouvert : ni la lecture, ni la recherche, ni les comptes.
            Cette page est une annonce, pas une porte.
          </p>
        </div>

        {/* Les chiffres tiennent dans le premier écran depuis que le chapeau en
            est parti : l'état du chantier se lit sans avoir à faire défiler. */}
        <div style={{ marginTop: "26px" }}><Chiffres /></div>

        {/* Invite à faire défiler : sans elle, un premier écran qui tient dans la
            fenêtre laisse croire qu'il n'y a rien en dessous. */}
        <span className="cs-suite" aria-hidden="true">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v13M6.5 12.5 12 18l5.5-5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </header>

      <div className="cs-ouverture-corps" style={{ paddingBottom: "56px" }}>

        <div className="cs-principes" style={{ paddingTop: "44px" }}>
          {PRINCIPES.map(p => (
            <div key={p.titre} style={{ display: "flex", gap: "13px", alignItems: "flex-start" }}>
              <span style={{ color: "#3d6b4f", flexShrink: 0, marginTop: "1px" }}>{p.ico}</span>
              <span>
                <span style={{ display: "block", fontFamily: "Georgia, serif", fontSize: "14px", color: "#2a3d30", marginBottom: "4px" }}>{p.titre}</span>
                <span style={{ display: "block", fontSize: "12.5px", color: "#7a736a", lineHeight: 1.6 }}>{p.texte}</span>
              </span>
            </div>
          ))}
        </div>

        <div style={{ margin: "6px 0 34px" }}><Ornement nom="clochettes" largeur={210} opacite={0.7} /></div>

        {/* ── Textes rares ── */}
        <div style={{ borderTop: "1px solid #e0d9cc", borderBottom: "1px solid #e0d9cc", padding: "26px 0", marginBottom: "34px", textAlign: "center" }}>
          <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9a7a38", margin: "0 0 12px" }}>
            Ce qu’on ne trouve pas ailleurs
          </p>
          <p style={{ fontSize: "13.5px", color: "#4a453e", lineHeight: 1.8, maxWidth: "580px", margin: "0 auto" }}>
            De nombreux ouvrages excellents ne subsistent plus que dans des éditions anciennes,
            aujourd’hui introuvables, coûteuses ou difficiles d’accès. Nous nous efforçons de les
            retrouver en ligne ou d’en faire l’acquisition, afin de les publier avec le plus grand
            soin et de leur redonner vie sur internet.
          </p>
          <p style={{ fontSize: "12.5px", color: "#8a8278", lineHeight: 1.7, maxWidth: "540px", margin: "14px auto 0", fontStyle: "italic" }}>
            C’est le cœur du travail, et ce qui prend le plus de temps.
          </p>
        </div>

        {/* ── Être prévenu, et soutenir ── */}
        <div className="cs-cartes">
          <div className="cs-carte" style={{ background: "#fff", border: "1px solid #ddd8cf", borderRadius: "12px", padding: "24px 26px" }}>
            <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9a958d", margin: "0 0 14px" }}>
              À l’ouverture
            </p>
            <Prevenir />
          </div>
          <div className="cs-carte" style={{ background: "#fff", border: "1px solid #ddd8cf", borderRadius: "12px", padding: "24px 26px", display: "flex", flexDirection: "column" }}>
            <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9a958d", margin: "0 0 14px" }}>
              Soutenir le projet
            </p>
            <p style={{ fontSize: "12.5px", color: "#6a6259", margin: "0 0 14px", lineHeight: 1.6, flex: 1 }}>
              Le travail est bénévole, les frais ne le sont pas : hébergement, achat des
              éditions, numérisation. Un don avance le chantier.
            </p>
            <a href={LIEN_PAYPAL} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "9px 18px", borderRadius: "6px", border: "1px solid #3d6b4f", background: "#fff", color: "#3d6b4f", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>
              <svg width="14" height="14" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <path d="M20 34S4 23 4 13a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 10-16 21-16 21z"
                  stroke="currentColor" strokeWidth="2.5" fill="rgba(61,107,79,0.08)" strokeLinejoin="round" />
              </svg>
              Faire un don
            </a>
          </div>
        </div>

        {/* ── Connexion ── */}
        <div className="cs-connexion" style={{ background: "#fff", border: "1px solid #ddd8cf", borderRadius: "12px", padding: "30px 32px 34px", width: "100%", maxWidth: "380px", margin: "0 auto", boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "20px", fontWeight: "normal", color: "#2a3d30", margin: 0 }}>
            {mode === "connexion" ? "Connexion" : "Créer un compte"}
          </h2>
        </div>
        {erreur === "__confirm__" ? (
          <div style={{ background: "rgba(61,107,79,0.07)", border: "1px solid rgba(61,107,79,0.2)", borderRadius: "6px", padding: "14px 16px", marginBottom: "20px" }}>
            <p style={{ fontSize: "13px", color: "#2a6040", lineHeight: 1.65, margin: 0 }}>Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse, puis connectez-vous.</p>
          </div>
        ) : erreur ? (
          <div style={{ background: "rgba(180,50,40,0.06)", border: "1px solid rgba(180,50,40,0.18)", borderRadius: "6px", padding: "10px 14px", marginBottom: "18px" }}>
            <p style={{ fontSize: "12.5px", color: "#9a2a2a", margin: 0, lineHeight: 1.55 }}>{erreur}</p>
          </div>
        ) : null}
        <form onSubmit={soumettre} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {mode === "inscription" && (
            <div>
              <label style={labelStyle}>PSEUDONYME *</label>
              <input type="text" value={pseudo} onChange={e => setPseudo(e.target.value)} required maxLength={32} placeholder="Visible publiquement, doit être unique" style={inputStyle} />
            </div>
          )}
          <div>
            <label style={labelStyle}>ADRESSE E-MAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="vous@exemple.fr" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>MOT DE PASSE</label>
            <input type="password" value={mdp} onChange={e => setMdp(e.target.value)} required minLength={6} placeholder="··········" style={inputStyle} />
          </div>
          <button type="submit" disabled={chargement}
            style={{ marginTop: "6px", padding: "10px", borderRadius: "6px", border: "none", background: chargement ? "#8aaa96" : "#3d6b4f", color: "#fff", fontSize: "13.5px", fontWeight: 500, cursor: chargement ? "default" : "pointer" }}>
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
          <div style={{ marginTop: "20px", textAlign: "center", borderTop: "1px solid #ede9e2", paddingTop: "18px" }}>
            <p style={{ fontSize: "12.5px", color: "#9a958d", margin: 0 }}>
              {mode === "connexion" ? "Pas encore de compte ?" : "Déjà un compte ?"}
              {" "}
              <button onClick={() => { setMode(mode === "connexion" ? "inscription" : "connexion"); setErreur(null); setMdp(""); setPseudo(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12.5px", color: "#3d6b4f", fontWeight: 500, padding: 0, textDecoration: "underline" }}>
                {mode === "connexion" ? "Créer un compte" : "Se connecter"}
              </button>
            </p>
          </div>
        ) : (
          <div style={{ marginTop: "20px", textAlign: "center", borderTop: "1px solid #ede9e2", paddingTop: "18px" }}>
            <p style={{ fontSize: "12.5px", color: "#9a958d", margin: 0, lineHeight: 1.55 }}>
              Les comptes sont réservés aux personnes qui travaillent au chantier.<br />
              Les inscriptions ouvriront avec le site.
            </p>
          </div>
        )}
        </div>

        {/* ── Démarchage ── */}
        <aside style={{ marginTop: "34px", border: "1px solid #ddc9c2", background: "#fdf6f4", borderRadius: "10px", padding: "20px 24px", maxWidth: "660px", marginLeft: "auto", marginRight: "auto" }}>
          <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9a4a3a", margin: "0 0 10px" }}>
            Aucun démarchage
          </p>
          <p style={{ fontSize: "12.5px", color: "#6a5a54", lineHeight: 1.7, margin: 0 }}>
            Toute sollicitation commerciale relative à ce site – référencement, refonte,
            audit, publicité, intelligence artificielle, prestation de développement –
            est <strong style={{ color: "#8a3a2a" }}>refusée par avance</strong>, qu’elle soit
            envoyée par une personne ou par un automate. Les adresses figurant sur ce site
            ne valent pas consentement et ne sont pas collectables.
          </p>
          <p style={{ fontSize: "12.5px", color: "#6a5a54", lineHeight: 1.7, margin: "10px 0 0" }}>
            La prospection par voie électronique sans accord préalable est interdite en France
            (article L. 34-5 du code des postes et des communications électroniques) et
            constitue un traitement de données sans base légale au sens du RGPD. Tout message
            de cette nature sera conservé, horodaté et signalé à la CNIL.
          </p>
        </aside>

        {/* ── Cul-de-lampe ── */}
        <div style={{ marginTop: "46px" }}><Ornement nom="vigne" largeur={180} opacite={0.75} /></div>

      </div>
    </main>
  );
}

