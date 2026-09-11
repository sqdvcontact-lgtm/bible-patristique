import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AppelNote } from './appelNote'
import { ATTRIBUT_CLE_NOTE, animationsBornees, choisirAppel, decalageVersLesYeux } from './ouvrirNoteDansLeTexte'
import type { NoteStructuree } from './oeuvreTypes'

/** Une animation de fantaisie : seule sa fin compte ici. */
function animation(fin: number | null) {
  return {
    effect: fin === null ? null : { getComputedTiming: () => ({ endTime: fin }) },
    finished: Promise.resolve(),
  }
}

describe('animationsBornees', () => {
  it('garde les animations qui finissent et écarte celles qui tournent sans fin', () => {
    const passage = animation(450)
    const retenues = animationsBornees([passage, animation(Infinity), animation(null)])
    expect(retenues).toHaveLength(1)
    expect(retenues[0]).toBe(passage)
  })
})

describe('decalageVersLesYeux', () => {
  const vue = 900
  const barre = 56

  it('ne bouge pas un appel déjà bien placé', () => {
    expect(decalageVersLesYeux({ top: 300, bottom: 316 }, vue, barre)).toBe(0)
  })

  it('remonte au tiers de la fenêtre un appel trop bas pour que sa note tienne à côté', () => {
    expect(decalageVersLesYeux({ top: 800, bottom: 816 }, vue, barre)).toBe(500)
  })

  it('redescend un appel passé sous la barre de navigation', () => {
    expect(decalageVersLesYeux({ top: 40, bottom: 56 }, vue, barre)).toBe(-260)
  })

  it('ne pose jamais l’appel sous la barre, même quand le tiers y tomberait', () => {
    // Fenêtre de 180 px : le tiers vaut 60, sous la barre et son blanc (72).
    expect(decalageVersLesYeux({ top: 400, bottom: 416 }, 180, barre)).toBe(400 - 72)
  })
})

describe('choisirAppel', () => {
  it('préfère l’appel que porte le segment visé', () => {
    expect(choisirAppel(['titre', 'corps'], c => c === 'corps')).toBe('corps')
  })

  it('à défaut, prend le premier de la page : l’appel d’un titre n’est pas dans son segment', () => {
    expect(choisirAppel(['titre'], () => false)).toBe('titre')
  })

  it('ne rend rien quand la note n’a pas d’appel, comme un renvoi posé en manchette', () => {
    expect(choisirAppel([], () => true)).toBeNull()
  })
})

describe('l’appel d’une note', () => {
  it('dit quelle note il ouvre : c’est par là que l’inventaire la retrouve', () => {
    const note = { noteKey: 'AUG-CONF-KNOLL-APP-0154', noteNumber: 154, displayNumber: 3, blocks: [] } as unknown as NoteStructuree
    const html = renderToStaticMarkup(<AppelNote numeroVisible={3} contenu={note} />)
    expect(html).toContain(`${ATTRIBUT_CLE_NOTE}="AUG-CONF-KNOLL-APP-0154"`)
  })

  it('se tait pour une note héritée, simple chaîne qui n’a pas de clé', () => {
    const html = renderToStaticMarkup(<AppelNote numeroVisible={1} contenu="Voyez plus haut." />)
    expect(html).not.toContain(ATTRIBUT_CLE_NOTE)
  })
})
