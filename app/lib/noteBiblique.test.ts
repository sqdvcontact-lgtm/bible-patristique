import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  blocDeNoteBibliqueDiscret, intituleNoteBiblique, libelleSousTypeNoteVerset, roleDuBlocDeNote,
  SEPARATEUR_TETE_NOTE_BIBLIQUE, SOUS_TYPES_NOTE_VERSET,
} from './noteBiblique'
import { NATURES_BLOC_NOTE } from './naturesNote'

describe('la discipline d’une note de verset', () => {
  it('se dit en français pour chaque sous-type qu’elle nomme', () => {
    expect(libelleSousTypeNoteVerset('textual')).toBe('Critique textuelle')
    expect(libelleSousTypeNoteVerset('philological')).toBe('Philologie')
    expect(libelleSousTypeNoteVerset('translation')).toBe('Traduction')
    expect(libelleSousTypeNoteVerset('exegetical')).toBe('Exégèse')
    expect(libelleSousTypeNoteVerset('historical')).toBe('Histoire')
    expect(libelleSousTypeNoteVerset('reference')).toBe('Renvois')
  })

  it('se tait sur « other », sur une valeur inconnue et sur l’absence', () => {
    expect(libelleSousTypeNoteVerset('other')).toBeNull()
    expect(libelleSousTypeNoteVerset('textuel')).toBeNull()
    expect(libelleSousTypeNoteVerset('')).toBeNull()
    expect(libelleSousTypeNoteVerset(null)).toBeNull()
    expect(libelleSousTypeNoteVerset(undefined)).toBeNull()
  })

  it('suit le vocabulaire de la contrainte, et lui seul', () => {
    // ⛔ La liste reflète `bible_verse_notes_note_subtype_check` : un sous-type ajouté en base
    // sans libellé ici paraîtrait muet, et c'est ici qu'on s'en aperçoit.
    for (const code of SOUS_TYPES_NOTE_VERSET) {
      if (code === 'other') continue
      expect(libelleSousTypeNoteVerset(code), code).not.toBeNull()
    }
  })
})

describe('la voix d’un bloc de note', () => {
  it('prend la sienne d’abord', () => {
    expect(roleDuBlocDeNote('corpus_editorial_note', 'source_editorial_note')).toBe('corpus_editorial_note')
  })

  it('reçoit celle de sa note quand il se tait', () => {
    expect(roleDuBlocDeNote(null, 'source_editorial_note')).toBe('source_editorial_note')
    expect(roleDuBlocDeNote(undefined, 'source_editorial_note')).toBe('source_editorial_note')
    expect(roleDuBlocDeNote('  ', 'source_editorial_note')).toBe('source_editorial_note')
  })

  it('reste sans voix quand ni lui ni sa note n’en déclarent', () => {
    expect(roleDuBlocDeNote(null, null)).toBeNull()
    expect(roleDuBlocDeNote(undefined, '')).toBeNull()
  })
})

describe('la tête d’une note biblique', () => {
  const edition = { editorialRole: 'source_editorial_note' }
  const muet = { editorialRole: null }

  it('dit qui parle, puis la discipline', () => {
    expect(intituleNoteBiblique({ blocks: [edition], sousType: 'textual' }))
      .toBe(`Note de l'édition${SEPARATEUR_TETE_NOTE_BIBLIQUE}Critique textuelle`)
  })

  it('garde le point médian sur la ligne de la voix', () => {
    expect(SEPARATEUR_TETE_NOTE_BIBLIQUE.codePointAt(0)).toBe(0x00A0)
    expect(SEPARATEUR_TETE_NOTE_BIBLIQUE.codePointAt(1)).toBe(0x00B7)
    expect(SEPARATEUR_TETE_NOTE_BIBLIQUE.codePointAt(2)).toBe(0x0020)
  })

  it('dit la voix seule quand la note n’a pas de discipline (note d’un bloc éditorial)', () => {
    expect(intituleNoteBiblique({ blocks: [edition, edition] })).toBe("Note de l'édition")
    expect(intituleNoteBiblique({ blocks: [edition], sousType: 'other' })).toBe("Note de l'édition")
  })

  it('dit la discipline seule quand personne n’est nommé (le cas des notes de verset aujourd’hui)', () => {
    expect(intituleNoteBiblique({ blocks: [muet], sousType: 'philological' })).toBe('Philologie')
  })

  it('se tait quand rien n’est établi', () => {
    expect(intituleNoteBiblique({ blocks: [muet] })).toBeNull()
    expect(intituleNoteBiblique({ blocks: [muet], sousType: 'other' })).toBeNull()
    expect(intituleNoteBiblique({ blocks: [] })).toBeNull()
  })

  it('laisse le doute l’emporter sur la voix, jamais sur la discipline', () => {
    // Un bloc sans voix établie : la note n'en annonce aucune (§ 13.12.1).
    expect(intituleNoteBiblique({ blocks: [edition, muet], sousType: 'translation' })).toBe('Traduction')
  })

  it('nomme toutes les voix d’une note enrichie, dans l’ordre du vocabulaire', () => {
    expect(intituleNoteBiblique({
      blocks: [{ editorialRole: 'corpus_editorial_note' }, edition],
      sousType: 'exegetical',
    })).toBe(`Note de l'édition et de Corpus Scriptura${SEPARATEUR_TETE_NOTE_BIBLIQUE}Exégèse`)
  })
})

describe('ce qui se lit en discret', () => {
  it('compose en discret le renvoi, le renvoi interne, l’attribution et la coordonnée', () => {
    expect(blocDeNoteBibliqueDiscret('reference')).toBe(true)
    expect(blocDeNoteBibliqueDiscret('internal_cross_reference')).toBe(true)
    expect(blocDeNoteBibliqueDiscret('attribution')).toBe(true)
    expect(blocDeNoteBibliqueDiscret('source_locator')).toBe(true)
  })

  it('laisse au propos la citation visée, le commentaire, la citation et la traduction', () => {
    expect(blocDeNoteBibliqueDiscret('lemma')).toBe(false)
    expect(blocDeNoteBibliqueDiscret('commentary')).toBe(false)
    expect(blocDeNoteBibliqueDiscret('quotation')).toBe(false)
    expect(blocDeNoteBibliqueDiscret('translation')).toBe(false)
  })

  it('ne rend jamais discrète une nature inconnue', () => {
    expect(blocDeNoteBibliqueDiscret('heading')).toBe(false)
    expect(blocDeNoteBibliqueDiscret(null)).toBe(false)
  })

  it('décide sur tout le vocabulaire des natures, sans en oublier une', () => {
    const discretes = NATURES_BLOC_NOTE.filter((nature) => blocDeNoteBibliqueDiscret(nature))
    expect(discretes).toEqual(['source_locator', 'attribution', 'reference', 'internal_cross_reference'])
  })
})

// ⛔ La page compose ce que la fenêtre lit : la voix que la note déclare, et sa discipline.
// Sans ces deux reports, la règle d'ici ne servirait à rien, et rien ne le dirait.
describe('ce que la page transmet à la fenêtre', () => {
  const PAGE = readFileSync('app/page.tsx', 'utf8')
  const FENETRE = readFileSync('app/components/NoteBibliqueFenetre.tsx', 'utf8')

  it('fait hériter chaque bloc de la voix de sa note, dans les deux lectures', () => {
    expect(PAGE).toContain('roleDuBlocDeNote(bloc.editorial_role, roleDeLaNote)')
    expect(PAGE.match(/note\.blocks\.map\(blocDeNote\(note\.editorial_role\)\)/g)?.length).toBe(4)
  })

  it('porte la discipline d’une note de verset, dans les deux lectures', () => {
    expect(PAGE.match(/sousType: note\.note_subtype/g)?.length).toBe(2)
  })

  it('compose la tête et la discrétion par ce module, sans liste écrite à la main', () => {
    expect(FENETRE).toContain('intituleNoteBiblique(note)')
    expect(FENETRE).toContain('blocDeNoteBibliqueDiscret(bloc.kind)')
    expect(FENETRE).not.toMatch(/kind === 'reference' \|\| bloc\.kind === 'attribution'/)
  })
})
