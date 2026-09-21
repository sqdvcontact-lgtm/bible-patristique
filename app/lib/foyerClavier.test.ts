import { describe, expect, it } from 'vitest'
import { cibleDeTabulation, estTabulation } from './foyerClavier'

describe('cibleDeTabulation', () => {
  const suite = ['fermer', 'champ', 'envoyer']

  it('avance, et revient au premier après le dernier', () => {
    expect(cibleDeTabulation(suite, 'fermer', false)).toBe('champ')
    expect(cibleDeTabulation(suite, 'envoyer', false)).toBe('fermer')
  })

  it('recule, et revient au dernier avant le premier', () => {
    expect(cibleDeTabulation(suite, 'champ', true)).toBe('fermer')
    expect(cibleDeTabulation(suite, 'fermer', true)).toBe('envoyer')
  })

  it('un foyer hors de la suite entre par le bout que la touche désigne', () => {
    expect(cibleDeTabulation(suite, 'titre', false)).toBe('fermer')
    expect(cibleDeTabulation(suite, null, true)).toBe('envoyer')
  })

  it('une suite vide ne mène nulle part, un seul élément ramène à lui', () => {
    expect(cibleDeTabulation([], 'x', false)).toBeNull()
    expect(cibleDeTabulation(['seul'], 'seul', false)).toBe('seul')
    expect(cibleDeTabulation(['seul'], 'seul', true)).toBe('seul')
  })
})

describe('estTabulation', () => {
  const touche = (key: string, m: Partial<{ altKey: boolean; ctrlKey: boolean; metaKey: boolean }> = {}) =>
    ({ key, altKey: false, ctrlKey: false, metaKey: false, ...m })

  it('Tab seul, Maj comprise', () => {
    expect(estTabulation(touche('Tab'))).toBe(true)
  })

  it('ni une autre touche, ni Ctrl+Tab qui change d’onglet', () => {
    expect(estTabulation(touche('Enter'))).toBe(false)
    expect(estTabulation(touche('Tab', { ctrlKey: true }))).toBe(false)
    expect(estTabulation(touche('Tab', { altKey: true }))).toBe(false)
  })
})
