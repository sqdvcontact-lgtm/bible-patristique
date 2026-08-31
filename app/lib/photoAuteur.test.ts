import { describe, it, expect } from 'vitest'
import {
  CADRES_PORTRAIT, POS_CARTE_DEFAUT, POS_FICHE_DEFAUT, ZOOM_MAX, ZOOM_MIN,
  bornerPos, deplacerPos, parseAuteurPhotoPositions, stylePhotoAuteur, urlPortrait,
} from './photoAuteur'

describe('lecture de photo_position', () => {
  it('rend les défauts quand la colonne est vide', () => {
    expect(parseAuteurPhotoPositions(null)).toEqual({ carte: POS_CARTE_DEFAUT, fiche: POS_FICHE_DEFAUT })
    expect(parseAuteurPhotoPositions(undefined).carte).toEqual(POS_CARTE_DEFAUT)
  })

  it('lit les deux réglages quand ils sont là', () => {
    const lu = parseAuteurPhotoPositions({ carte: { x: 30, y: 10, scale: 1.4 }, fiche: { x: 60, y: 40, scale: 2 } })
    expect(lu.carte).toEqual({ x: 30, y: 10, scale: 1.4 })
    expect(lu.fiche).toEqual({ x: 60, y: 40, scale: 2 })
  })

  // Ancienne forme, d'un temps où l'on croyait qu'un seul réglage suffisait : ce
  // que l'auteur avait réglé vaut mieux qu'un défaut, on le reprend des deux côtés.
  it('reprend la forme plate pour les deux surfaces', () => {
    const lu = parseAuteurPhotoPositions({ x: 42, y: 8, scale: 1.2 })
    expect(lu.carte).toEqual({ x: 42, y: 8, scale: 1.2 })
    expect(lu.fiche).toEqual({ x: 42, y: 8, scale: 1.2 })
  })

  it('complète un réglage incomplet sans lever', () => {
    const lu = parseAuteurPhotoPositions({ carte: { x: 10 }, fiche: {} })
    expect(lu.carte).toEqual({ x: 10, y: POS_CARTE_DEFAUT.y, scale: 1 })
    expect(lu.fiche).toEqual(POS_FICHE_DEFAUT)
  })
})

describe('style de l’image', () => {
  it('vise le point réglé, et fait porter l’agrandissement sur ce point', () => {
    const s = stylePhotoAuteur({ x: 30, y: 70, scale: 1.5 })
    expect(s.objectPosition).toBe('30% 70%')
    expect(s.transform).toBe('scale(1.5)')
    // Sans cette origine, l'agrandissement chasserait le cadrage hors du cadre.
    expect(s.transformOrigin).toBe('30% 70%')
  })
})

describe('bornes du réglage', () => {
  it('garde le point dans l’image', () => {
    expect(bornerPos({ x: -20, y: 130, scale: 1 })).toEqual({ x: 0, y: 100, scale: 1 })
  })

  it('garde le zoom dans sa plage', () => {
    expect(bornerPos({ x: 50, y: 50, scale: 0.2 }).scale).toBe(ZOOM_MIN)
    expect(bornerPos({ x: 50, y: 50, scale: 99 }).scale).toBe(ZOOM_MAX)
  })
})

describe('glissé', () => {
  const base = { x: 50, y: 50, scale: 1 }

  // On tire l'IMAGE : tirer vers la droite montre ce qui était à gauche, donc le
  // point visé recule.
  it('déplace le point en sens inverse du geste', () => {
    const p = deplacerPos(base, 20, 0, 100, 200)
    expect(p.x).toBeLessThan(base.x)
    expect(p.y).toBe(base.y)
  })

  it('rapporte le geste à la taille du cadre', () => {
    // 20 px dans un cadre de 100 px de large = 20 % de l'image.
    expect(deplacerPos(base, 20, 0, 100, 200).x).toBeCloseTo(30, 5)
    // Les mêmes 20 px dans un cadre deux fois plus large n'en valent que 10 %.
    expect(deplacerPos(base, 20, 0, 200, 200).x).toBeCloseTo(40, 5)
  })

  it('devient plus fin à mesure qu’on agrandit', () => {
    const sansZoom = deplacerPos({ ...base }, 20, 0, 100, 200).x
    const avecZoom = deplacerPos({ ...base, scale: 2 }, 20, 0, 100, 200).x
    expect(base.x - avecZoom).toBeLessThan(base.x - sansZoom)
  })

  it('ne sort jamais des bornes, si grand que soit le geste', () => {
    const p = deplacerPos(base, -100000, 100000, 100, 200)
    expect(p.x).toBe(100)
    expect(p.y).toBe(0)
  })

  it('ne bouge pas quand le cadre n’est pas encore mesuré', () => {
    expect(deplacerPos(base, 30, 30, 0, 0)).toEqual(base)
  })
})

describe('cadres des surfaces', () => {
  it('décrit les deux surfaces qui montrent un portrait', () => {
    expect(Object.keys(CADRES_PORTRAIT).sort()).toEqual(['carte', 'fiche'])
  })

  it('donne à chacune des mesures et un réglage', () => {
    for (const [nom, c] of Object.entries(CADRES_PORTRAIT)) {
      expect(c.largeur, nom).toMatch(/^[\d.]+(rem|px)$/)
      expect(c.hauteur, nom).toMatch(/^[\d.]+(rem|px)$/)
      expect(['carte', 'fiche'], nom).toContain(c.reglage)
      expect(c.libelle.trim().length, nom).toBeGreaterThan(0)
    }
  })

  // ⛔ La surface « aperçu au survol » a été retirée le 2026-08-31 avec la carte
  // flottante qu'elle servait. Elle empruntait le réglage de la fiche ; la garde
  // qui le vérifiait est partie avec elle, et celle du dessus compte les surfaces.
  it('n’en laisse aucune sans réglage connu', () => {
    for (const c of Object.values(CADRES_PORTRAIT)) expect(CADRES_PORTRAIT[c.reglage]).toBeDefined()
  })
})

describe('adresse du portrait', () => {
  it('compose l’adresse du seau, avec ou sans version de cache', () => {
    expect(urlPortrait('https://x.supabase.co', 'A0047'))
      .toBe('https://x.supabase.co/storage/v1/object/public/auteurs/A0047.jpg')
    expect(urlPortrait('https://x.supabase.co', 'A0047', 12)).toMatch(/\.jpg\?v=12$/)
  })
})
