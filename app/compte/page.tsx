"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { calculerRang, couleurRang } from "@/app/lib/classement";
import Image from "next/image";

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
  membre_depuis?: string | null;
};

type PhotoProfil = { id_auteur: string; nom: string; imageUrl: string; posX?: number; posY?: number; zoom?: number };
type CitationPreferee = { id: string; texte: string; type: "biblique" | "patristique"; ref?: string; auteur?: string; titre_oeuvre?: string };

const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", fontSize: "0.84375rem", border: "1px solid #d6d0c4", borderRadius: "6px", background: "#f9f7f4", color: "#1e1a16", outline: "none", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { fontSize: "0.6875rem", fontWeight: 600, color: "#6a7b6e", letterSpacing: "0.06em", display: "block", marginBottom: "5px" };

function urlCompte(): string {
  if (typeof window !== "undefined") return `${window.location.origin}/compte`;
  return "/compte";
}

export default function ComptePage() {
  const router = useRouter();
  const [verification, setVerification] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string; email_confirmed_at: string | null } | null>(null);

  useEffect(() => { document.title = 'Mon compte · Corpus Scriptura' }, [])

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

  // Cette page ne montre plus que l'espace personnel. Un visiteur sans session
  // n'a rien à y faire : le proxy l'aura déjà renvoyé au chantier, et ce garde
  // ne sert qu'au cas où la session expire pendant qu'il est là.
  useEffect(() => {
    if (!verification && !user) router.replace("/chantier");
  }, [verification, user, router]);

  if (verification || !user) {
    return (
      <main style={{ minHeight: "calc(100vh - 3.5rem)", background: "#f3efe3", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "0.8125rem", color: "#9a958d", fontStyle: "italic" }}>Chargement…</p>
      </main>
    );
  }

  return <MonCompte user={user} router={router} />;
}

// ── Mon compte ───────────────────────────────────────────────────────────────
function MonCompte({ user, router }: { user: { id: string; email: string; email_confirmed_at: string | null }; router: ReturnType<typeof useRouter> }) {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    supabase.from("profils").select("id, pseudo, nom, prenom, traduction_defaut, bio, contact_email, pub_rang, pub_essais, pub_favoris_oeuvre, pub_favoris_versets, onboarding_vu, membre_depuis")
      .eq("id", user.id).maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          // membre_depuis absent de la table : retenter sans ce champ
          supabase.from("profils").select("id, pseudo, nom, prenom, traduction_defaut, bio, contact_email, pub_rang, pub_essais, pub_favoris_oeuvre, pub_favoris_versets, onboarding_vu")
            .eq("id", user.id).maybeSingle()
            .then(({ data: d2 }) => {
              if (d2 && !d2.onboarding_vu) { router.replace("/bienvenue"); return; }
              setProfil(d2 ?? null); setChargement(false);
            });
          return;
        }
        if (data && !data.onboarding_vu) { router.replace("/bienvenue"); return; }
        setProfil(data ?? null); setChargement(false);
      });
  }, [user.id, router]);

  if (chargement) {
    return (
      <main style={{ minHeight: "calc(100vh - 3.5rem)", background: "#f3efe3", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "0.8125rem", color: "#9a958d", fontStyle: "italic" }}>Chargement…</p>
      </main>
    );
  }

  if (!profil) return <ChoixPseudoInitial userId={user.id} onCree={(p) => setProfil(p)} />;
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
    const res = await fetch("/api/compte/creer-profil", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId, pseudo: pseudo.trim() }) });
    const json = await res.json();
    setEnvoi(false);
    if (!res.ok) { setErreur(json.error ?? "Erreur."); return; }
    onCree({ id: userId, pseudo: pseudo.trim(), nom: null, prenom: null, traduction_defaut: "TR0001", bio: null, contact_email: null, pub_rang: true, pub_essais: true, pub_favoris_oeuvre: false, pub_favoris_versets: false });
  };

  return (
    <main style={{ minHeight: "calc(100vh - 3.5rem)", background: "#f3efe3", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ background: "#fff", border: "1px solid #ddd8cf", borderRadius: "12px", padding: "32px 36px", width: "100%", maxWidth: "23.75rem" }}>
        <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1.1875rem", fontWeight: "normal", color: "#2a3d30", marginBottom: "8px" }}>Choisissez votre pseudonyme</h1>
        <p style={{ fontSize: "0.78125rem", color: "#9a958d", marginBottom: "20px", lineHeight: 1.5 }}>Il vous identifie sur le site et doit être unique.</p>
        {erreur && <p style={{ fontSize: "0.78125rem", color: "#9a2a2a", marginBottom: "12px" }}>{erreur}</p>}
        <form onSubmit={valider} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input type="text" value={pseudo} onChange={e => setPseudo(e.target.value)} maxLength={32} autoFocus placeholder="Pseudonyme" style={inputStyle} />
          <button type="submit" disabled={envoi} style={{ padding: "10px", borderRadius: "6px", border: "none", background: "#3d6b4f", color: "#fff", fontSize: "0.84375rem", fontWeight: 500, cursor: "pointer" }}>
            {envoi ? "Enregistrement…" : "Valider"}
          </button>
        </form>
      </div>
    </main>
  );
}

// ── Barre de rang ────────────────────────────────────────────────────────────
function SectionRang({ score }: { score: number }) {
  const { rang, rangSuivant, seuilSuivant, seuilPrecedent } = calculerRang(score);
  const couleurs = couleurRang(rang);
  const [largeur, setLargeur] = useState(0);

  const pourcentage = rangSuivant
    ? Math.min(((score - seuilPrecedent) / (seuilSuivant! - seuilPrecedent)) * 100, 100)
    : 100;

  useEffect(() => {
    const t = setTimeout(() => setLargeur(pourcentage), 80);
    return () => clearTimeout(t);
  }, [pourcentage]);

  const RANGS = ["Catéchumène", "Disciple", "Docteur"];

  const barreColor = rang === 'Catéchumène' ? '#8ec98e' : rang === 'Disciple' ? '#3d7a3d' : '#9a4a1f';

  const barreWidth =
    rang === "Catéchumène" ? `${largeur / 3}%`
    : rang === "Disciple" ? `${33.33 + largeur / 3}%`
    : "100%";

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: couleurs.texte, background: couleurs.fond, padding: "4px 13px", borderRadius: "6px", letterSpacing: "0.01em", fontFamily: "var(--font-source-serif), Georgia, serif" }}>
          {rang}
        </span>
        <span style={{ fontSize: "0.75rem", color: "#8a8278", fontFamily: "var(--font-source-serif), Georgia, serif" }}>
          {score} point{score !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ marginBottom: "4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
          {RANGS.map((r, i) => (
            <span key={r} style={{ fontSize: "0.53125rem", fontWeight: r === rang ? 700 : 400, color: r === rang ? couleurs.texte : "#c0b8ae", letterSpacing: "0.06em", textTransform: "uppercase", flex: 1, textAlign: i === 0 ? "left" : i === 2 ? "right" : "center" }}>
              {r}
            </span>
          ))}
        </div>
        <div style={{ position: "relative", height: "5px", background: "#ece8df", borderRadius: "999px", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: barreWidth, background: barreColor, borderRadius: "999px", transition: "width 1s cubic-bezier(0.4,0,0.2,1), background 0.4s ease" }} />
          <div style={{ position: "absolute", left: "33.3%", top: 0, bottom: 0, width: "2px", background: "#f3efe3", zIndex: 1 }} />
          <div style={{ position: "absolute", left: "66.6%", top: 0, bottom: 0, width: "2px", background: "#f3efe3", zIndex: 1 }} />
        </div>
        {rangSuivant && (
          <p style={{ fontSize: "0.625rem", color: "#c0b8ae", margin: "4px 0 0", fontStyle: "italic", textAlign: "right" }}>
            {seuilSuivant! - score} point{seuilSuivant! - score > 1 ? "s" : ""} avant <em>{rangSuivant}</em>
          </p>
        )}
      </div>

    </>
  );
}

// ── Publications ─────────────────────────────────────────────────────────────
type Essai = { id: number; titre: string; cree_le: string }

function SectionPublications({ userId }: { userId: string }) {
  const [essais, setEssais] = useState<Essai[]>([]);
  const [charge, setCharge] = useState(true);

  useEffect(() => {
    supabase.from("essais").select("id, titre, cree_le")
      .eq("auteur_id", userId).eq("statut", "publie")
      .order("cree_le", { ascending: true })
      .then(({ data }) => { setEssais(data ?? []); setCharge(false); });
  }, [userId]);

  if (charge || essais.length === 0) return null;

  return (
    <div style={{ background: "#fdf9f3", border: "1px solid #e4dfd8", borderRadius: "10px", padding: "24px 26px", marginBottom: "16px" }}>
      <p style={{ fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9a7a38", margin: "0 0 14px", textAlign: "center" }}>Publications</p>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {essais.map((e, i) => (
          <a key={e.id} href={`/essais/${e.id}`}
            style={{ display: "flex", alignItems: "baseline", gap: "10px", padding: "8px 0", textDecoration: "none", borderBottom: i < essais.length - 1 ? "1px solid #f0ece6" : "none" }}>
            <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.84375rem", fontStyle: "italic", color: "#2a3d30", flex: 1, lineHeight: 1.4 }}>{e.titre}</span>
            <span style={{ fontSize: "0.625rem", color: "#c0b8ae", flexShrink: 0 }}>{new Date(e.cree_le).getFullYear()}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Favoris ──────────────────────────────────────────────────────────────────
type FavoriOeuvre = { id_oeuvre: string; titre: string; auteur_nom: string }

function SectionFavoris({ userId }: { userId: string }) {
  const [favoris, setFavoris] = useState<FavoriOeuvre[]>([]);
  const [charge, setCharge] = useState(true);

  useEffect(() => {
    supabase.from("favoris_oeuvres").select("id_oeuvre, oeuvres(titre, auteurs(nom))")
      .eq("user_id", userId).limit(12)
      .then(({ data }) => {
        setFavoris((data ?? []).map((f: any) => ({ id_oeuvre: f.id_oeuvre, titre: f.oeuvres?.titre ?? "—", auteur_nom: f.oeuvres?.auteurs?.nom ?? "" })));
        setCharge(false);
      });
  }, [userId]);

  if (charge || favoris.length === 0) return null;

  return (
    <div style={{ background: "#fdf9f3", border: "1px solid #e4dfd8", borderRadius: "10px", padding: "24px 26px", marginBottom: "16px" }}>
      <p style={{ fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9a7a38", margin: "0 0 14px", textAlign: "center" }}>Bibliothèque</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "8px" }}>
        {favoris.map(f => (
          <a key={f.id_oeuvre} href={`/oeuvre/${encodeURIComponent(f.id_oeuvre)}`}
            style={{ display: "block", padding: "12px 14px", background: "#f9f7f3", border: "1px solid #e4dfd8", borderRadius: "7px", textDecoration: "none", borderLeft: "3px solid #c8c0b4", transition: "border-color 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderLeftColor = "#3d6b4f"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderLeftColor = "#c8c0b4"; }}>
            {f.auteur_nom && <p style={{ fontSize: "0.5625rem", fontWeight: 600, letterSpacing: "0.06em", color: "#9a958d", textTransform: "uppercase", margin: "0 0 3px" }}>{f.auteur_nom}</p>}
            <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.78125rem", fontStyle: "italic", color: "#2a3d30", margin: 0, lineHeight: 1.4 }}>{f.titre}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Modale recadrage photo ────────────────────────────────────────────────────
function ModaleRecadrage({ photo, onSauvegarder, onChanger, onClose }: {
  photo: PhotoProfil;
  onSauvegarder: (posX: number, posY: number, zoom: number) => void;
  onChanger: () => void;
  onClose: () => void;
}) {
  const [posX, setPosX] = React.useState(photo.posX ?? 50);
  const [posY, setPosY] = React.useState(photo.posY ?? 20);
  const [zoom, setZoom] = React.useState(photo.zoom ?? 1);
  const [dragging, setDragging] = React.useState(false);
  const lastPos = React.useRef<{ x: number; y: number } | null>(null);
  const zoomRef = React.useRef(zoom);
  React.useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !lastPos.current) return;
    const rawDx = e.clientX - lastPos.current.x;
    const rawDy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    const sens = Math.max(0.6, (zoomRef.current - 1) * 2.5);
    setPosX(v => Math.max(0, Math.min(100, v - rawDx / sens)));
    setPosY(v => Math.max(0, Math.min(100, v - rawDy / sens)));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    setDragging(false); lastPos.current = null;
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "12px", padding: "28px", width: "21.25rem", maxWidth: "100%", boxShadow: "0 16px 48px rgba(0,0,0,0.22)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h3 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1rem", fontWeight: "normal", color: "#2a3d30", margin: 0 }}>Recadrer la photo</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: "#b0a89e", padding: "2px" }}>x</button>
        </div>
        <div
          style={{ width: "10rem", height: "160px", borderRadius: "50%", overflow: "hidden", margin: "0 auto 20px", border: "2px solid #c8d8cc", cursor: dragging ? "grabbing" : "grab", position: "relative" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <Image
            src={photo.imageUrl}
            alt={photo.nom}
            fill sizes="160px" unoptimized
            style={{ objectFit: "cover", objectPosition: `${posX}% ${posY}%`, transform: `scale(${zoom})`, transformOrigin: "center center", userSelect: "none", pointerEvents: "none" }}
          />
        </div>
        <p style={{ fontSize: "0.625rem", color: "#a89e8e", textAlign: "center", margin: "0 0 16px", fontStyle: "italic" }}>Faites glisser pour repositionner</p>
        <div style={{ marginBottom: "12px" }}>
          <label style={{ fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.08em", color: "#6a7b6e", display: "block", marginBottom: "6px" }}>ZOOM</label>
          <input type="range" min="1" max="1.8" step="0.05" value={zoom} onChange={e => setZoom(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#3d6b4f" }} />
        </div>
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.08em", color: "#6a7b6e", display: "block", marginBottom: "6px" }}>POSITION HORIZONTALE</label>
          <input type="range" min="0" max="100" step="1" value={posX} onChange={e => setPosX(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#3d6b4f" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button onClick={() => onSauvegarder(posX, posY, zoom)}
            style={{ padding: "8px 16px", borderRadius: "6px", border: "none", background: "#3d6b4f", color: "#fff", fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer" }}>
            Appliquer
          </button>
          <button onClick={onChanger}
            style={{ padding: "7px 16px", borderRadius: "6px", border: "1px solid #d6d0c4", background: "#fff", color: "#6a7b6e", fontSize: "0.75rem", cursor: "pointer" }}>
            Changer de photo
          </button>
        </div>
      </div>
    </div>
  );
}
// ── Modal photo Père de l'Église ─────────────────────────────────────────────
type AuteurPhoto = { id_auteur: string; nom: string }

function ModalePhoto({ onChoisir, onClose }: { onChoisir: (photo: PhotoProfil) => void; onClose: () => void }) {
  const [auteurs, setAuteurs] = useState<AuteurPhoto[]>([]);
  const [charge, setCharge] = useState(true);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/auteurs` : "";

  useEffect(() => {
    supabase.from("auteurs").select("id_auteur, nom")
      .order("siecle", { ascending: true, nullsFirst: false })
      .limit(60)
      .then(({ data }) => { setAuteurs(data ?? []); setCharge(false); });
  }, []);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "12px", padding: "28px", width: "37.5rem", maxWidth: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexShrink: 0 }}>
          <h3 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1.0625rem", fontWeight: "normal", color: "#2a3d30", margin: 0 }}>Choisir une illustration</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: "#b0a89e", padding: "2px" }}>✕</button>
        </div>
        <p style={{ fontSize: "0.71875rem", color: "#9a958d", margin: "0 0 18px", flexShrink: 0, lineHeight: 1.5 }}>
          Identifiez-vous à un Père de l’Église. L’illustration apparaîtra sur votre profil.
        </p>
        {charge ? (
          <p style={{ fontSize: "0.8125rem", color: "#b0a89e", fontStyle: "italic", textAlign: "center", padding: "30px 0" }}>Chargement…</p>
        ) : (
          <div style={{ overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "12px", paddingRight: "4px" }}>
            {auteurs.map(a => (
              <AutorPhotoItem key={a.id_auteur} auteur={a} base={base}
                onChoisir={() => onChoisir({ id_auteur: a.id_auteur, nom: a.nom, imageUrl: `${base}/${a.id_auteur}.jpg` })} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AutorPhotoItem({ auteur, base, onChoisir }: { auteur: AuteurPhoto; base: string; onChoisir: () => void }) {
  const [erreur, setErreur] = useState(false);
  const url = `${base}/${auteur.id_auteur}.jpg`;

  if (erreur) return null;

  return (
    <button onClick={onChoisir} style={{ background: "none", border: "1px solid #e4dfd8", borderRadius: "8px", padding: "10px 8px 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", transition: "border-color 0.15s, background 0.15s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#3d6b4f"; (e.currentTarget as HTMLElement).style.background = "#f3f7f4"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e4dfd8"; (e.currentTarget as HTMLElement).style.background = ""; }}>
      <div style={{ width: "72px", height: "90px", position: "relative", background: "#ede9e2", borderRadius: "4px", overflow: "hidden" }}>
        <Image src={url} alt={auteur.nom} fill sizes="72px" unoptimized onError={() => setErreur(true)} style={{ objectFit: "cover", objectPosition: "top" }} />
      </div>
      <span style={{ fontSize: "0.59375rem", color: "#3a3530", textAlign: "center", lineHeight: 1.3, fontFamily: "var(--font-source-serif), Georgia, serif" }}>{auteur.nom}</span>
    </button>
  );
}

// ── Formulaire compte (utilisateur connecté) ─────────────────────────────────
function FormulaireCompte({ user, profilInit, router }: { user: { id: string; email: string; email_confirmed_at: string | null }; profilInit: Profil; router: ReturnType<typeof useRouter> }) {
  const [nom, setNom] = useState(profilInit.nom ?? "");
  const [prenom, setPrenom] = useState(profilInit.prenom ?? "");
  const [traduction, setTraduction] = useState(profilInit.traduction_defaut);
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

  // Photo de profil
  const [photoProfil, setPhotoProfil] = useState<PhotoProfil | null>(null);
  const [modalePhotoOuverte, setModalePhotoOuverte] = useState(false);
  const [modaleRecadrageOuverte, setModaleRecadrageOuverte] = useState(false);

  // Checklist data
  const [checklistDB, setChecklistDB] = useState<{ essai: boolean; passage: boolean; nbCommentaires: number; favoriOeuvre: boolean } | null>(null);
  const [checklistDefinitivementFaite, setChecklistDefinitivementFaite] = useState(false);

  // Suppression
  const [modaleSuppressionOuverte, setModaleSuppressionOuverte] = useState(false);
  const [consentSuppression, setConsentSuppression] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [erreurSuppression, setErreurSuppression] = useState<string | null>(null);

  useEffect(() => {
    // Classement
    supabase.from("classement_utilisateurs").select("score, nb_commentaires, nb_valides, nb_likes_recus, nb_essais_publies")
      .eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setClassement(data ?? { score: 0, nb_commentaires: 0, nb_valides: 0, nb_likes_recus: 0, nb_essais_publies: 0 }));

    // Traductions
    supabase.from("traductions").select("trad_id, nom").order("ordre", { ascending: true })
      .then(({ data }) => { if (data?.length) setTraductionsCompte(data.map((t: any) => ({ code: t.trad_id, label: t.nom }))); });

    // Checklist DB
    Promise.all([
      supabase.from("essais").select("id", { count: "exact", head: true }).eq("auteur_id", user.id).eq("statut", "publie"),
      supabase.from("prelevements").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("favoris_oeuvres").select("id_oeuvre", { count: "exact", head: true }).eq("user_id", user.id),
    ]).then(([{ count: ce }, { count: cp }, { count: cf }]) => {
      setChecklistDB({ essai: (ce ?? 0) > 0, passage: (cp ?? 0) > 0, favoriOeuvre: (cf ?? 0) > 0, nbCommentaires: 0 });
    });

    // Photo profil (localStorage + sync Supabase)
    try {
      const saved = localStorage.getItem("cs_photo_profil");
      if (saved) {
        const photo: PhotoProfil = JSON.parse(saved);
        setPhotoProfil(photo);
        // Sync one-time: save imageUrl to profils.avatar_url if not yet set
        if (photo.imageUrl) {
          supabase.from("profils").select("avatar_url").eq("id", user.id).maybeSingle().then(({ data }) => {
            if (!data?.avatar_url) {
              supabase.from("profils").update({ avatar_url: photo.imageUrl }).eq("id", user.id);
            }
          });
        }
      }
    } catch {}

    // Checklist permanente
    if (localStorage.getItem("cs_checklist_complete") === "1") setChecklistDefinitivementFaite(true);

  }, [user.id]);

  // Mettre à jour nbCommentaires depuis classement quand les deux sont chargés
  useEffect(() => {
    if (classement && checklistDB) {
      setChecklistDB(prev => prev ? { ...prev, nbCommentaires: classement.nb_commentaires } : prev);
    }
  }, [classement]);

  const choisirPhoto = (photo: PhotoProfil) => {
    setPhotoProfil(photo);
    localStorage.setItem("cs_photo_profil", JSON.stringify(photo));
    supabase.from("profils").update({ avatar_url: photo.imageUrl }).eq("id", user.id);
    setModalePhotoOuverte(false);
    setModaleRecadrageOuverte(false);
  };

  const sauvegarderRecadrage = (posX: number, posY: number, zoom: number) => {
    if (!photoProfil) return;
    const updated = { ...photoProfil, posX, posY, zoom };
    setPhotoProfil(updated);
    localStorage.setItem("cs_photo_profil", JSON.stringify(updated));
    setModaleRecadrageOuverte(false);
  };

  const retirerPhoto = () => {
    setPhotoProfil(null);
    localStorage.removeItem("cs_photo_profil");
    supabase.from("profils").update({ avatar_url: null }).eq("id", user.id);
  };

  const enregistrer = async () => {
    setEnregistrement(true); setStatut(null);
    const { error } = await supabase.from("profils").update({ nom: nom.trim() || null, prenom: prenom.trim() || null, traduction_defaut: traduction }).eq("id", user.id);
    setEnregistrement(false);
    if (error) { setStatut({ ok: false, msg: "Erreur lors de l’enregistrement." }); return; }
    localStorage.setItem("traduction_defaut", traduction);
    setStatut({ ok: true, msg: "Modifications enregistrées." });
    setTimeout(() => setStatut(null), 2500);
  };

  const modifierEmail = async () => {
    if (!nouvelEmail.trim() || nouvelEmail.trim() === user.email) return;
    setEnvoiEmail(true); setStatutEmail(null);
    const { error } = await supabase.auth.updateUser({ email: nouvelEmail.trim() }, { emailRedirectTo: urlCompte() });
    setEnvoiEmail(false);
    if (error) { setStatutEmail({ ok: false, msg: "Erreur — vérifiez l’adresse saisie." }); return; }
    setStatutEmail({ ok: true, msg: "Un e-mail de confirmation a été envoyé à la nouvelle adresse." });
  };

  const modifierMotDePasse = async () => {
    setStatutMdp(null);
    if (nouveauMdp.length < 6) { setStatutMdp({ ok: false, msg: "Le mot de passe doit contenir au moins 6 caractères." }); return; }
    if (nouveauMdp !== confirmationMdp) { setStatutMdp({ ok: false, msg: "Les deux mots de passe ne correspondent pas." }); return; }
    setEnvoiMdp(true);
    const { error } = await supabase.auth.updateUser({ password: nouveauMdp });
    setEnvoiMdp(false);
    if (error) { setStatutMdp({ ok: false, msg: "Erreur lors du changement de mot de passe." }); return; }
    setNouveauMdp(""); setConfirmationMdp("");
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
      setSuppressionEnCours(false); return;
    }
    await supabase.auth.signOut();
    router.push("/accueil");
  };

  const enregistrerPage = async () => {
    setEnregistrementPage(true); setStatutPage(null);
    try {
      const res = await fetch("/api/profil/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
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

  // Checklist items (live pour bio)
  const checkBio = !!bio.trim();
  const checkEssai = checklistDB?.essai ?? false;
  const checkPassage = checklistDB?.passage ?? false;
  const checkCommentaires = (checklistDB?.nbCommentaires ?? 0) >= 3;
  const checkFavoriOeuvre = checklistDB?.favoriOeuvre ?? false;

  const etapesChecklist = [
    { fait: checkBio,           label: "Compléter ma présentation",   pts: "+2 pts",  lien: null },
    { fait: checkEssai,         label: "Publier un premier essai",    pts: "+15 pts", lien: "/essais/nouveau" },
    { fait: checkPassage,       label: "Enregistrer un passage",      pts: "+1 pt",   lien: "/bible" },
    { fait: checkCommentaires,  label: "Publier trois commentaires",  pts: "+3 pts",  lien: null },
    { fait: checkFavoriOeuvre,  label: "Mettre une œuvre en favori", pts: "+1 pt",   lien: "/bibliotheque" },
  ];
  const checklistComplete = etapesChecklist.every(e => e.fait);

  // Sauvegarder dans localStorage quand toutes les etapes sont faites
  useEffect(() => {
    if (checklistComplete && checklistDB !== null) {
      localStorage.setItem("cs_checklist_complete", "1");
      setChecklistDefinitivementFaite(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklistComplete]);

  const anneeInscription = profilInit.membre_depuis ? new Date(profilInit.membre_depuis).getFullYear() : null;

  return (
    <main style={{ minHeight: "calc(100vh - 3.5rem)", background: "#f3efe3", padding: "40px 20px 100px", display: "flex", justifyContent: "center" }}>
      <style>{`
        .cs-section-card { background: #fff; border: 1px solid #e4dfd8; border-radius: 10px; padding: 24px 26px; margin-bottom: 16px; }
        .cs-section-title { font-family: var(--font-source-sans), Arial, sans-serif; font-size:0.5625rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #9a958d; margin: 0 0 18px; }
        .cs-check-item { display: flex; align-items: center; gap: 10px; }
        .cs-check-circle { width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size:0.625rem; }
      `}</style>

      <div style={{ width: "100%", maxWidth: "32.5rem" }}>

        {/* ── EN-TÊTE CENTRÉ ── */}
        <div style={{ background: "#fff", border: "1px solid #e4dfd8", borderRadius: "10px", padding: "36px 30px 28px", marginBottom: "16px", textAlign: "center" }}>

          {/* Photo ou avatar */}
          <div style={{ position: "relative", display: "inline-block", marginBottom: "16px" }}>
            {photoProfil ? (
              <div style={{ width: "80px", height: "80px", borderRadius: "50%", overflow: "hidden", position: "relative", border: "2px solid #c8d8cc", margin: "0 auto" }}>
                <Image
                  src={photoProfil.imageUrl}
                  alt={photoProfil.nom}
                  fill sizes="80px" unoptimized
                  style={{
                    objectFit: "cover",
                    objectPosition: `${photoProfil.posX ?? 50}% ${photoProfil.posY ?? 20}%`,
                    transform: `scale(${photoProfil.zoom ?? 1})`,
                    transformOrigin: "center center",
                  }}
                />
              </div>
            ) : (
              <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "linear-gradient(135deg,#3d6b4f,#2a3d30)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", border: "2px solid #c8d8cc" }}>
                <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1.75rem", color: "#e8f0eb", fontWeight: "normal" }}>
                  {profilInit.pseudo.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <button
              onClick={() => photoProfil ? setModaleRecadrageOuverte(true) : setModalePhotoOuverte(true)}
              title={photoProfil ? "Recadrer la photo" : "Choisir une illustration"}
              style={{ position: "absolute", bottom: "-4px", right: "-4px", width: "22px", height: "22px", borderRadius: "50%", border: "1.5px solid #d6d0c4", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6875rem", color: "#6a7b6e" }}>
              ✎
            </button>
          </div>
          {photoProfil && (
            <p style={{ fontSize: "0.5625rem", color: "#a89e8e", fontStyle: "italic", margin: "-8px 0 12px", letterSpacing: "0.04em" }}>
              {photoProfil.nom}
              {" · "}
              <button onClick={retirerPhoto} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.5625rem", color: "#c0562a", padding: 0 }}>retirer</button>
            </p>
          )}

          {/* Pseudo */}
          <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1.625rem", fontWeight: "normal", color: "#1e2e22", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
            {profilInit.pseudo}
          </h1>

          {/* Date inscription */}
          {anneeInscription && (
            <p style={{ fontSize: "0.65625rem", color: "#a89e8e", margin: "0 0 16px", letterSpacing: "0.06em" }}>
              Lecteur depuis {anneeInscription}
            </p>
          )}

          {/* Bouton page publique */}
          <a href={`/profil/${encodeURIComponent(profilInit.pseudo)}`} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 16px", border: "1px solid #3d6b4f", borderRadius: "20px", fontSize: "0.71875rem", color: "#3d6b4f", textDecoration: "none", letterSpacing: "0.03em", fontWeight: 500, marginBottom: classement ? "24px" : "0" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Voir ma page publique
          </a>

          {/* Rang */}
          {classement && (
            <div style={{ marginTop: "8px" }}>
              <SectionRang score={classement.score} />
            </div>
          )}

          {/* Citation favorite */}
          

          {/* Checklist intégrée */}
          {!checklistDefinitivementFaite && checklistDB !== null && (
            <div style={{ marginTop: "20px", paddingTop: "18px", borderTop: "1px solid #ede9e2", textAlign: "left" }}>
              <p style={{ fontSize: "0.53125rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#3d6b4f", margin: "0 0 12px" }}>
                Pour commencer
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {etapesChecklist.map(({ fait, label, pts, lien }) => (
                  <div key={label} className="cs-check-item">
                    <span className="cs-check-circle" style={{ background: fait ? "#edf5f0" : "#f5f3ef", border: `1.5px solid ${fait ? "#7aaa8e" : "#d6d0c4"}`, color: fait ? "#3d6b4f" : "transparent" }}>
                      {fait ? "✓" : ""}
                    </span>
                    <span style={{ flex: 1 }}>
                      {lien && !fait ? (
                        <a href={lien} style={{ fontSize: "0.78125rem", color: "#3d6b4f", textDecoration: "none" }}>{label}</a>
                      ) : (
                        <span style={{ fontSize: "0.78125rem", color: fait ? "#b0a89e" : "#3a3530", textDecoration: fait ? "line-through" : "none" }}>{label}</span>
                      )}
                    </span>
                    <span style={{ fontSize: "0.59375rem", color: "#a89e8e", flexShrink: 0 }}>{pts}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Bibliothèque ── */}
        <SectionFavoris userId={user.id} />

        {/* ── Publications ── */}
        <SectionPublications userId={user.id} />

        {/* ── Paramètres ── */}
        <div id="section-parametres">

          {/* Identité & préférences */}
          <div className="cs-section-card">
            <p className="cs-section-title">Paramètres du compte</p>
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
                style={{ padding: "8px 18px", borderRadius: "6px", border: "none", background: "#3d6b4f", color: "#fff", fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer" }}>
                {enregistrement ? "Enregistrement…" : "Enregistrer"}
              </button>
              {statut && <span style={{ fontSize: "0.78125rem", color: statut.ok ? "#3d6b4f" : "#9a2a2a" }}>{statut.ok ? "✓" : "✗"} {statut.msg}</span>}
            </div>
          </div>

          {/* Page publique */}
          <div className="cs-section-card">
            <p className="cs-section-title">Page publique</p>
            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>PRÉSENTATION</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={500} placeholder="Quelques mots sur vous…"
                style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.8125rem" }} />
              <p style={{ fontSize: "0.625rem", color: "#c8c0b8", margin: "3px 0 0", textAlign: "right" }}>{bio.length}/500</p>
            </div>
            <div style={{ marginBottom: "18px" }}>
              <label style={labelStyle}>E-MAIL DE CONTACT</label>
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Visible publiquement" style={inputStyle} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px", paddingTop: "14px", borderTop: "1px solid #ede9e2" }}>
              <p style={{ fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a958d", margin: 0 }}>Visibilité</p>
              {([
                { key: "pub_rang",            label: "Rang",                 value: pubRang,           set: setPubRang },
                { key: "pub_essais",          label: "Publications",         value: pubEssais,         set: setPubEssais },
                { key: "pub_favoris_oeuvre",  label: "Œuvres favorites", value: pubFavorisOeuvre,  set: setPubFavorisOeuvre },
                { key: "pub_favoris_versets", label: "Versets enregistrés", value: pubFavorisVersets, set: setPubFavorisVersets },
              ] as const).map(({ key, label, value, set }) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none" }}>
                  <button type="button" role="switch" aria-checked={value} onClick={() => set(!value)}
                    style={{ width: "32px", height: "18px", borderRadius: "999px", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, background: value ? "#3d6b4f" : "#d6d0c4", position: "relative", transition: "background 0.15s" }}>
                    <span style={{ position: "absolute", top: "3px", left: value ? "15px" : "3px", width: "12px", height: "12px", borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
                  </button>
                  <span style={{ fontSize: "0.78125rem", color: "#3a3530" }}>{label}</span>
                </label>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button onClick={enregistrerPage} disabled={enregistrementPage}
                style={{ padding: "8px 18px", borderRadius: "6px", border: "none", background: "#3d6b4f", color: "#fff", fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer" }}>
                {enregistrementPage ? "Enregistrement…" : "Enregistrer"}
              </button>
              {statutPage && <span style={{ fontSize: "0.78125rem", color: statutPage.ok ? "#3d6b4f" : "#9a2a2a" }}>{statutPage.ok ? "✓" : "✗"} {statutPage.msg}</span>}
            </div>
          </div>

          {/* Connexion */}
          <div className="cs-section-card">
            <p className="cs-section-title">Connexion</p>
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>ADRESSE E-MAIL</label>
              <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                <input type="email" value={nouvelEmail} onChange={e => { setNouvelEmail(e.target.value); setStatutEmail(null); }} style={{ ...inputStyle, flex: 1 }} />
                <button onClick={modifierEmail} disabled={envoiEmail || !nouvelEmail.trim() || nouvelEmail.trim() === user.email}
                  style={{ padding: "9px 14px", borderRadius: "6px", border: "1px solid #d6d0c4", background: "#fff", color: "#3d6b4f", fontSize: "0.78125rem", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {envoiEmail ? "Envoi…" : "Modifier"}
                </button>
              </div>
              {user.email_confirmed_at && !statutEmail && <p style={{ fontSize: "0.6875rem", color: "#3d6b4f", margin: "5px 0 0" }}>✓ adresse vérifiée</p>}
              {statutEmail && <p style={{ fontSize: "0.71875rem", color: statutEmail.ok ? "#3d6b4f" : "#9a2a2a", margin: "5px 0 0", lineHeight: 1.5 }}>{statutEmail.msg}</p>}
            </div>
            <div style={{ borderTop: "1px solid #ede9e2", paddingTop: "16px" }}>
              <label style={labelStyle}>MOT DE PASSE</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "2px" }}>
                <input type="password" value={nouveauMdp} onChange={e => { setNouveauMdp(e.target.value); setStatutMdp(null); }} placeholder="Nouveau mot de passe" style={inputStyle} />
                <input type="password" value={confirmationMdp} onChange={e => { setConfirmationMdp(e.target.value); setStatutMdp(null); }} placeholder="Confirmer" style={inputStyle} />
              </div>
              <button onClick={modifierMotDePasse} disabled={envoiMdp || !nouveauMdp || !confirmationMdp}
                style={{ marginTop: "8px", padding: "7px 14px", borderRadius: "6px", border: "1px solid #d6d0c4", background: "#fff", color: "#3d6b4f", fontSize: "0.78125rem", fontWeight: 500, cursor: "pointer" }}>
                {envoiMdp ? "Modification…" : "Changer le mot de passe"}
              </button>
              {statutMdp && <p style={{ fontSize: "0.71875rem", color: statutMdp.ok ? "#3d6b4f" : "#9a2a2a", margin: "6px 0 0", lineHeight: 1.5 }}>{statutMdp.msg}</p>}
            </div>
          </div>

          {/* Suppression du compte */}
          <div style={{ background: "#fff", border: "1px solid #e8d4cc", borderRadius: "10px", padding: "20px 26px" }}>
            <p style={{ fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#c0562a", margin: "0 0 10px" }}>Suppression du compte</p>
            <p style={{ fontSize: "0.75rem", color: "#9a958d", marginBottom: "14px", lineHeight: 1.55 }}>
              Pour toute question avant suppression, écrivez à{" "}
              <a href="mailto:sqdv.contact@gmail.com" style={{ color: "#9a7a38", textDecoration: "none" }}>sqdv.contact@gmail.com</a>.
            </p>
            <button onClick={() => { setModaleSuppressionOuverte(true); setConsentSuppression(false); setErreurSuppression(null); }}
              style={{ fontSize: "0.78125rem", padding: "7px 16px", borderRadius: "5px", border: "1px solid #e4c4b8", background: "#fff", color: "#c0562a", cursor: "pointer" }}>
              Supprimer mon compte
            </button>
          </div>

        </div>
      </div>

      {/* Modale photo */}
            {modaleRecadrageOuverte && photoProfil && (
        <ModaleRecadrage photo={photoProfil} onSauvegarder={sauvegarderRecadrage} onChanger={() => { setModaleRecadrageOuverte(false); setModalePhotoOuverte(true); }} onClose={() => setModaleRecadrageOuverte(false)} />
      )}
      {modalePhotoOuverte && (
        <ModalePhoto onChoisir={choisirPhoto} onClose={() => setModalePhotoOuverte(false)} />
      )}

      {/* Modale suppression */}
      {modaleSuppressionOuverte && (
        <div onClick={() => !suppressionEnCours && setModaleSuppressionOuverte(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "12px", padding: "32px", width: "30rem", maxWidth: "100%", boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1.125rem", fontWeight: "normal", color: "#1e1a14", margin: "0 0 16px" }}>Suppression du compte</h3>
            <p style={{ fontSize: "0.78125rem", color: "#5a5450", lineHeight: 1.65, margin: "0 0 14px" }}>
              Cette action est <strong>irrémédiable</strong>. Elle entraînera la suppression immédiate et définitive de :
            </p>
            <ul style={{ fontSize: "0.75rem", color: "#6a6460", lineHeight: 1.8, margin: "0 0 20px", paddingLeft: "18px" }}>
              <li>Votre profil et toutes vos informations personnelles</li>
              <li>Vos essais publiés et brouillons</li>
              <li>Tous vos commentaires</li>
              <li>Vos citations enregistrées</li>
              <li>Votre bibliothèque et œuvres favorites</li>
              <li>Vos versets enregistrés</li>
              <li>Votre historique et points de rang</li>
            </ul>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", marginBottom: "20px" }}>
              <input type="checkbox" checked={consentSuppression} onChange={e => setConsentSuppression(e.target.checked)}
                style={{ marginTop: "2px", flexShrink: 0, accentColor: "#c0562a" }} />
              <span style={{ fontSize: "0.78125rem", color: "#3a3530", lineHeight: 1.5 }}>
                J’ai compris que cette action est définitive et irrémédiable. Je confirme vouloir supprimer mon compte.
              </span>
            </label>
            {erreurSuppression && <p style={{ fontSize: "0.75rem", color: "#9a2a2a", marginBottom: "12px" }}>{erreurSuppression}</p>}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setModaleSuppressionOuverte(false)} disabled={suppressionEnCours}
                style={{ fontSize: "0.78125rem", padding: "7px 16px", borderRadius: "6px", border: "1px solid #d6d0c4", background: "#fff", color: "#6b6560", cursor: "pointer" }}>
                Annuler
              </button>
              <button onClick={supprimerCompte} disabled={suppressionEnCours || !consentSuppression}
                style={{ fontSize: "0.78125rem", padding: "7px 16px", borderRadius: "6px", border: "none", background: consentSuppression ? "#c0562a" : "#e4c4b8", color: "#fff", fontWeight: 500, cursor: consentSuppression ? "pointer" : "default", transition: "background 0.15s" }}>
                {suppressionEnCours ? "Suppression…" : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
