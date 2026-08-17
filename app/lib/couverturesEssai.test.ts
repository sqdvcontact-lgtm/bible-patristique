import { describe, it, expect } from 'vitest'
import { COUVERTURES, COUVERTURE_PAR_DEFAUT, couvertureDe, estCouvertureConnue } from './couverturesEssai'

describe('jeu de couvertures', () => {
  it('n’a pas deux fois la même clé', () => {
    const cles = COUVERTURES.map(c => c.cle)
    expect(new Set(cles).size).toBe(cles.length)
  })

  it('donne à chaque couverture un fond, une encre et un filet', () => {
    for (const c of COUVERTURES) {
      expect(c.fond).toMatch(/^#[0-9a-f]{6}$/i)
      expect(c.encre).toMatch(/^#[0-9a-f]{6}$/i)
      expect(c.filet.length).toBeGreaterThan(0)
      expect(c.libelle.trim().length).toBeGreaterThan(0)
    }
  })

  // Le texte doit rester lisible sur son fond : on exige un écart de clarté franc,
  // faute de quoi une couverture serait jolie et illisible.
  it('oppose une encre claire à un fond sombre, et l’inverse', () => {
    const clarte = (hex: string) => {
      const v = (i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255
      const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
      return 0.2126 * lin(v(0)) + 0.7152 * lin(v(1)) + 0.0722 * lin(v(2))
    }
    for (const c of COUVERTURES) {
      const [a, b] = [clarte(c.fond), clarte(c.encre)].sort((x, y) => y - x)
      const contraste = (a + 0.05) / (b + 0.05)
      expect(contraste, `couverture « ${c.libelle} »`).toBeGreaterThan(4.5)
    }
  })
})

describe('couverture d’une publication', () => {
  it('rend la couverture choisie', () => {
    expect(couvertureDe('bordeaux').libelle).toBe('Bordeaux')
  })

  it('rend le défaut quand rien n’a été choisi', () => {
    expect(couvertureDe(null)).toBe(COUVERTURE_PAR_DEFAUT)
    expect(couvertureDe(undefined)).toBe(COUVERTURE_PAR_DEFAUT)
    expect(couvertureDe('  ')).toBe(COUVERTURE_PAR_DEFAUT)
  })

  // Une couleur retirée du jeu ne doit jamais faire disparaître une publication.
  it('rend le défaut sur une clé inconnue, sans lever', () => {
    expect(couvertureDe('turquoise-fluo')).toBe(COUVERTURE_PAR_DEFAUT)
  })

  it('reconnaît les clés du jeu, et elles seules', () => {
    expect(estCouvertureConnue('indigo')).toBe(true)
    expect(estCouvertureConnue('turquoise-fluo')).toBe(false)
    expect(estCouvertureConnue(null)).toBe(false)
  })
})
