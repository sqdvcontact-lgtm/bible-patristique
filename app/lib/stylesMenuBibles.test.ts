import { describe, expect, it } from 'vitest'

import { rangDeCirculation, styleLigneMenu } from './stylesMenuBibles'

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
