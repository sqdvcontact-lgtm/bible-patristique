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
import { Bulle } from '@/app/components/Bulle'
import { copierEnFormeRiche, type CitationRendue } from '@/app/lib/citation'

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
  mention,
  bulle = false,
}: {
  /** ⚠️ Une CITATION porte DEUX formes : le collage riche garde l'italique du corpus,
   *  quand le plein-texte emporterait ses balises en clair. Une chaîne reste admise
   *  pour tout ce qui n'est pas du texte enrichi. */
  texte: string | CitationRendue
  style?: React.CSSProperties
  className?: string
  titre?: string
  /** Ce que la mention au curseur dit avoir copié (« Référence bibliographique copiée »).
   *  Par défaut, celle d'`EclatCopie` : une citation. */
  mention?: string
  /** Bouton d'action d'un verset ou d'un passage : l'infobulle est celle du site (`Bulle`),
   *  comme la cellule d'actions d'une œuvre, et non l'infobulle native. Faux par défaut :
   *  les fiches (« Copier la référence ») gardent la leur. */
  bulle?: boolean
}) {
  const { copie, eclat, briller } = useEclatCopie()
  const [erreur, setErreur] = useState(false)

  const copier = (e: React.MouseEvent) => {
    e.stopPropagation()
    setErreur(false)
    const plain = typeof texte === 'string' ? texte : texte.texte
    const html = typeof texte === 'string' ? null : texte.html
    // ⚠️ La forme riche d'abord, le plein-texte ensuite : `copierEnFormeRiche` ne
    // remplace aucun repli, elle dit seulement si elle a porté.
    const ecrire = html
      ? copierEnFormeRiche(plain, html).then(ok => (ok ? undefined : copierPleinTexte(plain)))
      : copierPleinTexte(plain)
    Promise.resolve(ecrire).then(briller).catch(() => {
      setErreur(true)
      setTimeout(() => setErreur(false), DUREE_ERREUR_MS)
    })
  }

  // ⛔ Le NOM du bouton ne dit plus la réussite : l'éclat porte son propre accusé, dans
  // une région vivante, et un nom qui changerait le redirait une seconde fois.
  const libelle = erreur ? 'La copie a échoué. Réessayez.' : titre

  const bouton = (
    <button onClick={copier} title={bulle ? undefined : libelle} aria-label={libelle} className={avecHoteEclat(className)}
      style={{ ...style, color: copie ? 'var(--cs-vert)' : erreur ? 'var(--cs-danger)' : (style?.color ?? 'var(--cs-texte-doux)') }}>
      {erreur ? <span aria-hidden="true">!</span> : <IconeCopier />}
      <EclatCopie eclat={eclat} mention={mention} />
      {erreur ? <span>Réessayer</span> : null}
    </button>
  )
  return bulle ? <Bulle texte={libelle}>{bouton}</Bulle> : bouton
}
