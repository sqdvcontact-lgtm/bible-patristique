import { describe, expect, it } from 'vitest'
import {
  FAMILLES_NATURE,
  NATURES_BLOC_NOTE,
  familleDeNature,
  natureBlocNoteSur,
  natureSeNormaliseCommeReference,
} from './naturesNote'

describe('naturesNote', () => {
  it('porte les huit natures de la charte § 13.10, les deux neuves comprises', () => {
    expect(NATURES_BLOC_NOTE).toHaveLength(8)
    expect(NATURES_BLOC_NOTE).toContain('source_locator')
    expect(NATURES_BLOC_NOTE).toContain('internal_cross_reference')
  })

  it('range chaque nature dans une famille, et une seule', () => {
    for (const nature of NATURES_BLOC_NOTE) {
      expect(FAMILLES_NATURE).toContain(familleDeNature(nature))
    }
    // La coordonnée imprimée et le lemme tiennent la note à quelque chose ; ils ne
    // sont pas son propos.
    expect(familleDeNature('source_locator')).toBe('ancrage')
    expect(familleDeNature('lemma')).toBe('ancrage')
    expect(familleDeNature('commentary')).toBe('propos')
    expect(familleDeNature('translation')).toBe('temoignage')
    // Les deux renvois partagent la famille et diffèrent par la DESTINATION.
    expect(familleDeNature('reference')).toBe('renvoi')
    expect(familleDeNature('internal_cross_reference')).toBe('renvoi')
  })

  it('lit une nature venue de la base, et rend null sur l’inconnue', () => {
    expect(natureBlocNoteSur('quotation')).toBe('quotation')
    expect(natureBlocNoteSur('source_locator')).toBe('source_locator')
    expect(natureBlocNoteSur('heading')).toBeNull()
    expect(natureBlocNoteSur(null)).toBeNull()
    expect(natureBlocNoteSur(undefined)).toBeNull()
    expect(natureBlocNoteSur(12)).toBeNull()
  })

  it('ne normalise comme référence QUE le renvoi extérieur', () => {
    // C'est toute la raison d'être d'`internal_cross_reference` : « Voyez la note I,
    // p. 150 » n'a ni auteur ni titre, et son « I » est un numéro de note, que le
    // normaliseur de références convertirait en chapitre arabe.
    expect(natureSeNormaliseCommeReference('reference')).toBe(true)
    expect(natureSeNormaliseCommeReference('internal_cross_reference')).toBe(false)
    expect(natureSeNormaliseCommeReference('source_locator')).toBe(false)
    expect(natureSeNormaliseCommeReference('commentary')).toBe(false)
    expect(natureSeNormaliseCommeReference(null)).toBe(false)
  })
})
