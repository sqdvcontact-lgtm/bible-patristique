import { describe, expect, it } from 'vitest'
import { lireTitresMasques, titreMasque } from './titresMasquesBible'

describe('les rangs de titre masqués d’une édition biblique', () => {
  it('ne lit que les rangs connus, sans doublon, dans l’ordre de l’échelle', () => {
    expect(lireTitresMasques(['T6', 'T4', 'T4', 'I3', 7, null])).toEqual(['T4', 'T6'])
    expect(lireTitresMasques(null)).toEqual([])
    expect(lireTitresMasques('T4')).toEqual([])
  })
  it('un rang absent n’est jamais masqué', () => {
    expect(titreMasque(null, ['T4'])).toBe(false)
    expect(titreMasque('T4', undefined)).toBe(false)
    expect(titreMasque('T4', ['T4'])).toBe(true)
    expect(titreMasque('T5', ['T4'])).toBe(false)
  })
})
