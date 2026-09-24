import { describe, expect, it } from 'vitest'
import { placerEtiquettes } from './placerEtiquettes'

const ecarts = (t: number[], h: number[]) => t.slice(1).map((y, i) => y - t[i] - h[i])

describe('placerEtiquettes', () => {
  it('laisse à sa place une étiquette qui ne gêne personne', () => {
    expect(placerEtiquettes([10, 100, 300], [20, 20, 20], 0, 500, 5)).toEqual([10, 100, 300])
  })
  it('écarte deux étiquettes qui se disputent la place, autour de leur moyenne', () => {
    const t = placerEtiquettes([100, 100], [20, 20], 0, 500, 5)
    expect(ecarts(t, [20, 20])).toEqual([5])
    expect((t[0] + t[1]) / 2).toBeCloseTo(100 - 12.5 + 12.5)
  })
  it('ne laisse jamais deux étiquettes se chevaucher, et garde leur ordre', () => {
    const h = [29, 29, 45, 29, 45, 29, 29]
    const t = placerEtiquettes([300, 305, 310, 320, 330, 340, 600], h, 20, 620, 5)
    ecarts(t, h).forEach(e => expect(e).toBeGreaterThanOrEqual(5 - 1e-9))
  })
  it('borne le groupe à la place offerte', () => {
    const h = [30, 30, 30]
    const t = placerEtiquettes([590, 595, 600], h, 0, 620, 5)
    expect(t[2] + h[2]).toBeLessThanOrEqual(620 + 1e-9)
    expect(placerEtiquettes([-50], [30], 20, 620, 5)).toEqual([20])
  })
})
