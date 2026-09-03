import { describe, expect, it } from 'vitest'
import registre from '@/work/fillion/semantic_display_hierarchy.json'
import { NATURE_VALIDES } from './naturesSegments'
import { JETONS_INFO, JETONS_TITRE } from './bibleHierarchieSemantique'
import {
  LIBELLE_NATURE, LIBELLE_RANG, NOTICE_NATURE, STYLES_BIBLE, STYLES_BIBLE_ATTRIBUABLES,
  libelleStyleBible, rangFixeDuStyleBible, styleBibleEstInfo, styleBibleEstTitre,
} from './stylesLibelles'

describe('un nom propre pour chaque style, et rien de plus', () => {
  it('nomme chaque nature du vocabulaire, et aucune autre', () => {
    expect(Object.keys(LIBELLE_NATURE).sort()).toEqual([...NATURE_VALIDES].sort())
    expect(Object.keys(NOTICE_NATURE).sort()).toEqual([...NATURE_VALIDES].sort())
    for (const nature of NATURE_VALIDES) {
      expect(LIBELLE_NATURE[nature].trim().length).toBeGreaterThan(0)
      expect(NOTICE_NATURE[nature].trim().length).toBeGreaterThan(0)
    }
  })

  it('nomme chaque style canonique du registre biblique, et aucun autre', () => {
    expect(Object.keys(STYLES_BIBLE).sort()).toEqual(Object.keys(registre.styles).sort())
    for (const [code, s] of Object.entries(STYLES_BIBLE)) {
      expect(s.libelle.trim().length, code).toBeGreaterThan(0)
      expect(s.notice.trim().length, code).toBeGreaterThan(0)
      // Un nom propre n'est pas le code : il n'a pas de souligné.
      expect(s.libelle).not.toMatch(/_/)
    }
  })

  it('nomme chaque rang des deux échelles', () => {
    for (const jeton of [...JETONS_TITRE, ...JETONS_INFO]) expect(LIBELLE_RANG[jeton], jeton).toBeTruthy()
  })

  it('n’offre à un bloc du corps que ce qu’il peut recevoir : jamais la note', () => {
    expect(STYLES_BIBLE_ATTRIBUABLES).not.toContain('note_verset')
    expect(STYLES_BIBLE_ATTRIBUABLES).toContain('commentaire')
    expect(STYLES_BIBLE_ATTRIBUABLES).toContain('titre_pericope')
  })

  it('distingue un titre, dont le rang est fixe, d’une nature, dont le rang se déclare', () => {
    expect(styleBibleEstTitre('titre_pericope')).toBe(true)
    expect(rangFixeDuStyleBible('titre_pericope')).toBe('T6')
    expect(styleBibleEstInfo('commentaire')).toBe(true)
    expect(rangFixeDuStyleBible('commentaire')).toBeNull()
    expect(libelleStyleBible('titre_pericope')).toBe('Titre de péricope (T6)')
    expect(libelleStyleBible('commentaire', 'I5')).toBe('Commentaire · péricope (I5)')
    expect(libelleStyleBible('commentaire', null)).toBe('Commentaire')
  })
})
