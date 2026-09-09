import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { verrouillerLeDefilement, verrousPoses } from './verrouDefilement'

/**
 * LE VERROU DE DÉFILEMENT — l'épreuve du défaut qui l'a fait écrire.
 *
 * ⛔ Le patron d'avant — chaque fenêtre retenait la valeur qu'elle avait LUE et la
 * reposait en partant — laisse la page figée dès que deux fenêtres se chevauchent et
 * ne se ferment pas dans l'ordre où elles se sont ouvertes. Ces tests éprouvent donc
 * les DEUX ordres, et pas seulement celui qui marchait.
 *
 * ⚠️ Pas de jsdom, qui n'est pas installé et n'apporterait rien : le module ne touche
 * qu'à `document.body.style.overflow`, et un document de trois lignes suffit à
 * l'éprouver. Ce qu'on veut savoir est ce que fait le COMPTEUR.
 */

const style = { overflow: '' }
const documentFeint = { body: { style } }

beforeEach(() => {
  style.overflow = ''
  ;(globalThis as { document?: unknown }).document = documentFeint
})

afterEach(() => {
  while (verrousPoses() > 0) verrouillerLeDefilement()()
  delete (globalThis as { document?: unknown }).document
})

describe('verrouillerLeDefilement', () => {
  it('gèle la page au premier verrou et la rend au dernier', () => {
    const relacher = verrouillerLeDefilement()
    expect(style.overflow).toBe('hidden')
    relacher()
    expect(style.overflow).toBe('')
  })

  it('deux fenêtres fermées DANS L’ORDRE rendent la page', () => {
    const a = verrouillerLeDefilement()
    const b = verrouillerLeDefilement()
    b()
    expect(style.overflow).toBe('hidden')
    a()
    expect(style.overflow).toBe('')
  })

  // ⛔ LE DÉFAUT DU 9 SEPTEMBRE 2026, et la raison du compteur. Avec le patron
  // d'avant, la seconde fenêtre lisait « hidden » comme valeur d'avant et la reposait
  // en dernier : plus rien ne la retirait, et la page restait figée pour de bon, les
  // clics continuant de fonctionner puisque seul le défilement était verrouillé.
  it('deux fenêtres fermées À CONTRE-ORDRE rendent la page aussi', () => {
    const a = verrouillerLeDefilement()
    const b = verrouillerLeDefilement()
    a()
    expect(style.overflow).toBe('hidden')
    b()
    expect(style.overflow).toBe('')
  })

  it('cinq fenêtres, fermées dans n’importe quel ordre', () => {
    const relachements = [0, 1, 2, 3, 4].map(() => verrouillerLeDefilement())
    for (const i of [2, 0, 4, 1]) relachements[i]()
    expect(style.overflow).toBe('hidden')
    relachements[3]()
    expect(style.overflow).toBe('')
  })

  // ⚠️ Le double montage du mode strict rejoue le nettoyage : sans idempotence, le
  // compteur tomberait sous zéro et déverrouillerait une fenêtre encore ouverte.
  it('un relâchement rejoué ne décompte qu’une fois', () => {
    const a = verrouillerLeDefilement()
    const b = verrouillerLeDefilement()
    b(); b(); b()
    expect(verrousPoses()).toBe(1)
    expect(style.overflow).toBe('hidden')
    a()
    expect(style.overflow).toBe('')
  })

  it('rend au document la valeur qu’il portait, quelle qu’elle soit', () => {
    style.overflow = 'scroll'
    const a = verrouillerLeDefilement()
    expect(style.overflow).toBe('hidden')
    a()
    expect(style.overflow).toBe('scroll')
  })

  // ⚠️ Au rendu SERVEUR il n'y a pas de document : le verrou ne doit rien tenter, et
  // rendre tout de même de quoi se relâcher.
  it('ne fait rien, et ne casse rien, sans document', () => {
    delete (globalThis as { document?: unknown }).document
    const relacher = verrouillerLeDefilement()
    expect(verrousPoses()).toBe(0)
    expect(() => relacher()).not.toThrow()
  })
})
