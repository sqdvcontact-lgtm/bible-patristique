import { describe, expect, it } from 'vitest'
import { blocsSelonOriginal, construireIndexOriginal } from './alignementOriginal'

describe('projection du texte original par alignement', () => {
  it('associe le même latin à tous les membres français d’un groupe 1:n', () => {
    const index = construireIndexOriginal(
      [{ alignment_id: 'g1', metadata: { latin_text: 'Carmina qui quondam.' } }],
      [
        { alignment_id: 'g1', segment_key: 'c1', member_order: 1 },
        { alignment_id: 'g1', segment_key: 'c2', member_order: 2 },
      ],
    )
    expect(index.c1.texte).toBe('Carmina qui quondam.')
    expect(index.c2).toMatchObject({ alignmentId: 'g1', ordreMembre: 2 })
  })

  it('regroupe selon l’alignement sans forcer du 1:1 et garde les lacunes séparées', () => {
    const source = new Map([
      [1, { segmentKey: 'c1', paragraphe: 1 }],
      [2, { segmentKey: 'c2', paragraphe: 1 }],
      [3, { segmentKey: 'c3', paragraphe: 2 }],
    ])
    const index = construireIndexOriginal(
      [{ alignment_id: 'g1', metadata: { latin_text: 'Latin.' } }],
      [
        { alignment_id: 'g1', segment_key: 'c1', member_order: 1 },
        { alignment_id: 'g1', segment_key: 'c2', member_order: 2 },
      ],
    )
    expect(blocsSelonOriginal([1, 2, 3], source, index)).toEqual([{ ids: [1, 2] }, { ids: [3] }])
  })
})
