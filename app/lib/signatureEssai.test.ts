import { describe, expect, it } from 'vitest'
import { NOM_ANONYME, colonnesSignature, nomReel, nomSigne, signatureDe } from './signatureEssai'

const profil = { pseudo: 'lecteur', nom: 'Durand', prenom: 'Marie' }

describe('signatureDe', () => {
  it('lit le pseudonyme quand rien n’est demandé', () => {
    expect(signatureDe({})).toBe('pseudonyme')
    expect(signatureDe({ anonyme: false, afficher_nom_reel: false })).toBe('pseudonyme')
    expect(signatureDe({ anonyme: null, afficher_nom_reel: null })).toBe('pseudonyme')
  })

  it('fait primer l’anonymat sur le nom réel', () => {
    // La contrainte interdit les deux à la fois ; si une ligne y échappait, on ne
    // montrerait pas un nom que l'auteur a voulu taire.
    expect(signatureDe({ anonyme: true, afficher_nom_reel: true })).toBe('anonyme')
  })
})

describe('colonnesSignature', () => {
  it('n’écrit jamais les deux colonnes vraies, et se relit', () => {
    for (const s of ['pseudonyme', 'nom_reel', 'anonyme'] as const) {
      const c = colonnesSignature(s)
      expect(c.anonyme && c.afficher_nom_reel).toBe(false)
      expect(signatureDe(c)).toBe(s)
    }
  })
})

describe('nomSigne', () => {
  it('tait tout quand la publication est anonyme, même avec un nom au profil', () => {
    expect(nomSigne({ anonyme: true }, profil)).toBe(NOM_ANONYME)
    expect(nomSigne({ anonyme: true, afficher_nom_reel: true }, profil)).toBe(NOM_ANONYME)
  })

  it('signe du nom réel quand il est demandé et connu', () => {
    expect(nomSigne({ afficher_nom_reel: true }, profil)).toBe('Marie Durand')
    expect(nomSigne({ afficher_nom_reel: true }, { ...profil, prenom: null })).toBe('Durand')
  })

  it('retombe sur le pseudonyme quand le nom est demandé mais absent', () => {
    expect(nomSigne({ afficher_nom_reel: true }, { pseudo: 'lecteur', nom: null })).toBe('lecteur')
  })

  it('signe du pseudonyme par défaut, et rend null sans profil', () => {
    expect(nomSigne({}, profil)).toBe('lecteur')
    expect(nomSigne({}, null)).toBeNull()
    expect(nomSigne({}, { pseudo: null })).toBeNull()
  })
})

describe('nomReel', () => {
  it('ne fabrique pas de nom sans nom de famille', () => {
    expect(nomReel({ prenom: 'Marie', nom: null })).toBeNull()
    expect(nomReel(undefined)).toBeNull()
  })
})
