import { describe, expect, it } from 'vitest'
import { assemblerNotesStructurees, chargerNotesDesSegments, cleNotesDuSegment } from './notesStructureesChargement'

// ── LES NOTES STRUCTURÉES : l'assemblage, et le chargement de quelques segments ──
//
// ⚠️ Les lignes imitent ce que les quatre `select` demandent, et rien de plus : c'est
// la forme que le module reçoit de la base.

const note = (note_key: string, note_number: number, id_texte = 'T1') => ({ id_texte, note_key, note_number })
const ancre = (
  note_key: string, segment_key: string | null, offset: number | null,
  { marker = null as string | null, source_target = 'segment_texte', id_texte = 'T1' } = {},
) => ({
  id_texte, note_key, segment_key, source_target, segment_offset_unicode: offset,
  marker: marker ?? `[[${note_key.replace(/\D/g, '')}]]`,
})
const bloc = (note_key: string, block_id: string, rank: number, text: string, id_texte = 'T1') => ({
  id_texte, note_key, block_id, rank, kind: 'commentary', form: 'prose', language: null,
  text, rendering: null, needs_review: false, metadata: null,
})

describe('assemblerNotesStructurees', () => {
  it('range chaque note sous le segment de son ancre, par marqueur', () => {
    const { notesParSegment, ancresParSegment, ancresIncompletes } = assemblerNotesStructurees({
      notes: [note('N12', 12), note('N13', 13)],
      ancres: [ancre('N12', 'S1', 5), ancre('N13', 'S2', 0)],
      blocs: [bloc('N12', 'b1', 1, 'Première note.'), bloc('N13', 'b2', 1, 'Seconde.')],
      relations: [],
    })
    expect(ancresIncompletes).toEqual([])
    expect(notesParSegment.S1['12'].blocks.map(b => b.text)).toEqual(['Première note.'])
    expect(notesParSegment.S2['13'].noteNumber).toBe(13)
    expect(ancresParSegment.S1).toEqual([
      { noteKey: 'N12', marker: '[[12]]', segmentOffsetUnicode: 5, sourceTarget: 'segment_texte' },
    ])
  })

  it('pose les relations sur le bloc qu’elles désignent', () => {
    const { notesParSegment } = assemblerNotesStructurees({
      notes: [note('N1', 1)],
      ancres: [ancre('N1', 'S1', 0)],
      blocs: [bloc('N1', 'la', 1, 'Omnia'), bloc('N1', 'fr', 2, 'Toutes choses')],
      relations: [{ note_key: 'N1', relation_kind: 'translation_of', source_block_id: 'fr', target_block_id: 'la' }],
    })
    const [latin, francais] = notesParSegment.S1['1'].blocks
    expect(latin.translationOf).toBeUndefined()
    expect(francais.translationOf).toBe('la')
  })

  it('compte une ancre sans note, sans marqueur lisible ou sans segment, et ne lève pas', () => {
    const { notesParSegment, ancresIncompletes } = assemblerNotesStructurees({
      notes: [note('N1', 1)],
      ancres: [
        ancre('N9', 'S1', 0),
        ancre('N1', 'S1', 0, { marker: 'mal formé' }),
        ancre('N1', null, 0),
      ],
      blocs: [bloc('N1', 'b', 1, 'x')],
      relations: [],
    })
    expect(ancresIncompletes).toHaveLength(3)
    expect(notesParSegment).toEqual({})
  })

  it('ne tient pas pour incomplète une ancre de TITRE sans offset', () => {
    const { notesParSegment, ancresParSegment, ancresIncompletes } = assemblerNotesStructurees({
      notes: [note('N1', 1)],
      ancres: [ancre('N1', 'S1', null, { source_target: 'ref_niv1_texte' })],
      blocs: [bloc('N1', 'b', 1, 'x')],
      relations: [],
    })
    expect(ancresIncompletes).toEqual([])
    expect(notesParSegment.S1['1']).toBeDefined()
    expect(ancresParSegment.S1).toBeUndefined()
  })
})

// ── UN FAUX CLIENT : le constructeur de requêtes, et ce qu'il a filtré ─────────
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
          if (table === erreurSur) return Promise.resolve({ data: null, error: new Error(`panne de ${table}`) })
          const lignes = (tables[table] ?? []).filter(l => filtres.every(([op, colonne, valeur]) =>
            op === 'eq' ? l[colonne] === valeur : (valeur as unknown[]).includes(l[colonne])))
          return Promise.resolve({ data: lignes.slice(debut, fin + 1), error: null })
        },
      }
      return constructeur
    },
  }
  return { client: client as unknown as Parameters<typeof chargerNotesDesSegments>[0], requetes }
}

const BASE = {
  texte_note_ancres: [
    ancre('N12', 'S1', 3),
    // ⚠️ La même clé de segment dans un AUTRE texte : elle ne doit pas s'y mêler.
    ancre('N40', 'S1', 0, { id_texte: 'T2' }),
    ancre('N77', 'S9', 0),
  ],
  texte_notes: [note('N12', 12), note('N40', 40, 'T2'), note('N77', 77)],
  texte_note_blocs: [bloc('N12', 'b', 1, 'Note du premier texte.'), bloc('N40', 'b', 1, 'Note du second.', 'T2'), bloc('N77', 'b', 1, 'Hors page.')],
  texte_note_relations: [],
}

describe('chargerNotesDesSegments', () => {
  it('rend une entrée par segment demandé, vide quand il ne porte aucune note', async () => {
    const { client } = fauxClient(BASE)
    const charges = await chargerNotesDesSegments(client, [
      { idTexte: 'T1', segmentKey: 'S1' },
      { idTexte: 'T1', segmentKey: 'S2' },
    ])
    expect([...charges.keys()].sort()).toEqual([cleNotesDuSegment('T1', 'S1'), cleNotesDuSegment('T1', 'S2')])
    const s1 = charges.get(cleNotesDuSegment('T1', 'S1'))!
    expect(Object.keys(s1.notes)).toEqual(['12'])
    expect(s1.ancres.map(a => a.marker)).toEqual(['[[12]]'])
    expect(charges.get(cleNotesDuSegment('T1', 'S2'))).toEqual({ notes: {}, ancres: [] })
  })

  it('ne mêle pas deux textes qui portent la même clé de segment', async () => {
    const { client } = fauxClient(BASE)
    const charges = await chargerNotesDesSegments(client, [
      { idTexte: 'T1', segmentKey: 'S1' },
      { idTexte: 'T2', segmentKey: 'S1' },
    ])
    expect(Object.keys(charges.get(cleNotesDuSegment('T1', 'S1'))!.notes)).toEqual(['12'])
    expect(Object.keys(charges.get(cleNotesDuSegment('T2', 'S1'))!.notes)).toEqual(['40'])
  })

  it('ne lit ni notes ni blocs quand aucune ancre ne vise la page', async () => {
    const { client, requetes } = fauxClient(BASE)
    await chargerNotesDesSegments(client, [{ idTexte: 'T1', segmentKey: 'S5' }])
    expect(requetes.map(r => r.table)).toEqual(['texte_note_ancres'])
  })

  it('ne demande que les notes des ancres trouvées, bornées à leur texte', async () => {
    const { client, requetes } = fauxClient(BASE)
    await chargerNotesDesSegments(client, [{ idTexte: 'T1', segmentKey: 'S1' }])
    const notes = requetes.find(r => r.table === 'texte_notes')!
    expect(notes.filtres).toEqual([['eq', 'id_texte', 'T1'], ['in', 'note_key', ['N12']]])
  })

  it('lève quand une lecture échoue : l’appelant retombe alors sur les notes héritées', async () => {
    const { client } = fauxClient(BASE, { erreurSur: 'texte_note_blocs' })
    await expect(chargerNotesDesSegments(client, [{ idTexte: 'T1', segmentKey: 'S1' }])).rejects.toThrow('panne')
  })

  it('ignore un segment sans clé', async () => {
    const { client, requetes } = fauxClient(BASE)
    const charges = await chargerNotesDesSegments(client, [{ idTexte: 'T1', segmentKey: '' }])
    expect(charges.size).toBe(0)
    expect(requetes).toEqual([])
  })
})
