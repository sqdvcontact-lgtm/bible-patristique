import { describe, it, expect } from 'vitest'
import { SEUIL_OPUSCULE, signesGroupe, estOpuscule, partagerOpuscules } from './opuscules'

// Un groupe de titre à une seule version, écrit court pour les cas de mesure.
const g = (...signes: (number | null)[]) => ({ versions: signes.map(nb_signes => ({ nb_signes })) })

describe('signesGroupe', () => {
  it('retient la version la plus longue du titre', () => {
    // « La Cité de Dieu » : traduction Barreau, et l'édition latine de Migne dont
    // seule la préface est intégrée.
    expect(signesGroupe(g(2481535, 1411))).toBe(2481535)
  })
  it('vaut null quand aucune version n’est mesurée', () => {
    expect(signesGroupe(g(null))).toBeNull()
    expect(signesGroupe(g(0))).toBeNull()
    expect(signesGroupe({ versions: [] })).toBeNull()
  })
})

describe('estOpuscule', () => {
  it('classe selon le seuil, bornes comprises', () => {
    expect(estOpuscule(g(SEUIL_OPUSCULE - 1))).toBe(true)
    expect(estOpuscule(g(SEUIL_OPUSCULE))).toBe(false)
  })
  it('ne replie jamais une œuvre non mesurée', () => {
    expect(estOpuscule(g(null))).toBe(false)
  })
  it('juge sur le titre entier, pas sur sa plus courte édition', () => {
    // Sans cette règle, la préface latine de Migne (1 411 signes) quitterait
    // « La Cité de Dieu » pour tomber dans les opuscules.
    expect(estOpuscule(g(2481535, 1411))).toBe(false)
  })
})

describe('partagerOpuscules', () => {
  // Longueurs réelles du corpus au 2026-08-16.
  const CHRYSOSTOME_BREFS = [10902, 15960, 18010, 25962, 28825, 29596, 32419, 34355, 37000, 37047, 38824]
  const CHRYSOSTOME_LONGS = [68724, 96555, 101801, 152779, 165339, 177824, 235582, 288356, 616555, 1716684, 1933993]

  it('sectionne l’étagère de Jean Chrysostome', () => {
    const p = partagerOpuscules([...CHRYSOSTOME_LONGS, ...CHRYSOSTOME_BREFS].map(n => g(n)))
    expect(p.opuscules).toHaveLength(11)
    expect(p.grandes).toHaveLength(11)
    expect(p.sectionne).toBe(true)
  })

  it('laisse entière l’étagère d’un auteur qui n’a que des textes brefs', () => {
    // Cyprien de Carthage (17 149) et Grégoire de Nazianze (29 556 ×2) : replier
    // les opuscules leur ferait une étagère vide.
    expect(partagerOpuscules([g(17149)]).sectionne).toBe(false)
    expect(partagerOpuscules([g(29556), g(29556)]).sectionne).toBe(false)
  })

  it('ne sectionne pas pour un opuscule isolé', () => {
    // Augustin : « Du Symbole » (35 458) contre quatre œuvres longues.
    const p = partagerOpuscules([g(35458), g(227291), g(880686), g(990600), g(2481535, 1411)])
    expect(p.opuscules).toHaveLength(1)
    expect(p.sectionne).toBe(false)
  })

  it('garde entière la série de Jérôme sur les petits prophètes', () => {
    // Abdias, Jonas, Joël : aucun n’est un opuscule au seuil retenu. À 60 000,
    // Abdias en serait devenu un et la série aurait été coupée.
    const p = partagerOpuscules([g(59534), g(101893), g(132117)])
    expect(p.opuscules).toHaveLength(0)
    expect(p.grandes).toHaveLength(3)
  })
})
