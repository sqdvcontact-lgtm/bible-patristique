import { describe, expect, it } from 'vitest'
import { PART_PAGE_ORPHELINE, paginerBlocs } from './paginationLecture'

const PLAFOND = 15000
const bloc = (nom: string, signes: number) => ({ bloc: nom, signes })

describe('la pagination de la lecture', () => {
  it('remplit une page jusqu’au plafond, sans couper un bloc', () => {
    expect(paginerBlocs([bloc('a', 6000), bloc('b', 6000), bloc('c', 6000)], PLAFOND))
      .toEqual([['a', 'b'], ['c']])
  })

  it('ne rend aucune page pour une entrée vide', () => {
    expect(paginerBlocs([], PLAFOND)).toEqual([])
  })

  it('laisse un bloc plus lourd que le plafond faire sa page', () => {
    // Il n'y a rien à y faire sans le couper, et on ne coupe pas un bloc.
    expect(paginerBlocs([bloc('énorme', 40000), bloc('suite', 6000)], PLAFOND))
      .toEqual([['énorme'], ['suite']])
  })
})

describe('le paragraphe orphelin', () => {
  it('garde le lemme avec le commentaire qu’il annonce — le cas du psaume III', () => {
    // Explication sur le psaume III (Chrysostome, Jeannin) : 123 + 14 952 = 15 075,
    // soit 75 signes au-dessus du plafond. Le lemme se retrouvait seul sur sa page.
    expect(paginerBlocs([bloc('lemme', 123), bloc('commentaire', 14952)], PLAFOND))
      .toEqual([['lemme', 'commentaire']])
  })

  it('ferme la page dès qu’elle porte de quoi en être une', () => {
    const juste = PLAFOND * PART_PAGE_ORPHELINE
    expect(paginerBlocs([bloc('a', juste), bloc('b', 14952)], PLAFOND))
      .toEqual([['a'], ['b']])
    expect(paginerBlocs([bloc('a', juste - 1), bloc('b', 14952)], PLAFOND))
      .toEqual([['a', 'b']])
  })

  it('rattache l’orphelin de QUEUE à la page précédente', () => {
    expect(paginerBlocs([bloc('a', 14900), bloc('b', 500)], PLAFOND))
      .toEqual([['a', 'b']])
  })

  it('laisse seul un bloc unique, fût-il minuscule : il n’y a rien où le rattacher', () => {
    expect(paginerBlocs([bloc('lemme', 123)], PLAFOND)).toEqual([['lemme']])
  })

  it('n’enchaîne pas les orphelins : plusieurs miettes tiennent sur une seule page', () => {
    expect(paginerBlocs([bloc('a', 100), bloc('b', 14952), bloc('c', 100)], PLAFOND))
      .toEqual([['a', 'b', 'c']])
  })

  it('ne rouvre pas une page déjà pleine pour un reste normal', () => {
    expect(paginerBlocs([bloc('a', 10000), bloc('b', 10000), bloc('c', 10000)], PLAFOND))
      .toEqual([['a'], ['b'], ['c']])
  })
})
