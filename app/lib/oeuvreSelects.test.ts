import { describe, expect, it } from 'vitest'
import { NATURES_CORPS, SELECT_SEGMENT } from './oeuvreSelects'
import { NATURE_VALIDES } from './naturesSegments'

/**
 * ⛔ LA GARDE DU VOCABULAIRE QUI PARAÎT.
 *
 * `NATURES_CORPS` est le seul endroit qui décide qu'une nature est CHARGÉE par la page
 * d'œuvre. Une nature que la base accepte et que cette liste ignore n'est pas mal
 * composée : elle n'existe pas pour le lecteur, en silence, et rien ne le signale.
 *
 * Le dépôt l'a payé DEUX fois. Le 18 août 2026, `apparat_auteur` retiré de la liste a
 * fait disparaître le « Prologue de Rufin aux livres X et XI ». Le 29 août 2026,
 * `lemme` — quarante-sept segments du *Commentaire sur Jonas* de Jérôme, œuvre
 * PUBLIÉE — n'y avait jamais figuré : le lecteur recevait le commentaire sans le
 * verset qu'il commente.
 *
 * D'où cette garde. Toute nature du vocabulaire doit être RANGÉE : au corps, à
 * l'apparat, ou parmi les formes éteintes. Ajouter une nature à `chk_segments_nature`
 * et à `NATURE_VALIDES` sans dire où elle se compose fait donc échouer les tests, ce
 * qui est le seul moment où l'on peut encore y penser.
 */

/** L'apparat de l'ÉDITEUR : il a sa propre vue dans la page, pas le corps. */
const NATURES_APPARAT = ['apparat_critique', 'apparat_editeur'] as const

/** ⛔ Conservée pour la compatibilité des anciens exports ; ne plus en créer. */
const NATURES_ETEINTES = ['separateur'] as const

describe('le vocabulaire des natures est entièrement rangé', () => {
  it('chaque nature valide se compose quelque part, et une seule fois', () => {
    const rangees = [...NATURES_CORPS, ...NATURES_APPARAT, ...NATURES_ETEINTES]
    expect([...rangees].sort()).toEqual([...NATURE_VALIDES].sort())
    expect(new Set(rangees).size).toBe(rangees.length)
  })

  it('le corps porte le LEMME — le verset qu’un commentaire pose en tête', () => {
    // Quarante-sept segments de Jérôme sur Jonas, tous au rang 1 de leur paragraphe.
    expect(NATURES_CORPS).toContain('lemme')
  })

  it('le corps porte l’apparat de l’AUTEUR, jamais celui de l’éditeur', () => {
    expect(NATURES_CORPS).toContain('apparat_auteur')
    expect(NATURES_CORPS).not.toContain('apparat_critique')
    expect(NATURES_CORPS).not.toContain('apparat_editeur')
  })
})

describe('les colonnes d’un segment se lisent en un seul endroit', () => {
  it('les deux champs de métadonnée sont tirés par leur nom, jamais le jsonb entier', () => {
    // PostgREST rendrait une trentaine de clés par segment, pour une page qui en
    // charge jusqu'à mille d'un coup.
    expect(SELECT_SEGMENT).toContain('numero_verset:segment_metadata->>biblical_verse_number')
    expect(SELECT_SEGMENT).not.toMatch(/(^|,)segment_metadata(,|$)/)
  })
})
