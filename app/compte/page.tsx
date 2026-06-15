"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

type Mode = "connexion" | "inscription";

export default function ComptePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("connexion");
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    if (mode === "connexion") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: mdp });
      if (error) {
        setErreur("Identifiants incorrects. Vérifiez votre adresse et votre mot de passe.");
      } else {
        router.push("/prelevements");
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password: mdp });
      if (error) {
        setErreur(
          error.message.includes("already registered")
            ? "Cette adresse est déjà associée à un compte. Essayez de vous connecter."
            : "Une erreur est survenue. Réessayez."
        );
      } else {
        setErreur(null);
        setMode("connexion");
        setMdp("");
        setErreur("__confirm__");
      }
    }
    setChargement(false);
  };

  return (
    <main style={{
      minHeight: "calc(100vh - 48px)",
      background: "#f7f4ef",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
    }}>
      <div style={{
        background: "#fff",
        border: "1px solid #ddd8cf",
        borderRadius: "12px",
        padding: "36px 40px 40px",
        width: "100%",
        maxWidth: "380px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.05)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#3d6b4f" }}>
            Bible &amp; Tradition
          </span>
          <h1 style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "22px",
            fontWeight: "normal",
            color: "#2a3d30",
            margin: "8px 0 0",
          }}>
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
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#6a7b6e", letterSpacing: "0.06em", display: "block", marginBottom: "5px" }}>ADRESSE E-MAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="vous@exemple.fr"
              style={{ width: "100%", padding: "9px 12px", fontSize: "13.5px", border: "1px solid #d6d0c4", borderRadius: "6px", background: "#f9f7f4", color: "#1e1a16", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#6a7b6e", letterSpacing: "0.06em", display: "block", marginBottom: "5px" }}>MOT DE PASSE</label>
            <input type="password" value={mdp} onChange={e => setMdp(e.target.value)} required minLength={6} placeholder="··········"
              style={{ width: "100%", padding: "9px 12px", fontSize: "13.5px", border: "1px solid #d6d0c4", borderRadius: "6px", background: "#f9f7f4", color: "#1e1a16", outline: "none", boxSizing: "border-box" }} />
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
            <button onClick={() => { setMode(mode === "connexion" ? "inscription" : "connexion"); setErreur(null); setMdp(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12.5px", color: "#3d6b4f", fontWeight: 500, padding: 0, textDecoration: "underline" }}>
              {mode === "connexion" ? "Créer un compte" : "Se connecter"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}