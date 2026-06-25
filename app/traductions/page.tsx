"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Traduction = {
  trad_id: string; nom: string; auteur: string | null; dates: string | null;
  bio_courte: string | null; date_publication: string | null;
  confession: string | null; langue: string | null;
  commentaire_editorial: string | null; ordre: number;
};

function normaliserContenu(texte: string): string {
  if (!texte) return '';
  if (/^\s*<(p|h[1-6]|div|ul|ol|blockquote)[\s>]/i.test(texte)) return texte;
  const pStyle = 'color:#2a2520;font-size:13.5px;line-height:1.78;margin:0 0 12px;text-decoration:none';
  return texte
    .split(/\n+/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => `<p style="${pStyle}">${l}</p>`)
    .join('');
}

export default function TraductionsPage() {
  const [traductions, setTraductions] = useState<Traduction[]>([]);
  const [ouvert, setOuvert] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("traductions").select("*").order("ordre", { ascending: true })
      .then(({ data }) => setTraductions(data ?? []));
  }, []);

  return (
    <main style={{ background: "#f7f4ef", minHeight: "calc(100vh - 48px)" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* En-tête */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "clamp(24px, 4vw, 34px)", fontWeight: "normal",
            color: "#1e2e24", lineHeight: 1.2, marginBottom: "16px",
          }}>
            Les traductions
          </h1>
          <div style={{ fontSize: "11.5px", color: "#a09890", letterSpacing: "0.03em", marginBottom: "20px" }}>
            {traductions.length > 0
              ? `${traductions.length} traduction${traductions.length > 1 ? "s" : ""}`
              : "\u00a0"}
          </div>
          <div style={{ width: "36px", height: "1px", background: "#c8c0b4", margin: "0 auto" }} />
        </div>

        {/* Présentation */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <p style={{
            fontSize: "11.5px", fontStyle: "italic", color: "#7a8a7e",
            lineHeight: 1.65, margin: "0 auto", maxWidth: "520px",
          }}>
            La Bible a été traduite, retraduite et commentée au fil des siècles.
            Les traductions françaises offrent une richesse singulière, par leur langue,
            leur histoire et leur rapport aux traditions d'interprétation.
            Nous proposons ici les traductions libres de droit.
          </p>
        </div>

        {/* Encart librairie */}
        <div style={{
          display: "flex", alignItems: "center", gap: "18px",
          background: "#fff", border: "1px solid #ddd8cf", borderRadius: "8px",
          padding: "18px 20px", marginBottom: "36px",
        }}>
          {/* Icône livre */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", alignSelf: "stretch" }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
              stroke="#3d6b4f" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <div>
            <p style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "14px", fontWeight: "normal",
              color: "#1e2e24", margin: "0 0 8px",
            }}>
              Allez en librairie. Achetez des livres.
            </p>
            <p style={{ fontSize: "12px", color: "#6b7a6e", lineHeight: 1.65, margin: "0 0 6px" }}>
              Pour les éditions contemporaines annotées ou liturgiques :{" "}
              <a href="https://www.laprocure.com/" target="_blank" rel="noopener noreferrer"
                style={{ color: "#3d6b4f", textDecoration: "none", borderBottom: "1px solid rgba(61,107,79,0.3)" }}>
                La Procure
              </a>.
            </p>
            <p style={{ fontSize: "12px", color: "#6b7a6e", lineHeight: 1.65, margin: 0 }}>
              Pour les éditions anciennes et épuisées :{" "}
              <a href="https://www.librairie-pierre-brunet.fr/librairie-en-ligne.html" target="_blank" rel="noopener noreferrer"
                style={{ color: "#3d6b4f", textDecoration: "none", borderBottom: "1px solid rgba(61,107,79,0.3)" }}>
                Librairie Pierre-Brunet
              </a>.
            </p>
          </div>
        </div>

        {/* Accordéon */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {traductions.map((t) => {
            const estOuvert = ouvert === t.trad_id;
            return (
              <div key={t.trad_id} id={t.trad_id} style={{
                scrollMarginTop: "60px",
                border: "1px solid #ddd8cf", borderRadius: "8px",
                overflow: "hidden", background: "#fff",
              }}>
                <button
                  onClick={() => setOuvert(prev => prev === t.trad_id ? null : t.trad_id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    justifyContent: "space-between", gap: "12px",
                    padding: "14px 18px",
                    background: estOuvert ? "rgba(61,107,79,0.04)" : "#fff",
                    border: "none", cursor: "pointer", textAlign: "left",
                    transition: "background 0.15s",
                  }}
                >
                  <h2 style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: "17px", fontWeight: "normal",
                    color: "#1e2e24", margin: 0,
                  }}>
                    {t.nom}
                  </h2>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    {t.date_publication && (
                      <span style={{ fontSize: "10.5px", color: "#9a958d", background: "#eeebe4", padding: "2px 7px", borderRadius: "4px" }}>
                        {t.date_publication}
                      </span>
                    )}
                    {t.langue && (
                      <span style={{ fontSize: "10.5px", color: "#9a958d", background: "#eeebe4", padding: "2px 7px", borderRadius: "4px" }}>
                        {t.langue}
                      </span>
                    )}
                    <span style={{
                      fontSize: "10px", color: "#b0a89e",
                      display: "inline-block", transition: "transform 0.18s",
                      transform: estOuvert ? "rotate(180deg)" : "none",
                    }}>▼</span>
                  </div>
                </button>

                {estOuvert && (
                  <div style={{ padding: "0 20px 20px", borderTop: "1px solid #ede9e2" }}>
                    {t.bio_courte && (
                      <p style={{
                        fontSize: "12.5px", color: "#5a6b5e", lineHeight: 1.65,
                        margin: "14px 0 10px", fontStyle: "italic",
                        textAlign: "justify", hyphens: "auto",
                      }}>
                        {t.bio_courte}
                      </p>
                    )}
                    {t.commentaire_editorial && (
                      <div
                        className="trad-article"
                        style={{ color: "#2a2520", fontSize: "13.5px", lineHeight: 1.65, textAlign: "justify", hyphens: "auto" }}
                        dangerouslySetInnerHTML={{ __html: normaliserContenu(t.commentaire_editorial) }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}