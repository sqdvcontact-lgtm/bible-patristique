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
// ⚠️ UNE FLÈCHE COURTE SUIT LE NOM, et elle DIT qu'il y a une fiche derrière
// (demande de l'auteur, 2026-09-04 : « ajouter un petit symbole à côté du titre
// pour suggérer l'existence de “À propos de cette traduction” ; une flèche
// propre, épurée, courte »). Rien ne disait qu'on pouvait cliquer : le nom se
// composait comme un titre vert, et le survol ne le soulignait qu'une fois la
// souris dessus. ⛔ Elle ne paraît pas quand le bouton est INACTIF : une œuvre
// sans auteur identifié n'ouvre aucune fiche, et la flèche promettrait alors une
// page qui n'existe pas. ⚠️ Elle est hors de l'écrêtage du nom : c'est le NOM qui
// se coupe par la fin, jamais la flèche, sans quoi l'annonce disparaîtrait sur
// les noms longs — les seuls où l'on hésite.
//
// ⛔ RIEN NE PARAÎT AU SURVOL. Le nom d'auteur ouvrait jusqu'ici une carte
// flottante — portrait, dates, extrait de la notice — au bout de 220 ms de survol
// (`ApercuAuteur`, retiré le 2026-08-31 à la demande de l'auteur). Le survol
// souligne, et c'est tout : il annonce le lien, il ne le remplace pas.
// ⚠️ Le soulignement se pose sur le NOM et non sur le bouton : porté par le
// bouton, il courait aussi sous la flèche, qu'il barrait par le milieu.
//
// ⚠️ Le nom se COUPE PAR LA FIN (`text-overflow: ellipsis`) plutôt que de
// déborder : « Traduction officielle liturgique (AELF) » demande 245 pixels quand
// un volet de portable en offre 122 à côté de son étiquette. ⛔ Il faut
// `minWidth: 0` pour cela : un élément flex refuse par défaut de devenir plus
// petit que son contenu, et sans lui le nom pousse l'étiquette hors du volet au
// lieu de s'écrêter.

import { useState } from 'react'

export default function NomVolet({
  children, onOuvrir, titre, inactif = false,
}: {
  children: React.ReactNode
  onOuvrir: () => void
  titre: string
  inactif?: boolean
}) {
  const [survol, setSurvol] = useState(false)
  const allume = survol && !inactif
  return (
    <button onClick={onOuvrir} disabled={inactif} title={inactif ? undefined : titre}
      onMouseEnter={() => setSurvol(true)} onMouseLeave={() => setSurvol(false)}
      onFocus={() => setSurvol(true)} onBlur={() => setSurvol(false)}
      style={{
        fontSize: '0.8125rem', fontWeight: 600, color: 'var(--cs-vert)',
        fontFamily: 'inherit', margin: 0, padding: 0, background: 'none', border: 'none',
        textAlign: 'left', cursor: inactif ? 'default' : 'pointer',
        letterSpacing: '0.01em',
        minWidth: 0, maxWidth: '100%',
        display: 'flex', alignItems: 'center', gap: '4px',
      }}>
      <span style={{
        minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textDecoration: allume ? 'underline' : 'none', textUnderlineOffset: '3px',
      }}>
        {children}
      </span>
      {!inactif && (
        // Une hampe et deux barbes, rien d'autre : la flèche du site, en petit.
        // ⚠️ Elle est plus PÂLE que le nom et ne prend pas sa graisse — elle
        // annonce le geste, elle ne le crie pas.
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true"
          style={{ flexShrink: 0, opacity: allume ? 1 : 0.5, transform: allume ? 'translateX(1px)' : 'none', transition: 'opacity 0.14s, transform 0.14s' }}>
          <path d="M1.6 5h6.8M5.6 2.2 8.4 5 5.6 7.8" stroke="currentColor" strokeWidth="1.3"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}
