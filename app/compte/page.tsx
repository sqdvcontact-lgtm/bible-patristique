"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { calculerRang, couleurRang } from "@/app/lib/classement";

type Mode = "connexion" | "inscription";

const TRADUCTIONS = [
  { code: "TR0001", label: "Bible de Sacy" },
  { code: "TR0002", label: "Bible Segond" },
  { code: "TR0003", label: "Bible Crampon" },
  { code: "TR0004", label: "Vulgate" },
];

type Profil = {
  id: string;
  pseudo: string;
  nom: string | null;
  prenom: string | null;
  traduction_defaut: string;
  bio: string | null;
  contact_email: string | null;
  pub_rang: boolean;
  pub_essais: boolean;
  pub_favoris_oeuvre: boolean;
  pub_favoris_versets: boolean;
  onboarding_vu?: boolean;
};

const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", fontSize: "13.5px", border: "1px solid #d6d0c4", borderRadius: "6px", background: "#f9f7f4", color: "#1e1a16", outline: "none", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { fontSize: "11px", fontWeight: 600, color: "#6a7b6e", letterSpacing: "0.06em", display: "block", marginBottom: "5px" };

function urlCompte(): string {
  if (typeof window !== "undefined") return `${window.location.origin}/compte`;
  return "/compte";
}

export default function ComptePage() {
  const router = useRouter();
  const [verification, setVerification] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string; email_confirmed_at: string | null } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setUser(u ? { id: u.id, email: u.email ?? "", email_confirmed_at: u.email_confirmed_at ?? null } : null);
      setVerification(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email ?? "", email_confirmed_at: u.email_confirmed_at ?? null } : null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (verification) {
    return (
      <main style={{ minHeight: "calc(100vh - 48px)", background: "#f7f4ef", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "13px", color: "#9a958d", fontStyle: "italic" }}>Chargement…</p>
      </main>
    );
  }

  return user ? <MonCompte user={user} router={router} /> : <ConnexionInscription router={router} />;
}

// ── Connexion / inscription (visiteur non connecté) ──────────────────────────
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

    if (mode === "inscription" && !pseudo.trim()) {
      setErreur("Le pseudonyme est requis.");
      return;
    }

    setChargement(true);

    if (mode === "connexion") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: mdp });
      if (error) {
        setErreur("Identifiants incorrects. Vérifiez votre adresse et votre mot de passe.");
      } else {
        router.push("/prelevements");
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: mdp,
        options: { emailRedirectTo: urlCompte() },
      });
      if (error) {
        setErreur(
          error.message.includes("already registered")
            ? "Cette adresse est déjà associée à un compte. Essayez de vous connecter."
            : "Une erreur est survenue. Réessayez."
        );
      } else if (data.user) {
        // Le profil (pseudonyme) est créé via une route serveur, car aucune
        // session n'est encore active tant que l'e-mail n'est pas confirmé.
        const res = await fetch("/api/compte/creer-profil", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: data.user.id, pseudo: pseudo.trim() }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setErreur(json.error ?? "Le compte a été créé, mais le pseudonyme n'a pas pu être enregistré. Vous pourrez le choisir lors de votre première connexion.");
          setChargement(false);
          return;
        }
        setMode("connexion");
        setMdp("");
        setPseudo("");
        setErreur("__confirm__");
      }
    }
    setChargement(false);
  };

  return (
    <main style={{ minHeight: "calc(100vh - 48px)", background: "#f7f4ef", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ background: "#fff", border: "1px solid #ddd8cf", borderRadius: "12px", padding: "36px 40px 40px", width: "100%", maxWidth: "380px", boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#3d6b4f" }}>
            Corpus Scriptura
          </span>
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "22px", fontWeight: "normal", color: "#2a3d30", margin: "8px 0 0" }}>
            {mode === "connexion" ? "Connexion" : "Créer un compte"}
          </h1>
        </div>

        {erreur === "__confirm__" ? (
          <div style={{ background: "rgba(61,107,79,0.07)", border: "1px solid rgba(61,107,79,0.2)", borderRadius: "6px", padding: "14px 16px", marginBottom: "20px" }}>
            <p style={{ fontSize: "13px", color: "#2a6040", lineHeight: 1.65, margin: 0 }}>
              Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse, puis connectez-vous.
            </p>
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
              <input type="text" value={pseudo} onChange={e => setPseudo(e.target.value)} required maxLength={32} placeholder="Visible publiquement, doit être unique"
                style={inputStyle} />
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
            style={{ marginTop: "6px", padding: "10px", borderRadius: "6px", border: "none", background: chargement ? "#8aaa96" : "#3d6b4f", color: "#fff", fontSize: "13.5px", fontWeight: 500, cursor: chargement ? "default" : "pointer", letterSpacing: "0.01em", transition: "background 0.15s" }}>
            {chargement ? "Chargement…" : mode === "connexion" ? "Se connecter" : "Créer le compte"}
          </button>
        </form>

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
      </div>
    </main>
  );
}

// ── Mon compte (utilisateur connecté) ────────────────────────────────────────
function MonCompte({ user, router }: { user: { id: string; email: string; email_confirmed_at: string | null }; router: ReturnType<typeof useRouter> }) {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    supabase.from("profils").select("id, pseudo, nom, prenom, traduction_defaut, bio, contact_email, pub_rang, pub_essais, pub_favoris_oeuvre, pub_favoris_versets, onboarding_vu").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data && !data.onboarding_vu) { router.replace('/bienvenue'); return; }
        setProfil(data ?? null); setChargement(false);
      });
  }, [user.id, router]);

  if (chargement) {
    return (
      <main style={{ minHeight: "calc(100vh - 48px)", background: "#f7f4ef", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "13px", color: "#9a958d", fontStyle: "italic" }}>Chargement…</p>
      </main>
    );
  }

  // Compte existant sans profil (créé avant cette fonctionnalité, ou un aléa
  // a empêché la création du profil à l'inscription) : on demande le
  // pseudonyme avant d'aller plus loin.
  if (!profil) {
    return <ChoixPseudoInitial userId={user.id} onCree={(p) => setProfil(p)} />;
  }

  return <FormulaireCompte user={user} profilInit={profil} router={router} />;
}

function ChoixPseudoInitial({ userId, onCree }: { userId: string; onCree: (p: Profil) => void }) {
  const [pseudo, setPseudo] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const valider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pseudo.trim()) { setErreur("Le pseudonyme est requis."); return; }
    setEnvoi(true); setErreur(null);
    const res = await fetch("/api/compte/creer-profil", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, pseudo: pseudo.trim() }),
    });
    const json = await res.json();
    setEnvoi(false);
    if (!res.ok) { setErreur(json.error ?? "Erreur."); return; }
    onCree({ id: userId, pseudo: pseudo.trim(), nom: null, prenom: null, traduction_defaut: "TR0001", bio: null, contact_email: null, pub_rang: true, pub_essais: true, pub_favoris_oeuvre: false, pub_favoris_versets: false });
  };

  return (
    <main style={{ minHeight: "calc(100vh - 48px)", background: "#f7f4ef", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ background: "#fff", border: "1px solid #ddd8cf", borderRadius: "12px", padding: "32px 36px", width: "100%", maxWidth: "380px" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "19px", fontWeight: "normal", color: "#2a3d30", marginBottom: "8px" }}>Choisissez votre pseudonyme</h1>
        <p style={{ fontSize: "12.5px", color: "#9a958d", marginBottom: "20px", lineHeight: 1.5 }}>Il vous identifie sur le site et doit être unique.</p>
        {erreur && <p style={{ fontSize: "12.5px", color: "#9a2a2a", marginBottom: "12px" }}>{erreur}</p>}
        <form onSubmit={valider} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input type="text" value={pseudo} onChange={e => setPseudo(e.target.value)} maxLength={32} autoFocus placeholder="Pseudonyme" style={inputStyle} />
          <button type="submit" disabled={envoi} style={{ padding: "10px", borderRadius: "6px", border: "none", background: "#3d6b4f", color: "#fff", fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>
            {envoi ? "Enregistrement…" : "Valider"}
          </button>
        </form>
      </div>
    </main>
  );
}

// ── Section rang (épurée) ───────────────────────────────────────────────────
function SectionRang({ score }: { score: number }) {
  const { rang, rangSuivant, seuilSuivant, seuilPrecedent } = calculerRang(score);
  const couleurs = couleurRang(rang);
  const [infoOuverte, setInfoOuverte] = useState(false);
  const [largeur, setLargeur] = useState(0);

  const pourcentage = rangSuivant
    ? Math.min(((score - seuilPrecedent) / (seuilSuivant! - seuilPrecedent)) * 100, 100)
    : 100;

  useEffect(() => {
    const t = setTimeout(() => setLargeur(pourcentage), 80);
    return () => clearTimeout(t);
  }, [pourcentage]);

  const RANGS = ['Catéchumène', 'Disciple', 'Docteur'];

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <span style={{ fontSize: "15px", fontWeight: 600, color: couleurs.texte, background: couleurs.fond, padding: "5px 14px", borderRadius: "6px", letterSpacing: "0.01em", fontFamily: "Georgia, serif" }}>
          {rang}
        </span>
        <span style={{ fontSize: "13px", color: "#8a8278", fontFamily: "Georgia, serif" }}>
          {score} point{score !== 1 ? "s" : ""}
        </span>
        <button onClick={() => setInfoOuverte(true)} title="Comment fonctionne le rang ?"
          style={{ marginLeft: "auto", width: "20px", height: "20px", borderRadius: "50%", border: "1.5px solid #d6d0c4", background: "#fff", color: "#9a958d", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontStyle: "italic", fontFamily: "Georgia, serif", lineHeight: 1 }}>
          i
        </button>
      </div>

      {/* Barre */}
      <div style={{ marginBottom: "6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          {RANGS.map((r, i) => (
            <span key={r} style={{ fontSize: "9px", fontWeight: r === rang ? 700 : 400, color: r === rang ? couleurs.texte : "#c0b8ae", letterSpacing: "0.06em", textTransform: "uppercase", flex: 1, textAlign: i === 0 ? "left" : i === 2 ? "right" : "center" }}>
              {r}
            </span>
          ))}
        </div>
        <div style={{ position: "relative", height: "6px", background: "#ece8df", borderRadius: "999px", overflow: "hidden" }}>
          <div style={{
            position: "absolute", left: 0, top: 0, height: "100%",
            width: `${rang === 'Catéchumène' ? largeur / 3 : rang === 'Disciple' ? 33.33 + largeur / 3 : 100}%`,
            background: rang === 'Docteur' ? "linear-gradient(90deg,#c8c0b4 0%,#3d6b4f 33%,#9a4a1f 100%)" : rang === 'Disciple' ? "linear-gradient(90deg,#c8c0b4 0%,#3d6b4f 100%)" : "#c8c0b4",
            borderRadius: "999px", transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
          }} />
          <div style={{ position: "absolute", left: "33.3%", top: 0, bottom: 0, width: "2px", background: "#f7f4ef", zIndex: 1 }} />
          <div style={{ position: "absolute", left: "66.6%", top: 0, bottom: 0, width: "2px", background: "#f7f4ef", zIndex: 1 }} />
        </div>
        {rangSuivant && (
          <p style={{ fontSize: "10px", color: "#c0b8ae", margin: "5px 0 0", fontStyle: "italic", textAlign: "right" }}>
            {seuilSuivant! - score} point{seuilSuivant! - score > 1 ? "s" : ""} avant <em>{rangSuivant}</em>
          </p>
        )}
      </div>

      {infoOuverte && (
        <div onClick={() => setInfoOuverte(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.32)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "10px", padding: "28px 28px 24px", maxWidth: "380px", width: "100%", boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ fontFamily: "Georgia, serif", fontSize: "16px", fontWeight: "normal", color: "#2a3d30", margin: 0 }}>Système de rang</h3>
              <button onClick={() => setInfoOuverte(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "#b0a89e", lineHeight: 1, padding: "2px" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              {[
                { label: "+1 pt",  detail: "par commentaire publié" },
                { label: "+4 pts", detail: "par commentaire validé" },
                { label: "+2 pts", detail: "par « j'aime » reçu" },
                { label: "+15 pts",detail: "par essai publié" },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", alignItems: "baseline" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#3d6b4f", flexShrink: 0, minWidth: "54px" }}>{r.label}</span>
                  <span style={{ fontSize: "12px", color: "#6b6560" }}>{r.detail}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: "1px solid #ede9e2", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "7px" }}>
              {[
                { rang: "Catéchumène", detail: "Rang de départ",      couleur: "#8a8278", fond: "#f0ece6" },
                { rang: "Disciple",    detail: "À partir de 50 pts",  couleur: "#3d6b4f", fond: "rgba(61,107,79,0.10)" },
                { rang: "Docteur",     detail: "À partir de 300 pts", couleur: "#9a4a1f", fond: "rgba(192,86,42,0.10)" },
              ].map(r => (
                <div key={r.rang} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: r.couleur, background: r.fond, padding: "2px 9px", borderRadius: "4px", flexShrink: 0 }}>{r.rang}</span>
                  <span style={{ fontSize: "11.5px", color: "#9a958d" }}>{r.detail}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "11px", color: "#b0a89e", fontStyle: "italic", margin: "14px 0 0", lineHeight: 1.6 }}>
              Les rangs s'inspirent des Docteurs de l'Église, dont le commentaire des Écritures demeure une référence.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// ── Sommaire des publications ────────────────────────────────────────────────
type Essai = { id: number; titre: string; sous_titre: string | null; cree_le: string }

function SectionPublications({ userId }: { userId: string }) {
  const [essais, setEssais] = useState<Essai[]>([])
  const [charge, setCharge] = useState(true)

  useEffect(() => {
    supabase.from("essais").select("id, titre, sous_titre, cree_le")
      .eq("auteur_id", userId).eq("statut", "publie")
      .order("cree_le", { ascending: true })
      .then(({ data }) => { setEssais(data ?? []); setCharge(false) })
  }, [userId])

  if (charge || essais.length === 0) return null

  return (
    <div style={{ background: "#fff", border: "1px solid #e4dfd8", borderRadius: "10px", padding: "24px 26px", marginBottom: "20px" }}>
      <div style={{ textAlign: "center", marginBottom: "18px" }}>
        <div style={{ height: "1px", background: "linear-gradient(90deg,transparent,#c8c0b4,transparent)", marginBottom: "10px" }} />
        <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9a958d" }}>Publications</span>
        <div style={{ height: "1px", background: "linear-gradient(90deg,transparent,#c8c0b4,transparent)", marginTop: "10px" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {essais.map((e, i) => (
          <a key={e.id} href={`/essais/${e.id}`}
            style={{ display: "flex", alignItems: "baseline", gap: "10px", padding: "9px 0", textDecoration: "none", borderBottom: i < essais.length - 1 ? "1px solid #f0ece6" : "none" }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: "13.5px", fontStyle: "italic", color: "#2a3d30", flex: 1, lineHeight: 1.4 }}>
              {e.titre}
            </span>
            <span style={{ fontSize: "10px", color: "#c0b8ae", flexShrink: 0, fontFamily: "Georgia, serif" }}>
              {new Date(e.cree_le).getFullYear()}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}

// ── Œuvres favorites ─────────────────────────────────────────────────────────
type FavoriOeuvre = { id_oeuvre: string; titre: string; auteur_nom: string }

function SectionFavoris({ userId }: { userId: string }) {
  const [favoris, setFavoris] = useState<FavoriOeuvre[]>([])
  const [charge, setCharge] = useState(true)

  useEffect(() => {
    supabase.from("favoris_oeuvres").select("id_oeuvre, oeuvres(titre, auteurs(nom))")
      .eq("user_id", userId).limit(12)
      .then(({ data }) => {
        setFavoris((data ?? []).map((f: any) => ({
          id_oeuvre: f.id_oeuvre,
          titre: f.oeuvres?.titre ?? "—",
          auteur_nom: f.oeuvres?.auteurs?.nom ?? "",
        })))
        setCharge(false)
      })
  }, [userId])

  if (charge || favoris.length === 0) return null

  return (
    <div style={{ background: "#fff", border: "1px solid #e4dfd8", borderRadius: "10px", padding: "24px 26px", marginBottom: "20px" }}>
      <div style={{ textAlign: "center", marginBottom: "18px" }}>
        <div style={{ height: "1px", background: "linear-gradient(90deg,transparent,#c8c0b4,transparent)", marginBottom: "10px" }} />
        <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9a958d" }}>Bibliothèque</span>
        <div style={{ height: "1px", background: "linear-gradient(90deg,transparent,#c8c0b4,transparent)", marginTop: "10px" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
        {favoris.map(f => (
          <a key={f.id_oeuvre} href={`/oeuvre/${encodeURIComponent(f.id_oeuvre)}`}
            style={{ display: "block", padding: "14px 16px", background: "#f9f7f3", border: "1px solid #e4dfd8", borderRadius: "7px", textDecoration: "none", borderLeft: "3px solid #c8c0b4", transition: "border-color 0.15s, background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderLeftColor = "#3d6b4f"; (e.currentTarget as HTMLElement).style.background = "#f3f7f4" }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderLeftColor = "#c8c0b4"; (e.currentTarget as HTMLElement).style.background = "#f9f7f3" }}>
            {f.auteur_nom && <p style={{ fontSize: "9.5px", fontWeight: 600, letterSpacing: "0.06em", color: "#9a958d", textTransform: "uppercase", margin: "0 0 4px" }}>{f.auteur_nom}</p>}
            <p style={{ fontFamily: "Georgia, serif", fontSize: "12.5px", fontStyle: "italic", color: "#2a3d30", margin: 0, lineHeight: 1.4 }}>{f.titre}</p>
          </a>
        ))}
      </div>
    </div>
  )
}

type ChecklistData = { bioRemplie: boolean; premierEssai: boolean; premierPassage: boolean }

function ChecklistDebut({ userId }: { userId: string }) {
  const [data, setData] = useState<ChecklistData | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from("profils").select("bio").eq("id", userId).maybeSingle(),
      supabase.from("essais").select("id", { count: 'exact', head: true }).eq("auteur_id", userId).eq("statut", "publie"),
      supabase.from("prelevements").select("id", { count: 'exact', head: true }).eq("user_id", userId),
    ]).then(([{ data: p }, { count: ce }, { count: cp }]) => {
      setData({ bioRemplie: !!(p?.bio?.trim()), premierEssai: (ce ?? 0) > 0, premierPassage: (cp ?? 0) > 0 })
    })
  }, [userId])

  if (!data) return null
  if (data.bioRemplie && data.premierEssai && data.premierPassage) return null

  const etapes = [
    { fait: data.bioRemplie,    label: 'Compléter ma présentation', lien: null },
    { fait: data.premierEssai,  label: 'Publier un premier essai',  lien: '/essais/nouveau' },
    { fait: data.premierPassage, label: 'Enregistrer un passage',   lien: '/bible' },
  ]

  return (
    <div style={{ background: '#fff', border: '1px solid #ddd8cf', borderRadius: '10px', padding: '20px 24px', marginBottom: '20px' }}>
      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7aaa8e', margin: '0 0 14px' }}>
        Pour commencer
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {etapes.map(({ fait, label, lien }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: fait ? '#edf5f0' : '#f5f3ef', border: `1.5px solid ${fait ? '#7aaa8e' : '#d6d0c4'}`,
              fontSize: '10px', color: fait ? '#3d6b4f' : 'transparent',
            }}>✓</span>
            {lien && !fait ? (
              <a href={lien} style={{ fontSize: '13px', color: '#3d6b4f', textDecoration: 'none' }}>{label}</a>
            ) : (
              <span style={{ fontSize: '13px', color: fait ? '#9a958d' : '#3a3530', textDecoration: fait ? 'line-through' : 'none' }}>{label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function FormulaireCompte({ user, profilInit, router }: { user: { id: string; email: string; email_confirmed_at: string | null }; profilInit: Profil; router: ReturnType<typeof useRouter> }) {
  const [nom, setNom] = useState(profilInit.nom ?? "");
  const [prenom, setPrenom] = useState(profilInit.prenom ?? "");
  const [traduction, setTraduction] = useState(profilInit.traduction_defaut);
  // Ma page publique
  const [bio, setBio] = useState(profilInit.bio ?? "");
  const [contactEmail, setContactEmail] = useState(profilInit.contact_email ?? "");
  const [pubRang, setPubRang] = useState(profilInit.pub_rang ?? true);
  const [pubEssais, setPubEssais] = useState(profilInit.pub_essais ?? true);
  const [pubFavorisOeuvre, setPubFavorisOeuvre] = useState(profilInit.pub_favoris_oeuvre ?? false);
  const [pubFavorisVersets, setPubFavorisVersets] = useState(profilInit.pub_favoris_versets ?? false);
  const [statutPage, setStatutPage] = useState<{ ok: boolean; msg: string } | null>(null);
  const [enregistrementPage, setEnregistrementPage] = useState(false);
  const [traductionsCompte, setTraductionsCompte] = useState(TRADUCTIONS);
  const [statut, setStatut] = useState<{ ok: boolean; msg: string } | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);

  const [nouvelEmail, setNouvelEmail] = useState(user.email);
  const [statutEmail, setStatutEmail] = useState<{ ok: boolean; msg: string } | null>(null);
  const [envoiEmail, setEnvoiEmail] = useState(false);
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [confirmationMdp, setConfirmationMdp] = useState("");
  const [statutMdp, setStatutMdp] = useState<{ ok: boolean; msg: string } | null>(null);
  const [envoiMdp, setEnvoiMdp] = useState(false);

  const [classement, setClassement] = useState<{ score: number; nb_commentaires: number; nb_valides: number; nb_likes_recus: number; nb_essais_publies: number } | null>(null);

  useEffect(() => {
    supabase.from("classement_utilisateurs").select("score, nb_commentaires, nb_valides, nb_likes_recus, nb_essais_publies").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setClassement(data ?? { score: 0, nb_commentaires: 0, nb_valides: 0, nb_likes_recus: 0, nb_essais_publies: 0 }));
    supabase.from("traductions").select("trad_id, nom").order("ordre", { ascending: true })
      .then(({ data }) => { if (data?.length) setTraductionsCompte(data.map((t: any) => ({ code: t.trad_id, label: t.nom }))); });
  }, [user.id]);

  const [suppressionOuverte, setSuppressionOuverte] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [erreurSuppression, setErreurSuppression] = useState<string | null>(null);

  const enregistrer = async () => {
    setEnregistrement(true); setStatut(null);
    const { error } = await supabase.from("profils").update({
      nom: nom.trim() || null,
      prenom: prenom.trim() || null,
      traduction_defaut: traduction,
    }).eq("id", user.id);
    setEnregistrement(false);
    if (error) {
      setStatut({ ok: false, msg: "Erreur lors de l'enregistrement." });
      return;
    }
    localStorage.setItem("traduction_defaut", traduction);
    setStatut({ ok: true, msg: "Modifications enregistrées." });
    setTimeout(() => setStatut(null), 2500);
  };

  const modifierEmail = async () => {
    if (!nouvelEmail.trim() || nouvelEmail.trim() === user.email) return;
    setEnvoiEmail(true); setStatutEmail(null);
    const { error } = await supabase.auth.updateUser(
      { email: nouvelEmail.trim() },
      { emailRedirectTo: urlCompte() }
    );
    setEnvoiEmail(false);
    if (error) { setStatutEmail({ ok: false, msg: "Erreur — vérifiez l'adresse saisie." }); return; }
    setStatutEmail({ ok: true, msg: "Un e-mail de confirmation a été envoyé à la nouvelle adresse. Le changement ne prend effet qu'après l'avoir validé." });
  };

  const modifierMotDePasse = async () => {
    setStatutMdp(null);
    if (nouveauMdp.length < 6) {
      setStatutMdp({ ok: false, msg: "Le mot de passe doit contenir au moins 6 caractères." });
      return;
    }
    if (nouveauMdp !== confirmationMdp) {
      setStatutMdp({ ok: false, msg: "Les deux mots de passe ne correspondent pas." });
      return;
    }
    setEnvoiMdp(true);
    const { error } = await supabase.auth.updateUser({ password: nouveauMdp });
    setEnvoiMdp(false);
    if (error) {
      setStatutMdp({ ok: false, msg: "Erreur lors du changement de mot de passe." });
      return;
    }
    setNouveauMdp("");
    setConfirmationMdp("");
    setStatutMdp({ ok: true, msg: "Mot de passe modifié." });
  };

  const supprimerCompte = async () => {
    setSuppressionEnCours(true); setErreurSuppression(null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setErreurSuppression("Session expirée — reconnectez-vous puis réessayez."); setSuppressionEnCours(false); return; }
    const res = await fetch("/api/compte/supprimer", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setErreurSuppression(json.error ?? "Erreur lors de la suppression.");
      setSuppressionEnCours(false);
      return;
    }
    await supabase.auth.signOut();
    router.push("/accueil");
  };

  const enregistrerPage = async () => {
    setEnregistrementPage(true); setStatutPage(null);
    try {
      const res = await fetch("/api/profil/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, contact_email: contactEmail, pub_rang: pubRang, pub_essais: pubEssais, pub_favoris_oeuvre: pubFavorisOeuvre, pub_favoris_versets: pubFavorisVersets }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      setStatutPage({ ok: true, msg: "Page publique mise à jour." });
      setTimeout(() => setStatutPage(null), 2500);
    } catch (e: unknown) {
      setStatutPage({ ok: false, msg: e instanceof Error ? e.message : "Erreur." });
    } finally {
      setEnregistrementPage(false);
    }
  };

  const nomManquant = !profilInit.nom?.trim() && !profilInit.prenom?.trim()

  return (
    <main style={{ minHeight: "calc(100vh - 48px)", background: "#f7f4ef", padding: "40px 20px 80px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "500px" }}>

        {/* ── En-tête : pseudo + rang + points ── */}
        <div style={{ background: "#fff", border: "1px solid #e4dfd8", borderRadius: "10px", padding: "28px 30px", marginBottom: "20px" }}>
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "22px", fontWeight: "normal", color: "#2a3d30", margin: "0 0 2px" }}>{profilInit.pseudo}</p>
            <a href={`/profil/${encodeURIComponent(profilInit.pseudo)}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "11px", color: "#b0a89e", textDecoration: "none", letterSpacing: "0.02em" }}>
              Voir ma page publique ↗
            </a>
          </div>

          {classement && <SectionRang score={classement.score} />}

          {/* Invite nom réel */}
          {nomManquant && (
            <div style={{ marginTop: "16px", padding: "11px 14px", background: "rgba(61,107,79,0.04)", border: "1px solid rgba(61,107,79,0.14)", borderRadius: "7px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "13px", lineHeight: 1 }}>✦</span>
              <p style={{ fontSize: "11.5px", color: "#5a7060", margin: 0, lineHeight: 1.5 }}>
                Ajoutez votre prénom et nom pour signer vos publications.{" "}
                <button onClick={() => document.getElementById('section-parametres')?.scrollIntoView({ behavior: 'smooth' })}
                  style={{ background: "none", border: "none", color: "#3d6b4f", cursor: "pointer", fontSize: "11.5px", padding: 0, fontWeight: 600, textDecoration: "underline" }}>
                  Compléter mon profil
                </button>
              </p>
            </div>
          )}
        </div>

        <ChecklistDebut userId={user.id} />

        {/* ── Bibliothèque favorite ── */}
        <SectionFavoris userId={user.id} />

        {/* ── Sommaire des publications ── */}
        <SectionPublications userId={user.id} />

        {/* ── Paramètres ── */}
        <div id="section-parametres">

          {/* Identité & préférences */}
          <div style={{ background: "#fff", border: "1px solid #e4dfd8", borderRadius: "10px", padding: "24px 26px", marginBottom: "20px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9a958d", margin: "0 0 18px" }}>Paramètres du compte</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={labelStyle}>PRÉNOM</label>
                <input type="text" value={prenom} onChange={e => setPrenom(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>NOM</label>
                <input type="text" value={nom} onChange={e => setNom(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>TRADUCTION PAR DÉFAUT</label>
              <select value={traduction} onChange={e => setTraduction(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {traductionsCompte.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button onClick={enregistrer} disabled={enregistrement}
                style={{ padding: "8px 18px", borderRadius: "6px", border: "none", background: "#3d6b4f", color: "#fff", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
                {enregistrement ? "Enregistrement…" : "Enregistrer"}
              </button>
              {statut && <span style={{ fontSize: "12.5px", color: statut.ok ? "#3d6b4f" : "#9a2a2a" }}>{statut.ok ? "✓" : "✗"} {statut.msg}</span>}
            </div>
          </div>

          {/* Connexion */}
          <div style={{ background: "#fff", border: "1px solid #e4dfd8", borderRadius: "10px", padding: "24px 26px", marginBottom: "20px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9a958d", margin: "0 0 18px" }}>Connexion</p>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>ADRESSE E-MAIL</label>
              <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                <input type="email" value={nouvelEmail} onChange={e => { setNouvelEmail(e.target.value); setStatutEmail(null) }} style={{ ...inputStyle, flex: 1 }} />
                <button onClick={modifierEmail} disabled={envoiEmail || !nouvelEmail.trim() || nouvelEmail.trim() === user.email}
                  style={{ padding: "9px 14px", borderRadius: "6px", border: "1px solid #d6d0c4", background: "#fff", color: "#3d6b4f", fontSize: "12.5px", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {envoiEmail ? "Envoi…" : "Modifier"}
                </button>
              </div>
              {user.email_confirmed_at && !statutEmail && <p style={{ fontSize: "11px", color: "#3d6b4f", margin: "5px 0 0" }}>✓ adresse vérifiée</p>}
              {statutEmail && <p style={{ fontSize: "11.5px", color: statutEmail.ok ? "#3d6b4f" : "#9a2a2a", margin: "5px 0 0", lineHeight: 1.5 }}>{statutEmail.msg}</p>}
            </div>

            <div style={{ borderTop: "1px solid #ede9e2", paddingTop: "16px" }}>
              <label style={labelStyle}>MOT DE PASSE</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "2px" }}>
                <input type="password" value={nouveauMdp} onChange={e => { setNouveauMdp(e.target.value); setStatutMdp(null); }} placeholder="Nouveau mot de passe" style={inputStyle} />
                <input type="password" value={confirmationMdp} onChange={e => { setConfirmationMdp(e.target.value); setStatutMdp(null); }} placeholder="Confirmer" style={inputStyle} />
              </div>
              <button onClick={modifierMotDePasse} disabled={envoiMdp || !nouveauMdp || !confirmationMdp}
                style={{ marginTop: "8px", padding: "7px 14px", borderRadius: "6px", border: "1px solid #d6d0c4", background: "#fff", color: "#3d6b4f", fontSize: "12.5px", fontWeight: 500, cursor: "pointer" }}>
                {envoiMdp ? "Modification…" : "Changer le mot de passe"}
              </button>
              {statutMdp && <p style={{ fontSize: "11.5px", color: statutMdp.ok ? "#3d6b4f" : "#9a2a2a", margin: "6px 0 0", lineHeight: 1.5 }}>{statutMdp.msg}</p>}
            </div>
          </div>

          {/* Page publique */}
          <div style={{ background: "#fff", border: "1px solid #e4dfd8", borderRadius: "10px", padding: "24px 26px", marginBottom: "20px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9a958d", margin: "0 0 18px" }}>Page publique</p>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>PRÉSENTATION</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={500} placeholder="Quelques mots sur vous…"
                style={{ ...inputStyle, resize: "vertical", fontFamily: "Georgia, serif", fontSize: "13px" }} />
              <p style={{ fontSize: "10px", color: "#c8c0b8", margin: "3px 0 0", textAlign: "right" }}>{bio.length}/500</p>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label style={labelStyle}>E-MAIL DE CONTACT</label>
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Visible publiquement" style={inputStyle} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px", paddingTop: "14px", borderTop: "1px solid #ede9e2" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a958d", margin: 0 }}>Visibilité</p>
              {([
                { key: "pub_rang",            label: "Rang",              value: pubRang,             set: setPubRang },
                { key: "pub_essais",          label: "Publications",      value: pubEssais,           set: setPubEssais },
                { key: "pub_favoris_oeuvre",  label: "Œuvres favorites",  value: pubFavorisOeuvre,    set: setPubFavorisOeuvre },
                { key: "pub_favoris_versets", label: "Versets enregistrés", value: pubFavorisVersets, set: setPubFavorisVersets },
              ] as const).map(({ key, label, value, set }) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none" }}>
                  <button type="button" role="switch" aria-checked={value} onClick={() => set(!value)}
                    style={{ width: "32px", height: "18px", borderRadius: "999px", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, background: value ? "#3d6b4f" : "#d6d0c4", position: "relative", transition: "background 0.15s" }}>
                    <span style={{ position: "absolute", top: "3px", left: value ? "15px" : "3px", width: "12px", height: "12px", borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
                  </button>
                  <span style={{ fontSize: "12.5px", color: "#3a3530" }}>{label}</span>
                </label>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button onClick={enregistrerPage} disabled={enregistrementPage}
                style={{ padding: "8px 18px", borderRadius: "6px", border: "none", background: "#3d6b4f", color: "#fff", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
                {enregistrementPage ? "Enregistrement…" : "Enregistrer"}
              </button>
              {statutPage && <span style={{ fontSize: "12.5px", color: statutPage.ok ? "#3d6b4f" : "#9a2a2a" }}>{statutPage.ok ? "✓" : "✗"} {statutPage.msg}</span>}
            </div>
          </div>

          {/* Zone dangereuse */}
          <div style={{ background: "#fff", border: "1px solid #e8d4cc", borderRadius: "10px", padding: "20px 26px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c0562a", margin: "0 0 10px" }}>Zone dangereuse</p>
            <p style={{ fontSize: "12px", color: "#9a958d", marginBottom: "14px", lineHeight: 1.55 }}>
              Suppression immédiate et définitive. Les articles publiés ne seront pas supprimés automatiquement ; pour en demander le retrait, écrivez à labibledesperes@gmail.com.
            </p>
            {!suppressionOuverte ? (
              <button onClick={() => setSuppressionOuverte(true)}
                style={{ fontSize: "12.5px", padding: "7px 16px", borderRadius: "5px", border: "1px solid #e4c4b8", background: "#fff", color: "#c0562a", cursor: "pointer" }}>
                Supprimer mon compte
              </button>
            ) : (
              <div style={{ background: "#fdf2ee", border: "1px solid #e8d4cc", borderRadius: "6px", padding: "14px 16px" }}>
                <p style={{ fontSize: "12.5px", color: "#7a3020", marginBottom: "12px", lineHeight: 1.5 }}>
                  Confirmez-vous la suppression définitive de <strong>{user.email}</strong> ?
                </p>
                {erreurSuppression && <p style={{ fontSize: "12px", color: "#9a2a2a", marginBottom: "10px" }}>{erreurSuppression}</p>}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setSuppressionOuverte(false)} disabled={suppressionEnCours}
                    style={{ fontSize: "12px", padding: "6px 14px", borderRadius: "5px", border: "1px solid #d6d0c4", background: "#fff", color: "#6b6560", cursor: "pointer" }}>
                    Annuler
                  </button>
                  <button onClick={supprimerCompte} disabled={suppressionEnCours}
                    style={{ fontSize: "12px", padding: "6px 14px", borderRadius: "5px", border: "none", background: "#c0562a", color: "#fff", fontWeight: 500, cursor: "pointer" }}>
                    {suppressionEnCours ? "Suppression…" : "Confirmer la suppression"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
