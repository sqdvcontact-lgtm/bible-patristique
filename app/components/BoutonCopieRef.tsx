"use client";

import { useState } from "react";

export default function BoutonCopieRef({ texte }: { texte: string }) {
  const [copie, setCopie] = useState(false);
  const [erreur, setErreur] = useState(false);

  const handleClick = () => {
    setErreur(false);
    navigator.clipboard.writeText(texte).then(() => {
      setCopie(true);
      setTimeout(() => setCopie(false), 1400);
    }).catch(() => {
      setErreur(true);
      setTimeout(() => setErreur(false), 1800);
    });
  };

  const titre = erreur ? "La copie a échoué. Réessayez." : "Copier la référence bibliographique";

  return (
    <button
      onClick={handleClick}
      title={titre}
      aria-label={titre}
      aria-live="polite"
      style={{
        background: "none", border: "none", cursor: "pointer",
        fontSize: "0.8125rem", color: copie ? "var(--cs-vert)" : erreur ? "var(--cs-danger)" : "var(--cs-bord)",
        padding: "1px 3px", lineHeight: 1,
        transition: "color 0.15s", verticalAlign: "middle",
        flexShrink: 0,
      }}
    >
      {copie ? "✓" : erreur ? "!" : (
        <svg width="11" height="12" viewBox="0 0 11 12" fill="none" aria-hidden="true" style={{ display:'block' }}>
          <path d="M1 9.2V1.8A.8.8 0 0 1 1.8 1H7.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <rect x="3" y="3" width="7" height="8.5" rx=".8" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      )}
    </button>
  );
}