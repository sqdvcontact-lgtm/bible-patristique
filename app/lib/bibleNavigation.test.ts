import { describe, expect, it } from 'vitest'
import {
  chapitreSuivantDisponible,
  dernierChapitreBible,
  normaliserChapitreBible,
  urlLectureBible,
} from './bibleNavigation'

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

  it('ne fabrique jamais Gn 51 depuis une navigation interne', () => {
    expect(urlLectureBible({ livre: 'GEN', chapitre: 51, trad: 'TR0010' }))
      .toBe('/?livre=GEN&chapitre=50&trad=TR0010')
    // Hors du périmètre certifié, l'URL n'est pas corrigée par supposition.
    expect(urlLectureBible({ livre: 'REV', chapitre: 23, trad: 'TR0001' }))
      .toBe('/?livre=REV&chapitre=23&trad=TR0001')
  })
})

describe('numéro de chapitre reçu de l’adresse', () => {
  it('garde un numéro bien formé', () => {
    expect(normaliserChapitreBible('12')).toBe(12)
    expect(normaliserChapitreBible(' 3 ')).toBe(3)
    expect(normaliserChapitreBible('150')).toBe(150)
  })

  it('rend 1 quand l’adresse ne dit rien', () => {
    expect(normaliserChapitreBible(undefined)).toBe(1)
    expect(normaliserChapitreBible(null)).toBe(1)
    expect(normaliserChapitreBible('')).toBe(1)
  })

  it('ne rend JAMAIS NaN : c’est ce qui faisait tomber la page', () => {
    // `parseInt('abc')` vaut NaN, et NaN n'est égal à rien, pas même à lui-même :
    // le recalage en phase de rendu de NavLivres reposait alors son état sans fin.
    for (const tordu of ['abc', 'un', '?', '--', 'e5', 'Infinity']) {
      expect(Number.isNaN(normaliserChapitreBible(tordu))).toBe(false)
      expect(normaliserChapitreBible(tordu)).toBe(1)
    }
  })

  it('refuse zéro et les nombres négatifs', () => {
    expect(normaliserChapitreBible('0')).toBe(1)
    expect(normaliserChapitreBible('-3')).toBe(1)
  })

  it('retient la partie entière de tête, comme le faisait parseInt', () => {
    expect(normaliserChapitreBible('12abc')).toBe(12)
    expect(normaliserChapitreBible('4.7')).toBe(4)
  })

  it('borne le maximum seulement pour le livre explicitement certifié', () => {
    expect(normaliserChapitreBible('50', 'GEN')).toBe(50)
    expect(normaliserChapitreBible('51', 'GEN')).toBe(50)
    expect(normaliserChapitreBible('999', 'PSA')).toBe(999)
  })
})

describe('borne terminale certifiée de la Genèse', () => {
  it('expose 50 sans extrapoler aux autres livres', () => {
    expect(dernierChapitreBible('GEN')).toBe(50)
    expect(dernierChapitreBible('REV')).toBeNull()
    expect(dernierChapitreBible('INCONNU')).toBeNull()
  })

  it('ferme la flèche suivante à Gn 50 seulement', () => {
    expect(chapitreSuivantDisponible('GEN', 49)).toBe(true)
    expect(chapitreSuivantDisponible('GEN', 50)).toBe(false)
    // Hors périmètre, le serveur garde la main.
    expect(chapitreSuivantDisponible('INCONNU', 1)).toBe(true)
  })
})
