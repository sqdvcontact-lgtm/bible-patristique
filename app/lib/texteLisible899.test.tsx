import { describe, expect, it } from 'vitest'
import { Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { rendreMarqueurs899 } from './marqueurs899'
import { texteLisible899 } from './texteLisible899'

/** Le texte que l'écran montre : le rendu, balises ôtées, entités rendues. */
function texteRendu(brut: string): string {
  const html = renderToStaticMarkup(<Fragment>{rendreMarqueurs899(brut)}</Fragment>)
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

const VERSETS = [
  'Au commencement Dieu fist le ciel et la terre.',
  'et [lecture incertaine : preig] les autres',
  'il dist [ajout marginal : a ses filz] que',
  'preig] et puis il vint',
  '[…] et il prenoit le pain',
  'por[…]er le fes',
  'la [lacune : déchirure] fin',
  'la [lacune : non précisée] fin',
  'et [lacune : le folio',
  'dechiré] manque ici',
  'Moÿses dist : [lecture difficile : ce que]',
  'il vint [lacune] et',
  '',
]

describe('texteLisible899', () => {
  it.each(VERSETS)('rend le texte que l’écran montre : « %s »', (brut) => {
    expect(texteLisible899(brut)).toBe(texteRendu(brut))
  })

  it('ne laisse aucune étiquette d’atelier', () => {
    const lu = texteLisible899('et [lecture incertaine : preig] les autres')
    expect(lu).toBe('et preig les autres')
    expect(lu).not.toMatch(/lecture incertaine|\[|\]/)
  })

  it('dit la lacune par sa cause, ou par le mot nu', () => {
    expect(texteLisible899('la [lacune : déchirure] fin')).toBe('la [déchirure] fin')
    expect(texteLisible899('il vint […] et')).toBe('il vint [lacune] et')
  })
})
