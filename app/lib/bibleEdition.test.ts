import { describe, expect, it } from 'vitest'
import {
  appartientAuMembre,
  blocSansAncreVisibleDansChapitre,
  blocsTexteEditoriaux,
  erreursApplicabilite,
  erreursSousTypeNotice,
  sousTypeNoticeValide,
  indexerNotesParVerset,
  indexerBlocsDeCorps,
  indexerIllustrations,
  notesDuVerset,
  ordonnerMembresBilingues,
  couperPointsDeCode,
  recomposerFragmentsMateriels,
  rangTitreBloc,
  presentationDeBloc,
  styleSemantiqueBloc,
  trierBlocsMateriels,
  type BibleEditionMember,
  type BibleVerseNote,
} from './bibleEdition'

const NOTES: BibleVerseNote[] = [
  {
    id: 'n2', noteKey: 'MRK-1-002', canonId: 'MRK.1.1', displayChapterKey: 'MRK.1',
    displayNumber: 2, appliesTo: 'family', appliesToMemberId: null,
  },
  {
    id: 'n1', noteKey: 'MRK-1-001', canonId: 'MRK.1.1', displayChapterKey: 'MRK.1',
    displayNumber: 1, appliesTo: 'member', appliesToMemberId: 'fr',
  },
  {
    id: 'n3', noteKey: 'MRK-1-003', canonId: 'MRK.1.2', displayChapterKey: 'MRK.1',
    displayNumber: 3, appliesTo: 'family', appliesToMemberId: null,
  },
]

describe('modèle éditorial biblique', () => {
  it('dérive les styles sémantiques attendus', () => {
    expect(styleSemantiqueBloc('introduction', 'book')).toBe('introduction_livre')
    expect(styleSemantiqueBloc('commentary', 'pericope')).toBe('commentaire_pericope')
    expect(styleSemantiqueBloc('summary', 'chapter')).toBe('sommaire_chapitre')
    expect(styleSemantiqueBloc('title', 'book_group')).toBe('titre_groupe_livres')
  })

  it('donne à un titre de bloc le rang de sa portée, comme les niveaux d’une œuvre', () => {
    // Ce qui surmonte la même étendue partage le même rang, quel que soit le
    // genre du bloc : une introduction de livre et son sommaire vont ensemble.
    expect(rangTitreBloc('introduction_livre')).toBe(1)
    expect(rangTitreBloc('sommaire_livre')).toBe(1)
    expect(rangTitreBloc('introduction_testament')).toBe(1)
    expect(rangTitreBloc('introduction_chapitre')).toBe(2)
    expect(rangTitreBloc('commentaire_section')).toBe(2)
    expect(rangTitreBloc('titre_partie')).toBe(2)
    expect(rangTitreBloc('commentaire_pericope')).toBe(3)
    expect(rangTitreBloc('conclusion_pericope')).toBe(3)
    // Un style inconnu descend au rang le plus bas plutôt que de dominer la page.
    expect(rangTitreBloc('excursus_inconnu')).toBe(3)
  })

  it('garde le sous-type de notice hors du style sémantique', () => {
    // Deux notices de portées différentes gardent leurs styles ; le sous-type
    // ne s'y invite pas et reste une qualification séparée.
    expect(styleSemantiqueBloc('notice', 'book')).toBe('notice_livre')
    expect(styleSemantiqueBloc('notice', 'pericope')).toBe('notice_pericope')
  })

  it('n’admet un sous-type que sur une notice, et dans le vocabulaire arrêté', () => {
    expect(erreursSousTypeNotice('notice', 'geographical')).toEqual([])
    expect(erreursSousTypeNotice('notice', null)).toEqual([])
    expect(erreursSousTypeNotice('introduction', null)).toEqual([])
    expect(erreursSousTypeNotice('introduction', 'historical')).toHaveLength(1)
    expect(erreursSousTypeNotice('notice', 'zoologique')).toHaveLength(1)
    expect(erreursSousTypeNotice('commentary', 'zoologique')).toHaveLength(2)
    expect(erreursSousTypeNotice('notice', 'critical_apparatus')).toEqual([])
    expect(erreursSousTypeNotice('notice', 'bibliography')).toEqual([])
    expect(erreursSousTypeNotice('notice', 'sigla')).toEqual([])
    expect(erreursSousTypeNotice('notice', 'transcription_table')).toEqual([])
    expect(erreursSousTypeNotice('notice', 'editorial_matter')).toEqual([])
  })

  it('ouvre un livre sur SES liminaires, et sur eux seuls', () => {
    // L'introduction du livre reste en tête de son premier chapitre.
    expect(blocSansAncreVisibleDansChapitre('book', 'before', true, false)).toBe(true)
    expect(blocSansAncreVisibleDansChapitre('book', 'before', false, false)).toBe(false)
    expect(blocSansAncreVisibleDansChapitre('book', 'after', false, true)).toBe(true)
    // ⛔ Ce qui dépasse le livre s'en va au sommaire de l'édition : soixante-deux
    // pièces s'imprimaient avant le premier verset de la Genèse, dont quinze
    // notices bibliographiques et une page de titre.
    for (const scope of ['bible', 'testament', 'book_group'] as const) {
      expect(blocSansAncreVisibleDansChapitre(scope, 'before', true, false)).toBe(false)
      expect(blocSansAncreVisibleDansChapitre(scope, 'after', false, true)).toBe(false)
    }
    expect(blocSansAncreVisibleDansChapitre('chapter', 'before', true, false)).toBe(false)
  })

  it('tait au rendu un sous-type incohérent plutôt que de l’afficher', () => {
    expect(sousTypeNoticeValide('notice', 'liturgical')).toBe('liturgical')
    expect(sousTypeNoticeValide('notice', null)).toBeNull()
    expect(sousTypeNoticeValide('commentary', 'liturgical')).toBeNull()
    expect(sousTypeNoticeValide('notice', 'zoologique')).toBeNull()
  })

  it('distingue contenu commun et contenu propre à un membre', () => {
    expect(appartientAuMembre(NOTES[0], 'la')).toBe(true)
    expect(appartientAuMembre(NOTES[1], 'fr')).toBe(true)
    expect(appartientAuMembre(NOTES[1], 'la')).toBe(false)
    expect(erreursApplicabilite('family', null)).toEqual([])
    expect(erreursApplicabilite('member', null)).toHaveLength(1)
  })

  it('indexe les appels par verset et par membre dans l’ordre visible', () => {
    expect(notesDuVerset(NOTES, 'MRK.1.1', 'fr').map((note) => note.id)).toEqual(['n1', 'n2'])
    expect(notesDuVerset(NOTES, 'MRK.1.1', 'la').map((note) => note.id)).toEqual(['n2'])
    expect(indexerNotesParVerset(NOTES, 'fr').get('MRK.1.2')?.[0].id).toBe('n3')
  })

  it('respecte l’ordre matériel indépendamment de la portée canonique', () => {
    const blocs = [
      { materialOrder: 30, blockKey: 'conclusion' },
      { materialOrder: 10, blockKey: 'introduction' },
      { materialOrder: 20, blockKey: 'commentaire' },
    ]
    expect(trierBlocsMateriels(blocs).map((bloc) => bloc.blockKey)).toEqual([
      'introduction', 'commentaire', 'conclusion',
    ])
  })

  it('place les introductions et commentaires de plage dans le corps', () => {
    const base = {
      semanticStyleCode: 'commentaire_pericope',
      heading: null,
      textBlocks: [],
      internalNotes: [],
    }
    const index = indexerBlocsDeCorps([
      { ...base, id: 'conclusion', placement: 'after', canonIdStart: 'MRK.1.1', canonIdEnd: 'MRK.1.3', materialOrder: 30 },
      { ...base, id: 'introduction', placement: 'before', canonIdStart: null, canonIdEnd: null, materialOrder: 10 },
      { ...base, id: 'pericope', placement: 'before', canonIdStart: 'MRK.1.1', canonIdEnd: 'MRK.1.3', materialOrder: 20 },
    ])
    expect(index.opening.map((bloc) => bloc.id)).toEqual(['introduction'])
    expect(index.beforeByCanon.get('MRK.1.1')?.map((bloc) => bloc.id)).toEqual(['pericope'])
    expect(index.afterByCanon.get('MRK.1.3')?.map((bloc) => bloc.id)).toEqual(['conclusion'])
  })

  it('place les illustrations dans le livre, un bloc, une note ou près du verset', () => {
    const base = {
      assetKind: 'illustration',
      url: 'https://example.test/image.webp',
      width: 800,
      height: 600,
      altText: 'Illustration',
      caption: null,
      printedPage: '90',
      canonIdEnd: null,
    }
    const index = indexerIllustrations([
      { ...base, id: 'book', assetKey: 'book', placement: 'before', canonIdStart: null, bodyBlockId: null, noteId: null, materialOrder: 10 },
      { ...base, id: 'verse', assetKey: 'verse', placement: 'after', canonIdStart: 'MRK.1.1', bodyBlockId: null, noteId: null, materialOrder: 20 },
      { ...base, id: 'block', assetKey: 'block', placement: 'inline', canonIdStart: null, bodyBlockId: 'intro', noteId: null, materialOrder: 30 },
      { ...base, id: 'note', assetKey: 'note', placement: 'inline', canonIdStart: null, bodyBlockId: null, noteId: 'note-1', materialOrder: 40 },
    ])
    expect(index.opening.map((asset) => asset.id)).toEqual(['book'])
    expect(index.afterByCanon.get('MRK.1.1')?.map((asset) => asset.id)).toEqual(['verse'])
    expect(index.byBodyBlock.get('intro')?.map((asset) => asset.id)).toEqual(['block'])
    expect(index.byNote.get('note-1')?.map((asset) => asset.id)).toEqual(['note'])
  })

  it('suit l’ordre déclaré par l’édition, à l’écran comme sur mobile', () => {
    const membres: BibleEditionMember[] = [
      { id: 'fr', translationId: 'fr', languageCode: 'fr', displayOrder: 2, desktopPosition: 'right', mobileOrder: 2 },
      { id: 'la', translationId: 'la', languageCode: 'la', displayOrder: 1, desktopPosition: 'left', mobileOrder: 1 },
    ]
    const ordre = ordonnerMembresBilingues(membres)
    expect(ordre.desktop.map((membre) => membre.id)).toEqual(['la', 'fr'])
    expect(ordre.mobile.map((membre) => membre.id)).toEqual(['la', 'fr'])
  })

  it('applique les offsets en points de code et conserve les jointures matérielles', () => {
    expect(couperPointsDeCode('A𐀀BC', 1, 3)).toBe('𐀀B')
    expect(recomposerFragmentsMateriels([
      { text: 'In principio', startOffset: null, endOffset: null, joinBefore: 'none' },
      { text: 'erat Verbum', startOffset: null, endOffset: null, joinBefore: 'space' },
      { text: 'Et Verbum', startOffset: null, endOffset: null, joinBefore: 'paragraph_break' },
    ])).toBe('In principio erat Verbum\n\nEt Verbum')
  })

  it('projette une structure éditoriale sans altérer la transcription source', () => {
    const source = '1° Le titre. — Corps source.\n\nSecond paragraphe.'
    const blocs = blocsTexteEditoriaux('intro', source, {
      editorial_normalization: {
        blocks: [
          {
            id: 'intro:h1', kind: 'heading', form: 'prose', reading_text: '1° Le titre',
            source_start_offset_unicode: 0, source_end_offset_unicode: 15,
            heading_level: 'T4', presentation: { text_align: 'left', font_style: 'italic' },
          },
          {
            id: 'intro:p1', kind: 'commentary', form: 'prose', reading_text: 'Corps normalisé.',
            source_start_offset_unicode: 16, source_end_offset_unicode: 30,
            presentation: { text_align: 'justify', font_style: 'normal' },
            inline_spans: [{
              start_offset_unicode: 0, end_offset_unicode: 5,
              kind: 'foreign_expression', rendering: 'italic', language: 'la',
            }],
          },
        ],
      },
    })
    expect(blocs).toHaveLength(2)
    expect(blocs[0]).toMatchObject({ kind: 'heading', headingLevel: 'T4', text: '1° Le titre' })
    expect(blocs[1]).toMatchObject({
      kind: 'commentary', text: 'Corps normalisé.',
      inlineSpans: [{ kind: 'foreign_expression', rendering: 'italic', language: 'la' }],
    })
    expect(source).toBe('1° Le titre. — Corps source.\n\nSecond paragraphe.')
  })

  it('rend les paragraphes source séparément tant que la couche manque', () => {
    const blocs = blocsTexteEditoriaux('intro', 'Premier.\n\nSecond.', null)
    expect(blocs.map((bloc) => bloc.text)).toEqual(['Premier.', 'Second.'])
    expect(blocs.map((bloc) => [bloc.sourceStartOffsetUnicode, bloc.sourceEndOffsetUnicode]))
      .toEqual([[0, 8], [10, 17]])
  })

  it('ne rend aucun paragraphe pour un bloc sans corps', () => {
    // Un bloc de titre n'a pas de corps : le paragraphe vide qu'il produisait
    // posait un blanc sous chaque titre, et séparait « Première partie » de son
    // sous-titre.
    expect(blocsTexteEditoriaux('titre', '', null)).toEqual([])
    expect(blocsTexteEditoriaux('titre', '  \n\n ', null)).toEqual([])
  })

  it('distingue les sous-titres de partie et de section dans le vocabulaire fermé', () => {
    expect(presentationDeBloc({ display_role: 'part_subtitle' })?.displayRole).toBe('part_subtitle')
    expect(presentationDeBloc({ display_role: 'section_subtitle' })?.displayRole).toBe('section_subtitle')
    expect(presentationDeBloc({ display_role: 'subtitle_guessed_from_text' })).toBeNull()
  })
})
