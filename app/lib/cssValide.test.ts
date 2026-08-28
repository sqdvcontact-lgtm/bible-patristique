import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import postcss from 'postcss'
import { describe, expect, it } from 'vitest'

// ── La garde du CSS — la seule chose du dessin que rien ne lisait ─────────────
//
// ⛔ Le 28 août 2026, `app/globals.css` a été poussé avec une accolade en moins :
// une règle `@container` sans sa fermeture. PostCSS refuse alors le fichier ENTIER
// (« Unclosed block »), `next build` s'arrête, et DEUX déploiements de suite ont
// échoué — le site est resté sur la version de la veille sans que rien ne le
// signale côté dépôt. Le défaut avait vécu une heure, et il n'a été trouvé qu'en
// rejouant le build dans un arbre de travail propre.
//
// ⚠️ Ce que cet épisode apprend : **aucune garde locale ne lisait le CSS**. `tsc`
// ignore les feuilles de style, `eslint` aussi, et les gardes du dessin
// (échelle typographique, rayons, couleurs) les lisent comme du TEXTE, à coups
// d'expressions régulières — elles auraient trouvé les tailles et les teintes
// d'un fichier que le navigateur refuse d'ouvrir. Le seul outil qui parse
// vraiment est `next build`, qui coûte trois minutes et qu'on ne joue pas à
// chaque commit.
//
// Ce test parse chaque feuille avec le MÊME analyseur que la chaîne de
// construction. Il ne juge rien du dessin : il vérifie seulement que le fichier
// est du CSS, ce qui est le préalable de toutes les autres gardes.

const RACINE = join(import.meta.dirname, '..')

function feuilles(dossier: string, chemins: string[] = []): string[] {
  for (const entree of readdirSync(dossier)) {
    if (entree.startsWith('.') || entree === 'node_modules') continue
    const complet = join(dossier, entree)
    if (statSync(complet).isDirectory()) feuilles(complet, chemins)
    else if (entree.endsWith('.css')) chemins.push(complet)
  }
  return chemins
}

describe('css', () => {
  it('trouve les feuilles de style de l’application', () => {
    // Une garde qui ne lit plus rien passe en silence : on vérifie qu'elle a bien
    // de la matière, comme la suite de tests se vérifie au COMPTE de fichiers.
    expect(feuilles(RACINE).length).toBeGreaterThan(0)
  })

  it('n’en laisse aucune que l’analyseur refuse', () => {
    const fautives: string[] = []
    for (const chemin of feuilles(RACINE)) {
      const relatif = relative(RACINE, chemin).split(/[\\/]/).join('/')
      try {
        // `postcss.parse` lève sur toute erreur de syntaxe — bloc non fermé,
        // parenthèse orpheline, chaîne non terminée. C'est exactement ce que fait
        // la chaîne de construction avant de rendre la feuille au navigateur.
        postcss.parse(readFileSync(chemin, 'utf8'), { from: chemin })
      } catch (erreur) {
        fautives.push(`${relatif} · ${(erreur as Error).message}`)
      }
    }
    expect(
      fautives,
      'Une feuille de style que l’analyseur refuse fait échouer `next build` TOUT ENTIER,\n' +
        'donc le déploiement, donc le site — qui reste alors sur sa version précédente\n' +
        'sans que rien ne le signale. Corriger la syntaxe avant de pousser.',
    ).toEqual([])
  })
})
