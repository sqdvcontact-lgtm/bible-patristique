import { describe, expect, it } from 'vitest'
import { decalageVersLesYeux } from '../oeuvre/[id]/ouvrirNoteDansLeTexte'
import {
  ancreNoteSansAppelBible,
  decalageDansLaBande,
  selecteurAppelsNoteBible,
  selecteurVersetBible,
} from './ouvrirNoteBible'

describe('decalageDansLaBande', () => {
  it('rend la règle de l’œuvre quand la bande est la fenêtre', () => {
    const cible = { top: 900, bottom: 918 }
    expect(decalageDansLaBande(cible, { haut: 0, bas: 1000, reserve: 56 }))
      .toBe(decalageVersLesYeux(cible, 1000, 56))
  })

  it('rapporte la cible au haut d’une bande intérieure', () => {
    // Un défileur posé à 120 px, haut de 600 : la cible à 500 px de l'écran est à 380 px
    // dans la bande, sous ses trois cinquièmes (360) ; elle remonte au tiers (200).
    expect(decalageDansLaBande({ top: 500, bottom: 516 }, { haut: 120, bas: 720 })).toBe(180)
  })

  it('ne bouge pas une cible déjà au niveau des yeux', () => {
    expect(decalageDansLaBande({ top: 300, bottom: 318 }, { haut: 120, bas: 720 })).toBe(0)
  })

  it('redescend une cible passée au-dessus de la bande', () => {
    // À -80 px de la bande : elle revient au tiers, soit un décalage négatif.
    expect(decalageDansLaBande({ top: 40, bottom: 58 }, { haut: 120, bas: 720 })).toBe(-280)
  })

  it('ne pose jamais la cible sous la réserve du haut', () => {
    // Une fenêtre très basse, où le tiers tomberait sous la barre.
    const d = decalageDansLaBande({ top: 400, bottom: 418 }, { haut: 0, bas: 150, reserve: 56 })
    expect(400 - d).toBe(56 + 16)
  })
})

describe('selecteurAppelsNoteBible', () => {
  it('vise l’appel d’une colonne et ceux de la lecture en regard', () => {
    const id = '3f2a8c1e-0000-4000-8000-000000000001'
    expect(selecteurAppelsNoteBible(id)).toBe(
      `[id="appel-note-bible-${id}"], [id^="appel-note-bible-${id}-"]`,
    )
  })
})

describe('ancreNoteSansAppelBible', () => {
  it('nomme l’entrée d’apparat d’une note de bloc', () => {
    expect(ancreNoteSansAppelBible('abc')).toBe('entree-apparat-abc')
  })
})

describe('selecteurVersetBible', () => {
  it('désigne la rangée en regard et la rangée d’une colonne', () => {
    expect(selecteurVersetBible('PSA.22.2')).toBe('[data-canon-id="PSA.22.2"], #verset-2')
  })

  it('refuse ce qui n’a pas la forme d’un créneau', () => {
    expect(selecteurVersetBible(null)).toBeNull()
    expect(selecteurVersetBible('PSA.22')).toBeNull()
    expect(selecteurVersetBible('PSA.22.2"], body, [x="')).toBeNull()
  })

  it('accepte un livre dont le code porte un chiffre', () => {
    expect(selecteurVersetBible('1SA.3.10')).toBe('[data-canon-id="1SA.3.10"], #verset-10')
  })
})
