import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import BibleBilingue from './BibleBilingue'
import type { MembreBilingue } from '@/app/lib/bibleEditionBilingue'

const LATIN: MembreBilingue = {
  id: 'la', translationId: 'TR0011', languageCode: 'la', label: 'Vulgate Fillion',
  memberRole: 'source_text', displayOrder: 1, desktopPosition: 'left', mobileOrder: 1,
}
const FRANCAIS: MembreBilingue = {
  id: 'fr', translationId: 'TR0010', languageCode: 'fr', label: 'Fillion français',
  memberRole: 'translation', displayOrder: 2, desktopPosition: 'right', mobileOrder: 2,
}

const COMMUN = {
  membres: [FRANCAIS, LATIN],
  axeCanonique: ['MRK.1.1', 'MRK.1.2'],
  colonnes: [
    {
      membre: LATIN,
      cellules: [
        { canonId: 'MRK.1.1', texte: 'Initium Evangelii Iesu Christi', referenceNative: 'I, 1' },
        { canonId: 'MRK.1.2', texte: 'Sicut scriptum est in Isaia', referenceNative: 'I, 2' },
      ],
    },
    {
      membre: FRANCAIS,
      cellules: [
        { canonId: 'MRK.1.1', texte: 'Commencement de l’Évangile de Jésus-Christ', referenceNative: '1' },
      ],
    },
  ],
}

describe('lecture bilingue de la page Bible', () => {
  it('met le latin à gauche et garde les deux références natives', () => {
    const html = renderToStaticMarkup(<BibleBilingue {...COMMUN} />)
    expect(html.indexOf('lang="la"')).toBeLessThan(html.indexOf('lang="fr"'))
    expect(html).toContain('I, 1')
    expect(html).toContain('>1<')
    // Le créneau que le français ne porte pas ne reçoit jamais le texte latin.
    const apresDeuxieme = html.slice(html.indexOf('MRK.1.2'))
    expect(apresDeuxieme.split('Sicut scriptum est in Isaia')).toHaveLength(2)
  })

  it('rend un commentaire commun UNE seule fois, hors des colonnes', () => {
    const html = renderToStaticMarkup(
      <BibleBilingue
        {...COMMUN}
        blocs={[{
          id: 'intro',
          semanticStyleCode: 'introduction_livre',
          heading: 'Introduction',
          placement: 'before',
          canonIdStart: null,
          canonIdEnd: null,
          materialOrder: 1,
          appliesTo: 'family',
          appliesToMemberId: null,
          textBlocks: [{ id: 'intro:1', kind: 'commentary', form: 'prose', text: 'Commun aux deux langues.' }],
          internalNotes: [],
        }]}
      />,
    )
    expect(html.split('Commun aux deux langues.')).toHaveLength(2)
    expect(html).toContain('data-semantic-style="introduction_livre"')
  })

  it('appelle une note commune depuis les deux colonnes, avec des ancres distinctes', () => {
    const html = renderToStaticMarkup(
      <BibleBilingue
        {...COMMUN}
        notes={[{
          id: 'n1',
          displayNumber: 1,
          canonId: 'MRK.1.1',
          materialOrder: 1,
          appliesTo: 'family',
          appliesToMemberId: null,
          blocks: [{ id: 'n1:1', kind: 'commentary', form: 'prose', text: 'Note commune à l’édition.' }],
        }]}
      />,
    )
    expect(html).toContain('id="appel-note-bible-n1-la"')
    expect(html).toContain('id="appel-note-bible-n1-fr"')
    // Une seule note au bas du chapitre, et elle revient à la première colonne.
    expect(html.split('Note commune à l’édition.')).toHaveLength(2)
    expect(html).toContain('href="#appel-note-bible-n1-la"')
  })

  it('n’appelle une note propre au français que dans sa colonne', () => {
    const html = renderToStaticMarkup(
      <BibleBilingue
        {...COMMUN}
        notes={[{
          id: 'n2',
          displayNumber: 2,
          canonId: 'MRK.1.1',
          materialOrder: 2,
          appliesTo: 'member',
          appliesToMemberId: 'fr',
          blocks: [{ id: 'n2:1', kind: 'commentary', form: 'prose', text: 'Propre au français.' }],
        }]}
      />,
    )
    expect(html).toContain('id="appel-note-bible-n2-fr"')
    expect(html).not.toContain('id="appel-note-bible-n2-la"')
  })
})
