'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from "@/app/lib/supabase"
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { calculerRang, couleurRang } from '@/app/lib/classement'
import { useAffichageAdmin } from '@/app/lib/contexteAffichageAdmin'

type Verset = { id_verset: string; ref: string; verset: number; chapitre: number }
type Segment = {
  id: number; id_oeuvre: string; segment_numero: number
  segment_texte: string; ref_niv1: string; ref_niv2: string
  ref_niv3: string; fiabilite: string
}
type OeuvreInfo = {
  titre: string; sous_titre?: string; auteur_nom: string
  trad_auteur: string | null; editeur: string | null
  collection?: string; ville: string | null; date_publication: string | null
}
type Commentaire = { id: number; texte: string; auteur_nom: string; created_at: string }

// ── Détection admin fiable, via profils.est_admin du compte connecté ─────────
// (le cookie bp_admin_session est HttpOnly, donc invisible et inutilisable
// depuis un composant client — c'est pour ça que ça ne fonctionnait jamais).
function useIsAdmin(userId: string | null) {
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    if (!userId) { setIsAdmin(false); return }
    supabase.from('profils').select('est_admin').eq('id', userId).maybeSingle().then(({ data }) => setIsAdmin(data?.est_admin === true))
  }, [userId])
  return isAdmin
}

// ── Construction citation complète ───────────────────────────────────────────
// Si le texte cité contient déjà des guillemets français (citation de second
// niveau — le Père cite lui-même l'Écriture, par exemple), on les convertit
// en guillemets anglais pour ne pas doubler les guillemets français lors de
// l'export via « Copier ».
function convertirGuillemetsInternes(texte: string): string {
  return texte
    .replace(/«[\u202F\u00A0\s]*/g, '“')
    .replace(/[\u202F\u00A0\s]*»/g, '”')
}

function construireCitationPatristique(
  texte: string, auteur: string, titre: string,
  sousTitre?: string, tradAuteur?: string | null, editeur?: string | null,
  collection?: string, ville?: string | null, datePublication?: string | null
): string {
  const parts: string[] = []
  if (auteur) parts.push(auteur)
  let titreComplet = titre || ''
  if (sousTitre) titreComplet += '. ' + sousTitre + '.'
  else if (titre) titreComplet += '.'
  if (titreComplet) parts.push(titreComplet)
  if (editeur) parts.push(editeur)
  if (tradAuteur) parts.push('trad. ' + tradAuteur)
  if (collection) parts.push(collection)
  if (ville) parts.push(ville)
  if (datePublication) parts.push(datePublication)
  parts.push('« disponible sur le site labibledesperes.com »')
  parts.push('« ' + convertirGuillemetsInternes(texte) + ' »')
  return parts.join(', ') + '.'
}

// ── Bouton copie segment ──────────────────────────────────────────────────────
function BoutonCopieSegment({ texte, auteur, titre, trad_auteur, editeur, collection, ville, date_publication }: {
  texte: string; auteur: string; titre: string
  trad_auteur?: string; editeur?: string; collection?: string; ville?: string; date_publication?: string
}) {
  const [copie, setCopie] = useState(false)
  const handle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const citation = construireCitationPatristique(texte, auteur, titre, undefined, trad_auteur, editeur, collection, ville, date_publication)
    navigator.clipboard.writeText(citation).then(() => {
      setCopie(true); setTimeout(() => setCopie(false), 1400)
    })
  }
  return (
    <button onClick={handle} title="Copier ce segment"
      style={{ background:'none', border:'none', cursor:'pointer', padding:'1px 3px', borderRadius:'3px', fontSize:'13px', lineHeight:1, flexShrink:0, transition:'color 0.15s', color: copie ? '#3d6b4f' : '#c8c0b4' }}>
      {copie ? '✓' : '⧉'}
    </button>
  )
}

// ── Bouton enregistrer segment ────────────────────────────────────────────────
function BoutonEnregistrerSegment({ segment, info, userId }: {
  segment: Segment; info?: OeuvreInfo; userId: string | null
}) {
  const [loading, setLoading] = useState(false)
  const [idPrelev, setIdPrelev] = useState<string | null>(null)
  if (!userId) return null

  const enregistrer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (idPrelev) return
    setLoading(true)
    const { data } = await supabase.from('prelevements').insert({
      user_id: userId, type: 'patristique',
      auteur: info?.auteur_nom || segment.id_oeuvre,
      titre_oeuvre: info?.titre || '',
      ref_niv1: segment.ref_niv1 || null,
      ref_niv2: segment.ref_niv2 || null,
      id_oeuvre: segment.id_oeuvre,
      segment_numero: segment.segment_numero,
      texte: segment.segment_texte,
    }).select('id').single()
    setLoading(false)
    if (data) setIdPrelev(data.id)
  }

  const supprimer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!idPrelev) return
    setLoading(true)
    await supabase.from('prelevements').delete().eq('id', idPrelev)
    setLoading(false)
    setIdPrelev(null)
  }

  if (idPrelev) {
    return (
      <button onClick={supprimer} disabled={loading} title="Retirer des prélèvements"
        style={{ background:'none', border:'none', cursor:'pointer', padding:'1px 3px', borderRadius:'3px', fontSize:'13px', lineHeight:1, flexShrink:0, color:'#3d6b4f' }}>
        {loading ? '…' : '✕'}
      </button>
    )
  }
  return (
    <button onClick={enregistrer} disabled={loading} title="Enregistrer dans mes prélèvements"
      style={{ background:'none', border:'none', cursor:'pointer', padding:'1px 3px', borderRadius:'3px', fontSize:'13px', lineHeight:1, flexShrink:0, color:'#c8c0b4' }}>
      {loading ? '…' : '+'}
    </button>
  )
}

// ── Bouton supprimer lien (admin uniquement) ──────────────────────────────────
function BoutonSupprimerLien({ segmentId, colonneLien, isAdmin, onSupprime }: {
  segmentId: number; colonneLien: string; isAdmin: boolean; onSupprime: () => void
}) {
  const [confirme, setConfirme] = useState(false)
  const [loading, setLoading] = useState(false)
  if (!isAdmin) return null

  if (!confirme) {
    return (
      <button onClick={e => { e.stopPropagation(); setConfirme(true) }}
        title={`Supprimer ${colonneLien}`}
        style={{ background:'none', border:'none', cursor:'pointer', padding:'0 3px', fontSize:'11px', color:'#d6d0c4', lineHeight:1, flexShrink:0, transition:'color 0.15s' }}>
        ×
      </button>
    )
  }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'2px', flexShrink:0 }}>
      <button onClick={async e => {
        e.stopPropagation()
        setLoading(true)
        await supabase.from('segments').update({ [colonneLien]: null }).eq('id', segmentId)
        setLoading(false)
        onSupprime()
      }} disabled={loading}
        style={{ fontSize:'9px', padding:'1px 5px', borderRadius:'3px', border:'none', background:'#c0392b', color:'#fff', cursor:'pointer' }}>
        {loading ? '…' : 'Oui'}
      </button>
      <button onClick={e => { e.stopPropagation(); setConfirme(false) }}
        style={{ fontSize:'9px', padding:'1px 5px', borderRadius:'3px', border:'1px solid #d6d0c4', background:'#fff', color:'#6b6560', cursor:'pointer' }}>
        Non
      </button>
    </span>
  )
}

// ── Modale signalement ────────────────────────────────────────────────────────
function ModalSignalement({ titre, titreEntete = 'Signaler une erreur', onClose, onEnvoyer }: {
  titre: string; titreEntete?: string; onClose: () => void; onEnvoyer: (msg: string) => Promise<void>
}) {
  const [message, setMessage] = useState('')
  const [statut, setStatut] = useState<'idle'|'sending'|'ok'|'err'>('idle')
  const envoyer = async () => {
    if (!message.trim()) return
    setStatut('sending')
    try { await onEnvoyer(message.trim()); setStatut('ok'); setTimeout(onClose, 1800) }
    catch { setStatut('err') }
  }
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'8px', padding:'20px 22px', width:'340px', boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
          <p style={{ fontSize:'12px', fontWeight:600, color:'#c0562a', margin:0 }}>{titreEntete}</p>
          <button onClick={onClose} style={{ fontSize:'14px', color:'#b0a89e', background:'none', border:'none', cursor:'pointer', padding:0, lineHeight:1 }}>✕</button>
        </div>
        {titre && <p style={{ fontSize:'10.5px', color:'#9a958d', fontStyle:'italic', marginBottom:'10px', lineHeight:1.4 }}>{titre}</p>}
        {statut === 'ok' ? (
          <p style={{ fontSize:'11.5px', color:'#3d6b4f', fontStyle:'italic', textAlign:'center', padding:'8px 0' }}>Signalement envoyé, merci !</p>
        ) : (
          <>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Décrivez l'erreur constatée…" rows={4} autoFocus
              style={{ width:'100%', fontSize:'11px', padding:'7px 9px', border:'1px solid #d6d0c4', borderRadius:'5px', background:'#faf8f4', color:'#2a2520', resize:'vertical', outline:'none', lineHeight:1.5, boxSizing:'border-box' }} />
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'8px', gap:'8px' }}>
              {statut === 'err' && <span style={{ fontSize:'10px', color:'#c0562a', alignSelf:'center' }}>Erreur d'envoi.</span>}
              <button onClick={onClose} style={{ fontSize:'11px', padding:'5px 12px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#6b6560', cursor:'pointer' }}>Annuler</button>
              <button onClick={envoyer} disabled={statut === 'sending' || !message.trim()}
                style={{ fontSize:'11px', padding:'5px 14px', borderRadius:'4px', border:'none', cursor: message.trim() ? 'pointer' : 'default', background: message.trim() ? '#c0562a' : '#e4dfd8', color: message.trim() ? '#fff' : '#9a958d', fontWeight:500 }}>
                {statut === 'sending' ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Carte segment ─────────────────────────────────────────────────────────────
function SegmentCard({ s, info, userId, isAdmin, colonneLien, typeLien, onSignaler, onSupprimeLien }: {
  s: Segment; info?: OeuvreInfo; userId: string | null; isAdmin: boolean
  colonneLien: string
  typeLien: 'exacte' | 'libre' | 'doctrine' | 'echo'
  onSignaler: (s: Segment) => void
  onSupprimeLien: (id: number) => void
}) {
  const niveaux = [s.ref_niv1, s.ref_niv2, s.ref_niv3].filter(Boolean).join(', ')
  const BADGE: Record<typeof typeLien, { label: string; couleur: string; bordure: string }> = {
    exacte:   { label: 'citation exacte',  couleur: '#3d6b4f', bordure: 'rgba(61,107,79,0.25)' },
    libre:    { label: 'citation libre',   couleur: '#8a8278', bordure: '#d6d0c4' },
    doctrine: { label: 'doctrine',         couleur: '#7a5a9e', bordure: 'rgba(122,90,158,0.28)' },
    echo:     { label: 'écho thématique',  couleur: '#9a7e3d', bordure: 'rgba(154,126,61,0.28)' },
  }
  const badge = BADGE[typeLien]

  return (
    <div style={{ paddingTop:'10px', paddingBottom:'4px', borderBottom:'1px solid #ede9e2' }}>

      {/* Ligne 1 : auteur (gauche) + badge type de citation et boutons (droite) */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1px' }}>
        <p style={{ fontSize:'11px', fontWeight:600, color:'#3d6b4f', margin:0, lineHeight:1.3 }}>
          {info?.auteur_nom || s.id_oeuvre}
        </p>
        <div style={{ display:'flex', gap:'4px', alignItems:'center', flexShrink:0 }}>
          <span style={{
            fontSize:'9px', fontStyle:'italic', whiteSpace:'nowrap',
            border:`1px solid ${badge.bordure}`,
            color: badge.couleur,
            borderRadius:'3px', padding:'0px 4px', lineHeight:'1.6',
          }}>
            {badge.label}
          </span>
          <div style={{ display:'flex', gap:'1px', alignItems:'center' }}>
            <BoutonEnregistrerSegment segment={s} info={info} userId={userId} />
            <BoutonCopieSegment
              texte={s.segment_texte} auteur={info?.auteur_nom || s.id_oeuvre} titre={info?.titre || ''}
              trad_auteur={info?.trad_auteur ?? undefined} editeur={info?.editeur ?? undefined}
              collection={info?.collection} ville={info?.ville ?? undefined} date_publication={info?.date_publication ?? undefined}
            />
            <button onClick={e => { e.stopPropagation(); onSignaler(s) }} title="Signaler une erreur"
              style={{ background:'none', border:'none', cursor:'pointer', padding:'1px 3px', borderRadius:'3px', fontSize:'13px', lineHeight:1, flexShrink:0, color:'#c8c0b4' }}>
              ⚑
            </button>
            <BoutonSupprimerLien
              segmentId={s.id} colonneLien={colonneLien}
              isAdmin={isAdmin} onSupprime={() => onSupprimeLien(s.id)}
            />
          </div>
        </div>
      </div>

      {/* Ligne 3 : titre de l'oeuvre */}
      <p style={{ fontSize:'11px', color:'#8a8278', fontStyle:'italic', margin:'0 0 1px' }}>
        {info?.titre || ''}
      </p>

      {/* Ligne 4 : niveaux de référence */}
      <div style={{ display:'flex', alignItems:'baseline', gap:'5px', marginBottom:'5px', flexWrap:'wrap' }}>
        {niveaux && (
          <span style={{ fontSize:'10px', color:'#b0a89e' }}>
            {niveaux}
          </span>
        )}
      </div>

      {/* Texte du segment */}
      <p style={{ fontSize:'11.5px', lineHeight:'1.45', color:'#2a2520', textAlign:'justify', margin:'0 0 1px' }}>
        {s.segment_texte}
      </p>

      {/* Lien vers l'oeuvre */}
      <div style={{ textAlign:'right', lineHeight:1 }}>
        <a href={`/oeuvre/${s.id_oeuvre}#s${s.segment_numero}`} target="_blank" rel="noopener noreferrer"
          style={{ fontSize:'10px', color:'#b0a89e', textDecoration:'none' }}>
          ↗
        </a>
      </div>
    </div>
  )
}

// ── Onglet commentaires ───────────────────────────────────────────────────────
// Pas plus de 5 majuscules consécutives (accentuées comprises).
const REGEX_CAPS_ABUSIVES = /[A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]{6,}/

const LIVRES_LIEN: { code: string; nom: string }[] = [
  { code: 'GEN', nom: 'Genèse' }, { code: 'EXO', nom: 'Exode' }, { code: 'LEV', nom: 'Lévitique' },
  { code: 'NUM', nom: 'Nombres' }, { code: 'DEU', nom: 'Deutéronome' }, { code: 'JOS', nom: 'Josué' },
  { code: 'JDG', nom: 'Juges' }, { code: 'RUT', nom: 'Ruth' }, { code: '1SA', nom: '1 Samuel' },
  { code: '2SA', nom: '2 Samuel' }, { code: '1KI', nom: '1 Rois' }, { code: '2KI', nom: '2 Rois' },
  { code: '1CH', nom: '1 Chroniques' }, { code: '2CH', nom: '2 Chroniques' }, { code: 'EZR', nom: 'Esdras' },
  { code: 'NEH', nom: 'Néhémie' }, { code: 'EST', nom: 'Esther' }, { code: 'JOB', nom: 'Job' },
  { code: 'PSA', nom: 'Psaumes' }, { code: 'PRO', nom: 'Proverbes' }, { code: 'ECC', nom: 'Ecclésiaste' },
  { code: 'SNG', nom: 'Cantique des cantiques' }, { code: 'ISA', nom: 'Isaïe' }, { code: 'JER', nom: 'Jérémie' },
  { code: 'LAM', nom: 'Lamentations' }, { code: 'EZK', nom: 'Ézéchiel' }, { code: 'DAN', nom: 'Daniel' },
  { code: 'HOS', nom: 'Osée' }, { code: 'JOL', nom: 'Joël' }, { code: 'AMO', nom: 'Amos' },
  { code: 'OBA', nom: 'Abdias' }, { code: 'JON', nom: 'Jonas' }, { code: 'MIC', nom: 'Michée' },
  { code: 'NAM', nom: 'Nahum' }, { code: 'HAB', nom: 'Habacuc' }, { code: 'ZEP', nom: 'Sophonie' },
  { code: 'HAG', nom: 'Aggée' }, { code: 'ZEC', nom: 'Zacharie' }, { code: 'MAL', nom: 'Malachie' },
  { code: 'MAT', nom: 'Matthieu' }, { code: 'MRK', nom: 'Marc' }, { code: 'LUK', nom: 'Luc' },
  { code: 'JHN', nom: 'Jean' }, { code: 'ACT', nom: 'Actes' }, { code: 'ROM', nom: 'Romains' },
  { code: '1CO', nom: '1 Corinthiens' }, { code: '2CO', nom: '2 Corinthiens' }, { code: 'GAL', nom: 'Galates' },
  { code: 'EPH', nom: 'Éphésiens' }, { code: 'PHP', nom: 'Philippiens' }, { code: 'COL', nom: 'Colossiens' },
  { code: '1TH', nom: '1 Thessaloniciens' }, { code: '2TH', nom: '2 Thessaloniciens' }, { code: '1TI', nom: '1 Timothée' },
  { code: '2TI', nom: '2 Timothée' }, { code: 'TIT', nom: 'Tite' }, { code: 'PHM', nom: 'Philémon' },
  { code: 'HEB', nom: 'Hébreux' }, { code: 'JAS', nom: 'Jacques' }, { code: '1PE', nom: '1 Pierre' },
  { code: '2PE', nom: '2 Pierre' }, { code: '1JN', nom: '1 Jean' }, { code: '2JN', nom: '2 Jean' },
  { code: '3JN', nom: '3 Jean' }, { code: 'JUD', nom: 'Jude' }, { code: 'REV', nom: 'Apocalypse' },
]

// ── Barre de mise en forme + insertion de liens (verset ou segment patristique) ──
function BarreMiseEnForme({ onInserer, onEntourer }: {
  onInserer: (texte: string) => void
  onEntourer: (avant: string, apres?: string) => void
}) {
  const [popover, setPopover] = useState<'verset' | 'oeuvre' | null>(null)
  // Lien verset : arborescence livre → chapitre → verset
  const [livre, setLivre] = useState('')
  const [chapitre, setChapitre] = useState('')
  const [verset, setVerset] = useState('')
  // Lien œuvre : arborescence auteur → œuvre → segment
  const [auteurs, setAuteurs] = useState<{ id_auteur: string; nom: string }[]>([])
  const [oeuvres, setOeuvres] = useState<{ id_oeuvre: string; titre: string }[]>([])
  const [auteurChoisi, setAuteurChoisi] = useState('')
  const [oeuvreChoisie, setOeuvreChoisie] = useState('')
  const [segmentNum, setSegmentNum] = useState('')

  const ouvrirPopoverOeuvre = () => {
    setPopover('oeuvre')
    if (auteurs.length === 0) {
      supabase.from('auteurs').select('id_auteur, nom').order('nom').then(({ data }) => setAuteurs(data ?? []))
    }
  }
  const choisirAuteur = (id: string) => {
    setAuteurChoisi(id); setOeuvreChoisie(''); setOeuvres([])
    if (id) supabase.from('oeuvres').select('id_oeuvre, titre').eq('id_auteur', id).order('titre').then(({ data }) => setOeuvres(data ?? []))
  }

  const validerLienVerset = () => {
    if (!livre || !chapitre || !verset) return
    const nom = LIVRES_LIEN.find(l => l.code === livre)?.nom ?? livre
    onInserer(`[${nom} ${chapitre},${verset}](/?livre=${livre}&chapitre=${chapitre}&verset=${verset})`)
    setPopover(null); setLivre(''); setChapitre(''); setVerset('')
  }
  const validerLienOeuvre = () => {
    if (!oeuvreChoisie || !segmentNum) return
    const titre = oeuvres.find(o => o.id_oeuvre === oeuvreChoisie)?.titre ?? oeuvreChoisie
    onInserer(`[${titre}](/oeuvre/${oeuvreChoisie}#s${segmentNum})`)
    setPopover(null); setAuteurChoisi(''); setOeuvreChoisie(''); setSegmentNum('')
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        <button type="button" onClick={() => onEntourer('**')} title="Gras"
          style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '3px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a2520', cursor: 'pointer' }}>G</button>
        <button type="button" onClick={() => onEntourer('*')} title="Italique"
          style={{ fontSize: '10px', fontStyle: 'italic', padding: '3px 8px', borderRadius: '3px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a2520', cursor: 'pointer' }}>I</button>
        <span style={{ width: '1px', background: '#e4dfd8' }} />
        <button type="button" onClick={() => onInserer('\u00A0')} title="Espace insécable"
          style={{ fontSize: '9px', padding: '3px 7px', borderRadius: '3px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a2520', cursor: 'pointer' }}>Esp. ins.</button>
        <button type="button" onClick={() => onInserer('\u202F')} title="Espace fine insécable"
          style={{ fontSize: '9px', padding: '3px 7px', borderRadius: '3px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a2520', cursor: 'pointer' }}>Esp. fine</button>
        <button type="button" onClick={() => onEntourer('«\u202F', '\u202F»')} title="Guillemets français"
          style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '3px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a2520', cursor: 'pointer' }}>« »</button>
        <button type="button" onClick={() => onEntourer('\u201C', '\u201D')} title="Guillemets anglais (citation imbriquée)"
          style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '3px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a2520', cursor: 'pointer' }}>“ ”</button>
        <span style={{ width: '1px', background: '#e4dfd8' }} />
        <button type="button" onClick={() => setPopover(popover === 'verset' ? null : 'verset')} title="Lien vers un verset biblique"
          style={{ fontSize: '9.5px', padding: '3px 8px', borderRadius: '3px', border: '1px solid #d6d0c4', background: popover === 'verset' ? 'rgba(61,107,79,0.10)' : '#fff', cursor: 'pointer', color: '#3d6b4f' }}>+ verset</button>
        <button type="button" onClick={() => popover === 'oeuvre' ? setPopover(null) : ouvrirPopoverOeuvre()} title="Lien vers un passage patristique"
          style={{ fontSize: '9.5px', padding: '3px 8px', borderRadius: '3px', border: '1px solid #d6d0c4', background: popover === 'oeuvre' ? 'rgba(61,107,79,0.10)' : '#fff', cursor: 'pointer', color: '#3d6b4f' }}>+ œuvre</button>
      </div>

      {popover === 'verset' && (
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', padding: '7px 8px', background: '#f0ede7', borderRadius: '5px', marginBottom: '5px', flexWrap: 'wrap' }}>
          <select value={livre} onChange={e => setLivre(e.target.value)} style={{ fontSize: '10px', padding: '3px 5px', borderRadius: '3px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a2520' }}>
            <option value="">Livre…</option>
            {LIVRES_LIEN.map(l => <option key={l.code} value={l.code}>{l.nom}</option>)}
          </select>
          <input type="number" min={1} value={chapitre} onChange={e => setChapitre(e.target.value)} placeholder="ch." style={{ width: '44px', fontSize: '10px', padding: '3px 5px', borderRadius: '3px', border: '1px solid #d6d0c4', color: '#2a2520' }} />
          <input type="number" min={1} value={verset} onChange={e => setVerset(e.target.value)} placeholder="v." style={{ width: '44px', fontSize: '10px', padding: '3px 5px', borderRadius: '3px', border: '1px solid #d6d0c4', color: '#2a2520' }} />
          <button type="button" onClick={validerLienVerset} disabled={!livre || !chapitre || !verset}
            style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '3px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer' }}>Insérer</button>
        </div>
      )}

      {popover === 'oeuvre' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '7px 8px', background: '#f0ede7', borderRadius: '5px', marginBottom: '5px' }}>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            <select value={auteurChoisi} onChange={e => choisirAuteur(e.target.value)} style={{ flex: 1, minWidth: '110px', fontSize: '10px', padding: '3px 5px', borderRadius: '3px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a2520' }}>
              <option value="">Auteur…</option>
              {auteurs.map(a => <option key={a.id_auteur} value={a.id_auteur}>{a.nom}</option>)}
            </select>
            <select value={oeuvreChoisie} onChange={e => setOeuvreChoisie(e.target.value)} disabled={!auteurChoisi} style={{ flex: 1, minWidth: '110px', fontSize: '10px', padding: '3px 5px', borderRadius: '3px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a2520' }}>
              <option value="">Œuvre…</option>
              {oeuvres.map(o => <option key={o.id_oeuvre} value={o.id_oeuvre}>{o.titre}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <input type="number" min={1} value={segmentNum} onChange={e => setSegmentNum(e.target.value)} placeholder="N° de segment" style={{ width: '90px', fontSize: '10px', padding: '3px 5px', borderRadius: '3px', border: '1px solid #d6d0c4', color: '#2a2520' }} />
            <button type="button" onClick={validerLienOeuvre} disabled={!oeuvreChoisie || !segmentNum}
              style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '3px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer' }}>Insérer</button>
          </div>
        </div>
      )}
    </div>
  )
}

function OngletCommentaires({ verset, userId, isAdmin }: { verset: Verset; userId: string | null; isAdmin: boolean }) {
  type Commentaire2 = Commentaire & { user_id: string | null; valide: boolean; reponse_a: number | null; pseudo: string | null; score: number | null; nbLikes: number; nbDislikes: number; monVote: 1 | -1 | null; demande_validation: boolean; supprime: boolean }
  const [commentaires, setCommentaires] = useState<Commentaire2[]>([])
  const [loading, setLoading] = useState(true)
  const [texte, setTexte] = useState('')
  const [nom, setNom] = useState('')
  const [mail, setMail] = useState('')
  const [demandeValidation, setDemandeValidation] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [pseudoMoi, setPseudoMoi] = useState<string | null>(null)
  const [revelees, setRevelees] = useState<Set<number>>(new Set())
  const [cibleReponse, setCibleReponse] = useState<Commentaire2 | null>(null)
  const [commentaireSignale, setCommentaireSignale] = useState<Commentaire2 | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (userId) supabase.from('profils').select('pseudo').eq('id', userId).maybeSingle().then(({ data }) => setPseudoMoi(data?.pseudo ?? null))
    else setPseudoMoi(null)
  }, [userId])

  const charger = () => {
    setLoading(true)
    supabase.from('commentaires').select('id, texte, auteur_nom, created_at, user_id, valide, reponse_a, demande_validation, supprime')
      .eq('id_verset', verset.id_verset)
      .order('created_at', { ascending: true })
      .then(async ({ data }) => {
        const base = data || []
        const ids = base.map(c => c.id)
        const idsUtilisateurs = [...new Set(base.map(c => c.user_id).filter((id): id is string => !!id))]
        const [likesRes, classementRes] = await Promise.all([
          ids.length > 0 ? supabase.from('commentaires_likes').select('id_commentaire, user_id, valeur').in('id_commentaire', ids) : Promise.resolve({ data: [] as any[] }),
          idsUtilisateurs.length > 0 ? supabase.from('classement_utilisateurs').select('user_id, pseudo, score').in('user_id', idsUtilisateurs) : Promise.resolve({ data: [] as any[] }),
        ])
        const classementMap = new Map((classementRes.data ?? []).map((c: any) => [c.user_id, c]))
        const parCommentaire = new Map<number, { likes: number; dislikes: number; mon: 1 | -1 | null }>()
        ;(likesRes.data ?? []).forEach((l: any) => {
          const cur = parCommentaire.get(l.id_commentaire) ?? { likes: 0, dislikes: 0, mon: null }
          if (l.valeur === 1) cur.likes++; else cur.dislikes++
          if (l.user_id === userId) cur.mon = l.valeur
          parCommentaire.set(l.id_commentaire, cur)
        })
        setCommentaires(base.map(c => ({
          ...c,
          pseudo: c.user_id ? classementMap.get(c.user_id)?.pseudo ?? null : null,
          score: c.user_id ? classementMap.get(c.user_id)?.score ?? 0 : null,
          nbLikes: parCommentaire.get(c.id)?.likes ?? 0,
          nbDislikes: parCommentaire.get(c.id)?.dislikes ?? 0,
          monVote: parCommentaire.get(c.id)?.mon ?? null,
        })))
        setLoading(false)
      })
  }

  useEffect(() => { charger() }, [verset.id_verset, userId])

  // Fil structuré : commentaires principaux (chronologique), chacun suivi de
  // ses réponses directes (chronologique aussi) — un seul niveau, pas d'arborescence.
  const principaux = commentaires.filter(c => !c.reponse_a)
  const reponsesDe = (id: number) => commentaires.filter(c => c.reponse_a === id)

  const basculerVote = async (c: { id: number; monVote: 1 | -1 | null }, valeur: 1 | -1) => {
    if (!userId) { alert('Connectez-vous pour réagir à un commentaire.'); return }
    const retire = c.monVote === valeur
    setCommentaires(prev => prev.map(x => {
      if (x.id !== c.id) return x
      let { nbLikes, nbDislikes } = x
      if (x.monVote === 1) nbLikes--
      if (x.monVote === -1) nbDislikes--
      if (!retire) { if (valeur === 1) nbLikes++; else nbDislikes++ }
      return { ...x, nbLikes, nbDislikes, monVote: retire ? null : valeur }
    }))
    if (retire) await supabase.from('commentaires_likes').delete().eq('id_commentaire', c.id).eq('user_id', userId)
    else await supabase.from('commentaires_likes').upsert({ id_commentaire: c.id, user_id: userId, valeur }, { onConflict: 'id_commentaire,user_id' })
  }

  const supprimerCommentaire = async (c: Commentaire2) => {
    if (!confirm('Supprimer définitivement ce commentaire ?')) return
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    const res = await fetch('/api/admin/commentaire-supprimer', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: c.id }),
    })
    if (res.ok) setCommentaires(prev => prev.filter(x => x.id !== c.id && x.reponse_a !== c.id))
  }

  // Suppression par son propre auteur : la ligne reste (fil des réponses
  // préservé), seul le texte est remplacé par une mention grisée.
  const supprimerMonCommentaire = async (c: Commentaire2) => {
    if (!confirm('Supprimer ce commentaire ? Il restera visible en tant que « commentaire supprimé ».')) return
    const { error } = await supabase.from('commentaires').update({ supprime: true }).eq('id', c.id)
    if (!error) setCommentaires(prev => prev.map(x => x.id === c.id ? { ...x, supprime: true } : x))
  }

  const entourer = (avant: string, apres: string = avant) => {
    const ta = taRef.current
    if (!ta) { setTexte(t => t + avant + 'texte' + apres); return }
    const d = ta.selectionStart, f = ta.selectionEnd
    const selection = texte.slice(d, f) || 'texte'
    const nouveau = texte.slice(0, d) + avant + selection + apres + texte.slice(f)
    setTexte(nouveau)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(d + avant.length, d + avant.length + selection.length) }, 0)
  }
  const inserer = (fragment: string) => {
    const ta = taRef.current
    const pos = ta ? ta.selectionStart : texte.length
    setTexte(texte.slice(0, pos) + fragment + texte.slice(pos))
    setTimeout(() => ta?.focus(), 0)
  }

  const mailValide = (m: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)

  const envoyer = async () => {
    setErreur('')
    if (!texte.trim()) { setErreur('Le commentaire est vide.'); return }
    if (REGEX_CAPS_ABUSIVES.test(texte)) { setErreur('Pas plus de cinq lettres capitales à la suite.'); return }
    if (!userId) {
      if (!nom.trim())   { setErreur('Le nom est requis.'); return }
      if (!mailValide(mail)) { setErreur('Adresse e-mail invalide.'); return }
    }
    setEnvoi(true)
    const payload: any = { id_verset: verset.id_verset, texte: texte.trim(), valide: false, reponse_a: cibleReponse?.id ?? null, demande_validation: demandeValidation }
    if (userId) { payload.user_id = userId; payload.auteur_nom = pseudoMoi ?? 'Utilisateur' }
    else { payload.auteur_nom = nom.trim(); payload.auteur_mail = mail.trim() }
    const { data, error } = await supabase.from('commentaires').insert(payload).select().single()
    setEnvoi(false)
    if (!error && data) {
      // Affichage immédiat, sans recharger ni attendre la validation.
      setCommentaires(prev => [...prev, { ...data, pseudo: userId ? pseudoMoi : null, score: null, nbLikes: 0, nbDislikes: 0, monVote: null }])
      setTexte(''); setNom(''); setMail(''); setCibleReponse(null); setDemandeValidation(false)
    } else setErreur(`Erreur : ${error?.message}`)
  }

  const renderCommentaire = (c: Commentaire2, estReponse: boolean) => {
    const cache = !c.valide && !revelees.has(c.id)
    if (cache) {
      return (
        <div key={c.id} style={{ marginLeft: estReponse ? '16px' : 0, marginBottom:'8px' }}>
          <button onClick={() => setRevelees(prev => new Set(prev).add(c.id))}
            style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(176,58,42,0.07)', border:'1px solid rgba(176,58,42,0.22)', borderRadius:'20px', cursor:'pointer', padding:'4px 12px', fontSize:'10px', color:'#b0392b' }}>
            <span>Commentaire non contrôlé</span>
            <span style={{ fontWeight:700, textDecoration:'underline' }}>Afficher</span>
          </button>
        </div>
      )
    }
    const rangInfo = c.score !== null ? calculerRang(c.score) : null
    const couleurs = rangInfo ? couleurRang(rangInfo.rang) : null
    return (
      <div key={c.id} style={{ marginLeft: estReponse ? '16px' : 0, marginBottom:'8px', padding:'7px 9px', background: c.valide ? '#f0ede7' : 'rgba(176,58,42,0.05)', borderTop: estReponse ? '1px solid #e4dfd8' : c.valide ? 'none' : '1px solid rgba(176,58,42,0.18)', borderRight: estReponse ? '1px solid #e4dfd8' : c.valide ? 'none' : '1px solid rgba(176,58,42,0.18)', borderBottom: estReponse ? '1px solid #e4dfd8' : c.valide ? 'none' : '1px solid rgba(176,58,42,0.18)', borderLeft: estReponse ? '2px solid #c8c0b4' : c.valide ? 'none' : '1px solid rgba(176,58,42,0.18)', borderRadius:'5px' }}>
        {c.supprime ? (
          <p style={{ fontSize:'10.5px', color:'#9a958d', fontStyle:'italic', margin:0 }}>
            {c.pseudo ?? c.auteur_nom ?? 'Un utilisateur'} a supprimé un commentaire
          </p>
        ) : (
        <>
        {!c.valide && (
          <p style={{ fontSize:'9px', color:'#b0392b', margin:'0 0 4px', fontWeight:600, letterSpacing:'0.02em' }}>NON CONTRÔLÉ</p>
        )}
        {c.demande_validation && (
          <p style={{ fontSize:'9px', color:'#7a5a9e', margin:'0 0 4px', fontWeight:600, letterSpacing:'0.02em' }}>RÉFÉRENCE SOUMISE À VALIDATION</p>
        )}
        {/* Ligne 1 : pseudo + rang */}
        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
          <span style={{ fontSize:'10px', fontWeight:600, color:'#2a3d30' }}>{c.pseudo ?? c.auteur_nom}</span>
          {couleurs && rangInfo && (
            <span style={{ fontSize:'8px', fontWeight:600, color:couleurs.texte, background:couleurs.fond, padding:'0px 5px', borderRadius:'3px', letterSpacing:'0.02em' }}>
              {rangInfo.rang}
            </span>
          )}
        </div>
        {/* Ligne 2 : texte (gras/italique/liens interprétés, sauts de ligne respectés) */}
        <p style={{ fontSize:'10.5px', lineHeight:'1.5', color: c.valide ? '#2a2520' : '#8a4a40', margin:0, whiteSpace:'pre-line' }}>{rendreTexteEnrichi(c.texte)}</p>
        {/* Ligne 3 : date + votes (négatif puis positif) + actions */}
        <div style={{ display:'flex', alignItems:'center', gap:'7px', marginTop:'4px', flexWrap:'wrap' }}>
          <span style={{ fontSize:'9.5px', color:'#b0a89e' }}>{new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
          <div style={{ display:'flex', alignItems:'center', border:'1px solid #e4dfd8', borderRadius:'4px', overflow:'hidden' }}>
            <button onClick={() => basculerVote(c, -1)} title="Je n'aime pas"
              style={{ display:'flex', alignItems:'center', gap:'4px', color: c.monVote === -1 ? '#9a4a2a' : '#b0a89e', background: c.monVote === -1 ? 'rgba(154,74,42,0.08)' : 'transparent', borderTop:'none', borderBottom:'none', borderLeft:'none', borderRight:'1px solid #e4dfd8', cursor:'pointer', padding:'3px 7px' }}>
              <svg width="10" height="10" viewBox="0 0 20 20" fill="none" style={{ transform:'rotate(180deg)' }} aria-hidden="true">
                <path d="M7 9V17H4.5C3.67 17 3 16.33 3 15.5V10.5C3 9.67 3.67 9 4.5 9H7ZM7 9L10.5 3.5C10.78 3.06 11.32 2.91 11.77 3.15C12.97 3.79 13.5 5.22 12.97 6.47L12 8.75H15.5C16.6 8.75 17.42 9.76 17.18 10.84L16.05 15.84C15.87 16.64 15.16 17.21 14.35 17.21H10C8.9 17.21 7.85 16.83 7 16.18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <span style={{ minWidth:'10px', textAlign:'left', fontWeight:600, fontSize:'9px' }}>{c.nbDislikes}</span>
            </button>
            <button onClick={() => basculerVote(c, 1)} title="J'aime"
              style={{ display:'flex', alignItems:'center', gap:'4px', color: c.monVote === 1 ? '#3d6b4f' : '#b0a89e', background: c.monVote === 1 ? 'rgba(61,107,79,0.08)' : 'transparent', border:'none', cursor:'pointer', padding:'3px 7px' }}>
              <svg width="10" height="10" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M7 9V17H4.5C3.67 17 3 16.33 3 15.5V10.5C3 9.67 3.67 9 4.5 9H7ZM7 9L10.5 3.5C10.78 3.06 11.32 2.91 11.77 3.15C12.97 3.79 13.5 5.22 12.97 6.47L12 8.75H15.5C16.6 8.75 17.42 9.76 17.18 10.84L16.05 15.84C15.87 16.64 15.16 17.21 14.35 17.21H10C8.9 17.21 7.85 16.83 7 16.18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <span style={{ minWidth:'10px', textAlign:'left', fontWeight:600, fontSize:'9px' }}>{c.nbLikes}</span>
            </button>
          </div>
          {!estReponse && (
            <button onClick={() => setCibleReponse(c)}
              style={{ fontSize:'9.5px', color:'#9a958d', background:'none', border:'none', cursor:'pointer', padding:0, marginLeft:'auto' }}>
              Répondre
            </button>
          )}
          <button onClick={() => setCommentaireSignale(c)} title="Signaler ce commentaire"
            style={{ fontSize:'11px', color:'#c8c0b4', background:'none', border:'none', cursor:'pointer', padding:0, marginLeft: estReponse ? 'auto' : 0 }}>
            ⚑
          </button>
          {userId === c.user_id && (
            <button onClick={() => supprimerMonCommentaire(c)} title="Supprimer mon commentaire"
              style={{ fontSize:'10px', color:'#9a958d', background:'none', border:'none', cursor:'pointer', padding:0 }}>
              Supprimer
            </button>
          )}
          {isAdmin && userId !== c.user_id && (
            <button onClick={() => supprimerCommentaire(c)} title="Supprimer ce commentaire"
              style={{ fontSize:'10px', color:'#c0392b', background:'none', border:'none', cursor:'pointer', padding:0 }}>
              Supprimer (admin)
            </button>
          )}
        </div>
        </>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding:'10px 0' }}>
      {loading && <p style={{ fontSize:'10.5px', color:'#9a958d', fontStyle:'italic' }}>Chargement…</p>}
      {!loading && commentaires.length === 0 && (
        <p style={{ fontSize:'10.5px', color:'#b0a89e', fontStyle:'italic', marginBottom:'12px' }}>Aucun commentaire pour ce verset.</p>
      )}
      {principaux.map(c => (
        <div key={c.id}>
          {renderCommentaire(c, false)}
          {reponsesDe(c.id).map(r => renderCommentaire(r, true))}
        </div>
      ))}
      {commentaires.length > 0 && <div style={{ borderTop:'1px solid #ede9e2', marginTop:'4px', paddingTop:'10px' }} />}
      <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
        {userId && pseudoMoi && (
          <p style={{ fontSize:'9.5px', color:'#9a958d', margin:0 }}>Vous commentez en tant que <strong style={{ color:'#3d6b4f' }}>{pseudoMoi}</strong>.</p>
        )}
        {cibleReponse && (
          <div style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(61,107,79,0.07)', border:'1px solid rgba(61,107,79,0.18)', borderRadius:'5px', padding:'5px 8px' }}>
            <span style={{ fontSize:'10px', color:'#3d6b4f' }}>↳ Réponse à <strong>{cibleReponse.pseudo ?? cibleReponse.auteur_nom}</strong></span>
            <button onClick={() => setCibleReponse(null)} style={{ marginLeft:'auto', fontSize:'11px', color:'#9a958d', background:'none', border:'none', cursor:'pointer', padding:0 }}>✕</button>
          </div>
        )}
        <BarreMiseEnForme onEntourer={entourer} onInserer={inserer} />
        <textarea ref={taRef} value={texte} onChange={e => setTexte(e.target.value)} placeholder={cibleReponse ? 'Votre réponse…' : 'Votre commentaire…'} rows={3}
          style={{ width:'100%', fontSize:'10.5px', padding:'5px 7px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#faf8f4', color:'#2a2520', resize:'vertical', outline:'none', boxSizing:'border-box', lineHeight:'1.45' }} />
        {!userId && (
          <>
            <input type="text" value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom *"
              style={{ width:'100%', fontSize:'10px', padding:'4px 7px', borderRadius:'4px', border:`1px solid ${erreur && !nom.trim() ? '#c0392b' : '#d6d0c4'}`, background:'#faf8f4', color:'#2a2520', outline:'none', boxSizing:'border-box' }} />
            <input type="email" value={mail} onChange={e => setMail(e.target.value)} placeholder="Adresse e-mail *"
              style={{ width:'100%', fontSize:'10px', padding:'4px 7px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#faf8f4', color:'#2a2520', outline:'none', boxSizing:'border-box' }} />
            <p style={{ fontSize:'9px', color:'#b0a89e', margin:0 }}>* L'adresse e-mail ne sera pas publiée.</p>
          </>
        )}
        {erreur && <p style={{ fontSize:'9.5px', color:'#c0392b', margin:0 }}>{erreur}</p>}
        <label style={{ display:'flex', alignItems:'flex-start', gap:'6px', fontSize:'9.5px', color:'#6b6560', cursor:'pointer', lineHeight:1.4 }}>
          <input type="checkbox" checked={demandeValidation} onChange={e => setDemandeValidation(e.target.checked)}
            style={{ marginTop:'2px', flexShrink:0, accentColor:'#7a5a9e', cursor:'pointer' }} />
          <span>Soumettre une référence à validation — proposer officiellement ce commentaire pour certification par l'administration.</span>
        </label>
        <button onClick={envoyer} disabled={envoi}
          style={{ alignSelf:'flex-end', fontSize:'10px', padding:'4px 12px', borderRadius:'4px', border:'none', background:'#3d6b4f', color:'#fff', cursor:'pointer', fontWeight:500 }}>
          {envoi ? '…' : 'Envoyer'}
        </button>
      </div>
      {commentaireSignale && (
        <ModalSignalement
          titre={`Commentaire de ${commentaireSignale.pseudo ?? commentaireSignale.auteur_nom} — ${commentaireSignale.texte.slice(0, 60)}…`}
          titreEntete="Signaler"
          onClose={() => setCommentaireSignale(null)}
          onEnvoyer={async (msg) => {
            const { error } = await supabase.from('signalements').insert({ id_segment: null, message: `Commentaire #${commentaireSignale.id} : ${msg}` })
            if (error) throw error
          }}
        />
      )}
    </div>
  )
}

// ── Panneau principal ─────────────────────────────────────────────────────────
export default function PanneauPatristique({
  verset, nomLivre, chapitreActif,
}: {
  verset: Verset | null
  nomLivre: string
  chapitreActif: number
}) {
  type Onglet = 'patristique' | 'commentaires'
  type Filtre = 'tous' | 'citations' | 'doctrine'
  const [onglet, setOnglet] = useState<Onglet>('patristique')
  const [filtre, setFiltre] = useState<Filtre>('tous')
  const [ouvert, setOuvert] = useState(true)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 880) setOuvert(false)
  }, [])

  // Citations = lien_1 (exactes) + lien_2 (libres) fusionnés ; Doctrine = lien_3 ; Écho = lien_4.
  // L'onglet « Patristique » réunit les quatre niveaux ; les filtres permettent de
  // n'afficher que les Citations ou que la Doctrine (l'Écho n'apparaît que dans « Tout »).
  const [segmentsCitations, setSegmentsCitations] = useState<{ seg: Segment; col: string }[]>([])
  const [segmentsDoctrine, setSegmentsDoctrine] = useState<Segment[]>([])
  const [segmentsEcho, setSegmentsEcho] = useState<Segment[]>([])
  const [oeuvres, setOeuvres] = useState<Record<string, OeuvreInfo>>({})
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const isAdminReel = useIsAdmin(userId)
  const { modeUtilisateurStandard } = useAffichageAdmin()
  const isAdmin = isAdminReel && !modeUtilisateurStandard
  const [segSignale, setSegSignale] = useState<Segment | null>(null)

  const ONGLETS: { code: Onglet; label: string }[] = [
    { code: 'patristique',  label: 'Patristique' },
    { code: 'commentaires', label: 'Commentaires' },
  ]

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) =>
      setUserId(data.session?.user.id ?? null)
    )
  }, [])

  // Charger les infos des oeuvres une seule fois
  useEffect(() => {
    supabase.from('oeuvres')
      .select('id_oeuvre, titre, sous_titre, id_auteur, trad_auteur, editeur, collection, ville, date_publication')
      .then(async ({ data: od }) => {
        if (!od) return
        const { data: ad } = await supabase.from('auteurs').select('id_auteur, nom')
        const am: Record<string, string> = {}
        ad?.forEach(a => { am[a.id_auteur] = a.nom })
        const map: Record<string, OeuvreInfo> = {}
        od.forEach(o => {
          map[o.id_oeuvre] = {
            titre: o.titre || o.id_oeuvre,
            sous_titre: o.sous_titre || undefined,
            auteur_nom: am[o.id_auteur] || '',
            trad_auteur: o.trad_auteur || null,
            editeur: o.editeur || null,
            collection: o.collection || undefined,
            ville: o.ville || null,
            date_publication: o.date_publication || null,
          }
        })
        setOeuvres(map)
      })
  }, [])

  // Charger les segments quand le verset change
  useEffect(() => {
    if (!verset) { setSegmentsCitations([]); setSegmentsDoctrine([]); setSegmentsEcho([]); return }
    setLoading(true)

    Promise.all([
      supabase.from('segments').select('*').ilike('lien_1', `%${verset.id_verset}%`),
      supabase.from('segments').select('*').ilike('lien_2', `%${verset.id_verset}%`),
      supabase.from('segments').select('*').ilike('lien_3', `%${verset.id_verset}%`),
      supabase.from('segments').select('*').ilike('lien_4', `%${verset.id_verset}%`),
    ]).then(([r1, r2, r3, r4]) => {
      // Fusionner lien_1 + lien_2, sans doublons, en marquant la colonne d'origine
      const seen = new Set<number>()
      const citations: { seg: Segment; col: string }[] = []
      ;(r1.data ?? []).forEach(s => {
        if (!seen.has(s.id)) { seen.add(s.id); citations.push({ seg: s, col: 'lien_1' }) }
      })
      ;(r2.data ?? []).forEach(s => {
        if (!seen.has(s.id)) { seen.add(s.id); citations.push({ seg: s, col: 'lien_2' }) }
      })
      setSegmentsCitations(citations)
      setSegmentsDoctrine(r3.data ?? [])
      setSegmentsEcho(r4.data ?? [])
      setLoading(false)
    })
  }, [verset])

  const supprimerDeCitations = (id: number) =>
    setSegmentsCitations(prev => prev.filter(({ seg }) => seg.id !== id))
  const supprimerDeDoctrine = (id: number) =>
    setSegmentsDoctrine(prev => prev.filter(s => s.id !== id))
  const supprimerDeEcho = (id: number) =>
    setSegmentsEcho(prev => prev.filter(s => s.id !== id))

  type ItemAffiche = { seg: Segment; col: string; type: 'exacte' | 'libre' | 'doctrine' | 'echo'; onSupprime: (id: number) => void }
  const itemsCitations: ItemAffiche[] = segmentsCitations.map(({ seg, col }) => ({ seg, col, type: (col === 'lien_1' ? 'exacte' : 'libre') as 'exacte' | 'libre', onSupprime: supprimerDeCitations }))
  const itemsDoctrine: ItemAffiche[] = segmentsDoctrine.map(seg => ({ seg, col: 'lien_3', type: 'doctrine' as const, onSupprime: supprimerDeDoctrine }))
  const itemsEcho: ItemAffiche[] = segmentsEcho.map(seg => ({ seg, col: 'lien_4', type: 'echo' as const, onSupprime: supprimerDeEcho }))
  const itemsAffiches: ItemAffiche[] =
    filtre === 'citations' ? itemsCitations :
    filtre === 'doctrine' ? itemsDoctrine :
    [...itemsCitations, ...itemsDoctrine, ...itemsEcho]

  const refFr = verset ? `${nomLivre} ${chapitreActif},${verset.verset}` : null

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} title="Ouvrir les citations patristiques"
        style={{ width: '22px', flexShrink: 0, background: '#faf8f4', borderTop: 'none', borderBottom: 'none', borderRight: 'none', borderLeft: '1px solid #d6d0c4', cursor: 'pointer', color: '#9a958d', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', writingMode: 'vertical-rl' as any, height: '100%' }}>
        ☰
      </button>
    )
  }

  return (
    <div style={{ width:'288px', flexShrink:0, background:'#faf8f4', borderLeft:'1px solid #d6d0c4', display:'flex', flexDirection:'column', height:'100%', minHeight:0 }}>

      {/* En-tête */}
      <div style={{ padding:'10px 14px', borderBottom:'1px solid #d6d0c4', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'6px' }}>
        <h2 style={{ fontSize:'12px', fontWeight:600, color:'#2a3d30', margin:0 }}>Tradition patristique</h2>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
          {refFr && <span style={{ fontSize:'10.5px', color:'#9a958d', fontWeight:500 }}>{refFr}</span>}
          <button onClick={() => setOuvert(false)} title="Fermer ce volet"
            style={{ fontSize:'11px', color:'#b0a89e', background:'none', border:'none', cursor:'pointer', padding:'2px' }}>✕</button>
        </div>
      </div>

      {verset ? (
        <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>

          {/* Onglets */}
          <div style={{ display:'flex', padding:'0 10px', borderBottom:'1px solid #d6d0c4', overflowX:'auto' }}>
            {ONGLETS.map(t => (
              <button key={t.code} onClick={() => setOnglet(t.code)}
                style={{
                  fontSize:'10px', padding:'7px 8px', border:'none',
                  borderBottom: onglet === t.code ? '2px solid #3d6b4f' : '2px solid transparent',
                  cursor:'pointer', background:'transparent',
                  color: onglet === t.code ? '#3d6b4f' : '#6b6560',
                  fontWeight: onglet === t.code ? 600 : 400,
                  whiteSpace:'nowrap', flexShrink:0,
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Contenu */}
          <div style={{ overflowY:'auto', flex:1, padding:'0 12px' }}>
            {onglet === 'commentaires' ? (
              <OngletCommentaires verset={verset} userId={userId} isAdmin={isAdmin} />

            ) : (
              <>
                {/* Filtres rapides */}
                <div style={{ display: 'flex', gap: '5px', padding: '10px 0 8px', flexWrap: 'wrap' }}>
                  {([
                    { code: 'tous' as const, label: 'Tout' },
                    { code: 'citations' as const, label: 'Citations' },
                    { code: 'doctrine' as const, label: 'Doctrine' },
                  ]).map(f => (
                    <button key={f.code} onClick={() => setFiltre(f.code)} style={{
                      fontSize: '10px', padding: '4px 10px', borderRadius: '12px', cursor: 'pointer',
                      border: `1px solid ${filtre === f.code ? '#3d6b4f' : '#d6d0c4'}`,
                      background: filtre === f.code ? 'rgba(61,107,79,0.10)' : '#fff',
                      color: filtre === f.code ? '#3d6b4f' : '#8a8278',
                      fontWeight: filtre === f.code ? 600 : 400,
                    }}>
                      {f.label}
                    </button>
                  ))}
                </div>

                {loading && <p style={{ fontSize:'11px', color:'#9a958d', textAlign:'center', padding:'16px 0' }}>Chargement…</p>}
                {!loading && itemsAffiches.length === 0 && (
                  <p style={{ fontSize:'11px', color:'#9a958d', textAlign:'center', padding:'16px 0', fontStyle:'italic' }}>Aucun lien.</p>
                )}
                {itemsAffiches.map(({ seg, col, type, onSupprime }) => (
                  <SegmentCard
                    key={`${col}-${seg.id}`} s={seg} info={oeuvres[seg.id_oeuvre]}
                    userId={userId} isAdmin={isAdmin}
                    colonneLien={col}
                    typeLien={type}
                    onSignaler={setSegSignale}
                    onSupprimeLien={onSupprime}
                  />
                ))}
              </>
            )}
          </div>

          {segSignale && (
            <ModalSignalement
              titre={`${segSignale.ref_niv1}${segSignale.ref_niv2 ? ' · ' + segSignale.ref_niv2 : ''} — ${segSignale.segment_texte.slice(0, 60)}…`}
              onClose={() => setSegSignale(null)}
              onEnvoyer={async (msg) => {
                const { error } = await supabase.from('signalements').insert({ id_segment: segSignale.id, message: msg })
                if (error) throw error
              }}
            />
          )}
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <p style={{ fontSize:'11.5px', color:'#9a958d', textAlign:'center', padding:'0 20px', fontStyle:'italic' }}>
            Cliquez sur un verset pour voir les textes patristiques associés.
          </p>
        </div>
      )}
    </div>
  )
}