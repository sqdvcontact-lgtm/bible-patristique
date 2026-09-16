import { describe, expect, it } from 'vitest'

import {
  ECART_SOUS_MENU_PX, MARGE_SOUS_MENU_PX, placerSousMenu, rangDeCirculation, styleLigneMenu,
} from './stylesMenuBibles'

describe('rangDeCirculation', () => {
  it('descend et monte sans sortir de la liste', () => {
    expect(rangDeCirculation('ArrowDown', 0, 3)).toBe(1)
    expect(rangDeCirculation('ArrowDown', 2, 3)).toBe(2)
    expect(rangDeCirculation('ArrowUp', 0, 3)).toBe(0)
    expect(rangDeCirculation('ArrowUp', 2, 3)).toBe(1)
  })

  it('va au début et à la fin', () => {
    expect(rangDeCirculation('Home', 2, 5)).toBe(0)
    expect(rangDeCirculation('End', 0, 5)).toBe(4)
  })

  it('ne fait rien sur une touche qui ne fait pas circuler', () => {
    expect(rangDeCirculation('Enter', 1, 3)).toBeNull()
    expect(rangDeCirculation('ArrowRight', 1, 3)).toBeNull()
  })
})

describe('styleLigneMenu', () => {
  it('arrondit la première et la dernière ligne, et elles seules', () => {
    expect(styleLigneMenu(false, true, false).borderRadius).toBe('7px 7px 0px 0px')
    expect(styleLigneMenu(false, false, true).borderRadius).toBe('0px 0px 7px 7px')
    expect(styleLigneMenu(false, false, false).borderBottom).toBe('1px solid var(--cs-fond-doux)')
    expect(styleLigneMenu(false, false, true).borderBottom).toBe('none')
  })

  it('désigne la ligne retenue par l’accent et la graisse', () => {
    const retenue = styleLigneMenu(true, false, false)
    expect(retenue.color).toBe('var(--cs-vert)')
    expect(retenue.fontWeight).toBe(600)
    expect(styleLigneMenu(false, false, false).fontWeight).toBe(400)
  })
})

describe('placerSousMenu', () => {
  // Un écran de 2 560 px, racine 22 : le sous-menu fait au moins 11,25 rem, soit 247,5 px.
  const vue = { largeur: 2545, hauteur: 1300 }
  const largeur = 247.5
  const hauteur = 90

  // La ligne d'une famille dans le volet de droite d'une œuvre, collé au bord de l'écran.
  const ligneDuVolet = { top: 200, left: 2078, right: 2520 }

  it('ouvre le volet vers le texte, accroché par son bord droit au jour près', () => {
    const place = placerSousMenu({ ligne: ligneDuVolet, cote: 'gauche', largeur, hauteur, vue })
    expect(place).toEqual({ top: 199, right: vue.largeur - ligneDuVolet.left + ECART_SOUS_MENU_PX })
    // Le bord droit d'une boîte fixe se compte depuis le bord droit de la vue.
    expect(vue.largeur - (place.right ?? 0)).toBe(ligneDuVolet.left - ECART_SOUS_MENU_PX)
  })

  it('ouvre la page Bible à droite quand elle y tient', () => {
    const ligne = { top: 300, left: 1100, right: 1400 }
    expect(placerSousMenu({ ligne, cote: 'droite', largeur, hauteur, vue }))
      .toEqual({ top: 299, left: 1400 + ECART_SOUS_MENU_PX })
  })

  it('passe de l’autre côté quand le côté déclaré manque de place', () => {
    expect(placerSousMenu({ ligne: ligneDuVolet, cote: 'droite', largeur, hauteur, vue }).right)
      .toBe(vue.largeur - ligneDuVolet.left + ECART_SOUS_MENU_PX)
    const ligneAGauche = { top: 200, left: 20, right: 300 }
    expect(placerSousMenu({ ligne: ligneAGauche, cote: 'gauche', largeur, hauteur, vue }).left)
      .toBe(300 + ECART_SOUS_MENU_PX)
  })

  // ⚠️ Sur un téléphone, la liste prend toute la largeur : aucun côté ne suffit.
  it('se pose contre le bord de l’écran quand aucun côté ne suffit', () => {
    const telephone = { largeur: 390, hauteur: 800 }
    const ligne = { top: 500, left: 13, right: 377 }
    expect(placerSousMenu({ ligne, cote: 'gauche', largeur: 180, hauteur, vue: telephone }))
      .toEqual({ top: 499, left: MARGE_SOUS_MENU_PX })
    expect(placerSousMenu({ ligne, cote: 'droite', largeur: 180, hauteur, vue: telephone }))
      .toEqual({ top: 499, right: MARGE_SOUS_MENU_PX })
  })

  it('remonte le sous-menu qu’une ligne basse ferait sortir par le bas', () => {
    const ligne = { top: 1260, left: 2078, right: 2520 }
    expect(placerSousMenu({ ligne, cote: 'gauche', largeur, hauteur, vue }).top)
      .toBe(vue.hauteur - MARGE_SOUS_MENU_PX - hauteur)
  })
})
