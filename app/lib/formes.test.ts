import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Deux dérives que ce test empêche de revenir.
//
// 1. LES RAYONS. Tous les entiers de 2 à 20 servaient de rayon d'angle, sans qu'aucun
//    ne veuille dire quoi que ce soit. Échelle : 4 (puce, champ, bouton) · 8 (carte,
//    encart) · 12 (modale, panneau) · 999px (pilule) · 50% (rond).
//
// 2. L'ALPHA CONCATÉNÉ. Le site affaiblissait une teinte en lui collant deux chiffres
//    d'alpha : `background: \`${coul}14\``. Cela ne vaut que si la teinte est un hex
//    littéral ; depuis qu'elle peut être un token, la chaîne produit `var(--cs-vert)14`,
//    que le navigateur jette EN SILENCE. Le fond disparaissait sans rien signaler.
//    Passer par `colorMix()` (app/lib/couleurs.ts), qui accepte les deux formes.

const RACINE = join(import.meta.dirname, '..')
const EXEMPTS = ['EssaiPDF.tsx'] // composé en points par PDFKit, pas par un navigateur

const RAYONS_ADMIS = new Set(['4px', '8px', '12px', '999px', '50%', '0'])
const RAYON = /border-?[Rr]adius: *(['"])([^'"]+)\1/g
const ALPHA_COLLE = /\$\{[^{}]+\}[0-9a-fA-F]{2}\b/g

function fichiersDeStyle(dossier: string, chemins: string[] = []): string[] {
  for (const entree of readdirSync(dossier)) {
    if (entree.startsWith('.') || entree === 'node_modules') continue
    const complet = join(dossier, entree)
    if (statSync(complet).isDirectory()) fichiersDeStyle(complet, chemins)
    else if (/\.(tsx?|css)$/.test(entree)) chemins.push(complet)
  }
  return chemins
}

describe('formes', () => {
  it('ne connaît que quatre rayons d’angle', () => {
    const fautifs: string[] = []
    for (const chemin of fichiersDeStyle(RACINE)) {
      const relatif = relative(RACINE, chemin)
      if (EXEMPTS.some(e => relatif.endsWith(e))) continue
      const source = readFileSync(chemin, 'utf8')
      for (const m of source.matchAll(RAYON)) {
        // un rayon composé (« 0 0 8px 8px ») se contrôle valeur par valeur
        for (const part of m[2].trim().split(/ +/)) {
          if (!RAYONS_ADMIS.has(part)) fautifs.push(`${relatif} · ${m[2]}`)
        }
      }
    }
    expect([...new Set(fautifs)], 'Rayons admis : 4px · 8px · 12px · 999px · 50%').toEqual([])
  })

  it('n’accole jamais un alpha à une teinte', () => {
    const fautifs: string[] = []
    // Les deux fichiers qui DÉCRIVENT le piège en citent la forme fautive.
    const documentent = ['couleurs.ts', 'formes.test.ts']
    for (const chemin of fichiersDeStyle(RACINE)) {
      const relatif = relative(RACINE, chemin)
      if (documentent.some(e => relatif.endsWith(e))) continue
      const source = readFileSync(chemin, 'utf8')
      for (const m of source.matchAll(ALPHA_COLLE)) fautifs.push(`${relatif} · ${m[0]}`)
    }
    expect(fautifs, 'Employer colorMix(teinte, pourcentage) — voir app/lib/couleurs.ts').toEqual([])
  })
})
