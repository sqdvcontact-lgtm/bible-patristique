'use client'

// ── CE QUI TIENT LA PLACE D'UN COMPTE PENDANT QU'IL SE CHARGE ─────────────────
//
// Une lettre grecque tirée au hasard, qui change tant que le compte n'est pas venu
// (demande de l'auteur, 14 septembre 2026, devant le volet des Pères : « faire défiler
// aléatoirement des caractères grecs, même police, pour que la hauteur des barres
// d'onglets ne varie pas »).
//
// ⛔ UNE LETTRE, ET ELLE CHANGE VITE (même demande, le soir : « que les caractères
// défilent plus vite, et que ce soit des caractères uniques, pas plus d'un caractère »).
// Le volet en portait trois, qui changeaient toutes les quatre-vingt-dix millisecondes :
// trois lettres ensemble se lisent comme un mot, et à ce pas on voyait chaque tirage.
// ⚠️ Et jamais deux fois la même de suite (`tirerAutreLettre`) : une lettre qui ne change
// pas se lit comme un défilement qui cale.
//
// ⚠️ Le composant ne pose NI corps NI encre : il prend ceux de la ligne de compte qui le
// porte, et c'est ce qui le rend « de la même police ». La hauteur, elle, appartient à la
// ligne (`LigneCompte`, PanneauPatristique) : ce qu'elle contient ne doit plus la décider.
//
// ⚠️ La lettre tient une CASE de largeur fixe : ι est trois fois plus étroite que ω, et sans
// case la ligne changerait de largeur à chaque tirage, si bien que la lettre danserait
// autour de son axe au lieu de changer sur place.
//
// ⚠️ Le premier rendu écrit une lettre FIXE, la même que le serveur ; le hasard ne commence
// que dans le minuteur, qui est l'outil des effets. Sous `prefers-reduced-motion`, la lettre
// change quatorze fois moins vite : l'attente se dit encore, sans papillonner.
//
// ⚠️ La lettre est muette pour la synthèse vocale ; elle entend « chargement ».

import { useEffect, useState, type CSSProperties } from 'react'
import { LETTRE_DE_DEPART, tirerAutreLettre } from '@/app/lib/lettresGrecques'

/** Le pas du défilement, et celui qu'on garde quand le lecteur a demandé moins de mouvement. */
const CADENCE_MS = 45
const CADENCE_CALME_MS = 630

/** La case de la lettre : assez large pour ω, la plus large de l'alphabet. */
const CASE_LETTRE: CSSProperties = { display: 'inline-block', width: '0.62em', textAlign: 'center' }

export default function CompteEnAttente() {
  const [lettre, setLettre] = useState(LETTRE_DE_DEPART)

  useEffect(() => {
    const calme = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const minuteur = window.setInterval(
      () => setLettre((precedente) => tirerAutreLettre(precedente)),
      calme ? CADENCE_CALME_MS : CADENCE_MS,
    )
    return () => window.clearInterval(minuteur)
  }, [])

  return (
    <>
      <span aria-hidden="true" lang="el" style={CASE_LETTRE}>{lettre}</span>
      <span className="cs-hors-ecran">chargement</span>
    </>
  )
}
