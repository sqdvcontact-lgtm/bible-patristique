import { describe, expect, it, vi } from 'vitest'
import {
  basculerChapeau,
  chapeauxEnTexte,
  clesDeSurface,
  niveauVide,
  niveauxOfferts,
  normaliserConfig,
  poserProfondeur,
  profondeurBornee,
  profondeurPresente,
  PROFONDEUR_MAX,
} from './niveauxAffichage'

/**
 * LE PANNEAU DES NIVEAUX — l'épreuve de ce qu'il PROMET.
 *
 * ⚠️ Les décors viennent de la base, relevés le 2026-09-05, et ils sont nommés : ce sont
 * eux qui produisaient les pastilles à la fois vertes et éteintes, et l'auteur les avait
 * sous les yeux. Aucune œuvre n'est codée en dur dans le module.
 */

/** Du combat chrétien (A0010O0055) : un seul niveau affiché, TROIS chapeaux enregistrés. */
const COMBAT = { sommaire: 1, corps: 1, txtSommaire: [true, true, true, false, false], txtCorps: [true, true, true, false, false] }
/** La Somme théologique (A0013O0002) : sommaire 2, corps 5, et les CINQ chapeaux allumés. */
const SOMME = { sommaire: 2, corps: 5, txtSommaire: [true, true, true, true, true], txtCorps: [true, true, true, true, true] }

describe('ce que chaque surface sait rendre', () => {
  it('le sommaire descend au niveau 3, le corps au niveau 4', () => {
    expect(PROFONDEUR_MAX.sommaire).toBe(3)
    expect(PROFONDEUR_MAX.corps).toBe(4)
    expect(niveauxOfferts('sommaire')).toEqual([1, 2, 3])
    expect(niveauxOfferts('corps')).toEqual([1, 2, 3, 4])
  })

  it('ne promet jamais un niveau 5, qu’aucun segment du corpus ne porte', () => {
    expect(niveauxOfferts('sommaire')).not.toContain(5)
    expect(niveauxOfferts('corps')).not.toContain(5)
    expect(profondeurBornee(5, 'corps')).toBe(4)
    expect(profondeurBornee(5, 'sommaire')).toBe(3)
  })

  it('borne aussi par le bas : jamais de niveau 0 ni de valeur absente', () => {
    expect(profondeurBornee(0, 'corps')).toBe(1)
    expect(profondeurBornee(-3, 'sommaire')).toBe(1)
    expect(profondeurBornee(null, 'corps')).toBe(1)
    expect(profondeurBornee(undefined, 'sommaire')).toBe(1)
    expect(profondeurBornee(2.7, 'corps')).toBe(2)
  })

  it('nomme les deux champs de chaque surface', () => {
    expect(clesDeSurface('sommaire')).toEqual({ profondeur: 'sommaire', chapeaux: 'txtSommaire' })
    expect(clesDeSurface('corps')).toEqual({ profondeur: 'corps', chapeaux: 'txtCorps' })
  })
})

describe('un chapeau ne reste jamais coché hors de portée', () => {
  it('éteint à l’ouverture ce que la base garde allumé au-dessus du niveau', () => {
    // Le cas que l'auteur voyait : trois chapeaux verts sous un seul niveau affiché,
    // dont deux grisés — donc impossibles à décocher.
    const config = normaliserConfig(COMBAT)
    expect(config.txtSommaire).toEqual([true, false, false, false, false])
    expect(config.txtCorps).toEqual([true, false, false, false, false])
  })

  it('borne la profondeur ET les chapeaux de la Somme théologique', () => {
    const config = normaliserConfig(SOMME)
    expect(config.corps).toBe(4)
    expect(config.sommaire).toBe(2)
    expect(config.txtSommaire).toEqual([true, true, false, false, false])
    expect(config.txtCorps).toEqual([true, true, true, true, false])
  })

  it('AUCUN chapeau allumé ne dépasse jamais sa profondeur, quel que soit le décor', () => {
    for (const brut of [COMBAT, SOMME,
      { sommaire: 1, corps: 2, txtSommaire: [false, true, false, false, false], txtCorps: [false, false, true, false, false] },
      { sommaire: 3, corps: 4, txtSommaire: [true, true, true, true, true], txtCorps: [true, true, true, true, true] },
    ]) {
      const config = normaliserConfig(brut)
      config.txtSommaire.forEach((actif, i) => { if (actif) expect(i + 1).toBeLessThanOrEqual(config.sommaire) })
      config.txtCorps.forEach((actif, i) => { if (actif) expect(i + 1).toBeLessThanOrEqual(config.corps) })
    }
  })

  it('baisser le niveau éteint les chapeaux qui tombent hors de portée', () => {
    const config = normaliserConfig({ sommaire: 3, corps: 4, txtSommaire: [true, true, true, false, false], txtCorps: [true, true, true, true, false] })
    const baisse = poserProfondeur(config, 'sommaire', 1)
    expect(baisse.sommaire).toBe(1)
    expect(baisse.txtSommaire).toEqual([true, false, false, false, false])
    // ⛔ Et le corps ne bouge pas : les deux surfaces se règlent séparément.
    expect(baisse.txtCorps).toEqual([true, true, true, true, false])
  })

  it('remonter le niveau ne RALLUME rien tout seul', () => {
    const config = normaliserConfig({ sommaire: 3, corps: 1, txtSommaire: [true, true, true, false, false], txtCorps: [] })
    const remonte = poserProfondeur(poserProfondeur(config, 'sommaire', 1), 'sommaire', 3)
    expect(remonte.sommaire).toBe(3)
    expect(remonte.txtSommaire).toEqual([true, false, false, false, false])
  })

  it('bascule un chapeau dans les deux sens, et ignore ce qui est hors de portée', () => {
    const config = normaliserConfig({ sommaire: 2, corps: 2, txtSommaire: [], txtCorps: [] })
    const allume = basculerChapeau(config, 'sommaire', 2)
    expect(allume.txtSommaire).toEqual([false, true, false, false, false])
    expect(basculerChapeau(allume, 'sommaire', 2).txtSommaire).toEqual([false, false, false, false, false])
    // Hors de portée : rien ne change, et l'objet est rendu tel quel.
    expect(basculerChapeau(config, 'sommaire', 3)).toBe(config)
    expect(basculerChapeau(config, 'sommaire', 0)).toBe(config)
  })

  it('rend la forme d’enregistrement de la base, toujours à cinq positions', () => {
    expect(chapeauxEnTexte([true, false, true])).toBe('1,0,1,0,0')
    expect(chapeauxEnTexte(normaliserConfig(COMBAT).txtSommaire)).toBe('1,0,0,0,0')
    expect(chapeauxEnTexte([])).toBe('0,0,0,0,0')
  })
})

describe('la sonde des niveaux présents', () => {
  it('s’arrête au premier niveau absent et ne paie ce prix qu’une fois', async () => {
    // Décor de la Somme théologique : trois niveaux, et le quatrième coûte 3,1 s.
    const sonder = vi.fn(async (n: number) => n <= 3)
    expect(await profondeurPresente(sonder)).toBe(3)
    expect(sonder).toHaveBeenCalledTimes(4)
    expect(sonder.mock.calls.map(c => c[0])).toEqual([1, 2, 3, 4])
  })

  it('ne sonde qu’une fois une œuvre sans aucun niveau', async () => {
    // Cyprien (A0018O0001) et le grec de Morel : aucun `ref_niv1` du tout.
    const sonder = vi.fn(async () => false)
    expect(await profondeurPresente(sonder)).toBe(0)
    expect(sonder).toHaveBeenCalledTimes(1)
  })

  it('⛔ une sonde en ÉCHEC ne vaut pas « niveau absent »', async () => {
    // C'est le défaut intermittent : `data` nul sur une requête refusée ou expirée,
    // lu comme un niveau qui n'existe pas.
    const sonder = vi.fn(async (n: number) => (n === 3 ? null : true))
    expect(await profondeurPresente(sonder)).toBeNull()
  })

  it('ne dépasse jamais le maximum qu’on lui donne', async () => {
    const sonder = vi.fn(async () => true)
    expect(await profondeurPresente(sonder, 4)).toBe(4)
    expect(sonder).toHaveBeenCalledTimes(4)
  })
})

describe('ce que le panneau grise', () => {
  it('signale un niveau creux', () => {
    expect(niveauVide(2, 3, false)).toBe(true)
    expect(niveauVide(2, 2, false)).toBe(false)
  })

  it('⛔ ne grise JAMAIS le niveau choisi', () => {
    // Cyprien : aucun niveau en base, et le réglage vaut pourtant 1. Grisé, il devenait
    // une pastille verte à 40 % — cochée et éteinte à la fois.
    expect(niveauVide(0, 1, true)).toBe(false)
    expect(niveauVide(0, 1, false)).toBe(true)
  })

  it('⛔ ne grise RIEN tant que la sonde n’a pas répondu, ou si elle a échoué', () => {
    for (const n of [1, 2, 3, 4]) expect(niveauVide(null, n, false)).toBe(false)
  })
})
