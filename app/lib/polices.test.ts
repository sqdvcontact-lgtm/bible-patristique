import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MONO, SANS, SERIF } from './polices'

// ⛔ UNE PILE DE POLICES NE S'ÉCRIT QU'ICI (audit d'harmonie, 2026-09-23).
// Le site l'écrivait plus de cinq cents fois, et vingt fichiers redéfinissaient leur
// propre `SERIF` ou `SANS`. La garde parcourt `app/` et refuse toute pile écrite en
// toutes lettres dans un module TypeScript. Les feuilles `.css` ne sont pas visées : elles
// ne peuvent pas importer un module.
// Hors garde, et NOMMÉS : l'administration (chantier à part), les tests,
// `EssaiPDF.tsx` (PDFKit ne résout aucune variable CSS) et le chantier Bible 899 de
// l'auteur (`ModaleFacsimile899.tsx`, qu'on ne touche pas).

const RACINE = join(import.meta.dirname, '..')
const DOSSIERS_HORS_GARDE = ['admin']
const PILE = /var\(--font-source-(serif|sans)\)/

function modules(dossier: string, chemins: string[] = []): string[] {
  for (const entree of readdirSync(dossier)) {
    if (entree.startsWith('.') || entree === 'node_modules') continue
    const complet = join(dossier, entree)
    if (statSync(complet).isDirectory()) modules(complet, chemins)
    else if (/\.tsx?$/.test(entree)) chemins.push(complet)
  }
  return chemins
}

describe('les piles de polices', () => {
  it('sont fondées sur les variables de next/font', () => {
    expect(SERIF.startsWith('var(--font-source-serif)')).toBe(true)
    expect(SANS.startsWith('var(--font-source-sans)')).toBe(true)
    expect(MONO).toContain('monospace')
  })

  it('ne s’écrivent qu’une fois : aucun module ne recompose une pile', () => {
    const fautifs: string[] = []
    for (const chemin of modules(RACINE)) {
      const relatif = relative(RACINE, chemin)
      if (DOSSIERS_HORS_GARDE.includes(relatif.split(sep)[0])) continue
      if (/\.test\.tsx?$/.test(relatif) || /899|EssaiPDF/.test(relatif)) continue
      if (relatif === 'lib' + sep + 'polices.ts') continue
      const source = readFileSync(chemin, 'utf8')
      if (PILE.test(source)) fautifs.push(relatif)
    }
    expect(fautifs, 'Pile écrite à la main : importer SERIF, SANS ou MONO de app/lib/polices.ts').toEqual([])
  })
})
