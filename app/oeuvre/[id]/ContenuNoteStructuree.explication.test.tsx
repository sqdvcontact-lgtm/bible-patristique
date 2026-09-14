import { renderToStaticMarkup, renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  CLASSE_EXPLICATION_CORPUS,
  CLASSE_LIBELLE_EXPLICATION_CORPUS,
  STYLE_EXPLICATION_CORPUS,
} from '../../lib/explicationCorpus'
import { ContenuNoteStructuree } from './ContenuNoteStructuree'
import type { NoteBlocData, NoteStructuree } from './oeuvreTypes'

// ── L'EXPLICATION DE CORPUS SCRIPTURA DANS LE RENDU COMMUN DES NOTES ─────────────
//
// ⚠️ Les textes viennent d'explications réelles de la passe P10 (Commentaire sur Joël, La
// Cité de Dieu), abrégés. ⛔ Aucun identifiant de bloc n'entre dans la règle : les tests en
// nomment pour désigner un bloc dans le balisage, rien de plus.

const INSECABLE = String.fromCharCode(0xa0)
const FINE = String.fromCharCode(0x202f)

function note(...blocks: NoteBlocData[]): NoteStructuree {
  return { noteKey: 'I-TEST', noteNumber: 1, blocks }
}

function block(overrides: Partial<NoteBlocData>): NoteBlocData {
  return {
    blockId: 'b1', rank: 100, kind: 'commentary', form: 'prose',
    language: 'fr', text: 'Texte', rendering: null,
    needsReview: false, targetBlockId: null, translationOf: null,
    ...overrides,
  }
}

const EXPLICATION = 'La note corrige la forme imprimée *Hippathehh* en *Eppethahh* ou *Ephphetha* et la rapproche de Mc 7, 34 : Ἐφφαθά, « ouvre-toi ».'

function explication(overrides: Partial<NoteBlocData> = {}): NoteBlocData {
  return block({
    blockId: 'clarte', text: EXPLICATION, editorialRole: 'corpus_editorial_note',
    readerStyle: STYLE_EXPLICATION_CORPUS, readerLabel: 'Corpus Scriptura',
    ...overrides,
  })
}

const rendre = (n: NoteStructuree) => renderToStaticMarkup(<ContenuNoteStructuree note={n} />)
const compter = (html: string, motif: string) => html.split(motif).length - 1
const FIN_LIBELLE = '</span></span>'

/** Le balisage d'une explication, privé de ce que le style AJOUTE : la classe, la marque du
 *  style et le libellé. Ce qui reste doit être, au caractère près, celui d'un bloc ordinaire. */
function sansCeQueLeStyleAjoute(html: string): string {
  const debut = html.indexOf(`<span class="${CLASSE_LIBELLE_EXPLICATION_CORPUS}"`)
  expect(debut).toBeGreaterThan(-1)
  const fin = html.indexOf(FIN_LIBELLE, debut) + FIN_LIBELLE.length
  return (html.slice(0, debut) + html.slice(fin))
    .replace(` class="${CLASSE_EXPLICATION_CORPUS}"`, '')
    .replace(` data-reader-style="${STYLE_EXPLICATION_CORPUS}"`, '')
}

/** La balise ouvrante du bloc désigné. */
function baliseDe(html: string, blockId: string): string {
  const repere = html.indexOf(`data-block-id="${blockId}"`)
  expect(repere).toBeGreaterThan(-1)
  return html.slice(html.lastIndexOf('<', repere), html.indexOf('>', repere) + 1)
}

describe('ContenuNoteStructuree — l’explication de Corpus Scriptura', () => {
  it('pose la classe verte et le libellé « Corpus Scriptura » sur un bloc reader_style="corpus_explanation"', () => {
    const html = rendre(note(explication()))
    expect(compter(html, `class="${CLASSE_EXPLICATION_CORPUS}"`)).toBe(1)
    expect(baliseDe(html, 'clarte')).toContain(`class="${CLASSE_EXPLICATION_CORPUS}"`)
    expect(baliseDe(html, 'clarte')).toContain(`data-reader-style="${STYLE_EXPLICATION_CORPUS}"`)
    expect(html).toContain(`<span class="${CLASSE_LIBELLE_EXPLICATION_CORPUS}"`)
    expect(html).toContain('>Corpus Scriptura' + FIN_LIBELLE)
    // ⛔ Aucune couleur en style en ligne : l'encre vient de la classe, donc du thème.
    expect(html).not.toContain('--cs-explication-corpus')
  })

  it('prend le libellé que la donnée déclare, et retombe sur « Corpus Scriptura » sans lui', () => {
    expect(rendre(note(explication({ readerLabel: 'Éclaircissement du site' })))).toContain('>Éclaircissement du site' + FIN_LIBELLE)
    expect(rendre(note(explication({ readerLabel: null })))).toContain('>Corpus Scriptura' + FIN_LIBELLE)
    expect(rendre(note(explication({ readerLabel: '   ' })))).toContain('>Corpus Scriptura' + FIN_LIBELLE)
  })

  it('laisse inchangé un bloc source_editorial_note ordinaire', () => {
    const ordinaire = block({ blockId: 'clarte', text: EXPLICATION, editorialRole: 'source_editorial_note' })
    const html = rendre(note(ordinaire))
    expect(html).not.toContain('cs-note-explication-corpus')
    expect(html).not.toContain('data-reader-style')
    // ⚠️ Un libellé sans style n'agit pas : la projection ne le fait d'ailleurs pas voyager.
    expect(rendre(note({ ...ordinaire, readerLabel: 'Corpus Scriptura' }))).toBe(html)
    expect(rendre(note({ ...ordinaire, readerStyle: null }))).toBe(html)
  })

  it('laisse inchangé un bloc corpus_editorial_note qui ne déclare pas le style', () => {
    const corpus = rendre(note(block({ blockId: 'clarte', text: EXPLICATION, editorialRole: 'corpus_editorial_note' })))
    const source = rendre(note(block({ blockId: 'clarte', text: EXPLICATION, editorialRole: 'source_editorial_note' })))
    expect(corpus).not.toContain('cs-note-explication-corpus')
    // ⛔ Le rôle ne décide de rien : le même bloc sous l'autre voix rend le même balisage.
    expect(corpus).toBe(source)
  })

  it('compose italiques, petites capitales, références et liens internes comme dans un bloc ordinaire', () => {
    const riche = 'C’est celui que ++Cicéron++, *De oratore*, livre I, appelle ; voir [la note 12](/oeuvre/A0010O0002#note-12) et Mc 7, 34.'
    const html = rendre(note(explication({ text: riche })))
    expect(html).toContain('<em>De oratore</em>')
    expect(html).toContain('font-variant:small-caps')
    expect(html).toContain('href="/oeuvre/A0010O0002#note-12"')
    expect(sansCeQueLeStyleAjoute(html)).toBe(rendre(note(block({ blockId: 'clarte', text: riche, editorialRole: 'corpus_editorial_note' }))))

    // Un renvoi se normalise comme tout renvoi, qu'il soit ou non une explication.
    const renvoi = explication({ kind: 'reference', text: 'Matth. x, 22.' })
    const htmlRenvoi = rendre(note(renvoi))
    expect(htmlRenvoi).not.toContain('Matth.')
    expect(sansCeQueLeStyleAjoute(htmlRenvoi)).toBe(rendre(note({ ...renvoi, readerStyle: null })))
  })

  it('ne préfixe ni ne réécrit le texte : le libellé vit dans sa propre boîte', () => {
    const texte = 'La note explique comment comprendre le nom Bathuel ou Phatuel.'
    const bloc = Object.freeze(explication({ text: texte }))
    const html = rendre(note(bloc))
    expect(bloc.text).toBe(texte)
    expect(html).toContain(FIN_LIBELLE + texte)
    for (const espace of [' ', INSECABLE, FINE]) expect(html).not.toContain('Corpus Scriptura' + espace + ':')
    expect(html).not.toContain('Note de Corpus Scriptura')
  })

  it('dans une note partagée avec l’édition, ne pose le vert et le libellé que sur l’explication', () => {
    const html = rendre(note(
      explication({ rank: 1 }),
      block({
        blockId: 'source', rank: 2, language: 'la', editorialRole: 'source_editorial_note',
        text: 'Editi legunt Hebraice Hippathehh, cum legendum sit per Aleph ab initio Eppethahh.',
      }),
      block({ blockId: 'attribution', rank: 3, kind: 'attribution', editorialRole: 'source_editorial_note', text: 'Martianay.' }),
    ))
    expect(compter(html, `class="${CLASSE_EXPLICATION_CORPUS}"`)).toBe(1)
    expect(compter(html, `class="${CLASSE_LIBELLE_EXPLICATION_CORPUS}"`)).toBe(1)
    expect(baliseDe(html, 'clarte')).toContain(`class="${CLASSE_EXPLICATION_CORPUS}"`)
    expect(baliseDe(html, 'source')).not.toContain('class=')
    expect(baliseDe(html, 'attribution')).not.toContain('class=')
    expect(html).not.toContain('Note de Corpus Scriptura')
  })

  it('ne laisse pas un ancrage ouvrir la ligne d’une explication', () => {
    const coordonnee = block({ blockId: 'loc', rank: 1, kind: 'source_locator', text: '(V) pag. 178.' })
    // Devant un propos ordinaire, la coordonnée ouvre sa ligne (charte § 13.11)…
    const avecPropos = rendre(note(coordonnee, block({ blockId: 'clarte', rank: 2, text: EXPLICATION })))
    expect(baliseDe(avecPropos, 'loc').startsWith('<span')).toBe(true)
    // … devant une explication, elle fait unité à part, hors du vert et de son libellé.
    const avecExplication = rendre(note(coordonnee, explication({ rank: 2 })))
    expect(baliseDe(avecExplication, 'loc').startsWith('<div')).toBe(true)
    expect(baliseDe(avecExplication, 'loc')).not.toContain('class=')
  })

  it('rend le même balisage côté serveur et côté client', () => {
    const contenu = note(
      explication({ rank: 1 }),
      block({ blockId: 'source', rank: 2, editorialRole: 'source_editorial_note', text: 'La remarque de l’édition.' }),
    )
    const statique = renderToStaticMarkup(<ContenuNoteStructuree note={contenu} />)
    const serveur = renderToString(<ContenuNoteStructuree note={contenu} />)
    // Ce que le serveur envoie ne diffère du balisage que par les séparateurs de texte que
    // l'hydratation relit : rien n'est composé à part pour l'un ou pour l'autre.
    expect(serveur.split('<!-- -->').join('')).toBe(statique)

    // ⛔ Rien dans le chemin de l'explication ne lit l'environnement : sous un `window`
    // simulé, la sortie est la même au caractère près, donc rien à réconcilier.
    const racineGlobale = globalThis as Record<string, unknown>
    const avant = { window: racineGlobale.window, document: racineGlobale.document }
    racineGlobale.window = globalThis
    racineGlobale.document = { documentElement: {} }
    try {
      expect(renderToString(<ContenuNoteStructuree note={contenu} />)).toBe(serveur)
    } finally {
      if (avant.window === undefined) delete racineGlobale.window
      else racineGlobale.window = avant.window
      if (avant.document === undefined) delete racineGlobale.document
      else racineGlobale.document = avant.document
    }
  })
})
