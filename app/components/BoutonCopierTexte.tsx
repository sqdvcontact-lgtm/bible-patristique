'use client'

// Bouton « copier » d'une ligne de lecture — verset ou segment. Un seul dessin pour
// tout le site : la page Bible, le Polyglotte, les péricopes et les œuvres montraient
// le même geste, mais chacune avec sa propre copie du bouton.
//
// Il ne compose pas la citation : il reçoit le texte DÉJÀ prêt. C'est voulu, car la
// forme diffère d'une surface à l'autre — un verset se cite « … » (Gn 1, 1), un segment
// patristique porte son auteur, son titre et son édition. Le bouton ne connaît que le
// presse-papiers ; ce qu'on y met regarde l'appelant.
//
// ⛔ L'ACCUSÉ D'UNE COPIE EST UN ÉCLAT, et il vit dans `EclatCopie` : le pictogramme
// reste en place et s'allume, au lieu de céder la place à un ✓ suivi du mot « Copié ».
// ⚠️ L'ÉCHEC, lui, garde ses mots : une lumière dit qu'un geste a porté, elle ne sait
// pas dire qu'il a manqué.

import { useState } from 'react'

import { avecHoteEclat, EclatCopie, useEclatCopie } from '@/app/components/EclatCopie'
import IconeCopier from '@/app/components/IconeCopier'

/** Le temps que l'échec reste écrit, en millisecondes. Assez long pour être lu, assez
 *  court pour ne pas laisser croire que le bouton est resté enfoncé. */
const DUREE_ERREUR_MS = 1800

/** Copie plein-texte avec un repli pour les navigateurs intégrés qui n'accordent pas
 * l'API asynchrone du presse-papiers. Le champ temporaire ne devient jamais visible et
 * la sélection antérieure n'est pas une donnée à conserver. */
async function copierPleinTexte(texte: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texte)
      return
    }
  } catch {
    // Repli historique ci-dessous.
  }

  const champ = document.createElement('textarea')
  champ.value = texte
  champ.setAttribute('readonly', '')
  champ.style.position = 'fixed'
  champ.style.left = '-9999px'
  document.body.appendChild(champ)
  champ.select()
  const copie = document.execCommand('copy')
  champ.remove()
  if (!copie) throw new Error('Copie indisponible')
}

export default function BoutonCopierTexte({
  texte,
  style,
  className,
  titre = 'Copier',
}: {
  texte: string
  style?: React.CSSProperties
  className?: string
  titre?: string
}) {
  const { copie, briller } = useEclatCopie()
  const [erreur, setErreur] = useState(false)

  const copier = (e: React.MouseEvent) => {
    e.stopPropagation()
    setErreur(false)
    copierPleinTexte(texte).then(briller).catch(() => {
      setErreur(true)
      setTimeout(() => setErreur(false), DUREE_ERREUR_MS)
    })
  }

  // ⛔ Le NOM du bouton ne dit plus la réussite : l'éclat porte son propre accusé, dans
  // une région vivante, et un nom qui changerait le redirait une seconde fois.
  const libelle = erreur ? 'La copie a échoué. Réessayez.' : titre

  return (
    <button onClick={copier} title={libelle} aria-label={libelle} className={avecHoteEclat(className)}
      style={{ ...style, color: copie ? 'var(--cs-vert)' : erreur ? 'var(--cs-danger)' : (style?.color ?? 'var(--cs-texte-faible)') }}>
      {erreur ? <span aria-hidden="true">!</span> : <IconeCopier />}
      <EclatCopie copie={copie} />
      {erreur ? <span>Réessayer</span> : null}
    </button>
  )
}
