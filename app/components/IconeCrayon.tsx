// Crayon d'édition UNIQUE du site (remplace le glyphe « ✎ », dépendant de la police).
// Trait fin cohérent avec le reste des icônes SVG. Hérite de la couleur (currentColor).
export default function IconeCrayon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17v3z" />
      <path d="M13.5 6.5l3 3" />
    </svg>
  )
}
