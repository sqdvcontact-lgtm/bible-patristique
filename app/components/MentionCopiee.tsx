'use client'

// ── LA MENTION D'UNE COPIE, POSÉE AU CURSEUR ──────────────────────────────────
//
// Demande de l'auteur (2026-09-23), pour la ligne d'édition de la carte d'une bible :
// « Ici, il ne faut pas le même effet que pour les “copier” d'ailleurs, sous forme de
// symbole ; il faut simplement afficher “Référence bibliographique copiée” à côté du
// curseur, en petit, avec un petit effet d'étincelles vertes autour. »
//
// ⛔ RECTIFIÉ LE SOIR MÊME : C'EST DÉSORMAIS L'ACCUSÉ DE TOUTES LES COPIES DU SITE.
//    « Il faudrait que l'effet soit moins centré, mais se diffuse un peu autour du
//    message ; utilise ce même effet et ce même texte pour le symbole “copier”. » Les
//    boutons de copie (`EclatCopie`) ne font plus briller un halo derrière leur
//    pictogramme : ils posent cette mention, contre le bouton, et elle NOMME ce qu'ils
//    ont copié (« Citation copiée », « Verset copié », « Référence bibliographique
//    copiée »).
//
// ⛔ ELLE NOMME CE QUI EST COPIÉ, non le geste : la ligne cliquée porte la phrase d'édition,
//    le presse-papiers reçoit la RÉFÉRENCE des volumes. Écrire « Copié » laisserait croire
//    qu'on a pris la phrase qu'on a sous les yeux.
//
// ⛔ LES ÉTINCELLES NAISSENT SUR LE POURTOUR DU MESSAGE, et s'en écartent un peu. Elles
//    partaient toutes de son centre, c'est-à-dire de dessous le texte, et l'effet se
//    ramassait au milieu d'un message de deux cents pixels. Leurs places sont ÉCRITES dans
//    la feuille : tirées au hasard, l'accusé ne serait jamais deux fois le même.
//
// La forme vit dans `app/globals.css`, § « LA MENTION D'UNE COPIE ».

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/** Le temps que la mention reste à l'écran, étincelles comprises.
 *  ⚠️ IL NE DESCEND PAS SOUS LA DURÉE DE L'ANIMATION (1,25 s dans la feuille) : la mention
 *  s'efface par son propre fondu, et le minuteur ne fait que la démonter une fois éteinte.
 *  ⛔ Il ne monte pas non plus : une mention qui s'attarde après avoir disparu retiendrait
 *  un portail pour rien, et le clic suivant paraîtrait relancer une animation déjà finie. */
export const DUREE_MENTION_MS = 1300

/** Le nombre d'étincelles. ⚠️ DIX, et leurs places sont ÉCRITES dans la feuille
 *  (`[data-etincelle='n']`) : en ajouter une demande d'y écrire sa place. */
export const ETINCELLES = 10

/** L'écart minimal, en pixels, entre la mention et le bord de la fenêtre. */
const MARGE_BORD_PX = 8

const useMesureAvantPeinture = typeof window === 'undefined' ? useEffect : useLayoutEffect

export type MentionAuCurseur = { rang: number; x: number; y: number }

/** Le point où poser la mention d'un geste fait sur un ÉLÉMENT (un bouton, au clavier comme à
 *  la souris) : son centre. La feuille la pose ensuite au-dessus et à droite. */
export function pointDeLElement(el: Element): { clientX: number; clientY: number } {
  const r = el.getBoundingClientRect()
  return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }
}

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
 * ⚠️ ELLE NE SORT PAS DE LA FENÊTRE : un bouton de copie vit souvent au bord droit de la
 *    colonne, et la mention, posée à droite du geste, y déborderait. Elle se mesure une fois
 *    montée, avant la peinture, et se décale d'autant — par une propriété de la feuille, sans
 *    état ni second rendu.
 */
export function MentionCopiee({ mention, children }: { mention: MentionAuCurseur | null; children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)
  const rang = mention?.rang ?? 0
  useMesureAvantPeinture(() => {
    const el = ref.current
    if (!el) return
    el.style.removeProperty('--cs-mention-decalage')
    const r = el.getBoundingClientRect()
    const vue = document.documentElement.clientWidth
    let decalage = 0
    if (r.right > vue - MARGE_BORD_PX) decalage = vue - MARGE_BORD_PX - r.right
    if (r.left + decalage < MARGE_BORD_PX) decalage = MARGE_BORD_PX - r.left
    if (decalage !== 0) el.style.setProperty('--cs-mention-decalage', `${Math.round(decalage)}px`)
  }, [rang])
  if (typeof document === 'undefined' || mention === null) return null
  return createPortal(
    <span ref={ref} key={mention.rang} className="cs-mention-copiee" aria-hidden="true"
      style={{ left: mention.x, top: mention.y }}>
      {children}
      {Array.from({ length: ETINCELLES }, (_, i) => (
        <span key={i} className="cs-mention-etincelle" data-etincelle={i + 1} />
      ))}
    </span>,
    document.body,
  )
}
