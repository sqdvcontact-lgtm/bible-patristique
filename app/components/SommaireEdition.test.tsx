import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SommaireEdition from './SommaireEdition'

// ⚠️ UN TITRE SE SERRE, DEUX TITRES S'ÉCARTENT (demande de l'auteur, 14 septembre 2026, le
// soir : « plus d'espaces entre les différents titres ; réduire l'interligne d'un même titre
// sur plusieurs lignes »).

const PIECES = [
  { cle: 'a', titre: 'Avant-propos', portee: 'Bible', scopeKind: 'bible' },
  { cle: 'b', titre: 'Introduction générale', portee: 'Bible', scopeKind: 'bible' },
  { cle: 'c', titre: 'Introduction à l’Ancien Testament', portee: 'Ancien Testament', scopeKind: 'testament' },
]

describe('le sommaire de l’édition', () => {
  const html = renderToStaticMarkup(<SommaireEdition pieces={PIECES} pieceActive="b" onOuvrir={() => {}} />)
  const boutons = html.match(/<button[^>]*>/g) ?? []

  it('rend une entrée par pièce, et serre l’interligne d’un titre qui peut s’enrouler', () => {
    expect(boutons).toHaveLength(3)
    for (const bouton of boutons) expect(bouton).toContain('line-height:1.2')
  })

  it('écarte deux pièces d’une même portée ; la pièce qu’une portée coiffe la touche', () => {
    expect(boutons[0]).toContain('margin:0 -6px 0')
    expect(boutons[1]).toContain('margin:var(--volet-air, 6px) -6px 0')
    expect(boutons[2]).toContain('margin:0 -6px 0')
  })

  it('⛔ ouvre une portée par un blanc plus grand que celui qui sépare deux pièces', () => {
    expect(html).toContain('padding:calc(3 * var(--volet-air, 6px)) 0 4px')
    expect(html).toContain('padding:2px 0 4px')
  })
})
