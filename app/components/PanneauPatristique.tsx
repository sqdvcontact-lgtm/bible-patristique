'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from "@/app/lib/supabase"
import { rendreTexteEnrichi, texteSansEnrichissement } from '@/app/oeuvre/[id]/texteEnrichi'
import { parseNotes } from '@/app/lib/notes'
import NoteTooltip from '@/app/lib/NoteTooltip'
import { STYLE_ROMAIN, STYLE_ORDINAL } from '@/app/lib/siecles'
import { calculerRang, couleurRang } from '@/app/lib/classement'
import { useAffichageAdmin } from '@/app/lib/contexteAffichageAdmin'
import EditeurCommentaire from '@/app/components/EditeurCommentaire'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'
import { segmentsLiesAuVerset, segmentsLiesAuChapitre, type TypeLien } from '@/app/lib/liens'
import IconeSignet from '@/app/components/IconeSignet'
import { HAUTEUR_NAVBAR, BANDEAU_NAV_MOBILE } from '@/app/lib/mesures'
import ModalSignalement from '@/app/components/ModalSignalement'

type Verset = { id_verset: string; ref: string; verset: number; chapitre: number }
type Segment = {
  id: number; id_oeuvre: string; segment_numero: number
  segment_texte: string; ref_niv1: string; ref_niv2: string
  ref_niv3: string; notes?: string | null
}
type OeuvreInfo = {
  titre: string; sous_titre?: string; auteur_nom: string; id_auteur?: string
  trad_auteur: string | null; editeur: string | null
  collection?: string; ville: string | null; date_publication: string | null
  genre?: string | null
}
type Commentaire = { id: number; texte: string; auteur_nom: string; created_at: string }

// Rendu du texte d'un segment avec ses appels de note [[N]] : l'appel devient un
// exposant vert discret ; la note s'ouvre en info-bulle élégante (NoteTooltip) —
// même infrastructure que la page Œuvre. Les autres balises (**gras**, *ital*,
// ^^exp^^, liens, siècles) sont rendues comme dans rendreTexteEnrichi.
function rendreTexteAvecNotes(texte: string, notes: Record<string, string>): React.ReactNode {
  const noeuds: React.ReactNode[] = []
  const numeros = new Map<string, number>()
  const numeroDe = (marqueur: string) => {
    if (/^\d+$/.test(marqueur)) return Number(marqueur)
    const connu = numeros.get(marqueur)
    if (connu) return connu
    const n = numeros.size + 1
    numeros.set(marqueur, n)
    return n
  }
  const regex = /\*\*(.+?)\*\*|\^\^(.+?)\^\^|\*(.+?)\*|\[(.+?)\]\((.+?)\)|\[\[([A-Z0-9]+)\]\]|\b([IVXLCDM]+)(e|er|ère|ème|ième)(\s+siècles?)/g
  let dernierIndex = 0, k = 0, m: RegExpExecArray | null
  while ((m = regex.exec(texte))) {
    if (m.index > dernierIndex) noeuds.push(texte.slice(dernierIndex, m.index))
    if (m[1] !== undefined) noeuds.push(<strong key={k++}>{m[1]}</strong>)
    else if (m[2] !== undefined) noeuds.push(<sup key={k++}>{m[2]}</sup>)
    else if (m[3] !== undefined) noeuds.push(<em key={k++}>{m[3]}</em>)
    else if (m[4] !== undefined) noeuds.push(
      <a key={k++} href={m[5]} target="_blank" rel="noopener noreferrer" style={{ color: '#3d6b4f', textDecoration: 'underline' }}>{m[4]}</a>
    )
    else if (m[6] !== undefined) {
      const marqueur = m[6]
      noeuds.push(<NoteTooltip key={k++} lettre={String(numeroDe(marqueur))} el={{ type: 'note', texte: notes[marqueur] ?? '' }} />)
    }
    else if (m[7] !== undefined) {
      noeuds.push(<span key={k++} style={STYLE_ROMAIN}>{m[7]}</span>)
      noeuds.push(<sup key={k++} style={STYLE_ORDINAL}>{m[8]}</sup>)
      noeuds.push(m[9])
    }
    dernierIndex = regex.lastIndex
  }
  if (dernierIndex < texte.length) noeuds.push(texte.slice(dernierIndex))
  return noeuds
}


const ACTION_BTN: React.CSSProperties = {
  background:'none', border:'none', cursor:'pointer', padding:'1px 2px',
  borderRadius:'3px', width:'16px', height:'16px', display:'inline-flex',
  alignItems:'center', justifyContent:'center', fontSize:'0.8475rem',
  lineHeight:1, flexShrink:0, transition:'color 0.15s',
}

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

function siecleEnRomain(n: number): string {
  const r = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV']
  return (r[n - 1] ?? String(n)) + 'e'
}

// Rang chronologique d'un siècle donné en toutes lettres (« IXe siècle »,
// « IVe-Ve siècle ») ou en nombre — pour trier les périodes par ordre chronologique.
function rangSiecle(s: unknown): number {
  const str = String(s).trim()
  const dec = str.match(/^\d+/)
  if (dec) return parseInt(dec[0], 10)
  const m = str.toUpperCase().match(/[IVXLCDM]+/)
  if (!m) return 9999
  const val: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }
  const rn = m[0]
  let n = 0
  for (let i = 0; i < rn.length; i++) {
    const c = val[rn[i]] ?? 0, suiv = val[rn[i + 1]] ?? 0
    n += c < suiv ? -c : c
  }
  return n
}

// Libellé d'un siècle. `auteurs.siecle` est du TEXTE déjà complet (« IXe siècle »,
// « IVe-Ve siècle ») : on le rend tel quel. On ne construit le libellé que si la valeur
// est un simple nombre (évite le doublon « sièclee »).
function labelSiecle(s: unknown): string {
  const str = String(s).trim()
  if (/[a-zà-ÿ]/i.test(str)) return str
  const n = parseInt(str, 10)
  return Number.isFinite(n) ? `${siecleEnRomain(n)} siècle` : str
}

// Rendu typographique d'un libellé de siècle : le chiffre romain en PETITES CAPITALES,
// l'ordinal (« e ») en EXPOSANT, le reste (« siècle », « - », espaces) en romain normal.
// Ex. « IVe-Ve siècle ». Pas de flag insensible à la casse : « siècle » contient i/c/l.
function rendreSiecle(str: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const re = /([IVXLCDM]+)(er|ère|ème|e)?/g
  let last = 0, m: RegExpExecArray | null, k = 0
  while ((m = re.exec(str)) !== null) {
    if (m.index > last) parts.push(str.slice(last, m.index))
    parts.push(<span key={k++} style={{ fontVariant: 'small-caps', letterSpacing: '0.02em' }}>{m[1].toLowerCase()}</span>)
    if (m[2]) parts.push(<sup key={k++} style={{ fontSize: '0.68em' }}>{m[2]}</sup>)
    last = re.lastIndex
  }
  if (last < str.length) parts.push(str.slice(last))
  return parts
}

function construireCitationPatristique(
  texte: string, auteur: string, titre: string,
  sousTitre?: string, tradAuteur?: string | null, editeur?: string | null,
  collection?: string, ville?: string | null, datePublication?: string | null
): string {
  const parts: string[] = []
  if (auteur) parts.push(auteur)
  let titreComplet = titre || ''
  if (sousTitre) titreComplet += '. ' + sousTitre
  if (titreComplet) parts.push(titreComplet)
  if (editeur) parts.push(editeur)
  if (tradAuteur) parts.push('trad. ' + tradAuteur)
  if (collection) parts.push(collection)
  if (ville) parts.push(ville)
  if (datePublication) parts.push(formaterDateHistorique(datePublication))
  parts.push('disponible sur le site Corpus Scriptura')
  return parts.join(', ') + ' : « ' + convertirGuillemetsInternes(texte) + ' »'
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
      style={{ ...ACTION_BTN, color: copie ? '#3d6b4f' : '#c8c0b4' }}>
      {copie ? '✓' : (
        <svg width="11" height="12" viewBox="0 0 11 12" fill="none" aria-hidden="true" style={{ display:'block' }}>
          <path d="M1 9.2V1.8A.8.8 0 0 1 1.8 1H7.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <rect x="3" y="3" width="7" height="8.5" rx=".8" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      )}
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
        style={{ ...ACTION_BTN, color:'#3d6b4f' }}>
        {loading ? '…' : <IconeSignet plein />}
      </button>
    )
  }
  return (
    <button onClick={enregistrer} disabled={loading} title="Enregistrer dans mes prélèvements"
      style={{ ...ACTION_BTN, color:'#c8c0b4' }}>
      {loading ? '…' : <IconeSignet />}
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
        style={{ ...ACTION_BTN, fontSize:'1.13rem', color:'#c8c0b4' }}>
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
        style={{ fontSize:'0.63562rem', padding:'1px 5px', borderRadius:'3px', border:'none', background:'#c0392b', color:'#fff', cursor:'pointer' }}>
        {loading ? '…' : 'Oui'}
      </button>
      <button onClick={e => { e.stopPropagation(); setConfirme(false) }}
        style={{ fontSize:'0.63562rem', padding:'1px 5px', borderRadius:'3px', border:'1px solid #d6d0c4', background:'#fff', color:'#6b6560', cursor:'pointer' }}>
        Non
      </button>
    </span>
  )
}

// ── Modale signalement ────────────────────────────────────────────────────────
// Composant partagé unique (voir app/components/ModalSignalement), importé en tête.

// ── Carte segment ─────────────────────────────────────────────────────────────
function SegmentCard({ s, info, userId, isAdmin, colonneLien, natures, onSignaler, onSupprimeLien }: {
  s: Segment; info?: OeuvreInfo; userId: string | null; isAdmin: boolean
  colonneLien: string
  natures?: string[]
  onSignaler: (s: Segment, titreOeuvre?: string) => void
  onSupprimeLien: (id: number) => void
}) {
  const niveaux = [s.ref_niv1, s.ref_niv2, s.ref_niv3].filter(Boolean).join(', ')
  const LIBELLE_NATURE: Record<string, string> = {
    citation_directe: 'Citation directe', paraphrase: 'Paraphrase',
    commentaire: 'Commentaire', echo: 'Écho thématique',
  }

  return (
    <div style={{ paddingTop:'6px', paddingBottom:'4px', borderBottom:'1px solid #ede9e2' }}>

      {/* Ligne méta : auteur + titre + niveaux (gauche), badge + actions (droite) */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'6px', marginBottom:'8px' }}>
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'4px', marginBottom:'1px' }}>
            {info?.id_auteur ? (
              <a href={`/auteur/${info.id_auteur}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize:'0.77687rem', fontWeight:600, color:'#3d6b4f', lineHeight:1.2, letterSpacing:'0.026em', textDecoration:'none' }}>
                {info.auteur_nom || s.id_oeuvre}
              </a>
            ) : (
              <span style={{ fontSize:'0.77687rem', fontWeight:600, color:'#3d6b4f', lineHeight:1.2, letterSpacing:'0.026em' }}>
                {info?.auteur_nom || s.id_oeuvre}
              </span>
            )}
            <a href={`/oeuvre/${s.id_oeuvre}?segment=${s.id}#segment-${s.id}`} target="_blank" rel="noopener noreferrer"
              title="Accéder au passage exact dans l'œuvre"
              style={{ color:'#b0a89e', textDecoration:'none', flexShrink:0, display:'flex', alignItems:'center' }}>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M4 1.5H8.5V6M8.5 1.5L2 8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
          <a href={`/oeuvre/${s.id_oeuvre}`} target="_blank" rel="noopener noreferrer"
            title={niveaux || undefined}
            style={{ display:'block', fontSize:'0.77687rem', color:'#8a8278', fontStyle:'italic', margin:0, lineHeight:1.2, letterSpacing:'0.02em', textDecoration:'none' }}>
            {info?.titre || ''}
          </a>
          {/* À quel titre ce passage est ici. Discret : la référence et l'auteur
              priment ; la nature du rapport se lit si l'on y prend garde. Un
              passage cité PUIS commenté les porte toutes les deux. */}
          {natures && natures.length > 0 && (
            <span style={{ display:'block', fontSize:'0.67094rem', color:'#b0a89e', letterSpacing:'0.03em', marginTop:'2px' }}>
              {natures.map(n => LIBELLE_NATURE[n] ?? n).join(' · ')}
            </span>
          )}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'4px', alignItems:'flex-end', flexShrink:0 }}>
          <div style={{ display:'flex', gap:'1px', alignItems:'center', justifyContent:'flex-end' }}>
            <BoutonEnregistrerSegment segment={s} info={info} userId={userId} />
            <BoutonCopieSegment
              texte={texteSansEnrichissement(s.segment_texte)} auteur={info?.auteur_nom || s.id_oeuvre} titre={info?.titre || ''}
              trad_auteur={info?.trad_auteur ?? undefined} editeur={info?.editeur ?? undefined}
              collection={info?.collection} ville={info?.ville ?? undefined} date_publication={info?.date_publication ?? undefined}
            />
            <button onClick={e => { e.stopPropagation(); onSignaler(s, info?.titre) }} title="Signaler une erreur"
              style={{ ...ACTION_BTN, color:'#c8c0b4' }}>
              ⚑
            </button>
            <BoutonSupprimerLien
              segmentId={s.id} colonneLien={colonneLien}
              isAdmin={isAdmin} onSupprime={() => onSupprimeLien(s.id)}
            />
          </div>
        </div>
      </div>

      {/* Texte du segment */}
      <p lang="fr" style={{ fontSize:'0.791rem', lineHeight:'1.38', color:'#2a2520', textAlign:'justify', textJustify:'inter-word', margin:'0 0 1px', wordSpacing:'-0.08em', hyphens:'auto', WebkitHyphens:'auto', overflowWrap:'break-word' } as React.CSSProperties}>
        {rendreTexteAvecNotes(s.segment_texte, parseNotes(s.notes))}
      </p>
    </div>
  )
}

// ── Onglet commentaires ───────────────────────────────────────────────────────
// Pas plus de 5 majuscules consécutives (accentuées comprises).
const REGEX_CAPS_ABUSIVES = /[A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]{6,}/

// Groupe de tags de filtre : n'affiche que ~2 lignes ; « Afficher plus » déplie le reste.
// La hauteur de deux lignes est mesurée (position du 1er tag de la 3e ligne) pour un
// repli net, sans demi-ligne.
function GroupeTags({ titre, children }: { titre: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [ouvert, setOuvert] = useState(false)
  const [hauteur2, setHauteur2] = useState<number | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) { return }
    const enfants = Array.from(el.children) as HTMLElement[]
    if (enfants.length === 0) { setHauteur2(null); return }
    const base = enfants[0].offsetTop
    let lignes = 1, dernierTop = enfants[0].offsetTop, h: number | null = null
    for (const c of enfants) {
      if (c.offsetTop > dernierTop + 2) {
        lignes++; dernierTop = c.offsetTop
        if (lignes === 3) { h = c.offsetTop - base; break }
      }
    }
    setHauteur2(h)
  })
  const replie = hauteur2 != null && !ouvert
  return (
    <div style={{ marginTop: '8px' }}>
      <p style={{ fontSize: '0.60031rem', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#9e8e6a', margin: '0 0 4px' }}>{titre}</p>
      <div ref={ref} style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', overflow: 'hidden', maxHeight: replie ? `${hauteur2}px` : undefined }}>
        {children}
      </div>
      {hauteur2 != null && (
        // Collé aux tags, mais distinct : petit lien souligné (pas une pastille).
        <button onClick={() => setOuvert(o => !o)}
          style={{ marginTop: '1px', fontSize: '0.585rem', color: '#3d6b4f', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 2px', fontWeight: 600, fontStyle: 'italic', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
          {ouvert ? 'Afficher moins' : 'Afficher plus'}
        </button>
      )}
    </div>
  )
}

function OngletCommentaires({ verset, userId, isAdmin, onCount }: { verset: Verset; userId: string | null; isAdmin: boolean; onCount?: (n: number) => void }) {
  type Commentaire2 = Commentaire & { user_id: string | null; valide: boolean; reponse_a: number | null; pseudo: string | null; score: number | null; nbLikes: number; nbDislikes: number; monVote: 1 | -1 | null; demande_validation: boolean; certifie?: boolean | null; supprime: boolean }
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

  useEffect(() => {
    if (userId) supabase.from('profils').select('pseudo').eq('id', userId).maybeSingle().then(({ data }) => setPseudoMoi(data?.pseudo ?? null))
    else setPseudoMoi(null)
  }, [userId])

  const charger = () => {
    setLoading(true)
    supabase.from('commentaires').select('id, texte, auteur_nom, created_at, user_id, valide, reponse_a, demande_validation, certifie, supprime')
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

  // Le compteur de l'onglet vit dans le parent (chargé une fois par verset) ; sans
  // ce report, un ajout ou une suppression ne s'y refléterait pas. On remonte le
  // nombre de lignes chargées — même périmètre que le comptage parent (par id_verset).
  // Uniquement une fois le chargement terminé, pour éviter un « 0 » transitoire.
  useEffect(() => { if (!loading) onCount?.(commentaires.length) }, [commentaires, loading, onCount])

  // Fil structuré : commentaires principaux (chronologique), chacun suivi de
  // ses réponses directes (chronologique aussi) — un seul niveau, pas d'arborescence.
  const aDesReponses = (id: number) => commentaires.some(c => c.reponse_a === id)
  const commentaireVisible = (c: Commentaire2) => !c.supprime || !!c.reponse_a || aDesReponses(c.id)
  const trierCommentaires = (liste: Commentaire2[]) => [...liste]
    .filter(commentaireVisible)
    .sort((a, b) => {
      if (a.valide !== b.valide) return a.valide ? -1 : 1
      if (a.valide && b.valide) {
        const scoreA = a.nbLikes - a.nbDislikes
        const scoreB = b.nbLikes - b.nbDislikes
        if (scoreA !== scoreB) return scoreB - scoreA
      }
      return +new Date(a.created_at) - +new Date(b.created_at)
    })
  const principaux = trierCommentaires(commentaires.filter(c => !c.reponse_a))
  const reponsesDe = (id: number) => trierCommentaires(commentaires.filter(c => c.reponse_a === id))
  const dateHeureCommentaire = (date: string) =>
    new Date(date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const setCommentairesAvecTransition = (updater: (prev: Commentaire2[]) => Commentaire2[]) => {
    const doc = document as Document & { startViewTransition?: (callback: () => void) => void }
    if (doc.startViewTransition) doc.startViewTransition(() => setCommentaires(updater))
    else setCommentaires(updater)
  }

  const basculerVote = async (c: { id: number; monVote: 1 | -1 | null }, valeur: 1 | -1) => {
    if (!userId) { alert('Connectez-vous pour réagir à un commentaire.'); return }
    const retire = c.monVote === valeur
    setCommentairesAvecTransition(prev => prev.map(x => {
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

  const mailValide = (m: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)

  const envoyer = async () => {
    setErreur('')
    if (!texte.trim()) { setErreur('Le commentaire est vide.'); return }
    if (REGEX_CAPS_ABUSIVES.test(texte)) { setErreur('Pas plus de cinq lettres capitales à la suite.'); return }
    if (!userId) {
      if (!nom.trim())   { setErreur('Le nom est requis.'); return }
      if (!mailValide(mail)) { setErreur('Adresse e-mail invalide.'); return }
    }
    // Alerte UNIQUEMENT lorsque l'auteur demande à paraître sous son vrai nom (certification) :
    // on l'avertit au moment d'envoyer, et non par un bandeau permanent.
    if (userId && demandeValidation && !window.confirm('Ce commentaire sera soumis pour être publié sous votre vrai nom (commentaire certifié). Continuer ?')) {
      return
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
    const cache = !c.supprime && !c.valide && !revelees.has(c.id)
    if (cache) {
      return (
        <div key={c.id} style={{ marginLeft: estReponse ? '16px' : 0, marginBottom:'8px' }}>
          <button className="commentaire-retracte" onClick={() => setRevelees(prev => new Set(prev).add(c.id))}
            style={{ width:'100%', display:'block', position:'relative', overflow:'hidden', background:'rgba(176,58,42,0.06)', border:'1px solid rgba(176,58,42,0.20)', borderRadius:'6px', cursor:'pointer', padding:'7px 10px', textAlign:'left' }}>
            <span className="commentaire-retracte-contenu" style={{ display:'block', fontSize:'0.70625rem', color:'#b0392b', fontWeight:600 }}>
              Commentaire en attente de contrôle.
            </span>
          </button>
        </div>
      )
    }
    const rangInfo = c.score !== null ? calculerRang(c.score) : null
    const couleurs = rangInfo ? couleurRang(rangInfo.rang) : null
    const estCertifie = !!c.certifie
    const estRevision = !c.valide
    const fondCarte = estCertifie ? 'rgba(61,107,79,0.08)' : estRevision ? 'rgba(176,58,42,0.07)' : '#fff'
    const bordureCarte = estCertifie ? 'rgba(61,107,79,0.28)' : estRevision ? 'rgba(176,58,42,0.26)' : '#e4dfd8'
    const accentCarte = estReponse ? '#c8c0b4' : estCertifie ? '#3d6b4f' : estRevision ? '#b03a2a' : '#d6d0c4'
    const fondTexte = estCertifie ? 'rgba(255,255,255,0.42)' : estRevision ? 'rgba(255,255,255,0.48)' : 'rgba(255,255,255,0.54)'
    const couleurTexte = estRevision ? '#6f3d35' : '#2a2520'
    return (
      <div className="commentaire-carte" key={c.id} style={{ marginLeft: estReponse ? '14px' : 0, marginBottom:'7px', padding:'7px 9px', background: fondCarte, border:'1px solid ' + bordureCarte, borderLeft:'4px solid ' + accentCarte, borderRadius:'6px', viewTransitionName: `commentaire-bible-${c.id}` }}>
        {c.supprime ? (
          <p style={{ fontSize:'0.74156rem', color:'#9a958d', fontStyle:'italic', margin:0 }}>
            {c.pseudo ?? c.auteur_nom ?? 'Un utilisateur'} a supprimé un commentaire
          </p>
        ) : (
        <>
        {/* Ligne 1 : pseudo + rang */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'8px', marginBottom:'4px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', minWidth:0 }}>
            <span style={{ fontSize:'0.70625rem', fontWeight:600, color:'#2a3d30' }}>{c.pseudo ?? c.auteur_nom}</span>
            {couleurs && rangInfo && (
              <span style={{ fontSize:'0.565rem', fontWeight:600, color:couleurs.texte, background:couleurs.fond, padding:'0px 5px', borderRadius:'3px', letterSpacing:'0.02em' }}>
                {rangInfo.rang}
              </span>
            )}
            {estCertifie && <span style={{ fontSize:'0.565rem', fontWeight:700, color:'#2f6a48', background:'rgba(61,107,79,0.14)', padding:'1px 6px', borderRadius:'3px', letterSpacing:'0.04em' }}>CERTIFIÉ</span>}
            {estRevision && <span style={{ fontSize:'0.565rem', fontWeight:700, color:'#b0392b', background:'rgba(176,58,42,0.10)', padding:'1px 6px', borderRadius:'3px', letterSpacing:'0.04em' }}>EN RÉVISION</span>}
          </div>
          <span style={{ marginLeft:'auto', textAlign:'right', fontSize:'0.61444rem', color:'#b0a89e', flexShrink:0 }}>{dateHeureCommentaire(c.created_at)}</span>
        </div>
        {/* Ligne 2 : texte (gras/italique/liens interprétés, sauts de ligne respectés) */}
        <div style={{ fontSize:'0.76275rem', lineHeight:'1.42', color: couleurTexte, margin:0, whiteSpace:'pre-line', background: fondTexte, borderRadius:'4px', padding:'5px 6px' }}>{rendreTexteEnrichi(c.texte)}</div>
        {/* Ligne 3 : date + votes (négatif puis positif) + actions */}
        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'5px', flexWrap:'nowrap', whiteSpace:'nowrap', minWidth:0 }}>
          {/* J'aime EN PREMIER, puis Je n'aime pas ; les deux boutons resserrés. */}
          <div style={{ display:'flex', alignItems:'center', gap:'1px', flexShrink:0 }}>
            <button onClick={() => basculerVote(c, 1)} title="J'aime"
              style={{ display:'flex', alignItems:'center', gap:'2px', color: c.monVote === 1 ? '#3d6b4f' : '#b0a89e', background:'transparent', border:'none', cursor:'pointer', padding:0 }}>
              <svg width="10" height="10" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M7 9V17H4.5C3.67 17 3 16.33 3 15.5V10.5C3 9.67 3.67 9 4.5 9H7ZM7 9L10.5 3.5C10.78 3.06 11.32 2.91 11.77 3.15C12.97 3.79 13.5 5.22 12.97 6.47L12 8.75H15.5C16.6 8.75 17.42 9.76 17.18 10.84L16.05 15.84C15.87 16.64 15.16 17.21 14.35 17.21H10C8.9 17.21 7.85 16.83 7 16.18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <span style={{ minWidth:'10px', textAlign:'left', fontWeight:600, fontSize:'0.63562rem' }}>{c.nbLikes}</span>
            </button>
            <button onClick={() => basculerVote(c, -1)} title="Je n'aime pas"
              style={{ display:'flex', alignItems:'center', gap:'2px', color: c.monVote === -1 ? '#9a4a2a' : '#b0a89e', background:'transparent', border:'none', cursor:'pointer', padding:0 }}>
              <svg width="10" height="10" viewBox="0 0 20 20" fill="none" style={{ transform:'rotate(180deg)' }} aria-hidden="true">
                <path d="M7 9V17H4.5C3.67 17 3 16.33 3 15.5V10.5C3 9.67 3.67 9 4.5 9H7ZM7 9L10.5 3.5C10.78 3.06 11.32 2.91 11.77 3.15C12.97 3.79 13.5 5.22 12.97 6.47L12 8.75H15.5C16.6 8.75 17.42 9.76 17.18 10.84L16.05 15.84C15.87 16.64 15.16 17.21 14.35 17.21H10C8.9 17.21 7.85 16.83 7 16.18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <span style={{ minWidth:'10px', textAlign:'left', fontWeight:600, fontSize:'0.63562rem' }}>{c.nbDislikes}</span>
            </button>
          </div>
          {!estReponse && (
            <button onClick={() => setCibleReponse(c)}
              style={{ fontSize:'0.67094rem', color:'#9a958d', background:'none', border:'none', cursor:'pointer', padding:0, flexShrink:0 }}>
              Répondre
            </button>
          )}
          {userId === c.user_id && (
            <button onClick={() => supprimerMonCommentaire(c)} title="Supprimer mon commentaire"
              style={{ fontSize:'0.70625rem', color:'#9a958d', background:'none', border:'none', cursor:'pointer', padding:0, marginLeft:'auto', flexShrink:0 }}>
              Supprimer
            </button>
          )}
          {isAdmin && userId !== c.user_id && (
            <button onClick={() => supprimerCommentaire(c)} title="Supprimer ce commentaire"
              style={{ fontSize:'0.70625rem', color:'#c0392b', background:'none', border:'none', cursor:'pointer', padding:0, marginLeft:'auto', flexShrink:0 }}>
              Supprimer (admin)
            </button>
          )}
          <button onClick={() => setCommentaireSignale(c)} title="Signaler ce commentaire"
            style={{ fontSize:'0.74156rem', color:'#c8c0b4', background:'none', border:'none', cursor:'pointer', padding:0, marginLeft: userId === c.user_id || (isAdmin && userId !== c.user_id) ? 0 : 'auto', flexShrink:0 }}>
            ⚑
          </button>
        </div>
        </>
        )}
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:0, padding:'10px 0' }}>
      <style>{`
        .commentaire-carte {
          transition: opacity 180ms ease, box-shadow 180ms ease, margin 180ms ease;
        }
        .commentaire-retracte {
          transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
        }
        .commentaire-retracte:hover {
          background: rgba(176,58,42,0.09) !important;
          border-color: rgba(176,58,42,0.30) !important;
          transform: translateX(1px);
        }
        .commentaire-retracte-contenu {
          transition: opacity 150ms ease, transform 150ms ease;
        }
        .commentaire-retracte:hover .commentaire-retracte-contenu {
          opacity: 0.13;
          transform: translateX(-6px);
        }
        .commentaire-retracte::after {
          content: "Lire tout de même  →";
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(176,58,42,0);
          font-size:0.625rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          pointer-events: none;
          transform: translateX(-10px);
          transition: color 160ms ease, transform 160ms ease;
        }
        .commentaire-retracte:hover::after {
          color: rgba(176,58,42,0.82);
          transform: translateX(0);
        }
      `}</style>
      {/* Liste défilante : occupe la place disponible pour que la zone de saisie
          reste épinglée au bas du volet. */}
      <div style={{ flex:1, minHeight:0, overflowY:'auto' }}>
        {loading && <p style={{ fontSize:'0.74156rem', color:'#9a958d', fontStyle:'italic' }}>Chargement…</p>}
        {!loading && commentaires.length === 0 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', marginTop:'26px', marginBottom:'14px' }}>
            {/* Cul-de-lampe d'état vide (carapace de tortue). `multiply` fond le fond
                blanc du dessin dans le papier du panneau. */}
            <img src="/ornements/carapace-vide.png" alt="" aria-hidden="true"
              style={{ width:'min(168px, 58%)', height:'auto', opacity:0.46, mixBlendMode:'multiply', marginBottom:'14px' }} />
            <p style={{ fontSize:'0.74156rem', color:'#b0a89e', fontStyle:'italic', margin:0 }}>Aucun commentaire.</p>
          </div>
        )}
        {principaux.map(c => (
          <div key={c.id}>
            {renderCommentaire(c, false)}
            {reponsesDe(c.id).map(r => renderCommentaire(r, true))}
          </div>
        ))}
      </div>
      <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:'5px', borderTop:'1px solid #ede9e2', marginTop:'4px', paddingTop:'10px' }}>
        {cibleReponse && (
          <div style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(61,107,79,0.07)', border:'1px solid rgba(61,107,79,0.18)', borderRadius:'5px', padding:'5px 8px' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', fontSize:'0.70625rem', color:'#3d6b4f' }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink:0 }}>
                <path d="M7 4 3.5 7.5 7 11M3.5 7.5H10a2.5 2.5 0 0 1 2.5 2.5V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Réponse à <strong>{cibleReponse.pseudo ?? cibleReponse.auteur_nom}</strong>
            </span>
            <button onClick={() => setCibleReponse(null)} style={{ marginLeft:'auto', fontSize:'0.77687rem', color:'#9a958d', background:'none', border:'none', cursor:'pointer', padding:0 }}>✕</button>
          </div>
        )}
        <EditeurCommentaire value={texte} onChange={setTexte} placeholder={cibleReponse ? 'Votre réponse…' : 'Votre commentaire…'} minHeight={62} />
        {!userId && (
          <>
            <input type="text" value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom *"
              style={{ width:'100%', fontSize:'0.70625rem', padding:'4px 7px', borderRadius:'4px', border:`1px solid ${erreur && !nom.trim() ? '#c0392b' : '#d6d0c4'}`, background:'#fff', color:'#2a2520', outline:'none', boxSizing:'border-box' }} />
            <input type="email" value={mail} onChange={e => setMail(e.target.value)} placeholder="Adresse e-mail *"
              style={{ width:'100%', fontSize:'0.70625rem', padding:'4px 7px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#2a2520', outline:'none', boxSizing:'border-box' }} />
            <p style={{ fontSize:'0.63562rem', color:'#b0a89e', margin:0 }}>* L'adresse e-mail ne sera pas publiée.</p>
          </>
        )}
        {erreur && <p style={{ fontSize:'0.67094rem', color:'#c0392b', margin:0 }}>{erreur}</p>}
        <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'0.67094rem', color:'#6b6560', cursor:'pointer', lineHeight:1, height:'16px' }}>
          <input type="checkbox" checked={demandeValidation} onChange={e => setDemandeValidation(e.target.checked)}
            style={{ width:'12px', height:'12px', flexShrink:0, accentColor:'#3d6b4f', cursor:'pointer', margin:0 }} />
          <span title="La certification met le commentaire en avant après validation et le fait remonter dans la liste.">Demander la certification</span>
        </label>
        <button onClick={envoyer} disabled={envoi}
          style={{ alignSelf:'flex-end', fontSize:'0.70625rem', padding:'4px 12px', borderRadius:'4px', border:'none', background:'#3d6b4f', color:'#fff', cursor:'pointer', fontWeight:500 }}>
          {envoi ? '…' : 'Envoyer'}
        </button>
      </div>
      {commentaireSignale && (
        <ModalSignalement
          titre={`Commentaire de ${commentaireSignale.pseudo ?? commentaireSignale.auteur_nom}`}
          texteObjet={commentaireSignale.texte}
          onClose={() => setCommentaireSignale(null)}
          onEnvoyer={async (msg) => {
            const { data } = await supabase.auth.getSession()
            const headers: HeadersInit = { 'Content-Type': 'application/json' }
            const token = data.session?.access_token
            if (token) headers.Authorization = `Bearer ${token}`
            const res = await fetch('/api/signalements', {
              method: 'POST',
              headers,
              body: JSON.stringify({ id_verset: verset.id_verset, message: `Commentaire #${commentaireSignale.id} : ${msg}` }),
            })
            if (!res.ok) {
              const details = await res.json().catch(() => null)
              throw new Error(details?.error ?? "Erreur d'envoi du signalement")
            }
          }}
        />
      )}
    </div>
  )
}

// ── Panneau principal ─────────────────────────────────────────────────────────
export default function PanneauPatristique({
  verset, livreActif, nomLivre, chapitreActif,
  panelWidth = null, onWidthChange, mobile = false,
  voletMobile = null, setVoletMobile, barreMobile = true, presentation = 'drawer',
}: {
  verset: Verset | null
  livreActif: string
  nomLivre: string
  chapitreActif: number
  panelWidth?: number | null
  onWidthChange?: (w: number) => void
  mobile?: boolean
  voletMobile?: 'livres' | 'commentaires' | null
  setVoletMobile?: (v: 'livres' | 'commentaires' | null) => void
  barreMobile?: boolean
  presentation?: 'drawer' | 'inline'
}) {
  type Onglet = 'patristique' | 'commentaires'
  type SousOnglet = 'citations' | 'doctrine' | 'echos'
  const ITEMS_PAR_PAGE = 20
  const [onglet, setOnglet] = useState<Onglet>('patristique')
  const [sousOnglet, setSousOnglet] = useState<SousOnglet>('citations')
  const [pageItems, setPageItems] = useState(0)
  const [ouvertLocal, setOuvertLocal] = useState(true)
  const refPanel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 900) setOuvertLocal(false)
  }, [])
  // Mobile : accordéon piloté par le parent (un seul volet ouvert). Desktop : local.
  const ouvert = mobile ? voletMobile === 'commentaires' : ouvertLocal
  const setOuvert = (v: boolean) => { if (mobile) setVoletMobile?.(v ? 'commentaires' : null); else setOuvertLocal(v) }

  // Citations = lien_1 (exactes) + lien_2 (libres) fusionnés ; Doctrine = lien_3.
  const [segmentsCitations, setSegmentsCitations] = useState<{ seg: Segment; col: string }[]>([])
  const [segmentsDoctrine, setSegmentsDoctrine] = useState<Segment[]>([])
  const [segmentsEcho, setSegmentsEcho] = useState<Segment[]>([])
  const [oeuvres, setOeuvres] = useState<Record<string, OeuvreInfo>>({})
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const isAdminReel = useIsAdmin(userId)
  const { modeUtilisateurStandard } = useAffichageAdmin()
  const isAdmin = isAdminReel && !modeUtilisateurStandard
  const [segSignale, setSegSignale] = useState<{ seg: Segment; titreOeuvre?: string } | null>(null)

  // ── Compteurs onglets ────────────────────────────────────────────────────────
  const [nbCommentairesBible, setNbCommentairesBible] = useState<number | null>(null)
  useEffect(() => {
    if (!verset) { setNbCommentairesBible(null); return }
    supabase.from('commentaires').select('id', { count: 'exact', head: true })
      .eq('id_verset', verset.id_verset)
      .then(({ count }) => setNbCommentairesBible(count ?? 0))
  }, [verset?.id_verset])

  // ── Filtres avancés ──────────────────────────────────────────────────────────
  const [filtreVoletOuvert, setFiltreVoletOuvert] = useState(false)
  const [filtreAuteursIds, setFiltreAuteursIds] = useState<Set<string>>(new Set())
  const [filtreAuteursBlancs, setFiltreAuteursBlancs] = useState<{ id_auteur: string; nom: string }[]>([])
  const [filtreTraditions, setFiltreTraditions] = useState<Set<string>>(new Set())
  const [filtreSiecles, setFiltreSiecles] = useState<Set<number>>(new Set())
  const [filtreGenres, setFiltreGenres] = useState<Set<string>>(new Set())
  const [rechercheAuteur, setRechercheAuteur] = useState('')
  const [resultatsAuteur, setResultatsAuteur] = useState<{ id_auteur: string; nom: string }[]>([])
  const [auteurMeta, setAuteurMeta] = useState<Record<string, { traditions: string[]; siecle: number | null }>>({})

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) =>
      setUserId(data.session?.user.id ?? null)
    )
  }, [])

  // Charger les infos des oeuvres une seule fois
  useEffect(() => {
    supabase.from('oeuvres')
      .select('id_oeuvre, titre, sous_titre, id_auteur, trad_auteur, editeur, collection, ville, date_publication, genre, note')
      .then(async ({ data: od }) => {
        if (!od) return
        const { data: ad } = await supabase.from('auteurs').select('id_auteur, nom, traditions, siecle')
        const am: Record<string, string> = {}
        const meta: Record<string, { traditions: string[]; siecle: number | null }> = {}
        ad?.forEach((a: any) => {
          am[a.id_auteur] = a.nom
          meta[a.id_auteur] = { traditions: a.traditions ?? [], siecle: a.siecle ?? null }
        })
        setAuteurMeta(meta)
        const map: Record<string, OeuvreInfo> = {}
        od.filter(estOeuvrePubliee).forEach(o => {
          map[o.id_oeuvre] = {
            titre: o.titre || o.id_oeuvre,
            sous_titre: o.sous_titre || undefined,
            id_auteur: o.id_auteur || undefined,
            auteur_nom: am[o.id_auteur] || '',
            trad_auteur: o.trad_auteur || null,
            editeur: o.editeur || null,
            collection: o.collection || undefined,
            ville: o.ville || null,
            date_publication: o.date_publication || null,
            genre: o.genre || null,
          }
        })
        setOeuvres(map)
      })
  }, [])

  // Charger les segments : ceux du verset sélectionné, ou — à défaut de sélection —
  // TOUS ceux du chapitre ouvert (le lecteur voit alors d'emblée l'apparat du chapitre).
  useEffect(() => {
    setPageItems(0)
    if (!verset && !livreActif) { setSegmentsCitations([]); setSegmentsDoctrine([]); setSegmentsEcho([]); return }
    setLoading(true)
    let annule = false

    // La recherche inverse passe désormais par `liens_bibliques` : un index sur
    // `canon_id` au lieu de quatre `ilike '%…%'` sur 136 770 lignes — qui, de
    // surcroît, ramenaient GEN.1.10 à GEN.1.19 quand on demandait GEN.1.1.
    const SEG_COLS = 'id, id_oeuvre, segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3, notes'
    ;(async () => {
      const liens = verset
        ? await segmentsLiesAuVerset(verset.id_verset)
        : await segmentsLiesAuChapitre(livreActif, chapitreActif)
      if (annule) return
      // UN SEGMENT PEUT RELEVER DE PLUSIEURS RUBRIQUES À LA FOIS, et il le doit :
      // chez un commentateur, le même passage est cité (type 1) PUIS commenté
      // (type 3) — c'est même le cas ordinaire, et l'arbitrage n°17 rend ce cumul
      // obligatoire. Ne garder qu'un type par segment vidait la rubrique Doctrine
      // de tout un commentaire suivi.
      const typesParSegment = new Map<number, Set<TypeLien>>()
      for (const l of liens) {
        if (!typesParSegment.has(l.segment_id)) typesParSegment.set(l.segment_id, new Set())
        typesParSegment.get(l.segment_id)!.add(l.type)
      }
      const ids = [...typesParSegment.keys()]
      if (!ids.length) {
        setSegmentsCitations([]); setSegmentsDoctrine([]); setSegmentsEcho([]); setLoading(false); return
      }
      const segs: Segment[] = []
      for (let i = 0; i < ids.length; i += 500) {
        const { data } = await supabase.from('segments').select(SEG_COLS).in('id', ids.slice(i, i + 500))
        segs.push(...((data ?? []) as Segment[]))
      }
      if (annule) return
      // Citations = types 1 et 2 réunis, comme auparavant ; doctrine = 3 ; écho = 4.
      // Un même segment peut nourrir plusieurs rubriques.
      const citations: { seg: Segment; col: string }[] = []
      const doctrine: Segment[] = []
      const echo: Segment[] = []
      for (const s of segs) {
        const types = typesParSegment.get(s.id)!
        if (types.has(1)) citations.push({ seg: s, col: 'lien_1' })
        else if (types.has(2)) citations.push({ seg: s, col: 'lien_2' })
        if (types.has(3)) doctrine.push(s)
        if (types.has(4)) echo.push(s)
      }
      setSegmentsCitations(citations)
      setSegmentsDoctrine(doctrine)
      setSegmentsEcho(echo)
      setLoading(false)
    })()
    return () => { annule = true }
  }, [verset, livreActif, chapitreActif])

  // Recherche auteur en direct
  useEffect(() => {
    const q = rechercheAuteur.trim()
    if (!q) { setResultatsAuteur([]); return }
    const t = setTimeout(() => {
      supabase.from('auteurs').select('id_auteur, nom').ilike('nom', `%${q}%`).limit(6)
        .then(({ data }) => setResultatsAuteur((data ?? []).filter((a: any) => !filtreAuteursIds.has(a.id_auteur))))
    }, 200)
    return () => clearTimeout(t)
  }, [rechercheAuteur, filtreAuteursIds])

  const supprimerDeCitations = (id: number) =>
    setSegmentsCitations(prev => prev.filter(({ seg }) => seg.id !== id))
  const supprimerDeDoctrine = (id: number) =>
    setSegmentsDoctrine(prev => prev.filter(s => s.id !== id))
  const supprimerDeEcho = (id: number) =>
    setSegmentsEcho(prev => prev.filter(s => s.id !== id))

  // Quatre natures de lien distinctes : citation directe (type 1), paraphrase (type 2),
  // commentaire (type 3), écho thématique (type 4). La colonne du lien tranche entre les
  // deux premières (lien_1 vs lien_2).
  type Categorie = 'citation_directe' | 'paraphrase' | 'commentaire' | 'echo'
  type ItemAffiche = { seg: Segment; col: string; onSupprime: (id: number) => void; categorie: Categorie; categories: Categorie[] }
  const brut = [
    ...segmentsCitations.map(({ seg, col }) => ({ seg, col, onSupprime: supprimerDeCitations, categorie: (col === 'lien_2' ? 'paraphrase' : 'citation_directe') as Categorie })),
    ...segmentsDoctrine.map(seg => ({ seg, col: 'lien_3', onSupprime: supprimerDeDoctrine, categorie: 'commentaire' as const })),
    ...segmentsEcho.map(seg => ({ seg, col: 'lien_4', onSupprime: supprimerDeEcho, categorie: 'echo' as const })),
  ].filter(({ seg }) => Boolean(oeuvres[seg.id_oeuvre]))
  // Regroupements pour les sous-onglets : « Citations » réunit citation directe et paraphrase.
  const estCitation = (cats: Categorie[]) => cats.includes('citation_directe') || cats.includes('paraphrase')

  // UN SEGMENT NE PARAÎT QU'UNE FOIS. Le même passage est souvent cité puis
  // commenté : il relevait alors de deux rubriques et se lisait deux fois de
  // suite, à l'identique. On le donne une seule fois, en portant toutes les
  // natures du rapport qu'il entretient avec le verset.
  const itemsTous: ItemAffiche[] = (() => {
    const parSegment = new Map<number, ItemAffiche>()
    for (const it of brut) {
      const deja = parSegment.get(it.seg.id)
      if (deja) { if (!deja.categories.includes(it.categorie)) deja.categories.push(it.categorie) }
      else parSegment.set(it.seg.id, { ...it, categories: [it.categorie] })
    }
    return [...parSegment.values()]
  })()

  // Les sous-onglets restent des filtres : un segment cité ET commenté se trouve
  // sous « Citations » comme sous « Doctrine » — c'est attendu, ce n'est pas un
  // doublon puisqu'on ne voit qu'une rubrique à la fois.
  const itemsAffiches: ItemAffiche[] =
    sousOnglet === 'citations' ? itemsTous.filter(i => estCitation(i.categories))
    : sousOnglet === 'doctrine' ? itemsTous.filter(i => i.categories.includes('commentaire'))
    : itemsTous.filter(i => i.categories.includes('echo'))

  // Compteur de l'onglet « Pères de l'Église » : les segments RÉELLEMENT affichables
  // (dédoublonnés, œuvres publiées seulement) qui sont cités OU commentés. Les échos —
  // simples allusions au thème, la plus faible des quatre natures de lien — restent hors
  // du total : ils y pesaient autant qu'une citation formelle et gonflaient le chiffre
  // sans rien annoncer. Leur sous-onglet garde évidemment son propre décompte.
  // Un segment à la fois cité et commenté ne compte toujours qu'une fois.
  const nbPatristique = itemsTous.filter(i => estCitation(i.categories) || i.categories.includes('commentaire')).length
  // Sans verset sélectionné mais avec un chapitre ouvert : mode chapitre (apparat
  // patristique de tout le chapitre). Les commentaires, eux, sont attachés à un
  // verset : leur onglet ne paraît donc qu'avec une sélection.
  const modeChapitre = !verset && !!livreActif
  const ONGLETS: { code: Onglet; label: string; count?: number | null }[] = [
    { code: 'patristique',  label: 'Pères de l\'Église', count: nbPatristique },
    ...(verset ? [{ code: 'commentaires' as Onglet, label: 'Commentaires', count: nbCommentairesBible }] : []),
  ]

  // Reset page when sous-onglet changes
  useEffect(() => { setPageItems(0) }, [sousOnglet])

  // Sans verset (mode chapitre), l'onglet Commentaires n'existe pas : on revient
  // sur « Pères de l'Église » pour ne pas laisser un onglet actif fantôme.
  useEffect(() => { if (!verset) setOnglet('patristique') }, [verset])

  const nombreFiltresActifs = filtreAuteursIds.size + filtreTraditions.size + filtreSiecles.size + filtreGenres.size

  const itemsFiltres = useMemo(() => {
    if (!nombreFiltresActifs) return itemsAffiches
    return itemsAffiches.filter(({ seg }) => {
      const info = oeuvres[seg.id_oeuvre]
      const auteurId = info?.id_auteur
      if (filtreAuteursIds.size > 0 && (!auteurId || !filtreAuteursIds.has(auteurId))) return false
      if (filtreTraditions.size > 0) {
        const meta = auteurId ? auteurMeta[auteurId] : null
        if (!meta?.traditions?.some(t => filtreTraditions.has(t))) return false
      }
      if (filtreSiecles.size > 0) {
        const meta = auteurId ? auteurMeta[auteurId] : null
        if (!meta?.siecle || !filtreSiecles.has(meta.siecle)) return false
      }
      if (filtreGenres.size > 0) {
        const genre = info?.genre
        if (!genre || !filtreGenres.has(genre)) return false
      }
      return true
    })
  }, [itemsAffiches, filtreAuteursIds, filtreTraditions, filtreSiecles, filtreGenres, oeuvres, auteurMeta, nombreFiltresActifs])

  // ── Grisage des tags indisponibles ─────────────────────────────────────────
  // Pour chaque facette (traditions / siècles / genres), on calcule ce qui resterait
  // sélectionnable compte tenu des AUTRES facettes actives — une facette ne se grise
  // jamais d'après sa propre sélection (OR interne : on doit pouvoir en cocher plusieurs).
  const passeSauf = (seg: { id_oeuvre: string }, sauf: 'traditions' | 'siecles' | 'genres') => {
    const info = oeuvres[seg.id_oeuvre]
    const auteurId = info?.id_auteur
    const meta = auteurId ? auteurMeta[auteurId] : null
    if (filtreAuteursIds.size > 0 && (!auteurId || !filtreAuteursIds.has(auteurId))) return false
    if (sauf !== 'traditions' && filtreTraditions.size > 0 && !meta?.traditions?.some(t => filtreTraditions.has(t))) return false
    if (sauf !== 'siecles' && filtreSiecles.size > 0 && (!meta?.siecle || !filtreSiecles.has(meta.siecle))) return false
    if (sauf !== 'genres' && filtreGenres.size > 0 && (!info?.genre || !filtreGenres.has(info.genre))) return false
    return true
  }
  const traditionsActives = useMemo(() => {
    const t = new Set<string>()
    itemsAffiches.forEach(({ seg }) => { if (!passeSauf(seg, 'traditions')) return; const id = oeuvres[seg.id_oeuvre]?.id_auteur; if (id) auteurMeta[id]?.traditions?.forEach(tr => t.add(tr)) })
    return t
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsAffiches, filtreAuteursIds, filtreSiecles, filtreGenres, oeuvres, auteurMeta])
  const sieclesActifs = useMemo(() => {
    const s = new Set<number>()
    itemsAffiches.forEach(({ seg }) => { if (!passeSauf(seg, 'siecles')) return; const id = oeuvres[seg.id_oeuvre]?.id_auteur; const si = id ? auteurMeta[id]?.siecle : null; if (si) s.add(si) })
    return s
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsAffiches, filtreAuteursIds, filtreTraditions, filtreGenres, oeuvres, auteurMeta])
  const genresActifs = useMemo(() => {
    const g = new Set<string>()
    itemsAffiches.forEach(({ seg }) => { if (!passeSauf(seg, 'genres')) return; const genre = oeuvres[seg.id_oeuvre]?.genre; if (genre) g.add(genre) })
    return g
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsAffiches, filtreAuteursIds, filtreTraditions, filtreSiecles, oeuvres])

  const traditionsDisponibles = useMemo(() => {
    const t = new Set<string>()
    itemsAffiches.forEach(({ seg }) => {
      const id = oeuvres[seg.id_oeuvre]?.id_auteur
      if (id) auteurMeta[id]?.traditions?.forEach(tr => t.add(tr))
    })
    return [...t].sort()
  }, [itemsAffiches, oeuvres, auteurMeta])

  const sieclesDisponibles = useMemo(() => {
    const s = new Set<number>()
    itemsAffiches.forEach(({ seg }) => {
      const id = oeuvres[seg.id_oeuvre]?.id_auteur
      const siecle = id ? auteurMeta[id]?.siecle : null
      if (siecle) s.add(siecle)
    })
    return [...s].sort((a, b) => rangSiecle(a) - rangSiecle(b))
  }, [itemsAffiches, oeuvres, auteurMeta])

  const genresDisponibles = useMemo(() => {
    const g = new Set<string>()
    itemsAffiches.forEach(({ seg }) => {
      const genre = oeuvres[seg.id_oeuvre]?.genre
      if (genre) g.add(genre)
    })
    return [...g].sort()
  }, [itemsAffiches, oeuvres])

  // REGROUPEMENTS (affichage seul, la base n'est pas modifiée) : des segments consécutifs de
  // la MÊME œuvre (numéros qui s'enchaînent sans trou) sont réunis en UNE occurrence — un seul
  // paragraphe, à la suite. On regroupe les entrées adjacentes de la liste.
  const itemsGroupes = useMemo(() => {
    const groupes: ItemAffiche[][] = []
    for (const it of itemsFiltres) {
      const g = groupes[groupes.length - 1]
      const prec = g?.[g.length - 1]
      if (prec && prec.seg.id_oeuvre === it.seg.id_oeuvre && it.seg.segment_numero === prec.seg.segment_numero + 1) g.push(it)
      else groupes.push([it])
    }
    return groupes
  }, [itemsFiltres])

  const nbPagesItems = Math.ceil(itemsGroupes.length / ITEMS_PAR_PAGE)
  const pageCouranteItems = Math.min(pageItems, Math.max(nbPagesItems - 1, 0))
  const debutItems = pageCouranteItems * ITEMS_PAR_PAGE
  const finItems = Math.min(debutItems + ITEMS_PAR_PAGE, itemsGroupes.length)
  const itemsPage = itemsGroupes.slice(debutItems, finItems)
  const refFr = verset ? `${nomLivre} ${chapitreActif}, ${verset.verset}`
    : modeChapitre ? `${nomLivre} ${chapitreActif}` : null

  if (!ouvert) {
    // Empilé (mobile) : barre horizontale pleine largeur en bas de la pile.
    if (mobile) {
      // En mode swipe (barreMobile=false), pas de barre fixe : le tiroir monte
      // par glissement (géré dans BibleLayout) ou via l'indice en haut de l'écran.
      if (!barreMobile) return null
      // Barre TOUJOURS visible, fixée en bas de l'écran. Fermée par défaut ;
      // au tap, le tiroir des Pères monte depuis le bas.
      return (
        <button onClick={() => setOuvert(true)} title="Ouvrir les textes patristiques"
          style={{ position: 'fixed', bottom: BANDEAU_NAV_MOBILE, left: 0, right: 0, zIndex: 1200, width: '100%', background: '#faf8f4', border: 'none', borderTop: '1px solid #d6d0c4', boxShadow: '0 -1px 4px rgba(45,35,25,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', padding: '0.6875rem 1rem' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ transform: 'rotate(-90deg)', color: '#9a958d' }}>
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: '#6b6560' }}>Commentaires</span>
        </button>
      )
    }
    return (
      <button onClick={() => setOuvert(true)} title="Ouvrir les textes patristiques"
        style={{ width: '22px', flexShrink: 0, background: '#faf8f4', border: 'none', borderLeft: '1px solid #d6d0c4', cursor: 'pointer', color: '#9a958d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', height: '100%' }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ writingMode: 'vertical-rl' as any, fontSize: '0.565rem', letterSpacing: '0.13em', textTransform: 'uppercase', fontWeight: 600, color: '#b0a89e' }}>Commentaires</span>
      </button>
    )
  }

  const handleDrag = onWidthChange ? (e: React.MouseEvent) => {
    e.preventDefault()
    const startW = panelWidth ?? refPanel.current?.getBoundingClientRect().width ?? 320
    const startX = e.clientX
    const onMove = (ev: MouseEvent) => onWidthChange(Math.max(200, Math.min(560, startW - (ev.clientX - startX))))
    const onUp = () => document.removeEventListener('mousemove', onMove)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp, { once: true })
  } : undefined

  return (
    <>
    {/* Empilé (mobile) : en mode ONGLETS (presentation='inline'), les Pères occupent
        toute la page sous la barre d'onglets, sans fond assombri. En mode tiroir, le
        panneau monte depuis le bas par-dessus le texte, avec un fond assombri. */}
    {mobile && presentation !== 'inline' && <div onClick={() => setOuvert(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.34)', zIndex: 2400 }} />}
    <div ref={refPanel} style={mobile
      ? (presentation === 'inline'
        ? { width:'100%', background:'#fff', display:'flex', flexDirection:'column', paddingTop:'2.875rem', minHeight:`calc(100dvh - ${HAUTEUR_NAVBAR})`, paddingBottom:BANDEAU_NAV_MOBILE }
        : { position:'fixed', bottom:BANDEAU_NAV_MOBILE, left:0, right:0, zIndex:2401, background:'#fff', borderTop:'1px solid #d6d0c4', display:'flex', flexDirection:'column', maxHeight:`calc(100dvh - ${HAUTEUR_NAVBAR} - 2.5rem - ${BANDEAU_NAV_MOBILE})`, minHeight:0, boxShadow:'0 -10px 28px rgba(45,35,25,0.22)' })
      : { width: panelWidth == null ? 'clamp(260px, 20vw, 460px)' : panelWidth + 'px', flexShrink:0, background:'#fff', borderLeft:'1px solid #d6d0c4', display:'flex', flexDirection:'column', height:'100%', minHeight:0, position:'relative' }}>
      {/* Tag de filtre : un fantôme en gras (::after) fige la largeur, pour que la
          sélection (texte mis en gras) ne repousse pas les tags voisins. */}
      <style>{`
        .pp-tag { display: inline-grid; align-items: center; justify-items: center; }
        .pp-tag > span { grid-area: 1 / 1; }
        .pp-tag::after { content: attr(data-label); grid-area: 1 / 1; font-weight: 600; visibility: hidden; white-space: nowrap; }
      `}</style>
      {!mobile && handleDrag && (
        <div onMouseDown={handleDrag} title="Glisser pour redimensionner"
          style={{ position:'absolute', left:'-4px', top:0, bottom:0, width:'9px', cursor:'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%235f574b%27 stroke-width=%271.7%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M8 7L3 12l5 5%27/%3E%3Cpath d=%27M3 12h18%27/%3E%3Cpath d=%27M16 7l5 5-5 5%27/%3E%3C/svg%3E") 12 12, ew-resize', zIndex:10,
            background:'transparent', transition:'background 0.14s, box-shadow 0.14s' }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(198,184,158,0.08)'
            e.currentTarget.style.boxShadow = 'inset 1px 0 rgba(122,96,64,0.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      )}

      {/* En-tête */}
      <div style={{ position:'relative', borderBottom:'1px solid #d6d0c4', minHeight:'38px', display:'flex', alignItems:'center', justifyContent:'center', padding:'6px 36px' }}>
        {/* Flèche « réduire » inutile en mode onglets (mobile) ; gardée pour desktop. */}
        {presentation !== 'inline' && (
          <button onClick={() => setOuvert(false)} title="Réduire le volet"
            style={{ position:'absolute', left:'8px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', padding:'3px', color:'#b0a89e', display:'flex', alignItems:'center' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        {refFr && (
          <h2 style={{ fontFamily:"var(--font-source-serif), Georgia, serif", fontSize:'0.91812rem', fontWeight:500, color:'#2a3d30', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', textAlign:'center' }}>
            {refFr}
          </h2>
        )}
      </div>

      {verset || modeChapitre ? (
        <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>

          {/* Onglets pleine largeur */}
          <div style={{ display:'flex', borderBottom:'1px solid #d6d0c4' }}>
            {ONGLETS.map(t => (
              <button key={t.code} onClick={() => setOnglet(t.code)}
                style={{
                  flex:1, padding:'8px 6px 7px', border:'none',
                  borderBottom: onglet === t.code ? '2px solid #3d6b4f' : '2px solid transparent',
                  cursor:'pointer',
                  background: onglet === t.code ? 'rgba(61,107,79,0.04)' : 'transparent',
                  color: onglet === t.code ? '#2a3d30' : '#8a8278',
                  fontFamily: 'var(--font-source-sans), Arial, sans-serif',
                  transition:'color 0.12s, background 0.12s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                }}>
                {/* Le libellé réserve deux lignes et se cale EN BAS de sa boîte : « Commentaires »
                    (une ligne) et « Pères de l'Église » (deux lignes) gardent ainsi leur compteur au
                    même niveau, et le groupe libellé + compteur est centré verticalement par le bouton. */}
                <span style={{ fontSize:'0.67094rem', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight: onglet === t.code ? 600 : 400, minHeight: '2.3em', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', textAlign: 'center', lineHeight: 1.15 }}>{t.label}</span>
                {t.count != null && t.count > 0 && (
                  <span style={{ fontSize: '0.63562rem', color: onglet === t.code ? '#3d6b4f' : '#b0a89e', fontWeight: 500, lineHeight: 1 }}>{t.count}</span>
                )}
                {t.count != null && t.count === 0 && !loading && (
                  <span style={{ fontSize: '0.60031rem', color: '#c0b8b0', fontStyle: 'italic', lineHeight: 1 }}>Aucune occurrence</span>
                )}
              </button>
            ))}
          </div>

          {/* Contenu scrollable (sauf onglet commentaires : la liste défile en interne
              pour épingler la saisie au bas du volet). */}
          <div style={onglet === 'commentaires' && verset
            ? { flex:1, minHeight:0, overflow:'hidden', padding:'0 12px', display:'flex', flexDirection:'column' }
            : { overflowY:'auto', flex:1, padding:'0 12px' }}>
            {onglet === 'commentaires' && verset ? (
              <OngletCommentaires verset={verset} userId={userId} isAdmin={isAdmin} onCount={setNbCommentairesBible} />
            ) : (
              <>
                {/* Sous-onglets Citations / Doctrine / Échos */}
                {(() => {
                  const nbCitations = itemsTous.filter(i => estCitation(i.categories)).length
                  const nbDoctrine = itemsTous.filter(i => i.categories.includes('commentaire')).length
                  const nbEchos = itemsTous.filter(i => i.categories.includes('echo')).length
                  const subTabs: [SousOnglet, string, number][] = [
                    ['citations', 'Citations', nbCitations],
                    ['doctrine', 'Commentaires', nbDoctrine],
                    ['echos', 'Échos', nbEchos],
                  ]
                  return (
                    <div style={{ display: 'flex', borderBottom: '1px solid #ede9e2', margin: '6px -12px 0', padding: '0 12px' }}>
                      {subTabs.map(([key, label, nb], idx) => (
                        <button key={key} onClick={() => setSousOnglet(key)}
                          style={{
                            flex: 1, background: 'none', border: 'none',
                            borderBottom: sousOnglet === key ? '2px solid #3d6b4f' : '2px solid transparent',
                            padding: '5px 2px 4px', cursor: 'pointer',
                            color: sousOnglet === key ? '#3d6b4f' : '#9a958d',
                            fontSize: '0.63562rem', fontWeight: sousOnglet === key ? 600 : 400,
                            letterSpacing: '0.04em', lineHeight: 1.2,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px',
                          }}>
                          <span>{label}</span>
                          {nb > 0 && <span style={{ fontSize: '0.565rem', color: sousOnglet === key ? '#3d6b4f' : '#c0b8ae' }}>{nb}</span>}
                        </button>
                      ))}
                    </div>
                  )
                })()}

                {/* Bouton filtres */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0 0' }}>
                  <button onClick={() => setFiltreVoletOuvert(o => !o)} style={{
                    position: 'relative',
                    display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: '4px',
                    fontSize: '0.67094rem', padding: '5px 9px', borderRadius: '7px', cursor: 'pointer',
                    border: `1px solid ${filtreVoletOuvert || nombreFiltresActifs > 0 ? '#3d6b4f' : '#d6d0c4'}`,
                    background: filtreVoletOuvert || nombreFiltresActifs > 0 ? 'rgba(61,107,79,0.10)' : '#fff',
                    color: filtreVoletOuvert || nombreFiltresActifs > 0 ? '#3d6b4f' : '#8a8278',
                    fontWeight: 500,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M2 4h10M4 7h6M6 10h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    Filtres
                    {/* Badge en ABSOLU : « Filtres » reste centré, la barre ne s'élargit pas. */}
                    {nombreFiltresActifs > 0 && (
                      <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: '#3d6b4f', color: '#fff', borderRadius: '8px', fontSize: '0.565rem', padding: '0 4px', lineHeight: '14px', fontWeight: 700 }}>
                        {nombreFiltresActifs}
                      </span>
                    )}
                  </button>
                </div>

                {/* Volet filtres dépliant */}
                {filtreVoletOuvert && (
                  <div style={{ margin: '6px 0 2px', padding: '8px 10px', background: '#f0ebe1', border: '1px solid #d3c9b4', borderRadius: '7px' }}>

                    {/* Recherche auteur */}
                    <p style={{ fontSize: '0.60031rem', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#9e8e6a', margin: '0 0 5px' }}>Auteurs</p>
                    <div style={{ position: 'relative', marginBottom: resultatsAuteur.length ? '0' : '4px' }}>
                      <input
                        type="text"
                        value={rechercheAuteur}
                        onChange={e => setRechercheAuteur(e.target.value)}
                        placeholder="Chercher un auteur…"
                        style={{ width: '100%', fontSize: '0.74156rem', padding: '4px 7px', borderRadius: '4px', border: '1px solid #cfc4ae', background: '#fdf9f4', color: '#2a3d30', boxSizing: 'border-box', outline: 'none' }}
                      />
                      {resultatsAuteur.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fdf9f4', border: '1px solid #cfc4ae', borderTop: 'none', borderRadius: '0 0 4px 4px', zIndex: 20, boxShadow: '0 4px 10px rgba(176,160,136,0.18)' }}>
                          {resultatsAuteur.map(a => (
                            <button key={a.id_auteur} onClick={() => {
                              setFiltreAuteursIds(prev => new Set([...prev, a.id_auteur]))
                              setFiltreAuteursBlancs(prev => prev.find(x => x.id_auteur === a.id_auteur) ? prev : [...prev, a])
                              setRechercheAuteur('')
                              setResultatsAuteur([])
                              setPageItems(0)
                            }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '5px 8px', fontSize: '0.74156rem', color: '#2a3d30', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(61,107,79,0.07)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                              {a.nom}
                              <span style={{ fontSize: '0.8475rem', color: '#3d6b4f', lineHeight: 1 }}>+</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {filtreAuteursBlancs.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '5px' }}>
                        {filtreAuteursBlancs.map(a => (
                          <span key={a.id_auteur} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.63562rem', padding: '1px 5px 1px 7px', background: 'rgba(61,107,79,0.12)', color: '#2a5a38', borderRadius: '9px', fontWeight: 500 }}>
                            {a.nom}
                            <button onClick={() => {
                              setFiltreAuteursIds(prev => { const n = new Set(prev); n.delete(a.id_auteur); return n })
                              setFiltreAuteursBlancs(prev => prev.filter(x => x.id_auteur !== a.id_auteur))
                              setPageItems(0)
                            }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#3d6b4f', fontSize: '0.77687rem', lineHeight: 1, display: 'flex', alignItems: 'center' }}>×</button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Traditions */}
                    {(traditionsDisponibles.some(t => !filtreTraditions.has(t)) || filtreTraditions.size > 0) && (
                      <GroupeTags titre="Tradition">
                        {/* Liste stable : chaque tag bascule sur place (aucune croix, aucun
                            réagencement). Sélectionné = vert ; indisponible sous le tri = grisé.
                            Le poids du texte va sur le <span> ; la largeur reste figée (pp-tag). */}
                        {traditionsDisponibles.map(t => {
                          const sel = filtreTraditions.has(t)
                          const dispo = sel || traditionsActives.has(t)
                          return (
                            <button key={t} className="pp-tag" data-label={t} disabled={!dispo}
                              onClick={() => { setFiltreTraditions(prev => { const n = new Set(prev); if (n.has(t)) n.delete(t); else n.add(t); return n }); setPageItems(0) }}
                              style={{
                                fontSize: '0.63562rem', padding: '2px 7px', borderRadius: '9px', cursor: dispo ? 'pointer' : 'default',
                                border: `1px solid ${sel ? '#3d6b4f' : dispo ? '#cfc4ae' : '#e6e0d4'}`,
                                background: sel ? 'rgba(61,107,79,0.14)' : dispo ? 'rgba(255,255,255,0.6)' : 'transparent',
                                color: sel ? '#2a5a38' : dispo ? '#6b5f4a' : '#c4bcae',
                              }}>
                              <span style={{ fontWeight: sel ? 600 : 400 }}>{t}</span>
                            </button>
                          )
                        })}
                      </GroupeTags>
                    )}

                    {/* Genre */}
                    {(genresDisponibles.some(g => !filtreGenres.has(g)) || filtreGenres.size > 0) && (
                      <GroupeTags titre="Genre">
                        {genresDisponibles.map(g => {
                          const sel = filtreGenres.has(g)
                          const dispo = sel || genresActifs.has(g)
                          return (
                            <button key={g} className="pp-tag" data-label={g} disabled={!dispo}
                              onClick={() => { setFiltreGenres(prev => { const n = new Set(prev); if (n.has(g)) n.delete(g); else n.add(g); return n }); setPageItems(0) }}
                              style={{
                                fontSize: '0.63562rem', padding: '2px 7px', borderRadius: '9px', cursor: dispo ? 'pointer' : 'default',
                                border: `1px solid ${sel ? '#3d6b4f' : dispo ? '#cfc4ae' : '#e6e0d4'}`,
                                background: sel ? 'rgba(61,107,79,0.14)' : dispo ? 'rgba(255,255,255,0.6)' : 'transparent',
                                color: sel ? '#2a5a38' : dispo ? '#6b5f4a' : '#c4bcae',
                              }}>
                              <span style={{ fontWeight: sel ? 600 : 400 }}>{g}</span>
                            </button>
                          )
                        })}
                      </GroupeTags>
                    )}

                    {/* Période (siècles) — déjà triés par ordre chronologique croissant. */}
                    {(sieclesDisponibles.some(s => !filtreSiecles.has(s)) || filtreSiecles.size > 0) && (
                      <GroupeTags titre="Période">
                        {sieclesDisponibles.map(s => {
                          const sel = filtreSiecles.has(s)
                          const dispo = sel || sieclesActifs.has(s)
                          const lbl = labelSiecle(s)
                          return (
                            <button key={s} className="pp-tag" data-label={lbl} disabled={!dispo}
                              onClick={() => { setFiltreSiecles(prev => { const n = new Set(prev); if (n.has(s)) n.delete(s); else n.add(s); return n }); setPageItems(0) }}
                              style={{
                                fontSize: '0.63562rem', padding: '2px 7px', borderRadius: '9px', cursor: dispo ? 'pointer' : 'default',
                                border: `1px solid ${sel ? '#9a7e3d' : dispo ? '#cfc4ae' : '#e6e0d4'}`,
                                background: sel ? 'rgba(154,126,61,0.16)' : dispo ? 'rgba(255,255,255,0.6)' : 'transparent',
                                color: sel ? '#7a5e1a' : dispo ? '#6b5f4a' : '#c4bcae',
                              }}>
                              <span style={{ fontWeight: sel ? 600 : 400 }}>{rendreSiecle(lbl)}</span>
                            </button>
                          )
                        })}
                      </GroupeTags>
                    )}

                    {/* Tout effacer */}
                    {nombreFiltresActifs > 0 && (
                      <button onClick={() => {
                        setFiltreAuteursIds(new Set()); setFiltreAuteursBlancs([])
                        setFiltreTraditions(new Set()); setFiltreSiecles(new Set()); setFiltreGenres(new Set())
                        setPageItems(0)
                      }} style={{ marginTop: '8px', fontSize: '0.63562rem', color: '#c0562a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                        Tout effacer
                      </button>
                    )}
                  </div>
                )}

                {loading && <p style={{ fontSize:'0.77687rem', color:'#9a958d', textAlign:'center', padding:'16px 0' }}>Chargement…</p>}
                {!loading && itemsFiltres.length === 0 && itemsAffiches.length === 0 && (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', marginTop:'26px', marginBottom:'14px' }}>
                    {/* Même cul-de-lampe d'état vide que l'onglet Commentaires (carapace). */}
                    <img src="/ornements/carapace-vide.png" alt="" aria-hidden="true"
                      style={{ width:'min(168px, 58%)', height:'auto', opacity:0.46, mixBlendMode:'multiply', marginBottom:'14px' }} />
                    <p style={{ fontSize:'0.77687rem', color:'#9a958d', fontStyle:'italic', margin:0 }}>Aucune occurrence.</p>
                  </div>
                )}
                {!loading && itemsFiltres.length === 0 && itemsAffiches.length > 0 && (
                  <p style={{ fontSize:'0.77687rem', color:'#9a958d', textAlign:'center', padding:'12px 0', fontStyle:'italic' }}>Aucun résultat pour ces filtres.</p>
                )}
                <div style={{ marginTop: '6px' }}>
                {itemsPage.map(groupe => {
                  const premier = groupe[0]
                  // Occurrence réunie : les textes des segments consécutifs mis à la suite en un
                  // seul paragraphe ; natures cumulées. Métadonnées et liens = premier segment.
                  const segFusionne = groupe.length === 1
                    ? premier.seg
                    : { ...premier.seg, segment_texte: groupe.map(g => g.seg.segment_texte).join(' '), notes: groupe.map(g => g.seg.notes).filter(Boolean).join('\n') || null }
                  const naturesUnion = Array.from(new Set(groupe.flatMap(g => g.categories)))
                  return (
                    <SegmentCard
                      key={groupe.map(g => g.seg.id).join('_')} s={segFusionne} info={oeuvres[premier.seg.id_oeuvre]}
                      userId={userId} isAdmin={isAdmin}
                      colonneLien={premier.col} natures={naturesUnion}
                      onSignaler={(s, titreOeuvre) => setSegSignale({ seg: s, titreOeuvre })} onSupprimeLien={premier.onSupprime}
                    />
                  )
                })}
                </div>
              </>
            )}
          </div>

          {/* Pagination — fixée en pied de panneau, hors zone scrollable */}
          {onglet !== 'commentaires' && !loading && nbPagesItems > 1 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'4px', padding:'8px 0 10px', borderTop:'1px solid #e4dfd8', background:'#fff', flexShrink:0 }}>
              <button onClick={() => setPageItems(Math.max(pageCouranteItems - 1, 0))} disabled={pageCouranteItems === 0}
                title="Page précédente"
                style={{ fontSize:'1.27125rem', lineHeight:1, padding:'0 6px', border:'none', background:'none', color: pageCouranteItems === 0 ? '#c8c0b4' : '#6b6560', cursor: pageCouranteItems === 0 ? 'default' : 'pointer' }}>
                ‹
              </button>
              <span style={{ fontSize:'0.67094rem', color:'#9a958d', whiteSpace:'nowrap', padding:'0 2px' }}>
                {debutItems + 1}–{finItems} / {itemsGroupes.length}{nombreFiltresActifs > 0 ? ` (${itemsAffiches.length})` : ''}
              </span>
              <button onClick={() => setPageItems(Math.min(pageCouranteItems + 1, nbPagesItems - 1))} disabled={pageCouranteItems >= nbPagesItems - 1}
                title="Page suivante"
                style={{ fontSize:'1.27125rem', lineHeight:1, padding:'0 6px', border:'none', background:'none', color: pageCouranteItems >= nbPagesItems - 1 ? '#c8c0b4' : '#6b6560', cursor: pageCouranteItems >= nbPagesItems - 1 ? 'default' : 'pointer' }}>
                ›
              </button>
            </div>
          )}

          {segSignale && (
            <ModalSignalement
              titre={segSignale.titreOeuvre}
              texteObjet={segSignale.seg.segment_texte}
              avecNiveauImportance
              onClose={() => setSegSignale(null)}
              onEnvoyer={async (msg, importance) => {
                const { data } = await supabase.auth.getSession()
                const headers: HeadersInit = { 'Content-Type': 'application/json' }
                const token = data.session?.access_token
                if (token) headers.Authorization = `Bearer ${token}`
                const res = await fetch('/api/signalements', {
                  method: 'POST', headers,
                  body: JSON.stringify({ id_segment: segSignale.seg.id, message: msg, importance: importance ?? undefined, url_source: window.location.href }),
                })
                if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error ?? "Erreur d'envoi") }
              }}
            />
          )}
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', padding:'48px 24px 0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%', marginBottom:'22px' }}>
            <div style={{ flex:1, height:'1px', background:'linear-gradient(to right, transparent, #d6d0c4)' }} />
            <span style={{ fontSize:'0.63562rem', color:'#c8c0b4', letterSpacing:'0.2em', flexShrink:0 }}>· · ·</span>
            <div style={{ flex:1, height:'1px', background:'linear-gradient(to left, transparent, #d6d0c4)' }} />
          </div>
          <div style={{ textAlign:'center', marginBottom:'14px' }}>
            <span style={{ fontFamily:"var(--font-source-serif), Georgia, serif", fontSize:'1.55375rem', color:'#c8c0b4', lineHeight:1 }}>❧</span>
          </div>
          <div style={{ fontFamily:"var(--font-source-serif), Georgia, serif", fontSize:'0.8475rem', fontStyle:'italic', color:'#9a958d', lineHeight:1.85, textAlign:'center' }}>
            {[
              ['Cliquez sur un verset pour voir', '220px'],
              ['les textes des Pères', '155px'],
              ['de l\'Église', '100px'],
              ['associés.', '76px'],
            ].map(([line, width], i) => (
              <p key={i} style={{ maxWidth: width, margin: '0 auto' }}>{line}</p>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%', marginTop:'22px' }}>
            <div style={{ flex:1, height:'1px', background:'linear-gradient(to right, transparent, #d6d0c4)' }} />
            <span style={{ fontSize:'0.63562rem', color:'#c8c0b4', letterSpacing:'0.2em', flexShrink:0 }}>· · ·</span>
            <div style={{ flex:1, height:'1px', background:'linear-gradient(to left, transparent, #d6d0c4)' }} />
          </div>
        </div>
      )}
    </div>
    </>
  )
}


