import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ContenuNoteStructuree } from './ContenuNoteStructuree'
import type { NoteBlocData, NoteStructuree } from './oeuvreTypes'

// Les DEUX NATURES NEUVES de la charte § 13.10, et l'italique de la langue arbitrée
// au § 13.8. Le reste du rendu est éprouvé dans `ContenuNoteStructuree.test.tsx`.

function note(...blocks: NoteBlocData[]): NoteStructuree {
  return { noteKey: 'I-TEST', noteNumber: 1, blocks }
}

function block(overrides: Partial<NoteBlocData>): NoteBlocData {
  return {
    blockId: 'b1', rank: 100, kind: 'commentary', form: 'prose',
    language: 'fr', text: 'Texte', rendering: 'word_paragraph',
    needsReview: false, targetBlockId: null, translationOf: null,
    ...overrides,
  }
}

describe('ContenuNoteStructuree — les natures neuves', () => {
  it('ouvre la note avec sa coordonnée imprimée, SANS en faire un paragraphe', () => {
    // Le bloc à trois têtes de Faivre, fendu par la passe 3 : « (V) pag. 178. — Avec
    // les démons… On peut consulter… ». Le fendre est une opération de STRUCTURE ;
    // elle ne doit pas se voir en lecture, où la note tient sur un paragraphe.
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'loc', rank: 100, kind: 'source_locator', text: '(V) pag. 178.' }),
      block({ blockId: 'lem', rank: 200, kind: 'lemma', text: 'Avec les démons les plus féroces.' }),
      block({ blockId: 'com', rank: 300, kind: 'commentary', text: 'On peut consulter Tertullien.' }),
    )} />)

    // Un seul paragraphe rendu : l'ancrage entre dedans, en span.
    expect(html.match(/data-kind="source_locator"/g)).toHaveLength(1)
    expect(html).toContain('<span')
    expect(html).not.toMatch(/<div[^>]*data-kind="source_locator"/)
    expect(html).toMatch(/<div[^>]*data-kind="commentary"/)
    // Et dans l'ordre de la page imprimée.
    expect(html.indexOf('(V) pag. 178.')).toBeLessThan(html.indexOf('Avec les démons'))
    expect(html.indexOf('Avec les démons')).toBeLessThan(html.indexOf('On peut consulter'))
  })

  it('marque la famille de chaque bloc, pour que la composition s’y adosse', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'com', kind: 'commentary', text: 'Le propos.' }),
      block({ blockId: 'ren', rank: 200, kind: 'internal_cross_reference', text: 'Voyez la note I, p. 150.' }),
    )} />)

    expect(html).toContain('data-famille="propos"')
    expect(html).toContain('data-famille="renvoi"')
  })

  it('ne rend pas une note faite du SEUL ancrage invisible', () => {
    // Rien à quoi s'attacher : l'ancrage se rend alors seul, plutôt que de disparaître.
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'loc', kind: 'source_locator', text: '(V) pag. 178.' }),
    )} />)

    expect(html).toContain('(V) pag. 178.')
    expect(html).toMatch(/<div[^>]*data-kind="source_locator"/)
  })

  it('NORMALISE un renvoi extérieur et laisse INTACT un renvoi interne', () => {
    // Le même texte, deux natures : c'est toute la raison d'être de la nature neuve.
    // Un renvoi interne n'a ni auteur ni titre à normaliser, et ses chiffres romains
    // sont des numéros de note, non des chapitres.
    const dehors = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'r', kind: 'reference', text: 'Gen. II, 7' }),
    )} />)
    const dedans = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'r', kind: 'internal_cross_reference', text: 'Gen. II, 7' }),
    )} />)

    expect(dehors).toContain('Gn 2, 7')
    expect(dedans).toContain('Gen. II, 7')
    expect(dedans).not.toContain('Gn 2, 7')
  })
})

describe('ContenuNoteStructuree — l’italique de la langue', () => {
  it('italise un bloc entièrement latin, quelle que soit sa longueur', () => {
    const court = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ language: 'la', text: 'Tolle, lege.' }),
    )} />)
    const long = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ language: 'la', text: 'Magnus es, domine, et laudabilis ualde. '.repeat(30) }),
    )} />)

    expect(court).toContain('font-style:italic')
    expect(long).toContain('font-style:italic')
  })

  it('n’italise NI le grec NI le français', () => {
    // Le grec se distingue par son alphabet, et l'italique y déforme la lettre.
    const grec = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ language: 'grc', text: 'λόγος' }),
    )} />)
    const francais = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ language: 'fr', text: 'Une remarque du traducteur.' }),
    )} />)

    expect(grec).toContain('font-style:normal')
    expect(francais).toContain('font-style:normal')
  })
})

describe('ContenuNoteStructuree — le numéro affiché', () => {
  it('reporte le numéro affiché dans le DOM, sans effacer le numéro interne', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={{
      noteKey: 'AUG-CONF-1039', noteNumber: 1039, displayNumber: 87,
      blocks: [block({ text: 'La note.' })],
    }} />)

    // L'identité et l'ordre de lecture restent lisibles pour l'outillage ; le lecteur,
    // lui, verra 87.
    expect(html).toContain('data-note-number="1039"')
    expect(html).toContain('data-note-affiche="87"')
  })

  it('n’écrit pas d’attribut quand la division n’a pas pu être établie', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={{
      noteKey: 'X', noteNumber: 3, displayNumber: null, blocks: [block({ text: 'La note.' })],
    }} />)

    expect(html).not.toContain('data-note-affiche')
  })
})
