import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ContenuNoteStructuree } from './ContenuNoteStructuree'
import { projeterAppelsNotesStructurees } from '@/app/lib/appelsNotesStructurees'
import { ROLE_APPARAT_CRITIQUE } from '@/app/lib/apparatCritique'
import type { NoteBlocData, NoteStructuree } from './oeuvreTypes'

// Rendu de l'APPARAT CRITIQUE. On passe volontairement par `ContenuNoteStructuree`
// et non par `ContenuApparatCritique` : ce qu'on veut éprouver, c'est justement
// l'aiguillage — l'apparat prend la voie neuve, tout le reste garde l'ancienne.

/** Le texte que le lecteur voit et copie : le balisage retiré, les entités rendues. */
function texteVu(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&#x27;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}

function blocApparat(overrides: Partial<NoteBlocData> = {}): NoteBlocData {
  return {
    blockId: 'AUG-CONF-KNOLL-APP-   2:b001',
    rank: 1,
    kind: 'commentary',
    form: 'prose',
    language: 'la',
    text: '3 uirtus (r ex s corr.) B; est] est et BPQ.',
    rendering: null,
    needsReview: true,
    targetBlockId: null,
    translationOf: null,
    editorialRole: ROLE_APPARAT_CRITIQUE,
    printedLine: 3,
    visualReviewReason: null,
    humanValidated: false,
    ...overrides,
  }
}

function noteApparat(...blocs: NoteBlocData[]): NoteStructuree {
  return {
    noteKey: 'AUG-CONF-KNOLL-APP-   2',
    noteNumber: 2,
    blocks: blocs.length ? blocs : [blocApparat()],
  }
}

function blocOrdinaire(overrides: Partial<NoteBlocData> = {}): NoteBlocData {
  return {
    blockId: 'b1', rank: 100, kind: 'commentary', form: 'prose',
    language: 'fr', text: 'Une note de prose ordinaire', rendering: 'word_paragraph',
    needsReview: false, targetBlockId: null, translationOf: null,
    ...overrides,
  }
}

describe('rendu d’un bloc critical_apparatus', () => {
  it('affiche la leçon sans le numéro de ligne imprimée', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={noteApparat()} />)
    expect(html).toContain('uirtus (r ex s corr.) B; est] est et BPQ.')
    expect(html).not.toContain('>3 uirtus')
  })

  it('emprunte la voie de l’apparat, et non celle de la note ordinaire', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={noteApparat()} />)
    expect(html).toContain('data-apparat-critique')
    expect(html).toContain(`data-editorial-role="${ROLE_APPARAT_CRITIQUE}"`)
  })

  it('NE recompose AUCUNE ponctuation : pas de fine insécable, pas de point ajouté', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={noteApparat(
      blocApparat({ text: '4 inuenient BCFMO2PQW edd', printedLine: 4 }),
    )} />)
    // Le rendu ordinaire aurait écrit « edd. » — l’apparat ne termine pas les phrases d’autrui.
    expect(html).toContain('>inuenient BCFMO2PQW edd</p>')

    const avecPonctuation = renderToStaticMarkup(<ContenuNoteStructuree note={noteApparat(
      blocApparat({ text: '8 quia] qui C; a te QV1: uide adn.', printedLine: 8 }),
    )} />)
    expect(avecPonctuation).toContain('quia] qui C; a te QV1: uide adn.')
    expect(avecPonctuation).not.toContain(' ;')
    expect(avecPonctuation).not.toContain(' :')
  })

  it('conserve intacts sigles, crochets, astérisques, rasurae et abréviations', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={noteApparat(
      blocApparat({ text: '5 quaeram] **eram F; et] ut M2 supra lin.; s. l. (ras.) ***', printedLine: 5 }),
    )} />)
    expect(html).toContain('quaeram] **eram F; et] ut M2 supra lin.; s. l. (ras.) ***')
  })

  it('préserve les blancs de l’édition, pour que la copie rende le texte au caractère près', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={noteApparat()} />)
    expect(html).toContain('white-space:pre-wrap')
  })

  it('compose plus serré que la note ordinaire, et sans encadré', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={noteApparat()} />)
    expect(html).toContain('font-size:0.94em')
    expect(html).toContain('line-height:1.34')
    expect(html).not.toContain('border')
  })

  it('n’affiche le numéro de ligne nulle part dans le TEXTE lu, et le garde en métadonnée', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={noteApparat()} />)
    // Le texte que le lecteur voit et copie, débarrassé du balisage.
    expect(texteVu(html)).toBe('uirtus (r ex s corr.) B; est] est et BPQ.')
    expect(texteVu(html)).not.toContain('l. 3')
    // La ligne reste disponible, mais en attribut : métadonnée du document, pas lecture.
    expect(html).toContain('data-printed-line="3"')
  })

  it('ne divulgue pas la raison de contrôle visuel au lecteur ordinaire', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={noteApparat(
      blocApparat({ visualReviewReason: 'abréviation « ds » à contrôler sur le fac-similé' }),
    )} />)
    expect(html).not.toContain('fac-similé')
    expect(html).not.toContain('data-mention-admin')
  })

  it('rend chacun des blocs d’une note d’apparat qui en porterait plusieurs, dans l’ordre des rangs', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={noteApparat(
      blocApparat({ blockId: 'b2', rank: 2, text: '9 domine] deus b.', printedLine: 9 }),
      blocApparat({ blockId: 'b1', rank: 1, text: '8 quia] qui C.', printedLine: 8 }),
    )} />)
    expect(html.indexOf('quia] qui C.')).toBeLessThan(html.indexOf('domine] deus b.'))
    expect(html).not.toContain('>9 domine')
  })
})

describe('l’apparat ne déborde pas sur les autres notes', () => {
  it('laisse la note de prose ordinaire à son rendu d’origine', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={{
      noteKey: 'N-1', noteNumber: 1, blocks: [blocOrdinaire()],
    }} />)
    expect(html).not.toContain('data-apparat-critique')
    // Le rendu ordinaire termine la note d’un point : c’est SA règle, préservée.
    expect(html).toContain('Une note de prose ordinaire.')
  })

  it('NE retire PAS un nombre initial d’une note ordinaire, même avec un printed_line', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={{
      noteKey: 'N-2', noteNumber: 2,
      blocks: [blocOrdinaire({ text: '3 mars 1649, sur la copie de Port-Royal', printedLine: 3 })],
    }} />)
    expect(html).toContain('3 mars 1649, sur la copie de Port-Royal.')
  })

  it('laisse une note MIXTE au rendu ordinaire, apparat ou non', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={{
      noteKey: 'N-3', noteNumber: 3,
      blocks: [
        blocApparat({ rank: 1 }),
        blocOrdinaire({ blockId: 'b9', rank: 2, text: 'Voir le livre III' }),
      ],
    }} />)
    expect(html).not.toContain('data-apparat-critique')
    // Le bloc d’apparat garde alors son texte entier : hors de sa voie, rien n’est retiré.
    expect(html).toContain('3 uirtus (r ex s corr.)')
  })

  it('laisse intacts renvois bibliques, traductions et citations en vers', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={{
      noteKey: 'N-4', noteNumber: 4,
      blocks: [
        blocOrdinaire({ blockId: 'poeme', kind: 'quotation', form: 'verse', text: 'Premier vers\nSecond vers' }),
        blocOrdinaire({ blockId: 'trad', rank: 200, kind: 'translation', text: 'La traduction' }),
        blocOrdinaire({
          blockId: 'ref', rank: 300, kind: 'reference', text: '1Co. 2, 16',
          rendering: 'inline_after_target', targetBlockId: 'poeme',
        }),
      ],
    }} />)
    expect(html).not.toContain('data-apparat-critique')
    expect(html).toContain('Premier vers\nSecond vers')
    expect(html).toContain('1 Co 2, 16')
    expect(html).toContain('border-left')
  })
})

describe('ce que le rendu ne touche jamais', () => {
  it('conserve le rattachement de l’appel à la note : clé et numéro inchangés', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={noteApparat()} />)
    expect(html).toContain('data-note-key="AUG-CONF-KNOLL-APP-   2"')
    expect(html).toContain('data-note-number="2"')
  })

  it('ne modifie NI la note, NI ses blocs : ni statut de revue, ni numéro, ni texte source', () => {
    const note = noteApparat()
    const avant = JSON.parse(JSON.stringify(note))
    renderToStaticMarkup(<ContenuNoteStructuree note={note} />)
    expect(note).toEqual(avant)
    expect(note.blocks[0].needsReview).toBe(true)
    expect(note.blocks[0].humanValidated).toBe(false)
    expect(note.blocks[0].text).toBe('3 uirtus (r ex s corr.) B; est] est et BPQ.')
    expect(note.noteKey).toBe('AUG-CONF-KNOLL-APP-   2')
    expect(note.noteNumber).toBe(2)
  })

  it('reporte tel quel l’état de revue dans le DOM, sans jamais le décider', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={noteApparat()} />)
    expect(html).toContain('data-needs-review="true"')
    expect(html).toContain('data-human-validated="false"')
  })

  it('laisse les ancres et leurs offsets faire leur office, apparat compris', () => {
    const segment = 'Magnus es, domine, et laudabilis ualde'
    const ancres = [
      { noteKey: 'AUG-CONF-KNOLL-APP-   2', marker: '[[2]]', segmentOffsetUnicode: 9, sourceTarget: 'segment_texte' },
      { noteKey: 'AUG-CONF-KNOLL-APP-   3', marker: '[[3]]', segmentOffsetUnicode: 38, sourceTarget: 'segment_texte' },
    ]
    expect(projeterAppelsNotesStructurees(segment, ancres))
      .toBe('Magnus es[[2]], domine, et laudabilis ualde[[3]]')
  })
})
