import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

// ⛔ UN TEXTE JUSTIFIÉ EST TOUJOURS CÉSURÉ (charte § 41.2, posée le 2026-09-05).
// Justifié sans césure, rien ne borne l'étirement des espaces : mesuré ailleurs dans ce
// dépôt jusqu'à 1,609 em, six fois le quart de cadratin, et aucune propriété CSS ne le
// borne. C'est la mécanique du procédé, non un défaut de réglage — la césure REMPLIT les
// lignes, et c'est ce qui tient le gris.
//
// L'audit de densité du 5 septembre 2026 a trouvé la moitié des paragraphes justifiés du
// site sans césure : quinze sur trente. Ce test est ce qui empêche la dérive de revenir ;
// une règle que rien ne vérifie se redéfait au premier paragraphe neuf.

const RACINE = join(import.meta.dirname, '..')

/** Les surfaces qui se justifient SANS césure, et la raison de chacune.
 *  ⛔ Cette liste ne s'allonge pas pour faire passer un test : chaque entrée dit
 *  pourquoi la césure y est impossible ou nuisible, et rien d'autre ne l'excuse. */
const EXEMPTS: { chemin: string; motif: string }[] = [
  {
    // Le lecteur de la source native : le texte y est déclaré `lang="fro"`, et aucun
    // navigateur ne possède de syllabation de l'ancien français. `hyphens: auto` y
    // resterait sans effet dans le meilleur cas, et couperait faux dans le pire.
    chemin: join('components', 'BibleSourceReader.tsx'),
    motif: 'ancien français (lang="fro") : aucune syllabation disponible',
  },
  {
    // La zone d'édition d'un segment biblique. Un CHAMP DE SAISIE ne promet rien du
    // rendu final : on ne césure pas ce qu'on est en train de taper. ⚠️ Un éditeur
    // WYSIWYG, lui, promet la forme finale et prend la césure (voir `compositionEssai`).
    chemin: join('components', 'TexteBible.tsx'),
    motif: 'champ de saisie : ne promet pas le rendu final',
  },
  {
    // La lecture diplomatique du manuscrit 899 : même raison que le lecteur de source,
    // et le chantier ne se touche pas depuis ici.
    chemin: join('manuscrits', 'bible-899', 'bible899.module.css'),
    motif: 'témoin médiéval : couche diplomatique, aucune syllabation disponible',
  },
]

function fichiersDeStyle(dossier: string, chemins: string[] = []): string[] {
  for (const entree of readdirSync(dossier)) {
    if (entree.startsWith('.') || entree === 'node_modules') continue
    const complet = join(dossier, entree)
    if (statSync(complet).isDirectory()) fichiersDeStyle(complet, chemins)
    else if (/\.(tsx?|css)$/.test(entree) && !/\.test\.tsx?$/.test(entree)) chemins.push(complet)
  }
  return chemins
}

/** Les objets `style={{ … }}` du JSX, accolades équilibrées : une expression imbriquée
 *  (un ternaire, un `?? `, un objet) ne doit pas couper la lecture au premier `}`. */
function objetsDeStyle(source: string): { ligne: number; corps: string }[] {
  const trouves: { ligne: number; corps: string }[] = []
  const ouverture = /style=\{\{/g
  let debut: RegExpExecArray | null
  while ((debut = ouverture.exec(source))) {
    let i = debut.index + debut[0].length
    let profondeur = 2
    while (i < source.length && profondeur > 0) {
      const c = source[i]
      if (c === '{') profondeur++
      else if (c === '}') profondeur--
      i++
    }
    trouves.push({
      ligne: source.slice(0, debut.index).split('\n').length,
      corps: source.slice(debut.index + debut[0].length, i - 2),
    })
    ouverture.lastIndex = i
  }
  return trouves
}

/** Les blocs de déclarations d'une feuille — fichier `.css` comme balise `<style>`
 *  écrite dans un composant. Le découpage est grossier à dessein : on ne cherche pas à
 *  comprendre les sélecteurs, seulement à tenir ensemble les déclarations d'un bloc. */
function blocsDeFeuille(source: string): { ligne: number; corps: string }[] {
  const trouves: { ligne: number; corps: string }[] = []
  let position = 0
  for (const morceau of source.split('{').slice(1)) {
    position += 1
    const corps = morceau.split('}')[0]
    trouves.push({ ligne: source.slice(0, source.indexOf(corps, position)).split('\n').length, corps })
    position += morceau.length
  }
  return trouves
}

describe('densité des textes : le justifié appelle la césure', () => {
  it('couvre tout le site : aucun paragraphe justifié sans césure', () => {
    const fautifs: string[] = []
    for (const chemin of fichiersDeStyle(RACINE)) {
      const relatif = relative(RACINE, chemin)
      if (EXEMPTS.some(e => relatif.split(sep).join(sep) === e.chemin)) continue
      const source = readFileSync(chemin, 'utf8')

      for (const { ligne, corps } of objetsDeStyle(source)) {
        if (!/textAlign: *(['"])justify\1/.test(corps)) continue
        if (/hyphens/i.test(corps)) continue
        fautifs.push(`${relatif}:${ligne} (style en ligne)`)
      }

      for (const { ligne, corps } of blocsDeFeuille(source)) {
        if (!/text-align: *justify/.test(corps)) continue
        if (/hyphens/.test(corps)) continue
        fautifs.push(`${relatif}:${ligne} (feuille)`)
      }
    }
    expect(fautifs, `Justifié sans césure — ajouter hyphens: auto (charte § 41.2) :\n${fautifs.join('\n')}`).toEqual([])
  })

  it('garde une raison écrite pour chaque exemption', () => {
    for (const { chemin, motif } of EXEMPTS) {
      expect(motif.length, `${chemin} : l'exemption doit dire pourquoi.`).toBeGreaterThan(20)
    }
  })

  it('ne garde aucune exemption devenue inutile', () => {
    for (const { chemin } of EXEMPTS) {
      const source = readFileSync(join(RACINE, chemin), 'utf8')
      const justifie = /textAlign: *(['"])justify\1/.test(source) || /text-align: *justify/.test(source)
      expect(justifie, `${chemin} ne se justifie plus : retirer son exemption.`).toBe(true)
    }
  })
})
