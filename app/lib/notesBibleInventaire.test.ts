import { describe, expect, it } from 'vitest'
import {
  apercuNoteBible,
  cleInventaireNotesBible,
  comptesParIntituleBible,
  filtrerNotesBible,
  grouperNotesBible,
  INTITULE_APPARAT_EDITORIAL,
  intituleNoteVerset,
  lieuDuBloc,
  noteSurPlace,
  pointDuCanon,
  RAISONS_ABSENCE,
  recenserNotesBible,
  repereDuBloc,
  type LigneBlocEditorial,
  type LigneNoteDeBloc,
  type LigneNoteVerset,
  type PieceDuBloc,
} from './notesBibleInventaire'

const MEMBRE_FR = { id: 'membre-fr', libelle: 'Français' }
const MEMBRE_LA = { id: 'membre-la', libelle: 'Latin' }

function bloc(partiel: Partial<LigneBlocEditorial> & { id: string }): LigneBlocEditorial {
  return {
    block_key: partiel.id, scope_kind: 'section', placement: 'before',
    applies_to: 'family', applies_to_member_id: null, heading: null,
    canon_id_start: 'MRK.1.1', canon_id_end: 'MRK.1.8', material_order: 10,
    semantic_style_code: 'commentaire', semantic_level: 'I5', embedded_title_level: null,
    ...partiel,
  }
}

function noteVerset(partiel: Partial<LigneNoteVerset> & { id: string }): LigneNoteVerset {
  return {
    applies_to: 'family', applies_to_member_id: null, note_subtype: 'textual',
    canon_id: 'MRK.1.4', display_number: 1, material_order: 1,
    blocks: [{ rank: 1, text: 'Leçon du manuscrit.', needs_review: false }],
    ...partiel,
  }
}

function noteDeBloc(partiel: Partial<LigneNoteDeBloc> & { id: string; body_block_id: string }): LigneNoteDeBloc {
  return {
    display_number: 1, material_order: 1,
    blocks: [{ rank: 1, text: 'Note du commentaire.', needs_review: false }],
    ...partiel,
  }
}

const SANS_PIECE = new Map<string, PieceDuBloc>()

describe('les intitulés et les repères', () => {
  it('nomme les sous-types connus en français, et le reste « Autre »', () => {
    expect(intituleNoteVerset('textual')).toBe('Critique textuelle')
    expect(intituleNoteVerset('philological')).toBe('Philologie')
    expect(intituleNoteVerset('translation')).toBe('Traduction')
    expect(intituleNoteVerset('exegetical')).toBe('Exégèse')
    expect(intituleNoteVerset('inconnu')).toBe('Autre')
  })

  it('lit le chapitre et le verset d’un créneau', () => {
    expect(pointDuCanon('GEN.3.12')).toEqual({ chapitre: 3, verset: 12 })
    expect(pointDuCanon('PSA.119.0')).toEqual({ chapitre: 119, verset: 0 })
    expect(pointDuCanon(null)).toBeNull()
    expect(pointDuCanon('GEN')).toBeNull()
  })

  it('ramène un intitulé de bloc à une ligne, coupé au mot', () => {
    expect(repereDuBloc('  Introduction\n au livre ')).toBe('Introduction au livre')
    expect(repereDuBloc(null)).toBeNull()
    const long = 'Évangile selon saint Matthieu — Introduction générale au premier des quatre récits'
    const repere = repereDuBloc(long, 40)!
    expect(repere.endsWith('…')).toBe(true)
    expect(repere.length).toBeLessThanOrEqual(41)
    expect(long.startsWith(repere.slice(0, -1))).toBe(true)
  })
})

describe('le lieu d’un bloc — la règle de la page', () => {
  it('pose un bloc ancré au chapitre de son début, ou de sa fin s’il vient après', () => {
    expect(lieuDuBloc(bloc({ id: 'a', canon_id_start: 'MRK.2.3', canon_id_end: 'MRK.3.1' }), SANS_PIECE))
      .toEqual({ lieu: { genre: 'chapitre', chapitre: 2, canonId: 'MRK.2.3' }, verset: 3, cote: 0 })
    expect(lieuDuBloc(bloc({ id: 'b', placement: 'after', canon_id_start: 'MRK.2.3', canon_id_end: 'MRK.3.1' }), SANS_PIECE))
      .toEqual({ lieu: { genre: 'chapitre', chapitre: 3, canonId: 'MRK.3.1' }, verset: 1, cote: 2 })
  })

  it('ouvre le premier chapitre avec l’introduction d’un livre sans ancre', () => {
    expect(lieuDuBloc(bloc({ id: 'c', scope_kind: 'book', canon_id_start: null, canon_id_end: null, semantic_style_code: 'introduction_titree', semantic_level: 'I1' }), SANS_PIECE))
      .toEqual({ lieu: { genre: 'chapitre', chapitre: 1, canonId: null }, verset: -1, cote: 0 })
  })

  it('dit pourquoi un bloc ne paraît nulle part', () => {
    const absent = (b: LigneBlocEditorial) => lieuDuBloc(b, SANS_PIECE).lieu
    expect(absent(bloc({ id: 'd', scope_kind: 'book', placement: 'after', canon_id_start: null, canon_id_end: null })))
      .toEqual({ genre: 'absent', raison: RAISONS_ABSENCE.finDeLivre })
    // ⛔ Une subdivision d'introduction sans ancre n'est chargée par aucune page.
    expect(absent(bloc({ id: 'e', canon_id_start: null, canon_id_end: null })))
      .toEqual({ genre: 'absent', raison: RAISONS_ABSENCE.sansAncre })
    expect(absent(bloc({ id: 'f', semantic_style_code: 'style_inconnu' })))
      .toEqual({ genre: 'absent', raison: RAISONS_ABSENCE.nonCompose })
    // « Chapitre I » redit la navigation : le rendu le tait, et ses notes avec lui.
    expect(absent(bloc({ id: 'g', semantic_style_code: 'titre_chapitre_livre', semantic_level: null })))
      .toEqual({ genre: 'absent', raison: RAISONS_ABSENCE.nonCompose })
  })

  it('range une pièce liminaire sous la pièce du sommaire', () => {
    const pieces = new Map([['h', { cle: 't01-lim-p0011-introduction', titre: 'Introduction générale', rang: 3 }]])
    const liminaire = bloc({ id: 'h', scope_kind: 'bible', canon_id_start: null, canon_id_end: null, semantic_style_code: 'introduction', semantic_level: 'I1' })
    expect(lieuDuBloc(liminaire, pieces).lieu).toEqual({ genre: 'piece', cle: 't01-lim-p0011-introduction', titre: 'Introduction générale', rang: 3 })
    expect(lieuDuBloc({ ...liminaire, id: 'i' }, pieces).lieu).toEqual({ genre: 'absent', raison: RAISONS_ABSENCE.pieceIntrouvable })
  })
})

describe('l’aperçu', () => {
  it('joint les blocs dans leur rang et garde les insécables', () => {
    const insecable = String.fromCharCode(0x00a0)
    expect(apercuNoteBible([
      { rank: 2, text: `second${insecable}:`, needs_review: false },
      { rank: 1, text: 'Premier\n  bloc', needs_review: false },
    ])).toBe(`Premier bloc second${insecable}:`)
  })

  it('coupe au mot, sans laisser une marque ouverte', () => {
    const texte = 'Le mot *hesed* dit la fidélité de l’alliance, que la Vulgate rend par *misericordia* et les Septante par une forme grecque dont le sens déborde'
    const apercu = apercuNoteBible([{ rank: 1, text: texte, needs_review: false }], 80)
    expect(apercu.endsWith('…')).toBe(true)
    expect((apercu.match(/\*/g) ?? []).length % 2).toBe(0)
    expect(apercuNoteBible(null)).toBe('')
  })
})

describe('le recensement', () => {
  const blocs = [
    bloc({ id: 'b-intro', scope_kind: 'book', canon_id_start: null, canon_id_end: null, material_order: 1, semantic_style_code: 'introduction_titree', semantic_level: 'I1', heading: 'Introduction' }),
    bloc({ id: 'b-apres', placement: 'after', canon_id_start: 'MRK.1.2', canon_id_end: 'MRK.1.4', material_order: 5 }),
    bloc({ id: 'b-absent', canon_id_start: null, canon_id_end: null, material_order: 2 }),
    bloc({ id: 'b-latin', applies_to: 'member', applies_to_member_id: MEMBRE_LA.id, canon_id_start: 'MRK.1.4', canon_id_end: 'MRK.1.4' }),
  ]
  const notesVersets = [
    noteVerset({ id: 'v-2-1', canon_id: 'MRK.2.1', display_number: 1 }),
    noteVerset({ id: 'v-1-4', canon_id: 'MRK.1.4', display_number: 2, note_subtype: 'translation', applies_to: 'member', applies_to_member_id: MEMBRE_FR.id }),
    noteVerset({ id: 'v-latin', canon_id: 'MRK.1.4', applies_to: 'member', applies_to_member_id: MEMBRE_LA.id }),
    noteVerset({ id: 'v-1-4-bis', canon_id: 'MRK.1.4', display_number: 1, blocks: [{ rank: 1, text: 'À revoir.', needs_review: true }] }),
  ]
  const notesDeBlocs = [
    noteDeBloc({ id: 'n-apres', body_block_id: 'b-apres' }),
    noteDeBloc({ id: 'n-intro-2', body_block_id: 'b-intro', display_number: 2 }),
    noteDeBloc({ id: 'n-intro-1', body_block_id: 'b-intro', display_number: 1 }),
    noteDeBloc({ id: 'n-absent', body_block_id: 'b-absent' }),
    noteDeBloc({ id: 'n-latin', body_block_id: 'b-latin' }),
    noteDeBloc({ id: 'n-orpheline', body_block_id: 'b-inconnu' }),
  ]
  const notes = recenserNotesBible({ notesVersets, blocs, notesDeBlocs, pieces: SANS_PIECE, membres: [MEMBRE_FR] })

  it('écarte ce qui est propre à une bible qu’on ne lit pas', () => {
    const cles = notes.map(n => n.cle)
    expect(cles).not.toContain('v-latin')
    expect(cles).not.toContain('n-latin')
    expect(cles).not.toContain('n-orpheline')
  })

  it('suit l’ordre du livre : ouverture, versets, bloc d’après, chapitre suivant, puis l’absent', () => {
    expect(notes.map(n => n.cle)).toEqual(['n-intro-1', 'n-intro-2', 'v-1-4-bis', 'v-1-4', 'n-apres', 'v-2-1', 'n-absent'])
  })

  it('dit la nature, le verset, le membre et la relecture', () => {
    const traduction = notes.find(n => n.cle === 'v-1-4')!
    expect(traduction).toMatchObject({ origine: 'verset', intitule: 'Traduction', reperes: '1, 4', membre: MEMBRE_FR, aRelire: false })
    expect(notes.find(n => n.cle === 'v-1-4-bis')!.aRelire).toBe(true)
    expect(notes.find(n => n.cle === 'n-intro-1')).toMatchObject({ origine: 'bloc', intitule: INTITULE_APPARAT_EDITORIAL, reperes: 'Introduction', membre: null })
  })

  it('filtre, compte et groupe', () => {
    expect(filtrerNotesBible(notes, { absentes: true }).map(n => n.cle)).toEqual(['n-absent'])
    expect(filtrerNotesBible(notes, { aRelire: true }).map(n => n.cle)).toEqual(['v-1-4-bis'])
    expect(filtrerNotesBible(notes, { intitule: 'Traduction' }).map(n => n.cle)).toEqual(['v-1-4'])
    // Une note commune à l'édition répond à chaque bible lue.
    expect(filtrerNotesBible(notes, { membre: MEMBRE_LA.id }).map(n => n.cle)).not.toContain('v-1-4')
    expect(filtrerNotesBible(notes, { membre: MEMBRE_LA.id }).map(n => n.cle)).toContain('v-2-1')
    expect(filtrerNotesBible(notes, { texte: '2' }).map(n => n.cle)).toEqual(['n-intro-2', 'v-1-4'])
    // « 1, » : tout le chapitre, blocs ancrés compris ; « 1, 2 » : le verset qui ancre le bloc d'après.
    expect(filtrerNotesBible(notes, { texte: '1,' }).map(n => n.cle)).toEqual(['n-intro-1', 'n-intro-2', 'v-1-4-bis', 'v-1-4', 'n-apres'])
    expect(filtrerNotesBible(notes, { texte: '1, 4' }).map(n => n.cle)).toEqual(['v-1-4-bis', 'v-1-4', 'n-apres'])
    expect(filtrerNotesBible(notes, { texte: 'introduction' }).map(n => n.cle)).toEqual(['n-intro-1', 'n-intro-2'])
    expect(filtrerNotesBible(notes, { texte: 'REVOIR' }).map(n => n.cle)).toEqual(['v-1-4-bis'])

    expect(comptesParIntituleBible(notes)).toEqual([
      { intitule: INTITULE_APPARAT_EDITORIAL, n: 4 },
      { intitule: 'Critique textuelle', n: 2 },
      { intitule: 'Traduction', n: 1 },
    ])

    expect(grouperNotesBible(notes).map(g => [g.cle, g.titre, g.notes.length])).toEqual([
      ['chapitre|1', 'Chapitre 1', 5],
      ['chapitre|2', 'Chapitre 2', 1],
      ['absent', 'Ne paraissent pas', 1],
    ])
  })
})

describe('sur place, ou ailleurs', () => {
  const ici = { chapitre: 3, pieceCle: null, appareilAffiche: true }

  it('ouvre sur place une note du chapitre lu, appareil composé', () => {
    expect(noteSurPlace({ genre: 'chapitre', chapitre: 3, canonId: 'GEN.3.1' }, ici)).toBe(true)
    expect(noteSurPlace({ genre: 'chapitre', chapitre: 4, canonId: 'GEN.4.1' }, ici)).toBe(false)
    expect(noteSurPlace({ genre: 'chapitre', chapitre: 3, canonId: 'GEN.3.1' }, { ...ici, appareilAffiche: false })).toBe(false)
    expect(noteSurPlace({ genre: 'chapitre', chapitre: 3, canonId: 'GEN.3.1' }, { ...ici, pieceCle: 'piece' })).toBe(false)
  })

  it('ne va nulle part pour une note absente, et reconnaît sa pièce', () => {
    expect(noteSurPlace({ genre: 'absent', raison: RAISONS_ABSENCE.sansAncre }, ici)).toBe(false)
    expect(noteSurPlace({ genre: 'piece', cle: 'p', titre: 'P', rang: 0 }, { ...ici, pieceCle: 'p' })).toBe(true)
  })

  it('tient la clé d’un relevé à la famille, au livre et aux bibles lues', () => {
    expect(cleInventaireNotesBible({ familleId: 'f', livre: 'GEN', bibles: [{ trad: 'TR0010', libelle: 'Français' }, { trad: 'TR0011', libelle: 'Latin' }] }))
      .toBe('f|GEN|TR0010+TR0011')
  })
})
