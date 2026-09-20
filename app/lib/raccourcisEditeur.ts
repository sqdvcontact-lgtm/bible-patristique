// Raccourcis clavier communs aux zones de rédaction du site (les contentEditable
// de l'éditeur d'essai, des commentaires, des notes, de l'édition d'un verset et
// de l'atelier des traductions).
//
// Ils se posent sur la zone elle-même, jamais sur `window` : le focus fait alors
// le filtrage tout seul, et rien n'est intercepté pendant la lecture.
//
// Le navigateur applique déjà Ctrl+B / Ctrl+I / Ctrl+U nativement dans toute zone
// éditable. Ce module reprend la main pour deux raisons : prévenir l'état React
// du changement, et REFUSER le souligné. Aucune sérialisation du site ne connaît
// <u> — sans ce garde-fou, le trait s'affiche pendant la frappe puis disparaît en
// silence à l'enregistrement.

import type { ClipboardEvent, KeyboardEvent } from 'react'

export type OptionsRaccourcis = {
  /** Appelé après toute modification, pour resynchroniser l'état du composant. */
  apresChangement?: () => void
  /** Ctrl+. pour l'exposant — seulement là où la syntaxe connaît ^^…^^. */
  exposant?: boolean
  /** Ctrl+Maj+Espace pour l'espace insécable (vrai par défaut). */
  insecable?: boolean
}

export function raccourcisEditeur(e: KeyboardEvent<HTMLElement>, options: OptionsRaccourcis = {}): void {
  const { apresChangement, exposant = false, insecable = true } = options
  if (!e.ctrlKey && !e.metaKey) return
  // AltGr est un Ctrl+Alt sur les claviers français : s'en mêler rendrait @ # { }
  // inatteignables. On laisse passer.
  if (e.altKey) return

  const touche = e.key.toLowerCase()
  const commande = (cmd: string) => {
    e.preventDefault()
    document.execCommand(cmd)
    apresChangement?.()
  }

  if (touche === 'b' && !e.shiftKey) { commande('bold'); return }
  if (touche === 'i' && !e.shiftKey) { commande('italic'); return }

  // Souligné : refusé partout. Le souligné n'est pas une ressource typographique
  // du site — l'italique dit ce qu'il dirait, et il survit à l'enregistrement.
  if (touche === 'u') { e.preventDefault(); return }

  // Exposant : Ctrl+point, comme dans les traitements de texte en ligne. Ctrl+Maj+P
  // ouvrirait une fenêtre privée dans Firefox, qui n'est pas annulable.
  if (exposant && touche === '.') { commande('superscript'); return }

  if (insecable && e.shiftKey && touche === ' ') {
    e.preventDefault()
    document.execCommand('insertText', false, '\u00A0')
    apresChangement?.()
  }
}

// Le collage ne doit jamais importer de mise en forme extérieure (polices,
// couleurs, tailles, et le souligné que l'on vient de refuser au clavier) : on ne
// conserve que le texte. `insertText` passe par la pile d'annulation du
// navigateur, donc Ctrl+Z défait le collage.
export function collageTexteBrut(e: ClipboardEvent<HTMLElement>, apresChangement?: () => void): void {
  e.preventDefault()
  const texte = e.clipboardData.getData('text/plain')
  document.execCommand('insertText', false, texte)
  apresChangement?.()
}
