/**
 * ⛔ UN `next/dynamic` PORTE SA PROPRE FRONTIÈRE SUSPENSE.
 *
 * Écrit sans option, `dynamic(() => import(…))` ne pose AUCUNE frontière (voir
 * next/dist/shared/lib/lazy-dynamic/loadable.js : `hasSuspenseBoundary = !ssr || !!loading`).
 * Au premier affichage, son code n'est pas encore téléchargé : le composant suspend, et
 * React remonte jusqu'à la frontière la plus proche, qui est celle de `loading.tsx` —
 * l'écran d'attente de toute la route. La page entière est remplacée le temps du
 * téléchargement, puis rendue de nouveau, et le lecteur se retrouve en haut.
 *
 * Relevé de l'auteur le 2026-09-26 : le crayon d'un segment et le bouton de partage d'une
 * œuvre « rechargeaient » la page et la remontaient, une fois sur deux — la première fois
 * seulement, le code étant ensuite en cache.
 *
 * ⛔ Toute écriture passe donc `loading` (une frontière à fallback nul, le rendu serveur
 * gardé) ou `ssr: false` (frontière posée par Next). Le motif est lu sur l'appel ENTIER,
 * jusqu'à sa parenthèse fermante, jamais sur la seule ligne.
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const RACINE = join(process.cwd(), 'app')

function fichiers(dossier: string): string[] {
  const sortie: string[] = []
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom)
    if (statSync(chemin).isDirectory()) sortie.push(...fichiers(chemin))
    else if (/\.(tsx?|mts)$/.test(nom) && !/\.test\./.test(nom)) sortie.push(chemin)
  }
  return sortie
}

/** Le texte de l'appel `dynamic(`…`)`, parenthèses équilibrées. */
function appel(source: string, debut: number): string {
  let profondeur = 0
  for (let i = debut; i < source.length; i++) {
    const c = source[i]
    if (c === '(') profondeur++
    else if (c === ')') {
      profondeur--
      if (profondeur === 0) return source.slice(debut, i + 1)
    }
  }
  return source.slice(debut)
}

describe('next/dynamic', () => {
  it('chaque appel porte loading ou ssr: false', () => {
    const fautes: string[] = []
    let vus = 0
    for (const chemin of fichiers(RACINE)) {
      const source = readFileSync(chemin, 'utf8')
      if (!source.includes('next/dynamic')) continue
      const motif = /(?<![\w.])dynamic\(/g
      for (let m = motif.exec(source); m; m = motif.exec(source)) {
        vus++
        const texte = appel(source, m.index + 'dynamic'.length)
        if (!/\bloading\s*:/.test(texte) && !/\bssr\s*:\s*false\b/.test(texte)) {
          fautes.push(`${relative(process.cwd(), chemin)} : dynamic${texte.slice(0, 80)}`)
        }
      }
    }
    expect(vus).toBeGreaterThan(0)
    expect(fautes).toEqual([])
  })
})
