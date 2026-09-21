import { describe, expect, it } from 'vitest'
import { finDuDernierMot, repartirAppels } from './ancresAppelsBible'

type N = { id: string; ancre?: { texteCible: string; offsetUnicode: number } }
const notes = (...n: N[]) => n

const texte = 'Ils vinrent donc à la place d’Atad et restèrent là pendant sept jours.'

describe('repartirAppels', () => {
  it('pose un appel sans ancre au dernier mot, devant la ponctuation finale', () => {
    const { groupes, aLaSuite } = repartirAppels(texte, notes({ id: 'a' }))
    expect(aLaSuite).toEqual([])
    expect(groupes).toHaveLength(1)
    expect(texte.slice(0, groupes[0].position).endsWith('jours')).toBe(true)
  })

  it('réunit au dernier mot une ancre tombée dans la ponctuation finale', () => {
    const ancre = { texteCible: texte, offsetUnicode: [...texte].length - 1 }
    const { groupes } = repartirAppels(texte, notes({ id: 'a' }, { id: 'b', ancre }))
    expect(groupes).toHaveLength(1)
    expect(groupes[0].notes.map((n) => n.id)).toEqual(['a', 'b'])
  })

  it('laisse à la suite les appels d’un verset sans texte', () => {
    expect(repartirAppels('', notes({ id: 'a' })).aLaSuite).toHaveLength(1)
  })
})

describe('finDuDernierMot', () => {
  it('passe les blancs insécables et la ponctuation', () => {
    expect(finDuDernierMot('Pourquoi ?')).toBe(8)
    expect(finDuDernierMot('« il dit. »')).toBe(8)
  })

  it('ne coupe jamais un crochet', () => {
    const t = 'et il dit […]'
    expect(finDuDernierMot(t)).toBe(t.length)
  })
})
