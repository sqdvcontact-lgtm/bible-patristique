import { describe, expect, it } from 'vitest'

import {
  baliserBlocsDuChapitre,
  blocInsereDansChapitre,
  type BlocAxeChapitre,
} from './bibleAxeChapitre'

const bornes = { premier: 2501, dernier: 2534 }

function titre(
  id: string,
  style: string,
  debut: number,
  fin: number,
  parent: string | null = null,
): BlocAxeChapitre {
  return {
    id,
    blockKey: id,
    semanticStyle: style,
    intitule: id,
    semanticParentKey: parent,
    placement: 'before',
    canonOrderStart: debut,
    canonOrderEnd: fin,
  }
}

describe('axe réel du chapitre biblique', () => {
  it('écarte un parent chargé par recouvrement mais inséré dans un chapitre antérieur', () => {
    expect(blocInsereDansChapitre({
      placement: 'before', canonOrderStart: 1100, canonOrderEnd: 5000,
    }, bornes)).toBe(false)
    expect(blocInsereDansChapitre({
      placement: 'before', canonOrderStart: 2519, canonOrderEnd: 3500,
    }, bornes)).toBe(true)
  })

  it('place une conclusion selon la fin de sa plage', () => {
    expect(blocInsereDansChapitre({
      placement: 'after', canonOrderStart: 2000, canonOrderEnd: 2520,
    }, bornes)).toBe(true)
  })

  it('garde les liminaires sans ancre quand le chargeur les a retenus', () => {
    expect(blocInsereDansChapitre({
      placement: 'before', canonOrderStart: null, canonOrderEnd: null,
    }, bornes)).toBe(true)
  })

  it('rebâtit Gn 25 depuis les titres visibles, pas depuis quatre ancêtres hors écran', () => {
    const blocs = [
      titre('partie', 'titre_partie_livre', 1127, 5026),
      titre('livre-vi', 'titre_section_livre', 1127, 2518, 'partie'),
      titre('section-v', 'titre_sous_section', 2201, 2511, 'livre-vi'),
      titre('iv', 'titre_paragraphe_livre', 2501, 2511, 'section-v'),
      titre('abraham-cetura', 'titre_pericope', 2501, 2506, 'iv'),
      titre('livre-vii', 'titre_section_livre', 2512, 2518, 'partie'),
      titre('livre-viii', 'titre_section_livre', 2519, 3529, 'partie'),
      titre('section-i', 'titre_sous_section', 2519, 2809, 'livre-viii'),
      titre('i', 'titre_paragraphe_livre', 2519, 2534, 'section-i'),
      titre('naissance', 'titre_pericope', 2519, 2526, 'i'),
    ]
    const h = baliserBlocsDuChapitre(blocs, bornes)
    expect(h.get('partie')).toBeUndefined()
    expect(h.get('livre-vi')).toBeUndefined()
    expect(h.get('section-v')).toBeUndefined()
    expect(h.get('iv')).toBe(1)
    expect(h.get('abraham-cetura')).toBe(2)
    expect(h.get('livre-vii')).toBe(1)
    expect(h.get('livre-viii')).toBe(1)
    expect(h.get('section-i')).toBe(2)
    expect(h.get('i')).toBe(3)
    expect(h.get('naissance')).toBe(4)
  })

  it('rebâtit Gn 49 : une péricope visible n’hérite pas de quatre titres absents du DOM', () => {
    const blocs = [
      titre('partie', 'titre_partie_livre', 1127, 5026),
      titre('livre-x', 'titre_section_livre', 3701, 5026, 'partie'),
      titre('section-iii', 'titre_sous_section', 4601, 5026, 'livre-x'),
      titre('iii', 'titre_paragraphe_livre', 4729, 5013, 'section-iii'),
      titre('benediction', 'titre_pericope', 4901, 4928, 'iii'),
      titre('mort-jacob', 'titre_pericope', 4929, 4933, 'iii'),
    ]
    const h = baliserBlocsDuChapitre(blocs, { premier: 4901, dernier: 4933 })
    expect(h.get('benediction')).toBe(1)
    expect(h.get('mort-jacob')).toBe(1)
  })
})
