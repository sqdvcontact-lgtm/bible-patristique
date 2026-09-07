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
