import { describe, it, expect } from 'vitest'
import { MARGE_FENETRE, hauteurMaxModale, placerEnMarge, placerFenetre, type Ancre } from './fenetreContextuelle'

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

describe('au doigt, la fenêtre s’ouvre au-dessus', () => {
  // ⚠️ Sous le point de frappe il y a la main : une note posée dessous se lit à
  // travers les doigts. Au-dessus, rien ne la couvre.
  const auDoigt = (a: Ancre, hauteurSouhaitee = 300) =>
    placerFenetre({
      ancre: a, largeur: 320, hauteurSouhaitee, vue: VUE, hautNavbar: NAVBAR,
      prefereDessus: true,
    })

  it('se retourne alors même que le dessous suffirait', () => {
    // Sans le drapeau, cette ancre reçoit sa fenêtre DESSOUS.
    expect(placer(ancre(400)).auDessus).toBe(false)
    const p = auDoigt(ancre(400))
    expect(p.auDessus).toBe(true)
    expect(p.top).toBe(400 - 6 - 300)
    expect(p.hauteurMax).toBe(300)
  })

  it('reste dessous quand le dessus ne peut pas la porter', () => {
    // Ancre collée sous la barre : il n’y a rien au-dessus, et le dessous est
    // largement plus vaste.
    const p = auDoigt(ancre(80))
    expect(p.auDessus).toBe(false)
    expect(p.top).toBe(106)
  })

  it('se retourne quand même sur une fenêtre trop haute pour les deux côtés, le dessus étant plus large', () => {
    const p = auDoigt(ancre(600), 900)
    expect(p.auDessus).toBe(true)
    expect(p.top).toBeGreaterThanOrEqual(HAUT_UTILE)
    expect(p.top + p.hauteurMax).toBeLessThanOrEqual(BAS_UTILE)
  })

  it('ne change rien au calcul horizontal', () => {
    expect(auDoigt(ancre(400)).left).toBe(placer(ancre(400)).left)
  })
})

describe('l’encart se range dans une marge', () => {
  // Une colonne de lecture de 500 px centrée dans une fenêtre de 1200 : il reste
  // 350 px de chaque côté.
  const COLONNE = { gauche: 350, droite: 850 }
  const enMarge = (a: Ancre, largeur = 300, hauteurSouhaitee = 300, colonne = COLONNE, largeurMin = 300) =>
    placerEnMarge({ ancre: a, largeur, largeurMin, hauteurSouhaitee, vue: VUE, hautNavbar: NAVBAR, colonne })

  it('se pose À DROITE de la colonne, à hauteur de son appel', () => {
    const p = enMarge(ancre(300))!
    expect(p.cote).toBe('droite')
    expect(p.left).toBe(850 + 12)
    expect(p.top).toBe(300)
    expect(p.auDessus).toBe(false)
  })

  it('ne couvre JAMAIS la colonne de texte', () => {
    const p = enMarge(ancre(300))!
    expect(p.left).toBeGreaterThanOrEqual(COLONNE.droite)
  })

  // ⚠️ À égalité, la droite l’emporte : la marge de gauche porte la manchette.
  it('passe à GAUCHE quand la gauche est plus large', () => {
    const p = enMarge(ancre(300), 300, 300, { gauche: 500, droite: 900 })!
    expect(p.cote).toBe('gauche')
    expect(p.left).toBe(500 - 12 - 300)
    expect(p.left + 300).toBeLessThanOrEqual(500)
  })

  it('rend NULL quand aucune marge ne peut porter la largeur MINIMALE', () => {
    expect(enMarge(ancre(300), 300, 300, { gauche: 120, droite: 1080 })).toBeNull()
    expect(enMarge(ancre(300), 900, 300, COLONNE, 900)).toBeNull()
  })

  // ⛔ Elle SE RESSERRE plutôt que de renoncer : la colonne d'une œuvre laisse 561 px
  // à droite sur un écran de 1920, mais 366 seulement sur un écran de 1280.
  it('se resserre à la place disponible plutôt que de renoncer', () => {
    const p = enMarge(ancre(300), 900, 300, COLONNE, 300)!
    expect(p.largeur).toBe(1200 - 12 - (850 + 12))
    expect(p.left).toBe(850 + 12)
    expect(p.left + p.largeur).toBeLessThanOrEqual(1200 - 12)
  })

  it('garde sa mesure pleine quand la marge la porte', () => {
    expect(enMarge(ancre(300), 300)!.largeur).toBe(300)
  })

  it('se resserre AUSSI à gauche, sans jamais entamer la colonne', () => {
    const p = enMarge(ancre(300), 900, 300, { gauche: 500, droite: 900 }, 300)!
    expect(p.cote).toBe('gauche')
    expect(p.largeur).toBe(500 - 12 - 12)
    expect(p.left).toBe(12)
    expect(p.left + p.largeur).toBeLessThanOrEqual(500)
  })

  it('reste dans la bande utile quand l’appel est en bas', () => {
    const p = enMarge(ancre(760))!
    expect(p.top + p.hauteurMax).toBeLessThanOrEqual(BAS_UTILE)
    expect(p.top).toBeGreaterThanOrEqual(HAUT_UTILE)
  })

  it('ne passe jamais sous la barre de navigation', () => {
    const p = enMarge(ancre(0))!
    expect(p.top).toBeGreaterThanOrEqual(HAUT_UTILE)
  })

  it('borne sa hauteur à la bande utile, et défile en dedans au-delà', () => {
    const p = enMarge(ancre(300), 300, 5000)!
    expect(p.hauteurMax).toBe(BAS_UTILE - HAUT_UTILE)
  })

  it('ne rend jamais une hauteur négative', () => {
    const p = placerEnMarge({
      ancre: ancre(10), largeur: 100, largeurMin: 100, hauteurSouhaitee: 600,
      vue: { largeur: 1200, hauteur: 60 }, hautNavbar: NAVBAR, colonne: COLONNE,
    })
    expect(p!.hauteurMax).toBeGreaterThanOrEqual(0)
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
