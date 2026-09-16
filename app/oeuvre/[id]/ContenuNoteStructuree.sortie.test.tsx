import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SEUIL_CITATION_SORTIE } from '../../lib/citationSortie'
import { ContenuNoteStructuree } from './ContenuNoteStructuree'
import type { NoteBlocData, NoteStructuree } from './oeuvreTypes'

// ── UNE CITATION SORTIE SE DÉTACHE ET PERD SES GUILLEMETS (charte § 13.18.1) ─────
//
// ⚠️ Le cas est réel : la note 146 de La Cité de Dieu (Barreau, Vivès) porte un
// commentaire de 198 signes qui ANNONCE, puis la citation de 1 409 signes qu'Érasme
// intercale. La donnée ne déclarait pas sa disposition, et la citation coulait dans le
// fil de la note, guillemets compris.

const OUVRANT = String.fromCharCode(0x00ab)

function note(...blocks: NoteBlocData[]): NoteStructuree {
  return { noteKey: 'AUG-CD-NFR-0146', noteNumber: 146, blocks }
}

function block(overrides: Partial<NoteBlocData>): NoteBlocData {
  return {
    blockId: 'b1', rank: 1, kind: 'commentary', form: 'prose',
    language: 'fr', text: 'Texte', rendering: null,
    needsReview: false, targetBlockId: null, translationOf: null,
    ...overrides,
  }
}

const ANNONCE = 'À cet endroit se trouve intercalé dans l’édition d’Érasme un passage qui ne se lit point dans les autres éditions et qui n’a de rapport ni avec ce qui précède ni avec ce qui suit. Voici ce passage :'

const CITE = 'Car ces prières, soit de l’Église même, soit de quelques pieuses âmes, pour certains défunts ne sont point exaucées, quoique ceux qui ont été régénérés dans le Christ vivent si mal dans leur corps qu’ils soient indignes d’une telle miséricorde, de même qu’ils ne vivent point non plus assez bien pour n’avoir pas besoin de miséricorde. Il est certain aussi que ceux qui sont tels, et qui ont été purifiés après la résurrection des corps, avant le jour du jugement dernier, par les peines temporelles que leurs âmes endurent, ne seront point livrés aux supplices d’un feu éternel.'

const annonce = () => block({ blockId: 'b001:v31p5:01', rank: 1, kind: 'commentary', text: ANNONCE })
const citation = (o: Partial<NoteBlocData> = {}) => block({
  blockId: 'b001:v31p5:02', rank: 2, kind: 'quotation',
  text: OUVRANT + ' ' + CITE + ' ' + String.fromCharCode(0x00bb) + ', *etc*.',
  ...o,
})

const rendre = (n: NoteStructuree) => renderToStaticMarkup(<ContenuNoteStructuree note={n} />)

describe('la citation longue d’une note', () => {
  it('atteint bien le seuil : c’est ce qui fait le cas', () => {
    expect(CITE.length).toBeGreaterThanOrEqual(SEUIL_CITATION_SORTIE)
  })

  it('se détache, sans que la donnée l’ait déclaré', () => {
    expect(rendre(note(annonce(), citation()))).toContain('data-disposition="sortie"')
  })

  it('perd ses guillemets encadrants', () => {
    const html = rendre(note(annonce(), citation()))
    expect(html).not.toContain(OUVRANT)
    expect(html).toContain('Car ces prières')
  })

  // ⛔ Le texte qui ANNONCE la citation ne bouge pas : il n'est pas une citation, il la
  // présente, et son deux-points appelle ce qui suit.
  it('laisse intact le commentaire qui l’annonce', () => {
    expect(rendre(note(annonce(), citation()))).toContain('Voici ce passage')
    expect(rendre(note(annonce(), citation()))).toContain('data-disposition="fil"')
  })

  // ⛔ La DÉCLARATION l'emporte : une citation que l'éditeur veut au fil y reste, avec
  // ses guillemets, si longue soit-elle.
  it('garde ses guillemets quand la donnée la veut au fil', () => {
    const html = rendre(note(annonce(), citation({ citationLayout: 'inline' })))
    expect(html).toContain(OUVRANT)
    expect(html).not.toContain('data-disposition="sortie"')
  })

  // ⚠️ Une citation brève reste au fil : elle s'y lit, et le retrait y serait du bruit.
  it('laisse au fil, guillemets compris, une citation brève', () => {
    const breve = citation({ text: OUVRANT + ' Voici ce passage ' + String.fromCharCode(0x00bb) })
    const html = rendre(note(annonce(), breve))
    expect(html).toContain(OUVRANT)
    expect(html).not.toContain('data-disposition="sortie"')
  })
})
