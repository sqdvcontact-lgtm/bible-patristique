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

// /quiz est neutralisée en production et son chantier n'est pas versionné : même
// exemption que dans `echelleTypographique.test.ts` et `titresPages.test.ts`.
const DOSSIERS_EXEMPTS = ['quiz']

const RAYONS_ADMIS = new Set(['4px', '8px', '12px', '999px', '50%', '0'])

// ⚠️ DEUX motifs, et il en faut deux. Le premier lit la forme JSX (`borderRadius: '4px'`),
// le second la forme CSS des 43 blocs `<style>` et des modules (`border-radius: 4px;`).
// La garde n'avait que le premier : elle exigeait des guillemets, donc tout ce qui
// s'écrit dans un bloc `<style>` lui échappait — c'est-à-dire la moitié du dessin du
// site. Sa sœur `echelleTypographique.test.ts` porte le doublet depuis l'origine
// (`TAILLE_EN_LIGNE` et `TAILLE_CSS`) ; celle-ci le porte enfin (2026-08-23).
const RAYON = /border-?[Rr]adius: *(['"])([^'"]+)\1/g
const RAYON_CSS = /border-radius: *([^;}\n]+)/g

// `!important` n'est pas une valeur de rayon : il qualifie la déclaration entière.
const sansImportant = (v: string) => v.replace(/!important/g, '').trim()

// ⚠️ Ce que la garde aveugle avait laissé passer, et qui demande une DÉCISION plutôt
// qu'un rabattage : le coin de carton d'une couverture de publication. Le rayon y
// appartient au DESSIN de l'objet, comme sa gamme de couleurs, que la charte tient
// déjà hors de la palette pour la même raison. À trancher : le rabattre sur 4px, ou
// l'inscrire dans la charte comme valeur dessinée. En attendant, il est NOMMÉ ici :
// une exception qu'on voit vaut mieux qu'un angle mort qui n'en signale aucune.
const RAYONS_DESSINES: Record<string, string[]> = {
  'EssaisListeClient.tsx': ['2px'], // .couverture — coin de cartonnage
}

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
      if (DOSSIERS_EXEMPTS.includes(relatif.split(/[\\/]/)[0])) continue
      // Ce fichier CITE les deux motifs : ils s'apparieraient sur eux-mêmes.
      if (relatif.endsWith('formes.test.ts')) continue
      const dessines = RAYONS_DESSINES[relatif.split(/[\\/]/).pop() ?? ''] ?? []
      const source = readFileSync(chemin, 'utf8')
      const valeurs = [
        ...[...source.matchAll(RAYON)].map(m => m[2]),
        ...[...source.matchAll(RAYON_CSS)].map(m => m[1]),
      ].map(sansImportant)
      for (const valeur of valeurs) {
        // un rayon composé (« 0 0 8px 8px ») se contrôle valeur par valeur
        for (const part of valeur.split(/ +/)) {
          if (!RAYONS_ADMIS.has(part) && !dessines.includes(part)) fautifs.push(`${relatif} · ${valeur}`)
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
