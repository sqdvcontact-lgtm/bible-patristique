import { describe, expect, it } from 'vitest'
import {
  chiffreRomain,
  choisirAlignement,
  comparaisonDisponible,
  dedupeDivisions,
  divisionVoisine,
  groupesSelonFiltre,
  libelleDivisionComparaison,
  libelleColonne,
  libelleLivreComparaison,
  membresOrdonnesParGroupe,
} from './comparaisonTraductionsUtils'
import type { AlignementDisponible } from './oeuvreTypes'

const alignement: AlignementDisponible = {
  alignmentSetId: 'set-generique',
  referenceTextId: 'texte-reference',
  alignedTextId: 'texte-aligne',
  referenceLabel: 'Version A',
  alignedLabel: 'Version B',
  referenceLangue: 'français',
  alignedLangue: 'français',
  niveau: 'segment',
  status: 'reviewed_ai',
}


describe('lecteur comparé multiversion', () => {
  it('propose la lecture parallèle seulement quand ses deux versions ont franchi la RLS', () => {
    expect(comparaisonDisponible([alignement])).toBe(true)
    expect(comparaisonDisponible([])).toBe(false)
  })

  it('choisit l’ensemble demandé sans dépendre d’un identifiant d’œuvre implicite', () => {
    const second = { ...alignement, alignmentSetId: 'autre-set' }
    expect(choisirAlignement([alignement, second], 'autre-set')).toEqual(second)
    expect(choisirAlignement([alignement], 'absent')).toEqual(alignement)
  })

  it('conserve chaque membre une fois et dans son ordre pour les deux colonnes', () => {
    const groupes = membresOrdonnesParGroupe([
      { alignment_id: 'g1', role: 'aligned', member_order: 2, segment_key: 'c2' },
      { alignment_id: 'g1', role: 'reference', member_order: 2, segment_key: 'm2' },
      { alignment_id: 'g1', role: 'aligned', member_order: 1, segment_key: 'c1' },
      { alignment_id: 'g1', role: 'reference', member_order: 1, segment_key: 'm1' },
    ])
    expect(groupes.get('g1')?.reference.map(membre => membre.segment_key)).toEqual(['m1', 'm2'])
    expect(groupes.get('g1')?.aligned.map(membre => membre.segment_key)).toEqual(['c1', 'c2'])
  })

  it('préserve les groupes 1:0 et 0:1 sans inventer de correspondant', () => {
    const groupes = membresOrdonnesParGroupe([
      { alignment_id: 'g-gap', role: 'reference', member_order: 1, segment_key: 'm1' },
    ])
    expect(groupes.get('g-gap')?.reference).toHaveLength(1)
    expect(groupes.get('g-gap')?.aligned).toEqual([])
  })

  it('filtre uniquement les groupes uncertain sans changer leur ordre', () => {
    const groupes = [
      { status: 'reviewed_ai', id: 'g1' },
      { status: 'uncertain', id: 'g2' },
      { status: 'uncertain', id: 'g3' },
    ]
    expect(groupesSelonFiltre(groupes, 'tous')).toEqual(groupes)
    expect(groupesSelonFiltre(groupes, 'uncertain').map(groupe => groupe.id)).toEqual(['g2', 'g3'])
  })
})

describe('parcours des divisions', () => {
  const rangs = [
    { book: 1, canonical_division_order: 1 },
    { book: 1, canonical_division_order: 1 },
    { book: 1, canonical_division_order: 2 },
    { book: 2, canonical_division_order: 1 },
  ]

  it('réduit les groupes à la liste ordonnée des divisions, sans doublon', () => {
    expect(dedupeDivisions(rangs)).toEqual([
      { book: 1, division: 1 }, { book: 1, division: 2 }, { book: 2, division: 1 },
    ])
  })

  it('passe d’un livre au suivant, et s’arrête aux extrémités', () => {
    const divisions = dedupeDivisions(rangs)
    expect(divisionVoisine(divisions, 1, 2, 1)).toEqual({ book: 2, division: 1 })
    expect(divisionVoisine(divisions, 1, 1, -1)).toBeNull()
    expect(divisionVoisine(divisions, 2, 1, 1)).toBeNull()
  })
})

describe('libellés', () => {
  // La Cité de Dieu compte vingt-deux livres et va jusqu'à la cinquante-quatrième
  // division : les anciennes tables closes s'arrêtaient bien avant.
  it('nomme les livres en toutes lettres au-delà du cinquième', () => {
    expect(libelleLivreComparaison(1)).toBe('PREMIER')
    expect(libelleLivreComparaison(12)).toBe('DOUZIÈME')
    expect(libelleLivreComparaison(22)).toBe('VINGT-DEUXIÈME')
  })

  it('compose le chiffre romain au lieu de le tabuler', () => {
    expect(chiffreRomain(4)).toBe('IV')
    expect(chiffreRomain(24)).toBe('XXIV')
    expect(chiffreRomain(54)).toBe('LIV')
    expect(chiffreRomain(1949)).toBe('MCMXLIX')
    expect(libelleDivisionComparaison(54)).toBe('LIV')
  })

  it('rend le nombre tel quel s’il ne peut pas être un rang', () => {
    expect(chiffreRomain(0)).toBe('0')
    expect(chiffreRomain(-3)).toBe('-3')
  })
})

describe('libelleColonne', () => {
  it('préfère le nom du traducteur au titre de version, qui est un pavé', () => {
    expect(libelleColonne(
      'La Consolation philosophique de Boèce : traduction nouvelle en prose et en vers, avec le texte en regard',
      'Louis Judicis de Mirandol', 1861,
    )).toBe('Louis Judicis de Mirandol, 1861')
  })

  it('ramène une responsabilité partagée à son premier nom', () => {
    expect(libelleColonne('Texte français', 'H. Barreau (livres I–XX) ; M. Charpentier (livres XXI–XXII)', null))
      .toBe('H. Barreau')
  })

  it('retombe sur le titre de version quand nul n’a traduit', () => {
    expect(libelleColonne('Texte latin', null, null)).toBe('Texte latin')
    expect(libelleColonne('Texte latin', '  ', null)).toBe('Texte latin')
  })
})
