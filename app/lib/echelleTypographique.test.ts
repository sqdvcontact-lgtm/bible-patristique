import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ECHELLE_PX, ECHELLE_REM, estSurLEchelle, rangLePlusProche } from './echelleTypographique'

// Le site comptait 112 tailles de texte distinctes, dont une trentaine entre 10 et 14 px
// séparées par des centièmes de pixel. Elles sont rabattues sur les 32 rangs de
// `echelleTypographique.ts`. Ce test est ce qui empêche la dérive de revenir : un module
// pur ne prouve rien tant que rien ne vérifie ce qui entre.

const RACINE = join(import.meta.dirname, '..')

// ⛔ Le PDF d'un essai est composé en POINTS et rendu par PDFKit, pas par un navigateur :
// l'échelle de l'écran ne s'y applique pas (voir l'en-tête d'EssaiPDF.tsx).
const EXEMPTS = [join('essais', '[id]', 'EssaiPDF.tsx')]

const TAILLE_EN_LIGNE = /fontSize: *(['"])([0-9]*\.?[0-9]+)rem\1/g
const TAILLE_CSS = /font-size: *([0-9]*\.?[0-9]+)rem/g

function fichiersDeStyle(dossier: string, chemins: string[] = []): string[] {
  for (const entree of readdirSync(dossier)) {
    if (entree.startsWith('.') || entree === 'node_modules') continue
    const complet = join(dossier, entree)
    if (statSync(complet).isDirectory()) fichiersDeStyle(complet, chemins)
    else if (/\.(tsx?|css)$/.test(entree)) chemins.push(complet)
  }
  return chemins
}

describe('échelle typographique', () => {
  it('ne comporte que des rangs croissants et distincts', () => {
    const trie = [...ECHELLE_PX].sort((a, b) => a - b)
    expect(ECHELLE_PX).toEqual(trie)
    expect(new Set(ECHELLE_PX).size).toBe(ECHELLE_PX.length)
  })

  it('rend le rang le plus proche', () => {
    expect(rangLePlusProche(12.65)).toBe(12.5)
    expect(rangLePlusProche(13.8)).toBe(14)
    expect(rangLePlusProche(11.52)).toBe(11.5)
    expect(estSurLEchelle(0.71875)).toBe(true) // 11,5 px
    expect(estSurLEchelle(0.790625)).toBe(false) // 12,65 px, l'ancien doublon
  })

  it('couvre tout le site : aucune taille hors grille', () => {
    const fautives: string[] = []
    for (const chemin of fichiersDeStyle(RACINE)) {
      const relatif = relative(RACINE, chemin)
      if (EXEMPTS.some(e => relatif.endsWith(e) || relatif.split(sep).join(sep) === e)) continue
      const source = readFileSync(chemin, 'utf8')
      for (const m of source.matchAll(TAILLE_EN_LIGNE)) {
        if (!estSurLEchelle(parseFloat(m[2]))) fautives.push(`${relatif} · fontSize ${m[2]}rem`)
      }
      for (const m of source.matchAll(TAILLE_CSS)) {
        if (!estSurLEchelle(parseFloat(m[1]))) fautives.push(`${relatif} · font-size ${m[1]}rem`)
      }
    }
    expect(fautives, `Tailles hors échelle. Rangs admis : ${ECHELLE_REM.join(', ')}`).toEqual([])
  })
})
