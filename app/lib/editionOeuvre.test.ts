import { describe, it, expect } from 'vitest'
import { ligneEdition } from './editionOeuvre'
import { construireIndexEditeurs } from './editeursNormalisation'

// Les deux éditions de « La Cité de Dieu » servies par le site : c'est le cas qui a
// motivé cette ligne, un même titre du même auteur paraissant deux fois dans la
// recherche rapide sans que rien ne les distingue.
const citeLatine = {
  trad_auteur: null,
  editeur: 'Jacques-Paul Migne',
  ville: 'Paris',
  date: '1845',
  langue_trad: null,
  langue_originale: 'Latin',
}
const citeFrancaise = {
  trad_auteur: 'H. Barreau ; M. Charpentier',
  editeur: 'Louis Vivès',
  ville: 'Paris',
  date: '1870-1873',
  langue_trad: 'Français',
  langue_originale: 'Latin',
}

describe('ligne d’édition d’une œuvre', () => {
  // ⚠️ L'adresse se lit « ville, éditeur, année » (charte § 5, rappelé par l'auteur le
  // 5 septembre 2026) : elle se disait ici à l'envers, comme sur quatre autres surfaces.
  it('distingue deux éditions d’un même titre', () => {
    expect(ligneEdition(citeLatine)).toBe('Texte original latin, Paris, Jacques-Paul Migne, 1845')
    expect(ligneEdition(citeFrancaise)).toBe('Traduction par H. Barreau et M. Charpentier, Paris, Louis Vivès, 1870-1873')
  })

  it('ne nomme la langue que faute de traducteur', () => {
    // Une traduction porte son traducteur : sa langue d'origine ne la désigne pas.
    expect(ligneEdition({ ...citeFrancaise, editeur: null, ville: null, date: null }))
      .toBe('Traduction par H. Barreau et M. Charpentier')
    // Ni traducteur ni langue de traduction : c'est le texte original.
    expect(ligneEdition({ langue_originale: 'Grec' })).toBe('Texte original grec')
    // Une traduction dont le traducteur n'est pas connu ne devient pas « texte original ».
    expect(ligneEdition({ langue_trad: 'Français', langue_originale: 'Latin', date: '1649' })).toBe('1649')
  })

  it('rend l’éditeur sous son nom répertorié quand il l’est', () => {
    const index = construireIndexEditeurs([
      { nom_complet: 'Louis Guérin', variantes: ['L. Guérin & Cie'], ville: 'Bar-le-Duc' },
    ])
    const guerin = { editeur: 'L. Guérin & Cie', ville: 'Bar-le-Duc', date: '1864' }
    expect(ligneEdition(guerin, index)).toBe('Bar-le-Duc, Louis Guérin, 1864')
    // Index non chargé : la forme rencontrée vaut mieux que rien.
    expect(ligneEdition(guerin)).toBe('Bar-le-Duc, L. Guérin & Cie, 1864')
  })

  it('dit le traducteur non identifié, qui distingue aussi une édition', () => {
    expect(ligneEdition({ trad_auteur: 'Non établi', langue_trad: 'Français', date: '1858' }))
      .toBe('Traducteur non identifié, 1858')
  })

  it('ne rend rien quand l’œuvre ne porte aucune mention', () => {
    expect(ligneEdition({})).toBe('')
    expect(ligneEdition({ trad_auteur: '', editeur: '  ', ville: null, date: null })).toBe('')
  })
})
