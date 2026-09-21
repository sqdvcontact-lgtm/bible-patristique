import { describe, expect, it } from 'vitest'

import { chapitreVoisin, sensDeLaTouche, type ContexteVoisins, type FoyerLu, type ToucheLue } from './chapitresVoisins'

const ORDRE = ['GEN', 'EXO', 'TOB', 'SIR', 'MAL', 'MAT', 'MRK', 'REV']
const CHAPITRES = { GEN: 50, EXO: 40, TOB: 14, SIR: 51, MAL: 4, MAT: 28, MRK: 16, REV: 22 }

function ctx(modifs: Partial<ContexteVoisins> = {}): ContexteVoisins {
  return { ordre: ORDRE, chapitres: CHAPITRES, absents: new Set<string>(), ...modifs }
}

describe('dans un livre', () => {
  it('les flèches mènent au chapitre d’avant et d’après', () => {
    expect(chapitreVoisin('GEN', 25, 'precedent', ctx())).toEqual({ livre: 'GEN', chapitre: 24 })
    expect(chapitreVoisin('GEN', 25, 'suivant', ctx())).toEqual({ livre: 'GEN', chapitre: 26 })
  })

  it('un chapitre au-delà du dernier ramène au dernier', () => {
    expect(chapitreVoisin('MAL', 9, 'precedent', ctx())).toEqual({ livre: 'MAL', chapitre: 4 })
  })
})

describe('au bout d’un livre, le livre voisin', () => {
  it('Mt 28 mène à Mc 1, et Mc 1 à Mt 28', () => {
    expect(chapitreVoisin('MAT', 28, 'suivant', ctx())).toEqual({ livre: 'MRK', chapitre: 1 })
    expect(chapitreVoisin('MRK', 1, 'precedent', ctx())).toEqual({ livre: 'MAT', chapitre: 28 })
  })

  it('un livre que la bible lue ne porte pas se saute', () => {
    const segond = ctx({ absents: new Set(['TOB', 'SIR']) })
    expect(chapitreVoisin('EXO', 40, 'suivant', segond)).toEqual({ livre: 'MAL', chapitre: 1 })
    expect(chapitreVoisin('MAL', 1, 'precedent', segond)).toEqual({ livre: 'EXO', chapitre: 40 })
  })

  it('un livre que l’ossature ne sait pas rendre se saute aussi', () => {
    const sansTobie = ctx({ chapitres: { ...CHAPITRES, TOB: 0 } })
    expect(chapitreVoisin('EXO', 40, 'suivant', sansTobie)).toEqual({ livre: 'SIR', chapitre: 1 })
  })

  it('le dernier chapitre d’un deutérocanonique vient de l’ossature', () => {
    expect(chapitreVoisin('MAL', 1, 'precedent', ctx())).toEqual({ livre: 'SIR', chapitre: 51 })
  })
})

describe('les bornes réelles', () => {
  it('Gn 1 et Ap 22 : aucune flèche', () => {
    expect(chapitreVoisin('GEN', 1, 'precedent', ctx())).toBeNull()
    expect(chapitreVoisin('REV', 22, 'suivant', ctx())).toBeNull()
  })

  it('le premier et le dernier livre que la bible porte font la borne', () => {
    const nt = ctx({ absents: new Set(['GEN', 'EXO', 'TOB', 'SIR', 'MAL']) })
    expect(chapitreVoisin('MAT', 1, 'precedent', nt)).toBeNull()
    const at = ctx({ absents: new Set(['MAT', 'MRK', 'REV']) })
    expect(chapitreVoisin('MAL', 4, 'suivant', at)).toBeNull()
  })
})

describe('tant qu’on ne sait pas', () => {
  it('sans la liste des livres absents, la flèche ne quitte pas le livre', () => {
    const inconnu = ctx({ absents: null })
    expect(chapitreVoisin('MAT', 28, 'suivant', inconnu)).toBeNull()
    expect(chapitreVoisin('MRK', 1, 'precedent', inconnu)).toBeNull()
    expect(chapitreVoisin('MAT', 27, 'suivant', inconnu)).toEqual({ livre: 'MAT', chapitre: 28 })
  })

  it('sans l’ossature, un livre protocanonique se lit au repli', () => {
    expect(chapitreVoisin('MAT', 28, 'suivant', ctx({ chapitres: null }))).toEqual({ livre: 'MRK', chapitre: 1 })
  })

  it('sans l’ossature, un deutérocanonique ne saute jamais au livre suivant', () => {
    const sansOssature = ctx({ chapitres: null })
    expect(chapitreVoisin('SIR', 1, 'suivant', sansOssature)).toEqual({ livre: 'SIR', chapitre: 2 })
    // Son dernier chapitre n'est pas connu : on ne sait pas où aller en reculant depuis Malachie.
    expect(chapitreVoisin('MAL', 1, 'precedent', sansOssature)).toBeNull()
  })

  it('un livre hors de l’ordre ne mène à aucun autre', () => {
    expect(chapitreVoisin('XYZ', 1, 'suivant', ctx({ chapitres: { XYZ: 1 } }))).toBeNull()
  })
})

// ── Les touches ← et → ───────────────────────────────────────────────────────

function touche(key: string, modifs: Partial<ToucheLue> = {}): ToucheLue {
  return { key, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, ...modifs }
}

/** Un foyer qui répond « oui » aux sélecteurs qu'on lui nomme. */
function foyer(dans: string | null, editable = false): FoyerLu {
  return { isContentEditable: editable, closest: (s: string) => (dans && s.split(', ').includes(dans) ? {} : null) }
}

describe('sensDeLaTouche', () => {
  it('← et → changent de chapitre, les autres touches non', () => {
    expect(sensDeLaTouche(touche('ArrowLeft'), null, false)).toBe('precedent')
    expect(sensDeLaTouche(touche('ArrowRight'), foyer(null), false)).toBe('suivant')
    expect(sensDeLaTouche(touche('ArrowUp'), null, false)).toBeNull()
    expect(sensDeLaTouche(touche('Enter'), null, false)).toBeNull()
  })

  it('inactives si une touche de modification est tenue', () => {
    for (const modifs of [{ altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }]) {
      expect(sensDeLaTouche(touche('ArrowRight', modifs), null, false)).toBeNull()
    }
  })

  it('inactives sur une touche répétée, déjà prise, ou pendant une composition', () => {
    expect(sensDeLaTouche(touche('ArrowRight', { repeat: true }), null, false)).toBeNull()
    expect(sensDeLaTouche(touche('ArrowRight', { defaultPrevented: true }), null, false)).toBeNull()
    expect(sensDeLaTouche(touche('ArrowRight', { isComposing: true }), null, false)).toBeNull()
  })

  it('inactives quand le foyer est dans un champ, une zone éditable, un menu ou une fenêtre', () => {
    for (const s of ['input', 'textarea', 'select', '[role="menu"]', '[role="dialog"]', '[role="listbox"]', '[role="tablist"]']) {
      expect(sensDeLaTouche(touche('ArrowLeft'), foyer(s), false)).toBeNull()
    }
    expect(sensDeLaTouche(touche('ArrowLeft'), foyer(null, true), false)).toBeNull()
  })

  it('inactives quand une fenêtre modale est ouverte, où que soit le foyer', () => {
    expect(sensDeLaTouche(touche('ArrowRight'), null, true)).toBeNull()
  })
})
