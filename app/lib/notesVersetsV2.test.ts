import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  chapitreDuCanon, composerNotesV2, filtreChapitreNotesV2, placeDeLaLigne, placerNotesV2,
  positionsDesVersets, positionsEnRegard, type LigneNoteV2,
} from './notesVersetsV2'

const ligne = (surcharge: Partial<LigneNoteV2>): LigneNoteV2 => ({
  id: 'l1', trad_id: 'TR0001', livre: 'PSA', canon_id: null, ch_orig: null, v_orig: null,
  v_orig_suffixe: null, est_suscription: false, ordre_slot: null, texte: 'Texte', notes: 'Une note.',
  ...surcharge,
})

const verset = (id_verset: string, textes: Record<string, string | null> = {}) => ({ id_verset, ...textes })

describe('filtreChapitreNotesV2', () => {
  it('demande le créneau du chapitre et le chapitre de l’édition', () => {
    expect(filtreChapitreNotesV2('PSA', 9)).toBe('canon_id.like.PSA.9.*,ch_orig.eq.9')
  })
  it('ajoute le chapitre 0 au premier chapitre : un prologue se pose en tête', () => {
    expect(filtreChapitreNotesV2('SIR', 1)).toBe('canon_id.like.SIR.1.*,ch_orig.eq.1,ch_orig.eq.0')
  })
})

describe('chapitreDuCanon', () => {
  it('lit le chapitre d’un créneau du livre', () => {
    expect(chapitreDuCanon('PSA.10.4', 'PSA')).toBe(10)
    expect(chapitreDuCanon('1SA.24.7', '1SA')).toBe(24)
  })
  it('refuse un créneau d’un autre livre ou mal formé', () => {
    expect(chapitreDuCanon('DAN.3.1', 'SUS')).toBeNull()
    expect(chapitreDuCanon('PSA.x.1', 'PSA')).toBeNull()
  })
})

describe('placeDeLaLigne — vue large', () => {
  it('un verset aligné se pose sur son créneau, au chapitre du canon', () => {
    expect(placeDeLaLigne(ligne({ canon_id: 'PSA.10.4', ch_orig: 9, v_orig: 25 }), 'PSA', 'vue-large'))
      .toEqual({ genre: 'propre', id: 'PSA.10.4', chapitre: 10 })
  })
  it('une suscription se pose sur la ligne de son chapitre d’édition, créneau ou non', () => {
    expect(placeDeLaLigne(ligne({ est_suscription: true, canon_id: 'PSA.38.1', ch_orig: 38, v_orig: 0 }), 'PSA', 'vue-large'))
      .toEqual({ genre: 'propre', id: 'PSA.38.0^', chapitre: 38 })
  })
  it('un verset hors canon se pose sur sa ligne surnuméraire', () => {
    expect(placeDeLaLigne(ligne({ livre: 'SIR', ch_orig: 3, v_orig: 32 }), 'SIR', 'vue-large'))
      .toEqual({ genre: 'propre', id: 'SIR.3.32+', chapitre: 3 })
  })
  it('un chapitre 0 n’a pas de page : la note est orpheline en tête du chapitre 1', () => {
    expect(placeDeLaLigne(ligne({ livre: 'SIR', ch_orig: 0, v_orig: 0 }), 'SIR', 'vue-large'))
      .toEqual({ genre: 'orpheline', chapitre: 1 })
  })
})

describe('placeDeLaLigne — par le canon', () => {
  it('une suscription qui porte un créneau se lit sous le créneau', () => {
    expect(placeDeLaLigne(ligne({ est_suscription: true, canon_id: 'PSA.38.1', ch_orig: 38, v_orig: 0 }), 'PSA', 'canon-v2'))
      .toEqual({ genre: 'propre', id: 'PSA.38.1', chapitre: 38 })
  })
  it('une ligne hors canon ne paraît que si elle est une glose, sous son identifiant', () => {
    expect(placeDeLaLigne(ligne({ id: 'uuid-1', livre: 'GEN', ch_orig: 13, v_orig: 18 }), 'GEN', 'canon-v2'))
      .toEqual({ genre: 'propre', id: 'uuid-1', chapitre: 13 })
  })
})

describe('placerNotesV2', () => {
  const positionsGen12 = positionsDesVersets([
    verset('GEN.12.7', { TR0013: 'sept' }),
    verset('GEN.12.8', { TR0013: 'huit' }),
    verset('GEN.12.9', { TR0013: 'neuf' }),
  ], 'TR0013')

  it('pose une note sur son propre texte quand la page le montre', () => {
    const placees = placerNotesV2(
      [ligne({ id: 'g', trad_id: 'TR0013', livre: 'GEN', ch_orig: 12, v_orig: 8 })],
      { livre: 'GEN', chapitre: 12, mode: 'canon-v2', positions: { ordre: ['GEN.12.8', 'g'], premiere: 'GEN.12.8' } },
    )
    expect(placees).toEqual([expect.objectContaining({ cible: 'g', propre: true })])
  })

  it('pose un fragment que la page écarte sur le verset qu’il suit', () => {
    const placees = placerNotesV2(
      [ligne({ id: 'x', trad_id: 'TR0013', livre: 'GEN', ch_orig: 12, v_orig: 8, v_orig_suffixe: 'extra-1' })],
      { livre: 'GEN', chapitre: 12, mode: 'canon-v2', positions: positionsGen12 },
    )
    expect(placees).toEqual([expect.objectContaining({ cible: 'GEN.12.8', propre: false })])
  })

  it('pose un repère sans verset hôte en tête du chapitre, sur le premier texte', () => {
    const placees = placerNotesV2(
      [ligne({ id: 'r', trad_id: 'TR0013', livre: 'GEN', ch_orig: 12, v_orig: 0, v_orig_suffixe: 'extra-chapter' })],
      {
        livre: 'GEN', chapitre: 12, mode: 'canon-v2',
        positions: positionsDesVersets([verset('GEN.12.1', {}), verset('GEN.12.2', { TR0013: 'deux' })], 'TR0013'),
      },
    )
    expect(placees).toEqual([expect.objectContaining({ cible: 'GEN.12.2', propre: false })])
  })

  it('écarte une ligne qui paraît sur une autre page du livre', () => {
    const placees = placerNotesV2(
      [ligne({ canon_id: 'PSA.10.1', ch_orig: 9, v_orig: 22 })],
      { livre: 'PSA', chapitre: 9, mode: 'vue-large', positions: { ordre: ['PSA.9.1', 'PSA.9.22+'], premiere: 'PSA.9.1' } },
    )
    expect(placees).toEqual([])
  })

  it('écarte une note vide', () => {
    const placees = placerNotesV2(
      [ligne({ canon_id: 'PSA.9.2', ch_orig: 9, v_orig: 2, notes: '   ' })],
      { livre: 'PSA', chapitre: 9, mode: 'vue-large', positions: { ordre: ['PSA.9.2'], premiere: 'PSA.9.2' } },
    )
    expect(placees).toEqual([])
  })
})

describe('composerNotesV2', () => {
  const positions = positionsDesVersets([
    verset('PSA.9.0^', { TR0001: 'Pour la fin.' }),
    verset('PSA.9.1', { TR0001: 'un' }),
    verset('PSA.9.2', { TR0001: 'deux' }),
  ], 'TR0001')

  it('numérote dans l’ordre de lecture, à partir du début donné', () => {
    const notes = composerNotesV2([
      ligne({ id: 'b', canon_id: 'PSA.9.2', ch_orig: 9, v_orig: 3, notes: 'Deuxième.' }),
      ligne({ id: 'a', est_suscription: true, canon_id: 'PSA.9.1', ch_orig: 9, v_orig: 0, notes: 'Argument.' }),
    ], { livre: 'PSA', chapitre: 9, mode: 'vue-large', positions, debut: 4 })
    expect(notes.map((note) => [note.id, note.displayNumber, note.canonId])).toEqual([
      ['v2-a', 4, 'PSA.9.0^'],
      ['v2-b', 5, 'PSA.9.2'],
    ])
  })

  it('compose la note seule quand son texte paraît, sans tête', () => {
    const [note] = composerNotesV2(
      [ligne({ id: 'a', canon_id: 'PSA.9.1', ch_orig: 9, v_orig: 1, notes: '  <i>David</i> remercie Dieu.  ' })],
      { livre: 'PSA', chapitre: 9, mode: 'vue-large', positions, debut: 1 },
    )
    expect(note.blocks).toEqual([
      { id: 'v2-a-note', kind: 'commentary', form: 'prose', text: '<i>David</i> remercie Dieu.', language: 'fr' },
    ])
    expect(note.sousType).toBeNull()
  })

  it('cite le fragment qu’une note orpheline explique, dans la langue de sa bible', () => {
    const [note] = composerNotesV2(
      [ligne({ id: 'p', trad_id: 'TR0005', livre: 'SIR', ch_orig: 0, v_orig: 0, texte: ' ΠΟΛΛΩΝ καὶ μεγάλων ', notes: 'Prologue du traducteur grec.' })],
      {
        livre: 'SIR', chapitre: 1, mode: 'vue-large', debut: 1, langueDuTexte: 'grc',
        positions: positionsDesVersets([verset('SIR.1.1', { TR0005: 'Πᾶσα σοφία' })], 'TR0005'),
      },
    )
    expect(note.canonId).toBe('SIR.1.1')
    expect(note.blocks).toEqual([
      { id: 'v2-p-texte', kind: 'lemma', form: 'prose', text: 'ΠΟΛΛΩΝ καὶ μεγάλων', language: 'grc' },
      { id: 'v2-p-note', kind: 'commentary', form: 'prose', text: 'Prologue du traducteur grec.', language: 'fr' },
    ])
  })

  it('sort un fragment long en citation, comme toute citation qui atteint le seuil', () => {
    const long = 'Mathusalé vécut cent quatre-vingt-sept ans. '.repeat(10)
    const [note] = composerNotesV2(
      [ligne({ id: 'd', trad_id: 'TR0013', livre: 'GEN', ch_orig: 6, v_orig: 8, v_orig_suffixe: 'extra-1', texte: long, notes: 'Dittographie.' })],
      {
        livre: 'GEN', chapitre: 6, mode: 'canon-v2', debut: 1, langueDuTexte: 'fr',
        positions: positionsDesVersets([verset('GEN.6.8', { TR0013: 'huit' })], 'TR0013'),
      },
    )
    expect(long.trim().length).toBeGreaterThanOrEqual(400)
    expect(note.blocks.map((bloc) => bloc.kind)).toEqual(['quotation', 'commentary'])
  })

  it('dans une note, ce que la ligne dit de son texte précède ce qu’elle dit du fragment qui la suit', () => {
    const notes = composerNotesV2([
      ligne({ id: 'frag', trad_id: 'TR0013', livre: 'GEN', ch_orig: 12, v_orig: 8, v_orig_suffixe: 'extra-1', ordre_slot: 1, notes: 'Répétition.' }),
      ligne({ id: 'vers', trad_id: 'TR0013', livre: 'GEN', canon_id: 'GEN.12.8', ch_orig: 12, v_orig: 8, ordre_slot: 9, notes: 'Du verset.' }),
    ], {
      livre: 'GEN', chapitre: 12, mode: 'canon-v2', debut: 1,
      positions: positionsDesVersets([verset('GEN.12.8', { TR0013: 'huit' })], 'TR0013'),
    })
    expect(notes).toHaveLength(1)
    expect(notes[0].id).toBe('v2-vers')
    expect(notes[0].blocks.map((bloc) => bloc.id)).toEqual(['v2-vers-note', 'v2-frag-texte', 'v2-frag-note'])
  })

  it('une bible n’appelle qu’une note par ligne, et ne redit pas un paragraphe identique', () => {
    const titre = 'Titre du psaume, que la Vulgate compte comme un verset.'
    const notes = composerNotesV2([
      ligne({ id: 't1', trad_id: 'TR0004', est_suscription: true, ch_orig: 50, v_orig: 1, notes: titre }),
      ligne({ id: 't2', trad_id: 'TR0004', est_suscription: true, ch_orig: 50, v_orig: 2, notes: titre }),
      ligne({ id: 'p1', trad_id: 'TR0004', canon_id: 'PSA.50.3', ch_orig: 50, v_orig: 3, ordre_slot: 1, notes: 'Partie 1 sur 2.' }),
      ligne({ id: 'p2', trad_id: 'TR0004', canon_id: 'PSA.50.3', ch_orig: 50, v_orig: 4, ordre_slot: 2, notes: 'Partie 2 sur 2.' }),
    ], {
      livre: 'PSA', chapitre: 50, mode: 'vue-large', debut: 1,
      positions: positionsDesVersets([verset('PSA.50.0^', { TR0004: 'titre' }), verset('PSA.50.3', { TR0004: 'trois' })], 'TR0004'),
    })
    expect(notes.map((note) => [note.displayNumber, note.canonId, note.blocks.map((bloc) => bloc.text)])).toEqual([
      [1, 'PSA.50.0^', [titre]],
      [2, 'PSA.50.3', ['Partie 1 sur 2.', 'Partie 2 sur 2.']],
    ])
  })
})

describe('positionsEnRegard', () => {
  it('insère la ligne d’une glose derrière sa clé, et prend la première cellule de la colonne', () => {
    const positions = positionsEnRegard(
      ['GEN.13.17', 'GEN.13.18', 'glose:GEN.13.18:1'],
      [
        { canonId: 'GEN.13.18' },
        { canonId: 'glose:GEN.13.18:1', cibleDesNotes: 'uuid-glose' },
      ],
    )
    expect(positions).toEqual({
      ordre: ['GEN.13.17', 'GEN.13.18', 'glose:GEN.13.18:1', 'uuid-glose'],
      premiere: 'GEN.13.18',
    })
  })
})

// ⛔ Le branchement se relit dans les sources : un report oublié ferait taire les notes d'une bible
// sans un mot, la page se rendant quand même.
describe('branchement sur la page Bible', () => {
  const PAGE = readFileSync('app/page.tsx', 'utf8')
  const MISE_EN_PAGE = readFileSync('app/components/BibleLayout.tsx', 'utf8')
  const TEXTE = readFileSync('app/components/TexteBible.tsx', 'utf8')

  it('la page compose les notes pour une colonne ET pour la lecture en regard', () => {
    expect(PAGE.split('composerNotesV2(').length - 1).toBe(2)
    expect(PAGE).toContain('positionsDesVersets(versets, code)')
    expect(PAGE).toContain('positionsEnRegard(chargee.axeCanonique, colonne.cellules)')
    expect(PAGE).toContain('...notesEnRegard]')
    expect(PAGE).toContain('notesDesVersets={notesDesVersets}')
  })

  it('la lecture « Sans les commentaires » ne les demande pas', () => {
    expect(PAGE).toContain('texteSeul || codes.length === 0')
  })

  it('la mise en page les passe au texte, qui les appelle avec celles de l’édition', () => {
    expect(MISE_EN_PAGE).toContain('notesDesVersets={notesDesVersets}')
    expect(TEXTE).toContain('...(notesDesVersets?.[traduction] ?? [])')
  })
})
