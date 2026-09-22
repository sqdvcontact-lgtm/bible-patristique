import { describe, expect, it, vi } from 'vitest'

import FlecheChapitre, { RACCOURCIS, type CibleChapitre } from './FlecheChapitre'

const GN3: CibleChapitre = { livre: 'GEN', chapitre: 3, href: '/?livre=GEN&chapitre=3', nom: 'Genèse 3' }

describe('le raccourci clavier se dit au lecteur d’écran', () => {
  it('une flèche active annonce la touche qui fait le même geste', () => {
    for (const sens of ['precedent', 'suivant'] as const) {
      for (const variante of ['entete', 'bandeau'] as const) {
        const element = FlecheChapitre({ sens, variante, cible: GN3, onAller: vi.fn() })
        expect((element.props as Record<string, unknown>)['aria-keyshortcuts']).toBe(RACCOURCIS[sens])
      }
    }
    expect(RACCOURCIS).toEqual({ precedent: 'ArrowLeft', suivant: 'ArrowRight' })
  })

  it('une flèche inerte ne promet aucune touche', () => {
    const element = FlecheChapitre({ sens: 'suivant', variante: 'entete', cible: null, onAller: vi.fn() })
    expect((element.props as Record<string, unknown>)['aria-keyshortcuts']).toBeUndefined()
  })
})
