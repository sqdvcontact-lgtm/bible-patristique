import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ONGLETS } from './specimens'

/** La planche est une PREUVE : si un spécimen ne rend rien, elle ment par
 *  omission. Ces tests rendent chacun d'eux et vérifient qu'il porte du texte. */
const tousLesSpecimens = ONGLETS.flatMap((onglet) =>
  onglet.groupes.flatMap((groupe) => groupe.specimens.map((s) => ({ onglet: onglet.cle, ...s }))),
)

describe('la planche des styles', () => {
  it('couvre les quatre vocabulaires, et aucun onglet n’est vide', () => {
    expect(ONGLETS.map((o) => o.cle)).toEqual(['bible', 'oeuvres', 'apparat-oeuvres', 'apparat-bibles'])
    for (const onglet of ONGLETS) {
      expect(onglet.groupes.length, onglet.cle).toBeGreaterThan(0)
      for (const groupe of onglet.groupes) expect(groupe.specimens.length, groupe.titre).toBeGreaterThan(0)
    }
  })

  it('ne nomme jamais deux spécimens de la même façon DANS UN ONGLET', () => {
    // Le code sert de clé de rendu : deux homonymes s'y marcheraient dessus.
    // ⚠️ D'un onglet à l'autre, en revanche, l'homonymie est le sujet même de la
    // planche : `verset` nomme une rangée de la page Bible et une nature de
    // segment d'œuvre, et ce sont deux choses.
    for (const onglet of ONGLETS) {
      const codes = onglet.groupes.flatMap((g) => g.specimens.map((s) => s.code))
      expect(new Set(codes).size, onglet.cle).toBe(codes.length)
    }
  })

  it.each(tousLesSpecimens.map((s) => [s.onglet, s.code, s] as const))(
    '%s · %s se rend',
    (_onglet, code, specimen) => {
      const html = renderToStaticMarkup(<>{specimen.rendu}</>)
      // ⛔ `titre_chapitre_livre` est le seul dont le VIDE est la bonne réponse :
      // la barre de navigation nomme déjà le chapitre (charte § 35.1).
      if (code.startsWith('titre_chapitre_livre')) {
        expect(html).toBe('')
        return
      }
      expect(html.replace(/<[^>]*>/g, '').trim().length, code).toBeGreaterThan(0)
    },
  )

  it('dit sa fidélité pour chaque spécimen, et l’apparat des bibles passe par le composant', () => {
    for (const specimen of tousLesSpecimens) {
      expect(['composant', 'reproduction'], specimen.code).toContain(specimen.fidelite)
    }
    const bibles = tousLesSpecimens.filter((s) => s.onglet === 'apparat-bibles')
    expect(bibles.every((s) => s.fidelite === 'composant')).toBe(true)
  })
})

describe('la page de la planche', () => {
  it('se rend d’un bout à l’autre, onglets et fonds compris', async () => {
    const { default: PlancheStyles } = await import('./PlancheStyles')
    const html = renderToStaticMarkup(<PlancheStyles />)
    expect(html).toContain('Planche des styles')
    // Les quatre onglets sont posés d'emblée : la barre les nomme tous.
    for (const onglet of ONGLETS) expect(html).toContain(onglet.libelle)
    // Le premier onglet est déplié, avec ses groupes.
    expect(html).toContain('La rangée de verset')
  })
})
