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
// ⛔ AUCUNE FLÈCHE NE SUIT LE NOM (décision de l'auteur, 14 septembre 2026, devant
// « Bible de Sacy » : « ne pas afficher de flèche à côté pour indiquer que c'est
// cliquable »). Une flèche courte l'a suivi du 4 au 14 septembre 2026, pour suggérer
// la fiche « À propos de cette traduction ». Le nom se compose en vert, le survol le
// souligne et l'infobulle nomme la fiche : c'est assez, et la carte de la page Bible
// porte déjà une marque au bout de cette ligne, le chevron qui replie le volet.
// ⚠️ La flèche de `ModaleLivreAbsent` n'est pas celle-ci : une rangée de cette
// fenêtre ouvre une AUTRE bible, et sa flèche dit ce déplacement.
//
// ⛔ RIEN NE PARAÎT AU SURVOL. Le nom d'auteur ouvrait jusqu'ici une carte
// flottante — portrait, dates, extrait de la notice — au bout de 220 ms de survol
// (`ApercuAuteur`, retiré le 2026-08-31 à la demande de l'auteur). Le survol
// souligne, et c'est tout : il annonce le lien, il ne le remplace pas.
// ⚠️ Le soulignement se pose sur le NOM et non sur le bouton : c'est le nom qui
// s'écrête, et le trait doit s'arrêter avec lui.
//
// ⚠️ Le nom se COUPE PAR LA FIN (`text-overflow: ellipsis`) plutôt que de
// déborder : « Traduction officielle liturgique (AELF) » demande 245 pixels quand
// un volet de portable en offre 122 à côté de son étiquette. ⛔ Il faut
// `minWidth: 0` pour cela : un élément flex refuse par défaut de devenir plus
// petit que son contenu, et sans lui le nom pousse l'étiquette hors du volet au
// lieu de s'écrêter.

import { useState } from 'react'

export default function NomVolet({
  children, onOuvrir, titre, inactif = false, variante = 'tete',
}: {
  children: React.ReactNode
  onOuvrir: () => void
  titre: string
  inactif?: boolean
  /**
   * ⚠️ DEUX RÉGIMES, ET LE SECOND N'EST PAS EN TÊTE. `tete` est la forme d'origine :
   * le nom que le volet met au-dessus de tout. `credit` est le nom qui SUIT ce qui est
   * en tête — l'auteur posé sous le titre de l'œuvre depuis le 2026-09-10, où l'auteur
   * a demandé que l'œuvre passe la première. Il s'y compose en petit corps.
   * ⛔ Ce n'est pas un dessin de plus : c'est le MÊME bouton, le même survol, la même
   * fiche au bout. La page Bible garde `tete`, où la traduction est bien en tête.
   */
  variante?: 'tete' | 'credit'
}) {
  const [survol, setSurvol] = useState(false)
  const allume = survol && !inactif
  const credit = variante === 'credit'
  return (
    <button onClick={onOuvrir} disabled={inactif} title={inactif ? undefined : titre}
      onMouseEnter={() => setSurvol(true)} onMouseLeave={() => setSurvol(false)}
      onFocus={() => setSurvol(true)} onBlur={() => setSurvol(false)}
      // ⚠️ Dix pixels de haut ne font pas une cible au DOIGT : `.cs-cible-fine`
      // (globals.css, sous `@media (hover: none)`) agrandit la zone de frappe sans
      // rien déplacer. La forme `tete` s'en passe : elle porte un corps de treize pixels.
      className={credit ? 'cs-cible-fine' : undefined}
      style={{
        fontSize: credit ? '0.625rem' : '0.8125rem', fontWeight: 600, color: 'var(--cs-vert)',
        fontFamily: 'inherit', margin: 0, padding: 0, background: 'none', border: 'none',
        textAlign: 'left', cursor: inactif ? 'default' : 'pointer',
        letterSpacing: credit ? '0.04em' : '0.01em',
        minWidth: 0, maxWidth: '100%',
        display: 'flex', alignItems: 'center',
      }}>
      <span style={{
        minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textDecoration: allume ? 'underline' : 'none', textUnderlineOffset: '3px',
      }}>
        {children}
      </span>
    </button>
  )
}
