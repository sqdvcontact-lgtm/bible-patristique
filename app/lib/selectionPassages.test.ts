import { describe, expect, it } from 'vitest'
import {
  compter, libelleResultat, libelleSelection, referenceDesVersets, texteDesSuites, texteDesVersets,
} from './selectionPassages'
import { MARQUE_ELISION } from './regrouperCitations'

describe('referenceDesVersets', () => {
  it('écrit un verset seul', () => {
    expect(referenceDesVersets([16])).toBe('16')
  })

  it('écrit une plage d’un trait simple, deux voisins compris', () => {
    expect(referenceDesVersets([3, 4, 5])).toBe('3-5')
    expect(referenceDesVersets([3, 4])).toBe('3-4')
  })

  it('sépare d’un point ce qui ne se suit pas', () => {
    expect(referenceDesVersets([3, 4, 5, 7, 9, 10])).toBe('3-5.7.9-10')
  })

  it('range et dédoublonne ce qu’il reçoit', () => {
    expect(referenceDesVersets([7, 3, 4, 4])).toBe('3-4.7')
  })

  it('ne rend rien pour une liste vide', () => {
    expect(referenceDesVersets([])).toBe('')
  })
})

describe('texteDesVersets', () => {
  it('joint deux versets qui se suivent d’une espace', () => {
    expect(texteDesVersets([
      { numero: 2, texte: 'Et la terre était informe.' },
      { numero: 1, texte: 'Au commencement Dieu créa le ciel et la terre.' },
    ])).toBe('Au commencement Dieu créa le ciel et la terre. Et la terre était informe.')
  })

  it('dit l’élision là où un verset manque', () => {
    expect(texteDesVersets([
      { numero: 1, texte: 'Premier.' },
      { numero: 3, texte: 'Troisième.' },
    ])).toBe(`Premier. ${MARQUE_ELISION} Troisième.`)
  })

  it('passe un verset vide sans ouvrir d’élision de trop', () => {
    expect(texteDesVersets([
      { numero: 1, texte: 'Premier.' },
      { numero: 2, texte: '  ' },
      { numero: 3, texte: 'Troisième.' },
    ])).toBe(`Premier. ${MARQUE_ELISION} Troisième.`)
  })
})

describe('texteDesSuites', () => {
  it('recompose chaque suite par ses liants, et sépare les suites d’une élision', () => {
    expect(texteDesSuites([
      [{ texte: 'Il dit' }, { texte: 'ceci.', joinBefore: ' ' }],
      [{ texte: 'Plus loin.' }],
    ])).toBe(`Il dit ceci. ${MARQUE_ELISION} Plus loin.`)
  })

  it('soude un mot coupé que la donnée recolle', () => {
    expect(texteDesSuites([[{ texte: 'mis' }, { texte: 'éricorde', joinBefore: '' }]])).toBe('miséricorde')
  })
})

describe('les mots de la barre', () => {
  const versets = ['verset', 'versets'] as const

  it('accorde le nom et le participe', () => {
    expect(compter(1, versets)).toBe('1 verset')
    expect(libelleSelection(1, versets)).toBe('1 verset sélectionné')
    expect(libelleSelection(7, versets)).toBe('7 versets sélectionnés')
    expect(libelleResultat(3, ['passage', 'passages'], 'enregistre')).toBe('3 passages enregistrés')
    expect(libelleResultat(1, ['passage', 'passages'], 'retire')).toBe('1 passage retiré')
  })
})
