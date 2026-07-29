// ── Ornements de la page Œuvre ──────────────────────────────────────────────────
// Deux ornements « typographiques » vectoriels, dans la palette du site :
//   · MarqueImprimeur — petite marque d'imprimeur numérique (livre ouvert + croix
//     dans un double cercle), posée sur la page de titre entre le titre et les
//     mentions d'édition, à la place du filet court ;
//   · FeuilleVigne — fleuron de séparation (feuille de vigne centrée entre deux
//     filets à vrilles), qui remplace le long filet entre la page de titre et le
//     niveau 1.
// Purement décoratifs : aria-hidden, aucune sémantique.

const VERT = '#3d6b4f'
const OR = '#c8b89e'
const OR_FONCE = '#b0966a'
const FEUILLE = '#8aa06e'
const FEUILLE_TRAIT = '#5f7a48'

export function MarqueImprimeur({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      {/* Double cercle */}
      <circle cx="32" cy="32" r="29" fill="none" stroke={OR} strokeWidth="1" />
      <circle cx="32" cy="32" r="24.5" fill="none" stroke={OR} strokeWidth="0.5" />
      {/* Croix rayonnante au-dessus du livre */}
      <g stroke={OR_FONCE} strokeWidth="1.4" strokeLinecap="round">
        <line x1="32" y1="14" x2="32" y2="23.5" />
        <line x1="27.5" y1="18" x2="36.5" y2="18" />
      </g>
      {/* Livre ouvert */}
      <g fill="none" stroke={VERT} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
        <path d="M32 44 C 26.5 40, 18.5 40, 13 42 L 13 27 C 18.5 25, 26.5 25, 32 29 C 37.5 25, 45.5 25, 51 27 L 51 42 C 45.5 40, 37.5 40, 32 44 Z" />
        <line x1="32" y1="29" x2="32" y2="44" />
      </g>
      {/* Deux points de composition */}
      <circle cx="32" cy="9.5" r="1.1" fill={OR_FONCE} />
      <circle cx="32" cy="54.5" r="1.1" fill={OR_FONCE} />
    </svg>
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
