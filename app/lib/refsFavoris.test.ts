import { describe, it, expect } from 'vitest'
import { refFavoriOriginal, estRefOriginal, idOeuvreDeRef } from './refsFavoris'

describe('références de favoris', () => {
  it('marque le texte original par un suffixe', () => {
    expect(refFavoriOriginal('A0010O0001')).toBe('A0010O0001#la')
    expect(estRefOriginal('A0010O0001#la')).toBe(true)
  })

  it('laisse une œuvre ordinaire intacte', () => {
    expect(estRefOriginal('A0010O0110')).toBe(false)
    expect(idOeuvreDeRef('A0010O0110')).toBe('A0010O0110')
  })

  it('retrouve l’œuvre porteuse du texte original', () => {
    expect(idOeuvreDeRef(refFavoriOriginal('A0064O0001'))).toBe('A0064O0001')
  })

  // Les deux favoris d'une même œuvre — sa traduction et son latin — doivent rester
  // distincts : c'est tout l'objet du suffixe.
  it('distingue la traduction de son texte original', () => {
    expect(refFavoriOriginal('A0010O0001')).not.toBe('A0010O0001')
  })
})
