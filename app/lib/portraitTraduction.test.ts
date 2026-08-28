import { describe, expect, it } from 'vitest'
import { portraitTraduction } from './portraitTraduction'

describe('portraitTraduction', () => {
  it('prend l’encart et son cadrage quand la notice en porte un', () => {
    expect(portraitTraduction({
      photo: 'bandeau.jpg',
      photo_encart: 'encart.jpg',
      photo_position: { bandeau: { x: 10, y: 20, scale: 1 }, encart: { x: 65, y: 59, scale: 1.2 } },
    })).toEqual({ url: 'encart.jpg', x: 65, y: 59, scale: 1.2 })
  })

  it('retombe sur le bandeau tant que le portrait n’est pas posé', () => {
    expect(portraitTraduction({
      photo: 'bandeau.jpg',
      photo_encart: null,
      photo_position: { bandeau: { x: 10, y: 20, scale: 1 } },
    })).toEqual({ url: 'bandeau.jpg', x: 50, y: 20, scale: 1 })
  })

  it('lit l’ancien nom du cadrage — mais après le nouveau', () => {
    expect(portraitTraduction({
      photo: 'bandeau.jpg',
      photo_position: { lateral: { x: 30, y: 40, scale: 1.1 } },
    })).toEqual({ url: 'bandeau.jpg', x: 30, y: 40, scale: 1.1 })
    expect(portraitTraduction({
      photo: 'bandeau.jpg',
      photo_position: { encart: { x: 70, y: 10, scale: 1 }, lateral: { x: 30, y: 40, scale: 1.1 } },
    })).toEqual({ url: 'bandeau.jpg', x: 70, y: 10, scale: 1 })
  })

  it('ne rend rien quand la notice ne porte aucune image', () => {
    expect(portraitTraduction({})).toBeNull()
    expect(portraitTraduction({ photo: null, photo_encart: null, photo_position: null })).toBeNull()
  })
})
