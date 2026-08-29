'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/app/lib/supabase'
import { useEstMobile } from '@/app/lib/useEstMobile'
import { rendreTexteEnrichi, texteSansEnrichissement } from './texteEnrichi'
import { ContenuNoteStructuree } from './ContenuNoteStructuree'
// Forme de l'appel de note : une seule définition pour tout le site (jamais de
// pointillé sous un appel — voir appelNote.tsx).
import { styleAppelNote, styleSeparateurAppels, lireSuiteAppels, separateurAppels } from './appelNote'
import { BadgeStatutAlignement } from './ComparaisonStatut'
import { BoutonEnregistrerSegment, BoutonCopieSegment, BoutonSignalerSegment } from './BoutonsSegment'
import type { AlignementDisponible, NoteBlocData, NoteStructuree, SegData } from './oeuvreTypes'
import { estColonneOriginale } from './oeuvreTypes'
import { hauteurNavbarPx, placerFenetre } from '@/app/lib/fenetreContextuelle'
import { niveauxAlinea, retraitVers, ouvreStrophe, mesureAlinea, marqueStrophe, estEnVers, RETRAIT_SUITE } from '@/app/lib/compositionVers'
import { CLE_NUMERO_VERSET, NATURE_VERSET, estBlocVersets, numeroVersetLisible } from '@/app/lib/compositionVersets'
import { cesurerLatin } from '@/app/lib/cesuresLatines'
import {
  projeterAppelsNotesStructurees,
  type AncreNoteStructureeProjection,
} from '@/app/lib/appelsNotesStructurees'
import { chargerToutesPagesSupabase } from '@/app/lib/paginationSupabase'
import { estNoteApparatCritique, lireMetadonneesBlocNote } from '@/app/lib/apparatCritique'
import { liantAvantSegment } from '@/app/lib/jonctionSegments'
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
type AncresParSegment = Record<string, AncreNoteStructureeProjection[]>

function lots<T>(items: T[], taille = 180) {
  const resultat: T[][] = []
  for (let index = 0; index < items.length; index += taille) resultat.push(items.slice(index, index + taille))
  return resultat
}

// Appel de note en infobulle, repris de la lecture : exposant brun sans
// soulignement, clic pour déplier le contenu structuré de la note.
function AppelNote({ note }: { note: NoteStructuree }) {
  // Même règle que dans la lecture : l'apparat s'annonce dans l'en-tête.
  const apparat = estNoteApparatCritique(note)
  const libelle = apparat ? 'Apparat critique' : 'Note'
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
  const W = 340
  // Même règle que dans la lecture : la note ne passe jamais sous la barre de
  // navigation et ne déborde jamais du bas de l'écran. L'ancien seuil de 180 px
  // ignorait le bas, et une note appelée en pied de colonne sortait de la vue.
  const vue = typeof window === 'undefined'
    ? { largeur: 900, hauteur: 800 }
    : { largeur: window.innerWidth, hauteur: window.innerHeight }
  const placement = placerFenetre({
    ancre: rect ?? { top: 300, bottom: 316, left: 0 },
    largeur: W, hauteurSouhaitee: 340, vue, hautNavbar: hauteurNavbarPx(), ecart: 8,
  })
  return (
    <>
      <sup ref={ancre as React.RefObject<HTMLElement>} data-appel-note="" role="button" tabIndex={0}
        onClick={basculer} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') basculer(e) }}
        aria-label={`Consulter ${apparat ? "l'apparat critique" : 'la note'} ${note.noteNumber}`}
        style={styleAppelNote()}>
        {note.noteNumber}
      </sup>
      {ouvert && typeof document !== 'undefined' && createPortal(
        <div data-appel-note="" onMouseDown={e => e.stopPropagation()}
          style={{ position: 'fixed', left: placement.left, top: placement.top, width: W, maxWidth: 'calc(100vw - 16px)', maxHeight: placement.hauteurMax, overflowY: 'auto', background: 'var(--cs-fond)', border: '1px solid var(--cs-or-doux)', borderRadius: 4, boxShadow: 'var(--cs-ombre-flottante)', padding: '10px 12px', zIndex: 9999, fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.78125rem', lineHeight: 1.45, color: 'var(--cs-texte-fort)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.09em', color: 'var(--cs-texte-doux)', textTransform: 'uppercase' }}>{libelle} {note.noteNumber}</span>
            <button onClick={() => setOuvert(false)} aria-label="Fermer" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b0a08a', fontSize: '0.9375rem', lineHeight: 1, padding: '0 2px' }}>×</button>
          </div>
          <ContenuNoteStructuree note={note} />
        </div>,
        document.body,
      )}
    </>
  )
}

// Mêmes règles que la page de lecture (voir appelNote.tsx) : l’appel voyage dans
// un « nowrap » avec la ponctuation qui le suit — un point ne tombe jamais seul
// à la ligne — et deux notes qui se suivent s’écrivent « 2 & 3 ».
function renderSegmentTexte(texte: string, notes: NoteStructuree[]) {
  const parNumero = new Map<string, NoteStructuree>()
  for (const note of notes) parNumero.set(String(note.noteNumber), note)
  const noeuds: React.ReactNode[] = []
  const regex = /\[\[[A-Z0-9]+\]\]/g
  let dernierIndex = 0, k = 0, m: RegExpExecArray | null
  while ((m = regex.exec(texte))) {
    if (m.index > dernierIndex) noeuds.push(<Fragment key={k++}>{rendreTexteEnrichi(texte.slice(dernierIndex, m.index))}</Fragment>)
    const { marqueurs, ponctuation, fin } = lireSuiteAppels(texte, m.index)
    regex.lastIndex = fin
    dernierIndex = fin
    const appels: React.ReactNode[] = []
    marqueurs.forEach((appel, rang) => {
      if (rang > 0) appels.push(
        <sup key={k++} style={styleSeparateurAppels()}>{separateurAppels(rang, marqueurs.length)}</sup>
      )
      const note = parNumero.get(appel)
      appels.push(note
        ? <AppelNote key={k++} note={note} />
        : <sup key={k++} style={{ color: 'var(--cs-texte-faible)', fontSize: '0.62em' }}>{appel}</sup>)
    })
    noeuds.push(<span key={k++} style={{ whiteSpace: 'nowrap' }}>{appels}{ponctuation}</span>)
  }
  if (dernierIndex < texte.length) noeuds.push(<Fragment key={k++}>{rendreTexteEnrichi(texte.slice(dernierIndex))}</Fragment>)
  return noeuds
}

// Gabarit d'un paragraphe, aligné sur la colonne française du mode Français-Latin
// (sérif 0.82rem, interligne 1.62, mots resserrés, justifié). Un texte d'œuvre se
// lit toujours en sérif ; seule une colonne en LANGUE ORIGINALE, mise en regard du
// français, passe en sans-serif (voir `POLICE_ORIGINALE` plus bas).
const STYLE_TEXTE_PARALLELE = {
  margin: 0,
  fontFamily: 'var(--font-source-serif), Georgia, serif',
  fontSize: '0.8125rem',
  lineHeight: 1.62,
  color: 'var(--cs-texte-fort)',
  wordSpacing: '-0.025em',
  letterSpacing: 0,
  overflowWrap: 'break-word',
  whiteSpace: 'pre-line',
} as const

type BlocLecture = { type: 'prose' | 'vers' | 'versets' | 'rubrique'; segs: SegmentComparaison[] }

// Une colonne = une traduction. Les segments sont cliquables comme en lecture
// (survol/clic → cellule d'actions flottante : prélever, copier, signaler). Le CSS
// de `.seg-inline` vient du bloc <style> parent (OeuvreClient).
const POLICE_ORIGINALE = 'var(--font-source-sans), Arial, sans-serif'

function ColonneLecture({ membres, segments, notes, ancres, vide, segActif, onSurvol, onQuitter, onClic, mobile, langue }: {
  membres: MembreComparable[]
  segments: Map<string, SegmentComparaison>
  notes: NotesParSegment
  ancres: AncresParSegment
  vide: string
  segActif: number | null
  onSurvol: (el: HTMLElement, id: number) => void
  onQuitter: (id: number) => void
  onClic: (el: HTMLElement, id: number, actif: boolean) => void
  mobile: boolean
  langue: string | null
}) {
  // Le latin en regard du français se distingue par la police, comme en lecture
  // bilingue ; deux traductions françaises restent l'une et l'autre en sérif.
  const originale = estColonneOriginale(langue)
  const police = originale ? POLICE_ORIGINALE : STYLE_TEXTE_PARALLELE.fontFamily
  const codeLangue = originale ? 'la' : 'fr'
  // Aucun navigateur ne sait couper le latin : sans césures posées, une colonne
  // aussi étroite se creuse de blancs à chaque ligne justifiée.
  const composer = originale ? cesurerLatin : (t: string) => t
  const ordonnes = membres.map(membre => segments.get(membre.segment_key)).filter(Boolean) as SegmentComparaison[]
  if (ordonnes.length === 0) {
    return <p style={{ margin: 0, fontSize: '0.71875rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic' }}>{vide}</p>
  }

  // ⛔ Un `verset` ne fait BLOC que si son paragraphe n'en porte QUE, et c'est la
  // règle de la lecture ordinaire : elle découpe par `paragraphe`, puis exige le tout
  // ou rien d'`estBlocVersets`. Une citation glissée dans le fil d'un commentaire s'y
  // compose donc en prose. Ici, le bloc se formait sur la seule nature du segment : la
  // MÊME donnée sortait du fil sur une surface et restait dans le fil sur l'autre.
  // ⚠️ Une nature ne peut pas se composer de deux façons — c'est le corollaire de la
  // règle déjà payée sur les vers, « une nature traitée sur UNE surface ne l'est nulle
  // part », prise par l'autre bout. Relevé le 29 août 2026 sur les 1 055 versets que
  // le Commentaire sur les Psaumes de Chrysostome portait dans sa prose.
  const naturesDuParagraphe = new Map<string, (string | null)[]>()
  const cleParagraphe = (segment: SegmentComparaison) =>
    segment.paragraphe == null ? `seul:${segment.segment_key}` : `par:${segment.paragraphe}`
  for (const segment of ordonnes) {
    const cle = cleParagraphe(segment)
    const liste = naturesDuParagraphe.get(cle)
    if (liste) liste.push(segment.nature)
    else naturesDuParagraphe.set(cle, [segment.nature])
  }

  // Blocs : la prose d'un même paragraphe coule ensemble ; les vers consécutifs
  // forment une strophe (lignes serrées) ; les versets consécutifs forment la citation
  // biblique dont ils sont tirés ; une rubrique est isolée.
  const blocs: BlocLecture[] = []
  for (const segment of ordonnes) {
    const faitBloc = estBlocVersets(naturesDuParagraphe.get(cleParagraphe(segment)) ?? [])
    const type: BlocLecture['type'] = estEnVers(segment) ? 'vers'
      : segment.nature === NATURE_VERSET && faitBloc ? 'versets'
      : segment.nature === 'rubrique' ? 'rubrique' : 'prose'
    const dernier = blocs.at(-1)
    const memeProse = dernier?.type === 'prose' && type === 'prose' && segment.paragraphe != null && segment.paragraphe === dernier.segs[0].paragraphe
    const memeVers = dernier?.type === 'vers' && type === 'vers'
    // ⚠️ Les versets se réunissent sans regarder `paragraphe`, comme les vers : le
    // bloc est la CITATION, et les éditions ne s'accordent pas sur ce qu'elles
    // rangent dans un paragraphe (voir `compositionVersets.ts`).
    const memeVersets = dernier?.type === 'versets' && type === 'versets'
    if (dernier && (memeProse || memeVers || memeVersets)) dernier.segs.push(segment)
    else blocs.push({ type, segs: [segment] })
  }

  const rendreSegment = (segment: SegmentComparaison) => {
    const actif = segActif === segment.id
    return (
      <span id={`cmp-seg-${segment.id}`} className={`seg-inline${actif ? ' seg-inline--actif' : ''}`}
        onClick={e => onClic(e.currentTarget, segment.id, actif)}
        onMouseEnter={mobile ? undefined : e => onSurvol(e.currentTarget, segment.id)}
        onMouseLeave={mobile ? undefined : () => onQuitter(segment.id)}>
        {renderSegmentTexte(
          composer(projeterAppelsNotesStructurees(segment.segment_texte, ancres[segment.segment_key])),
          notes[segment.segment_key] ?? [],
        )}
      </span>
    )
  }

  return (
    <div>
      {blocs.map((bloc, blocIndex) => {
        const marginTop = blocIndex === 0 ? 0 : '0.72rem'
        if (bloc.type === 'rubrique') {
          return (
            <p key={blocIndex} lang={codeLangue} style={{ ...STYLE_TEXTE_PARALLELE, fontFamily: police, marginTop, textAlign: 'center', fontStyle: 'italic' } as React.CSSProperties}>
              {rendreSegment(bloc.segs[0])}
            </p>
          )
        }
        if (bloc.type === 'vers') {
          // Strophe : lignes serrées (une ligne = une balise bloc, sans marge entre
          // elles), alinéa de base sur toutes, alinéas poétiques LUS DANS LA SOURCE,
          // et retrait de suite pour la ligne qui déborde. Toute la règle vit dans
          // `app/lib/compositionVers.ts`, que la lecture ordinaire emploie aussi.
          const rangs = niveauxAlinea(bloc.segs.map(s => mesureAlinea((s.segment_metadata ?? {}).indent_inches)))
          return (
            <div key={blocIndex} lang={codeLangue} style={{ marginTop, fontFamily: police, fontSize: STYLE_TEXTE_PARALLELE.fontSize, color: STYLE_TEXTE_PARALLELE.color, wordSpacing: STYLE_TEXTE_PARALLELE.wordSpacing }}>
              {bloc.segs.map((segment, i) => {
                const strophe = ouvreStrophe(
                  { strophe_avant: marqueStrophe((segment.segment_metadata ?? {}).stanza_before), paragraphe: segment.paragraphe },
                  bloc.segs[i - 1],
                )
                return (
                  <span key={segment.segment_key} style={{ display: 'block', lineHeight: 1.4, marginTop: strophe ? '0.6rem' : 0, marginLeft: `${retraitVers(rangs[i])}em`, paddingLeft: `${RETRAIT_SUITE}em`, textIndent: `-${RETRAIT_SUITE}em`, hyphens: 'none', WebkitHyphens: 'none' } as React.CSSProperties}>
                    {rendreSegment(segment)}
                  </span>
                )
              })}
            </div>
          )
        }
        if (bloc.type === 'versets') {
          // Citation biblique posée VERSET PAR VERSET, comme en lecture ordinaire :
          // retrait à gauche, léger blanc entre versets, corps réduit. Les classes
          // viennent du bloc <style> parent (OeuvreClient), leurs mesures de
          // `app/lib/compositionVersets.ts` — une seule composition, deux surfaces.
          return (
            <div key={blocIndex} lang={codeLangue} className="citation-versets" style={{ marginTop, marginBottom: 0, fontFamily: police }}>
              {bloc.segs.map(segment => {
                const numero = numeroVersetLisible((segment.segment_metadata ?? {})[CLE_NUMERO_VERSET])
                return (
                  <span key={segment.segment_key} className="citation-verset">
                    {numero ? <sup className="num-verset">{numero}</sup> : null}
                    {rendreSegment(segment)}
                  </span>
                )
              })}
            </div>
          )
        }
        return (
          <p key={blocIndex} lang={codeLangue} style={{ ...STYLE_TEXTE_PARALLELE, fontFamily: police, marginTop, textAlign: 'justify', textJustify: 'inter-word', hyphens: 'auto', WebkitHyphens: 'auto' } as React.CSSProperties}>
            {bloc.segs.map((segment, index) => (
              <Fragment key={segment.segment_key}>
                {index > 0 ? liantAvantSegment(segment.join_before) : null}
                {rendreSegment(segment)}
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}

async function chargerNotes(segmentKeys: string[]): Promise<{
  notes: NotesParSegment
  ancres: AncresParSegment
}> {
  if (segmentKeys.length === 0) return { notes: {}, ancres: {} }
  type AncreRow = {
    id_texte: string
    note_key: string
    segment_key: string
    marker: string | null
    source_target: string | null
    segment_offset_unicode: number | null
  }
  type NoteRow = { id_texte: string; note_key: string; note_number: number | null }
  type BlocRow = {
    id_texte: string
    note_key: string
    block_id: string
    rank: number
    kind: string
    form: string
    language: string | null
    text: string
    rendering: string | null
    needs_review: boolean
    // Lu au serveur, projeté sur quatre scalaires avant d'entrer dans les blocs.
    metadata: Record<string, unknown> | null
  }
  type RelationRow = {
    id_texte: string
    note_key: string
    relation_kind: string
    source_block_id: string
    target_block_id: string | null
  }
  const ancresBrutes = (await Promise.all(lots(segmentKeys).map(batch =>
    chargerToutesPagesSupabase<AncreRow>((debut, fin) => supabase.from('texte_note_ancres')
      .select('id_texte,note_key,segment_key,marker,source_target,segment_offset_unicode')
      .in('segment_key', batch).order('note_key').order('segment_key')
      .order('segment_offset_unicode').range(debut, fin))
  ))).flat()
  if (ancresBrutes.length === 0) return { notes: {}, ancres: {} }
  const noteKeys = Array.from(new Set(ancresBrutes.map(ancre => ancre.note_key)))
  const lotsNotes = lots(noteKeys)
  const [notesRows, blocksRows, relationsRows] = await Promise.all([
    Promise.all(lotsNotes.map(batch => chargerToutesPagesSupabase<NoteRow>((debut, fin) => supabase
      .from('texte_notes').select('id_texte,note_key,note_number').in('note_key', batch)
      .order('note_key').range(debut, fin)))).then(pages => pages.flat()),
    Promise.all(lotsNotes.map(batch => chargerToutesPagesSupabase<BlocRow>((debut, fin) => supabase
      .from('texte_note_blocs').select('id_texte,note_key,block_id,rank,kind,form,language,text,rendering,needs_review,metadata')
      .in('note_key', batch).order('note_key').order('rank').range(debut, fin)))).then(pages => pages.flat()),
    Promise.all(lotsNotes.map(batch => chargerToutesPagesSupabase<RelationRow>((debut, fin) => supabase
      .from('texte_note_relations').select('id_texte,note_key,relation_kind,source_block_id,target_block_id')
      .in('note_key', batch).order('note_key').order('source_block_id')
      .order('relation_kind').range(debut, fin)))).then(pages => pages.flat()),
  ])

  const relations = new Map<string, Record<string, string | null>>()
  for (const relation of relationsRows) {
    const key = `${relation.id_texte}|${relation.note_key}|${relation.source_block_id}`
    relations.set(key, { ...(relations.get(key) ?? {}), [relation.relation_kind]: relation.target_block_id })
  }
  const notes = new Map<string, NoteStructuree>()
  for (const row of notesRows) {
    if (typeof row.note_number === 'number') notes.set(`${row.id_texte}|${row.note_key}`, { noteKey: row.note_key, noteNumber: row.note_number, blocks: [] })
  }
  for (const block of blocksRows) {
    const note = notes.get(`${block.id_texte}|${block.note_key}`)
    if (!note) continue
    const relation = relations.get(`${block.id_texte}|${block.note_key}|${block.block_id}`) ?? {}
    const meta = lireMetadonneesBlocNote(block.metadata)
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
      editorialRole: meta.editorialRole,
      printedLine: meta.printedLine,
      visualReviewReason: meta.visualReviewReason,
      humanValidated: meta.humanValidated,
    })
  }
  const resultat: NotesParSegment = {}
  const ancres: AncresParSegment = {}
  for (const ancre of ancresBrutes) {
    const note = notes.get(`${ancre.id_texte}|${ancre.note_key}`)
    if (!note) throw new Error(`Note structurée introuvable : ${ancre.note_key}.`)
    resultat[ancre.segment_key] ??= []
    if (!resultat[ancre.segment_key].some(existante => existante.noteKey === note.noteKey)) resultat[ancre.segment_key].push(note)
    if (ancre.source_target === 'segment_texte') {
      if (!ancre.marker?.match(/^\[\[[A-Z0-9]+\]\]$/u) || !Number.isInteger(ancre.segment_offset_unicode)) {
        throw new Error(`Ancre de note structurée incomplète : ${ancre.note_key}.`)
      }
      ancres[ancre.segment_key] ??= []
      ancres[ancre.segment_key].push({
        noteKey: ancre.note_key,
        marker: ancre.marker,
        segmentOffsetUnicode: ancre.segment_offset_unicode as number,
        sourceTarget: ancre.source_target,
      })
    }
  }
  return { notes: resultat, ancres }
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
  const [ancresNotes, setAncresNotes] = useState<AncresParSegment>({})
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
      if (metaResult.error) throw metaResult.error
      const metaMap = new Map<string, OeuvreMeta>()
      for (const row of (metaResult.data ?? []) as Record<string, string | null>[]) {
        if (row.id_oeuvre) metaMap.set(row.id_oeuvre, { titre: row.titre ?? '', sous_titre: row.sous_titre, trad_auteur: row.trad_auteur, editeur: row.editeur, collection: row.collection, ville: row.ville, date_publication: row.date_publication })
      }
      const sauvegardeSet = new Set<number>()
      if (userId && segmentIds.length) {
        const resultatsSaves = await Promise.all(lots(segmentIds).map(batch =>
          supabase.from('prelevements').select('segment_id').eq('user_id', userId).in('segment_id', batch)))
        for (const resultat of resultatsSaves) {
          if (resultat.error) throw resultat.error
          for (const row of (resultat.data ?? []) as { segment_id: number | null }[]) if (row.segment_id != null) sauvegardeSet.add(row.segment_id)
        }
      }
      if (!actif) return
      setGroupes(groupesCharges)
      setMembres(membresCharges)
      setSegments(new Map(segmentsCharges.map(segment => [segment.segment_key, segment])))
      setNotes(notesChargees.notes)
      setAncresNotes(notesChargees.ancres)
      setOeuvresMeta(metaMap)
      setSauvegardes(sauvegardeSet)
      setChargement(false)
    })().catch(error => {
      console.error('Chargement de la comparaison et de ses notes impossible :', error)
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
    return mg ? [...mg.reference, ...mg.aligned].some(m => estEnVers(segments.get(m.segment_key))) : false
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
      { label: alignement.referenceLabel, members: refMembres, empty: `Pas de correspondant dans ${alignement.referenceLabel}`, langue: alignement.referenceLangue },
      { label: alignement.alignedLabel, members: alnMembres, empty: `Pas de correspondant dans ${alignement.alignedLabel}`, langue: alignement.alignedLangue },
    ] as const).map(colonne => (
      <div key={colonne.label} style={{ minWidth: 0 }}>
        {mobile && <h3 style={{ margin: '0 0 6px', fontSize: '0.59375rem', textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--cs-texte-doux)', fontWeight: 600 }}>{colonne.label}</h3>}
        <ColonneLecture membres={colonne.members} segments={segments} notes={notes} ancres={ancresNotes} vide={colonne.empty} langue={colonne.langue}
          segActif={segActif} onSurvol={positionnerToolbar} onQuitter={masquerToolbar} onClic={clicSegment} mobile={mobile} />
      </div>
    ))

  return (
    <section aria-label={`Traductions parallèles : ${alignement.referenceLabel} et ${alignement.alignedLabel}`}>
      {estAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '10px' }}>
          <div aria-label="Filtrer les groupes d’alignement" style={{ display: 'inline-flex', border: '1px solid var(--cs-bord)', borderRadius: '4px', overflow: 'hidden' }}>
            {([['tous', 'Tous'], ['uncertain', 'À relire']] as [FiltreAlignement, string][]).map(([valeur, libelle]) => (
              <button
                key={valeur}
                data-filtre-alignement={valeur}
                aria-pressed={filtre === valeur}
                onClick={() => setFiltre(valeur)}
                style={{ border: 0, borderLeft: valeur === 'uncertain' ? '1px solid var(--cs-bord)' : 0, background: filtre === valeur ? 'rgba(var(--cs-vert-rgb),0.09)' : 'var(--cs-surface)', color: filtre === valeur ? 'var(--cs-encre)' : 'var(--cs-texte-second)', padding: '5px 9px', cursor: 'pointer', fontSize: '0.6875rem' }}
              >
                {libelle}
              </button>
            ))}
          </div>
        </div>
      )}
      {chargement && <p style={{ color: 'var(--cs-texte-faible)', fontSize: '0.75rem' }}>Chargement de la division…</p>}
      {erreur && <p role="alert" style={{ color: 'var(--cs-danger)', fontSize: '0.75rem' }}>{erreur}</p>}
      {!chargement && !erreur && groupesAffiches.length === 0 && (
        <p style={{ color: 'var(--cs-texte-faible)', fontSize: '0.75rem' }}>{filtre === 'uncertain' ? 'Aucun groupe à relire dans cette division.' : 'Aucun passage aligné dans cette division.'}</p>
      )}
      {/* Deux traductions nommées en tête de colonnes — discret (pas de fond, pas de
          bandeau), pour savoir laquelle est laquelle sans quitter la mise en page de lecture. */}
      {!mobile && !chargement && !erreur && groupesAffiches.length > 0 && (
        <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.6rem', padding: '0 0 8px', borderBottom: '1px solid var(--cs-bord-clair)', marginBottom: '6px' }}>
          {[alignement.referenceLabel, alignement.alignedLabel].map(label => (
            <p key={label} style={{ margin: 0, fontSize: '0.59375rem', textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--cs-texte-doux)', fontWeight: 600 }}>{label}</p>
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
            style={{ position: 'fixed', top: segSurvol.top, left: segSurvol.left, zIndex: 1500, display: 'flex', gap: '2px', alignItems: 'center', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', boxShadow: 'var(--cs-ombre-flottante)', padding: '2px 4px' }}>
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
