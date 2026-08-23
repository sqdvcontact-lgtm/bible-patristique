import { describe, it, expect } from 'vitest'
import { COUVERTURES, COUVERTURE_PAR_DEFAUT, couvertureDe, couvertureTiree, estCouvertureConnue } from './couverturesEssai'

describe('jeu de couvertures', () => {
  it('n’a pas deux fois la même clé', () => {
    const cles = COUVERTURES.map(c => c.cle)
    expect(new Set(cles).size).toBe(cles.length)
  })

  it('donne à chaque couverture un fond, une encre et un filet, dans les deux thèmes', () => {
    for (const c of COUVERTURES) {
      for (const v of [c.fond, c.encre, c.fondSombre, c.encreSombre]) expect(v).toMatch(/^#[0-9a-f]{6}$/i)
      expect(c.filet.length).toBeGreaterThan(0)
      expect(c.filetSombre.length).toBeGreaterThan(0)
      expect(c.libelle.trim().length).toBeGreaterThan(0)
    }
  })

  // ⛔ CE N'EST PAS LE TITRE QUI COMMANDE, C'EST LA DATE. Ce test ne vérifiait que
  // le titre, à pleine opacité — et c'est pour cela que le défaut a vécu : la date
  // du pied est l'encre à 0,78, composée à environ 7,7px, donc sous les 24px où
  // WCAG exige 4,5 et non 3. Les six couvertures tenaient au titre et lâchaient
  // toutes à la date. On éprouve donc CHAQUE opacité réellement employée.
  const OPACITES: [string, number][] = [
    ['titre', 1.0],
    ['catégorie et sous-titre', 0.84],
    ['date du pied', 0.78],
  ]
  const clarteRgb = (v: number[]) => {
    const lin = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4)
    return 0.2126 * lin(v[0]) + 0.7152 * lin(v[1]) + 0.0722 * lin(v[2])
  }
  const rgb = (hex: string) => [0, 1, 2].map(i => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16))
  const contraste = (encre: string, fond: string, alpha: number) => {
    // L'encre atténuée se COMPOSE sur son fond : c'est la couleur réellement peinte.
    const pose = rgb(encre).map((c, i) => c * alpha + rgb(fond)[i] * (1 - alpha))
    const [a, b] = [clarteRgb(pose), clarteRgb(rgb(fond))].sort((x, y) => y - x)
    return (a + 0.05) / (b + 0.05)
  }

  for (const [theme, fondDe, encreDe] of [
    ['clair', (c: typeof COUVERTURES[0]) => c.fond, (c: typeof COUVERTURES[0]) => c.encre],
    ['cuir', (c: typeof COUVERTURES[0]) => c.fondSombre, (c: typeof COUVERTURES[0]) => c.encreSombre],
  ] as const) {
    it(`tient 4,5 à toutes les opacités employées — thème ${theme}`, () => {
      for (const c of COUVERTURES) {
        for (const [quoi, alpha] of OPACITES) {
          expect(
            contraste(encreDe(c), fondDe(c), alpha),
            `« ${c.libelle} » (${theme}) — ${quoi}`,
          ).toBeGreaterThanOrEqual(4.5)
        }
      }
    })
  }

  // Un rayon doit se lire comme une collection, non comme un dégradé : deux
  // couvertures voisines dans la gamme ne doivent pas se confondre.
  it('espace les fonds voisins, dans les deux thèmes', () => {
    const lab = (hex: string) => {
      const c = rgb(hex).map(v => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4))
      const X = (0.4124 * c[0] + 0.3576 * c[1] + 0.1805 * c[2]) / 0.95047
      const Y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
      const Z = (0.0193 * c[0] + 0.1192 * c[1] + 0.9505 * c[2]) / 1.08883
      const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
      return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]
    }
    const ecart = (a: string, b: string) => {
      const [A, B] = [lab(a), lab(b)]
      return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2])
    }
    for (let i = 1; i < COUVERTURES.length; i++) {
      const p = COUVERTURES[i - 1], c = COUVERTURES[i]
      expect(ecart(p.fond, c.fond), `${p.cle} → ${c.cle} (clair)`).toBeGreaterThanOrEqual(10)
      expect(ecart(p.fondSombre, c.fondSombre), `${p.cle} → ${c.cle} (cuir)`).toBeGreaterThanOrEqual(10)
    }
  })

  // Un blanc pur sur un vert profond fait un rectangle de bureau, non un
  // cartonnage. La règle tient donc dans les chiffres : aucune encre ne doit être
  // un gris, c'est-à-dire avoir ses trois composantes voisines.
  it('ne donne à aucune couverture une encre grise, blanche ou noire', () => {
    for (const c of COUVERTURES) {
      for (const [theme, encre] of [['clair', c.encre], ['cuir', c.encreSombre]] as const) {
        const canaux = [0, 1, 2].map(i => parseInt(encre.slice(1 + i * 2, 3 + i * 2), 16))
        const ecart = Math.max(...canaux) - Math.min(...canaux)
        expect(ecart, `encre de « ${c.libelle} » (${theme}, ${encre})`).toBeGreaterThanOrEqual(12)
      }
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
    expect(couvertureDe('sauge').libelle).toBe('Sauge')
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
    expect(couvertureDe('sauge', 41).cle).toBe('sauge')
  })

  // Une couleur retirée du jeu ne doit jamais faire disparaître une publication.
  it('rend le défaut sur une clé inconnue, sans lever', () => {
    expect(couvertureDe('turquoise-fluo')).toBe(COUVERTURE_PAR_DEFAUT)
  })

  it('reconnaît les clés du jeu, et elles seules', () => {
    expect(estCouvertureConnue('or')).toBe(true)
    expect(estCouvertureConnue('turquoise-fluo')).toBe(false)
    expect(estCouvertureConnue(null)).toBe(false)
  })
})
