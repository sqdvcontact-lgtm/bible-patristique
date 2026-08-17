import { describe, it, expect } from 'vitest'
import { estLangueOriginale, libelleTemoin, editionCourte, ordonnerTemoins } from './temoinsOeuvre'

describe('estLangueOriginale', () => {
  it('reconnaît le latin et le grec, quelle que soit la précision', () => {
    expect(estLangueOriginale('latin')).toBe(true)
    expect(estLangueOriginale('Latin')).toBe(true)
    expect(estLangueOriginale('grec')).toBe(true)
    expect(estLangueOriginale('grec ancien')).toBe(true)
  })

  it('tient le français pour une traduction', () => {
    expect(estLangueOriginale('français')).toBe(false)
    expect(estLangueOriginale(null)).toBe(false)
    expect(estLangueOriginale('')).toBe(false)
  })
})

describe('libelleTemoin', () => {
  // Cas réels : Boèce a deux traductions françaises, La Cité de Dieu un latin
  // sans traducteur.
  // Le libellé passe par `libelleTrad`, qui préfixe « Traduction par » : la ligne
  // du témoin se lit donc exactement comme la ligne principale de l'œuvre.
  it('annonce le traducteur quand il y en a un', () => {
    expect(libelleTemoin({ langue: 'français', traducteur: 'René de Ceriziers' }))
      .toBe('Traduction par René de Ceriziers')
  })

  it('annonce la langue quand nul n’a traduit', () => {
    expect(libelleTemoin({ langue: 'latin', traducteur: null })).toBe('Texte latin')
    expect(libelleTemoin({ langue: 'grec', traducteur: null })).toBe('Texte grec')
  })

  it('applique la règle du libellé de traducteur', () => {
    // « Sous la direction de… » ne se préfixe pas de « par » (charte, § traducteurs).
    expect(libelleTemoin({ langue: 'français', traducteur: 'Sous la direction de M. Jeannin ; traducteurs multiples' }))
      .toBe('Traduction sous la direction de M. Jeannin')
  })

  it('ne laisse jamais une ligne sans nom', () => {
    expect(libelleTemoin({ langue: null, traducteur: null })).toBe('Autre édition')
    expect(libelleTemoin({ langue: 'français', traducteur: '   ' })).toBe('Autre édition')
  })
})

describe('editionCourte', () => {
  it('donne l’année seule', () => {
    expect(editionCourte({ annee_edition: 1646 })).toBe('1646')
  })

  // Le libellé d'édition de Vivès tient en deux cents signes : on ne s'y rabat pas.
  it('ne dit rien sans année', () => {
    expect(editionCourte({ annee_edition: null })).toBeNull()
  })
})

describe('ordonnerTemoins', () => {
  const mirandol = { id: 'm', is_default: true, annee_edition: 1861 }
  const ceriziers = { id: 'c', is_default: false, annee_edition: 1646 }
  const sansAnnee = { id: 's', is_default: false, annee_edition: null }

  it('met le témoin par défaut en tête, malgré une date plus récente', () => {
    expect(ordonnerTemoins([ceriziers, mirandol]).map(t => t.id)).toEqual(['m', 'c'])
  })

  it('classe les autres du plus ancien au plus récent', () => {
    expect(ordonnerTemoins([{ ...mirandol, is_default: false }, ceriziers]).map(t => t.id))
      .toEqual(['c', 'm'])
  })

  it('ne modifie pas le tableau reçu', () => {
    const entree = [ceriziers, mirandol]
    ordonnerTemoins(entree)
    expect(entree.map(t => t.id)).toEqual(['c', 'm'])
  })

  it('accepte une année manquante sans se plaindre', () => {
    expect(ordonnerTemoins([sansAnnee, ceriziers]).map(t => t.id)).toEqual(['s', 'c'])
  })
})
