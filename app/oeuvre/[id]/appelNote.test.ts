import { describe, it, expect } from 'vitest'
import { titreSansAppelsDeNote, notesPourTexte, preparerTitreColophon } from './appelNote'

// Écrite en toutes lettres : dans un fichier de test, une espace insécable
// littérale ne se distingue pas d'une espace ordinaire à la lecture, et une
// assertion qu'on ne sait pas relire ne prouve rien.
const INSECABLE = ' '

describe('espacement typographique d’un titre', () => {
  it('pose l’espace insécable devant la ponctuation haute', () => {
    expect(preparerTitreColophon('Livre premier : la cité')).toBe(`Livre premier${INSECABLE}: la cité`)
  })

  it('resserre l’espace qui précède une virgule ou un point', () => {
    expect(preparerTitreColophon('Livre premier , la cité')).toBe('Livre premier, la cité')
  })

  it('garde le saut de ligne quand la seconde ligne s’ouvre sur une ponctuation haute', () => {
    expect(preparerTitreColophon('Livre premier\n: la cité de Dieu'))
      .toBe('Livre premier\n: la cité de Dieu')
  })

  it('garde le saut de ligne quand la seconde ligne s’ouvre sur une virgule ou un point', () => {
    expect(preparerTitreColophon('Sur la Cité de Dieu\n. Dessein de cet ouvrage'))
      .toBe('Sur la Cité de Dieu\n. Dessein de cet ouvrage')
  })
})

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
