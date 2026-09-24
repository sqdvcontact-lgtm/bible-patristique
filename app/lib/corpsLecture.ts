// ── Taille du texte biblique (A− / A / A+) ────────────────────────────────────────
//
// Le réglage se pose par l'attribut `data-corps` sur <html>, et `globals.css` en tire
// deux variables, `--cs-lecture-corps` et `--cs-lecture-interligne`, que lit
// `styleTexteVerset` (décision de l'auteur, 2026-09-21, audit d'ergonomie) :
//
//   petit  : 0,875 rem (14 px)  · interligne 1,44
//   normal : 0,9375 rem (15 px) · interligne 1,48  (défaut, sans règle propre)
//   grand  : 1,0625 rem (17 px) · interligne 1,52
//
// ⚠️ Resserré d'un rang le 2026-09-23 (« un peu trop corps ») : 15/16/18 px avant.
//
// ⛔ MÊME MÉCANIQUE QUE LE THÈME (`theme.ts`), pour les mêmes raisons : le serveur écrit
// la valeur par DÉFAUT sur <html>, un script synchrone du <head> la remplace avant
// peinture, et `suppressHydrationWarning` fait accepter le DOM à React. Sans l'attribut
// par défaut, le script en AJOUTERAIT un, et React signalerait le désaccord ; sans le
// script, le verset changerait de corps sous les yeux du lecteur à chaque page.
//
// La préférence vit sur le COMPTE, dans `profils.corps_lecture` (migration
// 20260921183032), comme `theme_lecture`, et c'est elle qui fait foi. Le stockage local
// (clé `cs-corps`) n'en est que le MIROIR : lui seul pose le cran avant peinture, et il
// tient seul lieu de mémoire sans session. Le rapprochement se fait dans
// `ProvisionCompte` (`accorderCorps`) : le compte l'emporte, un poste qui porte un choix
// que le compte ignore le lui remonte. Le volet écrit par `changerCorps` du contexte,
// jamais par `appliquerCorps` seul, qui oublierait le compte. Revenir au normal EFFACE la
// clé locale, de sorte que « pas de choix » reste distinguable d'un choix sur ce poste.
//
// Module PUR de React, sans « use client » : le gabarit racine (composant serveur)
// importe `SCRIPT_CORPS`.

export const CLE_CORPS = 'cs-corps'

export type CorpsLecture = 'petit' | 'normal' | 'grand'

export const CORPS_DEFAUT: CorpsLecture = 'normal'

/** Les trois crans, dans l'ordre où le volet les montre. */
export const CRANS_CORPS: readonly { cle: CorpsLecture; label: string; description: string }[] = [
  { cle: 'petit', label: 'Petit', description: 'Texte biblique à 14 px, texte des Pères à 12 px' },
  { cle: 'normal', label: 'Normal', description: 'Texte biblique à 15 px, texte des Pères à 13 px' },
  { cle: 'grand', label: 'Grand', description: 'Texte biblique à 17 px, texte des Pères à 15 px' },
]

/** Script d'application AVANT peinture, écrit en ES5 et sous un try (voir `SCRIPT_THEME`).
 *  Toute valeur inconnue est effacée. */
export const SCRIPT_CORPS =
  `(function(){try{var c=localStorage.getItem('${CLE_CORPS}');` +
  `if(c==='petit'||c==='grand'){document.documentElement.setAttribute('data-corps',c);}` +
  `else if(c){localStorage.removeItem('${CLE_CORPS}');}}catch(e){}})();`

/** Un cran reconnu, ou null. */
export function corpsValide(valeur: string | null | undefined): CorpsLecture | null {
  const propre = (valeur ?? '').trim()
  return propre === 'petit' || propre === 'normal' || propre === 'grand' ? propre : null
}

/** Le cran mémorisé dans ce navigateur, ou le normal. Côté navigateur seulement. */
export function lireCorps(): CorpsLecture {
  try {
    const v = corpsValide(window.localStorage.getItem(CLE_CORPS))
    if (v) return v
  } catch { /* stockage indisponible : on lit le normal */ }
  return CORPS_DEFAUT
}

const abonnes = new Set<() => void>()

/** Pour `useSyncExternalStore` : prévient quand le cran change dans cet onglet. */
export function abonnerCorps(rappel: () => void): () => void {
  abonnes.add(rappel)
  return () => { abonnes.delete(rappel) }
}

/** Pose le cran sur <html> et le mémorise. L'attribut est toujours ÉCRIT, jamais retiré,
 *  pour rester d'accord avec le rendu serveur ; c'est la CLÉ qui disparaît au normal. */
export function appliquerCorps(corps: CorpsLecture): void {
  document.documentElement.setAttribute('data-corps', corps)
  try {
    if (corps === CORPS_DEFAUT) window.localStorage.removeItem(CLE_CORPS)
    else window.localStorage.setItem(CLE_CORPS, corps)
  } catch { /* stockage indisponible : l'attribut est posé, rien n'est retenu */ }
  abonnes.forEach(rappel => rappel())
}
