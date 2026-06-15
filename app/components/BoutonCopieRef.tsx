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
        fontSize: "13px", color: copie ? "#3d6b4f" : "#c8c0b4",
        padding: "1px 3px", lineHeight: 1,
        transition: "color 0.15s", verticalAlign: "middle",
        flexShrink: 0,
      }}
    >
      {copie ? "✓" : "⧉"}
    </button>
  );
}