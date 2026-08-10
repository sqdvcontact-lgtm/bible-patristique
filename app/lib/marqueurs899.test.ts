import { describe, expect, it } from 'vitest'

import { rendreMarqueurs899 } from './marqueurs899'

// Réduit un nœud React (string | élément) à une forme comparable :
//   texte normal → { t: 'texte', v }
//   marqueur     → { t: 'marque', titre, texte }
function reduire(noeud: unknown): { t: string; v?: string; titre?: string; texte?: unknown } {
  if (typeof noeud === 'string') return { t: 'texte', v: noeud }
  const props = (noeud as { props?: { title?: string; children?: unknown } }).props ?? {}
  return { t: 'marque', titre: props.title, texte: props.children }
}

function reduireTout(resultat: unknown) {
  return Array.isArray(resultat) ? resultat.map(reduire) : reduire(resultat)
}

describe('rendreMarqueurs899', () => {
  it('laisse le texte sans marqueur intact (chaîne simple)', () => {
    expect(rendreMarqueurs899('Li rois dauid estoit ia uielz.')).toBe('Li rois dauid estoit ia uielz.')
  })

  it('rend une lecture incertaine complète en span discret, sans crochet brut', () => {
    const out = reduireTout(rendreMarqueurs899('a [lecture incertaine : b c] d')) as ReturnType<typeof reduire>[]
    expect(out).toEqual([
      { t: 'texte', v: 'a ' },
      { t: 'marque', titre: 'Lecture incertaine (transcription du manuscrit)', texte: 'b c' },
      { t: 'texte', v: ' d' },
    ])
  })

  it('gère un marqueur OUVERT non fermé (fin de verset) sans crochet brut', () => {
    const out = reduireTout(rendreMarqueurs899('Viue adonias li[lecture incertaine : rois. Mes')) as ReturnType<typeof reduire>[]
    expect(out).toEqual([
      { t: 'texte', v: 'Viue adonias li' },
      { t: 'marque', titre: 'Lecture incertaine (transcription du manuscrit)', texte: 'rois. Mes' },
    ])
  })

  it('gère un verset qui COMMENCE dans une portée (fermeture orpheline)', () => {
    const out = reduireTout(rendreMarqueurs899('il na pas apele moi ne sa] doch le prouoire.')) as ReturnType<typeof reduire>[]
    expect(out).toEqual([
      { t: 'marque', titre: 'Lecture incertaine (transcription du manuscrit)', texte: 'il na pas apele moi ne sa' },
      { t: 'texte', v: ' doch le prouoire.' },
    ])
  })

  it('rend une lacune comme jalon discret et MASQUE le motif', () => {
    const out = reduireTout(rendreMarqueurs899('a [lacune : trou de vélin] b')) as ReturnType<typeof reduire>[]
    expect(out).toEqual([
      { t: 'texte', v: 'a ' },
      { t: 'marque', titre: 'Lacune matérielle du manuscrit', texte: '[lacune]' },
      { t: 'texte', v: ' b' },
    ])
  })
})
