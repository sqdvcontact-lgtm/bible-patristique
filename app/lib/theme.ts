// ── Thème de lecture (Clair / Cuir) ────────────────────────────────────────────
//
// Le thème se pose par l'attribut `data-theme` sur <html> ; les surcouches de
// tokens de `app/globals.css` font tout le reste.
//
// ⚠️ Le CLAIR porte `data-theme="clair"`, ÉCRIT PAR LE SERVEUR, et le script ne
// fait que le remplacer. C'est la recette de cette version de Next
// (`node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`,
// section « Themes »), et elle n'est pas cosmétique : un attribut AJOUTÉ par le
// script sur un élément qui n'en portait pas laisse React signaler le désaccord
// malgré `suppressHydrationWarning`. Éprouvé au navigateur avant de trouver la
// page. Aucune règle CSS ne vise `[data-theme="clair"]` : c'est `:root` qui porte
// le clair, l'attribut ne sert qu'à donner au script quelque chose à remplacer.
//
// ⛔ Aucune détection de `prefers-color-scheme`. Le réglage du système ne décide
// pas de la lecture : c'est un choix explicite du lecteur, mémorisé. La charte
// proscrit par ailleurs tout `@media (prefers-color-scheme: dark)` partiel, un
// bloc de ce genre ayant déjà servi un sol noir sous des pages crème.
//
// Module PUR de React, sans « use client » : le gabarit racine (composant serveur)
// importe `SCRIPT_THEME`, la Navbar importe le reste.

export const CLE_THEME = 'cs-theme'

/** Les valeurs que l'attribut peut porter. Le clair n'en porte aucune. */
export type Theme = 'clair' | 'sepia' | 'sombre'

/**
 * Le Sépia n'a plus d'entrée dans l'interface : le menu de compte ne propose
 * qu'un interrupteur « Mode sombre ». Ses tokens restent définis et le thème
 * reste servi à qui l'a choisi du temps du sélecteur, sans quoi une préférence
 * enregistrée deviendrait un thème fantôme, appliqué et introuvable.
 */
export const THEMES_RECONNUS: readonly Theme[] = ['clair', 'sepia', 'sombre']

/** La valeur écrite par le SERVEUR sur <html>. Le script la remplace quand une
 *  préférence est mémorisée. */
export const THEME_DEFAUT: Theme = 'clair'

/** Script d'application AVANT peinture. Il se pose dans le `<head>` du gabarit
 *  racine, où il s'exécute pendant l'analyse du document, donc avant que la
 *  moindre couleur soit peinte.
 *
 *  ⚠️ Il doit rester SYNCHRONE et minuscule. Posé dans un effet, l'attribut
 *  arriverait après le premier rendu et le lecteur verrait la page crème
 *  clignoter avant de virer au brun, à chaque navigation.
 *
 *  Il est écrit en ES5 et enveloppé d'un try : un stockage local refusé (mode
 *  privé strict, réglage de navigateur) ne doit pas casser le rendu de la page. */
export const SCRIPT_THEME =
  `(function(){try{var t=localStorage.getItem('${CLE_THEME}');` +
  `if(t==='sepia'||t==='sombre'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`

/** Le thème mémorisé, ou le clair à défaut. À n'appeler que côté navigateur. */
export function lireTheme(): Theme {
  try {
    const t = window.localStorage.getItem(CLE_THEME)
    if (t === 'sepia' || t === 'sombre') return t
  } catch { /* stockage indisponible : on lit le clair */ }
  return 'clair'
}

/** Pose le thème sur <html> et le mémorise. L'attribut est toujours ÉCRIT, jamais
 *  retiré, pour rester d'accord avec le rendu serveur ; c'est la CLÉ qui disparaît
 *  au retour du clair, de sorte que « pas de préférence » reste distinguable. */
export function appliquerTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  try {
    if (theme === 'clair') window.localStorage.removeItem(CLE_THEME)
    else window.localStorage.setItem(CLE_THEME, theme)
  } catch { /* stockage indisponible : l'attribut est posé, rien n'est retenu */ }
}
