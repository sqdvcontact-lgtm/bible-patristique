import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ECHELLE_EMPILEMENT, PLANCHER_RANG_DE_PAGE } from './empilement'
import { RANGS_HORS_ECHELLE } from './empilementInventaire'

/**
 * LA GARDE DE L'EMPILEMENT.
 *
 * Le dernier axe du dessin à en recevoir une : le corps de texte a la sienne depuis le
 * 19 août, les rayons d'angle et les titres de page aussi, la couleur depuis le
 * 23 août, la syntaxe CSS depuis le 28. L'empilement, lui, était nommé depuis quatre
 * mois comme celui qui n'en avait pas.
 *
 * ⛔ Elle ne relève QUE les rangs de PAGE (≥ 900). Un `z-index` de 1 à 50 vit dans un
 * contexte d'empilement local et ne se compare qu'à ses frères.
 *
 * ⛔ Elle lit DEUX écritures, et il faut les deux : le rang posé en chiffres sur une
 * propriété, et le rang rangé dans une constante `Z_…`. La seconde est celle que le
 * site emploie déjà pour ses trois fenêtres les mieux tenues ; ne relever que la
 * première laisserait un angle mort — c'est le trou que la garde des blocs `<style>` a
 * payé le 9 septembre, et celui de la garde chromatique avant elle.
 */

const RACINE = join(import.meta.dirname, '..')
const RANG_SUR_PROPRIETE = /(?:zIndex\s*:\s*|z-index\s*:\s*)(\d{3,})/g
const RANG_EN_CONSTANTE = /\bZ_[A-Z0-9_]*\s*(?::\s*number)?\s*=\s*(\d{3,})\b/g

function fichiers(dossier: string, trouves: string[] = []): string[] {
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name)
    if (entree.isDirectory()) { if (entree.name !== 'node_modules') fichiers(chemin, trouves); continue }
    if (!/\.(tsx|ts|css)$/.test(entree.name) || /\.test\./.test(entree.name)) continue
    trouves.push(chemin)
  }
  return trouves
}

/** Le chemin tel que l'inventaire le nomme : relatif à `app/`, en barres obliques. */
function cle(chemin: string): string {
  return chemin.slice(RACINE.length + 1).split('\\').join('/')
}

function rangsDuFichier(texte: string): number[] {
  const rangs = new Set<number>()
  for (const motif of [RANG_SUR_PROPRIETE, RANG_EN_CONSTANTE]) {
    motif.lastIndex = 0
    let trouve: RegExpExecArray | null
    while ((trouve = motif.exec(texte))) {
      const rang = Number(trouve[1])
      if (rang >= PLANCHER_RANG_DE_PAGE) rangs.add(rang)
    }
  }
  return [...rangs].sort((a, b) => a - b)
}

const releve = new Map<string, number[]>()
for (const chemin of fichiers(RACINE)) {
  // ⚠️ Les deux modules de l'échelle sont hors périmètre : l'un DÉFINIT les rangs,
  //    l'autre les recense. Les compter reviendrait à se garder soi-même.
  if (/empilement(Inventaire)?\.ts$/.test(chemin)) continue
  const rangs = rangsDuFichier(readFileSync(chemin, 'utf8'))
  if (rangs.length > 0) releve.set(cle(chemin), rangs)
}

describe('empilement', () => {
  it('ne pose aucun rang de page hors de l’échelle et hors du registre', () => {
    const echelle = new Set(ECHELLE_EMPILEMENT)
    const intrus: string[] = []
    for (const [fichier, rangs] of releve) {
      const geles = new Set(RANGS_HORS_ECHELLE[fichier] ?? [])
      for (const rang of rangs) {
        if (!echelle.has(rang) && !geles.has(rang)) intrus.push(`${fichier} · ${rang}`)
      }
    }
    expect(
      intrus,
      'Un rang d’empilement de page ne s’invente pas : prendre un rang de app/lib/empilement.ts, ' +
        'ou écrire ici pourquoi aucun des onze ne suffisait.',
    ).toEqual([])
  })

  it('garde le registre à jour : rien n’y reste après avoir été rangé', () => {
    const partis: string[] = []
    for (const [fichier, rangs] of Object.entries(RANGS_HORS_ECHELLE)) {
      const presents = new Set(releve.get(fichier) ?? [])
      for (const rang of rangs) if (!presents.has(rang)) partis.push(`${fichier} · ${rang}`)
    }
    expect(
      partis,
      'La dette a DIMINUÉ : retirer ces lignes de empilementInventaire.ts. ' +
        'Un registre qu’on ne tient pas ment sur ce qui reste à faire.',
    ).toEqual([])
  })

  it('l’échelle est strictement croissante, et sans doublon', () => {
    const triee = [...ECHELLE_EMPILEMENT].sort((a, b) => a - b)
    expect(new Set(triee).size).toBe(ECHELLE_EMPILEMENT.length)
    // ⛔ On compare la liste DÉCLARÉE à sa version triée, jamais deux copies triées :
    //    l'écriture d'avant (`triee` contre un second tri) était vraie quoi qu'il arrive,
    //    et n'aurait rien dit d'un rang déplacé dans la déclaration. C'est l'ORDRE du
    //    module qui enseigne l'échelle à qui la lit.
    expect([...ECHELLE_EMPILEMENT]).toEqual(triee)
  })
})
