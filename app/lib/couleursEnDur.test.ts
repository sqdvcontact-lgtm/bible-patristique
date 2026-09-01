import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COULEURS_EN_DUR } from './couleursEnDurInventaire'

// La garde CHROMATIQUE — le quatrième axe, et le dernier à en recevoir une.
//
// La charte le dit depuis la première passe d'harmonie : aucune couleur d'interface ne
// s'écrit en dur, on emploie le jeton. Deux passes ont rabattu 1 033 valeurs, et il en
// restait tout de même 353 le 2026-08-23, dont plusieurs illisibles sur le sol du Cuir.
// Ce n'est pas une affaire de négligence : les trois axes qui ont une garde mécanique
// (corps de texte, rayons d'angle, titres de page) tiennent, celui qui n'en avait pas
// dérive. Une règle qu'aucun test ne vérifie n'est pas une règle, c'est un souhait.
//
// Ce test ne rabat rien : il gèle. `couleursEnDurInventaire.ts` porte l'état du jour,
// et à partir d'ici la liste ne peut que DÉCROÎTRE. Une teinte nouvelle est refusée ;
// une teinte transposée doit être retirée de l'inventaire, faute de quoi le registre
// rouille et cesse de dire la vérité sur la dette.

const RACINE = join(import.meta.dirname, '..')

// ⚠️ 'reliuresHautsFaits.ts' rejoint l'exemption le 2026-09-01, pour la RAISON de
// 'couverturesEssai.ts' et pas une autre : c'est une gamme DESSINÉE — trois cuirs pris
// dans les deux gammes littérales du site — dont le contraste est éprouvé par sa
// propre garde ('reliuresHautsFaits.test.ts'). Un jeton y rendrait le calcul impossible.
const EXEMPTS = ['globals.css', 'EssaiPDF.tsx', 'couverturesEssai.ts', 'couleursEnDurInventaire.ts', 'reliuresHautsFaits.ts']
const DOSSIERS_EXEMPTS = ['quiz']

// ⚠️ Le `#` ne doit PAS être précédé d'un `&` : `&#8239;`, l'espace fine insécable que
// la charte pose autour des guillemets, se lisait sinon comme la couleur `#8239`. Vu le
// 2026-08-25 dans `BibleEditionParatext.tsx`, où la garde chromatique tombait sur une
// ESPACE et rendait toute la suite rouge.
const HEX = /(?<!&)#[0-9a-fA-F]{3,8}\b/g
// Une fonction de couleur dont le premier argument est un CHIFFRE porte une valeur
// littérale. `rgba(var(--cs-vert-rgb), 0.07)` commence par `var` : c'est la forme
// tokenisée, celle qu'on veut, et elle n'entre pas au registre.
const FONCTION = /\b(?:rgba?|hsla?)\(\s*[0-9.][^)]*\)/g
// ⚠️ Un noir ou un blanc translucide est une OMBRE ou un CALQUE, pas une teinte : la
// charte prescrit cette forme (« un calque se pose en noir translucide ») et elle rend
// la même chose sous les deux thèmes. Elle sort du registre.
const OMBRE_OU_VOILE = /^rgba\((?:0,0,0|255,255,255),0?\.\d+\)$/

/** Les commentaires CITENT des couleurs sans en poser aucune. */
function sansCommentaires(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
}

/** Les teintes littérales réellement posées par un fichier. */
export function teintesLitterales(source: string): string[] {
  const net = sansCommentaires(source)
  const vues = new Set<string>()
  for (const m of net.match(HEX) ?? []) vues.add(m.toLowerCase())
  for (const m of net.match(FONCTION) ?? []) {
    const v = m.replace(/\s+/g, '').toLowerCase()
    if (!OMBRE_OU_VOILE.test(v)) vues.add(v)
  }
  return [...vues].sort()
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

function fichiersSurveilles(): { relatif: string; source: string }[] {
  const sortie: { relatif: string; source: string }[] = []
  for (const chemin of fichiersDeStyle(RACINE)) {
    const relatif = relative(RACINE, chemin).split(/[\\/]/).join('/')
    if (EXEMPTS.some(e => relatif.endsWith(e))) continue
    if (DOSSIERS_EXEMPTS.includes(relatif.split('/')[0])) continue
    if (/\.test\./.test(relatif)) continue
    sortie.push({ relatif, source: readFileSync(chemin, 'utf8') })
  }
  return sortie
}

describe('couleurs en dur', () => {
  it('reconnaît la forme tokenisée et écarte les ombres', () => {
    // La forme qu'on VEUT ne doit jamais être comptée comme dette.
    expect(teintesLitterales('background: rgba(var(--cs-vert-rgb), 0.07)')).toEqual([])
    expect(teintesLitterales('color: var(--cs-texte-fort)')).toEqual([])
    expect(teintesLitterales('boxShadow: "0 2px 8px rgba(0,0,0,0.35)"')).toEqual([])
    // Ce qu'on refuse.
    expect(teintesLitterales('color: "#4a453f"')).toEqual(['#4a453f'])
    expect(teintesLitterales('background: rgba(61, 107, 79, 0.1)')).toEqual(['rgba(61,107,79,0.1)'])
    // Un noir OPAQUE est une encre, pas une ombre.
    expect(teintesLitterales('color: rgb(0,0,0)')).toEqual(['rgb(0,0,0)'])
    // Un commentaire qui cite une teinte n'en pose aucune.
    expect(teintesLitterales('// le vert d’encre vaut #2a3d30\ncolor: var(--cs-encre)')).toEqual([])
  })

  it('n’introduit aucune teinte que l’inventaire ne connaisse', () => {
    const nouvelles: string[] = []
    for (const { relatif, source } of fichiersSurveilles()) {
      const connues = COULEURS_EN_DUR[relatif] ?? []
      for (const teinte of teintesLitterales(source)) {
        if (!connues.includes(teinte)) nouvelles.push(`${relatif} · ${teinte}`)
      }
    }
    expect(
      nouvelles,
      'Une couleur d’interface s’écrit en JETON, jamais en dur (charte, § Palette).\n' +
        'Si cette teinte est une gamme DESSINÉE — un carton, une couverture, une encre posée\n' +
        'sur une photo — elle est légitime : l’inscrire alors dans couleursEnDurInventaire.ts,\n' +
        'avec sa raison, plutôt que de la laisser passer en silence.',
    ).toEqual([])
  })

  it('garde l’inventaire à jour : rien n’y reste après avoir été transposé', () => {
    const surveilles = new Map(fichiersSurveilles().map(f => [f.relatif, teintesLitterales(f.source)]))
    const perimees: string[] = []
    for (const [relatif, teintes] of Object.entries(COULEURS_EN_DUR)) {
      const actuelles = surveilles.get(relatif)
      if (!actuelles) {
        perimees.push(`${relatif} · fichier disparu du périmètre`)
        continue
      }
      for (const teinte of teintes) {
        if (!actuelles.includes(teinte)) perimees.push(`${relatif} · ${teinte}`)
      }
    }
    expect(
      perimees,
      'La dette a DIMINUÉ : retirer ces lignes de couleursEnDurInventaire.ts.\n' +
        'Un registre qu’on ne tient pas ment sur ce qui reste à faire.',
    ).toEqual([])
  })
})
