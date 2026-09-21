import { describe, expect, it } from 'vitest'
import { notesEnRegardUtiles } from './notesEnRegard'
import type { NoteStructuree } from './oeuvreTypes'

const note = (noteKey: string): NoteStructuree => ({ noteKey, noteNumber: 1, blocks: [] })
const ancre = (cle: string) => ({ marker: '1', noteKey: cle, sourceTarget: 'segment_texte', segmentOffsetUnicode: 0 }) as never

describe('notesEnRegardUtiles', () => {
  const notes = {
    'L1:1': { '1': note('N1'), '2': note('N2') },
    'L1:2': { '3': note('N3') },
    'L9:1': { '9': note('N9') },
  }
  const ancres = { 'L1:1': [ancre('N1'), ancre('N2')], 'L1:2': [ancre('N3')], 'L9:1': [ancre('N9')] }

  it('ne garde que les segments dont une note paraît, toutes leurs notes et ancres comprises', () => {
    const r = notesEnRegardUtiles(notes, ancres, [{ '1': note('N1') }, undefined, { '3': note('N3') }])
    expect(Object.keys(r.notes).sort()).toEqual(['L1:1', 'L1:2'])
    expect(Object.keys(r.notes['L1:1'])).toEqual(['1', '2'])
    expect(Object.keys(r.ancres).sort()).toEqual(['L1:1', 'L1:2'])
    expect(r.partielles).toBe(true)
  })

  it('dit « complètes » quand rien n’a été laissé', () => {
    const r = notesEnRegardUtiles(notes, ancres, [{ a: note('N1'), b: note('N3'), c: note('N9') }])
    expect(r.partielles).toBe(false)
    expect(r.notes).toEqual(notes)
  })

  it('ignore une note héritée, qui n’a pas d’identité', () => {
    const r = notesEnRegardUtiles(notes, ancres, [{ '1': 'Une note ancienne.' }])
    expect(r.notes).toEqual({})
    expect(r.partielles).toBe(true)
  })

  it('tient pour partielle une ancre dont le segment ne garde rien', () => {
    const r = notesEnRegardUtiles({}, { 'L1:1': [ancre('N1')] }, [])
    expect(r.partielles).toBe(true)
    expect(notesEnRegardUtiles({}, {}, []).partielles).toBe(false)
  })
})
