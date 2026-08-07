import { describe, it, expect } from 'vitest'
import { normaliserEspaces, normaliserEspacesOriginal } from './typographie'

const FINE = ' '   // espace fine insécable U+202F
const NBSP = ' '   // espace insécable U+00A0

describe('normaliserEspacesOriginal (latin, grec)', () => {
  it('ajoute une fine insécable avant : ; ! ? quand la ponctuation est collée', () => {
    expect(normaliserEspacesOriginal('magna virtus tua: et')).toBe(`magna virtus tua${FINE}: et`)
    expect(normaliserEspacesOriginal('quid dicam?')).toBe(`quid dicam${FINE}?`)
    expect(normaliserEspacesOriginal('o magnum!')).toBe(`o magnum${FINE}!`)
    expect(normaliserEspacesOriginal('primum; deinde')).toBe(`primum${FINE}; deinde`)
  })
  it('ramène une espace simple ou insécable existante à la fine, et reste idempotent', () => {
    expect(normaliserEspacesOriginal('tua : et')).toBe(`tua${FINE}: et`)
    expect(normaliserEspacesOriginal(`tua${NBSP}: et`)).toBe(`tua${FINE}: et`)
    expect(normaliserEspacesOriginal(`tua${FINE}: et`)).toBe(`tua${FINE}: et`)
  })
  it('espace les guillemets français internes', () => {
    expect(normaliserEspacesOriginal('dixit «verbum»')).toBe(`dixit «${FINE}verbum${FINE}»`)
  })
  it('ne touche pas la virgule, le point ni les points de suspension', () => {
    expect(normaliserEspacesOriginal('a, b. c... fin.')).toBe('a, b. c... fin.')
  })
})

describe('normaliserEspaces (français, harmonisation du type d’espace)', () => {
  it('convertit l’insécable en fine avant ; ! ? et autour des guillemets', () => {
    expect(normaliserEspaces(`fin${NBSP}; suite`)).toBe(`fin${FINE}; suite`)
    expect(normaliserEspaces(`«${NBSP}mot${NBSP}»`)).toBe(`«${FINE}mot${FINE}»`)
  })
  it('ne force PAS d’espace là où il n’y en a pas (contrat historique inchangé)', () => {
    expect(normaliserEspaces('mot: suite')).toBe('mot: suite')
  })
})
