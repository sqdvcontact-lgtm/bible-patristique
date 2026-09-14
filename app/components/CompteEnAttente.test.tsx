import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CompteEnAttente from './CompteEnAttente'
import { LETTRES_GRECQUES } from '../lib/lettresGrecques'

describe('ce qui tient la place d’un compte pendant qu’il se charge', () => {
  it('écrit au premier rendu une forme FIXE, la même que le serveur', () => {
    const html = renderToStaticMarkup(<CompteEnAttente />)
    for (const lettre of LETTRES_GRECQUES.slice(0, 3)) expect(html).toContain(`>${lettre}</span>`)
    expect(renderToStaticMarkup(<CompteEnAttente />)).toBe(html)
  })

  it('range chaque lettre dans une case de largeur fixe', () => {
    const html = renderToStaticMarkup(<CompteEnAttente longueur={2} />)
    expect(html.match(/display:inline-block;width:0\.62em/g)).toHaveLength(2)
  })

  it('tait les lettres à la synthèse vocale, et lui dit « chargement »', () => {
    const html = renderToStaticMarkup(<CompteEnAttente />)
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('lang="el"')
    expect(html).toContain('class="cs-hors-ecran">chargement</span>')
  })

  it('ne pose ni corps ni encre : il prend ceux de la ligne qui le porte', () => {
    const html = renderToStaticMarkup(<CompteEnAttente />)
    expect(html).not.toMatch(/font-size|color:/)
  })
})
