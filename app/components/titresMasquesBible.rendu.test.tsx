import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BlocEditorialBible } from './BibleEditionParatext'

// Un bloc de TITRE porte son rang dans `level`, non dans `headingLevel` : c'est ce
// qui laissait « Le divin prélude » (T3) insensible à la roue.
const titre = (code: string, niveau: string, heading: string) => ({
  id: heading, blockKey: heading, heading, semanticStyleCode: code, semanticLevel: niveau,
  embeddedTitleLevel: null, textBlocks: [], internalNotes: [],
}) as unknown as Parameters<typeof BlocEditorialBible>[0]['bloc']

describe('la roue des niveaux de titre', () => {
  it('tait un titre de section (T3) masqué', () => {
    const bloc = titre('titre_section_livre', 'T3', 'Le divin prélude')
    expect(renderToStaticMarkup(<BlocEditorialBible bloc={bloc} />)).toContain('Le divin prélude')
    expect(renderToStaticMarkup(<BlocEditorialBible bloc={bloc} titresMasques={['T3']} />)).toBe('')
  })
  it('laisse un titre dont le rang n’est pas masqué', () => {
    const bloc = titre('titre_sous_section', 'T4', 'La création (1, 1 - 2, 3)')
    expect(renderToStaticMarkup(<BlocEditorialBible bloc={bloc} titresMasques={['T3']} />)).toContain('La création')
  })
})
