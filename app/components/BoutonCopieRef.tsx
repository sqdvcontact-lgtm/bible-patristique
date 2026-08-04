"use client";

import { useState } from "react";

export default function BoutonCopieRef({ texte }: { texte: string }) {
  const [copie, setCopie] = useState(false);

  const handleClick = () => {
    navigator.clipboard.writeText(texte).then(() => {
      setCopie(true);
      setTimeout(() => setCopie(false), 1400);
    });
  };

  return (
    <button
      onClick={handleClick}
      title="Copier la référence bibliographique"
      style={{
        background: "none", border: "none", cursor: "pointer",
        fontSize: "0.8125rem", color: copie ? "var(--cs-vert)" : "var(--cs-bord)",
        padding: "1px 3px", lineHeight: 1,
        transition: "color 0.15s", verticalAlign: "middle",
        flexShrink: 0,
      }}
    >
      {copie ? "✓" : (
        <svg width="11" height="12" viewBox="0 0 11 12" fill="none" aria-hidden="true" style={{ display:'block' }}>
          <path d="M1 9.2V1.8A.8.8 0 0 1 1.8 1H7.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <rect x="3" y="3" width="7" height="8.5" rx=".8" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      )}
    </button>
  );
}