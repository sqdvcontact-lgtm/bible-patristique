"use client";

import React, { useState } from "react";
import { ENCRE_TITRE, GRAISSE_TITRE, INTERLIGNE_TITRE_PAGE, TITRE_PAGE } from '@/app/lib/hierarchieTitres'
import { SERIF } from "@/app/lib/polices";
import { STYLE_CHAMP, STYLE_ETIQUETTE_CHAMP } from "@/app/lib/compositionChamp";
import { HAUTEUR_SOUS_NAVBAR, GOUTTIERE_PAGE } from "@/app/lib/mesures";

// Point de contact du site. Public par nature — il vit hors du verrou (le proxy
// le laisse passer), pour que les mentions légales puissent y renvoyer même
// quand le reste du site est fermé.

// Le champ et son étiquette prennent la composition partagée.
const inputStyle = STYLE_CHAMP;
const labelStyle = STYLE_ETIQUETTE_CHAMP;

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
    <main style={{ background: "var(--cs-fond)", minHeight: HAUTEUR_SOUS_NAVBAR, padding: `22px ${GOUTTIERE_PAGE} 80px` }}>
      {/* La mesure des pages légales, sa voisine de pied de page : les deux partageaient
          déjà tout le reste (audit d'harmonie, 2026-09-23). */}
      <div style={{ maxWidth: "var(--mesure-page)", margin: "0 auto" }}>
        <h1 style={{ fontFamily: SERIF, fontSize: TITRE_PAGE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE, marginBottom: "12px", lineHeight: INTERLIGNE_TITRE_PAGE }}>
          Contact
        </h1>
        {/* ⚠️ Deux lignes seulement : ce chapeau ne relève pas de la composition dense,
            qui ne vise que les paragraphes. Seul l'interligne rentre dans le barème du
            site — 1,70 était le troisième plus ouvert (audit du 2026-09-05). */}
        <p style={{ fontSize: "0.84375rem", color: "var(--cs-texte-second)", lineHeight: 1.52, marginBottom: "28px" }}>
          Une question, un signalement d’erreur, l’exercice de vos droits sur vos données&nbsp;: écrivez-nous
          par ce formulaire. Laissez votre adresse si vous souhaitez une réponse.
        </p>

        {etat === "fait" ? (
          <div style={{ background: "var(--cs-lecture-survol)", border: "1px solid rgba(var(--cs-vert-rgb),0.22)", borderRadius: "8px", padding: "18px 20px" }}>
            <p style={{ fontSize: "0.84375rem", color: "var(--cs-vert-fonce)", margin: 0, lineHeight: 1.65 }}>
              Votre message a bien été envoyé. Merci. Nous vous répondrons si vous avez laissé une adresse.
            </p>
          </div>
        ) : (
          <form onSubmit={envoyer} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {erreur && (
              <p role="alert" style={{ fontSize: "0.78125rem", color: "var(--cs-danger-fonce)", margin: 0, lineHeight: 1.5 }}>{erreur}</p>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))", gap: "14px" }}>
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
              className="cs-bouton-plein" style={{ alignSelf: "flex-start" }}>
              {etat === "envoi" ? "Envoi…" : "Envoyer"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
