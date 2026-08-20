import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import BibleBilingue from './BibleBilingue'
import type { MembreBilingue } from '@/app/lib/bibleEditionBilingue'

const LATIN: MembreBilingue = {
  id: 'la', translationId: 'TR0011', languageCode: 'la', label: 'Vulgate Fillion',
  memberRole: 'source_text', displayOrder: 2, desktopPosition: 'right', mobileOrder: 2,
}
const FRANCAIS: MembreBilingue = {
  id: 'fr', translationId: 'TR0010', languageCode: 'fr', label: 'Fillion français',
  memberRole: 'translation', displayOrder: 1, desktopPosition: 'left', mobileOrder: 1,
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
  it('suit l’ordre de l’édition — français à gauche — et garde les deux références natives', () => {
    const html = renderToStaticMarkup(<BibleBilingue {...COMMUN} />)
    expect(html.indexOf('lang="fr"')).toBeLessThan(html.indexOf('lang="la"'))
    expect(html).toContain('I, 1')
    expect(html).toContain('>1<')
    // Le créneau que le français ne porte pas ne reçoit jamais le texte latin.
    const apresDeuxieme = html.slice(html.indexOf('MRK.1.2'))
    expect(apresDeuxieme.split('Sicut scriptum est in Isaia')).toHaveLength(2)
  })

  it('empile les colonnes sur mobile, dans l’ordre de l’édition', () => {
    const html = renderToStaticMarkup(<BibleBilingue {...COMMUN} mobile />)
    expect(html).toContain('minmax(0, 1fr)')
    expect(html).not.toContain('repeat(2,')
    // L'ordre déclaré par l'édition tient : le français vient d'abord.
    expect(html.indexOf('lang="fr"')).toBeLessThan(html.indexOf('lang="la"'))
    // Les étiquettes de colonne n'ont plus lieu d'être : chaque verset porte sa langue.
    expect(html).not.toContain('Vulgate Fillion')
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
    // Une seule note au bas du chapitre, et elle revient à la PREMIÈRE colonne,
    // celle que le lecteur a sous les yeux en tête de rangée — ici le français.
    expect(html.split('Note commune à l’édition.')).toHaveLength(2)
    expect(html).toContain('href="#appel-note-bible-n1-fr"')
  })

  // Quatre régressions à empêcher : un contenu propre à une langue ne doit
  // jamais disparaître faute d'une place dans la grille.
  it('rend un bloc propre à une langue sur TOUTE la largeur, hors des colonnes', () => {
    const html = renderToStaticMarkup(
      <BibleBilingue
        {...COMMUN}
        blocs={[{
          id: 'intro-fr',
          semanticStyleCode: 'introduction_livre',
          heading: null,
          placement: 'before',
          canonIdStart: null,
          canonIdEnd: null,
          materialOrder: 1,
          appliesTo: 'member',
          appliesToMemberId: 'fr',
          textBlocks: [{ id: 'i:1', kind: 'commentary', form: 'prose', text: 'Propre au français, sans ancre.' }],
          internalNotes: [],
        }]}
      />,
    )
    expect(html.split('Propre au français, sans ancre.')).toHaveLength(2)
    // Une introduction de Fillion n'a pas d'équivalent latin : l'enfermer dans
    // la colonne française laisserait en face une colonne vide de sa hauteur.
    // Elle passe donc sur toute la largeur, hors de toute cellule de membre.
    const avant = html.slice(0, html.indexOf('Propre au français, sans ancre.'))
    expect(avant.lastIndexOf('data-membre=')).toBe(-1)
  })

  it('rend une conclusion propre à une langue ancrée sur un verset', () => {
    const html = renderToStaticMarkup(
      <BibleBilingue
        {...COMMUN}
        blocs={[{
          id: 'concl-la',
          semanticStyleCode: 'conclusion_pericope',
          heading: null,
          placement: 'after',
          canonIdStart: 'MRK.1.1',
          canonIdEnd: 'MRK.1.1',
          materialOrder: 2,
          appliesTo: 'member',
          appliesToMemberId: 'la',
          textBlocks: [{ id: 'c:1', kind: 'commentary', form: 'prose', text: 'Clôture latine.' }],
          internalNotes: [],
        }]}
      />,
    )
    expect(html.split('Clôture latine.')).toHaveLength(2)
  })

  it('ne laisse PAS un commentaire propre à une langue décaler les versets', () => {
    // Le défaut vu sur le pilote Marc : rendu dans la cellule du verset, le
    // commentaire français poussait son verset vers le bas pendant que le latin
    // restait en haut. Les deux textes cessaient d'être en regard.
    const html = renderToStaticMarkup(
      <BibleBilingue
        {...COMMUN}
        blocs={[{
          id: 'comm-fr',
          semanticStyleCode: 'commentaire_pericope',
          heading: 'Le précurseur fait son apparition',
          placement: 'before',
          canonIdStart: 'MRK.1.1',
          canonIdEnd: 'MRK.1.8',
          materialOrder: 1,
          appliesTo: 'member',
          appliesToMemberId: 'fr',
          textBlocks: [{ id: 'cf:1', kind: 'commentary', form: 'prose', text: 'Commentaire de la péricope.' }],
          internalNotes: [],
        }]}
      />,
    )
    const rangee = html.indexOf('data-canon-id="MRK.1.1"')
    const commentaire = html.indexOf('Commentaire de la péricope.')
    expect(commentaire).toBeGreaterThan(-1)
    // Il précède la rangée : il occupe sa colonne dans une bande à part, et la
    // rangée du verset garde ses deux cellules à la même hauteur.
    expect(commentaire).toBeLessThan(rangee)
  })

  it('rend une illustration propre à une langue', () => {
    const html = renderToStaticMarkup(
      <BibleBilingue
        {...COMMUN}
        illustrations={[{
          id: 'img-fr', assetKey: 'jourdain', assetKind: 'illustration',
          url: 'https://exemple.test/j.webp', width: 400, height: 300,
          altText: 'Le Jourdain', caption: null, printedPage: null,
          placement: 'after', canonIdStart: 'MRK.1.1', canonIdEnd: null,
          bodyBlockId: null, noteId: null, materialOrder: 1,
          appliesTo: 'member', appliesToMemberId: 'fr',
        }]}
      />,
    )
    expect(html).toContain('data-asset-key="jourdain"')
  })

  it('garde dans sa note une illustration propre à une langue', () => {
    const html = renderToStaticMarkup(
      <BibleBilingue
        {...COMMUN}
        notes={[{
          id: 'n5', displayNumber: 5, canonId: 'MRK.1.1', materialOrder: 5,
          appliesTo: 'family', appliesToMemberId: null,
          blocks: [{ id: 'n5:1', kind: 'commentary', form: 'prose', text: 'Note illustrée.' }],
        }]}
        illustrations={[{
          id: 'img-note', assetKey: 'passoire', assetKind: 'illustration',
          url: 'https://exemple.test/p.webp', width: 300, height: 200,
          altText: 'Passoire antique', caption: null, printedPage: null,
          placement: 'inline', canonIdStart: null, canonIdEnd: null,
          bodyBlockId: null, noteId: 'n5', materialOrder: 2,
          appliesTo: 'member', appliesToMemberId: 'la',
        }]}
      />,
    )
    // L'image appartient au latin, mais elle est matériellement dans la note :
    // elle reste donc dans la note, rendue une seule fois au bas du chapitre.
    const notes = html.slice(html.indexOf('notes-bible-chapitre'))
    expect(notes).toContain('data-asset-key="passoire"')
    expect(html.split('data-asset-key="passoire"')).toHaveLength(2)
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

  it('compose le latin en regard : sans empattements, plus petit, grisé', () => {
    // Reprise de la colonne originale des œuvres : c’est le change de
    // caractère qui sépare les deux colonnes, mieux qu’un filet.
    const html = renderToStaticMarkup(<BibleBilingue {...COMMUN} />)
    const latin = html.slice(html.indexOf('lang="la"'))
    expect(latin).toContain('font-source-sans')
    expect(latin).toContain('#575048')
    const francais = html.slice(html.indexOf('lang="fr"'), html.indexOf('lang="la"'))
    expect(francais).toContain('font-source-serif')
    expect(francais).not.toContain('#575048')
  })

  it('ouvre la note dans une fenêtre, sur le modèle du site', () => {
    const html = renderToStaticMarkup(
      <BibleBilingue
        {...COMMUN}
        notes={[{
          id: 'nf', displayNumber: 1, canonId: 'MRK.1.1', materialOrder: 1,
          appliesTo: 'family', appliesToMemberId: null,
          blocks: [{ id: 'nf:1', kind: 'commentary', form: 'prose', text: 'Le titre.' }],
        }]}
      />,
    )
    // Un appel qui S’OUVRE, et non un simple lien vers le bas de page.
    expect(html).toContain('role="button"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('Consulter la note 1')
    // ⛔ Jamais de pointillé sous un appel de note.
    expect(html).not.toContain('textDecoration:underline dotted')
    expect(html).not.toContain('text-decoration:underline dotted')
  })
})
