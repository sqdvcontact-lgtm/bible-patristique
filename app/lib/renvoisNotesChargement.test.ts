import { describe, expect, it } from 'vitest'
import {
  attacherRenvois,
  chargerContexteNumerotation,
  construireContexteNumerotation,
  resoudreTete,
  resoudreTetesDesRenvois,
  type ContextesDeNumerotation,
  type LignesContexte,
  type LigneRenvoi,
} from './renvoisNotesChargement'
import { chargerNotePourRenvoi } from './notesStructureesChargement'
import type { DegradationChargement } from './chargementTolerant'
import type { NoteStructuree } from '../oeuvre/[id]/oeuvreTypes'
import type { RenvoiNoteData } from './renvoisNotes'

// ── LA TÊTE D'UN RENVOI SE RÉSOUT SUR LA NOTE VISÉE TELLE QU'ELLE EST AUJOURD'HUI ──
//
// ⚠️ Le texte imite les Catéchèses baptismales : trois divisions, et la note B de la
// Seconde catéchèse, `A0044O0003TFR-V11:note:00070`, `note_number` 73, dixième note de sa
// division (relevé en base le 16 septembre 2026 : « Voir note 10 de Seconde catéchèse : »).

const T = 'A0044O0003TFR-V11'
const MYST = 'TR_FR_1844_FAIVRE_CATECHESES_MYSTAGOGICAE'
const cle = (n: number) => `${T}:note:${String(n).padStart(5, '0')}`
const CIBLE = cle(70)

type LigneNote = { note_key: string; note_number: number }
type LigneAncre = { note_key: string; segment_key: string | null }
type LigneSegment = { segment_key: string | null; ref_niv1: string | null; espace_textuel?: string | null }

/** Le texte de référence : 63 notes dans la Procatéchèse et la Première catéchèse, neuf
 *  notes puis la note B dans la Seconde, et une note dans la Troisième. */
function texteDeReference() {
  const segments: LigneSegment[] = [
    { segment_key: 'S-PRO', ref_niv1: 'Procatéchèse' },
    { segment_key: 'S-I', ref_niv1: 'Première catéchèse' },
    { segment_key: 'S-II', ref_niv1: 'Seconde catéchèse' },
    { segment_key: 'S-II-bis', ref_niv1: 'Seconde catéchèse' },
    { segment_key: 'S-III', ref_niv1: 'Troisième catéchèse' },
  ]
  const notes: LigneNote[] = []
  const ancres: LigneAncre[] = []
  // Numéros 1 à 63 : Procatéchèse, puis Première catéchèse.
  for (let n = 1; n <= 63; n++) {
    notes.push({ note_key: `${T}:note:A${n}`, note_number: n })
    ancres.push({ note_key: `${T}:note:A${n}`, segment_key: n <= 30 ? 'S-PRO' : 'S-I' })
  }
  // Numéros 64 à 72 (clés 00061 à 00069), puis la note B, numéro 73.
  for (let n = 64; n <= 73; n++) {
    notes.push({ note_key: cle(n - 3), note_number: n })
    ancres.push({ note_key: cle(n - 3), segment_key: 'S-II' })
  }
  notes.push({ note_key: cle(71), note_number: 74 })
  ancres.push({ note_key: cle(71), segment_key: 'S-III' })
  return { notes, ancres, segments }
}

function contexte(lignes: { notes: LigneNote[]; ancres: LigneAncre[]; segments: LigneSegment[] }, apparat: LignesContexte['apparat'] = () => false) {
  const ordonnees = [...lignes.notes].sort((a, b) => a.note_number - b.note_number || a.note_key.localeCompare(b.note_key))
  return construireContexteNumerotation(T, { notes: ordonnees, ancres: lignes.ancres, segments: lignes.segments, apparat })
}

describe('la tête du cas de référence, A0044O0003TFR-V11:note:00070', () => {
  it('dit le numéro que le lecteur voit, et le titre de la division de son ancre', () => {
    const ctx = contexte(texteDeReference())
    expect(ctx.notes.get(CIBLE)).toMatchObject({ noteNumber: 73, numeroAffiche: 10, divisions: ['Seconde catéchèse'] })
    expect(resoudreTete(ctx, CIBLE)).toEqual({ etat: 'resolu', numero: 10, titre: 'Seconde catéchèse' })
  })

  it('suit la note quand son note_number devient 74 (une note insérée avant elle)', () => {
    const lignes = texteDeReference()
    const notes = lignes.notes.map(n => n.note_number >= 73 ? { ...n, note_number: n.note_number + 1 } : n)
    notes.push({ note_key: `${T}:note:INSEREE`, note_number: 73 })
    const ctx = contexte({ ...lignes, notes, ancres: [...lignes.ancres, { note_key: `${T}:note:INSEREE`, segment_key: 'S-II' }] })
    expect(ctx.notes.get(CIBLE)!.noteNumber).toBe(74)
    expect(resoudreTete(ctx, CIBLE)).toEqual({ etat: 'resolu', numero: 11, titre: 'Seconde catéchèse' })
  })

  it('suit la note quand son note_number devient 72 (la note précédente retirée)', () => {
    const lignes = texteDeReference()
    const retiree = cle(69)
    const notes = lignes.notes.filter(n => n.note_key !== retiree).map(n => n.note_number > 72 ? { ...n, note_number: n.note_number - 1 } : n)
    const ctx = contexte({ ...lignes, notes, ancres: lignes.ancres.filter(a => a.note_key !== retiree) })
    expect(ctx.notes.get(CIBLE)!.noteNumber).toBe(72)
    expect(resoudreTete(ctx, CIBLE)).toEqual({ etat: 'resolu', numero: 9, titre: 'Seconde catéchèse' })
  })

  it('ne bouge pas quand toutes les notes sont renumérotées sans changer d’ordre', () => {
    const lignes = texteDeReference()
    const ctx = contexte({ ...lignes, notes: lignes.notes.map(n => ({ ...n, note_number: n.note_number + 1000 })) })
    expect(ctx.notes.get(CIBLE)!.noteNumber).toBe(1073)
    expect(resoudreTete(ctx, CIBLE)).toEqual({ etat: 'resolu', numero: 10, titre: 'Seconde catéchèse' })
  })

  it('suit le titre de niveau 1 quand il est corrigé', () => {
    const lignes = texteDeReference()
    const segments = lignes.segments.map(s => s.ref_niv1 === 'Seconde catéchèse' ? { ...s, ref_niv1: 'Deuxième catéchèse' } : s)
    expect(resoudreTete(contexte({ ...lignes, segments }), CIBLE)).toEqual({ etat: 'resolu', numero: 10, titre: 'Deuxième catéchèse' })
  })

  it('suit l’ancre quand la note est déplacée dans une autre division', () => {
    const lignes = texteDeReference()
    const ancres = lignes.ancres.map(a => a.note_key === CIBLE ? { ...a, segment_key: 'S-III' } : a)
    // Deux notes dans la Troisième catéchèse désormais : la note B (73) avant 00071 (74).
    expect(resoudreTete(contexte({ ...lignes, ancres }), CIBLE)).toEqual({ etat: 'resolu', numero: 1, titre: 'Troisième catéchèse' })
  })

  it('ne compte pas une note d’apparat critique dans la série de la note B', () => {
    const ctx = contexte(texteDeReference(), noteKey => noteKey === cle(61))
    expect(resoudreTete(ctx, CIBLE)).toEqual({ etat: 'resolu', numero: 9, titre: 'Seconde catéchèse' })
  })
})

describe('les cas qui ne se tranchent pas', () => {
  it('dit ambiguë une note dont les ancres mènent à deux divisions, sans choisir la première', () => {
    const lignes = texteDeReference()
    const ctx = contexte({ ...lignes, ancres: [...lignes.ancres, { note_key: CIBLE, segment_key: 'S-III' }] })
    expect(resoudreTete(ctx, CIBLE)).toEqual({ etat: 'ambigu', numero: 10, titres: ['Seconde catéchèse', 'Troisième catéchèse'] })
  })

  it('ne dit pas ambiguë une note ancrée deux fois dans la même division', () => {
    const lignes = texteDeReference()
    const ctx = contexte({ ...lignes, ancres: [...lignes.ancres, { note_key: CIBLE, segment_key: 'S-II-bis' }] })
    expect(resoudreTete(ctx, CIBLE)).toEqual({ etat: 'resolu', numero: 10, titre: 'Seconde catéchèse' })
  })

  it('compte à part une ancre sans division', () => {
    const lignes = texteDeReference()
    const segments = [...lignes.segments, { segment_key: 'S-SANS', ref_niv1: null, espace_textuel: 'corps' }]
    const ancres = [...lignes.ancres, { note_key: CIBLE, segment_key: 'S-SANS' }]
    expect(resoudreTete(contexte({ ...lignes, segments, ancres }), CIBLE).etat).toBe('ambigu')
    const seule = lignes.ancres.map(a => a.note_key === CIBLE ? { ...a, segment_key: 'S-SANS' } : a)
    expect(resoudreTete(contexte({ ...lignes, segments, ancres: seule }), CIBLE)).toMatchObject({ etat: 'sans_titre' })
  })

  it('nomme les liminaires comme l’en-tête de la page', () => {
    const lignes = texteDeReference()
    const segments = [...lignes.segments, { segment_key: 'S-LIM', ref_niv1: null, espace_textuel: 'introduction' }]
    const ancres = lignes.ancres.map(a => a.note_key === CIBLE ? { ...a, segment_key: 'S-LIM' } : a)
    expect(resoudreTete(contexte({ ...lignes, segments, ancres }), CIBLE)).toMatchObject({ etat: 'resolu', titre: 'LIMINAIRES' })
  })

  it('dit introuvable une note absente, et erreur un contexte qui n’a pas pu se lire', () => {
    expect(resoudreTete(contexte(texteDeReference()), `${T}:note:99999`)).toEqual({ etat: 'introuvable' })
    expect(resoudreTete(null, CIBLE)).toEqual({ etat: 'erreur' })
  })
})

// ── UN FAUX CLIENT : ce que les `select` demandent, et le compte des requêtes ────
type Ligne = Record<string, unknown>
function fauxClient(tables: Record<string, Ligne[]>, { erreurSur }: { erreurSur?: string } = {}) {
  const requetes: { table: string; filtres: [string, string, unknown][] }[] = []
  const client = {
    from(table: string) {
      const filtres: [string, string, unknown][] = []
      const constructeur = {
        select: () => constructeur,
        eq: (colonne: string, valeur: unknown) => { filtres.push(['eq', colonne, valeur]); return constructeur },
        in: (colonne: string, valeurs: unknown[]) => { filtres.push(['in', colonne, valeurs]); return constructeur },
        order: () => constructeur,
        range: (debut: number, fin: number) => {
          requetes.push({ table, filtres: [...filtres] })
          const texteFiltre = filtres.find(([, colonne]) => colonne === 'id_texte')?.[2]
          if (table === erreurSur || (erreurSur && texteFiltre === erreurSur)) {
            return Promise.resolve({ data: null, error: new Error(`panne de ${table}`) })
          }
          const lignes = (tables[table] ?? []).filter(l => filtres.every(([op, colonne, valeur]) =>
            op === 'eq' ? l[colonne] === valeur : (valeur as unknown[]).includes(l[colonne])))
          return Promise.resolve({ data: lignes.slice(debut, fin + 1), error: null })
        },
      }
      return constructeur
    },
  }
  return { client: client as unknown as Parameters<typeof chargerContexteNumerotation>[0], requetes }
}

/** La base : le texte de référence, et une note de la Troisième catéchèse qui renvoie à la
 *  note B, laquelle renvoie à son tour vers une note des Catéchèses mystagogiques. */
function base(): Record<string, Ligne[]> {
  const { notes, ancres, segments } = texteDeReference()
  return {
    texte_notes: [
      ...notes.map(n => ({ id_texte: T, ...n, metadata: null })),
      { id_texte: MYST, note_key: `${MYST}:note:00004`, note_number: 4, metadata: null },
    ],
    texte_note_ancres: [
      ...ancres.map(a => ({ id_texte: T, ...a, source_target: 'segment_texte', segment_offset_unicode: 0, marker: '[[1]]' })),
      { id_texte: MYST, note_key: `${MYST}:note:00004`, segment_key: 'M-XIX', source_target: 'segment_texte', segment_offset_unicode: 0, marker: '[[4]]' },
    ],
    segments: [
      ...segments.map(s => ({ id_texte: T, ...s })),
      { id_texte: MYST, segment_key: 'M-XIX', ref_niv1: 'Première catéchèse mystagogique', espace_textuel: 'corps' },
    ],
    texte_note_blocs: [
      ...notes.map(n => ({ id_texte: T, note_key: n.note_key, block_id: `${n.note_key}:b1`, rank: 1, kind: 'commentary', form: 'prose', language: 'fr', text: `Note ${n.note_number}.`, rendering: null, needs_review: false, metadata: null, editorial_role: null })),
      { id_texte: MYST, note_key: `${MYST}:note:00004`, block_id: 'm4', rank: 1, kind: 'commentary', form: 'prose', language: 'fr', text: 'Note mystagogique.', rendering: null, needs_review: false, metadata: null, editorial_role: null },
    ],
    texte_note_relations: [],
    texte_note_renvois: [],
  }
}

const renvoiLigne = (champs: Partial<LigneRenvoi> & Pick<LigneRenvoi, 'source_note_key' | 'source_block_id' | 'target_note_key' | 'source_citation'>): LigneRenvoi => ({
  source_id_texte: T, relation_rank: 1, target_id_texte: T, render_mode: 'note_preview', ...champs,
})

describe('attacherRenvois', () => {
  const noteDe = (noteKey: string, ...blockIds: string[]): NoteStructuree => ({
    noteKey, noteNumber: 1, blocks: blockIds.map((blockId, i) => ({
      blockId, rank: i + 1, kind: 'commentary', form: 'prose', language: 'fr', text: 'x', rendering: null,
      needsReview: false, targetBlockId: null, translationOf: null,
    })),
  })

  it('pose chaque renvoi sur son bloc, plusieurs par bloc, dans l’ordre des rangs', () => {
    const parNote = new Map([[cle(1189), noteDe(cle(1189), 'p001', 'p002')]])
    const { renvois, orphelins } = attacherRenvois(parNote, [
      renvoiLigne({ source_note_key: cle(1189), source_block_id: 'p002', relation_rank: 2, target_note_key: cle(585), source_citation: 'la note D' }),
      renvoiLigne({ source_note_key: cle(1189), source_block_id: 'p002', relation_rank: 1, target_note_key: cle(789), source_citation: 'voir la note B' }),
    ])
    expect(orphelins).toEqual([])
    expect(renvois).toHaveLength(2)
    const bloc = parNote.get(cle(1189))!.blocks[1]
    expect(bloc.renvois!.map(r => [r.rang, r.cible.noteKey, r.blocId])).toEqual([[1, cle(789), 'p002'], [2, cle(585), 'p002']])
    expect(parNote.get(cle(1189))!.blocks[0].renvois).toBeUndefined()
  })

  it('met de côté une relation dont le bloc n’est pas chargé', () => {
    const { renvois, orphelins } = attacherRenvois(new Map(), [
      renvoiLigne({ source_note_key: cle(1), source_block_id: 'absent', target_note_key: CIBLE, source_citation: 'x' }),
    ])
    expect(renvois).toEqual([])
    expect(orphelins).toEqual([`${cle(1)}#1`])
  })

  it('ne recopie dans le renvoi ni numéro, ni titre, ni contenu', () => {
    const parNote = new Map([[cle(466), noteDe(cle(466), 'b')]])
    const { renvois } = attacherRenvois(parNote, [renvoiLigne({ source_note_key: cle(466), source_block_id: 'b', target_note_key: CIBLE, source_citation: 'voir la note B de la Seconde catéchèse, 4.' })])
    expect(Object.keys(renvois[0]).sort()).toEqual(['blocId', 'cible', 'citation', 'mode', 'rang', 'source'])
    expect(renvois[0].cible).toEqual({ idTexte: T, noteKey: CIBLE })
  })
})

describe('chargerContexteNumerotation et resoudreTetesDesRenvois', () => {
  it('résout la tête sur la base telle qu’elle est lue', async () => {
    const { client } = fauxClient(base())
    const ctx = await chargerContexteNumerotation(client, T)
    expect(resoudreTete(ctx, CIBLE)).toEqual({ etat: 'resolu', numero: 10, titre: 'Seconde catéchèse' })
  })

  it('ne lit qu’une fois le contexte d’un texte visé par plusieurs renvois', async () => {
    const { client, requetes } = fauxClient(base())
    const renvois: RenvoiNoteData[] = [1, 2, 3].map(rang => ({
      blocId: 'b', rang, citation: 'x', mode: 'note_preview' as const,
      source: { idTexte: MYST, noteKey: `${MYST}:note:00088` }, cible: { idTexte: T, noteKey: CIBLE },
    }))
    const contextes: ContextesDeNumerotation = new Map()
    await resoudreTetesDesRenvois(client, renvois, contextes)
    expect(renvois.every(r => r.tete?.etat === 'resolu')).toBe(true)
    expect(requetes.filter(r => r.table === 'texte_notes')).toHaveLength(1)
  })

  it('rend une tête « erreur » et note la dégradation quand le contexte ne se lit pas', async () => {
    const { client } = fauxClient(base(), { erreurSur: T })
    const renvoi = { blocId: 'b', rang: 1, citation: 'x', mode: 'note_preview' as const, source: { idTexte: MYST, noteKey: 'm' }, cible: { idTexte: T, noteKey: CIBLE } }
    const degradations: DegradationChargement[] = []
    await resoudreTetesDesRenvois(client, [renvoi], new Map(), degradations)
    expect(renvoi).toMatchObject({ tete: { etat: 'erreur' } })
    expect(degradations).toHaveLength(1)
  })
})

describe('chargerNotePourRenvoi', () => {
  it('charge la note visée par son identité, dans ses blocs ACTUELS', async () => {
    const tables = base()
    const { client } = fauxClient(tables)
    const premier = await chargerNotePourRenvoi(client, { idTexte: T, noteKey: CIBLE }, new Map())
    expect(premier.tete).toEqual({ etat: 'resolu', numero: 10, titre: 'Seconde catéchèse' })
    expect(premier.note!.blocks.map(b => b.text)).toEqual(['Note 73.'])
    expect(premier.note!.displayNumber).toBe(10)
    // Le contenu repris en base se lit au rendu suivant : rien n'en est gardé dans la relation.
    const bloc = tables.texte_note_blocs.find(b => b.note_key === CIBLE)!
    bloc.text = 'Sur les Anges : note reprise.'
    tables.texte_note_blocs.push({ ...bloc, block_id: `${CIBLE}:b2`, rank: 2, text: 'Un second bloc ajouté.' })
    const second = await chargerNotePourRenvoi(fauxClient(tables).client, { idTexte: T, noteKey: CIBLE }, new Map())
    expect(second.note!.blocks.map(b => b.text)).toEqual(['Sur les Anges : note reprise.', 'Un second bloc ajouté.'])
  })

  it('porte les renvois de la note visée, têtes résolues, pour qu’elle se déplie à son tour', async () => {
    const tables = base()
    tables.texte_note_renvois = [{
      source_id_texte: T, source_note_key: CIBLE, source_block_id: `${CIBLE}:b1`, relation_rank: 1,
      target_id_texte: MYST, target_note_key: `${MYST}:note:00004`, source_citation: 'Note 73.', render_mode: 'note_preview',
    }]
    const { client } = fauxClient(tables)
    const { note } = await chargerNotePourRenvoi(client, { idTexte: T, noteKey: CIBLE }, new Map())
    expect(note!.blocks[0].renvois).toEqual([expect.objectContaining({
      cible: { idTexte: MYST, noteKey: `${MYST}:note:00004` },
      tete: { etat: 'resolu', numero: 1, titre: 'Première catéchèse mystagogique' },
    })])
  })

  it('rend une note absente, et sa tête introuvable, sans lever', async () => {
    const { client } = fauxClient(base())
    const reponse = await chargerNotePourRenvoi(client, { idTexte: T, noteKey: `${T}:note:99999` }, new Map())
    expect(reponse).toEqual({ tete: { etat: 'introuvable' }, note: null })
  })
})
