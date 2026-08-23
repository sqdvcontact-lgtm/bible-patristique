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
export type Theme = 'clair' | 'sombre'

/**
 * ⛔ Le SÉPIA est retiré, décision de l'auteur du 2026-08-23 : le Cuir suffit.
 *
 * Il survivait en thème FANTÔME — plus aucune entrée dans l'interface depuis que
 * le menu de compte ne propose qu'un interrupteur « Mode sombre », mais toujours
 * servi à qui l'avait choisi du temps du sélecteur. On l'avait gardé pour qu'une
 * préférence enregistrée ne devienne pas un thème appliqué et introuvable ; le
 * raisonnement était juste, et il ne tenait que tant qu'on comptait l'éprouver.
 * On ne l'a jamais fait : le Cuir a eu ses neuf planches, le Sépia zéro, et son
 * bloc ne redéfinissait que 42 des 51 jetons — les six ombres et les trois
 * variantes claires retombaient sur celles du Clair, sans que personne ait
 * décidé qu'elles le devaient.
 *
 * Ceux qui l'avaient choisi reviennent donc au Clair, et leur préférence est
 * EFFACÉE au premier chargement (voir `SCRIPT_THEME`) : sans quoi la clé
 * resterait dans leur navigateur à désigner un thème qui n'existe plus.
 */
export const THEMES_RECONNUS: readonly Theme[] = ['clair', 'sombre']

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
 *  privé strict, réglage de navigateur) ne doit pas casser le rendu de la page.
 *
 *  ⚠️ Il EFFACE toute valeur qui n'est pas `sombre` — c'est-à-dire le `sepia` des
 *  lecteurs qui l'avaient choisi avant son retrait. La clé partie, ils sont au
 *  Clair comme n'importe qui, et rien ne subsiste qui désigne un thème absent. */
export const SCRIPT_THEME =
  `(function(){try{var t=localStorage.getItem('${CLE_THEME}');` +
  `if(t==='sombre'){document.documentElement.setAttribute('data-theme',t);}` +
  `else if(t){localStorage.removeItem('${CLE_THEME}');}}catch(e){}})();`

/** Le thème mémorisé, ou le clair à défaut. À n'appeler que côté navigateur. */
export function lireTheme(): Theme {
  try {
    if (window.localStorage.getItem(CLE_THEME) === 'sombre') return 'sombre'
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
