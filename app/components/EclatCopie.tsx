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
// La forme vit dans `app/globals.css`, § « L'ÉCLAT D'UNE COPIE ».

import { useCallback, useEffect, useRef, useState } from 'react'

/** Le temps que le pictogramme reste allumé.
 *  ⚠️ IL NE DESCEND PAS SOUS LA DURÉE DE L'ÉCLAT (0,32 s dans la feuille) : l'encre
 *  tient un instant de plus que la lumière, puis revient en fondu par la transition du
 *  bouton. L'inverse laisserait le halo briller sur un pictogramme déjà éteint.
 *  ⚠️ Il valait 750 ms jusqu'au 20 septembre 2026 : l'encre s'attardait alors une
 *  demi-seconde après que la lumière était partie, et le bouton paraissait lent. */
export const DUREE_ECLAT_MS = 420

/** La classe que porte le BOUTON : c'est lui qui donne son repère à l'éclat, posé en
 *  absolu par-dessus. ⚠️ Aucun des six boutons ne pose `position` en style en ligne, qui
 *  battrait la règle de la feuille. */
export const CLASSE_HOTE_ECLAT = 'cs-eclat-hote'

const ACCUSE_COPIE = 'Copie effectuée'

/** L'état d'un bouton de copie. `eclat` est le RANG du clic — 0 quand rien ne brille —,
 *  `copie` allume le pictogramme, `briller` relance la lumière.
 *  ⚠️ Le minuteur se retire au démontage — une cellule d'actions change de cible à chaque
 *  ligne survolée, et un minuteur laissé derrière poserait un état sur un bouton parti. */
export function useEclatCopie() {
  const [eclat, setEclat] = useState(0)
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (minuteur.current) clearTimeout(minuteur.current) }, [])
  const briller = useCallback(() => {
    if (minuteur.current) clearTimeout(minuteur.current)
    setEclat(n => n + 1)
    minuteur.current = setTimeout(() => setEclat(0), DUREE_ECLAT_MS)
  }, [])
  return { copie: eclat > 0, eclat, briller }
}

/** L'éclat et son accusé, posés DANS le bouton.
 *  ⛔ La `key` est le rang du clic : c'est elle, et elle seule, qui fait repartir
 *  l'animation quand on reclique avant la fin.
 *  ⚠️ La région vivante est TOUJOURS rendue : une région qui naît avec son texte n'est
 *  pas annoncée. */
export function EclatCopie({ eclat }: { eclat: number }) {
  return (
    <>
      {eclat > 0 ? <span key={eclat} className="cs-eclat" aria-hidden="true" /> : null}
      <span className="cs-hors-ecran" role="status">{eclat > 0 ? ACCUSE_COPIE : ''}</span>
    </>
  )
}

/** La classe du bouton, celle de l'appelant conservée. */
export function avecHoteEclat(className?: string): string {
  return className ? `${className} ${CLASSE_HOTE_ECLAT}` : CLASSE_HOTE_ECLAT
}
