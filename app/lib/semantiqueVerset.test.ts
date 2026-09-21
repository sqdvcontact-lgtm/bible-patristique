import { describe, expect, it } from 'vitest'
import {
  annotationsDuVerset,
  comptesDuChapitre,
  porteeCouvre,
  porteeRecoupeChapitre,
  versetsAnnotes,
  voisinAnnote,
  type AnnotationSemantique,
} from './semantiqueVerset'

function annotation(id: number, type: AnnotationSemantique['type'], debut: string, fin: string, cycleVie = 'actif'): AnnotationSemantique {
  return {
    id, type, portee: { id, debut, fin, note: null },
    importance: null, niveauSemantique: null, certitude: 'certaine', provenance: 'saisie_editoriale',
    validation: 'revu_ia', cycleVie, confianceTechnique: null, justification: null,
    creePar: null, validePar: null, valideLe: null, creeLe: '2026-09-21', misAJour: '2026-09-21',
    concept: null, autorite: null, litteraire: null,
  }
}

describe('portées', () => {
  it('couvre un verset entre ses bornes, par chapitre puis verset', () => {
    expect(porteeCouvre({ debut: 'GEN.14.1', fin: 'GEN.14.9' }, 'GEN.14.5')).toBe(true)
    expect(porteeCouvre({ debut: 'GEN.14.1', fin: 'GEN.14.9' }, 'GEN.14.10')).toBe(false)
    expect(porteeCouvre({ debut: 'GEN.1.30', fin: 'GEN.2.3' }, 'GEN.2.1')).toBe(true)
    expect(porteeCouvre({ debut: 'GEN.1.1', fin: 'GEN.1.1' }, 'EXO.1.1')).toBe(false)
  })
  it('recoupe un chapitre qu’elle traverse', () => {
    expect(porteeRecoupeChapitre({ debut: 'GEN.1.30', fin: 'GEN.3.3' }, 'GEN', 2)).toBe(true)
    expect(porteeRecoupeChapitre({ debut: 'GEN.1.30', fin: 'GEN.1.31' }, 'GEN', 2)).toBe(false)
  })
})

describe('chapitre', () => {
  const donnees = {
    livre: 'GEN', chapitre: 14, versets: ['GEN.14.1', 'GEN.14.2', 'GEN.14.3', 'GEN.14.4'],
    annotations: [
      annotation(1, 'concept', 'GEN.14.1', 'GEN.14.2'),
      annotation(2, 'autorite', 'GEN.14.4', 'GEN.14.4'),
      annotation(3, 'autorite', 'GEN.14.3', 'GEN.14.3', 'retire'),
    ],
    arbitrages: [],
  }
  it('ne compte et ne signale que les annotations actives', () => {
    expect(comptesDuChapitre(donnees.annotations)).toEqual({ concept: 1, autorite: 1, litteraire: 0 })
    expect(versetsAnnotes(donnees)).toEqual(['GEN.14.1', 'GEN.14.2', 'GEN.14.4'])
  })
  it('montre les inactives en inspection seulement', () => {
    expect(annotationsDuVerset(donnees.annotations, 'GEN.14.3', false)).toEqual([])
    expect(annotationsDuVerset(donnees.annotations, 'GEN.14.3', true).map(a => a.id)).toEqual([3])
  })
  it('va au voisin annoté, même depuis un verset qui ne l’est pas', () => {
    const annotes = versetsAnnotes(donnees)
    expect(voisinAnnote(annotes, 'GEN.14.3', 1)).toBe('GEN.14.4')
    expect(voisinAnnote(annotes, 'GEN.14.3', -1)).toBe('GEN.14.2')
    expect(voisinAnnote(annotes, 'GEN.14.4', 1)).toBeNull()
    expect(voisinAnnote(annotes, null, 1)).toBe('GEN.14.1')
  })
})
