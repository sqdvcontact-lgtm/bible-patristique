'use client'
import { ABREV_FR } from '@/app/lib/bible'

import { useState, useEffect, type CSSProperties, type ReactNode } from 'react'
import { supabase } from '@/app/lib/supabase'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { rendreTexteEnrichi, texteSansEnrichissement } from '@/app/oeuvre/[id]/texteEnrichi'
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'

const NOM_FR: Record<string, string> = {
  GEN:'Genèse',EXO:'Exode',LEV:'Lévitique',NUM:'Nombres',DEU:'Deutéronome',JOS:'Josué',JDG:'Juges',RUT:'Ruth',
  '1SA':'1 Samuel','2SA':'2 Samuel','1KI':'1 Rois','2KI':'2 Rois','1CH':'1 Chroniques','2CH':'2 Chroniques',
  EZR:'Esdras',NEH:'Néhémie',EST:'Esther',JOB:'Job',PSA:'Psaumes',PRO:'Proverbes',ECC:'Ecclésiaste',SNG:'Cantique des cantiques',
  ISA:'Isaïe',JER:'Jérémie',LAM:'Lamentations',EZK:'Ézéchiel',DAN:'Daniel',HOS:'Osée',JOL:'Joël',AMO:'Amos',
  OBA:'Abdias',JON:'Jonas',MIC:'Michée',NAM:'Nahum',HAB:'Habacuc',ZEP:'Sophonie',HAG:'Aggée',ZEC:'Zacharie',MAL:'Malachie',
  MAT:'Matthieu',MRK:'Marc',LUK:'Luc',JHN:'Jean',ACT:'Actes',ROM:'Romains','1CO':'1 Corinthiens','2CO':'2 Corinthiens',
  GAL:'Galates',EPH:'Éphésiens',PHP:'Philippiens',COL:'Colossiens','1TH':'1 Thessaloniciens','2TH':'2 Thessaloniciens','1TI':'1 Timothée',
  '2TI':'2 Timothée',TIT:'Tite',PHM:'Philémon',HEB:'Hébreux',JAS:'Jacques','1PE':'1 Pierre','2PE':'2 Pierre',
  '1JN':'1 Jean','2JN':'2 Jean','3JN':'3 Jean',JUD:'Jude',REV:'Apocalypse',
}
const CODE_PAR_LIBELLE = new Map<string, string>(
  Object.keys(ABREV_FR).flatMap((code): [string, string][] => [
    [sansAccents(code), code],
    [sansAccents(ABREV_FR[code]), code],
    [sansAccents(NOM_FR[code] ?? ''), code],
  ]).filter(([k]) => !!k)
)
const NB_CHAPITRES: Record<string, number> = {
  GEN:50,EXO:40,LEV:27,NUM:36,DEU:34,JOS:24,JDG:21,RUT:4,
  '1SA':31,'2SA':24,'1KI':22,'2KI':25,'1CH':29,'2CH':36,
  EZR:10,NEH:13,EST:16,JOB:42,PSA:150,PRO:31,ECC:12,SNG:8,
  ISA:66,JER:52,LAM:5,EZK:48,DAN:14,HOS:14,JOL:3,AMO:9,
  OBA:1,JON:4,MIC:7,NAM:3,HAB:3,ZEP:3,HAG:2,ZEC:14,MAL:4,
  MAT:28,MRK:16,LUK:24,JHN:21,ACT:28,ROM:16,'1CO':16,'2CO':13,
  GAL:6,EPH:6,PHP:4,COL:4,'1TH':5,'2TH':3,'1TI':6,'2TI':4,
  TIT:3,PHM:1,HEB:13,JAS:5,'1PE':5,'2PE':3,'1JN':5,'2JN':1,
  '3JN':1,JUD:1,REV:22,
}

// Citation « pleine » — le texte cité (SANS guillemets français) va dans un bloc Citation,
// et la référence dans une note. `texte` porte le corps cité, `fin` la ponctuation finale
// (l'appel de note se place AVANT), `ref` la note. Seule forme autorisée : plus de renvoi
// abrégé (« référence courte »).
type Choix = { label: string; type: 'verset' | 'segment'; id: string; href?: string; complet?: boolean; texte?: string; fin?: string; ref?: string }
type Props = { onChoisir: (c: Choix) => void; onFermer: () => void }

// Liens internes « redirection vers le site » pour un renvoi cliquable.
function hrefVerset(livre: string, chapitre: number | string, verset: number | string): string {
  const code = codeLivre(livre) ?? livre
  return `/?livre=${code}&chapitre=${chapitre}&trad=TR0002&verset=${verset}`
}
function hrefSegment(idOeuvre: string, idSegment: string | number): string {
  return `/oeuvre/${idOeuvre}?segment=${idSegment}`
}

function sansAccents(s: string): string {
  return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, '').trim()
}

function correspondDebutsDeMots(texte: string, requete: string): boolean {
  const termes = sansAccents(requete).trim().split(/\s+/).filter(Boolean)
  if (termes.length === 0) return true
  const mots = sansAccents(texte).match(/[\p{L}\p{N}]+/gu) ?? []
  return termes.every(t => mots.some(m => m.startsWith(t)))
}

function labelVerset(livre: string, chapitre: number | string, verset: number | string): string {
  const code = codeLivre(livre) ?? livre
  return `${ABREV_FR[code] ?? livre} ${chapitre}, ${verset}`
}

function codeLivre(...valeurs: unknown[]): string | null {
  for (const valeur of valeurs) {
    const brut = String(valeur ?? '')
    const normalise = sansAccents(brut)
    const sansEspaces = normalise.replace(/\s+/g, '')
    const code = CODE_PAR_LIBELLE.get(normalise) ?? CODE_PAR_LIBELLE.get(sansEspaces)
    if (code) return code
  }
  return null
}

function convertirGuillemetsInternes(texte: string): string {
  return texte.replace(/«\s*/g, '“').replace(/\s*»/g, '”')
}

// Ponctuation finale d'une citation : \u00ab ? \u00bb et \u00ab ! \u00bb sont conserv\u00e9s ; toute autre
// ponctuation finale (ou son absence) devient un point. Le corps est rendu SANS cette
// ponctuation : l'appel de note s'ins\u00e8re ensuite, puis la ponctuation finale.
function terminaison(texte: string): { corps: string; fin: string } {
  const t = String(texte ?? '').trim()
  const dernier = t.slice(-1)
  if (dernier === '?' || dernier === '!') return { corps: t.slice(0, -1).trim(), fin: dernier }
  return { corps: t.replace(/[.\u2026,;:\u00b7]+$/u, '').trim(), fin: '.' }
}

// Corps cit\u00e9 : enrichissement retir\u00e9, guillemets internes convertis en guillemets courbes,
// JAMAIS de guillemets fran\u00e7ais autour, ponctuation finale isol\u00e9e dans `fin`.
function corpsCitation(texte: string): { corps: string; fin: string } {
  return terminaison(convertirGuillemetsInternes(texteSansEnrichissement(String(texte ?? '')).trim()))
}

type OeuvreMeta = { titre: string; trad_auteur?: string | null; editeur?: string | null; ville?: string | null; date_publication?: string | null }

// Note bibliographique pour un renvoi patristique : titre en italiques (*\u2026*), PAS de
// niveaux 1-5, ajout de l'\u00e9diteur, du traducteur, de la ville et de la date ; le locus (\u00a7)
// est conserv\u00e9 ; termin\u00e9e par un point.
function refNotePatristique(auteur: string, o: OeuvreMeta, segs: SegPatr[]): string {
  const nums = segs.map(s => s.segment_numero).sort((a, b) => a - b)
  const contigu = nums.length > 1 && nums.every((n, i) => i === 0 || n === nums[i - 1] + 1)
  const locus = nums.length === 1 ? `\u00a7${nums[0]}` : contigu ? `\u00a7${nums[0]}\u2013\u00a7${nums[nums.length - 1]}` : `\u00a7${nums.join(', ')}`
  const parts = [auteur, `*${o.titre}*`]
  if (o.trad_auteur) parts.push(`trad. ${o.trad_auteur}`)
  if (o.editeur) parts.push(String(o.editeur))
  if (o.ville) parts.push(String(o.ville))
  if (o.date_publication) parts.push(formaterDateHistorique(o.date_publication))
  parts.push(locus)
  return parts.filter(Boolean).join(', ') + '.'
}

// Note pour un renvoi biblique : la r\u00e9f\u00e9rence, termin\u00e9e par un point.
function refNoteBiblique(ref: string): string {
  return `${ref.trim()}.`
}

function BoutonCiter({ onCiter }: { onCiter: () => void }) {
  return (
    <span style={{ display: 'flex', gap: '5px', flexShrink: 0, alignSelf: 'flex-start' }}>
      <button type="button" onClick={(e) => { e.stopPropagation(); onCiter() }} style={petitChoixStyle}>Citer</button>
    </span>
  )
}


const petitChoixStyle: CSSProperties = {
  fontSize: '0.625rem', padding: '3px 7px', borderRadius: '4px', border: '1px solid #d6d0c4',
  background: '#fff', color: '#3d6b4f', cursor: 'pointer', whiteSpace: 'nowrap',
}

// Bouton de retour : une flèche fine dans une pastille arrondie, plus soignée que le « ← ».
function BoutonRetour({ onClick, children, inline = false }: { onClick: () => void; children: ReactNode; inline?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.6875rem', color: '#3d6b4f', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: inline ? 0 : '10px' }}>
      <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', border: '1px solid #cddbd1', background: '#f4f8f5' }}>
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M10 3.5L5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {children}
    </button>
  )
}

export default function SelecteurCitation({ onChoisir, onFermer }: Props) {
  const [source, setSource] = useState<'bible' | 'patristique'>('bible')
  const [mode, setMode] = useState<'parcourir' | 'mes-citations'>('parcourir')

  // Fermeture protégée : un clic à côté ne ferme PAS l'outil ; la croix demande d'abord
  // confirmation, pour ne pas perdre par mégarde une sélection en cours.
  const demanderFermeture = () => {
    if (window.confirm('Fermer l’outil de citation ? Votre sélection en cours sera perdue.')) onFermer()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,26,22,0.45)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '10px', width: '100%', maxWidth: '45rem', height: '78vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', borderBottom: '1px solid #e4dfd8' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['bible', 'patristique'] as const).map(s => (
              <button key={s} onClick={() => setSource(s)}
                style={{ fontSize: '0.75rem', padding: '6px 14px', borderRadius: '5px', border: 'none', cursor: 'pointer', background: source === s ? '#3d6b4f' : '#e4dfd8', color: source === s ? '#fff' : '#6b6560', fontWeight: source === s ? 600 : 400 }}>
                {s === 'bible' ? 'Bible' : 'Patristique'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['parcourir', 'mes-citations'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                style={{ fontSize: '0.6875rem', padding: '5px 11px', borderRadius: '12px', border: `1px solid ${mode === m ? '#3d6b4f' : '#d6d0c4'}`, cursor: 'pointer', background: mode === m ? 'rgba(61,107,79,0.10)' : '#fff', color: mode === m ? '#3d6b4f' : '#8a8278' }}>
                {m === 'parcourir' ? 'Parcourir' : 'Mes citations'}
              </button>
            ))}
          </div>
          <button onClick={demanderFermeture} style={{ fontSize: '0.9375rem', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {mode === 'parcourir'
            ? (source === 'bible' ? <ParcourirBible onChoisir={onChoisir} /> : <ParcourirPatristique onChoisir={onChoisir} />)
            : <MesCitations source={source} onChoisir={onChoisir} />}
        </div>
      </div>
    </div>
  )
}

function ParcourirBible({ onChoisir }: { onChoisir: (c: Choix) => void }) {
  const [livre, setLivre] = useState('')
  const [chapitre, setChapitre] = useState<number | null>(null)
  const [versets, setVersets] = useState<{ id_verset: string; verset: number; texte: string }[]>([])
  const [chargement, setChargement] = useState(false)

  const choisirChapitre = async (c: number) => {
    setChapitre(c); setChargement(true)
    const { data } = await supabase.from('versets_lecture').select('id_verset, verset, TR0002').eq('livre', livre).eq('chapitre', c).order('verset')
    setVersets((data ?? []).map((v: any) => ({ id_verset: v.id_verset, verset: v.verset, texte: v.TR0002 ?? '' })))
    setChargement(false)
  }

  if (!livre) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
      {Object.keys(ABREV_FR).map(l => (
        <button key={l} onClick={() => setLivre(l)} style={{ fontSize: '0.75rem', padding: '8px 4px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a3d30', cursor: 'pointer' }}>{ABREV_FR[l]}</button>
      ))}
    </div>
  )

  if (chapitre === null) return (
    <div>
      <BoutonRetour onClick={() => setLivre('')}>Livres</BoutonRetour>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '5px' }}>
        {Array.from({ length: NB_CHAPITRES[livre] }, (_, i) => i + 1).map(c => (
          <button key={c} onClick={() => choisirChapitre(c)} style={{ fontSize: '0.71875rem', padding: '6px 0', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a3d30', cursor: 'pointer' }}>{c}</button>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <BoutonRetour onClick={() => setChapitre(null)}>{ABREV_FR[livre]}, chapitres</BoutonRetour>
      {chargement ? <p style={{ fontSize: '0.75rem', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {versets.map(v => {
            const ref = labelVerset(livre, chapitre, v.verset)
            return (
            <div key={v.id_verset}
              style={{ display: 'flex', gap: '10px', textAlign: 'left', padding: '8px 10px', borderRadius: '5px', border: '1px solid #ede9e2', background: '#fff', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#3d6b4f', flexShrink: 0 }}>{v.verset}</span>
              <span style={{ fontSize: '0.78125rem', color: '#2a2520', lineHeight: 1.5, flex: 1 }}>{rendreTexteEnrichi(v.texte)}</span>
              <BoutonCiter
                onCiter={() => {
                  const { corps, fin } = corpsCitation(v.texte)
                  onChoisir({ label: ref, type: 'verset', id: v.id_verset, href: hrefVerset(livre, chapitre, v.verset), complet: true, texte: corps, fin, ref: refNoteBiblique(ref) })
                }}
              />
            </div>
          )})}
        </div>
      )}
    </div>
  )
}

// Segment d'une œuvre chargée dans le sélecteur.
type SegPatr = { id: number; segment_numero: number; segment_texte: string; ref_niv1: string | null; ref_niv2: string | null; ref_niv3: string | null; ref_niv4: string | null; ref_niv5: string | null }

// PATRISTIQUE — flux simplifié : une page où l'on cherche l'ŒUVRE par son nom (ou son
// auteur), puis, dans l'œuvre, on cherche le passage et l'on sélectionne un OU PLUSIEURS
// segments à citer d'un coup. Plus d'étape « choisir un auteur » d'abord.
function ParcourirPatristique({ onChoisir }: { onChoisir: (c: Choix) => void }) {
  type OeuvreItem = { id_oeuvre: string; titre: string; auteurNom: string } & OeuvreMeta
  const [oeuvres, setOeuvres] = useState<OeuvreItem[] | null>(null)
  const [oeuvre, setOeuvre] = useState<OeuvreItem | null>(null)
  const [segments, setSegments] = useState<SegPatr[]>([])
  const [chargement, setChargement] = useState(false)
  const [rechercheOeuvre, setRechercheOeuvre] = useState('')
  const [rechercheSeg, setRechercheSeg] = useState('')
  const [selection, setSelection] = useState<Set<number>>(new Set())

  // Toutes les œuvres publiées, avec le nom de l'auteur ET les métadonnées d'édition
  // (traducteur, éditeur, ville, date) qui nourrissent la note bibliographique.
  useEffect(() => {
    supabase.from('oeuvres').select('id_oeuvre, titre, note, trad_auteur, editeur, ville, date_publication, auteurs(nom)').order('titre').then(({ data }) => {
      const liste = ((data ?? []) as any[]).filter(estOeuvrePubliee)
        .map(o => ({ id_oeuvre: o.id_oeuvre, titre: o.titre, auteurNom: o.auteurs?.nom ?? '', trad_auteur: o.trad_auteur, editeur: o.editeur, ville: o.ville, date_publication: o.date_publication }))
      setOeuvres(liste)
    })
  }, [])

  const choisirOeuvre = async (o: OeuvreItem) => {
    setOeuvre(o); setRechercheSeg(''); setSelection(new Set()); setChargement(true)
    const { data } = await supabase.from('segments').select('id, segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3, ref_niv4, ref_niv5').eq('id_oeuvre', o.id_oeuvre).eq('nature', 'texte').order('segment_numero')
    setSegments((data ?? []) as SegPatr[])
    setChargement(false)
  }

  // ── Étape 1 : chercher une œuvre ──────────────────────────────────────────
  if (!oeuvre) {
    const q = sansAccents(rechercheOeuvre.trim())
    const resultats = (oeuvres ?? []).filter(o => !q || correspondDebutsDeMots(`${o.titre} ${o.auteurNom}`, rechercheOeuvre))
    return (
      <div>
        <input value={rechercheOeuvre} onChange={e => setRechercheOeuvre(e.target.value)} autoFocus
          placeholder="Chercher une œuvre (titre ou auteur)…"
          style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.8125rem', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d6d0c4', background: '#faf8f4', color: '#2a2520', marginBottom: '12px', outline: 'none' }} />
        {oeuvres === null ? (
          <p style={{ fontSize: '0.75rem', color: '#9a958d', fontStyle: 'italic' }}>Chargement du catalogue…</p>
        ) : resultats.length === 0 ? (
          <p style={{ fontSize: '0.75rem', color: '#9a958d', fontStyle: 'italic' }}>{q ? 'Aucune œuvre ne correspond.' : 'Aucune œuvre disponible.'}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {resultats.slice(0, 60).map(o => (
              <button key={o.id_oeuvre} onClick={() => choisirOeuvre(o)}
                style={{ textAlign: 'left', fontSize: '0.8125rem', padding: '8px 11px', borderRadius: '5px', border: '1px solid #ede9e2', background: '#fff', color: '#2a3d30', cursor: 'pointer' }}>
                {o.titre}
                {o.auteurNom && <span style={{ color: '#9a958d', fontStyle: 'italic' }}> — {o.auteurNom}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Étape 2 : chercher un passage dans l'œuvre, sélectionner des segments ──
  const q = sansAccents(rechercheSeg.trim())
  const segmentsFiltres = q
    ? segments.filter(s => correspondDebutsDeMots(s.segment_texte, rechercheSeg) || String(s.segment_numero).startsWith(q))
    : segments
  const segsSelectionnes = segments.filter(s => selection.has(s.id)).sort((a, b) => a.segment_numero - b.segment_numero)
  const toggle = (id: number) => setSelection(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const insererSelection = () => {
    if (segsSelectionnes.length === 0) return
    const ref = refNotePatristique(oeuvre.auteurNom, oeuvre, segsSelectionnes)
    const premier = segsSelectionnes[0]
    const href = hrefSegment(oeuvre.id_oeuvre, premier.id)
    const { corps, fin } = corpsCitation(segsSelectionnes.map(s => s.segment_texte).join(' '))
    onChoisir({ label: ref, type: 'segment', id: String(premier.id), href, complet: true, texte: corps, fin, ref })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
        <BoutonRetour inline onClick={() => { setOeuvre(null); setSelection(new Set()) }}>Œuvres</BoutonRetour>
        <span style={{ fontSize: '0.75rem', color: '#2a3d30', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{oeuvre.titre}</span>
        {oeuvre.auteurNom && <span style={{ fontSize: '0.6875rem', color: '#9a958d', fontStyle: 'italic' }}>{oeuvre.auteurNom}</span>}
      </div>
      <input value={rechercheSeg} onChange={e => setRechercheSeg(e.target.value)}
        placeholder="Chercher un passage dans cette œuvre…"
        style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.75rem', padding: '7px 10px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#faf8f4', color: '#2a2520', marginBottom: '10px', outline: 'none', flexShrink: 0 }} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {chargement ? <p style={{ fontSize: '0.75rem', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {segmentsFiltres.map(s => {
              const sel = selection.has(s.id)
              const t = texteSansEnrichissement(s.segment_texte)
              return (
                <button key={s.id} type="button" onClick={() => toggle(s.id)}
                  style={{ display: 'flex', gap: '9px', textAlign: 'left', padding: '8px 10px', borderRadius: '5px', border: `1px solid ${sel ? '#3d6b4f' : '#ede9e2'}`, background: sel ? 'rgba(61,107,79,0.07)' : '#fff', cursor: 'pointer', alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0, width: '14px', height: '14px', marginTop: '1px', borderRadius: '3px', border: `1px solid ${sel ? '#3d6b4f' : '#c8c0b4'}`, background: sel ? '#3d6b4f' : '#fff', color: '#fff', fontSize: '0.625rem', lineHeight: '13px', textAlign: 'center' }}>{sel ? '✓' : ''}</span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#3d6b4f', flexShrink: 0 }}>§{s.segment_numero}</span>
                  <span style={{ fontSize: '0.78125rem', color: '#2a2520', lineHeight: 1.5, flex: 1 }}>{t.slice(0, 200) + (t.length > 200 ? '…' : '')}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
      {/* Barre d'insertion : agit sur le OU LES segments sélectionnés. */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '10px', marginTop: '4px', borderTop: '1px solid #ede9e2' }}>
        <span style={{ fontSize: '0.71875rem', color: segsSelectionnes.length ? '#3d6b4f' : '#9a958d' }}>
          {segsSelectionnes.length === 0 ? 'Sélectionnez un ou plusieurs segments' : `${segsSelectionnes.length} segment${segsSelectionnes.length > 1 ? 's' : ''} sélectionné${segsSelectionnes.length > 1 ? 's' : ''}`}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          <button type="button" disabled={!segsSelectionnes.length} onClick={() => insererSelection()}
            style={{ ...petitChoixStyle, background: segsSelectionnes.length ? '#3d6b4f' : '#e4dfd8', color: segsSelectionnes.length ? '#fff' : '#9a958d', border: 'none', opacity: 1, cursor: segsSelectionnes.length ? 'pointer' : 'default' }}>Citer</button>
        </span>
      </div>
    </div>
  )
}

function MesCitations({ source, onChoisir }: { source: 'bible' | 'patristique'; onChoisir: (c: Choix) => void }) {
  const [items, setItems] = useState<any[] | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id
      if (!uid) { setItems([]); return }
      const { data: prelevements } = await supabase.from('prelevements').select('*').eq('user_id', uid)
        .eq('type', source === 'bible' ? 'biblique' : 'patristique')
        .order('created_at', { ascending: false })
      setItems(prelevements ?? [])
    })
  }, [source])

  if (items === null) return <p style={{ fontSize: '0.75rem', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>
  if (items.length === 0) return <p style={{ fontSize: '0.75rem', color: '#9a958d', fontStyle: 'italic' }}>Aucune citation enregistrée dans « Mes citations » pour l'instant.</p>

  const choisir = async (it: any) => {
    if (source === 'bible') {
      const livreCode = codeLivre(it.ref_livre, it.ref_livre_abr, it.livre)
      if (!livreCode) return
      const { data } = await supabase.from('versets_lecture').select('id_verset').eq('livre', livreCode).eq('chapitre', it.ref_chapitre).eq('verset', it.ref_verset).maybeSingle()
      const ref = labelVerset(livreCode, it.ref_chapitre, it.ref_verset)
      const { corps, fin } = corpsCitation(it.texte ?? '')
      if (data) onChoisir({ label: ref, type: 'verset', id: data.id_verset, href: hrefVerset(livreCode, it.ref_chapitre, it.ref_verset), complet: true, texte: corps, fin, ref: refNoteBiblique(ref) })
    } else {
      const [{ data: seg }, { data: meta }] = await Promise.all([
        supabase.from('segments').select('id, segment_numero').eq('id_oeuvre', it.id_oeuvre).eq('segment_numero', it.segment_numero).single(),
        supabase.from('oeuvres').select('titre, trad_auteur, editeur, ville, date_publication').eq('id_oeuvre', it.id_oeuvre).maybeSingle(),
      ])
      if (seg) {
        const auteur = it.auteur ?? it.auteur_nom ?? ''
        const oeuvreMeta: OeuvreMeta = { titre: meta?.titre ?? it.titre_oeuvre ?? '', trad_auteur: meta?.trad_auteur, editeur: meta?.editeur, ville: meta?.ville, date_publication: meta?.date_publication }
        const ref = refNotePatristique(auteur, oeuvreMeta, [seg as unknown as SegPatr])
        const { corps, fin } = corpsCitation(it.texte ?? '')
        onChoisir({ label: ref, type: 'segment', id: String(seg.id), href: hrefSegment(it.id_oeuvre, seg.id), complet: true, texte: corps, fin, ref })
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {items.map(it => {
        const label = source === 'bible'
          ? labelVerset(codeLivre(it.ref_livre, it.ref_livre_abr, it.livre) ?? it.ref_livre, it.ref_chapitre, it.ref_verset)
          : `${it.auteur ?? it.auteur_nom ?? ''}, ${it.titre_oeuvre ?? ''} §${it.segment_numero}`
        return (
          <div key={it.id}
            style={{ display: 'flex', gap: '10px', textAlign: 'left', padding: '8px 10px', borderRadius: '5px', border: '1px solid #ede9e2', background: '#fff', alignItems: 'flex-start' }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#3d6b4f' }}>{label}</span>
              <span style={{ display: 'block', fontSize: '0.78125rem', color: '#2a2520', lineHeight: 1.5 }}>{it.texte?.slice(0, 200)}</span>
            </span>
            <BoutonCiter onCiter={() => choisir(it)} />
          </div>
        )
      })}
    </div>
  )
}
