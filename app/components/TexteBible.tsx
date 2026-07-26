'use client'
import { ABREV_FR } from '@/app/lib/bible'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from "@/app/lib/supabase"
import { useAffichageAdmin } from "@/app/lib/contexteAffichageAdmin"
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'


import IconeSignet from '@/app/components/IconeSignet'
import ModalSignalement from '@/app/components/ModalSignalement'

const VERSET_ACTION_BTN: React.CSSProperties = {
  background:'none', border:'none', cursor:'pointer', padding:'1px 2px',
  borderRadius:'3px', width:'16px', height:'16px', display:'inline-flex',
  alignItems:'center', justifyContent:'center', fontSize:'12px',
  lineHeight:1, flexShrink:0, transition:'color 0.15s',
}

// Si le texte cité contient déjà des guillemets français (citation de second
// niveau — le Père cite lui-même l'Écriture, par exemple), on les convertit
// en guillemets anglais pour ne pas doubler les guillemets français lors de
// l'export via « Copier ».
function convertirGuillemetsInternes(texte: string): string {
  return texte
    .replace(/«[\u202F\u00A0\s]*/g, '“')
    .replace(/[\u202F\u00A0\s]*»/g, '”')
}

type Verset = {
  id_verset: string; ref: string; livre: string
  chapitre: number; verset: number
  [traduction: string]: string | number | null | undefined
  chapitre_alternatif?: number | null; verset_alternatif?: number | null
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
      style={{ ...VERSET_ACTION_BTN, opacity:0, color: copie ? '#3d6b4f' : '#c8c0b4' }}
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

function BoutonSignaler({ versetId, versetRef, texte }: { versetId: string; versetRef?: string; texte?: string }) {
  const [ouvert, setOuvert] = useState(false)
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
  const ref = versetRef || versetId
  return (
    <>
      <button onClick={e => { e.stopPropagation(); setOuvert(true) }}
        className="bouton-action-verset"
        title="Signaler une erreur"
        style={{ ...VERSET_ACTION_BTN, opacity:0, color:'#c8c0b4' }}>
        ⚑
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
    mesurer()
    const ro = new ResizeObserver(mesurer)
    ro.observe(p)
    window.addEventListener('resize', mesurer)
    return () => { ro.disconnect(); window.removeEventListener('resize', mesurer) }
  }, [signal])
  return (
    <span ref={ref} aria-hidden style={{
      position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)',
      width: '0px', height: '1px', marginRight: '5px',
      // Filet volontairement ténu : palissant vers le texte, il ne fait qu'effleurer
      // l'œil. Plus discret qu'auparavant (0.32 → 0.16), et adouci près du signet même,
      // pour rester élégant plutôt que d'afficher une barre franche.
      background: 'linear-gradient(to left, rgba(61,107,79,0.16), rgba(61,107,79,0.10) 55%, rgba(61,107,79,0))',
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
          style={{ ...VERSET_ACTION_BTN, opacity:1, color:'#3d6b4f' }}
          aria-label="Retirer des prélèvements">
          {loading ? '…' : <IconeSignet plein />}
        </button>
      </span>
    )
  }

  const enregistrer = async (e: React.MouseEvent) => {
    e.stopPropagation()
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
      style={{ ...VERSET_ACTION_BTN, opacity:0, color:'#c8c0b4' }}
      aria-label="Enregistrer">
      {loading ? '…' : <IconeSignet />}
    </button>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
// ── Modale d'édition d'un verset (admin réel, vérifié côté serveur) ──────────
function ModaleEditionVerset({ verset, traduction, traductionLabel, valeurActuelle, onClose, onEnregistre }: {
  verset: Verset; traduction: string; traductionLabel: string; valeurActuelle: string
  onClose: () => void; onEnregistre: (nouvelleValeur: string) => void
}) {
  const [valeur, setValeur] = useState(valeurActuelle)
  const [statut, setStatut] = useState<'idle' | 'envoi' | 'erreur'>('idle')
  const taRef = useRef<HTMLTextAreaElement>(null)

  const entourer = (avant: string, apres: string = avant) => {
    const ta = taRef.current
    if (!ta) return
    const d = ta.selectionStart, f = ta.selectionEnd
    const selection = valeur.slice(d, f) || 'texte'
    setValeur(valeur.slice(0, d) + avant + selection + apres + valeur.slice(f))
    setTimeout(() => { ta.focus(); ta.setSelectionRange(d + avant.length, d + avant.length + selection.length) }, 0)
  }

  const inserer = (texte: string) => {
    const ta = taRef.current
    if (!ta) return
    const d = ta.selectionStart, f = ta.selectionEnd
    const nouveau = valeur.slice(0, d) + texte + valeur.slice(f)
    setValeur(nouveau)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(d + texte.length, d + texte.length) }, 0)
  }

  const enregistrer = async () => {
    setStatut('envoi')
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    const res = await fetch('/api/admin/verset-modifier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id_verset: verset.id_verset, traduction, valeur }),
    })
    if (!res.ok) { setStatut('erreur'); return }
    onEnregistre(valeur)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'8px', padding:'20px 22px', width:'480px', maxWidth:'100%', boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
          <p style={{ fontSize:'12px', fontWeight:600, color:'#9a5a2a', margin:0 }}>
            Modifier {traductionLabel} — verset {verset.verset}
          </p>
          <button onClick={onClose} style={{ fontSize:'14px', color:'#b0a89e', background:'none', border:'none', cursor:'pointer', padding:0, lineHeight:1 }}>✕</button>
        </div>
        <div style={{ display:'flex', gap:'6px', marginBottom:'8px', flexWrap:'wrap' }}>
          <button onClick={() => entourer('**')} style={{ fontSize:'11px', padding:'4px 9px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#2a2520', fontWeight:700, cursor:'pointer' }}>G</button>
          <button onClick={() => entourer('*')} style={{ fontSize:'11px', padding:'4px 9px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#2a2520', fontStyle:'italic', cursor:'pointer' }}>I</button>
          <button onClick={() => entourer('^^')} title="Exposant" style={{ fontSize:'11px', padding:'4px 9px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#2a2520', cursor:'pointer' }}>x²</button>
          <span style={{ width:'1px', background:'#e4dfd8' }} />
          <button onClick={() => inserer('\u00A0')} title="Espace insécable" style={{ fontSize:'10px', padding:'4px 9px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#2a2520', cursor:'pointer' }}>Esp. insécable</button>
          <button onClick={() => inserer('\u202F')} title="Espace fine insécable" style={{ fontSize:'10px', padding:'4px 9px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#2a2520', cursor:'pointer' }}>Esp. fine</button>
          <button onClick={() => entourer('«\u202F', '\u202F»')} title="Guillemets français" style={{ fontSize:'11px', padding:'4px 9px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#2a2520', cursor:'pointer' }}>« »</button>
          <button onClick={() => entourer('\u201C', '\u201D')} title="Guillemets anglais (citation imbriquée)" style={{ fontSize:'11px', padding:'4px 9px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#2a2520', cursor:'pointer' }}>“ ”</button>
        </div>
        <textarea ref={taRef} value={valeur} onChange={e => setValeur(e.target.value)} rows={5} autoFocus
          style={{ width:'100%', fontSize:'13px', padding:'8px 10px', border:'1px solid #d6d0c4', borderRadius:'5px', background:'#faf8f4', color:'#2a2520', resize:'vertical', outline:'none', lineHeight:1.55, boxSizing:'border-box' }} />
        <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'12px' }}>
          {statut === 'erreur' && <span style={{ fontSize:'11px', color:'#c0562a', alignSelf:'center' }}>Erreur d'enregistrement.</span>}
          <button onClick={onClose} style={{ fontSize:'11px', padding:'5px 14px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#6b6560', cursor:'pointer' }}>Annuler</button>
          <button onClick={enregistrer} disabled={statut === 'envoi'} style={{ fontSize:'11px', padding:'5px 16px', borderRadius:'4px', border:'none', background:'#3d6b4f', color:'#fff', cursor:'pointer', fontWeight:500 }}>
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
  versetSelectionne, setVersetSelectionne
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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: '#f7f4ef' }}>

      {/* En-tête */}
      <div style={{ borderBottom: '1px solid #d6d0c4', background: '#f7f4ef', padding: '14px 32px 10px' }}>

        {/* Titre + navigation chapitres. Calé sur LE MÊME gabarit que les versets
            (bloc de texte de 500 px + colonne d'actions de 38 px) : le titre est centré
            sur la seule première colonne — donc sur le bloc vert de sélection —, la colonne
            des boutons (signaler, prélever…) étant exclue du centrage. */}
        <div style={{ width: 'min(538px, 100%)', margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 500px) 38px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
          {chapitreActif > 1 ? (
            <button onClick={() => allerAuChapitre(chapitreActif - 1)} className="nav-chap-arrow" style={{ color: '#b0a89e', fontSize: '20px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.15s' }} title="Chapitre précédent">‹</button>
          ) : (
            <span style={{ color: '#d6d0c4', fontSize: '20px', lineHeight: 1 }}>‹</span>
          )}

          <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontWeight: 'normal', margin: 0, display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontSize: '1.25rem', color: '#1e2e24', letterSpacing: '0.01em' }}>{nomLivre}</span>
            <span style={{ color: '#b0a088', fontSize: '1.25rem', lineHeight: 1 }}>❧</span>
            <span style={{ fontSize: '1.05rem', color: '#5a7260', fontStyle: 'italic' }}>Chapitre {chapitreActif}</span>
          </h1>

          <button onClick={() => allerAuChapitre(chapitreActif + 1)} className="nav-chap-arrow" style={{ color: '#b0a89e', fontSize: '20px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.15s' }} title="Chapitre suivant">›</button>
        </div>
          <div />
        </div>

        {/* Séparateur fin + choix de traduction : petits filets de part et d'autre.
            Calé sur LE MÊME gabarit que le titre « Genèse ❧ Chapitre 1 » (bloc texte
            de 500 px + colonne d'actions de 38 px exclue du centrage), pour que le menu
            se centre sur le même axe que le titre, et non sur la pleine largeur. */}
        <div style={{ width: 'min(538px, 100%)', margin: '8px auto 0', display: 'grid', gridTemplateColumns: 'minmax(0, 500px) 38px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '260px', margin: '0 auto' }}>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #d6d0c4)' }} />
          <div style={{ position: 'relative' }}>
            <button onClick={() => setTradOuverte(!tradOuverte)} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '0', border: 'none', background: 'transparent',
              fontSize: '11.5px', color: '#6b8270', cursor: 'pointer',
              fontFamily: "var(--font-source-serif), Georgia, serif",
              fontStyle: 'italic', letterSpacing: '0.01em',
              transition: 'color 0.15s',
            }}>
              <span>{traductionLabel}</span>
              <span style={{ color: '#a0b8a8', fontSize: '7px', fontStyle: 'normal' }}>{tradOuverte ? '▲' : '▼'}</span>
            </button>
            {tradOuverte && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: '#fff', border: '1px solid rgba(61,107,79,0.18)', borderRadius: '7px', zIndex: 50, boxShadow: '0 10px 26px rgba(47,63,53,0.12)', minWidth: '230px', overflow: 'hidden' }}>
                {traductions.map((t, i) => (
                  <button key={t.code} onClick={() => { setTraductionIndex(i); setTradOuverte(false) }} style={{
                    width: '100%', textAlign: 'left', padding: '11px 16px', fontSize: '13px',
                    border: 'none', borderBottom: i < traductions.length - 1 ? '1px solid #ede9e2' : 'none',
                    background: traductionIndex === i ? 'rgba(61,107,79,0.08)' : '#fff',
                    color: traductionIndex === i ? '#3d6b4f' : '#2a2520',
                    fontWeight: traductionIndex === i ? 600 : 400, cursor: 'pointer',
                    fontFamily: "var(--font-source-serif), Georgia, serif", letterSpacing: '0.01em',
                    transition: 'background 0.12s',
                  }}
                    onMouseEnter={e => { if (traductionIndex !== i) (e.currentTarget as HTMLElement).style.background = 'rgba(61,107,79,0.04)' }}
                    onMouseLeave={e => { if (traductionIndex !== i) (e.currentTarget as HTMLElement).style.background = '#fff' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #d6d0c4)' }} />
        </div>
          <div />
        </div>

      </div>

      <div className="overflow-y-auto flex-1" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
        <div style={{ maxWidth: '620px', margin: '0 auto', paddingLeft: '24px', paddingRight: '24px' }}>
          <style>{`
            .verset-row:hover { background: rgba(61,107,79,0.05); }
            .verset-row:hover .bouton-action-verset { opacity: 1 !important; }
            .verset-row--actif .bouton-action-verset { opacity: 0.5; }
            .nav-chap-arrow:hover { color: #3d6b4f !important; }
          `}</style>

          {(versets.length === 0 || versets.every(v => !v[traduction])) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 0, padding: '0 16px' }}>
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
              <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '13px', fontStyle: 'italic', color: '#9a958d', textAlign: 'center', lineHeight: 1.65, margin: '-26px 0 0', maxWidth: '340px' }}>
                La traduction <em style={{ fontStyle: 'normal', color: '#6b6560' }}>{traductionLabel}</em> ne comporte pas ce livre.
              </p>
            </div>
          )}

          {/* On n'affiche QUE les versets réellement portés par cette traduction : une
              édition qui compte moins de versets qu'une autre (Job 25 s'arrête au v. 6
              chez Sacy) ne doit pas laisser des lignes vides à numéro. */}
          {versets.filter(v => v[traduction]).map(v => {
            const actif = versetSelectionne?.id_verset === v.id_verset
            return (
            <div key={v.id_verset}
              id={`verset-${v.verset}`}
              onClick={() => {
                if (!actif) {
                  // Comptage en arriere-plan, sans ralentir le clic.
                  fetch('/api/versets/incrementer-lecture', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_verset: v.id_verset }),
                  }).catch(() => {})
                }
                setVersetSelectionne(actif ? null : v)
              }}
              className={`verset-row${actif ? ' verset-row--actif' : ''}`}
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', marginBottom: '4px', background: 'transparent' }}>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 500px) 38px', width: 'min(538px, 100%)', alignItems: 'flex-start' }}>
                <div style={{ display:'grid', gridTemplateColumns:'auto minmax(0, 480px)', columnGap:'3px', borderRadius:'5px', padding:'2px 4px 2px 0', background: actif ? 'rgba(61,107,79,0.11)' : 'transparent' }}>
                  {/* Numéro — inclus dans le bloc sélectionné */}
                  <span style={{ minWidth: '17px', textAlign: 'right', paddingRight: '5px', fontSize: '10px', fontWeight: 600, color: '#b0a89e', lineHeight: 1.40, paddingTop: '1px', whiteSpace: 'nowrap' }}>
                    {v.verset}
                    {v.chapitre_alternatif != null && (
                      <span style={{ fontWeight: 400, fontStyle: 'italic', color: '#c0bab0' }}>
                        {' '}({v.chapitre_alternatif}{v.verset_alternatif != null ? `,${v.verset_alternatif}` : ''})
                      </span>
                    )}
                  </span>

                  {/* Texte — colonne fixe et stable, alignée quel que soit l'état des boutons */}
                  <p data-verse-text style={{ fontSize: '0.84rem', lineHeight: 1.42, color: '#1e1a16', margin: 0, textAlign: 'justify', wordSpacing: '-0.09em', letterSpacing: '-0.003em' }}>
                    {(overrides[v.id_verset]?.[traduction] ?? v[traduction])
                      ? rendreTexteEnrichi(String(overrides[v.id_verset]?.[traduction] ?? v[traduction]))
                      : <span style={{ color:'#d6d0c4', fontStyle:'italic' }}>—</span>}
                  </p>
                </div>

                {/* Boutons d'action — hors du bloc sélectionné */}
                <div className="verset-actions" style={{ width: '38px', paddingLeft: '8px', display: 'flex', alignItems: 'flex-start', gap: 0, paddingTop: '2px', overflow: 'visible' }}>
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
                  <BoutonCopie texte={(() => {
                    const texteVerset = String(overrides[v.id_verset]?.[traduction] ?? v[traduction] ?? '')
                    const abr = ABREV_FR[livreActif] || nomLivre
                    const textrePropre = convertirGuillemetsInternes(texteVerset).replace(/[.!?]$/, '')
                    return `« ${textrePropre} » (${abr} ${chapitreActif}, ${v.verset})`
                  })()} />
                  <BoutonSignaler versetId={v.id_verset} versetRef={v.ref} texte={String(overrides[v.id_verset]?.[traduction] ?? v[traduction] ?? '')} />
                  {estAdmin && !modeUtilisateurStandard && (
                    <button onClick={e => { e.stopPropagation(); setEditionCible(v) }} title="Modifier ce verset" className="bouton-action-verset"
                      style={{ ...VERSET_ACTION_BTN, opacity:0, color:'#c8c0b4' }}>
                      ✎
                    </button>
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
