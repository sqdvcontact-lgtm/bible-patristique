import { describe, expect, it } from 'vitest'
import { ORIGINAUX_VIDES, composerOriginauxDisponibles, traductionAvecOriginal } from './originauxDisponibles'

// Les Douze Apôtres tels que la base les porte le 13 septembre 2026 : la Doctrine des
// Apôtres a son grec, le français de Laurent et le latin de Funk ; la Doctrina apostolorum
// est latine, traduction d'un original grec.
const textes = [
  { id_oeuvre: 'A0012O0002', langue: 'Grec', traducteur: null, statut: 'termine' },
  { id_oeuvre: 'A0012O0002', langue: 'Français', traducteur: 'Auguste Laurent', statut: 'termine' },
  { id_oeuvre: 'A0012O0002', langue: 'Latin', traducteur: 'Franz Xaver Funk', statut: 'termine' },
  { id_oeuvre: 'A0012O0003', langue: 'Latin', traducteur: null, statut: 'en_cours' },
  { id_oeuvre: 'RETIRE', langue: 'Grec', traducteur: null, statut: 'rejete' },
]
const originaux = composerOriginauxDisponibles([{ id_oeuvre: 'A0010O0001' }], textes)

describe('le texte original qu’une traduction offre aussi', () => {
  it('reconnaît l’original à sa langue, jamais au premier texte sans traducteur', () => {
    expect(traductionAvecOriginal({ id_oeuvre: 'A0012O0002', langue_originale: 'Grec', langue_trad: 'Français' }, originaux)).toBe(true)
    // Le latin de Funk a un traducteur : il ne tient pas lieu d'original.
    expect(traductionAvecOriginal({ id_oeuvre: 'A0012O0002', langue_originale: 'Latin', langue_trad: 'Français' }, originaux)).toBe(false)
    // La Doctrina apostolorum est latine, d'un original grec : elle n'offre aucun original.
    expect(traductionAvecOriginal({ id_oeuvre: 'A0012O0003', langue_originale: 'Grec', langue_trad: 'Latin' }, originaux)).toBe(false)
  })

  it('n’offre pas une version retirée', () => {
    expect(traductionAvecOriginal({ id_oeuvre: 'RETIRE', langue_originale: 'Grec', langue_trad: 'Français' }, originaux)).toBe(false)
  })

  it('garde le repli de la colonne héritée', () => {
    expect(traductionAvecOriginal({ id_oeuvre: 'A0010O0001', langue_originale: 'Latin', langue_trad: 'Français' }, originaux)).toBe(true)
  })

  it('ne propose pas à une édition originale le texte qu’elle est déjà', () => {
    expect(traductionAvecOriginal({ id_oeuvre: 'A0012O0003', langue_originale: 'Latin', langue_trad: null }, originaux)).toBe(false)
  })

  it('ne propose rien tant que les textes ne sont pas lus', () => {
    expect(traductionAvecOriginal({ id_oeuvre: 'A0012O0002', langue_originale: 'Grec', langue_trad: 'Français' }, ORIGINAUX_VIDES)).toBe(false)
  })
})
