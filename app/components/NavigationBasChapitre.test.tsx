import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import NavigationBasChapitre from './NavigationBasChapitre'

const rendre = (props: Parameters<typeof NavigationBasChapitre>[0]) => {
  const noeud = NavigationBasChapitre(props)
  return noeud ? renderToStaticMarkup(noeud) : ''
}

describe('le bas d’une division d’œuvre, par la navigation de la Bible', () => {
  it('une page de pagination est un bouton, une division un lien', () => {
    const html = rendre({
      precedent: { href: null, nom: '', geste: 'Page précédente' },
      suivant: { href: '/oeuvre/X?niv1=Livre+III', nom: 'Livre III', geste: 'Division suivante' },
      position: { actuel: 2, total: 2 },
      onAller: () => {},
      onTourner: () => {},
      nomDuGroupe: 'Suite de la lecture',
      raccourcis: true,
    })
    expect(html).toContain('<button type="button"')
    expect(html).toContain('aria-label="Page précédente"')
    expect(html).toContain('href="/oeuvre/X?niv1=Livre+III"')
    expect(html).toContain('aria-label="Division suivante : Livre III"')
    expect(html).toContain('aria-keyshortcuts="ArrowLeft"')
    expect(html).toContain('aria-keyshortcuts="ArrowRight"')
    expect(html).toContain('aria-label="Suite de la lecture"')
    expect(html).toContain('2 sur 2')
  })

  it('sans raccourcis déclarés, aucune touche n’est annoncée (la page Bible)', () => {
    const html = rendre({
      precedent: null,
      suivant: { href: '/?livre=MRK&chapitre=1', nom: 'Marc 1' },
      onAller: () => {},
    })
    expect(html).not.toContain('aria-keyshortcuts')
    expect(html).toContain('Chapitre suivant : Marc 1')
  })
})
