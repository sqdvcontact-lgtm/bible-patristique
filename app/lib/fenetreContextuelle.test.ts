import { describe, it, expect } from 'vitest'
import { MARGE_FENETRE, hauteurMaxModale, placerFenetre, type Ancre } from './fenetreContextuelle'

const VUE = { largeur: 1200, hauteur: 800 }
const NAVBAR = 56
const M = MARGE_FENETRE
const HAUT_UTILE = NAVBAR + M      // 68
const BAS_UTILE = VUE.hauteur - M  // 788

const ancre = (top: number, hauteur = 20, left = 400): Ancre =>
  ({ top, bottom: top + hauteur, left, right: left + 120 })

const placer = (a: Ancre, hauteurSouhaitee = 300, largeur = 320) =>
  placerFenetre({ ancre: a, largeur, hauteurSouhaitee, vue: VUE, hautNavbar: NAVBAR })

describe('placement sous l’ancre', () => {
  it('se pose sous l’ancre quand la place suffit', () => {
    const p = placer(ancre(200))
    expect(p.auDessus).toBe(false)
    expect(p.top).toBe(226) // 200 + 20 + 6
    expect(p.hauteurMax).toBe(300)
  })

  it('aligne sur le bord gauche de l’ancre', () => {
    expect(placer(ancre(200, 20, 400)).left).toBe(400)
  })
})

describe('jamais sous la barre de navigation', () => {
  // Une ancre haute, presque collée à la barre : la fenêtre ne doit pas remonter
  // au-dessus de la bande utile, même en se retournant.
  it('ne remonte pas au-dessus de la bande utile', () => {
    for (const t of [0, 20, 60, 70, 100]) {
      const p = placer(ancre(t))
      expect(p.top, `ancre à ${t}`).toBeGreaterThanOrEqual(HAUT_UTILE)
    }
  })

  it('ne se retourne pas vers le haut quand le haut est plus étroit que le bas', () => {
    // Ancre à 80 : au-dessus il ne reste que 6 px utiles, en dessous plus de 600.
    expect(placer(ancre(80)).auDessus).toBe(false)
  })
})

describe('jamais hors du bas de l’écran', () => {
  it('se retourne au-dessus quand le bas manque', () => {
    const p = placer(ancre(700))
    expect(p.auDessus).toBe(true)
    expect(p.top + p.hauteurMax).toBeLessThanOrEqual(ancre(700).top - 6 + 0.001)
  })

  it('tient dans la bande, quelle que soit la position de l’ancre', () => {
    for (let t = 0; t <= 790; t += 10) {
      const p = placer(ancre(t))
      expect(p.top, `ancre à ${t}`).toBeGreaterThanOrEqual(HAUT_UTILE)
      expect(p.top + p.hauteurMax, `ancre à ${t}`).toBeLessThanOrEqual(BAS_UTILE + 0.001)
    }
  })

  // Le cas qui manquait : une ancre en bas d'écran envoyait la fenêtre hors vue.
  it('ne laisse jamais une ancre basse pousser la fenêtre hors de l’écran', () => {
    const p = placer(ancre(780))
    expect(p.top + p.hauteurMax).toBeLessThanOrEqual(BAS_UTILE + 0.001)
  })
})

describe('bornes latérales', () => {
  it('recale une ancre trop à droite', () => {
    expect(placer(ancre(200, 20, 1150)).left).toBe(VUE.largeur - 320 - M)
  })

  it('recale une ancre trop à gauche', () => {
    expect(placer(ancre(200, 20, -50)).left).toBe(M)
  })
})

describe('écran très bas', () => {
  // Sur un écran court, la bande utile est mince : la fenêtre s'y borne et
  // défilera en dedans, plutôt que de déborder.
  it('borne la hauteur à la bande utile', () => {
    const p = placerFenetre({
      ancre: ancre(100), largeur: 320, hauteurSouhaitee: 600,
      vue: { largeur: 1200, hauteur: 300 }, hautNavbar: NAVBAR,
    })
    expect(p.hauteurMax).toBeLessThanOrEqual(300 - NAVBAR - M * 2)
    expect(p.top).toBeGreaterThanOrEqual(HAUT_UTILE)
    expect(p.top + p.hauteurMax).toBeLessThanOrEqual(300 - M + 0.001)
  })

  it('ne rend jamais une hauteur négative', () => {
    const p = placerFenetre({
      ancre: ancre(10), largeur: 320, hauteurSouhaitee: 600,
      vue: { largeur: 400, hauteur: 60 }, hautNavbar: NAVBAR,
    })
    expect(p.hauteurMax).toBeGreaterThanOrEqual(0)
  })
})

describe('fenêtre centrée', () => {
  it('occupe la bande utile, marges comprises', () => {
    expect(hauteurMaxModale(VUE, NAVBAR)).toBe(800 - 56 - 24)
  })

  it('ne rend jamais une hauteur négative', () => {
    expect(hauteurMaxModale({ largeur: 320, hauteur: 40 }, NAVBAR)).toBe(0)
  })
})
