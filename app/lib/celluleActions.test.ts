import { describe, it, expect } from 'vitest'
import { positionCellule, LARGEUR_CELLULE, HAUTEUR_CELLULE, MARGE_CELLULE } from './celluleActions'

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
