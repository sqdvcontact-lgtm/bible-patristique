import { describe, expect, it } from 'vitest'
import { adresseVueLiens, libelleAvecCompte, totalLiens, vueLiens } from './liensBibliques'

describe('la vue des liens bibliques', () => {
  it('lit une vue connue, et retombe sur les vérifications sinon', () => {
    expect(vueLiens('constituer')).toBe('constituer')
    expect(vueLiens('verifications')).toBe('verifications')
    expect(vueLiens(null)).toBe('verifications')
    expect(vueLiens('inconnue')).toBe('verifications')
  })

  it('écrit son adresse sans perdre la section ni les autres paramètres', () => {
    expect(adresseVueLiens('?onglet=liens', 'constituer')).toBe('/admin?onglet=liens&vue=constituer')
    expect(adresseVueLiens('?onglet=liens&vue=constituer&x=1', 'verifications')).toBe('/admin?onglet=liens&x=1')
    expect(adresseVueLiens('', 'constituer')).toBe('/admin?onglet=liens&vue=constituer')
  })
})

describe('les comptes', () => {
  it('ne se posent sur le libellé que connus', () => {
    expect(libelleAvecCompte('Vérifications', null)).toBe('Vérifications')
    expect(libelleAvecCompte('Vérifications', 0)).toBe('Vérifications (0)')
    expect(libelleAvecCompte('Constituer liens', 43)).toBe('Constituer liens (43)')
  })

  it('ne font un total que des deux files comptées', () => {
    expect(totalLiens(8, 43)).toBe(51)
    expect(totalLiens(0, 0)).toBe(0)
    expect(totalLiens(null, 43)).toBeNull()
    expect(totalLiens(8, null)).toBeNull()
  })
})
