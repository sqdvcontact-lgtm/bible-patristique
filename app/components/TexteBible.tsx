'use client'
import { ABREV_FR } from '@/app/lib/bible'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from "@/app/lib/supabase"
import { useAffichageAdmin } from "@/app/lib/contexteAffichageAdmin"
import { useCompte } from "@/app/lib/contexteCompte"
import { citationBiblique } from "@/app/lib/citation"
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'


import IconeSignet from '@/app/components/IconeSignet'
import IconeCrayon from '@/app/components/IconeCrayon'
import IconeDrapeau from '@/app/components/IconeDrapeau'
import ModalSignalement from '@/app/components/ModalSignalement'
import { BANDEAU_NAV_MOBILE } from '@/app/lib/mesures'
import { type Couche899 } from '@/app/lib/bible899'
import { rendreMarqueurs899 } from '@/app/lib/marqueurs899'

const VERSET_ACTION_BTN: React.CSSProperties = {
  background:'none', border:'none', cursor:'pointer', padding:'1px 2px',
  borderRadius:'3px', width:'18px', height:'18px', display:'inline-flex',
  alignItems:'center', justifyContent:'center', fontSize:'0.85rem',
  lineHeight:1, flexShrink:0, transition:'color 0.15s',
}


type Verset = {
  id_verset: string; ref: string; livre: string
  chapitre: number; verset: number
  chapitre_alternatif?: number | null; verset_alternatif?: number | null
  // TR0009 (Bible 899) : marqueurs de l'adaptateur (ligne recomposée, lacune du manuscrit).
  _est899?: boolean; _estLacune?: boolean
  [traduction: string]: string | number | boolean | null | undefined
}

type Traduction = { code: string; label: string }

type Props = {
  versets: Verset[]
  traduction: string
  traductionIndex: number
  setTraductionIndex: (i: number) => void
  traductions: Traduction[]
  livreActif: string
  chapitreActif: number
  nomLivre: string
  versetSelectionne: Verset | null
  setVersetSelectionne: (v: Verset | null) => void
  mobile?: boolean
  couche?: Couche899
  couchesDisponibles?: Couche899[]
}

// ── Bouton copie ──────────────────────────────────────────────────────────────
function BoutonCopie({ texte }: { texte: string }) {
  const [copie, setCopie] = useState(false)
  const handle = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(texte).then(() => {
      setCopie(true); setTimeout(() => setCopie(false), 1400)
    })
  }
  return (
    <button onClick={handle} title="Copier ce verset" className="bouton-action-verset"
      style={{ ...VERSET_ACTION_BTN, opacity:0, color: copie ? 'var(--cs-vert)' : 'var(--cs-bord)' }}
      aria-label="Copier">
      {copie ? '✓' : (
        <svg width="11" height="12" viewBox="0 0 11 12" fill="none" aria-hidden="true" style={{ display:'block' }}>
          <path d="M1 9.2V1.8A.8.8 0 0 1 1.8 1H7.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <rect x="3" y="3" width="7" height="8.5" rx=".8" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      )}
    </button>
  )
}

// ── Modale signalement ────────────────────────────────────────────────────────
// Composant partagé unique (voir app/components/ModalSignalement), importé en tête.

// « GEN 1:1 » (référence canonique interne) → « Gn 1, 1 » (forme française attendue partout
// sur le site : abréviation française, virgule entre chapitre et verset).
function refFrBible(ref: string): string {
  const p = ref.trim().split(' ')
  if (p.length < 2) return ref
  const cv = p[1].split(':')
  const abr = ABREV_FR[p[0]] ?? p[0]
  return cv[1] ? `${abr} ${cv[0]}, ${cv[1]}` : `${abr} ${cv[0]}`
}

function BoutonSignaler({ versetId, versetRef, texte }: { versetId: string; versetRef?: string; texte?: string }) {
  const [ouvert, setOuvert] = useState(false)
  const { exigerCompte } = useCompte()
  const envoyer = async (msg: string, importance?: string) => {
    const { data } = await supabase.auth.getSession()
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    const token = data.session?.access_token
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch('/api/signalements', {
      method: 'POST',
      headers,
      body: JSON.stringify({ id_verset: versetId, message: msg, importance, url_source: window.location.href }),
    })
    if (!res.ok) {
      const details = await res.json().catch(() => null)
      throw new Error(details?.error ?? "Erreur d'envoi du signalement")
    }
  }
  const ref = versetRef ? refFrBible(versetRef) : versetId
  return (
    <>
      <button onClick={e => { e.stopPropagation(); if (exigerCompte('signaler une erreur')) setOuvert(true) }}
        className="bouton-action-verset"
        title="Signaler une erreur"
        style={{ ...VERSET_ACTION_BTN, opacity:0, color:'var(--cs-bord)' }}>
        <IconeDrapeau />
      </button>
      {ouvert && <ModalSignalement titre={ref} texteObjet={texte} avecNiveauImportance onClose={() => setOuvert(false)} onEnvoyer={envoyer} />}
    </>
  )
}

// ── Bouton enregistrer ────────────────────────────────────────────────────────
// Filet reliant le signet de prélèvement à la fin de la phrase. Il est MESURÉ : sa
// longueur va du dernier mot de la ligne qui fait face au signet jusqu'au signet lui-même.
// Pour un verset court, dont la ligne s'arrête loin du bord, le trait est long ; pour une
// ligne pleine, il se réduit au petit espace de marge. Très fin et très pâle, il ne fait
// que guider l'œil. Remesuré à chaque reflux du texte (redimensionnement, changement de
// traduction) via un ResizeObserver.
function FiletSignet({ signal }: { signal: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const p = el.closest('.verset-row')?.querySelector('[data-verse-text]') as HTMLElement | null
    if (!p) return
    const mesurer = () => {
      // Rectangle de la LIGNE qui fait face au signet : la première ligne du verset
      // (le signet est calé en haut). Son bord droit = fin de cette ligne.
      const range = document.createRange()
      range.selectNodeContents(p)
      const rects = range.getClientRects()
      if (!rects.length) { el.style.width = '0px'; return }
      const finLigne = rects[0].right
      // Le bord droit du filet est ancré au signet (right:100%) : sa position ne dépend
      // pas de la largeur, on peut donc la lire pour caler la longueur.
      const ancreDroite = el.getBoundingClientRect().right
      const distance = Math.max(0, ancreDroite - finLigne)
      // Pas de filet quand le texte arrive déjà près du signet : en deçà de ce seuil,
      // le trait ne guiderait rien et n'ajouterait qu'un parasite. Il n'apparaît que
      // lorsque le verset est court et que le signet reste seul, loin dans la marge.
      const SEUIL = 34
      el.style.width = distance < SEUIL ? '0px' : `${distance}px`
    }
    // Au changement de traduction, le texte est remplacé : on remesure APRÈS le reflux
    // (rAF), sans quoi l'ancienne longueur subsiste et le filet chevauche le nouveau texte,
    // souvent plus long. Double rAF pour laisser la mise en page se stabiliser.
    let raf1 = 0, raf2 = 0
    const remesurer = () => { raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(mesurer) }) }
    mesurer()
    remesurer()
    // Le ResizeObserver sur `p` couvre déjà les reflux du texte, y compris ceux
    // provoqués par un redimensionnement de la fenêtre (la mesure de ligne change) :
    // pas besoin d'un listener `resize` global en plus (un par verset prélevé).
    const ro = new ResizeObserver(mesurer)
    ro.observe(p)
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); ro.disconnect() }
  }, [signal])
  return (
    <span ref={ref} aria-hidden style={{
      position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)',
      width: '0px', height: '1px', marginRight: '5px',
      // Filet volontairement ténu : palissant vers le texte, il ne fait qu'effleurer
      // l'œil. Encore aminci de 30 % (0.16 → 0.112, 0.10 → 0.07), adouci près du signet,
      // pour rester élégant plutôt que d'afficher une barre franche.
      background: 'linear-gradient(to left, rgba(var(--cs-vert-rgb),0.112), rgba(var(--cs-vert-rgb),0.07) 55%, rgba(var(--cs-vert-rgb),0))',
      pointerEvents: 'none',
    }} />
  )
}

function BoutonEnregistrer({
  verset, nomLivre, livreActif, chapitreActif, traduction, userId,
  traductionLabel, dejaSauvegarde, idPrelevement, onSauvegarde, onSupprimer,
}: {
  verset: Verset; nomLivre: string; livreActif: string
  chapitreActif: number; traduction: string; userId: string
  traductionLabel: string
  dejaSauvegarde: boolean; idPrelevement: string | null
  onSauvegarde: (id: string) => void; onSupprimer: () => void
}) {
  const [loading, setLoading] = useState(false)
  const { exigerCompte } = useCompte()

  if (dejaSauvegarde) {
    const supprimer = async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!idPrelevement) return
      setLoading(true)
      await supabase.from('prelevements').delete().eq('id', idPrelevement)
      setLoading(false)
      onSupprimer()
    }
    return (
      /* Le verset prélevé garde son signet visible sans survol. Les autres
         actions n'apparaissent qu'au passage de la souris parce qu'elles
         PROPOSENT quelque chose ; celle-ci CONSTATE un état, et un état
         qu'il faut survoler pour connaître ne se voit jamais.
         Un fin filet vert part du signet vers le texte : quand le signet est
         loin dans la marge (verset court), ce trait dégradé — franc près du
         signet, effacé du côté du texte — permet de retrouver d'un coup d'œil
         le verset auquel il se rapporte, sans jamais barrer les mots. */
      <span style={{ position:'relative', display:'inline-flex', alignItems:'center' }}>
        <FiletSignet signal={String(verset[traduction] ?? '')} />
        <button onClick={supprimer} disabled={loading}
          title="Retirer des prélèvements" className="bouton-action-verset"
          style={{ ...VERSET_ACTION_BTN, opacity:1, color:'var(--cs-vert)' }}
          aria-label="Retirer des prélèvements">
          {loading ? '…' : <IconeSignet plein />}
        </button>
      </span>
    )
  }

  const enregistrer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!exigerCompte('prélever ce verset')) return
    setLoading(true)
    const texte = String(verset[traduction] ?? '')
    const abr = ABREV_FR[livreActif] || livreActif
    const { data, error } = await supabase.from('prelevements').insert({
      user_id: userId, type: 'biblique',
      ref_livre: nomLivre, ref_livre_abr: abr,
      ref_chapitre: chapitreActif, ref_verset: verset.verset,
      texte, traduction: traductionLabel,
    }).select('id').single()
    setLoading(false)
    if (!error && data) onSauvegarde(data.id)
  }

  return (
    <button onClick={enregistrer} disabled={loading} title="Enregistrer dans mes prélèvements"
      className="bouton-action-verset"
      style={{ ...VERSET_ACTION_BTN, opacity:0, color:'var(--cs-bord)' }}
      aria-label="Enregistrer">
      {loading ? '…' : <IconeSignet />}
    </button>
  )
}

// Conversions markup ↔ HTML pour la zone éditable WYSIWYG du verset. Le markup est
// EXACTEMENT celui que lit `rendreTexteEnrichi` : **gras**, *ital*, ^^exp^^, ++petites
// capitales++, [texte](url). L'italique `<i>` de Sacy est chargé comme italique éditable
// et ré-émis en `*…*` (rendu identique), pour que les balises produites correspondent
// toujours au système d'affichage.
function versetMarkupVersHtml(s: string): string {
  const esc = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc
    .replace(/&lt;i&gt;([\s\S]*?)&lt;\/i&gt;/g, '<em>$1</em>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\+\+(.+?)\+\+/g, '<span style="font-variant:small-caps;letter-spacing:0.04em">$1</span>')
    .replace(/\^\^(.+?)\^\^/g, '<sup>$1</sup>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
}

function versetHtmlVersMarkup(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  const rendre = (n: Node): string => {
    if (n.nodeType === Node.TEXT_NODE) return n.textContent ?? ''
    const el = n as HTMLElement
    const tag = el.tagName?.toLowerCase()
    if (tag === 'br') return '\n'
    const enfants = Array.from(el.childNodes).map(rendre).join('')
    if (tag === 'strong' || tag === 'b') return `**${enfants}**`
    if (tag === 'sup') return `^^${enfants}^^`
    if (tag === 'span' && el.style.fontVariant === 'small-caps') return `++${enfants}++`
    if (tag === 'em' || tag === 'i') return `*${enfants}*`
    if (tag === 'a') return `[${enfants}](${el.getAttribute('href') ?? ''})`
    return enfants
  }
  return Array.from(div.childNodes).map(rendre).join('').replace(/\n{2,}/g, '\n').trim()
}

// ── Composant principal ───────────────────────────────────────────────────────
// ── Modale d'édition d'un verset (admin réel, vérifié côté serveur) ──────────
function ModaleEditionVerset({ verset, traduction, traductionLabel, refCourt, valeurActuelle, onClose, onEnregistre }: {
  verset: Verset; traduction: string; traductionLabel: string; refCourt: string; valeurActuelle: string
  onClose: () => void; onEnregistre: (nouvelleValeur: string) => void
}) {
  const [valeur, setValeur] = useState(valeurActuelle)
  const [statut, setStatut] = useState<'idle' | 'envoi' | 'erreur'>('idle')
  const edRef = useRef<HTMLDivElement>(null)

  // La zone éditable est peuplée UNE fois avec le texte rendu : les enrichissements y
  // sont directement visibles (WYSIWYG), dans la même et unique zone de saisie.
  useEffect(() => {
    if (edRef.current) edRef.current.innerHTML = versetMarkupVersHtml(valeurActuelle)
    setTimeout(() => edRef.current?.focus(), 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // À chaque frappe : on relit le HTML de la zone et on le reconvertit dans le markup
  // stocké (celui que lit l'affichage), pour que les balises correspondent toujours.
  const sync = () => { if (edRef.current) setValeur(versetHtmlVersMarkup(edRef.current.innerHTML)) }

  const commande = (cmd: string) => { edRef.current?.focus(); document.execCommand(cmd); sync() }
  const inserer = (t: string) => { edRef.current?.focus(); document.execCommand('insertText', false, t); sync() }
  const entourer = (avant: string, apres: string = avant) => {
    edRef.current?.focus()
    const texte = window.getSelection()?.toString() || 'texte'
    document.execCommand('insertText', false, `${avant}${texte}${apres}`)
    sync()
  }
  // Petites capitales : span dédié inséré autour de la sélection (pas de commande native).
  const petitesCaps = () => {
    const el = edRef.current; if (!el) return; el.focus()
    const sel = window.getSelection(); if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const texte = sel.toString() || 'texte'
    range.deleteContents()
    const span = document.createElement('span')
    span.style.fontVariant = 'small-caps'; span.style.letterSpacing = '0.04em'; span.textContent = texte
    range.insertNode(span); sel.collapseToEnd(); sync()
  }

  const enregistrer = async () => {
    setStatut('envoi')
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    const res = await fetch('/api/admin/verset-modifier-canon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id_verset: verset.id_verset, traduction, valeur }),
    })
    if (!res.ok) { setStatut('erreur'); return }
    onEnregistre(valeur)
  }

  const btnEd: React.CSSProperties = { fontSize:'0.6875rem', padding:'4px 9px', borderRadius:'4px', border:'1px solid var(--cs-bord)', background:'var(--cs-surface)', color:'var(--cs-texte-fort)', cursor:'pointer' }
  const gardeSel = (e: React.MouseEvent) => e.preventDefault()

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--cs-surface)', borderRadius:'8px', padding:'20px 22px', width:'30rem', maxWidth:'100%', boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
          <p style={{ fontSize:'0.75rem', fontWeight:600, color:'#9a5a2a', margin:0 }}>
            Modifier {refCourt} de la {traductionLabel}
          </p>
          <button onClick={onClose} style={{ fontSize:'0.875rem', color:'var(--cs-texte-faible)', background:'none', border:'none', cursor:'pointer', padding:0, lineHeight:1 }}>✕</button>
        </div>
        <div style={{ display:'flex', gap:'6px', marginBottom:'8px', flexWrap:'wrap' }}>
          <button onMouseDown={gardeSel} onClick={() => commande('bold')} style={{ ...btnEd, fontWeight:700 }}>G</button>
          <button onMouseDown={gardeSel} onClick={() => commande('italic')} style={{ ...btnEd, fontStyle:'italic' }}>I</button>
          <button onMouseDown={gardeSel} onClick={petitesCaps} title="Petites capitales" style={{ ...btnEd, fontSize:'0.625rem', fontVariant:'small-caps', letterSpacing:'0.04em' }}>Petites capitales</button>
          <button onMouseDown={gardeSel} onClick={() => commande('superscript')} title="Exposant" style={btnEd}>x²</button>
          <span style={{ width:'1px', background:'var(--cs-bord-clair)' }} />
          <button onClick={() => inserer('\u00A0')} title="Espace insécable" style={{ fontSize:'0.625rem', padding:'4px 9px', borderRadius:'4px', border:'1px solid var(--cs-bord)', background:'var(--cs-surface)', color:'var(--cs-texte-fort)', cursor:'pointer' }}>Esp. insécable</button>
          <button onClick={() => inserer('\u202F')} title="Espace fine insécable" style={{ fontSize:'0.625rem', padding:'4px 9px', borderRadius:'4px', border:'1px solid var(--cs-bord)', background:'var(--cs-surface)', color:'var(--cs-texte-fort)', cursor:'pointer' }}>Esp. fine</button>
          <button onClick={() => entourer('«\u202F', '\u202F»')} title="Guillemets français" style={{ fontSize:'0.6875rem', padding:'4px 9px', borderRadius:'4px', border:'1px solid var(--cs-bord)', background:'var(--cs-surface)', color:'var(--cs-texte-fort)', cursor:'pointer' }}>« »</button>
          <button onClick={() => entourer('\u201C', '\u201D')} title="Guillemets anglais (citation imbriquée)" style={{ fontSize:'0.6875rem', padding:'4px 9px', borderRadius:'4px', border:'1px solid var(--cs-bord)', background:'var(--cs-surface)', color:'var(--cs-texte-fort)', cursor:'pointer' }}>“ ”</button>
        </div>
        {/* Zone d'édition UNIQUE : les enrichissements s'y voient directement (WYSIWYG). */}
        <div ref={edRef} contentEditable suppressContentEditableWarning onInput={sync}
          style={{ width:'100%', minHeight:'96px', maxHeight:'300px', overflowY:'auto', fontSize:'0.8125rem', padding:'8px 10px', border:'1px solid var(--cs-bord)', borderRadius:'5px', background:'var(--cs-fond-clair)', color:'var(--cs-texte-fort)', outline:'none', lineHeight:1.55, boxSizing:'border-box', textAlign:'justify', whiteSpace:'pre-wrap' }} />
        <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'12px' }}>
          {statut === 'erreur' && <span style={{ fontSize:'0.6875rem', color:'var(--cs-danger)', alignSelf:'center' }}>Erreur d'enregistrement.</span>}
          <button onClick={onClose} style={{ fontSize:'0.6875rem', padding:'5px 14px', borderRadius:'4px', border:'1px solid var(--cs-bord)', background:'var(--cs-surface)', color:'var(--cs-texte-second)', cursor:'pointer' }}>Annuler</button>
          <button onClick={enregistrer} disabled={statut === 'envoi'} style={{ fontSize:'0.6875rem', padding:'5px 16px', borderRadius:'4px', border:'none', background:'var(--cs-vert)', color:'#fff', cursor:'pointer', fontWeight:500 }}>
            {statut === 'envoi' ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TexteBible({
  versets, traduction, traductionIndex, setTraductionIndex, traductions,
  livreActif, chapitreActif, nomLivre,
  versetSelectionne, setVersetSelectionne, mobile = false,
  couche, couchesDisponibles
}: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [estAdmin, setEstAdmin] = useState(false)
  const [editionCible, setEditionCible] = useState<Verset | null>(null)
  const [overrides, setOverrides] = useState<Record<string, Partial<Record<string, string>>>>({})
  const [sauvegardes, setSauvegardes] = useState<Map<number, string>>(new Map())
  const [tradOuverte, setTradOuverte] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const { modeUtilisateurStandard } = useAffichageAdmin()

  // Mobile : les boutons d'action encombreraient la marge droite d'un écran
  // étroit. On les masque, et un simple tap sur le verset fait surgir un pavé
  // flottant. `actionsMobileId` = verset dont les actions sont visibles.
  const [actionsMobileId, setActionsMobileId] = useState<string | null>(null)

  useEffect(() => {
    const versetCible = searchParams.get('verset')
    if (!versetCible) return
    const num = parseInt(versetCible)
    const v = versets.find(v => v.verset === num)
    if (v) setVersetSelectionne(v)
    const el = document.getElementById(`verset-${versetCible}`)
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 200)
    }
  }, [searchParams, versets])

  useEffect(() => {
    const chargerProfil = (uid: string) => {
      chargerSauvegardes(uid)
      supabase.from('profils').select('est_admin').eq('id', uid).maybeSingle().then(({ data }) => setEstAdmin(data?.est_admin === true))
    }
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null
      setUserId(uid)
      if (uid) chargerProfil(uid)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user.id ?? null
      setUserId(uid)
      if (uid) chargerProfil(uid)
      else { setSauvegardes(new Map()); setEstAdmin(false) }
    })
    return () => listener.subscription.unsubscribe()
  }, [livreActif, chapitreActif])

  const chargerSauvegardes = async (uid: string) => {
    const abr = ABREV_FR[livreActif] || livreActif
    const { data } = await supabase
      .from('prelevements')
      .select('id, ref_verset')
      .eq('user_id', uid)
      .eq('type', 'biblique')
      .eq('ref_livre_abr', abr)
      .eq('ref_chapitre', chapitreActif)
    const m = new Map<number, string>()
    ;(data ?? []).forEach((r: any) => m.set(r.ref_verset, r.id))
    setSauvegardes(m)
  }

  const marquerSauvegarde = (numVerset: number, id: string) => {
    setSauvegardes(prev => new Map([...prev, [numVerset, id]]))
  }

  const retirerSauvegarde = (numVerset: number) => {
    setSauvegardes(prev => { const n = new Map(prev); n.delete(numVerset); return n })
  }

  const traductionActive = traductions[traductionIndex]
  const tradCode = traductionActive?.code ?? 'TR0001'
  const traductionLabel = traductionActive?.label ?? tradCode

  // Changement de chapitre en navigation douce : on ne recharge pas toute la page,
  // le composant reçoit simplement les nouveaux versets et les volets latéraux (état
  // client : largeurs, verset sélectionné) restent en place.
  const allerAuChapitre = (n: number) => router.push(`/?livre=${livreActif}&chapitre=${n}&trad=${tradCode}`)

  // TR0009 (Bible 899) : une ligne « 899 » est marquée par l'adaptateur (`_est899`). Le
  // contrôle « Graphie » n'apparaît QUE si la couche « modernized » est disponible
  // (piloté par les données) ; le changement se fait par rechargement serveur.
  const coucheActive: Couche899 = couche ?? 'expanded'
  const graphieModerniseeDispo = (couchesDisponibles ?? []).includes('modernized')
  const estLigne899 = (v: Verset) => v._est899 === true
  const estLacune899 = (v: Verset) => v._estLacune === true
  // Chapitre entièrement absent du témoin (ex. 1 Samuel 1 dans la Bible 899) : au lieu
  // d'aligner autant de « [Lacune du manuscrit] » que de versets attendus, on donne UNE
  // mention de chapitre. On ne le fait qu'en contexte 899 (toutes les lignes en sont) et
  // seulement si au moins une ligne existe.
  const chapitreToutLacune = versets.length > 0 && versets.every(v => estLigne899(v) && estLacune899(v))
  const changerGraphie = (c: Couche899) => router.push(`/?livre=${livreActif}&chapitre=${chapitreActif}&trad=${tradCode}&mode=verse&couche=${c}`)

  return (
    <div className={mobile ? 'flex flex-col' : 'flex-1 flex flex-col h-full overflow-hidden'} style={{ background: 'var(--cs-fond)', ...(mobile ? { width: '100%', paddingTop: '2.875rem', paddingBottom: `calc(0.75rem + ${BANDEAU_NAV_MOBILE})` } : {}) }}>

      {/* En-tête */}
      <div style={{ borderBottom: '1px solid var(--cs-bord)', background: 'var(--cs-fond)', padding: '14px 32px 10px' }}>

        {/* Titre + navigation chapitres. Calé sur LE MÊME gabarit que les versets
            (bloc de texte de 500 px + colonne d'actions de 38 px) : le titre est centré
            sur la seule première colonne — donc sur le bloc vert de sélection —, la colonne
            des boutons (signaler, prélever…) étant exclue du centrage. */}
        <div style={{ width: mobile ? '100%' : 'min(var(--mesure-ligne), 100%)', margin: '0 auto', display: mobile ? 'block' : 'grid', gridTemplateColumns: 'minmax(0, var(--mesure-bloc)) 2.375rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
          {chapitreActif > 1 ? (
            <button onClick={() => allerAuChapitre(chapitreActif - 1)} className="nav-chap-arrow" style={{ color: 'var(--cs-texte-faible)', fontSize: '1.25rem', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.15s' }} title="Chapitre précédent">‹</button>
          ) : (
            <span style={{ color: 'var(--cs-bord)', fontSize: '1.25rem', lineHeight: 1 }}>‹</span>
          )}

          <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontWeight: 'normal', margin: 0, display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontSize: '1.25rem', color: 'var(--cs-encre-fonce)', letterSpacing: '0.01em' }}>{nomLivre}</span>
            <span style={{ color: '#b0a088', fontSize: '1.25rem', lineHeight: 1 }}>❧</span>
            <span style={{ fontSize: '1.05rem', color: '#5a7260', fontStyle: 'italic' }}>Chapitre {chapitreActif}</span>
          </h1>

          <button onClick={() => allerAuChapitre(chapitreActif + 1)} className="nav-chap-arrow" style={{ color: 'var(--cs-texte-faible)', fontSize: '1.25rem', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.15s' }} title="Chapitre suivant">›</button>
        </div>
          <div />
        </div>

        {/* Séparateur fin + choix de traduction : petits filets de part et d'autre.
            Calé sur LE MÊME gabarit que le titre « Genèse ❧ Chapitre 1 » (bloc texte
            de 500 px + colonne d'actions de 38 px exclue du centrage), pour que le menu
            se centre sur le même axe que le titre, et non sur la pleine largeur. */}
        <div style={{ width: mobile ? '100%' : 'min(var(--mesure-ligne), 100%)', margin: '0.5rem auto 0', display: mobile ? 'block' : 'grid', gridTemplateColumns: 'minmax(0, var(--mesure-bloc)) 2.375rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '22.5rem', margin: '0 auto' }}>
          {/* Double filet à gauche : deux traits fins superposés, bien visibles, comme autrefois.
              Le trait est coloré dès le tiers extérieur (et non seulement au ras du menu) pour
              rester perceptible même sur une faible largeur. */}
          <div style={{ flex: 1, minWidth: '46px', height: '1px', background: 'linear-gradient(to right, transparent 0%, #c3b7a0 38%, #a4977f 100%)' }} />
          <div style={{ position: 'relative' }}>
            <button onClick={() => setTradOuverte(!tradOuverte)} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '0', border: 'none', background: 'transparent',
              fontSize: '0.71875rem', color: '#6b8270', cursor: 'pointer',
              fontFamily: "var(--font-source-serif), Georgia, serif",
              fontStyle: 'italic', letterSpacing: '0.01em',
              transition: 'color 0.15s',
            }}>
              <span>{traductionLabel}</span>
              <span style={{ color: '#a0b8a8', fontSize: '0.4375rem', fontStyle: 'normal', position: 'relative', top: '1.5px' }}>{tradOuverte ? '▲' : '▼'}</span>
            </button>
            {tradOuverte && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: 'var(--cs-surface)', border: '1px solid rgba(var(--cs-vert-rgb),0.18)', borderRadius: '7px', zIndex: 50, boxShadow: '0 10px 26px rgba(47,63,53,0.12)', minWidth: '230px', overflow: 'hidden' }}>
                {traductions.map((t, i) => (
                  <button key={t.code} onClick={() => { setTraductionIndex(i); setTradOuverte(false) }} style={{
                    width: '100%', textAlign: 'left', padding: '11px 16px', fontSize: '0.8125rem',
                    border: 'none', borderBottom: i < traductions.length - 1 ? '1px solid var(--cs-fond-doux)' : 'none',
                    background: traductionIndex === i ? 'rgba(var(--cs-vert-rgb),0.08)' : '#fff',
                    color: traductionIndex === i ? 'var(--cs-vert)' : 'var(--cs-texte-fort)',
                    fontWeight: traductionIndex === i ? 600 : 400, cursor: 'pointer',
                    fontFamily: "var(--font-source-serif), Georgia, serif", letterSpacing: '0.01em',
                    transition: 'background 0.12s',
                  }}
                    onMouseEnter={e => { if (traductionIndex !== i) (e.currentTarget as HTMLElement).style.background = 'rgba(var(--cs-vert-rgb),0.04)' }}
                    onMouseLeave={e => { if (traductionIndex !== i) (e.currentTarget as HTMLElement).style.background = '#fff' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Double filet à droite, symétrique. */}
          <div style={{ flex: 1, minWidth: '46px', height: '1px', background: 'linear-gradient(to left, transparent 0%, #c3b7a0 38%, #a4977f 100%)' }} />
        </div>
          <div />
        </div>

        {/* Seule particularité visuelle de TR0009 : le choix de graphie. Il n'apparaît
            QUE lorsque la couche modernisée est disponible (piloté par les données).
            Tant qu'elle n'existe pas, aucun contrôle : la graphie du manuscrit s'affiche
            directement et TR0009 se lit comme une traduction ordinaire. */}
        {graphieModerniseeDispo && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.625rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', fontFamily: 'var(--font-source-serif), Georgia, serif' }}>Graphie</span>
            <div role="group" aria-label="Graphie" style={{ display: 'flex', gap: '0.375rem' }}>
              {([['modernized', 'Modernisée'], ['expanded', 'Manuscrit']] as [Couche899, string][]).map(([val, lab]) => (
                <button key={val} type="button" aria-pressed={coucheActive === val} onClick={() => changerGraphie(val)}
                  title={val === 'modernized' ? 'Graphie modernisée' : 'Graphie du manuscrit (abréviations développées)'}
                  style={{
                    border: '1px solid var(--cs-bord)', borderRadius: '999px',
                    background: coucheActive === val ? 'rgba(var(--cs-vert-rgb),0.10)' : 'var(--cs-surface)',
                    color: coucheActive === val ? 'var(--cs-vert)' : 'var(--cs-texte-second)',
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.6875rem', padding: '0.25rem 0.625rem',
                  }}>
                  {lab}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      <div className={mobile ? '' : 'overflow-y-auto flex-1'} style={{ paddingTop: '20px', paddingBottom: '20px' }}>
        <div style={{ maxWidth: 'var(--mesure-page)', margin: '0 auto', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
          <style>{`
            .verset-row:hover { background: rgba(var(--cs-vert-rgb),0.05); }
            .verset-row:hover .bouton-action-verset { opacity: 1 !important; }
            .verset-row--actif .bouton-action-verset { opacity: 0.5; }
            .nav-chap-arrow:hover { color: var(--cs-vert) !important; }
            /* Mobile : dans le pavé flottant (appui long), les boutons sont pleins. */
            @media (max-width: 900px) { .verset-actions .bouton-action-verset { opacity: 1 !important; } }
          `}</style>

          {(versets.length === 0 || versets.every(v => !v[traduction] && !estLigne899(v))) && (
            // Charte : l'image + légende se placent au tiers supérieur du bloc,
            // non centrées verticalement dans le vide.
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', minHeight: '60vh', gap: 0, padding: '8vh 16px 0' }}>
              {/* Des ruines fumantes plutôt qu'un fleuron : l'ornement disait « fin de
                  chapitre », là où il faut dire « il n'y a rien ici ». Taille mesurée,
                  discrète — c'est un ornement, pas une illustration. `multiply` fait
                  disparaître le fond blanc du dessin sur le papier de la page. */}
              <Image src="/ornements/ruines-fumantes.png" alt="" aria-hidden="true"
                width={1242} height={1242} priority={false}
                style={{ width: 'min(190px, 55%)', height: 'auto', opacity: 0.42, mixBlendMode: 'multiply' }} />
              {/* Le texte remonte sous l'image par une marge négative : la gravure est
                  carrée mais les ruines reposent haut, laissant du blanc en bas. Le texte
                  vient ainsi se poser à la lisière du sol, non loin sous le cadre. */}
              <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.8125rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)', textAlign: 'center', lineHeight: 1.65, margin: '-26px 0 0', maxWidth: '21.25rem' }}>
                La traduction <em style={{ fontStyle: 'normal', color: 'var(--cs-texte-second)' }}>{traductionLabel}</em> ne comporte pas ce livre.
              </p>
            </div>
          )}

          {/* Chapitre entièrement absent du témoin : une mention unique, sobre, au lieu
              d'un mur de « [Lacune du manuscrit] ». La dimension savante est préservée —
              on nomme le manuscrit et l'étendue exacte non conservée. */}
          {chapitreToutLacune && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', minHeight: '50vh', padding: '11vh 16px 0', textAlign: 'center' }}>
              {/* Un filet interrompu en son milieu : figure typographique de la lacune,
                  préférée à une suite de points. */}
              <span aria-hidden style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.125rem', color: 'var(--cs-texte-faible)' }}>
                <span style={{ width: '2.75rem', height: '1px', background: 'currentColor', opacity: 0.6 }} />
                <span style={{ fontSize: '0.9rem', letterSpacing: '0.25em' }}>◦◦◦</span>
                <span style={{ width: '2.75rem', height: '1px', background: 'currentColor', opacity: 0.6 }} />
              </span>
              <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1rem', fontStyle: 'italic', color: 'var(--cs-lacune)', margin: 0 }}>
                Lacune du manuscrit
              </p>
              <p style={{ fontSize: '0.76rem', color: 'var(--cs-texte-doux)', margin: '0.5rem 0 0', maxWidth: '22rem', lineHeight: 1.5 }}>
                Ce chapitre — {nomLivre} {chapitreActif} — n’est pas conservé dans ce témoin.
              </p>
            </div>
          )}

          {/* On n'affiche QUE les versets réellement portés par cette traduction : une
              édition qui compte moins de versets qu'une autre (Job 25 s'arrête au v. 6
              chez Sacy) ne doit pas laisser des lignes vides à numéro. */}
          {!chapitreToutLacune && versets.filter(v => estLigne899(v) || v[traduction]).map(v => {
            const actif = versetSelectionne?.id_verset === v.id_verset
            const ligne899 = estLigne899(v)
            const lacune = estLacune899(v)
            return (
            <div key={v.id_verset}
              id={`verset-${v.verset}`}
              onClick={() => {
                const incrementer = () => fetch('/api/versets/incrementer-lecture', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id_verset: v.id_verset }),
                }).catch(() => {})
                if (mobile) {
                  // Sur mobile, un tap sélectionne le verset ET fait apparaître
                  // immédiatement le pavé d'actions ; un second tap referme.
                  // TR0009 : pas de comptage de lecture ni de pavé d'actions (id non canonique).
                  if (actif) { setVersetSelectionne(null); setActionsMobileId(null) }
                  else { if (!ligne899) { incrementer(); setActionsMobileId(v.id_verset) } setVersetSelectionne(v) }
                  return
                }
                if (!actif && !ligne899) incrementer()
                setVersetSelectionne(actif ? null : v)
              }}
              className={`verset-row${actif ? ' verset-row--actif' : ''}`}
              style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: mobile ? '0.03125rem 0.375rem' : '0.1875rem 0.375rem', borderRadius: '4px', cursor: 'pointer', marginBottom: mobile ? '0.05rem' : '0.25rem', background: 'transparent' }}>

              <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'minmax(0, 1fr)' : 'minmax(0, var(--mesure-bloc)) 2.375rem', width: mobile ? '100%' : 'min(var(--mesure-ligne), 100%)', alignItems: 'flex-start' }}>
                <div style={{ display:'grid', gridTemplateColumns:'auto minmax(0, var(--mesure-texte))', columnGap:'0.1875rem', alignItems: 'baseline', borderRadius:'5px', padding:'0.125rem 0.25rem 0.125rem 0', background: actif ? 'rgba(var(--cs-vert-rgb),0.11)' : 'transparent' }}>
                  {/* Numéro — inclus dans le bloc sélectionné, aligné sur la 1re ligne du texte (ligne de base) */}
                  <span style={{ minWidth: '1.0625rem', textAlign: 'right', paddingRight: '0.3125rem', fontSize: '0.625rem', fontWeight: 600, color: 'var(--cs-texte-faible)', lineHeight: 1.40, whiteSpace: 'nowrap' }}>
                    {v.verset}
                    {v.chapitre_alternatif != null && (
                      <span style={{ fontWeight: 400, fontStyle: 'italic', color: 'var(--cs-texte-faible)' }}>
                        {' '}({v.chapitre_alternatif}{v.verset_alternatif != null ? `,${v.verset_alternatif}` : ''})
                      </span>
                    )}
                  </span>

                  {/* Texte — colonne fixe et stable, alignée quel que soit l'état des boutons.
                      TR0009 : lacune du manuscrit rendue explicitement ; marqueurs éditoriaux
                      inline (lecture incertaine, ajout marginal) rendus discrètement. Aucun
                      statut technique d'alignement n'est montré au lecteur. */}
                  <p data-verse-text lang={ligne899 ? 'fro' : undefined} style={{ fontSize: '0.84rem', lineHeight: mobile ? 1.3 : 1.42, color: 'var(--cs-texte-fort)', margin: 0, textAlign: 'justify', wordSpacing: '-0.02em', letterSpacing: '-0.003em' }}>
                    {lacune ? (
                      // Verset isolé absent du témoin (chapitre par ailleurs porté). Italique
                      // de labeur, capitale initiale, teinte effacée : signalé sans peser.
                      <span title="Lacune matérielle du manuscrit" style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', color: 'var(--cs-lacune)', fontStyle: 'italic' }}>Lacune du manuscrit</span>
                    ) : (overrides[v.id_verset]?.[traduction] ?? v[traduction]) ? (
                      ligne899
                        ? rendreMarqueurs899(String(v[traduction] ?? ''))
                        : rendreTexteEnrichi(String(overrides[v.id_verset]?.[traduction] ?? v[traduction]))
                    ) : (
                      <span style={{ color:'var(--cs-bord)', fontStyle:'italic' }}>—</span>
                    )}
                  </p>
                </div>

                {/* Boutons d'action — hors du bloc sélectionné. Sur mobile, ils
                    sortent de la grille : pavé flottant en haut à droite du
                    verset, montré seulement après un appui long. */}
                <div className="verset-actions" style={mobile ? {
                  // Au-dessus du verset (et non sur lui) : le texte reste lisible.
                  position: 'absolute', bottom: '100%', right: '0.25rem', marginBottom: '3px', zIndex: 6,
                  display: actionsMobileId === v.id_verset ? 'flex' : 'none', alignItems: 'center', gap: '0.25rem',
                  background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', boxShadow: '0 4px 16px rgba(45,35,25,0.18)', padding: '0.25rem 0.375rem',
                } : { width: '2.375rem', paddingLeft: '0.5rem', display: 'flex', alignItems: 'flex-start', gap: 0, paddingTop: '0.28125rem', overflow: 'visible' }}>
                  {/* TR0009 : prélèvement / signalement / édition ciblent un id de verset
                      canonique, inexistant pour le manuscrit. On masque ces actions ; la
                      colonne reste réservée pour préserver l'alignement de la mise en page. */}
                  {!ligne899 && (
                    <>
                      {userId && (
                        <BoutonEnregistrer
                          verset={v} nomLivre={nomLivre} livreActif={livreActif}
                          chapitreActif={chapitreActif} traduction={traduction} userId={userId}
                          traductionLabel={traductionLabel}
                          dejaSauvegarde={sauvegardes.has(v.verset)}
                          idPrelevement={sauvegardes.get(v.verset) ?? null}
                          onSauvegarde={(id) => marquerSauvegarde(v.verset, id)}
                          onSupprimer={() => retirerSauvegarde(v.verset)}
                        />
                      )}
                      <BoutonCopie texte={citationBiblique(
                        String(overrides[v.id_verset]?.[traduction] ?? v[traduction] ?? ''),
                        `${ABREV_FR[livreActif] || nomLivre} ${chapitreActif}, ${v.verset}`,
                      )} />
                      <BoutonSignaler versetId={v.id_verset} versetRef={v.ref} texte={String(overrides[v.id_verset]?.[traduction] ?? v[traduction] ?? '')} />
                      {estAdmin && !modeUtilisateurStandard && (
                        <button onClick={e => { e.stopPropagation(); setEditionCible(v) }} title="Modifier ce verset" className="bouton-action-verset"
                          style={{ ...VERSET_ACTION_BTN, opacity:0, color:'var(--cs-bord)' }}>
                          <IconeCrayon size={12} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            )
          })}
        </div>
      </div>
      {editionCible && (
        <ModaleEditionVerset
          verset={editionCible}
          traduction={traduction}
          traductionLabel={traductionLabel}
          refCourt={`${ABREV_FR[livreActif] || livreActif} ${chapitreActif}, ${editionCible.verset}`}
          valeurActuelle={String(overrides[editionCible.id_verset]?.[traduction] ?? editionCible[traduction] ?? '')}
          onClose={() => setEditionCible(null)}
          onEnregistre={(nouvelleValeur) => {
            setOverrides(prev => ({ ...prev, [editionCible.id_verset]: { ...prev[editionCible.id_verset], [traduction]: nouvelleValeur } }))
            setEditionCible(null)
          }}
        />
      )}
    </div>
  )
}
