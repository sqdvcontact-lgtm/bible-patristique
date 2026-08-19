import { describe, it, expect } from 'vitest'
import { COUVERTURES, COUVERTURE_PAR_DEFAUT, couvertureDe, couvertureTiree, estCouvertureConnue } from './couverturesEssai'

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

describe('tirage par défaut', () => {
  // Une couverture qui changerait d'un affichage à l'autre ne serait plus une
  // couverture : le tirage doit être stable pour un même identifiant.
  it('est stable pour une même publication', () => {
    for (const id of [1, 2, 17, 512, 99999]) {
      expect(couvertureTiree(id)).toBe(couvertureTiree(id))
    }
  })

  it('rend toujours une couverture du jeu', () => {
    for (let id = 0; id < 200; id++) expect(COUVERTURES).toContain(couvertureTiree(id))
  })

  // Le but est la variété : sur une série d'identifiants consécutifs, comme le sont
  // les publications, le tirage doit balayer le jeu et non s'attacher à deux teintes.
  it('balaie le jeu sur des identifiants consécutifs', () => {
    const vues = new Set(Array.from({ length: 60 }, (_, i) => couvertureTiree(i + 1).cle))
    expect(vues.size).toBeGreaterThanOrEqual(COUVERTURES.length - 1)
  })
})

describe('couverture d’une publication', () => {
  it('rend la couverture choisie', () => {
    expect(couvertureDe('outremer').libelle).toBe('Outremer')
  })

  it('rend le défaut quand rien n’a été choisi ET qu’aucune graine n’est donnée', () => {
    expect(couvertureDe(null)).toBe(COUVERTURE_PAR_DEFAUT)
    expect(couvertureDe(undefined)).toBe(COUVERTURE_PAR_DEFAUT)
    expect(couvertureDe('  ')).toBe(COUVERTURE_PAR_DEFAUT)
  })

  it('tire une couverture quand rien n’a été choisi mais qu’une graine est donnée', () => {
    expect(COUVERTURES).toContain(couvertureDe(null, 41))
    expect(couvertureDe(null, 41)).toBe(couvertureTiree(41))
  })

  it('laisse le choix de l’auteur l’emporter sur le tirage', () => {
    expect(couvertureDe('outremer', 41).cle).toBe('outremer')
  })

  // Une couleur retirée du jeu ne doit jamais faire disparaître une publication.
  it('rend le défaut sur une clé inconnue, sans lever', () => {
    expect(couvertureDe('turquoise-fluo')).toBe(COUVERTURE_PAR_DEFAUT)
  })

  it('reconnaît les clés du jeu, et elles seules', () => {
    expect(estCouvertureConnue('ambre')).toBe(true)
    expect(estCouvertureConnue('turquoise-fluo')).toBe(false)
    expect(estCouvertureConnue(null)).toBe(false)
  })
})
