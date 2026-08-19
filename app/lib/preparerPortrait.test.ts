import { describe, expect, it } from 'vitest'
import { BOITE_TRADUCTION, dimensionsPortrait, nomJpeg, PORTRAIT_HAUTEUR_MAX, PORTRAIT_LARGEUR_MAX } from './preparerPortrait'

describe('préparation d’un portrait', () => {
  it('réduit sans changer les proportions', () => {
    // Un portrait vertical courant : la hauteur commande.
    expect(dimensionsPortrait({ largeur: 1200, hauteur: 1600 })).toEqual({ largeur: 563, hauteur: 750 })
    // Un cliché horizontal : la largeur commande, et rien n’est rogné.
    expect(dimensionsPortrait({ largeur: 2000, hauteur: 1000 })).toEqual({ largeur: 600, hauteur: 300 })
  })

  it('n’agrandit jamais une image déjà petite', () => {
    expect(dimensionsPortrait({ largeur: 200, hauteur: 260 })).toEqual({ largeur: 200, hauteur: 260 })
  })

  it('tient dans la boîte quelles que soient les proportions', () => {
    for (const source of [
      { largeur: 4000, hauteur: 3000 }, { largeur: 900, hauteur: 4000 },
      { largeur: 1000, hauteur: 1000 }, { largeur: 601, hauteur: 751 },
    ]) {
      const r = dimensionsPortrait(source)
      expect(r.largeur).toBeLessThanOrEqual(PORTRAIT_LARGEUR_MAX)
      expect(r.hauteur).toBeLessThanOrEqual(PORTRAIT_HAUTEUR_MAX)
      // Proportions conservées à un pixel d’arrondi près.
      expect(Math.abs(r.largeur / r.hauteur - source.largeur / source.hauteur)).toBeLessThan(0.01)
    }
  })

  it('ne rogne pas : le rapport de la carte n’est jamais imposé', () => {
    const r = dimensionsPortrait({ largeur: 1000, hauteur: 1000 })
    expect(r.largeur).toBe(r.hauteur)
  })

  it('donne au bandeau des traductions la largeur qu’il réclame', () => {
    // Un cliché horizontal courant, pour un bandeau pleine largeur : c’est la largeur
    // qui commande, et la boîte des auteurs le rendrait deux fois trop petit.
    const source = { largeur: 3000, hauteur: 2000 }
    expect(dimensionsPortrait(source, BOITE_TRADUCTION)).toEqual({ largeur: 1600, hauteur: 1067 })
    expect(dimensionsPortrait(source).largeur).toBe(600)
  })

  it('donne au fichier l’extension du format produit', () => {
    expect(nomJpeg('Augustin.png')).toBe('Augustin.jpg')
    expect(nomJpeg('portrait.jpeg')).toBe('portrait.jpg')
    expect(nomJpeg('sans-extension')).toBe('sans-extension.jpg')
  })
})
