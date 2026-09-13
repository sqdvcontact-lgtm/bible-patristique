import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CLASSES_BIBLIOGRAPHIE } from '@/app/lib/apparatBibliographie'
import { ContenuNoteStructuree } from './ContenuNoteStructuree'
import type { NoteBlocData, NoteStructuree } from './oeuvreTypes'

/**
 * LA SÉRIE BIBLIOGRAPHIQUE D'UNE NOTE — charte § 47.2, « SÉRIES BIBLIOGRAPHIQUES DANS LES
 * NOTES ». Le cas témoin est la note 2 de la Doctrine des Apôtres (Laurent–Hemmer 1907),
 * telle que la donnée la porte depuis le 13 septembre 2026 : une phrase d'annonce, quatre
 * œuvres, une phrase de reprise.
 */

function note(...blocks: NoteBlocData[]): NoteStructuree {
  return { noteKey: 'N0002', noteNumber: 2, blocks }
}

function propos(blockId: string, rank: number, text: string): NoteBlocData {
  return { blockId, rank, kind: 'commentary', form: 'prose', language: 'fr', text, needsReview: false }
}

function entree(blockId: string, rank: number, text: string): NoteBlocData {
  return {
    blockId, rank, kind: 'reference', form: 'prose', language: 'fr', text, needsReview: false,
    bibliographyListItem: true,
  }
}

const NOTE_DEUX = note(
  propos('b100', 1, 'Il s’agit d’une addition au texte évangélique. *Cf.* les parallèles suivants :'),
  entree('b200', 2, '*Didachè*, V, 2 ; X, 3.'),
  entree('b300', 3, '*Épître de Barnabé*, XVI, 1 ; XIX, 2.'),
  entree('b400', 4, '++Justin Martyr++, *Apologie pour les chrétiens*, XVI, 6.'),
  entree('b500', 5, '*Deuxième épître aux Corinthiens*, XV, 2.'),
  propos('b600', 6, 'C’est une étape de l’élaboration des formules types.'),
)

const LISTE = `<ul class="${CLASSES_BIBLIOGRAPHIE.liste}">`
const ENTREE = `<li class="${CLASSES_BIBLIOGRAPHIE.entree}">`

function compter(html: string, motif: string): number {
  return html.split(motif).length - 1
}

function rendre(n: NoteStructuree): string {
  return renderToStaticMarkup(<ContenuNoteStructuree note={n} />)
}

describe('la série bibliographique d’une note', () => {
  it('réunit les entrées qui se suivent en UNE liste de la famille commune', () => {
    const html = rendre(NOTE_DEUX)
    expect(compter(html, LISTE)).toBe(1)
    expect(compter(html, ENTREE)).toBe(4)
    expect(html).toContain(`<div class="${CLASSES_BIBLIOGRAPHIE.bloc}"`)
    // ⛔ Pas de `sansHote` : l'encart compose sur son conteneur, et la liste en descend d'un cran.
    expect(html).not.toContain(CLASSES_BIBLIOGRAPHIE.sansHote)
  })

  it('laisse l’annonce avant la liste et la reprise après, chacune à sa place', () => {
    const html = rendre(NOTE_DEUX)
    const place = (motif: string) => html.indexOf(motif)
    const ordre = [
      place('data-block-id="b100"'), place(LISTE),
      place('data-block-id="b200"'), place('data-block-id="b300"'),
      place('data-block-id="b400"'), place('data-block-id="b500"'),
      place('</ul>'), place('data-block-id="b600"'),
    ]
    expect(ordre.every(p => p >= 0)).toBe(true)
    expect([...ordre].sort((a, b) => a - b)).toEqual(ordre)
    // Chaque entrée enveloppe UN bloc, le sien, avec tout son rendu.
    for (const id of ['b200', 'b300', 'b400', 'b500']) {
      expect(html).toMatch(new RegExp(`${ENTREE}<div[^>]*data-block-id="${id}"`, 'u'))
    }
  })

  it('rend le blanc des entrées à la liste, et le garde aux paragraphes', () => {
    const html = rendre(NOTE_DEUX)
    const style = (id: string) => html.match(new RegExp(`data-block-id="${id}"[^>]*style="([^"]*)"`, 'u'))?.[1] ?? ''
    expect(style('b200')).toContain('margin:0;')
    expect(style('b100')).toContain('margin:0 0 0.375rem')
    expect(style('b600')).toContain('margin:0 0 0.375rem')
  })

  it('ne fait pas de liste d’un renvoi que la donnée ne marque pas', () => {
    const html = rendre(note(
      propos('b100', 1, 'La leçon est attestée par :'),
      { ...entree('b200', 2, '*Didachè*, V, 2.'), bibliographyListItem: undefined },
      { ...entree('b300', 3, '*Épître de Barnabé*, XVI, 1.'), bibliographyListItem: undefined },
    ))
    expect(html).not.toContain(LISTE)
    expect(html).not.toContain(CLASSES_BIBLIOGRAPHIE.bloc)
  })

  it('fait deux listes de deux séries qu’une phrase sépare', () => {
    const html = rendre(note(
      propos('b100', 1, 'Deux prières de ++Tertullien++ :'),
      entree('b200', 2, '++Tertullien++, *Apologétique*, XXXIX.'),
      entree('b300', 3, '++Tertullien++, *De la prière*, V.'),
      propos('b400', 4, 'Et deux canons :'),
      entree('b500', 5, '*Canones Hippolyti*, 32 et 35.'),
      entree('b600', 6, '++Tertullien++, *Apologétique*, XXXIX.'),
    ))
    expect(compter(html, LISTE)).toBe(2)
    expect(compter(html, ENTREE)).toBe(4)
    expect(html.indexOf('data-block-id="b400"')).toBeGreaterThan(html.indexOf('</ul>'))
  })

  it('pose le point final sur la dernière entrée quand la série ferme la note', () => {
    const html = rendre(note(
      propos('b100', 1, 'Voir notamment :'),
      entree('b200', 2, '*Canones Hippolyti*, 32 et 35'),
      entree('b300', 3, '++Tertullien++, *Apologétique*, XXXIX'),
    ))
    // ⛔ La liste n'enveloppe que le rendu : la ponctuation finale reste celle de la note,
    // posée une seule fois, sur la dernière pièce.
    expect(html).toContain('XXXIX.')
    expect(html).not.toContain('32 et 35.')
  })

  it('n’imprime ni puce ni tiret en tête d’entrée', () => {
    const entrees = [...rendre(NOTE_DEUX).matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gu)]
      .map(m => m[1].replace(/<[^>]+>/gu, '').trimStart())
    expect(entrees).toHaveLength(4)
    const MARQUEURS = ['-', String.fromCharCode(0x2013), String.fromCharCode(0x2014),
      String.fromCharCode(0x2022), String.fromCharCode(0xb7), '*']
    for (const texte of entrees) expect(MARQUEURS).not.toContain(texte[0])
  })
})
