'use client'

// ── CE QUI TIENT LA PLACE D'UN COMPTE PENDANT QU'IL SE CHARGE ─────────────────
//
// Des lettres grecques tirées au hasard, qui défilent tant que le compte n'est pas venu
// (demande de l'auteur, 14 septembre 2026, devant le volet des Pères : « faire défiler
// aléatoirement des caractères grecs, même police, pour que la hauteur des barres
// d'onglets ne varie pas »).
//
// ⚠️ Le composant ne pose NI corps NI encre : il prend ceux de la ligne de compte qui le
// porte, et c'est ce qui le rend « de la même police ». La hauteur, elle, appartient à la
// ligne (`LigneCompte`, PanneauPatristique) : ce qu'elle contient ne doit plus la décider.
//
// ⚠️ Chaque lettre tient une CASE de largeur fixe : ι est trois fois plus étroite que ω, et
// sans case le groupe changerait de largeur à chaque tirage, si bien que les lettres
// danseraient autour de leur axe au lieu de défiler sur place.
//
// ⚠️ Le premier rendu écrit une forme FIXE, la même que le serveur ; le hasard ne commence
// que dans le minuteur, qui est l'outil des effets. Sous `prefers-reduced-motion`, les
// lettres changent sept fois moins vite : l'attente se dit encore, sans papillonner.
//
// ⚠️ Les lettres sont muettes pour la synthèse vocale ; elle entend « chargement ».

import { useEffect, useState, type CSSProperties } from 'react'
import { lettresDeDepart, tirerLettresGrecques } from '@/app/lib/lettresGrecques'

/** Le pas du défilement, et celui qu'on garde quand le lecteur a demandé moins de mouvement. */
const CADENCE_MS = 90
const CADENCE_CALME_MS = 630

/** La case d'une lettre : assez large pour ω, la plus large de l'alphabet. */
const CASE_LETTRE: CSSProperties = { display: 'inline-block', width: '0.62em', textAlign: 'center' }

export default function CompteEnAttente({ longueur = 3 }: { longueur?: number }) {
  const [lettres, setLettres] = useState(() => lettresDeDepart(longueur))

  useEffect(() => {
    const calme = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const minuteur = window.setInterval(
      () => setLettres(tirerLettresGrecques(longueur)),
      calme ? CADENCE_CALME_MS : CADENCE_MS,
    )
    return () => window.clearInterval(minuteur)
  }, [longueur])

  return (
    <>
      <span aria-hidden="true" lang="el" style={{ whiteSpace: 'nowrap' }}>
        {[...lettres].map((lettre, rang) => (
          <span key={rang} style={CASE_LETTRE}>{lettre}</span>
        ))}
      </span>
      <span className="cs-hors-ecran">chargement</span>
    </>
  )
}
