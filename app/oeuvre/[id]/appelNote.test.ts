import { describe, it, expect } from 'vitest'
import { titreSansAppelsDeNote, notesPourTexte } from './appelNote'

describe('appels de note masqués au sommaire', () => {
  it('retire le marqueur collé à l’intitulé', () => {
    expect(titreSansAppelsDeNote('Livre cinquième[[81]]')).toBe('Livre cinquième')
  })

  it('emporte l’espace qui précède, sans laisser de blanc double', () => {
    expect(titreSansAppelsDeNote('Au roy Charles [[76]].')).toBe('Au roy Charles.')
  })

  it('ne touche pas au retour à la ligne des chapeaux sur deux lignes', () => {
    expect(titreSansAppelsDeNote('Sur la Cité de Dieu[[1]]\nDessein de cet ouvrage'))
      .toBe('Sur la Cité de Dieu\nDessein de cet ouvrage')
  })

  it('laisse intact un titre sans appel', () => {
    expect(titreSansAppelsDeNote('Livre premier')).toBe('Livre premier')
  })
})

describe('banque de notes d’un titre', () => {
  it('trouve la note ancrée plus loin dans la section, pas seulement sur le premier segment', () => {
    const premierSegment = {}
    const section = { '1': 'Commencés en l’an 413.', '2': 'Marcellin, tribun d’Afrique.' }
    expect(notesPourTexte(['Premier discours[[1]]'], [premierSegment, section]))
      .toEqual({ '1': 'Commencés en l’an 413.' })
  })

  it('donne la priorité à la note locale du groupe', () => {
    expect(notesPourTexte(['Livre cinquième[[81]]'], [{ '81': 'locale' }, { '81': 'section' }]))
      .toEqual({ '81': 'locale' })
  })

  it('ne renvoie rien quand le titre n’appelle aucune note', () => {
    expect(notesPourTexte(['Livre premier'], [{ '81': 'Ecrit en 415.' }])).toEqual({})
  })
})
