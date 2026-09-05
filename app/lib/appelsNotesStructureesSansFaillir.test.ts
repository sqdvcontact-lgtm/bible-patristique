import { describe, expect, it } from 'vitest'
import {
  projeterAppelsNotesStructurees,
  projeterAppelsNotesStructureesSansFaillir,
  refusDAncre,
  type AncreNoteStructureeProjection,
} from './appelsNotesStructurees'

const ancre = (noteKey: string, offset: number, marker = `[[${noteKey}]]`): AncreNoteStructureeProjection =>
  ({ noteKey, marker, segmentOffsetUnicode: offset, sourceTarget: 'segment_texte' })

describe('projeterAppelsNotesStructureesSansFaillir', () => {
  it('pose les ancres saines et laisse de côté celle qui déborde, en la signalant', () => {
    const refus: string[] = []
    const texte = projeterAppelsNotesStructureesSansFaillir(
      'abc',
      [ancre('1', 1), ancre('2', 9)],
      (a, r) => { refus.push(`${a.noteKey} → ${r}`) },
    )
    expect(texte).toBe('a[[1]]bc')
    expect(refus).toEqual(['2 → Offset Unicode hors limites pour 2 : 9/3'])
  })

  it('signale un marqueur mal formé et rend le texte tel quel', () => {
    const refus: string[] = []
    expect(projeterAppelsNotesStructureesSansFaillir('abc', [ancre('x', 0, 'x')], (_a, r) => { refus.push(r) })).toBe('abc')
    expect(refus).toEqual(['Marqueur de note invalide pour x : x'])
  })

  it('rend le même texte que la projection stricte quand toutes les ancres sont saines', () => {
    const ancres = [ancre('12', 0), ancre('3', 2), ancre('4', 2)]
    const signaler = () => { throw new Error('ne doit pas être appelé') }
    expect(projeterAppelsNotesStructureesSansFaillir('ab', ancres, signaler))
      .toBe(projeterAppelsNotesStructurees('ab', ancres))
  })

  it('ne touche pas au comportement de la projection stricte, qui lève toujours', () => {
    expect(() => projeterAppelsNotesStructurees('abc', [ancre('2', 9)]))
      .toThrow('Offset Unicode hors limites pour 2 : 9/3')
    expect(() => projeterAppelsNotesStructurees('abc', [ancre('x', 0, 'x')]))
      .toThrow('Marqueur de note invalide pour x : x')
  })

  it('ignore une ancre qui ne vise pas le texte du segment, sans la signaler', () => {
    const refus: string[] = []
    const hors = { ...ancre('9', 99), sourceTarget: 'note_key' }
    expect(projeterAppelsNotesStructureesSansFaillir('abc', [hors], (_a, r) => { refus.push(r) })).toBe('abc')
    expect(refus).toEqual([])
  })
})

describe('refusDAncre', () => {
  it('admet une ancre posée à la frontière de fin, et refuse au-delà, en deçà, et un offset non entier', () => {
    expect(refusDAncre(ancre('1', 3), 3)).toBeNull()
    expect(refusDAncre(ancre('1', 4), 3)).toMatch(/hors limites/u)
    expect(refusDAncre(ancre('1', -1), 3)).toMatch(/hors limites/u)
    expect(refusDAncre(ancre('1', 1.5), 3)).toMatch(/hors limites/u)
  })
})
