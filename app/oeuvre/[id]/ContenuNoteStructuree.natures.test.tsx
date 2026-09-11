import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ContenuNoteStructuree } from './ContenuNoteStructuree'
import type { NoteBlocData, NoteStructuree } from './oeuvreTypes'

// Les DEUX NATURES NEUVES de la charte § 13.10, l'italique de la langue arbitrée au
// § 13.8, et la citation visée du § 13.18. Le reste du rendu est éprouvé dans
// `ContenuNoteStructuree.test.tsx`.

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
  it('ouvre la note avec sa coordonnée et sa citation visée, SANS en faire des paragraphes', () => {
    // Le bloc à trois têtes de Faivre, fendu par la passe 3 : « (V) pag. 178. — Avec
    // les démons… On peut consulter… ». Le fendre est une opération de STRUCTURE : devant
    // un PROPOS, la coordonnée et la citation visée ouvrent sa ligne (charte § 13.11).
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'loc', rank: 100, kind: 'source_locator', text: '(V) pag. 178.' }),
      block({ blockId: 'lem', rank: 200, kind: 'lemma', text: 'Avec les démons les plus féroces.' }),
      block({ blockId: 'com', rank: 300, kind: 'commentary', text: 'On peut consulter Tertullien.' }),
    )} />)

    // Une seule unité, le propos ; la coordonnée et la citation visée y sont en span.
    expect(html.match(/<div[^>]*data-block-id=/g)).toHaveLength(1)
    expect(html).not.toMatch(/<div[^>]*data-kind="(source_locator|lemma)"/)
    expect(html).toMatch(/<span[^>]*data-kind="source_locator"/)
    expect(html).toMatch(/<span[^>]*data-kind="lemma"/)
    expect(html.indexOf('data-kind="commentary"')).toBeLessThan(html.indexOf('data-kind="source_locator"'))
    // Et dans l'ordre de la page imprimée.
    expect(html.indexOf('(V) pag. 178.')).toBeLessThan(html.indexOf('Avec les démons'))
    expect(html.indexOf('Avec les démons')).toBeLessThan(html.indexOf('On peut consulter'))
  })

  it('sépare la CITATION VISÉE de la COORDONNÉE de l’appareil', () => {
    // Les deux sont de la famille `ancrage` ; mais la citation visée est une phrase de
    // l'œuvre, et la coordonnée un repère de l'imprimé. Les composer pareillement les
    // confondrait. Charte § 13.11, la raison nommée : la coordonnée garde le repère
    // discret, la citation visée prend la teinte et la mesure du texte.
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'loc', rank: 100, kind: 'source_locator', text: '(V) pag. 178.' }),
      block({ blockId: 'lem', rank: 200, kind: 'lemma', text: 'Avec les démons les plus féroces.' }),
      block({ blockId: 'com', rank: 300, kind: 'commentary', text: 'On peut consulter Tertullien.' }),
    )} />)
    const balise = (tag: string, kind: string) => html.match(new RegExp(`<${tag}[^>]*data-kind="${kind}"[^>]*>`, 'u'))?.[0] ?? ''

    expect(balise('span', 'lemma')).toContain('font-style:normal')
    expect(balise('span', 'lemma')).not.toContain('cs-texte-second')
    expect(balise('span', 'source_locator')).toContain('cs-texte-second')
    expect(balise('span', 'source_locator')).toContain('font-style:normal')
  })

  it('n’italise la citation visée que si elle est LATINE', () => {
    // ⛔ L'italique dit la LANGUE, jamais la nature (charte § 13.18).
    const francaise = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'lem', rank: 1, kind: 'lemma', text: '« Hélas ! avant le temps, le malheur m’a fait vieux. »' }),
      block({ blockId: 'com', rank: 2, text: 'Le propos.' }),
    )} />)
    const latine = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'lem', rank: 1, kind: 'lemma', language: 'la', text: 'Tolle, lege.' }),
      block({ blockId: 'com', rank: 2, text: 'Le propos.' }),
    )} />)

    expect(francaise).toMatch(/<span[^>]*data-kind="lemma"[^>]*font-style:normal/u)
    expect(latine).toMatch(/<span[^>]*data-kind="lemma"[^>]*font-style:italic/u)
  })

  it('fait de la citation visée une UNITÉ devant tout ce qui n’est pas un propos', () => {
    // Charte § 13.16.3 : devant une référence, une attribution ou une citation, la
    // citation visée se tient seule, et ce qui la suit descend d'une ligne. Collée à une
    // référence, elle se lisait comme une phrase de l'auteur que la référence nomme.
    for (const kind of ['reference', 'attribution', 'quotation', 'internal_cross_reference'] as const) {
      const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
        block({ blockId: 'lem', rank: 1, kind: 'lemma', text: '« La phrase de l’œuvre. »' }),
        block({ blockId: 'sui', rank: 2, kind, text: 'Ce qui suit.' }),
      )} />)

      expect(html, kind).toMatch(/<div[^>]*data-kind="lemma"/)
      expect(html, kind).toMatch(new RegExp(`<div[^>]*data-kind="${kind}"`))
      expect(html.match(/<div[^>]*data-block-id=/g), kind).toHaveLength(2)
    }
  })

  it('fait de la citation visée EN VERS une unité, même devant un propos', () => {
    // Ses retours à la ligne ne tiennent pas dans la ligne d'un propos.
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'lem', rank: 1, kind: 'lemma', form: 'verse', text: 'Le bonheur qui jadis inspirait mes accents,\nA fait place aux sanglots.' }),
      block({ blockId: 'com', rank: 2, text: 'Le propos.' }),
    )} />)

    expect(html).toMatch(/<div[^>]*data-kind="lemma"/)
    expect(html).toMatch(/<div[^>]*data-kind="commentary"/)
  })

  it('laisse un RENVOI INTERNE suivre sa cible en ligne, comme l’autre renvoi', () => {
    // Toute la famille `renvoi` se compose de même : seule la normalisation les sépare.
    // ⛔ Sans cela, un renvoi interne posé `inline_after_target` ferait paragraphe en
    // silence, et le défaut se lirait comme une donnée fautive.
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'com', rank: 100, kind: 'commentary', text: 'Le propos.' }),
      block({
        blockId: 'ren', rank: 200, kind: 'internal_cross_reference',
        text: 'Voyez la note I, p. 150.', rendering: 'inline_after_target', targetBlockId: 'com',
      }),
    )} />)

    expect(html).not.toMatch(/<div[^>]*data-kind="internal_cross_reference"/)
    expect(html).toMatch(/<span[^>]*data-kind="internal_cross_reference"/)
    // Il reste dans le paragraphe de sa cible, et garde ses chiffres de note.
    expect(html).toContain('Voyez la note I, p. 150.')
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
