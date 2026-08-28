import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { EPREUVES } from './specimens'
import { styleParagrapheLecture } from '@/app/lib/compositionOeuvre'
import { STYLE_NUMERO_VERSET } from '@/app/lib/compositionBible'

const toutes = EPREUVES.flatMap((e) => e.unites.map((u) => ({ epreuve: e.cle, ...u })))

describe('les épreuves de la planche', () => {
  it('couvrent les quatre vocabulaires, et aucune n’est vide', () => {
    expect(EPREUVES.map((e) => e.cle)).toEqual(['bible', 'oeuvres', 'apparat-oeuvres', 'apparat-bibles'])
    for (const epreuve of EPREUVES) expect(epreuve.unites.length, epreuve.cle).toBeGreaterThan(0)
  })

  it('ne nomment jamais deux unités de la même façon dans une épreuve', () => {
    // Le nom du style sert de clé de rendu : deux homonymes s'y marcheraient dessus.
    for (const epreuve of EPREUVES) {
      const noms = epreuve.unites.map((u) => u.style)
      expect(new Set(noms).size, epreuve.cle).toBe(noms.length)
    }
  })

  it.each(toutes.map((u) => [u.epreuve, u.style, u] as const))('%s · %s se rend', (_e, style, unite) => {
    const html = renderToStaticMarkup(<>{unite.contenu}</>)
    // ⛔ `titre_chapitre_livre` est le seul dont le VIDE est la bonne réponse :
    // la barre de navigation nomme déjà le chapitre (charte § 35.1).
    if (style.startsWith('titre_chapitre_livre')) {
      expect(html).toContain('cs-bible-axe')
      expect(html).not.toContain('Ceci ne doit pas paraître')
      return
    }
    expect(html.replace(/<[^>]*>/g, '').trim().length, style).toBeGreaterThan(0)
  })
})

describe('⛔ la planche ne rejoue aucune composition', () => {
  // C'est la garde de tout l'exercice : une épreuve qui recopierait les valeurs
  // au lieu de les tirer du module dériverait au premier réglage, et ferait
  // ensuite autorité contre la page qu'elle décrit.

  it('compose la prose d’une œuvre avec le module que la lecture emploie', () => {
    const html = renderToStaticMarkup(<>{EPREUVES[1].unites[1].contenu}</>)
    const attendu = styleParagrapheLecture()
    expect(html).toContain(`font-size:${attendu.fontSize}`)
    expect(html).toContain(`line-height:${attendu.lineHeight}`)
  })

  it('compose la rangée de verset avec le module que la page Bible emploie', () => {
    const html = renderToStaticMarkup(<>{EPREUVES[0].unites[0].contenu}</>)
    expect(html).toContain(`font-size:${STYLE_NUMERO_VERSET.fontSize}`)
    expect(html).toContain('verset-row')
  })

  it('fait passer le paratexte biblique par le composant, et par son AXE', () => {
    // Sans l'axe, les règles de voisinage de `globals.css` ne s'appliqueraient pas,
    // et le blanc qui cerne un bloc de versets disparaîtrait en silence.
    for (const unite of EPREUVES[3].unites) {
      expect(renderToStaticMarkup(<>{unite.contenu}</>), unite.style).toContain('cs-bible-axe')
    }
  })
})

describe('la page de la planche', () => {
  it('se rend d’un bout à l’autre', async () => {
    const { default: PlancheStyles } = await import('./PlancheStyles')
    const html = renderToStaticMarkup(<PlancheStyles />)
    expect(html).toContain('Planche des styles')
    for (const epreuve of EPREUVES) expect(html).toContain(epreuve.libelle)
    // ⛔ La légende sort du flux : sans cela, chaque marge ouvrirait un blanc
    // entre deux unités et la planche mentirait sur l'espacement qu'elle montre.
    expect(html).toContain('pl-marge')
    expect(html).toContain('rangée de verset')
  })
})
