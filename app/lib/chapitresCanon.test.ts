import { describe, expect, it } from 'vitest'
import { CHAPITRES_PROTOCANON, estLivreOuvrable, nombreDeChapitres } from './chapitresCanon'

// Ce que l'ossature porte réellement, relevé sur `livres_canon` le 2026-09-04.
const OSSATURE = { GEN: 50, SIR: 51, WIS: 19, TOB: 14, JDT: 16, '1MA': 16, '2MA': 15, BAR: 6, JOL: 4, DAN: 12 }

describe('nombreDeChapitres', () => {
  it('prend le compte de l’OSSATURE quand on l’a', () => {
    expect(nombreDeChapitres('SIR', OSSATURE)).toBe(51)
    expect(nombreDeChapitres('WIS', OSSATURE)).toBe(19)
  })

  it('⛔ le deutérocanonique ne retombe plus sur UN chapitre', () => {
    for (const code of ['SIR', 'WIS', 'TOB', 'JDT', '1MA', '2MA', 'BAR']) {
      expect(nombreDeChapitres(code, OSSATURE), code).toBeGreaterThan(1)
      // La table de repli ne les a jamais portés : c'est bien l'ossature qui répond.
      expect(CHAPITRES_PROTOCANON[code], code).toBeUndefined()
    }
  })

  it('retombe sur le repli tant que l’ossature n’a pas répondu', () => {
    expect(nombreDeChapitres('GEN', null)).toBe(50)
    expect(nombreDeChapitres('SIR', null)).toBe(1)
  })

  it('⚠️ le repli dit ce que l’OSSATURE dit, non ce que la Vulgate compte', () => {
    // Joël valait 3 (son chapitre 4 était inatteignable) et Daniel 14 (ses deux derniers
    // chapitres s'offraient sans rien rendre, leur texte vivant sous SUS et BEL).
    expect(CHAPITRES_PROTOCANON.JOL).toBe(OSSATURE.JOL)
    expect(CHAPITRES_PROTOCANON.DAN).toBe(OSSATURE.DAN)
  })

  it('rend UN chapitre pour un livre que personne ne connaît', () => {
    expect(nombreDeChapitres('XYZ', OSSATURE)).toBe(1)
  })
})

describe('estLivreOuvrable', () => {
  it('⛔ un livre absent de l’ossature ne se liste pas', () => {
    expect(estLivreOuvrable('ESG', OSSATURE)).toBe(false)
    expect(estLivreOuvrable('LJE', OSSATURE)).toBe(false)
  })

  it('un livre que l’ossature porte se liste', () => {
    expect(estLivreOuvrable('SIR', OSSATURE)).toBe(true)
  })

  it('⚠️ tant qu’on ne SAIT pas, on ne retire rien', () => {
    expect(estLivreOuvrable('ESG', null)).toBe(true)
  })
})
