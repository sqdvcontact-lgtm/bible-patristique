import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BadgeStatutAlignement } from './ComparaisonStatut'

describe('statut des groupes d’alignement', () => {
  it('affiche le badge discret pour un groupe uncertain en administration', () => {
    const html = renderToStaticMarkup(<BadgeStatutAlignement status="uncertain" estAdmin />)
    expect(html).toContain('à relire')
    expect(html).toContain('data-alignement-a-relire')
  })

  it('n’affiche rien pour reviewed_ai ni dans une vue ordinaire', () => {
    expect(renderToStaticMarkup(<BadgeStatutAlignement status="reviewed_ai" estAdmin />)).toBe('')
    expect(renderToStaticMarkup(<BadgeStatutAlignement status="uncertain" estAdmin={false} />)).toBe('')
  })
})
