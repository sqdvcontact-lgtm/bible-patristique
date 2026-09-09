import { describe, it, expect } from 'vitest'
import {
  positionCellule, largeurGabarit,
  LARGEUR_CELLULE, HAUTEUR_CELLULE, MARGE_CELLULE, COTE_BOUTON, GOUTTIERE_BOUTON,
} from './celluleActions'

const ECRAN = 1280
const SOMMET = 56

describe('position de la cellule d’actions', () => {
  it('se pose à droite quand la place y est', () => {
    const p = positionCellule({ top: 300, right: 800 }, ECRAN)
    expect(p.cote).toBe('droite')
    expect(p.left).toBe(800 + MARGE_CELLULE)
    expect(p.top).toBe(296)
  })

  it('bascule au-dessus quand la droite est trop étroite', () => {
    // 1200 + 6 + 132 = 1338 > 1280 : ça ne tient pas.
    const p = positionCellule({ top: 300, right: 1200 }, ECRAN)
    expect(p.cote).toBe('dessus')
    expect(p.top).toBe(300 - HAUTEUR_CELLULE - MARGE_CELLULE)
  })

  // ⛔ Le cœur de la règle : au-dessus, la cellule ne doit RIEN recouvrir de la ligne.
  it('ne recouvre jamais la ligne quand elle passe au-dessus', () => {
    const ligne = { top: 300, right: 1200 }
    const p = positionCellule(ligne, ECRAN)
    expect(p.top + HAUTEUR_CELLULE).toBeLessThanOrEqual(ligne.top)
  })

  it('à droite non plus, elle ne mord pas sur la ligne', () => {
    const ligne = { top: 300, right: 800 }
    const p = positionCellule(ligne, ECRAN)
    expect(p.left).toBeGreaterThanOrEqual(ligne.right)
  })

  it('reste dans l’écran quand elle passe au-dessus', () => {
    const p = positionCellule({ top: 300, right: 1279 }, ECRAN)
    expect(p.left).toBeGreaterThanOrEqual(MARGE_CELLULE)
    expect(p.left + LARGEUR_CELLULE).toBeLessThanOrEqual(ECRAN)
  })

  it('ne monte pas derrière la barre de navigation', () => {
    expect(positionCellule({ top: 10, right: 800 }, ECRAN, SOMMET).top).toBe(SOMMET)
    expect(positionCellule({ top: 10, right: 1200 }, ECRAN, SOMMET).top).toBe(SOMMET)
  })

  // Une ligne COURTE garde sa cellule à droite, même dans une fenêtre étroite : ce qui
  // décide n'est pas la largeur de l'écran mais la place qui reste après la ligne.
  it('garde la droite pour une ligne courte dans une fenêtre étroite', () => {
    expect(positionCellule({ top: 200, right: 120 }, 320).cote).toBe('droite')
  })

  it('bascule au-dessus pour une ligne longue dans une fenêtre étroite, sans sortir', () => {
    const p = positionCellule({ top: 200, right: 250 }, 320)
    expect(p.cote).toBe('dessus')
    expect(p.left).toBeGreaterThanOrEqual(MARGE_CELLULE)
    expect(p.left + LARGEUR_CELLULE).toBeLessThanOrEqual(320)
  })

  // Le cas exact de l'ancien défaut : `Math.min(right + 6, ecran - 132)` rendait 1148,
  // c'est-à-dire 52px À GAUCHE de la fin de la ligne, donc par-dessus le texte.
  it('ne reproduit pas le bridage qui ramenait la cellule sur le texte', () => {
    const ligne = { top: 300, right: 1200 }
    const bride = Math.min(ligne.right + MARGE_CELLULE, ECRAN - LARGEUR_CELLULE)
    expect(bride).toBeLessThan(ligne.right)          // l'ancien calcul mordait bien
    const p = positionCellule(ligne, ECRAN)
    expect(p.cote).toBe('dessus')                     // le nouveau se déplace au lieu de mordre
  })
})

// ── L'ESPACE N'EST PAS TOUJOURS LA FENÊTRE ────────────────────────────────────
// Dans une grille de colonnes — la Polyglotte, les traductions en regard —, « à droite
// de la ligne » tombe sur la colonne voisine, c'est-à-dire sur un AUTRE texte.
describe('l’espace disponible', () => {
  // Une colonne du milieu, large de 300, dans une fenêtre de 1280.
  const COLONNE = { gauche: 400, droite: 700 }

  it('passe au-dessus dans une colonne, quelle que soit la largeur de la fenêtre', () => {
    const p = positionCellule({ top: 300, right: 700 }, { ...COLONNE, largeur: largeurGabarit(3) })
    expect(p.cote).toBe('dessus')
  })

  it('ne déborde jamais sur la colonne voisine', () => {
    const largeur = largeurGabarit(3)
    const p = positionCellule({ top: 300, right: 700 }, { ...COLONNE, largeur })
    expect(p.left).toBeGreaterThanOrEqual(COLONNE.gauche)
    expect(p.left + largeur).toBeLessThanOrEqual(COLONNE.droite)
  })

  // ⛔ Le contre-exemple, pour n'y pas revenir : borner à la FENÊTRE ne protège de rien
  // dans une colonne — la cellule se pose alors sur la traduction d'à côté.
  it('la fenêtre seule laisserait la cellule sur la colonne voisine', () => {
    const p = positionCellule({ top: 300, right: 700 }, ECRAN)
    expect(p.cote).toBe('droite')
    expect(p.left).toBeGreaterThan(COLONNE.droite)
  })

  // Une colonne PLUS ÉTROITE que la cellule : on préfère déborder d'un cheveu à droite
  // plutôt que d'aller couvrir la colonne d'à côté par la gauche.
  it('garde la borne gauche quand la colonne est plus étroite que la cellule', () => {
    const etroite = { gauche: 400, droite: 440, largeur: largeurGabarit(3) }
    const p = positionCellule({ top: 300, right: 440 }, etroite)
    expect(p.left).toBe(etroite.gauche)
  })

  it('respecte le sommet passé par la page (un en-tête collant, non la seule navbar)', () => {
    const p = positionCellule({ top: 100, right: 700 }, { ...COLONNE, sommet: 140 })
    expect(p.top).toBe(140)
  })
})

// ── LE GABARIT SE COMPTE ──────────────────────────────────────────────────────
describe('le gabarit de la cellule', () => {
  it('grandit d’un bouton et de sa gouttière à chaque bouton de plus', () => {
    expect(largeurGabarit(4) - largeurGabarit(3)).toBe(COTE_BOUTON + GOUTTIERE_BOUTON)
  })

  it('un bouton seul n’a pas de gouttière', () => {
    expect(largeurGabarit(1)).toBeLessThan(largeurGabarit(2))
    expect(largeurGabarit(0)).toBe(largeurGabarit(1))
  })

  // ⚠️ Une cellule plus étroite tient à droite là où la large passait au-dessus : c'est
  // tout l'intérêt de la mesurer plutôt que de lui supposer son plus grand gabarit.
  it('une cellule plus étroite tient là où la plus large ne tenait pas', () => {
    // 1200 + 6 + 88 = 1294 : quatre boutons ne tiennent pas. Avec deux, 1254 : ils tiennent.
    const ligne = { top: 300, right: 1200 }
    expect(positionCellule(ligne, { droite: ECRAN, largeur: largeurGabarit(4) }).cote).toBe('dessus')
    expect(positionCellule(ligne, { droite: ECRAN, largeur: largeurGabarit(2) }).cote).toBe('droite')
  })
})

// ── ET SI LE DESSUS EST BOUCHÉ ? ──────────────────────────────────────────────
// La règle n'avait que deux réponses, et bornait la troisième au sommet : une ligne
// posée juste sous un en-tête collant recevait donc sa cellule PAR-DESSUS. Relevé en
// mesurant la Polyglotte servie, le 2026-09-07 — le premier verset visible, c'est-à-dire
// celui qu'on survole d'abord en arrivant sur la page.
describe('quand ni la droite ni le dessus ne sont libres', () => {
  const COLONNE = { gauche: 400, droite: 700, largeur: largeurGabarit(3), sommet: 139 }
  // Le cas mesuré : cellule de tableau haute de 60, posée AU RAS de l'en-tête collant.
  const AU_RAS = { top: 139, right: 700, bottom: 199 }

  it('passe DESSOUS', () => {
    expect(positionCellule(AU_RAS, { ...COLONNE, pied: 900 }).cote).toBe('dessous')
  })

  it('ne recouvre alors aucun pixel de la ligne', () => {
    const p = positionCellule(AU_RAS, { ...COLONNE, pied: 900 })
    expect(p.top).toBeGreaterThanOrEqual(AU_RAS.bottom)
  })

  // ⛔ Le défaut exact, pour n'y pas revenir : borner au sommet posait la cellule SUR le
  // texte, et le côté annoncé restait « dessus ».
  it('ne se borne plus au sommet, qui la posait sur le texte', () => {
    const p = positionCellule(AU_RAS, { ...COLONNE, pied: 900 })
    expect(p.top).not.toBe(COLONNE.sommet)
  })

  // ⚠️ Un bloc plus haut que la fenêtre n'a ni dessus ni dessous VISIBLES : une cellule
  // posée hors de l'écran vaut moins qu'une cellule qui mord. On revient au sommet.
  it('revient au sommet quand le bloc dépasse la fenêtre des deux côtés', () => {
    const geant = { top: 139, right: 700, bottom: 2000 }
    const p = positionCellule(geant, { ...COLONNE, pied: 900 })
    expect(p.cote).toBe('dessus')
    expect(p.top).toBe(COLONNE.sommet)
  })

  // ⚠️ Sans « pied », on ne sait pas où finit l'écran : on descend quand même, ce qui
  // reste préférable à mordre. C'est le cas des appelants qui ne le passent pas.
  it('descend sans borne de pied plutôt que de mordre', () => {
    expect(positionCellule(AU_RAS, COLONNE).cote).toBe('dessous')
  })

  // ⛔ Mais on ne descend pas sous un bloc dont on IGNORE le bas : la forme d'origine,
  // « { top, right } », garde le bornage au sommet plutôt qu'une pose au jugé.
  it('sans le bas de la ligne, garde la règle d’hier', () => {
    const p = positionCellule({ top: 139, right: 700 }, { ...COLONNE, pied: 900 })
    expect(p.cote).toBe('dessus')
    expect(p.top).toBe(COLONNE.sommet)
  })

  // Le dessus garde la main dès qu'il y a la place : on ne descend pas par défaut.
  it('garde le dessus quand il est libre', () => {
    const bas = { top: 400, right: 700, bottom: 460 }
    expect(positionCellule(bas, { ...COLONNE, pied: 900 }).cote).toBe('dessus')
  })
})

// ⛔ LA BANDE DE LECTURE D’UN TÉLÉPHONE. Mesures relevées sur la page d’une œuvre à
// 375 × 667 : la barre de navigation finit à 56, la barre « Sommaire » à 97, et la barre
// « Références & commentaires » ouvre à 626. Les deux dernières sont du CHROME FIXE à
// `Z_FENETRE`, et la cellule est passée SOUS elles le 2026-09-09 : une cellule posée dans
// l’une de ces deux bandes ne les couvre plus, elle disparaît derrière.
describe('la bande laissée par le chrome fixe d’une page', () => {
  const TELEPHONE = { droite: 375, sommet: 97, pied: 626 }

  // ⛔ Le cas qui a imposé la règle : sans le bas de la barre haute, la cellule se pose
  //    à 66 — c’est-à-dire DANS la bande 56-97, derrière la barre. Avec, elle descend.
  it('ne se pose pas derrière la barre haute', () => {
    const ligne = { top: 100, right: 359, bottom: 140 }
    expect(positionCellule(ligne, { ...TELEPHONE, sommet: 56 }).top).toBe(66)
    expect(positionCellule(ligne, TELEPHONE).top).toBeGreaterThanOrEqual(97)
  })

  // ⛔ Le PIED bornait la seule descente ; il borne désormais les trois branches.
  it('ne se pose pas derrière la barre basse, même à droite', () => {
    const p = positionCellule({ top: 640, right: 200 }, TELEPHONE)
    expect(p.cote).toBe('droite')
    expect(p.top + HAUTEUR_CELLULE).toBeLessThanOrEqual(626)
  })

  it('ni au-dessus d’une ligne que la barre basse recouvre', () => {
    const p = positionCellule({ top: 700, right: 370 }, TELEPHONE)
    expect(p.cote).toBe('dessus')
    expect(p.top + HAUTEUR_CELLULE).toBeLessThanOrEqual(626)
  })

  // ⚠️ Une bande plus courte que la cellule : le SOMMET l’emporte. Mieux vaut une
  //    cellule qui mord qu’une cellule qu’on ne voit pas.
  it('mord plutôt que de disparaître quand la bande est trop courte', () => {
    const p = positionCellule({ top: 300, right: 370 }, { ...TELEPHONE, sommet: 97, pied: 110 })
    expect(p.top).toBe(97)
  })

  // ⚠️ Sans pied déclaré, rien ne bouge : les appelants qui n’en passent pas gardent la
  //    règle d’hier, et c’est le cas de toute page sans chrome fixe.
  it('ne change rien à qui ne déclare pas de pied', () => {
    const p = positionCellule({ top: 640, right: 200 }, { droite: 375, sommet: 97 })
    expect(p.top).toBe(636)
  })
})
