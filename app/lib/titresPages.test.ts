import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Le layout racine pose le gabarit « %s · Corpus Scriptura » (app/layout.tsx). Une page
// qui écrit elle-même le nom du site le voit donc paraître DEUX FOIS : l'onglet affichait
// « Statistiques — Corpus Scriptura · Corpus Scriptura », et le doublon partait aussi dans
// les partages et les résultats de recherche. Une page ne nomme plus le site, sauf à
// déclarer `absolute`, qui neutralise le gabarit.

const RACINE = join(import.meta.dirname, '..')

// Exemption unique : /quiz est neutralisée en production (elle renvoie un 404) et sa
// version vivante évolue sur la branche de travail Holy Guessr.
const EXEMPTES = ['quiz']

function pagesDuSite(dossier: string, chemins: string[] = []): string[] {
  for (const entree of readdirSync(dossier)) {
    if (entree.startsWith('.') || entree === 'node_modules') continue
    const complet = join(dossier, entree)
    if (statSync(complet).isDirectory()) pagesDuSite(complet, chemins)
    else if (entree === 'page.tsx') chemins.push(complet)
  }
  return chemins
}

describe('titres de page', () => {
  it('ne nomme jamais le site deux fois', () => {
    const fautives: string[] = []
    for (const chemin of pagesDuSite(RACINE)) {
      if (EXEMPTES.some(e => chemin.includes(join('app', e)))) continue
      const source = readFileSync(chemin, 'utf8')
      for (const ligne of source.split('\n')) {
        if (!/\btitle\s*:/.test(ligne)) continue
        if (!ligne.includes('Corpus Scriptura')) continue
        if (ligne.includes('absolute')) continue
        fautives.push(`${chemin.replace(RACINE, 'app')} → ${ligne.trim()}`)
      }
    }
    expect(fautives).toEqual([])
  })
})
