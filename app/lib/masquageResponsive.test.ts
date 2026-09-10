import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// ── LA GARDE DU MASQUAGE PAR SEUIL ───────────────────────────────────────────
//
// ⛔ UN STYLE EN LIGNE BAT TOUTE RÈGLE DE FEUILLE SANS `!important`, et la classe
// `hidden` de Tailwind est une règle de feuille comme une autre : `display: none`.
// Un élément qui porte `lg:hidden` ET un `display` en ligne n'est donc JAMAIS masqué,
// à aucune largeur — la classe est morte, et rien ne le dit.
//
// ⚠️ C'est le piège que le dépôt a déjà payé cinq fois (le survol du titre de colonne de
// la Polyglotte, le fond des cases, la teinte des chevrons de volet, le blanc au-dessus
// des cartes de l'accueil), et il a coûté ici le PANNEAU DE TÉLÉPHONE offert sur un
// ordinateur : relevé de l'auteur du 10 septembre 2026, « ce qu'on voit là, ça devrait
// être sur téléphone seulement ». Les deux éléments fautifs — le hamburger et son
// panneau — portaient `lg:hidden` depuis l'origine, et leur `display` en ligne l'annulait.
//
// ⛔ Le remède n'est pas de crier `!important` : c'est de rendre le `display` à la
// FEUILLE, par une classe utilitaire (`flex`, `inline-flex`), que la variante de seuil
// bat ensuite dans l'ordre du fichier. Une seule autorité pour une seule propriété.

const RACINE = 'app'

/** Un jeton `hidden`, quel que soit son préfixe de variante : `hidden`, `lg:hidden`,
 *  `max-md:hidden`, `print:hidden`… */
const JETON_MASQUE = /(?:^|\s)(?:[a-z0-9[\]._-]+:)*hidden(?=$|\s)/

function fichiers(dossier: string): string[] {
  const sortie: string[] = []
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree)
    if (statSync(chemin).isDirectory()) { sortie.push(...fichiers(chemin)); continue }
    if (chemin.endsWith('.tsx')) sortie.push(chemin)
  }
  return sortie
}

/**
 * Les balises OUVRANTES d'un fichier, chacune rendue telle qu'elle est écrite.
 *
 * ⚠️ On ne se contente pas d'une fenêtre autour de la classe : il faut la BALISE, sinon
 * un `style` du voisin passerait pour celui de l'élément masqué. Le parcours suit les
 * accolades et les chaînes — un `>` dans un titre ou une flèche `=>` dans un rappel ne
 * ferme pas la balise.
 */
export function balisesOuvrantes(source: string): string[] {
  const sortie: string[] = []
  for (let i = 0; i < source.length; i++) {
    if (source[i] !== '<' || !/[A-Za-z]/.test(source[i + 1] ?? '')) continue
    let profondeur = 0
    let guillemet: string | null = null
    let j = i + 1
    for (; j < source.length; j++) {
      const c = source[j]
      if (guillemet) { if (c === guillemet && source[j - 1] !== '\\') guillemet = null; continue }
      if (c === '"' || c === "'" || c === '`') { guillemet = c; continue }
      if (c === '{') { profondeur++; continue }
      if (c === '}') { profondeur--; continue }
      if (c === '<' && profondeur === 0) break            // balise imbriquée : on abandonne
      if (c === '>' && profondeur === 0) { sortie.push(source.slice(i, j + 1)); break }
    }
    i = j
  }
  return sortie
}

/** La valeur BRUTE d'un attribut, chaîne ou expression, telle qu'elle est écrite. */
export function valeurAttribut(balise: string, nom: string): string | null {
  const debut = balise.indexOf(`${nom}=`)
  if (debut === -1) return null
  const i = debut + nom.length + 1
  const ouvre = balise[i]
  if (ouvre === '"' || ouvre === "'") {
    const fin = balise.indexOf(ouvre, i + 1)
    return fin === -1 ? null : balise.slice(i + 1, fin)
  }
  if (ouvre !== '{') return null
  let profondeur = 0
  for (let j = i; j < balise.length; j++) {
    if (balise[j] === '{') profondeur++
    else if (balise[j] === '}') { profondeur--; if (profondeur === 0) return balise.slice(i + 1, j) }
  }
  return null
}

describe('un `display` en ligne ne côtoie jamais une classe de masquage', () => {
  it('aucune balise de `app/` ne porte les deux', () => {
    const fautifs: string[] = []
    for (const chemin of fichiers(RACINE)) {
      const source = readFileSync(chemin, 'utf8')
      if (!/hidden/.test(source)) continue
      for (const balise of balisesOuvrantes(source)) {
        const classe = valeurAttribut(balise, 'className')
        if (!classe || !JETON_MASQUE.test(classe)) continue
        const style = valeurAttribut(balise, 'style')
        if (!style || !/\bdisplay\s*:/.test(style)) continue
        fautifs.push(`${chemin} · ${balise.replace(/\s+/g, ' ').slice(0, 110)}`)
      }
    }
    // ⛔ Rendre le `display` à la feuille (classe utilitaire), jamais poser `!important`.
    expect(fautifs).toEqual([])
  })

  it('sait lire une balise, et ne s’arrête ni sur une flèche ni sur un `>` de texte', () => {
    const source = '<div className="lg:hidden" style={{ display: "flex" }} onClick={() => a > b} title="a > b">x</div>'
    const [balise] = balisesOuvrantes(source)
    expect(balise.endsWith('title="a > b">')).toBe(true)
    expect(valeurAttribut(balise, 'className')).toBe('lg:hidden')
    expect(valeurAttribut(balise, 'style')).toContain('display')
  })

  it('reconnaît le jeton de masquage, et lui seul', () => {
    for (const bon of ['hidden', 'lg:hidden', 'max-md:hidden', 'a hidden b', 'flex lg:hidden']) {
      expect(JETON_MASQUE.test(bon)).toBe(true)
    }
    for (const faux of ['hiddenX', 'cs-hidden', 'overflow-hidden', 'group-hidden']) {
      expect(JETON_MASQUE.test(faux)).toBe(false)
    }
  })
})
