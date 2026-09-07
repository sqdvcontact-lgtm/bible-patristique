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

// /quiz est neutralisée en production (elle renvoie un 404) et sa version vivante
// évolue sur le chantier Holy Guessr, dont les fichiers ne sont pas versionnés.
// Même exemption, et pour la même raison, que `titresPages.test.ts`. Sans elle,
// la garde tenait tout `npm test` en échec sur un chantier qui n'est pas en ligne :
// une suite durablement rouge cesse d'être un signal. La lever le jour où le quiz
// rejoindra le site, sa palette et son échelle avec.
const DOSSIERS_EXEMPTS = ['quiz']

// ⛔ LA GARDE LIT LA DÉCLARATION ENTIÈRE, NON LA VALEUR QUI SUIT LES DEUX-POINTS.
//
// Elle exigeait la taille immédiatement après `fontSize:`, entre guillemets : un
// TERNAIRE lui échappait donc tout entier. `fontSize: seul ? '0.82rem' : '0.79rem'` a
// vécu ainsi dans la colonne en langue originale de la page d'œuvre, avec DEUX tailles
// hors grille — 13,12 px et 12,64 px, dont aucun rang n'existe — relevées le 7 septembre
// 2026 et rabattues sur 13 et 12,5.
//
// ⚠️ C'est trait pour trait le trou que la garde CHROMATIQUE avait déjà payé, où
// trente-sept teintes se cachaient dans des ternaires, et pour la même raison : le motif
// avait été écrit d'après la forme la plus FRÉQUENTE, non d'après la propriété. On borne
// désormais à la fin de la déclaration, puis on relit chaque valeur en rem à l'intérieur.
const DECLARATION = /(?:fontSize|font-size)\s*:[^;,\n]*/g
const VALEUR_REM = /([0-9]*\.?[0-9]+)rem/g

// ⚠️ Les `clamp(…)` des frontispices restent EXEMPTÉS, comme l'en-tête du module le dit :
// ce sont des compositions, où la taille fait partie du dessin. L'exemption porte sur la
// déclaration entière, et elle est NOMMÉE ici plutôt que subie par un motif trop étroit —
// une exception qu'on voit vaut mieux qu'un angle mort qui n'en signale aucune.
const EST_COMPOSITION = /clamp\(/

// ⚠️ UN COMMENTAIRE QUI CITE UNE TAILLE N'EN POSE AUCUNE, et la garde s'en est prise à
// sa propre note dès qu'elle a su lire une déclaration entière. Même remède que sa sœur
// chromatique, et la même écriture (`couleursEnDur.test.ts`) : on retire les commentaires
// avant de mesurer. ⛔ Le `//` ne se coupe qu'en TÊTE de ligne, jamais au milieu : une
// adresse en porte deux, et l'on emporterait le code qui la précède.
function sansCommentaires(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
}

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
      if (DOSSIERS_EXEMPTS.includes(relatif.split(sep)[0])) continue
      const source = sansCommentaires(readFileSync(chemin, 'utf8'))
      for (const declaration of source.matchAll(DECLARATION)) {
        if (EST_COMPOSITION.test(declaration[0])) continue
        for (const valeur of declaration[0].matchAll(VALEUR_REM)) {
          if (!estSurLEchelle(parseFloat(valeur[1]))) {
            fautives.push(`${relatif} · ${valeur[1]}rem — ${declaration[0].trim()}`)
          }
        }
      }
    }
    expect(fautives, `Tailles hors échelle. Rangs admis : ${ECHELLE_REM.join(', ')}`).toEqual([])
  })
})
