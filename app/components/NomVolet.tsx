'use client'

// ── Le NOM qu'un volet de gauche met en tête ─────────────────────────────────
//
// Sur une page patristique, c'est l'auteur ; sur la page Bible, la traduction.
// C'est le même objet et le même geste — nommer ce qu'on lit, et ouvrir sa fiche
// d'un clic —, donc une seule définition. Elle vient du volet de la page Œuvre,
// où la forme avait été arrêtée ; la page Bible l'a reprise le 2026-08-31 à la
// demande de l'auteur (« dans le même style que le nom de l'auteur dans le volet
// de gauche des pages patristiques »).
//
// ⛔ RIEN NE PARAÎT AU SURVOL. Le nom d'auteur ouvrait jusqu'ici une carte
// flottante — portrait, dates, extrait de la notice — au bout de 220 ms de survol
// (`ApercuAuteur`, retiré le 2026-08-31 à la demande de l'auteur). Le survol
// souligne, et c'est tout : il annonce le lien, il ne le remplace pas.
//
// ⚠️ Le nom se COUPE PAR LA FIN (`text-overflow: ellipsis`) plutôt que de
// déborder : « Traduction officielle liturgique (AELF) » demande 245 pixels quand
// un volet de portable en offre 122 à côté de son étiquette. ⛔ Il faut
// `minWidth: 0` pour cela : un élément flex refuse par défaut de devenir plus
// petit que son contenu, et sans lui le nom pousse l'étiquette hors du volet au
// lieu de s'écrêter.

export default function NomVolet({
  children, onOuvrir, titre, inactif = false,
}: {
  children: React.ReactNode
  onOuvrir: () => void
  titre: string
  inactif?: boolean
}) {
  return (
    <button onClick={onOuvrir} disabled={inactif} title={inactif ? undefined : titre}
      onMouseEnter={e => { if (!inactif) e.currentTarget.style.textDecoration = 'underline' }}
      onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
      style={{
        fontSize: '0.8125rem', fontWeight: 600, color: 'var(--cs-vert)',
        fontFamily: 'inherit', margin: 0, padding: 0, background: 'none', border: 'none',
        textAlign: 'left', cursor: inactif ? 'default' : 'pointer',
        textUnderlineOffset: '3px', letterSpacing: '0.01em',
        minWidth: 0, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
      {children}
    </button>
  )
}
