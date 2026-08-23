// ── Ornements de la page Œuvre ──────────────────────────────────────────────────
// Deux ornements dans la palette du site :
//   · MarqueImprimeur — la marque d'imprimeur de Corpus Scriptura (deux figures
//     drapées adossées, épée en main, devant une cité et des flots), dessin au trait
//     posé sur la page de titre entre le titre et les mentions d'édition.
//     `size` en gouverne la HAUTEUR, la largeur suit le rapport d'origine. Le PNG est
//     détouré (fond transparent) et ses traits sont teintés dans le brun-gris de
//     « Traduction par » (var(--cs-texte-second)), légèrement grisés (opacity 0.82) ; il se pose donc
//     directement sur le papier, sans rectangle visible ;
//   · FeuilleVigne — fleuron de séparation (le glyphe ❧), qui remplace le long filet
//     entre la page de titre et le niveau 1.
// Purement décoratifs : aria-hidden, aucune sémantique.

const FEUILLE = 'var(--cs-texte-second)' // gris chaud, légèrement plus clair que le corps

export function MarqueImprimeur({ size = 150 }: { size?: number }) {
  return (
    <img
      className="cs-ornement" src="/ornements/marque-imprimeur.png"
      alt=""
      aria-hidden="true"
      style={{
        height: `${size}px`,
        width: 'auto',
        opacity: 0.82,
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
