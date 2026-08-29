import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { BlocEditorialBible } from './BibleEditionParatext'

describe('grec du paratexte biblique', () => {
  it('rend le grec en caractères grecs en romain', () => {
    const grec = 'πνευματικὸν εὐαγγέλιον'
    const html = renderToStaticMarkup(
      <BlocEditorialBible bloc={{
        id: 'jhn-grec',
        semanticStyleCode: 'commentaire_pericope',
        placement: 'before',
        textBlocks: [{
          id: 'jhn-grec-p',
          kind: 'commentary',
          form: 'prose',
          text: `Le grec ${grec}.`,
          language: 'fr',
          inlineSpans: [{
            startOffsetUnicode: 8,
            endOffsetUnicode: 8 + grec.length,
            kind: 'foreign_expression',
            language: 'grc',
          }],
        }],
      }} />,
    )

    expect(html).toContain(`<span lang="grc">${grec}</span>`)
    expect(html).not.toContain(`<em lang="grc">${grec}</em>`)
  })

  it('conserve l’italique d’une translittération grecque', () => {
    const html = renderToStaticMarkup(
      <BlocEditorialBible bloc={{
        id: 'jhn-grec-latn',
        semanticStyleCode: 'commentaire_pericope',
        placement: 'before',
        textBlocks: [{
          id: 'jhn-grec-latn-p',
          kind: 'commentary',
          form: 'prose',
          text: 'Le mot logos.',
          language: 'fr',
          inlineSpans: [{
            startOffsetUnicode: 7,
            endOffsetUnicode: 12,
            kind: 'foreign_expression',
            language: 'grc-Latn',
          }],
        }],
      }} />,
    )

    expect(html).toContain('<em lang="grc-Latn">logos</em>')
  })
})
