import { describe, expect, it } from 'vitest'

import {
  blocsSansAncreDemandes,
  type BlocSansAncrePourRendu,
} from './bibleFrontMatter'

function bloc(
  id: string,
  sourceId: string,
  blockKey: string,
  parent: string | null,
  scopeKind: BlocSansAncrePourRendu['scope_kind'],
  placement: BlocSansAncrePourRendu['placement'] = 'before',
  canonOrderStart: number | null = null,
): BlocSansAncrePourRendu {
  return {
    id,
    source_id: sourceId,
    block_key: blockKey,
    semantic_parent_key: parent,
    scope_kind: scopeKind,
    placement,
    canon_order_start: canonOrderStart,
  }
}

describe('blocsSansAncreDemandes', () => {
  it('ferme transitivement le front-matter du livre sans élargir les portées', () => {
    const rows = [
      bloc('root', 'src-a', 'intro', null, 'book'),
      bloc('title', 'src-a', 'section-title', 'intro', 'section'),
      bloc('body', 'src-a', 'section-body', 'section-title', 'section'),
      bloc('unrelated', 'src-a', 'other-section', null, 'section'),
    ]

    expect(blocsSansAncreDemandes(rows, {
      includeBookFrontMatter: true,
      includeBookBackMatter: false,
    }).map((row) => row.id)).toEqual(['root', 'title', 'body'])
  })

  it('ne traverse jamais une source homonyme', () => {
    const rows = [
      bloc('root', 'src-a', 'intro', null, 'book'),
      bloc('foreign-child', 'src-b', 'foreign', 'intro', 'section'),
    ]

    expect(blocsSansAncreDemandes(rows, {
      includeBookFrontMatter: true,
      includeBookBackMatter: false,
    }).map((row) => row.id)).toEqual(['root'])
  })

  it('n’absorbe pas un descendant qui possède déjà une ancre canonique', () => {
    const rows = [
      bloc('root', 'src-a', 'intro', null, 'book'),
      bloc('anchored', 'src-a', 'anchored-child', 'intro', 'section', 'before', 42),
    ]

    expect(blocsSansAncreDemandes(rows, {
      includeBookFrontMatter: true,
      includeBookBackMatter: false,
    }).map((row) => row.id)).toEqual(['root'])
  })

  it('respecte séparément le front-matter et le back-matter', () => {
    const rows = [
      bloc('front', 'src-a', 'front', null, 'book', 'before'),
      bloc('front-child', 'src-a', 'front-child', 'front', 'section', 'before'),
      bloc('back', 'src-a', 'back', null, 'book', 'after'),
      bloc('back-child', 'src-a', 'back-child', 'back', 'section', 'after'),
    ]

    expect(blocsSansAncreDemandes(rows, {
      includeBookFrontMatter: false,
      includeBookBackMatter: true,
    }).map((row) => row.id)).toEqual(['back', 'back-child'])
  })
})
