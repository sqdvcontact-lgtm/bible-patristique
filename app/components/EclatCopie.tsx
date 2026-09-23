'use client'

// ── L'ÉCLAT D'UNE COPIE ───────────────────────────────────────────────────────
//
// Demande de l'auteur (2026-09-20) : « quand on clique sur "copier", à la place du
// symbole "validé" et "copié", pourrait-on plutôt avoir un petit éclat lumineux ?
// propre ? » L'accusé cesse d'être un SIGNE — un ✓ posé à la place du pictogramme,
// parfois suivi du mot « Copié » — pour devenir une LUMIÈRE : le pictogramme reste en
// place, il s'allume à l'encre des gestes, et un halo bref s'ouvre derrière lui.
//
// ⛔ UNE SEULE ÉCRITURE POUR LES SIX BOUTONS DE COPIE DU SITE. Le ✓ vivait en six
//    exemplaires — la page Bible, le volet patristique, les segments et les versets
//    d'une œuvre, la cellule d'actions, et ce bouton partagé — avec deux libellés et
//    un accusé qui, sur l'un d'eux seulement, écrivait « Copié ». `IconeCopier`
//    prévenait déjà qu'« un huitième exemplaire ne s'écrit pas, et les six autres se
//    convertissent au prochain passage sur ces boutons » : c'est ce passage.
// ⛔ LE PICTOGRAMME NE BOUGE PLUS. Échanger l'icône contre un ✓ changeait la largeur du
//    bouton à l'instant même où l'on venait de cliquer dedans ; c'est la règle déjà
//    posée pour la fiche d'une œuvre — rien ne bouge entre le survol et le clic.
// ⚠️ L'ACCUSÉ RESTE ANNONCÉ : une lumière ne se lit pas à la synthèse vocale, et une
//    région vivante la dit à sa place. ⛔ Le bouton garde donc un `aria-label` STABLE,
//    faute de quoi le texte caché lui servirait de nom au lieu de s'annoncer.
//
// ⛔ L'ÉCLAT EST UN RANG DE CLIC, NON UN BOOLÉEN (2026-09-20, le soir ; demande de
//    l'auteur : « on doit pouvoir cliquer dessus même si l'animation n'est pas
//    terminée, et relancer l'animation »). Avec un booléen, recliquer pendant l'éclat
//    reposait `true` sur `true` : React ne rendait rien, l'élément n'était pas remonté,
//    et l'animation de la feuille — qui ne redémarre qu'au MONTAGE — ne repartait pas.
//    Le geste restait donc sans réponse, ce qui est exactement ce qu'un accusé doit
//    éviter. Le rang sert de `key` : chaque clic monte un élément neuf, et la lumière
//    repart de zéro.
// ⚠️ Le rang retombe à 0 quand l'éclat s'éteint, et il ne peut pas se répéter sur un
//    élément encore monté : l'extinction vient d'un MINUTEUR et le clic d'un
//    ÉVÉNEMENT, deux tâches que React ne groupe jamais ensemble — le démontage passe
//    donc toujours avant le montage suivant.
//
// ⛔ RECTIFIÉ LE 2026-09-23 : L'ACCUSÉ N'EST PLUS UN HALO, C'EST LA MENTION AU CURSEUR.
//    Demande de l'auteur : « utilise ce même effet et ce même texte pour le symbole
//    “copier” » — l'effet de la ligne d'édition d'une carte de bible (`MentionCopiee`).
//    Le halo derrière le pictogramme ne disait PAS ce qu'on avait copié ; la mention le
//    nomme, contre le bouton, avec ses étincelles sur son pourtour. Le pictogramme garde
//    son allumage : il dit que CE bouton a répondu.
// ⚠️ LA MENTION VIT PLUS LONGTEMPS QUE L'ENCRE DU PICTOGRAMME : deux durées, deux états.
//    Le rang (`eclat`) tient la mention `DUREE_MENTION_MS` ; `copie` n'allume le
//    pictogramme que `DUREE_ECLAT_MS`.
//
// La forme vit dans `app/globals.css`, § « LA MENTION D'UNE COPIE ».

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DUREE_MENTION_MS, MentionCopiee, pointDeLElement, type MentionAuCurseur } from './MentionCopiee'

/** ⚠️ L'alias DOIT être une constante de module nommée « use… » : c'est ce qui le fait
 *  reconnaître pour un crochet, et la mesure du document est l'usage même de l'outil. */
const useMesureAvantPeinture = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Le temps que le pictogramme reste allumé, à l'encre des gestes. */
export const DUREE_ECLAT_MS = 420

/** La classe que porte le BOUTON. ⚠️ Aucun des boutons ne pose `position` en style en
 *  ligne, qui battrait la règle de la feuille. */
export const CLASSE_HOTE_ECLAT = 'cs-eclat-hote'

/** Ce que dit la mention quand l'appelant ne le précise pas : ces boutons copient une
 *  CITATION, référence comprise. */
export const MENTION_PAR_DEFAUT = 'Citation copiée'

/** L'état d'un bouton de copie. `eclat` est le RANG du clic — 0 quand rien ne se montre —,
 *  `copie` allume le pictogramme, `briller` relance l'accusé.
 *  ⚠️ Les minuteurs se retirent au démontage — une cellule d'actions change de cible à
 *  chaque ligne survolée, et un minuteur laissé derrière poserait un état sur un bouton
 *  parti. */
export function useEclatCopie() {
  const [eclat, setEclat] = useState(0)
  const [copie, setCopie] = useState(false)
  const rang = useRef(0)
  const minuteurMention = useRef<ReturnType<typeof setTimeout> | null>(null)
  const minuteurEncre = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (minuteurMention.current) clearTimeout(minuteurMention.current)
    if (minuteurEncre.current) clearTimeout(minuteurEncre.current)
  }, [])
  const briller = useCallback(() => {
    if (minuteurMention.current) clearTimeout(minuteurMention.current)
    if (minuteurEncre.current) clearTimeout(minuteurEncre.current)
    rang.current += 1
    setEclat(rang.current)
    setCopie(true)
    minuteurEncre.current = setTimeout(() => setCopie(false), DUREE_ECLAT_MS)
    minuteurMention.current = setTimeout(() => setEclat(0), DUREE_MENTION_MS)
  }, [])
  return { copie, eclat, briller }
}

/** L'accusé, posé DANS le bouton : un repère invisible, par lequel la mention retrouve le
 *  bouton qui l'a demandée, et la région vivante.
 *  ⛔ La mention se pose au CENTRE DU BOUTON, et non au point du pointeur : le geste peut
 *  venir du clavier, et le bouton est de toute façon sous le curseur quand on clique.
 *  ⚠️ La région vivante est TOUJOURS rendue : une région qui naît avec son texte n'est
 *  pas annoncée. */
export function EclatCopie({ eclat, mention = MENTION_PAR_DEFAUT }: { eclat: number; mention?: string }) {
  const repere = useRef<HTMLSpanElement>(null)
  const [pose, setPose] = useState<MentionAuCurseur | null>(null)
  // ⚠️ La position se lit dans l'effet, jamais pendant le rendu : c'est une lecture du
  // document, avant la peinture. Elle ne se refait qu'au rang suivant.
  useMesureAvantPeinture(() => {
    if (eclat === 0) return
    const hote = repere.current?.parentElement
    if (!hote) return
    const { clientX, clientY } = pointDeLElement(hote)
    setPose({ rang: eclat, x: clientX, y: clientY })
  }, [eclat])
  // ⚠️ Une pose d'un rang passé ne se montre pas : rien ne se remet à zéro dans l'effet.
  const montree = eclat > 0 && pose?.rang === eclat ? pose : null
  return (
    <>
      <span ref={repere} hidden />
      <MentionCopiee mention={montree}>{mention}</MentionCopiee>
      <span className="cs-hors-ecran" role="status">{eclat > 0 ? mention : ''}</span>
    </>
  )
}

/** La classe du bouton, celle de l'appelant conservée. */
export function avecHoteEclat(className?: string): string {
  return className ? `${className} ${CLASSE_HOTE_ECLAT}` : CLASSE_HOTE_ECLAT
}
