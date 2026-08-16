'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/app/lib/supabase'
import { useEstMobile } from '@/app/lib/useEstMobile'
import { rendreTexteEnrichi, texteSansEnrichissement } from './texteEnrichi'
import { ContenuNoteStructuree } from './ContenuNoteStructuree'
// Forme de l'appel de note : une seule définition pour tout le site (jamais de
// pointillé sous un appel — voir appelNote.tsx).
import { styleAppelNote } from './appelNote'
import { BadgeStatutAlignement } from './ComparaisonStatut'
import { BoutonEnregistrerSegment, BoutonCopieSegment, BoutonSignalerSegment } from './BoutonsSegment'
import type { AlignementDisponible, NoteBlocData, NoteStructuree, SegData } from './oeuvreTypes'
import {
  groupesSelonFiltre,
  membresOrdonnesParGroupe,
  type FiltreAlignement,
  type MembreComparable,
} from './comparaisonTraductionsUtils'

// Métadonnées d'édition d'une œuvre, pour la citation au copier/prélever (chaque
// colonne = une traduction distincte, donc sa propre attribution).
type OeuvreMeta = { titre: string; sous_titre: string | null; trad_auteur: string | null; editeur: string | null; collection: string | null; ville: string | null; date_publication: string | null }

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
  id_oeuvre: string
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

function lots<T>(items: T[], taille = 180) {
  const resultat: T[][] = []
  for (let index = 0; index < items.length; index += taille) resultat.push(items.slice(index, index + taille))
  return resultat
}

// Appel de note en infobulle, repris de la lecture : exposant brun souligné de
// pointillés, clic pour déplier le contenu structuré de la note.
function AppelNote({ note }: { note: NoteStructuree }) {
  const [ouvert, setOuvert] = useState(false)
  const ancre = useRef<HTMLElement>(null)
  const [rect, setRect] = useState<{ left: number; top: number; bottom: number } | null>(null)
  const basculer = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    if (ancre.current) { const r = ancre.current.getBoundingClientRect(); setRect({ left: r.left, top: r.top, bottom: r.bottom }) }
    setOuvert(o => !o)
  }
  useEffect(() => {
    if (!ouvert) return
    const onDown = (e: MouseEvent) => { if (!(e.target as Element).closest('[data-appel-note]')) setOuvert(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [ouvert])
  const haut = (rect?.top ?? 300) > 180
  const W = 340
  return (
    <>
      <sup ref={ancre as React.RefObject<HTMLElement>} data-appel-note="" role="button" tabIndex={0}
        onClick={basculer} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') basculer(e) }}
        aria-label={`Consulter la note ${note.noteNumber}`}
        style={styleAppelNote()}>
        {note.noteNumber}
      </sup>
      {ouvert && typeof document !== 'undefined' && createPortal(
        <div data-appel-note="" onMouseDown={e => e.stopPropagation()}
          style={{ position: 'fixed', left: Math.max(8, Math.min(rect?.left ?? 0, (typeof window !== 'undefined' ? window.innerWidth : 900) - W - 8)), top: haut ? (rect?.top ?? 0) - 8 : (rect?.bottom ?? 0) + 8, transform: haut ? 'translateY(-100%)' : 'none', width: W, maxWidth: 'calc(100vw - 16px)', maxHeight: 340, overflowY: 'auto', background: '#faf6ee', border: '1px solid var(--cs-or-doux)', borderRadius: 5, boxShadow: '0 6px 24px rgba(44,30,10,0.20)', padding: '10px 12px', zIndex: 9999, fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.78125rem', lineHeight: 1.45, color: '#2a2218' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.09em', color: 'var(--cs-texte-doux)', textTransform: 'uppercase' }}>Note {note.noteNumber}</span>
            <button onClick={() => setOuvert(false)} aria-label="Fermer" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b0a08a', fontSize: '0.9375rem', lineHeight: 1, padding: '0 2px' }}>×</button>
          </div>
          <ContenuNoteStructuree note={note} />
        </div>,
        document.body,
      )}
    </>
  )
}

function renderSegmentTexte(texte: string, notes: NoteStructuree[]) {
  const parNumero = new Map<string, NoteStructuree>()
  for (const note of notes) parNumero.set(String(note.noteNumber), note)
  return texte.split(/(\[\[[A-Z0-9]+\]\])/g).map((partie, index) => {
    const appel = partie.match(/^\[\[([A-Z0-9]+)\]\]$/)?.[1]
    if (!appel) return <Fragment key={index}>{rendreTexteEnrichi(partie)}</Fragment>
    const note = parNumero.get(appel)
    return note ? <AppelNote key={index} note={note} /> : <sup key={index} style={{ color: 'var(--cs-texte-faible)', fontSize: '0.62em' }}>{appel}</sup>
  })
}

// Gabarit d'un paragraphe, aligné sur la colonne française du mode Français-Latin
// (sans-serif 0.82rem, interligne 1.62, mots resserrés, justifié).
const STYLE_TEXTE_PARALLELE = {
  margin: 0,
  fontFamily: 'var(--font-source-sans), Arial, sans-serif',
  fontSize: '0.82rem',
  lineHeight: 1.62,
  color: 'var(--cs-texte-fort)',
  wordSpacing: '-0.025em',
  letterSpacing: 0,
  overflowWrap: 'break-word',
  whiteSpace: 'pre-line',
} as const

type BlocLecture = { type: 'prose' | 'vers' | 'rubrique'; segs: SegmentComparaison[] }

// Une colonne = une traduction. Les segments sont cliquables comme en lecture
// (survol/clic → cellule d'actions flottante : prélever, copier, signaler). Le CSS
// de `.seg-inline` vient du bloc <style> parent (OeuvreClient).
function ColonneLecture({ membres, segments, notes, vide, segActif, onSurvol, onQuitter, onClic, mobile }: {
  membres: MembreComparable[]
  segments: Map<string, SegmentComparaison>
  notes: NotesParSegment
  vide: string
  segActif: number | null
  onSurvol: (el: HTMLElement, id: number) => void
  onQuitter: (id: number) => void
  onClic: (el: HTMLElement, id: number, actif: boolean) => void
  mobile: boolean
}) {
  const ordonnes = membres.map(membre => segments.get(membre.segment_key)).filter(Boolean) as SegmentComparaison[]
  if (ordonnes.length === 0) {
    return <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic' }}>{vide}</p>
  }

  // Blocs : la prose d'un même paragraphe coule ensemble ; les vers consécutifs
  // forment une strophe (lignes serrées) ; une rubrique est isolée.
  const blocs: BlocLecture[] = []
  for (const segment of ordonnes) {
    const type: BlocLecture['type'] = segment.nature === 'vers' ? 'vers' : segment.nature === 'rubrique' ? 'rubrique' : 'prose'
    const dernier = blocs.at(-1)
    const memeProse = dernier?.type === 'prose' && type === 'prose' && segment.paragraphe != null && segment.paragraphe === dernier.segs[0].paragraphe
    const memeVers = dernier?.type === 'vers' && type === 'vers'
    if (dernier && (memeProse || memeVers)) dernier.segs.push(segment)
    else blocs.push({ type, segs: [segment] })
  }

  const rendreSegment = (segment: SegmentComparaison) => {
    const actif = segActif === segment.id
    return (
      <span id={`cmp-seg-${segment.id}`} className={`seg-inline${actif ? ' seg-inline--actif' : ''}`}
        onClick={e => onClic(e.currentTarget, segment.id, actif)}
        onMouseEnter={mobile ? undefined : e => onSurvol(e.currentTarget, segment.id)}
        onMouseLeave={mobile ? undefined : () => onQuitter(segment.id)}>
        {renderSegmentTexte(segment.segment_texte, notes[segment.segment_key] ?? [])}
      </span>
    )
  }

  return (
    <div>
      {blocs.map((bloc, blocIndex) => {
        const marginTop = blocIndex === 0 ? 0 : '0.72rem'
        if (bloc.type === 'rubrique') {
          return (
            <p key={blocIndex} lang="fr" style={{ ...STYLE_TEXTE_PARALLELE, marginTop, textAlign: 'center', fontStyle: 'italic' } as React.CSSProperties}>
              {rendreSegment(bloc.segs[0])}
            </p>
          )
        }
        if (bloc.type === 'vers') {
          // Strophe : lignes serrées (une ligne = une balise bloc, sans marge entre
          // elles). Alinéa poétique : les vers de rang pair (le second, plus court, du
          // distique) sont rentrés ; toute ligne qui déborde reçoit un retrait de suite.
          return (
            <div key={blocIndex} lang="fr" style={{ marginTop, fontFamily: STYLE_TEXTE_PARALLELE.fontFamily, fontSize: STYLE_TEXTE_PARALLELE.fontSize, color: STYLE_TEXTE_PARALLELE.color, wordSpacing: STYLE_TEXTE_PARALLELE.wordSpacing }}>
              {bloc.segs.map(segment => {
                const stanza = Boolean((segment.segment_metadata ?? {}).stanza_before)
                const pair = (segment.rang ?? 0) % 2 === 0
                return (
                  <span key={segment.segment_key} style={{ display: 'block', lineHeight: 1.4, marginTop: stanza ? '0.6rem' : 0, marginLeft: pair ? '1.5em' : 0, paddingLeft: '1.15em', textIndent: '-1.15em', hyphens: 'none', WebkitHyphens: 'none' } as React.CSSProperties}>
                    {rendreSegment(segment)}
                  </span>
                )
              })}
            </div>
          )
        }
        return (
          <p key={blocIndex} lang="fr" style={{ ...STYLE_TEXTE_PARALLELE, marginTop, textAlign: 'justify', textJustify: 'inter-word', hyphens: 'auto', WebkitHyphens: 'auto' } as React.CSSProperties}>
            {bloc.segs.map((segment, index) => (
              <Fragment key={segment.segment_key}>
                {index > 0 ? (segment.join_before ?? ' ') : null}
                {rendreSegment(segment)}
              </Fragment>
            ))}
          </p>
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

export default function ComparaisonTraductions({ alignement, estAdmin, book, division, userId, auteur }: {
  alignement: AlignementDisponible
  estAdmin: boolean
  book: number
  division: number
  userId: string | null
  auteur: string
}) {
  const mobile = useEstMobile(900)
  const [filtre, setFiltre] = useState<FiltreAlignement>('tous')
  const [groupes, setGroupes] = useState<Groupe[]>([])
  const [membres, setMembres] = useState<Membre[]>([])
  const [segments, setSegments] = useState<Map<string, SegmentComparaison>>(new Map())
  const [notes, setNotes] = useState<NotesParSegment>({})
  const [oeuvresMeta, setOeuvresMeta] = useState<Map<string, OeuvreMeta>>(new Map())
  const [sauvegardes, setSauvegardes] = useState<Set<number>>(new Set())
  const [segActif, setSegActif] = useState<number | null>(null)
  const [segSurvol, setSegSurvol] = useState<{ id: number; top: number; left: number } | null>(null)
  const timerSurvol = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  // Le composant est remonté (via `key`) à chaque changement de division : l'état
  // initial `chargement = true` fait donc l'affichage « Chargement… » sans qu'on
  // ait à appeler setState en tête d'effet (cascade de rendus proscrite).
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
          .select('id,id_texte,id_oeuvre,segment_key,segment_numero,segment_texte,nature,paragraphe,rang,join_before,segment_metadata')
          .in('segment_key', batch)
      ))
      for (const resultat of resultatsSegments) if (resultat.error) throw resultat.error
      const segmentsCharges = resultatsSegments.flatMap(resultat => resultat.data ?? []) as SegmentComparaison[]
      const notesChargees = await chargerNotes(segmentKeys)
      const segmentIds = segmentsCharges.map(segment => segment.id)
      // Métadonnées d'édition PAR œuvre (chaque colonne = une traduction, donc sa
      // propre attribution en citation) + état des prélèvements du lecteur.
      const idsOeuvres = Array.from(new Set(segmentsCharges.map(segment => segment.id_oeuvre).filter(Boolean)))
      const metaResult = idsOeuvres.length
        ? await supabase.from('oeuvres').select('id_oeuvre,titre,sous_titre,trad_auteur,editeur,collection,ville,date_publication').in('id_oeuvre', idsOeuvres)
        : { data: [], error: null }
      const metaMap = new Map<string, OeuvreMeta>()
      for (const row of (metaResult.data ?? []) as Record<string, string | null>[]) {
        if (row.id_oeuvre) metaMap.set(row.id_oeuvre, { titre: row.titre ?? '', sous_titre: row.sous_titre, trad_auteur: row.trad_auteur, editeur: row.editeur, collection: row.collection, ville: row.ville, date_publication: row.date_publication })
      }
      const sauvegardeSet = new Set<number>()
      if (userId && segmentIds.length) {
        const resultatsSaves = await Promise.all(lots(segmentIds).map(batch =>
          supabase.from('prelevements').select('segment_id').eq('user_id', userId).in('segment_id', batch)))
        for (const resultat of resultatsSaves) for (const row of (resultat.data ?? []) as { segment_id: number | null }[]) if (row.segment_id != null) sauvegardeSet.add(row.segment_id)
      }
      if (!actif) return
      setGroupes(groupesCharges)
      setMembres(membresCharges)
      setSegments(new Map(segmentsCharges.map(segment => [segment.segment_key, segment])))
      setNotes(notesChargees)
      setOeuvresMeta(metaMap)
      setSauvegardes(sauvegardeSet)
      setChargement(false)
    })().catch(() => {
      if (!actif) return
      setErreur('La comparaison ne peut pas être chargée pour cette division.')
      setChargement(false)
    })
    return () => { actif = false }
  }, [alignement, book, division, userId])

  const membresParGroupe = useMemo(() => membresOrdonnesParGroupe(membres), [membres])
  const groupesAffiches = useMemo(() => groupesSelonFiltre(groupes, filtre), [groupes, filtre])
  const segParId = useMemo(() => {
    const map = new Map<number, SegmentComparaison>()
    for (const segment of segments.values()) map.set(segment.id, segment)
    return map
  }, [segments])

  // Cellule d'actions flottante d'un segment (comme en lecture) : survol/clic pour
  // l'ancrer, prélever / copier / signaler. Le CSS `.seg-inline` vient du parent.
  const positionnerToolbar = (el: HTMLElement, id: number) => {
    if (timerSurvol.current) clearTimeout(timerSurvol.current)
    const r = el.getBoundingClientRect()
    const largeur = typeof window !== 'undefined' ? window.innerWidth : 1200
    setSegSurvol({ id, top: Math.max(r.top - 4, 56), left: Math.min(r.right + 6, largeur - 132) })
  }
  const masquerToolbar = (id: number) => {
    timerSurvol.current = setTimeout(() => setSegSurvol(prev => (prev && prev.id === id ? null : prev)), 200)
  }
  const clicSegment = (el: HTMLElement, id: number, actif: boolean) => {
    if (actif) { setSegActif(null); if (mobile) setSegSurvol(null) }
    else { setSegActif(id); positionnerToolbar(el, id) }
  }
  // Mobile : referme la barre au tap hors barre/segment et au défilement.
  useEffect(() => {
    if (!mobile || !segSurvol) return
    const auTapDehors = (e: Event) => { const c = e.target as Element | null; if (c && !c.closest('[data-seg-toolbar]') && !c.closest('.seg-inline')) setSegSurvol(null) }
    const auDefilement = () => setSegSurvol(null)
    document.addEventListener('pointerdown', auTapDehors, true)
    window.addEventListener('scroll', auDefilement, { passive: true })
    return () => { document.removeEventListener('pointerdown', auTapDehors, true); window.removeEventListener('scroll', auDefilement) }
  }, [mobile, segSurvol])
  // La barre flottante étant éphémère (remontée à chaque affichage), l'état des
  // prélèvements BASCULE : chaque action « prélever/retirer » inverse l'appartenance.
  const marquerSauvegarde = (id: number) => setSauvegardes(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const estGroupeVers = (groupe: Groupe) => {
    const mg = membresParGroupe.get(groupe.alignment_id)
    return mg ? [...mg.reference, ...mg.aligned].some(m => segments.get(m.segment_key)?.nature === 'vers') : false
  }
  // Les groupes de VERS consécutifs sont FUSIONNÉS en un seul bloc : chaque colonne
  // coule alors d'un trait, à interligne rigoureusement constant (comme le poème
  // entier du mode Français-Latin). La prose reste alignée empan par empan.
  const itemsRendus = useMemo<({ type: 'prose'; groupe: Groupe } | { type: 'vers'; groupes: Groupe[] })[]>(() => {
    const items: ({ type: 'prose'; groupe: Groupe } | { type: 'vers'; groupes: Groupe[] })[] = []
    for (const groupe of groupesAffiches) {
      const vers = estGroupeVers(groupe)
      const dernier = items.at(-1)
      if (vers && dernier && dernier.type === 'vers') dernier.groupes.push(groupe)
      else items.push(vers ? { type: 'vers', groupes: [groupe] } : { type: 'prose', groupe })
    }
    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupesAffiches, membresParGroupe, segments])

  const rendreDeuxColonnes = (refMembres: MembreComparable[], alnMembres: MembreComparable[]) =>
    ([
      { label: alignement.referenceLabel, members: refMembres, empty: `Pas de correspondant dans ${alignement.referenceLabel}` },
      { label: alignement.alignedLabel, members: alnMembres, empty: `Pas de correspondant dans ${alignement.alignedLabel}` },
    ] as const).map(colonne => (
      <div key={colonne.label} style={{ minWidth: 0 }}>
        {mobile && <h3 style={{ margin: '0 0 6px', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--cs-texte-doux)', fontWeight: 600 }}>{colonne.label}</h3>}
        <ColonneLecture membres={colonne.members} segments={segments} notes={notes} vide={colonne.empty}
          segActif={segActif} onSurvol={positionnerToolbar} onQuitter={masquerToolbar} onClic={clicSegment} mobile={mobile} />
      </div>
    ))

  return (
    <section aria-label={`Traductions parallèles : ${alignement.referenceLabel} et ${alignement.alignedLabel}`}>
      {estAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '10px' }}>
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
        </div>
      )}
      {chargement && <p style={{ color: 'var(--cs-texte-faible)', fontSize: '0.76rem' }}>Chargement de la division…</p>}
      {erreur && <p role="alert" style={{ color: 'var(--cs-danger)', fontSize: '0.76rem' }}>{erreur}</p>}
      {!chargement && !erreur && groupesAffiches.length === 0 && (
        <p style={{ color: 'var(--cs-texte-faible)', fontSize: '0.76rem' }}>{filtre === 'uncertain' ? 'Aucun groupe à relire dans cette division.' : 'Aucun passage aligné dans cette division.'}</p>
      )}
      {/* Deux traductions nommées en tête de colonnes — discret (pas de fond, pas de
          bandeau), pour savoir laquelle est laquelle sans quitter la mise en page de lecture. */}
      {!mobile && !chargement && !erreur && groupesAffiches.length > 0 && (
        <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.6rem', padding: '0 0 8px', borderBottom: '1px solid var(--cs-bord-clair)', marginBottom: '6px' }}>
          {[alignement.referenceLabel, alignement.alignedLabel].map(label => (
            <p key={label} style={{ margin: 0, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--cs-texte-doux)', fontWeight: 600 }}>{label}</p>
          ))}
        </div>
      )}
      {!chargement && !erreur && itemsRendus.map((item, index) => {
        const grille = { display: 'grid', gridTemplateColumns: mobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))', gap: mobile ? '0.15rem' : '1.6rem', alignItems: 'start' } as const
        if (item.type === 'vers') {
          // Poème : tous les groupes de vers consécutifs fusionnés, chaque colonne
          // coulant d'un trait → interligne constant. Pas de filet, espace minimal.
          const refMembres = item.groupes.flatMap(groupe => membresParGroupe.get(groupe.alignment_id)?.reference ?? [])
          const alnMembres = item.groupes.flatMap(groupe => membresParGroupe.get(groupe.alignment_id)?.aligned ?? [])
          return (
            <article key={item.groupes[0].alignment_id} aria-label={`Vers ${index + 1}`} style={{ ...grille, padding: '0.1rem 0' }}>
              {estAdmin && item.groupes.some(groupe => groupe.status === 'uncertain') && (
                <div style={{ gridColumn: '1 / -1', marginBottom: '2px' }}><BadgeStatutAlignement status="uncertain" estAdmin={estAdmin} /></div>
              )}
              {rendreDeuxColonnes(refMembres, alnMembres)}
            </article>
          )
        }
        const groupe = item.groupe
        const membresGroupe = membresParGroupe.get(groupe.alignment_id) ?? { reference: [], aligned: [] }
        return (
          <article key={groupe.alignment_id} aria-label={`Groupe ${index + 1}`} style={{ ...grille, padding: mobile ? '0.7rem 0 0.5rem' : '0.9rem 0 0.05rem', borderBottom: '1px solid rgba(var(--cs-bord-rgb),0.55)' }}>
            {estAdmin && groupe.status === 'uncertain' && (
              <div style={{ gridColumn: '1 / -1', marginBottom: '2px' }}><BadgeStatutAlignement status={groupe.status} estAdmin={estAdmin} /></div>
            )}
            {rendreDeuxColonnes(membresGroupe.reference, membresGroupe.aligned)}
          </article>
        )
      })}

      {/* Cellule d'actions flottante (prélever / copier / signaler) du segment ancré. */}
      {segSurvol && typeof document !== 'undefined' && (() => {
        const s = segParId.get(segSurvol.id)
        if (!s) return null
        const meta = oeuvresMeta.get(s.id_oeuvre)
        const segData = { id: s.id, idTexte: s.id_texte, numeroSource: s.segment_numero, texte: s.segment_texte } as unknown as SegData
        return createPortal(
          <div data-seg-toolbar="" onMouseEnter={() => { if (timerSurvol.current) clearTimeout(timerSurvol.current) }} onMouseLeave={() => masquerToolbar(segSurvol.id)}
            style={{ position: 'fixed', top: segSurvol.top, left: segSurvol.left, zIndex: 1500, display: 'flex', gap: '2px', alignItems: 'center', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', boxShadow: '0 4px 16px rgba(45,35,25,0.16)', padding: '2px 4px' }}>
            {userId && s.id_oeuvre && <BoutonEnregistrerSegment seg={segData} auteur={auteur} titreOeuvre={meta?.titre ?? ''} idOeuvre={s.id_oeuvre} userId={userId} dejaSauvegarde={sauvegardes.has(s.id)} onSauvegarde={() => marquerSauvegarde(s.id)} />}
            <BoutonCopieSegment texte={texteSansEnrichissement(s.segment_texte)} auteur={auteur} titre={meta?.titre} sousTitre={meta?.sous_titre ?? undefined} tradAuteur={meta?.trad_auteur ?? undefined} editeur={meta?.editeur ?? undefined} collection={meta?.collection ?? undefined} ville={meta?.ville ?? undefined} datePublication={meta?.date_publication ?? undefined} />
            <BoutonSignalerSegment segId={s.id} texteObjet={texteSansEnrichissement(s.segment_texte)} titreOeuvre={meta?.titre ?? ''} />
          </div>,
          document.body,
        )
      })()}
    </section>
  )
}
