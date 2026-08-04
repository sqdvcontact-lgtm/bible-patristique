"use client";

import React, { useState } from "react";

// Point de contact du site. Public par nature — il vit hors du verrou (le proxy
// le laisse passer), pour que les mentions légales puissent y renvoyer même
// quand le reste du site est fermé.

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", fontSize: "0.84375rem", border: "1px solid var(--cs-bord)",
  borderRadius: "6px", background: "var(--cs-fond-clair)", color: "var(--cs-texte-fort)", outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
};
const labelStyle: React.CSSProperties = {
  fontSize: "0.6875rem", fontWeight: 600, color: "#566150", letterSpacing: "0.06em",
  display: "block", marginBottom: "5px",
};

export default function ContactPage() {
  const [nom, setNom] = useState("");
  const [courriel, setCourriel] = useState("");
  const [sujet, setSujet] = useState("");
  const [message, setMessage] = useState("");
  const [etat, setEtat] = useState<"repos" | "envoi" | "fait">("repos");
  const [erreur, setErreur] = useState<string | null>(null);


  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null); setEtat("envoi");
    try {
      const res = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, courriel, sujet, message }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErreur(j.error ?? "L’envoi a échoué."); setEtat("repos"); return;
      }
      setEtat("fait");
    } catch {
      setErreur("Connexion impossible. Réessayez plus tard."); setEtat("repos");
    }
  };

  return (
    <main style={{ background: "var(--cs-fond)", minHeight: "calc(100vh - 3.5rem)", padding: "56px 24px 80px" }}>
      <div style={{ maxWidth: "35rem", margin: "0 auto" }}>
        <p style={{ fontSize: "0.625rem", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--cs-vert)", marginBottom: "10px" }}>
          Nous écrire
        </p>
        <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "clamp(26px, 3.5vw, 34px)", fontWeight: "normal", color: "var(--cs-encre)", marginBottom: "12px", lineHeight: 1.25 }}>
          Contact
        </h1>
        <p style={{ fontSize: "0.84375rem", color: "#566150", lineHeight: 1.7, marginBottom: "28px" }}>
          Une question, un signalement d’erreur, l’exercice de vos droits sur vos données&#8239;: écrivez-nous
          par ce formulaire. Laissez votre adresse si vous souhaitez une réponse.
        </p>

        {etat === "fait" ? (
          <div style={{ background: "rgba(var(--cs-vert-rgb),0.07)", border: "1px solid rgba(var(--cs-vert-rgb),0.22)", borderRadius: "8px", padding: "18px 20px" }}>
            <p style={{ fontSize: "0.84375rem", color: "#2a6040", margin: 0, lineHeight: 1.65 }}>
              Votre message est parti. Merci&#8239;! Nous vous répondrons si vous avez laissé une adresse.
            </p>
          </div>
        ) : (
          <form onSubmit={envoyer} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {erreur && (
              <p style={{ fontSize: "0.78125rem", color: "var(--cs-danger-fonce)", margin: 0, lineHeight: 1.5 }}>{erreur}</p>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label htmlFor="ct-nom" style={labelStyle}>NOM (facultatif)</label>
                <input id="ct-nom" type="text" value={nom} maxLength={120} autoComplete="name"
                  onChange={e => setNom(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label htmlFor="ct-mail" style={labelStyle}>ADRESSE DE RÉPONSE</label>
                <input id="ct-mail" type="email" value={courriel} maxLength={254} autoComplete="email"
                  placeholder="vous@exemple.fr" onChange={e => setCourriel(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div>
              <label htmlFor="ct-sujet" style={labelStyle}>SUJET (facultatif)</label>
              <input id="ct-sujet" type="text" value={sujet} maxLength={200}
                onChange={e => setSujet(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label htmlFor="ct-msg" style={labelStyle}>MESSAGE</label>
              <textarea id="ct-msg" required value={message} maxLength={5000} rows={7}
                onChange={e => setMessage(e.target.value)}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }} />
            </div>
            <button type="submit" disabled={etat === "envoi"}
              style={{ alignSelf: "flex-start", padding: "10px 22px", borderRadius: "6px", border: "none",
                background: etat === "envoi" ? "#8aaa96" : "var(--cs-vert)", color: "#fff", fontSize: "0.84375rem",
                fontWeight: 500, cursor: etat === "envoi" ? "default" : "pointer" }}>
              {etat === "envoi" ? "Envoi…" : "Envoyer"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
