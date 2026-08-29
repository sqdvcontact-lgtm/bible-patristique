import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SEUIL_CITATION_SORTIE } from '@/app/lib/citationSortie'
import { ContenuNoteBiblique } from './NoteBibliqueFenetre'

describe('citations sorties dans l’apparat biblique', () => {
  const rendreCitation = (text: string) => renderToStaticMarkup(
    <ContenuNoteBiblique note={{
      blocks: [{
        id: 'citation',
        kind: 'quotation',
        form: 'prose',
        text,
        language: 'fr',
      }],
    } as never} />,
  )

  it('garde une citation courte dans le fil de la note', () => {
    const html = rendreCitation('« Ignoratio Scripturarum ignoratio Christi est. »')
    expect(html).not.toContain('class="citation-sortie"')
  })

  it('applique le style commun à une citation qui atteint le seuil', () => {
    const html = rendreCitation('a'.repeat(SEUIL_CITATION_SORTIE))
    expect(html).toContain('class="citation-sortie"')
  })
})
