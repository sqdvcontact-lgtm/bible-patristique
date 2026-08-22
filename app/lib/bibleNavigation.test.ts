import { describe, expect, it } from 'vitest'
import { urlLectureBible } from './bibleNavigation'

describe('adresse de lecture de la page Bible', () => {
  it('compose l’adresse ordinaire d’un chapitre', () => {
    expect(urlLectureBible({ livre: 'MRK', chapitre: 1, trad: 'TR0001' }))
      .toBe('/?livre=MRK&chapitre=1&trad=TR0001')
  })

  it('emporte la manière de lire d’un chapitre à l’autre', () => {
    expect(urlLectureBible({ livre: 'MRK', chapitre: 2, trad: 'TR0010', bilingue: true }))
      .toBe('/?livre=MRK&chapitre=2&trad=TR0010&bilingue=1')
    expect(urlLectureBible({ livre: 'GEN', chapitre: 1, trad: 'TR0009', mode: 'verse', couche: 'modernized' }))
      .toBe('/?livre=GEN&chapitre=1&trad=TR0009&mode=verse&couche=modernized')
  })

  it('emporte le texte nu, seul ou en regard', () => {
    // L'appareil éditorial est un axe indépendant de ce qu'on lit : « sans les
    // commentaires » vaut pour une colonne comme pour deux.
    expect(urlLectureBible({ livre: 'MRK', chapitre: 1, trad: 'TR0010', texteSeul: true }))
      .toBe('/?livre=MRK&chapitre=1&trad=TR0010&texte=seul')
    expect(urlLectureBible({ livre: 'MRK', chapitre: 1, trad: 'TR0010', texteSeul: true, bilingue: true }))
      .toBe('/?livre=MRK&chapitre=1&trad=TR0010&bilingue=1&texte=seul')
  })

  it('n’emporte pas la lecture en regard quand on vise un verset', () => {
    // Viser un verset suppose de pouvoir le désigner, ce que les deux colonnes
    // ne font pas : la cible ponctuelle l'emporte sur la manière de lire.
    expect(urlLectureBible({ livre: 'MRK', chapitre: 1, trad: 'TR0010', verset: 5, bilingue: true }))
      .toBe('/?livre=MRK&chapitre=1&trad=TR0010&verset=5')
  })

  it('omet ce qui n’est pas demandé plutôt que d’écrire du vide', () => {
    const url = urlLectureBible({ livre: 'PSA', chapitre: 23, trad: 'TR0002' })
    expect(url).not.toContain('mode=')
    expect(url).not.toContain('couche=')
    expect(url).not.toContain('bilingue=')
    expect(url).not.toContain('verset=')
  })

  it('échappe ce qui doit l’être', () => {
    expect(urlLectureBible({ livre: '1SA', chapitre: 3, trad: 'TR0001', mode: 'native' }))
      .toBe('/?livre=1SA&chapitre=3&trad=TR0001&mode=native')
  })
})
