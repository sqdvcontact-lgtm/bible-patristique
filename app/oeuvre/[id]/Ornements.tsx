// ── Ornements de la page Œuvre ──────────────────────────────────────────────────
// Deux ornements dans la palette du site :
//   · MarqueImprimeur — la marque d'imprimeur de Corpus Scriptura (parchemin cloué,
//     « σῶμα βιβλίου », VER…EST, Α/Ω, Tétragramme, colophon S.Q.D.V.), gravure posée
//     sur la page de titre entre le titre et les mentions d'édition. Image portrait :
//     `size` en gouverne la HAUTEUR, la largeur suit le rapport d'origine. Le fond
//     blanc du fichier est fondu dans le papier crème par `mix-blend-mode: multiply`
//     (nul besoin de détourage tant que la page reste claire) ;
//   · FeuilleVigne — fleuron de séparation (le glyphe ❧), qui remplace le long filet
//     entre la page de titre et le niveau 1.
// Purement décoratifs : aria-hidden, aucune sémantique.

const FEUILLE = '#8aa06e'

export function MarqueImprimeur({ size = 150 }: { size?: number }) {
  return (
    <img
      src="/ornements/marque-imprimeur.png"
      alt=""
      aria-hidden="true"
      style={{
        height: `${size}px`,
        width: 'auto',
        mixBlendMode: 'multiply',
        opacity: 0.92,
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    />
  )
}

// Le fleuron ❧ (hedera / feuille aldine) — l'ornement demandé, un simple glyphe
// typographique, centré et discret. Bien plus juste qu'un dessin de pampre.
export function FeuilleVigne({ size = 27 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        fontFamily: "var(--font-source-serif), Georgia, serif",
        fontSize: `${size}px`,
        lineHeight: 1,
        color: FEUILLE,
        userSelect: 'none',
        display: 'inline-block',
      }}
    >
      ❧
    </span>
  )
}
