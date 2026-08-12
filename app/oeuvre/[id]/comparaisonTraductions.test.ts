import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  choisirAlignement,
  comparaisonDisponible,
  groupesSelonFiltre,
  membresOrdonnesParGroupe,
} from './comparaisonTraductionsUtils'
import type { AlignementDisponible } from './oeuvreTypes'

const alignement: AlignementDisponible = {
  alignmentSetId: 'set-generique',
  referenceTextId: 'texte-reference',
  alignedTextId: 'texte-aligne',
  referenceLabel: 'Version A',
  alignedLabel: 'Version B',
  status: 'reviewed_ai',
}

const sourceParallele = readFileSync(new URL('./ComparaisonTraductions.tsx', import.meta.url), 'utf8')
const sourceLecteur = readFileSync(new URL('./OeuvreClient.tsx', import.meta.url), 'utf8')

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

  it('rend les deux traductions par le même composant et le même style de lecture', () => {
    expect(sourceParallele).toContain('STYLE_TEXTE_PARALLELE')
    expect(sourceParallele).toContain('<ColonneLecture membres=')
    expect(sourceParallele).not.toContain('texteAligneId')
    expect(sourceParallele).not.toContain("segment.id_texte === alignement.referenceTextId ?")
  })

  it('place les traductions parallèles parmi les modes de lecture', () => {
    expect(sourceLecteur).toContain('<span style={LABEL_VOLET}>Lecture</span>')
    expect(sourceLecteur).toContain('Traductions parallèles')
    expect(sourceLecteur).not.toContain('>Comparaison</span>')
  })
})
