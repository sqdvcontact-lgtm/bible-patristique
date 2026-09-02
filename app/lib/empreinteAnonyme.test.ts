import { describe, expect, it } from 'vitest'
import { empreinteAnonyme } from './empreinteAnonyme'

describe('empreinteAnonyme', () => {
  const sel = 'sel-de-test'

  it('rend la même empreinte pour la même personne dans la journée', () => {
    const a = empreinteAnonyme('203.0.113.7', 'Mozilla/5.0', { sel, jour: '2026-09-02' })
    const b = empreinteAnonyme('203.0.113.7', 'Mozilla/5.0', { sel, jour: '2026-09-02' })
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{32}$/)
  })

  it('change d’un jour à l’autre : personne ne se suit dans le temps', () => {
    const lundi = empreinteAnonyme('203.0.113.7', 'Mozilla/5.0', { sel, jour: '2026-09-01' })
    const mardi = empreinteAnonyme('203.0.113.7', 'Mozilla/5.0', { sel, jour: '2026-09-02' })
    expect(lundi).not.toBe(mardi)
  })

  it('ne laisse rien paraître de l’adresse', () => {
    const e = empreinteAnonyme('203.0.113.7', '', { sel, jour: '2026-09-02' })
    expect(e).not.toContain('203')
    expect(e).not.toContain('113')
  })
})
