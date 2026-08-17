import { describe, it, expect } from 'vitest'
import { cesurerLatin, cesurerMot, syllabesLatines, sansCesures, CESURE } from './cesuresLatines'

// Deux notions distinctes, testées séparément : la SYLLABATION, qui est affaire de
// langue, et les POINTS DE COUPE, qui sont affaire de composition (on ne renvoie
// jamais moins de trois lettres à la ligne suivante).
const coupes = (mot: string) => cesurerMot(mot).split(CESURE)

describe('syllabation latine', () => {
  it('donne la consonne simple à la syllabe suivante', () => {
    expect(syllabesLatines('domine')).toEqual(['do', 'mi', 'ne'])
    expect(syllabesLatines('invocare')).toEqual(['in', 'vo', 'ca', 're'])
    expect(syllabesLatines('humanitatem')).toEqual(['hu', 'ma', 'ni', 'ta', 'tem'])
  })

  it('sépare deux consonnes ordinaires', () => {
    expect(syllabesLatines('intellegere')).toEqual(['in', 'tel', 'le', 'ge', 're'])
    expect(syllabesLatines('praedicante')).toEqual(['prae', 'di', 'can', 'te'])
    expect(syllabesLatines('credidissent')).toEqual(['cre', 'di', 'dis', 'sent'])
  })

  it('ne coupe pas une muette suivie d’une liquide', () => {
    expect(syllabesLatines('patris')).toEqual(['pa', 'tris'])
    expect(syllabesLatines('duplicem')).toEqual(['du', 'pli', 'cem'])
  })

  it('ne coupe ni s + occlusive, ni les digrammes grecs, ni `gn`', () => {
    expect(syllabesLatines('nesciens')).toEqual(['ne', 'sci', 'ens'])
    expect(syllabesLatines('inspirasti')).toEqual(['in', 'spi', 'ra', 'sti'])
    expect(syllabesLatines('christus')).toEqual(['chri', 'stus'])
    expect(syllabesLatines('magnus')).toEqual(['ma', 'gnus'])
  })

  it('garde d’un seul tenant s + muette + liquide', () => {
    expect(syllabesLatines('castra')).toEqual(['ca', 'stra'])
    expect(syllabesLatines('nostrum')).toEqual(['no', 'strum'])
  })

  it('tient le `u` de `qu` pour une consonne', () => {
    expect(syllabesLatines('quomodo')).toEqual(['quo', 'mo', 'do'])
    expect(syllabesLatines('quaeram')).toEqual(['quae', 'ram'])
    expect(syllabesLatines('loquitur')).toEqual(['lo', 'qui', 'tur'])
  })

  it('ne coupe jamais une diphtongue', () => {
    expect(syllabesLatines('laudabunt')).toEqual(['lau', 'da', 'bunt'])
    expect(syllabesLatines('praedicatoris')).toEqual(['prae', 'di', 'ca', 'to', 'ris'])
  })

  it('coupe le hiatus de deux voyelles', () => {
    expect(syllabesLatines('deorum')).toEqual(['de', 'o', 'rum'])
    expect(syllabesLatines('filii')).toEqual(['fi', 'li', 'i'])
  })
})

describe('points de coupe retenus', () => {
  it('ne renvoie jamais moins de trois lettres à la ligne suivante', () => {
    // « do-mi-ne » a trois syllabes, mais « ne » ne se renvoie pas seul.
    expect(coupes('domine')).toEqual(['do', 'mine'])
    expect(coupes('quomodo')).toEqual(['quo', 'modo'])
    expect(coupes('filii')).toEqual(['fi', 'lii'])
    expect(coupes('philosophia')).toEqual(['phi', 'lo', 'so', 'phia'])
  })

  it('laisse intact un mot trop court pour mériter une coupe', () => {
    expect(cesurerMot('deus')).toBe('deus')
    expect(cesurerMot('mihi')).toBe('mihi')
    expect(cesurerMot('te')).toBe('te')
  })

  it('coupe abondamment les mots longs, ce qui est le but', () => {
    expect(coupes('humanitatem')).toEqual(['hu', 'ma', 'ni', 'ta', 'tem'])
    expect(coupes('praedicatoris')).toEqual(['prae', 'di', 'ca', 'to', 'ris'])
  })
})

describe('pose et retrait dans un texte', () => {
  const phrase = 'da mihi, domine, scire et intellegere, utrum sit prius invocare te.'

  it('ne change pas une lettre du texte', () => {
    expect(sansCesures(cesurerLatin(phrase))).toBe(phrase)
  })

  it('laisse les marqueurs de note intacts, pour que les appels restent reconnus', () => {
    expect(cesurerLatin('invocare [[81]] dominum')).toContain('[[81]]')
  })

  it('est idempotent', () => {
    const une = cesurerLatin(phrase)
    expect(cesurerLatin(une)).toBe(une)
  })
})
