/**
 * LE VERROU DE DÉFILEMENT — un COMPTEUR, jamais un « je retiens la valeur d'avant ».
 *
 * ⛔ CINQ FENÊTRES POSAIENT CHACUNE LE SIEN, et de la même façon : lire
 * `document.body.style.overflow`, écrire « hidden », rendre la valeur lue à la
 * fermeture. Le patron est juste quand une seule fenêtre s'ouvre à la fois, et FAUX
 * dès qu'il y en a deux — ce qui est le cas ordinaire de la page d'une œuvre, où la
 * fiche d'édition ouvre la fiche d'auteur, laquelle ouvre celle d'une traduction.
 *
 * La seconde fenêtre lit alors « hidden » comme valeur d'avant. Si elle se ferme la
 * DERNIÈRE, elle repose « hidden », et plus rien ne le retire : la page reste figée,
 * les clics continuant de fonctionner puisque seul le défilement est verrouillé.
 * C'est exactement ce que l'auteur a relevé le 9 septembre 2026 (« après ouverture de
 * plusieurs fenêtres, le défilement au doigt ne fonctionne plus »).
 *
 * ⛔ Le compteur ne dépend pas de l'ORDRE des fermetures, et c'est tout son objet :
 * une pile LIFO se défait au premier démontage qui ne suit pas la pile, et React n'en
 * garantit aucun. Le premier verrou retient l'état du document, le dernier le rend.
 *
 * ⚠️ Le relâchement est IDEMPOTENT : appelé deux fois, il ne décompte qu'une. Sans
 * cela, un nettoyage rejoué — le double montage du mode strict en développement, une
 * fenêtre qui relâche puis se démonte — ferait tomber le compteur sous zéro et
 * déverrouillerait une fenêtre encore ouverte.
 */

let ouvertures = 0
let etatDuDocument: string | null = null

/** Verrouille le défilement de la page et rend de quoi le relâcher. */
export function verrouillerLeDefilement(): () => void {
  if (typeof document === 'undefined') return () => {}
  if (ouvertures === 0) {
    etatDuDocument = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  ouvertures += 1
  let relache = false
  return () => {
    if (relache) return
    relache = true
    ouvertures -= 1
    if (ouvertures <= 0) {
      ouvertures = 0
      document.body.style.overflow = etatDuDocument ?? ''
      etatDuDocument = null
    }
  }
}

/** Le nombre de fenêtres qui tiennent le verrou. ⚠️ Pour les tests seulement : une
 *  surface qui lirait ce compte pour décider de quelque chose se lierait à ses
 *  voisines. */
export function verrousPoses(): number {
  return ouvertures
}
