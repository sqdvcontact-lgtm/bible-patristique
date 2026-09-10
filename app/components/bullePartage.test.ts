import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { hauteurDeLaBulle, largeurDeLaBulle } from './BullePartage'

// ── LA GARDE DE LA BULLE DE PARTAGE ──────────────────────────────────────────
//
// ⛔ LA MESURE EST ÉCRITE DEUX FOIS, dans la feuille et dans le code, et il le faut :
// la feuille POSE la géométrie, le code la CALCULE avant le rendu pour placer la bulle
// et la borner à l'écran. Deux copies d'une même mesure divergent au premier réglage,
// et la bulle se placerait alors sur une largeur qu'elle n'a pas — c'est la garde que
// `teteVolet.test.ts` tient déjà entre la rangée d'actions et sa feuille, et
// `partIllustration.test.ts` entre la page et la chaîne d'images.

const CSS = readFileSync('app/globals.css', 'utf8')

describe('la géométrie de la bulle est celle de la feuille', () => {
  it('la feuille pose l’écart, le rembourrage et la cible que le code recopie', () => {
    // ⚠️ Si l'une de ces lignes change, ce sont `CIBLE_REM`, `ECART_REM` et `AIR_REM`
    // qu'il faut suivre, jamais ce test qu'il faut accorder.
    expect(CSS).toContain('gap: max(4px, 0.25rem);\n  padding: max(6px, 0.375rem);')
    expect(CSS).toContain('min-width: max(30px, 1.875rem);\n  min-height: max(30px, 1.875rem);')
    expect(CSS).toContain('.cs-canal-bulle svg { width: 1.3125rem; height: 1.3125rem; }')
  })

  it('compte n cibles, n−1 écarts, deux airs et deux filets', () => {
    // Racine 16 : le plancher absolu de la feuille et le rem coïncident — 30, 4 et 6.
    expect(largeurDeLaBulle(1, 16)).toBe(30 + 12 + 2)
    expect(largeurDeLaBulle(6, 16)).toBe(6 * 30 + 5 * 4 + 12 + 2)
    expect(largeurDeLaBulle(7, 16)).toBe(7 * 30 + 6 * 4 + 12 + 2)
    expect(hauteurDeLaBulle(16)).toBe(30 + 12 + 2)
    // Racine 22 (le plafond de la police fluide) : tout suit.
    expect(largeurDeLaBulle(7, 22)).toBeCloseTo(7 * 41.25 + 6 * 5.5 + 2 * 8.25 + 2, 5)
    expect(hauteurDeLaBulle(22)).toBeCloseTo(41.25 + 2 * 8.25 + 2, 5)
  })

  it('ne rend rien pour une bulle sans canal', () => {
    // ⚠️ Elle ne peut pas se produire — `CANAUX` n'est jamais vide — mais un placement
    // sur une largeur négative sortirait la bulle de l'écran sans rien dire.
    expect(largeurDeLaBulle(0, 16)).toBe(0)
  })

  it('tient dans la bande utile d’un téléphone', () => {
    // ⛔ Sept logos sur un écran de 375 px : la bulle en demande 236, marges comprises
    // (`placerFenetre` en réserve 12 de chaque côté). Au-delà, elle serait bornée et
    // ses derniers logos passeraient à la ligne.
    expect(largeurDeLaBulle(7, 16)).toBeLessThanOrEqual(375 - 2 * 12)
  })
})
