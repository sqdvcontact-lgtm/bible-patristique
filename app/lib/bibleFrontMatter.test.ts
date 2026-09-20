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
    ]

    expect(blocsSansAncreDemandes(rows, {
      includeBookFrontMatter: true,
      includeBookBackMatter: false,
    }).map((row) => row.id)).toEqual(['root', 'title', 'body'])
  })

  it('ADOPTE l’orphelin qui suit une racine retenue, et ses descendants', () => {
    // ⚠️ Cette attente est l'INVERSE de celle du 2026-09-08, qui écartait
    // `unrelated` au nom de la fermeture. Elle avait raison sur la structure et
    // tort sur le résultat : le bloc sans parent n'était retenu NULLE PART, et
    // il disparaissait du site en silence — 1 205 blocs dans 35 livres, dont
    // les 326 du second livre des Machabées (décision de l'auteur, 2026-09-20 :
    // les afficher, et les signaler).
    const rows = [
      bloc('root', 'src-a', 'intro', null, 'book'),
      bloc('orphelin', 'src-a', 'other-section', null, 'section'),
      bloc('fils-orphelin', 'src-a', 'other-body', 'other-section', 'section'),
    ]

    expect(blocsSansAncreDemandes(rows, {
      includeBookFrontMatter: true,
      includeBookBackMatter: false,
    }).map((row) => row.id)).toEqual(['root', 'orphelin', 'fils-orphelin'])
  })

  it('n’adopte pas un orphelin avant qu’une racine de sa source soit retenue', () => {
    const rows = [
      bloc('avant', 'src-a', 'egare', null, 'section'),
      bloc('root', 'src-a', 'intro', null, 'book'),
      bloc('apres', 'src-a', 'autre', null, 'section'),
    ]

    expect(blocsSansAncreDemandes(rows, {
      includeBookFrontMatter: true,
      includeBookBackMatter: false,
    }).map((row) => row.id)).toEqual(['root', 'apres'])
  })

  it('n’adopte rien quand aucune matière de livre n’est demandée', () => {
    const rows = [
      bloc('root', 'src-a', 'intro', null, 'book'),
      bloc('orphelin', 'src-a', 'autre', null, 'section'),
    ]

    expect(blocsSansAncreDemandes(rows, {
      includeBookFrontMatter: false,
      includeBookBackMatter: false,
    })).toEqual([])
  })

  it('adopte un orphelin de placement « after » avec la matière de tête', () => {
    // 675 des 1 205 orphelins portent `after` : bornée à leur place, l'adoption
    // les laisserait invisibles, la page Bible ne demandant jamais la matière de
    // queue. Leur place continue de se lire dans `data-placement`.
    const rows = [
      bloc('root', 'src-a', 'intro', null, 'book', 'before'),
      bloc('orphelin', 'src-a', 'queue', null, 'section', 'after'),
    ]

    expect(blocsSansAncreDemandes(rows, {
      includeBookFrontMatter: true,
      includeBookBackMatter: false,
    }).map((row) => row.id)).toEqual(['root', 'orphelin'])
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
