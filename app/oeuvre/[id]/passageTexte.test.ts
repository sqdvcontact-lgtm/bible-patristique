import { describe, expect, it } from 'vitest'
import { adresseAvecPosition, annoncerBascule, basculeEnAttente, reprendreBascule } from './passageTexte'

describe('adresseAvecPosition', () => {
  it('emporte le niveau et le groupe, en gardant ce que l’adresse portait', () => {
    expect(adresseAvecPosition('/oeuvre/A0010O0001?texte=A0010O0001T0001&mt=la', {
      niv1: 'Livre premier', groupe: 'A0010O0001-CSEL33-AL-0012', cle: 'LEGACY:533731',
    })).toBe('/oeuvre/A0010O0001?texte=A0010O0001T0001&mt=la&niv1=Livre+premier&groupe=A0010O0001-CSEL33-AL-0012')
  })

  it('ne pose la clé qu’à défaut de groupe', () => {
    expect(adresseAvecPosition('/oeuvre/A0010O0001', { niv1: null, groupe: null, cle: 'A0010O0102:12' }))
      .toBe('/oeuvre/A0010O0001?cle=A0010O0102%3A12')
  })

  it('rend l’adresse telle quelle quand rien n’est su', () => {
    expect(adresseAvecPosition('/oeuvre/A0064O0001', { niv1: null, groupe: null, cle: null })).toBe('/oeuvre/A0064O0001')
    expect(adresseAvecPosition('/oeuvre/A0064O0001?mt=bilingue', { niv1: '', groupe: '', cle: '' })).toBe('/oeuvre/A0064O0001?mt=bilingue')
  })

  it('garde le sentinelle des liminaires, que le serveur reconnaît', () => {
    expect(adresseAvecPosition('/oeuvre/X', { niv1: '__LIMINAIRES__', groupe: null, cle: null })).toBe('/oeuvre/X?niv1=__LIMINAIRES__')
  })
})

describe('la bascule annoncée au départ et reprise à l’arrivée', () => {
  it('se reprend une seule fois', () => {
    annoncerBascule({ defilement: 1200, hauteurTete: 96 }, 1_000)
    expect(basculeEnAttente(1_050)).toBe(true)
    expect(basculeEnAttente(1_050)).toBe(true)
    expect(reprendreBascule(1_100)).toEqual({ defilement: 1200, hauteurTete: 96, instant: 1_000 })
    expect(basculeEnAttente(1_100)).toBe(false)
    expect(reprendreBascule(1_100)).toBeNull()
  })

  it('se périme : une navigation interrompue ne s’applique pas au montage suivant', () => {
    annoncerBascule({ defilement: 300, hauteurTete: null }, 1_000)
    expect(basculeEnAttente(1_000 + 19_999)).toBe(true)
    expect(basculeEnAttente(1_000 + 20_000)).toBe(false)
    expect(reprendreBascule(1_000 + 20_000)).toBeNull()
  })
})
