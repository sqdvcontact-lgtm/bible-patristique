import { describe, expect, it } from 'vitest'
import { couperAvantDerniereSyllabe, detacherDerniereSyllabe } from './appelsDeNote'

const C = '­'

describe('ce qui voyage avec l’appel : la dernière syllabe seulement', () => {
  it('coupe le mot long du relevé (1 Co 15, 53) avant sa dernière syllabe', () => {
    expect(detacherDerniereSyllabe('hoc uestiri inmortalitatem'))
      .toEqual([`hoc uestiri inmortalita${C}`, 'tem'])
  })

  it('syllabe à la française : consonne seule, consonnes séparées, groupes insécables', () => {
    expect(couperAvantDerniereSyllabe('couvertes')).toEqual([`couver${C}`, 'tes'])
    expect(couperAvantDerniereSyllabe('renouvelé')).toEqual([`renouve${C}`, 'lé'])
    expect(couperAvantDerniereSyllabe('Seigneur')).toEqual([`Sei${C}`, 'gneur'])
    expect(couperAvantDerniereSyllabe('exemple')).toEqual([`exem${C}`, 'ple'])
    expect(couperAvantDerniereSyllabe('quelque')).toEqual([`quel${C}`, 'que'])
  })

  it('respecte une coupe déjà posée par le site', () => {
    expect(couperAvantDerniereSyllabe(`in${C}mor${C}ta${C}li${C}ta${C}tem`))
      .toEqual([`in${C}mor${C}ta${C}li${C}ta${C}`, 'tem'])
  })

  it('laisse entier un mot court, sans voyelle ou en hiatus final', () => {
    expect(couperAvantDerniereSyllabe('Paul')).toEqual(['', 'Paul'])
    expect(couperAvantDerniereSyllabe('gloire')).toEqual(['', 'gloire'])
    expect(couperAvantDerniereSyllabe('XXVIII')).toEqual(['', 'XXVIII'])
    expect(couperAvantDerniereSyllabe('ἀθανασίαν')).toEqual(['', 'ἀθανασίαν'])
  })

  it('ne syllabe que la dernière composante d’un mot élidé ou composé', () => {
    expect(couperAvantDerniereSyllabe('l’humanité')).toEqual([`l’humani${C}`, 'té'])
    expect(couperAvantDerniereSyllabe('peut-être')).toEqual(['', 'peut-être'])
  })

  it('rien à détacher après une espace', () => {
    expect(detacherDerniereSyllabe('la paix ')).toEqual(['la paix ', ''])
  })
})
