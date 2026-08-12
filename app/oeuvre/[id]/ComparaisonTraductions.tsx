'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { useEstMobile } from '@/app/lib/useEstMobile'
import { rendreTexteEnrichi } from './texteEnrichi'
import { ContenuNoteStructuree } from './ContenuNoteStructuree'
import { BadgeStatutAlignement } from './ComparaisonStatut'
import type { AlignementDisponible, NoteBlocData, NoteStructuree } from './oeuvreTypes'
import {
  groupesSelonFiltre,
  membresOrdonnesParGroupe,
  type FiltreAlignement,
} from './comparaisonTraductionsUtils'

type Groupe = {
  alignment_id: string
  book: number
  canonical_division_order: number
  group_order: number
  cardinality: string
  status: string | null
}
type Membre = {
  alignment_id: string
  role: 'reference' | 'aligned'
  member_order: number
  id_texte: string
  segment_key: string
}
type SegmentComparaison = {
  id: number
  id_texte: string
  segment_key: string
  segment_numero: number
  segment_texte: string
  nature: string | null
  paragraphe: number | null
  rang: number | null
  join_before: string | null
  segment_metadata: Record<string, unknown> | null
}
type NotesParSegment = Record<string, NoteStructuree[]>
type LienParSegment = Record<number, string[]>

const LIVRES = ['PREMIER', 'DEUXIÈME', 'TROISIÈME', 'QUATRIÈME', 'CINQUIÈME']
const ROMAINS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV']

function lots<T>(items: T[], taille = 180) {
  const resultat: T[][] = []
  for (let index = 0; index < items.length; index += taille) resultat.push(items.slice(index, index + taille))
  return resultat
}

function texteAvecAppels(texte: string, notes: NoteStructuree[]) {
  const numeros = new Map<string, number>()
  for (const note of notes) numeros.set(String(note.noteNumber), note.noteNumber)
  return texte.split(/(\[\[[A-Z0-9]+\]\])/g).map((partie, index) => {
    const appel = partie.match(/^\[\[([A-Z0-9]+)\]\]$/)?.[1]
    if (!appel) return <Fragment key={index}>{rendreTexteEnrichi(partie)}</Fragment>
    const numero = numeros.get(appel) ?? appel
    return <sup key={index} style={{ color: 'var(--cs-vert)', fontSize: '0.62em', marginLeft: '1px' }}>{numero}</sup>
  })
}

const STYLE_TEXTE_PARALLELE = {
  margin: 0,
  fontFamily: 'var(--font-source-sans), Arial, sans-serif',
  fontSize: '0.82rem',
  lineHeight: 1.62,
  color: 'var(--cs-texte-fort)',
  overflowWrap: 'break-word',
  whiteSpace: 'pre-line',
} as const

function NotesEtLiens({ segments, notes, liens }: {
  segments: SegmentComparaison[]
  notes: NotesParSegment
  liens: LienParSegment
}) {
  const liensAffiches = Array.from(new Set(segments.flatMap(segment => liens[segment.id] ?? [])))
  const notesAffichees = Array.from(new Map(
    segments.flatMap(segment => notes[segment.segment_key] ?? []).map(note => [note.noteKey, note]),
  ).values())
  return (
    <>
      {liensAffiches.length > 0 && (
        <p style={{ margin: '3px 0 0', fontSize: '0.64rem', color: 'var(--cs-vert)', lineHeight: 1.35 }}>
          {liensAffiches.join(' · ')}
        </p>
      )}
      {notesAffichees.map(note => (
        <details key={note.noteKey} style={{ marginTop: '5px', borderLeft: '2px solid var(--cs-or-doux)', paddingLeft: '8px' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.64rem', color: 'var(--cs-texte-second)' }}>Note {note.noteNumber}</summary>
          <div style={{ marginTop: '5px', fontSize: '0.72rem', color: 'var(--cs-texte-second)', lineHeight: 1.5 }}>
            <ContenuNoteStructuree note={note} />
          </div>
        </details>
      ))}
    </>
  )
}

function ColonneLecture({ membres, segments, notes, liens, vide }: {
  membres: Membre[]
  segments: Map<string, SegmentComparaison>
  notes: NotesParSegment
  liens: LienParSegment
  vide: string
}) {
  const ordonnes = membres.map(membre => segments.get(membre.segment_key)).filter(Boolean) as SegmentComparaison[]
  if (ordonnes.length === 0) {
    return <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic' }}>{vide}</p>
  }

  const blocs: SegmentComparaison[][] = []
  for (const segment of ordonnes) {
    const precedent = blocs.at(-1)
    const premier = precedent?.[0]
    const proseContinue = premier
      && premier.nature !== 'vers'
      && premier.nature !== 'rubrique'
      && segment.nature !== 'vers'
      && segment.nature !== 'rubrique'
      && segment.paragraphe != null
      && segment.paragraphe === premier.paragraphe
    if (precedent && proseContinue) precedent.push(segment)
    else blocs.push([segment])
  }

  return (
    <div>
      {blocs.map((bloc, blocIndex) => {
        const premier = bloc[0]
        const verse = premier.nature === 'vers'
        const rubrique = premier.nature === 'rubrique'
        const metadata = premier.segment_metadata ?? {}
        const retrait = verse ? Math.max(0, Math.min(2.4, Number(metadata.indent_inches ?? 0))) : 0
        return (
          <div key={`${premier.segment_key}-${blocIndex}`} style={{ marginTop: Boolean(metadata.stanza_before) ? '0.62rem' : verse ? '0.08rem' : blocIndex === 0 ? 0 : '0.62rem', marginLeft: verse ? `${retrait}rem` : 0 }}>
            <p
              lang="fr"
              style={{
                ...STYLE_TEXTE_PARALLELE,
                lineHeight: verse ? 1.48 : STYLE_TEXTE_PARALLELE.lineHeight,
                textAlign: rubrique ? 'center' : verse ? 'left' : 'justify',
                textJustify: verse || rubrique ? undefined : 'inter-word',
                fontStyle: rubrique ? 'italic' : undefined,
                hyphens: verse ? 'none' : 'auto',
                WebkitHyphens: verse ? 'none' : 'auto',
              } as React.CSSProperties}
            >
              {bloc.map((segment, index) => (
                <Fragment key={segment.segment_key}>
                  {index > 0 ? (segment.join_before ?? ' ') : null}
                  {texteAvecAppels(segment.segment_texte, notes[segment.segment_key] ?? [])}
                </Fragment>
              ))}
            </p>
            <NotesEtLiens segments={bloc} notes={notes} liens={liens} />
          </div>
        )
      })}
    </div>
  )
}

async function chargerNotes(segmentKeys: string[]): Promise<NotesParSegment> {
  if (segmentKeys.length === 0) return {}
  const resultatsAncres = await Promise.all(lots(segmentKeys).map(batch =>
    supabase.from('texte_note_ancres').select('id_texte,note_key,segment_key').in('segment_key', batch)
  ))
  for (const resultat of resultatsAncres) if (resultat.error) throw resultat.error
  const ancres = resultatsAncres.flatMap(resultat => resultat.data ?? []) as { id_texte: string; note_key: string; segment_key: string }[]
  if (ancres.length === 0) return {}
  const noteKeys = Array.from(new Set(ancres.map(ancre => ancre.note_key)))
  const [notesResult, blocksResult, relationsResult] = await Promise.all([
    supabase.from('texte_notes').select('id_texte,note_key,note_number').in('note_key', noteKeys),
    supabase.from('texte_note_blocs').select('id_texte,note_key,block_id,rank,kind,form,language,text,rendering,needs_review').in('note_key', noteKeys).order('rank'),
    supabase.from('texte_note_relations').select('id_texte,note_key,relation_kind,source_block_id,target_block_id').in('note_key', noteKeys),
  ])
  if (notesResult.error) throw notesResult.error
  if (blocksResult.error) throw blocksResult.error
  if (relationsResult.error) throw relationsResult.error

  const relations = new Map<string, Record<string, string>>()
  for (const relation of relationsResult.data ?? []) {
    const key = `${relation.id_texte}|${relation.note_key}|${relation.source_block_id}`
    relations.set(key, { ...(relations.get(key) ?? {}), [relation.relation_kind]: relation.target_block_id })
  }
  const notes = new Map<string, NoteStructuree>()
  for (const row of notesResult.data ?? []) {
    if (typeof row.note_number === 'number') notes.set(`${row.id_texte}|${row.note_key}`, { noteKey: row.note_key, noteNumber: row.note_number, blocks: [] })
  }
  for (const block of blocksResult.data ?? []) {
    const note = notes.get(`${block.id_texte}|${block.note_key}`)
    if (!note) continue
    const relation = relations.get(`${block.id_texte}|${block.note_key}|${block.block_id}`) ?? {}
    note.blocks.push({
      blockId: block.block_id,
      rank: block.rank,
      kind: block.kind as NoteBlocData['kind'],
      form: block.form as NoteBlocData['form'],
      language: block.language,
      text: block.text,
      rendering: block.rendering,
      needsReview: block.needs_review,
      targetBlockId: relation.target_block ?? null,
      translationOf: relation.translation_of ?? null,
    })
  }
  const resultat: NotesParSegment = {}
  for (const ancre of ancres) {
    const note = notes.get(`${ancre.id_texte}|${ancre.note_key}`)
    if (!note) continue
    resultat[ancre.segment_key] ??= []
    if (!resultat[ancre.segment_key].some(existante => existante.noteKey === note.noteKey)) resultat[ancre.segment_key].push(note)
  }
  return resultat
}

export default function ComparaisonTraductions({ alignement, estAdmin, onFermer, livreInitial, divisionInitiale }: {
  alignement: AlignementDisponible
  estAdmin: boolean
  onFermer: () => void
  livreInitial: number
  divisionInitiale: number
}) {
  const router = useRouter()
  const mobile = useEstMobile(900)
  const [divisions, setDivisions] = useState<{ book: number; division: number }[]>([])
  const [book, setBook] = useState(() => Number.isInteger(livreInitial) && livreInitial >= 1 && livreInitial <= 5 ? livreInitial : 1)
  const [division, setDivision] = useState(() => Number.isInteger(divisionInitiale) && divisionInitiale >= 1 ? divisionInitiale : 1)
  const [filtre, setFiltre] = useState<FiltreAlignement>('tous')
  const [groupes, setGroupes] = useState<Groupe[]>([])
  const [membres, setMembres] = useState<Membre[]>([])
  const [segments, setSegments] = useState<Map<string, SegmentComparaison>>(new Map())
  const [notes, setNotes] = useState<NotesParSegment>({})
  const [liens, setLiens] = useState<LienParSegment>({})
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('texte_alignements')
      .select('book,canonical_division_order')
      .eq('alignment_set_id', alignement.alignmentSetId)
      .order('book').order('canonical_division_order')
      .then(({ data, error }) => {
        if (error) { setErreur('Les divisions alignées ne peuvent pas être chargées.'); return }
        const uniques = new Map<string, { book: number; division: number }>()
        for (const row of data ?? []) uniques.set(`${row.book}|${row.canonical_division_order}`, { book: row.book, division: row.canonical_division_order })
        setDivisions([...uniques.values()])
      })
  }, [alignement.alignmentSetId])

  useEffect(() => {
    let actif = true
    ;(async () => {
      const groupesResult = await supabase.from('texte_alignements')
        .select('alignment_id,book,canonical_division_order,group_order,cardinality,status')
        .eq('alignment_set_id', alignement.alignmentSetId)
        .eq('book', book)
        .eq('canonical_division_order', division)
        .order('group_order')
      if (groupesResult.error) throw groupesResult.error
      const groupesCharges = (groupesResult.data ?? []) as Groupe[]
      const ids = groupesCharges.map(groupe => groupe.alignment_id)
      const membresResult = ids.length
        ? await supabase.from('texte_alignement_membres')
          .select('alignment_id,role,member_order,id_texte,segment_key')
          .in('alignment_id', ids).order('member_order')
        : { data: [], error: null }
      if (membresResult.error) throw membresResult.error
      const membresCharges = (membresResult.data ?? []) as Membre[]
      const segmentKeys = Array.from(new Set(membresCharges.map(membre => membre.segment_key)))
      const resultatsSegments = await Promise.all(lots(segmentKeys).map(batch =>
        supabase.from('segments')
          .select('id,id_texte,segment_key,segment_numero,segment_texte,nature,paragraphe,rang,join_before,segment_metadata')
          .in('segment_key', batch)
      ))
      for (const resultat of resultatsSegments) if (resultat.error) throw resultat.error
      const segmentsCharges = resultatsSegments.flatMap(resultat => resultat.data ?? []) as SegmentComparaison[]
      const notesChargees = await chargerNotes(segmentKeys)
      const segmentIds = segmentsCharges.map(segment => segment.id)
      const resultatsLiens = segmentIds.length ? await Promise.all(lots(segmentIds).map(batch =>
        supabase.from('liens_bibliques').select('segment_id,canon_id').in('segment_id', batch)
      )) : []
      for (const resultat of resultatsLiens) if (resultat.error) throw resultat.error
      const liensRows = resultatsLiens.flatMap(resultat => resultat.data ?? []) as { segment_id: number; canon_id: string | null }[]
      const canonIds = Array.from(new Set(liensRows.map(lien => lien.canon_id).filter(Boolean) as string[]))
      const versetsResult = canonIds.length ? await supabase.from('versets_lecture').select('id_verset,ref').in('id_verset', canonIds) : { data: [], error: null }
      if (versetsResult.error) throw versetsResult.error
      const refParId = new Map((versetsResult.data ?? []).map(verset => [verset.id_verset, verset.ref ?? verset.id_verset]))
      const liensParSegment: LienParSegment = {}
      for (const lien of liensRows) {
        if (!lien.canon_id) continue
        liensParSegment[lien.segment_id] ??= []
        const label = refParId.get(lien.canon_id) ?? lien.canon_id
        if (!liensParSegment[lien.segment_id].includes(label)) liensParSegment[lien.segment_id].push(label)
      }
      if (!actif) return
      setGroupes(groupesCharges)
      setMembres(membresCharges)
      setSegments(new Map(segmentsCharges.map(segment => [segment.segment_key, segment])))
      setNotes(notesChargees)
      setLiens(liensParSegment)
      setChargement(false)
      const params = new URLSearchParams(window.location.search)
      params.set('compare', alignement.alignmentSetId)
      params.set('book', String(book))
      params.set('division', String(division))
      router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false })
    })().catch(() => {
      if (!actif) return
      setErreur('La comparaison ne peut pas être chargée pour cette division.')
      setChargement(false)
    })
    return () => { actif = false }
  }, [alignement, book, division, router])

  const divisionsDuLivre = useMemo(() => divisions.filter(item => item.book === book).map(item => item.division), [divisions, book])
  const membresParGroupe = useMemo(() => membresOrdonnesParGroupe(membres), [membres])
  const groupesAffiches = useMemo(() => groupesSelonFiltre(groupes, filtre), [groupes, filtre])

  return (
    <section aria-label={`Traductions parallèles : ${alignement.referenceLabel} et ${alignement.alignedLabel}`} style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 0 16px', borderBottom: '1px solid var(--cs-bord)' }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.15rem', fontWeight: 500, color: 'var(--cs-encre)' }}>Traductions parallèles</h2>
          <p style={{ margin: '3px 0 0', fontSize: '0.68rem', color: 'var(--cs-texte-faible)' }}>{alignement.referenceLabel} et {alignement.alignedLabel}, alignées par mêmes empans latins</p>
        </div>
        <button onClick={onFermer} style={{ border: '1px solid var(--cs-bord-clair)', borderRadius: '5px', background: 'transparent', color: 'var(--cs-texte-second)', padding: '5px 9px', cursor: 'pointer', fontSize: '0.68rem' }}>Revenir à la lecture simple</button>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'end', padding: '12px 0 16px' }}>
        <label style={{ fontSize: '0.68rem', color: 'var(--cs-texte-second)' }}>
          Livre{' '}
          <select value={book} onChange={event => { setChargement(true); setErreur(null); setBook(Number(event.target.value)); setDivision(1) }} style={{ font: 'inherit', padding: '4px 7px', border: '1px solid var(--cs-bord)', borderRadius: '4px', background: 'var(--cs-surface)', color: 'var(--cs-encre)' }}>
            {[1, 2, 3, 4, 5].map(numero => <option key={numero} value={numero}>{LIVRES[numero - 1]}</option>)}
          </select>
        </label>
        <label style={{ fontSize: '0.68rem', color: 'var(--cs-texte-second)' }}>
          Division{' '}
          <select value={division} onChange={event => { setChargement(true); setErreur(null); setDivision(Number(event.target.value)) }} style={{ font: 'inherit', padding: '4px 7px', border: '1px solid var(--cs-bord)', borderRadius: '4px', background: 'var(--cs-surface)', color: 'var(--cs-encre)' }}>
            {divisionsDuLivre.map(numero => <option key={numero} value={numero}>{ROMAINS[numero - 1] ?? numero}</option>)}
          </select>
        </label>
        {estAdmin && (
          <div aria-label="Filtrer les groupes d’alignement" style={{ display: 'inline-flex', border: '1px solid var(--cs-bord)', borderRadius: '5px', overflow: 'hidden' }}>
            {([['tous', 'Tous'], ['uncertain', 'À relire']] as [FiltreAlignement, string][]).map(([valeur, libelle]) => (
              <button
                key={valeur}
                data-filtre-alignement={valeur}
                aria-pressed={filtre === valeur}
                onClick={() => setFiltre(valeur)}
                style={{ border: 0, borderLeft: valeur === 'uncertain' ? '1px solid var(--cs-bord)' : 0, background: filtre === valeur ? 'rgba(var(--cs-vert-rgb),0.09)' : 'var(--cs-surface)', color: filtre === valeur ? 'var(--cs-encre)' : 'var(--cs-texte-second)', padding: '5px 9px', cursor: 'pointer', fontSize: '0.68rem' }}
              >
                {libelle}
              </button>
            ))}
          </div>
        )}
      </div>
      {chargement && <p style={{ color: 'var(--cs-texte-faible)', fontSize: '0.76rem' }}>Chargement de la division…</p>}
      {erreur && <p role="alert" style={{ color: 'var(--cs-danger)', fontSize: '0.76rem' }}>{erreur}</p>}
      {!chargement && !erreur && groupesAffiches.length === 0 && (
        <p style={{ color: 'var(--cs-texte-faible)', fontSize: '0.76rem' }}>Aucun groupe à relire dans cette division.</p>
      )}
      {!mobile && !chargement && !erreur && groupesAffiches.length > 0 && (
        <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px', padding: '8px 0 10px', borderBottom: '1px solid var(--cs-bord)' }}>
          {[alignement.referenceLabel, alignement.alignedLabel].map(label => (
            <p key={label} style={{ margin: 0, padding: '0 6px', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cs-texte-faible)' }}>{label}</p>
          ))}
        </div>
      )}
      {!chargement && !erreur && groupesAffiches.map((groupe, index) => {
        const membresGroupe = membresParGroupe.get(groupe.alignment_id) ?? { reference: [], aligned: [] }
        return (
          <article key={groupe.alignment_id} aria-label={`Groupe ${index + 1}`} style={{ display: 'grid', gridTemplateColumns: mobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))', gap: mobile ? '10px' : '24px', padding: '18px 0', borderTop: index === 0 ? '1px solid var(--cs-bord-clair)' : undefined, borderBottom: '1px solid var(--cs-bord-clair)' }}>
            {estAdmin && groupe.status === 'uncertain' && (
              <div style={{ gridColumn: '1 / -1', marginBottom: '-8px' }}><BadgeStatutAlignement status={groupe.status} estAdmin={estAdmin} /></div>
            )}
            {([
              { label: alignement.referenceLabel, members: membresGroupe.reference, empty: `Pas de correspondant dans ${alignement.referenceLabel}` },
              { label: alignement.alignedLabel, members: membresGroupe.aligned, empty: `Pas de correspondant dans ${alignement.alignedLabel}` },
            ] as const).map(colonne => (
              <div key={colonne.label} style={{ minWidth: 0, padding: mobile ? '0 3px' : '0 6px' }}>
                {mobile && <h3 style={{ margin: '0 0 8px', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cs-texte-faible)' }}>{colonne.label}</h3>}
                <ColonneLecture membres={[...colonne.members] as Membre[]} segments={segments} notes={notes} liens={liens} vide={colonne.empty} />
              </div>
            ))}
          </article>
        )
      })}
    </section>
  )
}
