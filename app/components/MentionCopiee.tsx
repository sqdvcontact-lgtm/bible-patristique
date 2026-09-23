'use client'

// ── LA MENTION D'UNE COPIE, POSÉE AU CURSEUR ──────────────────────────────────
//
// Demande de l'auteur (2026-09-23), pour la ligne d'édition de la carte d'une bible :
// « Ici, il ne faut pas le même effet que pour les “copier” d'ailleurs, sous forme de
// symbole ; il faut simplement afficher “Référence bibliographique copiée” à côté du
// curseur, en petit, avec un petit effet d'étincelles vertes autour. »
//
// ⛔ CE N'EST PAS `EclatCopie`, ET LES DEUX NE SE REMPLACENT PAS. L'éclat est l'accusé d'un
//    BOUTON : il s'allume DANS la cible, qui est un pictogramme qu'on vient de viser, et le
//    lecteur regarde donc déjà l'endroit où la lumière naît. Ici la cible est une PHRASE de
//    trois lignes que rien n'annonce comme cliquable (charte : « aucun indice, seul le
//    curseur change ») : un halo posé au milieu d'un texte ne se lirait pas comme un accusé,
//    et l'on n'a pas non plus de pictogramme à allumer. L'accusé se pose donc LÀ OÙ L'ŒIL
//    EST — sous le curseur — et il DIT ce qu'il a fait, puisque rien d'autre ne le dira.
//
// ⛔ ET IL NOMME CE QUI EST COPIÉ, non le geste : la ligne cliquée porte la phrase d'édition,
//    le presse-papiers reçoit la RÉFÉRENCE des volumes. Écrire « Copié » laisserait croire
//    qu'on a pris la phrase qu'on a sous les yeux.
//
// La forme vit dans `app/globals.css`, § « LA MENTION D'UNE COPIE ».

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/** Le temps que la mention reste à l'écran, étincelles comprises.
 *  ⚠️ IL NE DESCEND PAS SOUS LA DURÉE DE L'ANIMATION (1,25 s dans la feuille) : la mention
 *  s'efface par son propre fondu, et le minuteur ne fait que la démonter une fois éteinte.
 *  ⛔ Il ne monte pas non plus : une mention qui s'attarde après avoir disparu retiendrait
 *  un portail pour rien, et le clic suivant paraîtrait relancer une animation déjà finie. */
export const DUREE_MENTION_MS = 1300

/** Le nombre d'étincelles. ⚠️ SIX, et leurs places sont ÉCRITES dans la feuille : tirées au
 *  hasard, elles changeraient à chaque clic et l'accusé cesserait d'être reconnaissable. */
const ETINCELLES = 6

export type MentionAuCurseur = { rang: number; x: number; y: number }

/**
 * L'état d'une mention. `signaler` prend le POINT du geste — jamais l'élément cliqué : la
 * ligne d'édition court sur deux ou trois lignes, et une mention posée sur sa boîte
 * tomberait loin de l'endroit qu'on vient de viser.
 *
 * ⛔ LE RANG EST CELUI DU CLIC, comme dans `useEclatCopie` : recliquer pendant l'animation
 *    reposerait le même état, React ne remonterait rien, et l'animation de la feuille — qui
 *    ne repart qu'au MONTAGE — ne repartirait pas. Le geste resterait sans réponse.
 */
export function useMentionCopiee() {
  const [mention, setMention] = useState<MentionAuCurseur | null>(null)
  const rang = useRef(0)
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (minuteur.current) clearTimeout(minuteur.current) }, [])
  const signaler = useCallback((point: { clientX: number; clientY: number }) => {
    if (minuteur.current) clearTimeout(minuteur.current)
    rang.current += 1
    setMention({ rang: rang.current, x: point.clientX, y: point.clientY })
    minuteur.current = setTimeout(() => setMention(null), DUREE_MENTION_MS)
  }, [])
  return { mention, signaler }
}

/**
 * La mention et ses étincelles, posées en PORTAIL sur le corps du document.
 *
 * ⛔ LE PORTAIL N'EST PAS UN RANGEMENT : la carte du volet est en `overflow: hidden`, et le
 *    défileur du volet rogne tout ce qui déborde. Posée dedans, la mention serait coupée au
 *    bord de la colonne — c'est le défaut déjà payé par le sous-menu d'un menu de bibles.
 * ⛔ ELLE NE REÇOIT AUCUN POINTEUR : le clic suivant doit atteindre ce qu'il vise, et non
 *    l'accusé du précédent.
 * ⚠️ La `key` est le rang du clic : c'est elle, et elle seule, qui fait repartir l'animation.
 */
export function MentionCopiee({ mention, children }: { mention: MentionAuCurseur | null; children: React.ReactNode }) {
  if (typeof document === 'undefined' || mention === null) return null
  return createPortal(
    <span key={mention.rang} className="cs-mention-copiee" aria-hidden="true"
      style={{ left: mention.x, top: mention.y }}>
      {children}
      {Array.from({ length: ETINCELLES }, (_, i) => (
        <span key={i} className="cs-mention-etincelle" data-etincelle={i + 1} />
      ))}
    </span>,
    document.body,
  )
}
