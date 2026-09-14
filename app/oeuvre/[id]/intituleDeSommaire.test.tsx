import { readdirSync, readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { intituleEnTexteNu, rendreIntituleDeSommaire } from './appelNote'

// ── UN INTITULÉ DE SOMMAIRE SE COMPOSE ENRICHI ───────────────────────────────
//
// Le sommaire du volet d'une œuvre rendait la chaîne nue : « Plan de *l’Apologétique* »
// s'y lisait avec ses astérisques, et les chapeaux des Questions sur l'Heptateuque avec
// leurs balises <i>, quand le corps composait les mêmes titres enrichis. Les cas éprouvés
// ici sont ceux du corpus (relevé du 14 septembre 2026).

// Le saut de ligne saisi par l'éditeur, écrit en point de code : un échappement tapé
// dans un fichier de test ne se relit pas.
const SAUT = String.fromCharCode(10)
const rendu = (texte: string) => renderToStaticMarkup(<>{rendreIntituleDeSommaire(texte)}</>)

describe('rendreIntituleDeSommaire', () => {
  it('compose l’italique d’un titre d’œuvre au lieu de montrer ses astérisques', () => {
    expect(rendu('Plan de *l’Apologétique*')).toBe('Plan de <em>l’Apologétique</em>')
  })

  it('compose la balise <i> que porte le corpus', () => {
    const html = rendu('Nouvelle répétion [<i>sic</i>]')
    expect(html).toContain('<em>sic</em>')
    expect(html).not.toContain('&lt;i&gt;')
  })

  it('retire les appels de note sans perdre l’enrichissement qui les suit', () => {
    const html = rendu('le Paraclet[[1468]] qui a parlé par les Prophètes, *etc.*')
    expect(html).not.toContain('[[')
    expect(html).toContain('Paraclet qui')
    expect(html).toContain('<em>etc.</em>')
  })

  it('garde le saut de ligne saisi, et l’italique de part et d’autre', () => {
    const html = rendu(`*Factus est* mis pour *factum est ut*${SAUT}Nombres 23, 5`)
    expect(html).toContain('<em>Factus est</em>')
    expect(html).toContain('<em>factum est ut</em>')
    expect(html).toContain(`${SAUT}Nombres 23, 5`)
  })

  it('compose les petites capitales, le gras et le siècle', () => {
    const html = rendu('++Livre++ **premier**, IVe siècle')
    expect(html).toContain('font-variant:small-caps')
    expect(html).toContain('<strong>premier</strong>')
    expect(html).toContain('<sup')
  })

  it('ne rend jamais de lien, l’intitulé vivant déjà dans un bouton ou un lien', () => {
    const html = rendu('Voir [la Cité de Dieu](https://exemple.org)')
    expect(html).not.toContain('<a')
    expect(html).toContain('la Cité de Dieu')
  })

  it('laisse intact un intitulé sans marque', () => {
    expect(rendu('Livre premier')).toBe('Livre premier')
  })
})

describe('intituleEnTexteNu', () => {
  it('rend l’intitulé sans marques ni appels, pour un title ou un aria-label', () => {
    expect(intituleEnTexteNu('Plan de *l’Apologétique*[[3]]')).toBe('Plan de l’Apologétique')
    expect(intituleEnTexteNu('Permision [<i>sic</i>] dérisoire')).toBe('Permision [sic] dérisoire')
  })
})

describe('aucune surface de la page ne compose un intitulé nu', () => {
  // `titreSansAppelsDeNote` rend une CHAÎNE qui porte encore ses marques : un composant
  // qui l'affiche tel quel remet les astérisques à l'écran. Il ne sert donc plus qu'à
  // l'intérieur d'appelNote, où les deux aides le composent.
  it('seul appelNote emploie encore titreSansAppelsDeNote', () => {
    const dossier = new URL('./', import.meta.url)
    const fautifs = readdirSync(dossier)
      .filter(nom => /\.tsx?$/.test(nom) && !nom.includes('.test.') && nom !== 'appelNote.tsx')
      .filter(nom => readFileSync(new URL(nom, dossier), 'utf8').includes('titreSansAppelsDeNote'))
    expect(fautifs).toEqual([])
  })
})
