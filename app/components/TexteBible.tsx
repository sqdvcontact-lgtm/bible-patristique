'use client'
import { ABREV_FR, estLivreNonCanonique } from '@/app/lib/bible'
import MarqueNonCanonique from '@/app/components/MarqueNonCanonique'

import { Fragment, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useNaviguer } from '@/app/lib/attenteNavigation'
import { supabase } from "@/app/lib/supabase"
import { useAffichageAdmin } from "@/app/lib/contexteAffichageAdmin"
import { useCompte } from "@/app/lib/contexteCompte"
import { useSansSurvol } from "@/app/lib/useEstMobile"
import { citationBiblique, copierCitation } from "@/app/lib/citation"
import { usePrelevementsDuChapitre } from "@/app/lib/prelevementsBibliques"
import { referenceDesVersets, texteDesVersets, UNITE_VERSETS } from "@/app/lib/selectionPassages"
import LassoLecture from '@/app/components/LassoLecture'
import { raccourcisEditeur, collageTexteBrut } from '@/app/lib/raccourcisEditeur'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'


import IconeSignet from '@/app/components/IconeSignet'
import IconeCopier from '@/app/components/IconeCopier'
import { avecHoteEclat, EclatCopie, useEclatCopie } from '@/app/components/EclatCopie'
import IconeCrayon from '@/app/components/IconeCrayon'
import IconeSignalement from '@/app/components/IconeSignalement'
import { STYLE_BOUTON_ACTION } from '@/app/lib/celluleActions'
import ModalSignalement from '@/app/components/ModalSignalement'
import { BANDEAU_NAV_MOBILE } from '@/app/lib/mesures'
import { marquerLacunesDuTemoin, rendreMarqueurs899 } from '@/app/lib/marqueurs899'
import { estTraductionModerne899 } from '@/app/lib/bible899'
import {
  marqueDensiteTient, styleDensiteVerset,
  STYLE_LACUNE, STYLE_NUMERO_ALTERNATIF, STYLE_NUMERO_VERSET, STYLE_VERSET_VIDE,
  styleAxeTexte, styleBlocVerset, styleGrilleRangee, styleRangeeVerset, styleTexteVerset,
  BLANC_TITRE_MENU, GOUTTIERE_ACTIONS_VERSET, INTERLIGNE_TITRE_CHAPITRE, RETRAIT_ACTIONS_VERSET,
} from '@/app/lib/compositionBible'
import {
  libelleDensiteVerset, type DensiteVerset,
} from '@/app/lib/densitePatristique'
import { tailleRacinePx } from '@/app/lib/fenetreContextuelle'
import SelecteurTraductionBible from '@/app/components/SelecteurTraductionBible'
import FlecheChapitre from '@/app/components/FlecheChapitre'
import { BlocEditorialBible, figuresDeLaNote, IllustrationBible, PieceLiminaire } from '@/app/components/BibleEditionParatext'
import { estSuiteDuBloc } from '@/app/lib/bibleHierarchieSemantique'
import AppelNoteBiblique from '@/app/components/NoteBibliqueFenetre'
import { rendreTexteAvecAppels, repartirAppels } from '@/app/lib/ancresAppelsBible'
import { separateurAppels, styleSeparateurAppels } from '@/app/lib/appelsDeNote'
import { urlLectureBible, type ManiereDeLireBible } from '@/app/lib/bibleNavigation'
import type { PieceLiminaireAffichee } from '@/app/components/BibleLayout'
import { signalerProgression } from '@/app/components/AnnonceHautsFaits'
import {
  indexerBlocsDeCorps,
  habillerLesVignettes,
  indexerIllustrations,
  type BibleEditionChapterDisplay,
  type BibleEditionDisplayAsset,
  type BibleEditionDisplayBodyBlock,
  type BibleEditionDisplayNote,
} from '@/app/lib/bibleEdition'

// ⛔ Le gabarit vient du module partagé : un bouton d'action a la même boîte sur les
// cinq surfaces, qu'il vive dans la gouttière d'un verset, dans le pavé flottant du
// doigt ou dans la cellule d'actions d'un segment.
const VERSET_ACTION_BTN = STYLE_BOUTON_ACTION

type Verset = {
  id_verset: string; ref: string; livre: string
  chapitre: number; verset: number
  chapitre_alternatif?: number | null; verset_alternatif?: number | null
  // Marqueurs des adaptateurs éditoriaux ; Bible 899 ajoute son statut de lacune.
  _est899?: boolean; _estEditorial?: boolean; _estLacune?: boolean
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
  /** Combien d’ŒUVRES parlent de chaque verset du chapitre. Vient de la page, qui la
   *  charge une fois : la barre d’onglets du doigt en a besoin autant que la marge. */
  densites: ReadonlyMap<string, DensiteVerset>
  mobile?: boolean
  /** Appareil de l’édition : introductions, commentaires, notes, illustrations.
   *  Nul en lecture « Texte biblique seul » — la page ne le charge alors pas. */
  editionChapter?: BibleEditionChapterDisplay | null
  /** Les notes des VERSETS (`versets_v2.notes`), rangées par bible (charte § 13.22). Toutes
   *  les colonnes de la vue large y sont : l'échange de colonne en mémoire garde les siennes. */
  notesDesVersets?: Readonly<Record<string, readonly BibleEditionDisplayNote[]>> | null
  /** Pièce liminaire de l'édition, lue SEULE : elle remplace le chapitre. */
  pieceAffichee?: PieceLiminaireAffichee | null
  /** La manière de lire courante, reportée sur les flèches de chapitre. */
  maniereDeLire?: ManiereDeLireBible
}

// ── Bouton copie ──────────────────────────────────────────────────────────────
function BoutonCopie({ texte }: { texte: string }) {
  const { copie, eclat, briller } = useEclatCopie()
  const handle = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(texte).then(briller)
  }
  return (
    <button onClick={handle} title="Copier ce verset" className={avecHoteEclat('bouton-action-verset')}
      style={{ ...VERSET_ACTION_BTN, opacity:0, color: copie ? 'var(--cs-vert)' : 'var(--cs-bord)' }}
      aria-label="Copier">
      {/* ⚠️ Le glyphe vient d'`IconeCopier` : la VISITE le reproduit dans son
          illustration, et les deux ne doivent pas diverger. ⛔ Il ne cède plus la place
          à un ✓ : l'accusé est un ÉCLAT, posé par-dessus lui. */}
      <IconeCopier />
      <EclatCopie eclat={eclat} />
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
        <IconeSignalement />
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
    if (!error && data) { onSauvegarde(data.id); signalerProgression() }
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

  // 2700 : la fenêtre d'édition passe au-dessus des barres mobiles de la page Bible
  // (onglets 1300, bandeau 1250), et sous la barre de navigation (3000).
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:2700, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--cs-surface)', borderRadius:'8px', padding:'20px 22px', width:'30rem', maxWidth:'100%', boxShadow:'var(--cs-ombre-modale)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
          <p style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--cs-attente)', margin:0 }}>
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
          onKeyDown={e => raccourcisEditeur(e, { apresChangement: sync, exposant: true })}
          onPaste={e => collageTexteBrut(e, sync)}
          style={{ width:'100%', minHeight:'96px', maxHeight:'300px', overflowY:'auto', fontSize:'0.8125rem', padding:'8px 10px', border:'1px solid var(--cs-bord)', borderRadius:'4px', background:'var(--cs-fond-clair)', color:'var(--cs-texte-fort)', outline:'none', lineHeight:1.55, boxSizing:'border-box', textAlign:'justify', whiteSpace:'pre-wrap' }} />
        <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'12px' }}>
          {statut === 'erreur' && <span style={{ fontSize:'0.6875rem', color:'var(--cs-danger)', alignSelf:'center' }}>Erreur d’enregistrement.</span>}
          <button onClick={onClose} style={{ fontSize:'0.6875rem', padding:'5px 14px', borderRadius:'4px', border:'1px solid var(--cs-bord)', background:'var(--cs-surface)', color:'var(--cs-texte-second)', cursor:'pointer' }}>Annuler</button>
          <button onClick={enregistrer} disabled={statut === 'envoi'} style={{ fontSize:'0.6875rem', padding:'5px 16px', borderRadius:'4px', border:'none', background:'var(--cs-vert-aplat)', color:'var(--cs-sur-aplat)', cursor:'pointer', fontWeight:500 }}>
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
  versetSelectionne, setVersetSelectionne, densites, mobile = false,
  editionChapter, notesDesVersets = null, maniereDeLire, pieceAffichee = null,
}: Props) {
  // Session et droits : lus dans le contexte partagé, jamais redemandés ici. Ce
  // composant tenait son propre abonnement d'authentification et sa propre lecture
  // de `profils.est_admin`, l'une et l'autre en double, et les réinstallait à chaque
  // changement de chapitre.
  const { userId, estAdmin, exigerCompte } = useCompte()
  // ⛔ L'axe du lasso est la CAPACITÉ du pointeur : au doigt, glisser fait défiler.
  const sansSurvol = useSansSurvol()
  const [editionCible, setEditionCible] = useState<Verset | null>(null)
  const [overrides, setOverrides] = useState<Record<string, Partial<Record<string, string>>>>({})
  // ⛔ Le chargement des prélèvements du chapitre vit dans `prelevementsBibliques.ts` : la
  // lecture en regard le partage, et deux copies divergeraient au premier réglage.
  const [sauvegardes, setSauvegardes] = usePrelevementsDuChapitre(userId, livreActif, chapitreActif)
  const searchParams = useSearchParams()
  // Le clic est ACQUITTÉ : la navigation passe par la provision d'attente, qui
  // allume la marque au centre de la lecture tant que la page se prépare.
  const naviguer = useNaviguer()
  const { modeUtilisateurStandard } = useAffichageAdmin()

  // Mobile : les boutons d'action encombreraient la marge droite d'un écran
  // étroit. On les masque, et un simple tap sur le verset fait surgir un pavé
  // flottant. `actionsMobileId` = verset dont les actions sont visibles.
  const [actionsMobileId, setActionsMobileId] = useState<string | null>(null)

  // ── OÙ LES PÈRES PARLENT ───────────────────────────────────────────────────
  // 37 % du canon porte un renvoi patristique, et la page n'en laissait rien voir : on
  // cliquait un verset et l'on découvrait, ou non. Une marque discrète dit combien
  // d'ŒUVRES en parlent — c'est ce que le volet de droite ouvrira, et c'est le seul
  // compte qui ne vaille jamais zéro quand il y a quelque chose.
  // ⚠️ Le chapitre est chargé PAR LA PAGE (voir BibleLayout) depuis le 20 septembre 2026 :
  // au doigt, l'onglet « Commentaires » porte le même compte pour le verset choisi, et
  // deux enfants ne demandent pas deux fois le même fait à la base.

  // ⛔ LA MARQUE NE SE REND QUE SI ELLE TIENT À DROITE DES ACTIONS (décision de l'auteur,
  // 2026-09-13 : « quand la largeur de l'écran le permet »). La place se mesure sur la
  // ZONE de lecture, que les volets rétrécissent sans que la fenêtre bouge : voir
  // marqueDensiteTient (compositionBible). Une seule rangée suffit, toutes portant les
  // mêmes boutons ; ce qui en change le nombre (session, administration) relance la mesure.
  const refDefileur = useRef<HTMLDivElement>(null)
  const [densiteTient, setDensiteTient] = useState(false)
  const nbVersets = versets.length
  const piecePosee = !!pieceAffichee
  useEffect(() => {
    if (mobile) return
    const defileur = refDefileur.current
    if (!defileur) return
    const mesurer = () => {
      const colonne = defileur.querySelector<HTMLElement>('.cs-lecture-colonne')
      const actions = defileur.querySelector<HTMLElement>('.verset-actions')
      if (!colonne || !actions) return
      const zone = colonne.getBoundingClientRect()
      // ⚠️ Une largeur NULLE ne se juge pas : un onglet caché rend zéro partout.
      if (zone.width <= 0) return
      // Le bord de la zone : la colonne est centrée par ses marges automatiques, que le
      // navigateur rend en pixels. ⛔ Ni la largeur cliente ni le bord client du défileur :
      // la gouttière de sa barre de défilement est réservée des deux côtés.
      const bordDeLaZone = zone.right + (Number.parseFloat(getComputedStyle(colonne).marginRight) || 0)
      // La fin des actions : le dernier bouton, ou le rembourrage de la gouttière quand la
      // ligne n'en porte aucun (lignes recomposées d'une édition). ⛔ Jamais la marque
      // elle-même, dont le prédicat décide.
      let finDesActions = actions.getBoundingClientRect().left
        + (Number.parseFloat(getComputedStyle(actions).paddingLeft) || 0)
      for (const bouton of Array.from(actions.querySelectorAll<HTMLElement>('.bouton-action-verset'))) {
        finDesActions = Math.max(finDesActions, bouton.getBoundingClientRect().right)
      }
      setDensiteTient(marqueDensiteTient({ finDesActions, bordDeLaZone, racine: tailleRacinePx() }))
    }
    // ⚠️ Le premier rappel de l'observateur fait la première mesure, après la mise en
    // page : aucun état ne se pose dans le corps de l'effet.
    const ro = new ResizeObserver(mesurer)
    ro.observe(defileur)
    return () => ro.disconnect()
  }, [mobile, nbVersets, traduction, livreActif, chapitreActif, userId, estAdmin, modeUtilisateurStandard, piecePosee])

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
  }, [searchParams, versets, setVersetSelectionne])

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
  const allerAuChapitre = (n: number) => naviguer(urlLectureBible({ ...maniereDeLire, livre: livreActif, chapitre: n, trad: tradCode }))

  // TR0009 (Bible 899) et éditions à segmentation éditoriale : l'adaptateur marque ses
  // lignes (`_est899`, `_estEditorial`). La GRAPHIE, la lecture en regard et le texte nu
  // se choisissent dans le menu « Mode de lecture » du volet de gauche, jamais dans le corps du
  // texte : ce sont des manières de lire, non des propriétés du chapitre affiché.
  const estLigne899 = (v: Verset) => v._est899 === true
  const estLigneEditoriale = (v: Verset) => v._estEditorial === true
  const estLacune899 = (v: Verset) => v._estLacune === true
  // La traduction moderne du même témoin n'est pas recomposée, mais son texte porte les
  // lacunes du manuscrit en clair : il faut les mettre en forme, sans passer par le
  // tokeniseur du témoin, qui prendrait ses restitutions pour des marqueurs à cheval.
  const lacunesEnClair = estTraductionModerne899(traduction)
  const indexBlocs = indexerBlocsDeCorps(editionChapter?.bodyBlocks ?? [])
  const indexIllustrations = indexerIllustrations(editionChapter?.assets ?? [])
  // ⛔ LES VIGNETTES SE FONDENT DANS LE COMMENTAIRE QUI COUVRE LEUR VERSET, et y
  //    flottent. L'ancre ne bouge pas : c'est une donnée de provenance. Voir
  //    `habillerLesVignettes`, qui porte toute la règle et ses tests.
  const habillage = habillerLesVignettes(
    versets.map((v) => v.id_verset), indexBlocs, indexIllustrations,
  )
  // ⛔ L'AXE DE LECTURE de la page : le bloc de texte, la colonne d'actions
  // EXCLUE du centrage. Le titre du chapitre et les rangées de verset s'y posaient
  // déjà ; les blocs éditoriaux, les pièces liminaires et les notes se centraient,
  // eux, sur toute la colonne de lecture. Mesuré le 2026-08-28 : trois axes dans la
  // même page, à 503, 495,5 et 514,5 pixels. L'auteur l'a vu sur « Du même auteur »,
  // qui ne tombait pas sous « Genèse ».
  //
  // ⚠️ La géométrie vit ICI, jamais sur le bloc : celui-ci porte ses propres marges
  // horizontales (12 % pour un préambule, zéro pour un sous-titre de partie), et
  // les mêler aurait fait dépendre l'axe du genre du bloc.
  //
  // ⚠️ Un seul enfant par cellule : les règles de voisinage de `globals.css`
  // (`.verset-row + .cs-bible-axe > .cs-bible-bloc`) traversent l'enveloppe, et
  // elles ne le peuvent que si le bloc en est l'enfant DIRECT.
  const surAxeTexte = (contenu: React.ReactNode, cle?: string) => mobile ? contenu : (
    <div key={cle} className="cs-bible-axe" style={styleAxeTexte()}>
      {contenu}
      <div />
    </div>
  )

  const rendreFluxEditorial = (
    blocs: readonly BibleEditionDisplayBodyBlock[],
    toutesIllustrations: readonly BibleEditionDisplayAsset[],
  ) => {
    const illustrations = toutesIllustrations.filter((a) => !habillage.absorbees.has(a.id))
    return [
      ...blocs.map((bloc) => ({ kind: 'block' as const, materialOrder: bloc.materialOrder, id: bloc.id, value: bloc })),
      ...illustrations.map((illustration) => ({
        kind: 'illustration' as const,
        materialOrder: illustration.materialOrder,
        id: illustration.id,
        value: illustration,
      })),
    ]
      .sort((a, b) => a.materialOrder - b.materialOrder || a.id.localeCompare(b.id, 'fr'))
      .map((item, i, items) => {
        // Un bloc de SUITE — le paragraphe suivant d'un même développement, que
        // la donnée a coupé en blocs — ne rouvre pas le blanc de son rang
        // (`estSuiteDuBloc`). Une gravure entre deux blocs rompt la suite : elle
        // rompt déjà leur voisinage.
        const precedent = i > 0 ? items[i - 1] : null
        const suite = item.kind === 'block' && precedent?.kind === 'block' && estSuiteDuBloc(precedent.value, item.value)
        return surAxeTexte(item.kind === 'block'
          ? (
              <BlocEditorialBible
                key={`bloc:${item.id}`}
                bloc={item.value}
                illustrations={indexIllustrations.byBodyBlock.get(item.id) ?? []}
                habillage={habillage.parBloc.get(item.id) ?? []}
                suite={suite}
              />
            )
          : <IllustrationBible key={`illustration:${item.id}`} illustration={item.value} />, `axe:${item.id}`)
      })
  }
  // ⛔ LES NOTES DE L'ÉDITION ET CELLES DES VERSETS S'APPELLENT DE LA MÊME FAÇON (charte
  // § 13.22) : une note de `versets_v2` arrive avec sa ligne et son numéro, posés par la page.
  const notesParCanon = new Map<string, BibleEditionDisplayNote[]>()
  for (const note of [...(editionChapter?.notes ?? []), ...(notesDesVersets?.[traduction] ?? [])]) {
    const notes = notesParCanon.get(note.canonId) ?? []
    notes.push(note)
    notesParCanon.set(note.canonId, notes)
  }
  for (const notes of notesParCanon.values()) {
    notes.sort((a, b) => a.displayNumber - b.displayNumber || a.materialOrder - b.materialOrder)
  }
  // Les appels posés à une même ancre se lisent « 2 & 3 », comme partout (charte § 13.7).
  const appelerEnSuite = (notes: readonly BibleEditionDisplayNote[]) => notes.map((note, rang) => (
    <Fragment key={note.id}>
      {rang > 0 && <span style={styleSeparateurAppels()}>{separateurAppels(rang, notes.length)}</span>}
      <AppelNoteBiblique note={note} figures={figuresDeLaNote(indexIllustrations.byNote.get(note.id))} />
    </Fragment>
  ))
  // Chapitre entièrement absent du témoin (ex. 1 Samuel 1 dans la Bible 899) : au lieu
  // d'aligner autant de « [Lacune du manuscrit] » que de versets attendus, on donne UNE
  // mention de chapitre. On ne le fait qu'en contexte 899 (toutes les lignes en sont) et
  // seulement si au moins une ligne existe.
  const chapitreToutLacune = versets.length > 0 && versets.every(v => estLigne899(v) && estLacune899(v))

  // ── LE LASSO ───────────────────────────────────────────────────────────────
  // Tirer un cadre depuis le blanc de la page sélectionne plusieurs versets, qu'on
  // enregistre ou qu'on copie d'un coup (app/components/LassoLecture.tsx).
  // ⛔ Ne se sélectionne que ce qui s'enregistre un par un : un verset qui porte son texte
  // dans une traduction du canon. Les lignes recomposées d'une édition n'ont pas d'actions,
  // et le lasso ne leur en prête pas.
  // ⚠️ La clé est l'identifiant du verset, non son numéro : une glose partage le numéro
  // de son hôte.
  const lassoActif = !mobile && !sansSurvol && !pieceAffichee && !chapitreToutLacune
  const texteDuVerset = (v: Verset) => String(overrides[v.id_verset]?.[traduction] ?? v[traduction] ?? '')
  const versetsParId = new Map(versets.map(v => [v.id_verset, v]))
  const versetsDuLasso = (cles: readonly string[]) =>
    cles.map(cle => versetsParId.get(cle)).filter((v): v is Verset => v !== undefined)
  const abreviationLivre = ABREV_FR[livreActif] || livreActif
  const numerosEnregistres = (cles: readonly string[]) =>
    [...new Set(versetsDuLasso(cles).map(v => v.verset).filter(n => sauvegardes.has(n)))]

  const enregistrerLasso = async (cles: readonly string[]): Promise<number | null> => {
    if (!exigerCompte('enregistrer ces versets') || !userId) return null
    const vus = new Set<number>()
    const aEcrire = versetsDuLasso(cles).filter(v => {
      if (sauvegardes.has(v.verset) || vus.has(v.verset)) return false
      vus.add(v.verset)
      return true
    })
    if (aEcrire.length === 0) return 0
    const { data, error } = await supabase.from('prelevements').insert(aEcrire.map(v => ({
      user_id: userId, type: 'biblique',
      ref_livre: nomLivre, ref_livre_abr: abreviationLivre,
      ref_chapitre: chapitreActif, ref_verset: v.verset,
      texte: texteDuVerset(v), traduction: traductionLabel,
    }))).select('id, ref_verset')
    if (error) throw error
    setSauvegardes(prev => {
      const suite = new Map(prev)
      for (const ligne of (data ?? []) as { id: string; ref_verset: number }[]) suite.set(ligne.ref_verset, ligne.id)
      return suite
    })
    signalerProgression()
    return aEcrire.length
  }

  // ⚠️ Le retrait vise la clé NATURELLE — ce lecteur, ce chapitre, ces versets —, comme le
  // signet le montre : un verset se montre prélevé quelle que soit la traduction retenue.
  const retirerLasso = async (cles: readonly string[]): Promise<number | null> => {
    if (!userId) return null
    const numeros = numerosEnregistres(cles)
    if (numeros.length === 0) return 0
    const { error } = await supabase.from('prelevements').delete()
      .eq('user_id', userId).eq('type', 'biblique')
      .eq('ref_livre_abr', abreviationLivre).eq('ref_chapitre', chapitreActif)
      .in('ref_verset', numeros)
    if (error) throw error
    setSauvegardes(prev => {
      const suite = new Map(prev)
      for (const n of numeros) suite.delete(n)
      return suite
    })
    return numeros.length
  }

  // La citation d'une sélection : « … » (Gn 1, 3-5.7), une élision là où un verset manque.
  const copierLasso = async (cles: readonly string[]) => {
    const choisis = versetsDuLasso(cles)
    if (choisis.length === 0) return
    await copierCitation(citationBiblique(
      texteDesVersets(choisis.map(v => ({ numero: v.verset, texte: texteDuVerset(v) }))),
      `${ABREV_FR[livreActif] || nomLivre} ${chapitreActif}, ${referenceDesVersets(choisis.map(v => v.verset))}`,
    ))
  }

  return (
    <div className={mobile ? 'flex flex-col' : 'flex-1 flex flex-col h-full overflow-hidden'} style={{ background: 'var(--cs-fond)', ...(mobile ? { width: '100%', paddingTop: '2.875rem', paddingBottom: `calc(0.75rem + ${BANDEAU_NAV_MOBILE})` } : {}) }}>

      {/* En-tête. `data-visite` : le repère de la visite guidée
          (app/lib/visiteBibleClassique.ts). L'étape parle des DEUX choses que ce bloc
          porte — le passage ouvert et le menu des bibles —, et il n'en existe pas de
          plus petit qui les tienne toutes deux. */}
      <div data-visite="entete-lecture" style={{ borderBottom: '1px solid var(--cs-bord)', background: 'var(--cs-fond)', padding: '14px 32px 10px' }}>

        {/* Titre + navigation chapitres. Calé sur LE MÊME gabarit que les versets
            (bloc de texte de 500 px + colonne d'actions de 38 px) : le titre est centré
            sur la seule première colonne — donc sur le bloc vert de sélection —, la colonne
            des boutons (signaler, prélever…) étant exclue du centrage.
            ⛔ IL NE PARAÎT PAS AU DOIGT (décision de l'auteur, 2026-09-20 : « supprimer le
            "Genèse ❧ Chapitre 1" en haut de page, et conserver le menu de sélection de la
            traduction »). Sur un écran étroit, il prend une bande entière pour dire ce que
            le volet des livres et le bandeau du bas disent déjà — et ce dernier porte les
            mêmes flèches de chapitre : rien ne se perd. */}
        {!mobile && (
        <div style={{ width: mobile ? '100%' : 'min(var(--mesure-ligne), 100%)', margin: '0 auto', display: mobile ? 'block' : 'grid', gridTemplateColumns: `minmax(0, var(--mesure-bloc)) ${GOUTTIERE_ACTIONS_VERSET}`, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
          {/* Les deux flèches viennent de `FlecheChapitre` : à une borne (Gn 1, Gn 50)
              le chevron reste en place, grisé et inerte, sans navigation ni attente. */}
          <FlecheChapitre livre={livreActif} chapitre={chapitreActif} sens="precedent" variante="entete" onAller={allerAuChapitre} />

          <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontWeight: 'normal', margin: 0, display: 'flex', alignItems: 'baseline', gap: '10px', lineHeight: INTERLIGNE_TITRE_CHAPITRE }}>
            {/* La marque suit le titre du chapitre comme elle suit le nom au volet : un
                lecteur qui arrive par un lien direct n'a jamais vu le volet. */}
            <span style={{ fontSize: '1.25rem', color: 'var(--cs-encre-fonce)', letterSpacing: '0.01em' }}>
              {nomLivre}{estLivreNonCanonique(livreActif) && <MarqueNonCanonique />}
            </span>
            <span style={{ color: '#b0a088', fontSize: '1.25rem', lineHeight: 1 }}>❧</span>
            {/* ⛔ PAS DE VERT DANS CE TITRE (décision de l'auteur, 2026-08-30). Le rang
                de chapitre portait `--cs-vert`, qui jurait contre le fleuron chaud posé
                juste avant. Il prend le DORÉ-GRIS du site : la teinte de l'or à moitié
                chroma, celle-là même que le fleuron porte en plus pâle.
                ⚠️ `--cs-or` ne peut pas servir ici : 3,67 sur le papier, quand un texte
                de 17 px en demande 4,5. Le doré-gris rend 5,37 au Clair et 5,78 au Cuir.
                ⚠️ Ce jeton est nommé pour la voix de l'ÉDITEUR (charte, `--cs-mention`) :
                le site n'a qu'un doré-gris, et le partager vaut mieux que d'en dupliquer
                la valeur sous un second nom. Qui le retouchera pour une cellule de
                comparaison déplacera ce titre avec. */}
            <span style={{ fontSize: '1.0625rem', color: 'var(--cs-mention)', fontStyle: 'italic' }}>Chapitre {chapitreActif}</span>
          </h1>

          <FlecheChapitre livre={livreActif} chapitre={chapitreActif} sens="suivant" variante="entete" onAller={allerAuChapitre} />
        </div>
          <div />
        </div>
        )}

        {/* Séparateur fin + choix de traduction : petits filets de part et d'autre.
            Calé sur LE MÊME gabarit que le titre « Genèse ❧ Chapitre 1 » (bloc texte
            de 500 px + colonne d'actions de 38 px exclue du centrage), pour que le menu
            se centre sur le même axe que le titre, et non sur la pleine largeur. */}
        <div style={{ width: mobile ? '100%' : 'min(var(--mesure-ligne), 100%)', margin: mobile ? 0 : `${BLANC_TITRE_MENU} auto 0`, display: mobile ? 'block' : 'grid', gridTemplateColumns: `minmax(0, var(--mesure-bloc)) ${GOUTTIERE_ACTIONS_VERSET}`, alignItems: 'center' }}>
          <SelecteurTraductionBible
            traductions={traductions}
            traductionIndex={traductionIndex}
            setTraductionIndex={setTraductionIndex}
          />
          <div />
        </div>

      </div>

      {/* ⛔ `scrollbar-gutter: stable both-edges` : l'en-tête est HORS de ce
          défileur, tout le reste dedans. La barre de défilement mesurée à 15 px
          rétrécissait le défileur d'autant, et tout ce qui s'y centre glissait de
          7,5 px à gauche du titre. Réservée des DEUX côtés, la gouttière laisse le
          contenu centré sur le même axe que l'en-tête, barre visible ou non. */}
      <div ref={refDefileur} className={mobile ? '' : 'overflow-y-auto flex-1'} style={{ paddingTop: '20px', paddingBottom: '20px', ...(mobile ? {} : { scrollbarGutter: 'stable both-edges' }) }}>
        {/* `cs-lecture-colonne` : ce qui s'efface et paraît quand on passe d'un texte à
            l'autre (voir `BibleLayout`, « passage »). L'en-tête, lui, ne bouge pas. */}
        <div className="cs-lecture-colonne" data-colonne-lecture="" style={{ maxWidth: 'var(--mesure-page)', margin: '0 auto', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
          <style>{`
            .verset-row:hover { background: rgba(var(--cs-vert-rgb),0.05); }
            .verset-row:hover .bouton-action-verset { opacity: 1 !important; }
            .verset-row--actif .bouton-action-verset { opacity: 0.5; }
            /* ⛔ La densité ne paraît qu'au SURVOL, avec les actions dont elle ferme la
               rangée (décision de l'auteur, 2026-09-13). Ni au repos, ni sur le verset
               retenu : c'est la ligne qu'on vise qui la demande. */
            .marque-densite { opacity: 0; transition: opacity 0.12s; }
            .verset-row:hover .marque-densite { opacity: 1; }
            /* Les flèches encadrent le titre : elles prennent sa teinte, non le vert. */
            .nav-chap-arrow:hover { color: var(--cs-mention) !important; }
            /* Mobile : dans le pavé flottant (appui long), les boutons sont pleins. */
            @media (max-width: 900px) { .verset-actions .bouton-action-verset { opacity: 1 !important; } }
            /* ⛔ Et sur TOUT écran tactile, quelle que soit sa largeur. Le repli par la
               largeur laissait les actions à « opacity: 0 » sur une tablette de 1024px en
               paysage, où le drapeau mobile est faux : ni pavé flottant, ni survol possible, donc
               des boutons présents et invisibles. Le critère est la CAPACITÉ du pointeur,
               comme pour « useSansSurvol » (audit de responsiveness, 2026-09-06). */
            @media (hover: none) { .bouton-action-verset { opacity: 1 !important; } }
          `}</style>

          {pieceAffichee ? surAxeTexte(
            <PieceLiminaire
              titre={pieceAffichee.titre}
              portee={pieceAffichee.portee}
              blocs={pieceAffichee.contenu.bodyBlocks}
              illustrationsParBloc={indexerIllustrations(pieceAffichee.contenu.assets).byBodyBlock}
              bibliographie={pieceAffichee.bibliographie}
              /* ⛔ Aucun RETOUR en pied de pièce (décision de l'auteur, 2026-08-28).
                 Il disait « Revenir à Luc 1 » sous chaque apparat, et c'était un
                 objet de plus pour un geste que le volet fait déjà : l'onglet
                 « Livres » rend le chapitre, et il le rend TEL QU'ON L'AVAIT
                 LAISSÉ, le livre et le chapitre n'ayant jamais quitté l'adresse.
                 Les flèches de chapitre y ramènent aussi.
                 ⚠️ `urlRetour` reste une propriété OPTIONNELLE de PieceLiminaire,
                 et son rendu est gardé par elle : ne rien passer suffit à ne rien
                 rendre. Ne pas retirer la propriété du composant, qui sert aussi
                 la fenêtre de note. */
            />,
          ) : (<>

          {rendreFluxEditorial(indexBlocs.opening, indexIllustrations.opening)}

          {(versets.length === 0 || versets.every(v => !v[traduction] && !estLigne899(v))) && (
            /* ⛔ PLUS DE GRAVURE ICI (demande de l'auteur, 2026-09-04 : « supprimer le
               dessin »). La cité ruinée occupait soixante pour cent de la hauteur pour dire
               ce qu'une phrase dit mieux, et l'écran se rencontre désormais plus souvent :
               la barre rouvre la Bible sur le DERNIER livre lu, qui n'est pas toujours dans
               la bible qu'on retrouve. Un état qu'on traverse ne se compose pas comme une
               page de titre. La planche passe en réserve (voir l'inventaire des
               illustrations). ⚠️ La mention, elle, reste : c'est elle qu'on lisait. */
            <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.8125rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)', textAlign: 'center', lineHeight: 1.65, margin: '0 auto', padding: '18vh 16px 0', maxWidth: '21.25rem' }}>
              La traduction <em style={{ fontStyle: 'normal', color: 'var(--cs-texte-second)' }}>{traductionLabel}</em> ne comporte pas ce livre.
            </p>
          )}

          {/* Chapitre entièrement absent du témoin : une mention unique, sobre, au lieu
              d'un mur de « [Lacune du manuscrit] ». Rien d'autre, ni ornement ni glose :
              la mention se suffit à elle-même.
              Calée sur LE MÊME gabarit que le titre « Genèse ❧ Chapitre 1 » (bloc de
              texte + colonne d'actions exclue du centrage) : sans cela, la mention se
              centrerait sur la pleine largeur et pendrait à droite de l'axe du titre. */}
          {chapitreToutLacune && (
            <div style={{ width: mobile ? '100%' : 'min(var(--mesure-ligne), 100%)', margin: '0 auto', display: mobile ? 'block' : 'grid', gridTemplateColumns: `minmax(0, var(--mesure-bloc)) ${GOUTTIERE_ACTIONS_VERSET}` }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', minHeight: '50vh', padding: '11vh 16px 0', textAlign: 'center' }}>
                {/* La voix des mentions, encre comprise (décision du 14 septembre 2026) : le
                    chapitre perdu se dit comme la case « Absent de cette traduction », à la
                    taille près, qui reste celle d'une mention de page. */}
                <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1rem', fontStyle: 'italic', letterSpacing: '0.02em', color: 'var(--cs-mention)', margin: 0 }}>
                  Lacune du manuscrit
                </p>
              </div>
              <div />
            </div>
          )}

          {/* On n'affiche QUE les versets réellement portés par cette traduction : une
              édition qui compte moins de versets qu'une autre (Job 25 s'arrête au v. 6
              chez Sacy) ne doit pas laisser des lignes vides à numéro. */}
          {/* ⛔ Un verset que la traduction ne porte pas reste caché, SAUF s'il porte une
              note : l'appel est le seul chemin vers une note de verset depuis le
              13 septembre 2026, et la note dit justement pourquoi le verset manque. Il
              paraît alors en « — », avec son appel. */}
          {!chapitreToutLacune && versets.filter(v => estLigne899(v) || v[traduction] || notesParCanon.has(v.id_verset)).map(v => {
            const actif = versetSelectionne?.id_verset === v.id_verset
            const ligne899 = estLigne899(v)
            const ligneEditoriale = estLigneEditoriale(v)
            const ligneSource = ligne899 || ligneEditoriale
            const lacune = estLacune899(v)
            const blocsAvant = indexBlocs.beforeByCanon.get(v.id_verset) ?? []
            const blocsApres = indexBlocs.afterByCanon.get(v.id_verset) ?? []
            const illustrationsAvant = indexIllustrations.beforeByCanon.get(v.id_verset) ?? []
            const illustrationsApres = indexIllustrations.afterByCanon.get(v.id_verset) ?? []
            const notesDuVerset = notesParCanon.get(v.id_verset) ?? []
            // ⛔ Un appel se pose à l'ANCRE que la donnée déclare ; sans ancre lisible, il suit le verset.
            const appelsDuVerset = repartirAppels(!lacune && !ligne899 ? texteDuVerset(v) : '', notesDuVerset)
            const dansLeLasso = lassoActif && !ligneSource && !lacune && Boolean(overrides[v.id_verset]?.[traduction] ?? v[traduction])
            return (
            <Fragment key={v.id_verset}>
            {rendreFluxEditorial(blocsAvant, illustrationsAvant)}
            <div
              id={`verset-${v.verset}`}
              onClick={() => {
                const incrementer = () => fetch('/api/versets/incrementer-lecture', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id_verset: v.id_verset }),
                }).catch(() => {})
                if (mobile) {
                  // Sur mobile, un tap sélectionne le verset ET fait apparaître
                  // immédiatement le pavé d'actions ; un second tap referme.
                  // Les lignes recomposées ne ciblent pas `versets_v2` : pas de comptage
                  // de lecture ni de pavé d'actions tant que ces routes ne les acceptent pas.
                  if (actif) { setVersetSelectionne(null); setActionsMobileId(null) }
                  else { if (!ligneSource) { incrementer(); setActionsMobileId(v.id_verset) } setVersetSelectionne(v) }
                  return
                }
                if (!actif && !ligneSource) incrementer()
                setVersetSelectionne(actif ? null : v)
              }}
              className={`verset-row${actif ? ' verset-row--actif' : ''}`}
              data-oeuvres={densites.get(v.id_verset)?.oeuvres}
              style={styleRangeeVerset({ mobile })}>

              <div style={styleGrilleRangee({ mobile })}>
                <div className="verset-bloc" data-lasso-verset={dansLeLasso ? v.id_verset : undefined} style={styleBlocVerset({ actif, mobile })}>
                  {/* Numéro — inclus dans le bloc sélectionné, aligné sur la 1re ligne du texte (ligne de base) */}
                  <span style={STYLE_NUMERO_VERSET}>
                    {v.verset}
                    {v.chapitre_alternatif != null && (
                      <span style={STYLE_NUMERO_ALTERNATIF}>
                        {' '}({v.chapitre_alternatif}{v.verset_alternatif != null ? `, ${v.verset_alternatif}` : ''})
                      </span>
                    )}
                  </span>

                  {/* Texte — colonne fixe et stable, alignée quel que soit l'état des boutons.
                      TR0009 : lacune du manuscrit rendue explicitement ; marqueurs éditoriaux
                      inline (lecture incertaine, ajout marginal) rendus discrètement. Aucun
                      statut technique d'alignement n'est montré au lecteur. */}
                  <p data-verse-text lang={ligne899 ? 'fro' : undefined} style={styleTexteVerset({ mobile })}>
                    {lacune ? (
                      // Verset isolé absent du témoin (chapitre par ailleurs porté). Italique
                      // de labeur, capitale initiale, teinte effacée : signalé sans peser.
                      <span title="Lacune matérielle du manuscrit" style={STYLE_LACUNE}>Lacune du manuscrit</span>
                    ) : (overrides[v.id_verset]?.[traduction] ?? v[traduction]) ? (
                      ligne899
                        ? rendreMarqueurs899(String(v[traduction] ?? ''))
                        : rendreTexteAvecAppels(texteDuVerset(v), appelsDuVerset.groupes, (morceau) => rendreTexteEnrichi(
                            morceau,
                            // La traduction moderne du témoin porte ses lacunes en clair
                            // (« […] ») : elles se mettent en forme comme dans la colonne du
                            // manuscrit, sans que le reste de l'enrichissement soit touché.
                            lacunesEnClair ? marquerLacunesDuTemoin : undefined,
                          ), appelerEnSuite)
                    ) : (
                      <span style={STYLE_VERSET_VIDE}>—</span>
                    )}
                    {appelsDuVerset.aLaSuite.map((note) => (
                      <AppelNoteBiblique key={note.id} note={note} figures={figuresDeLaNote(indexIllustrations.byNote.get(note.id))} />
                    ))}
                  </p>
                  {/* ⛔ PAS DE MARQUE DE DENSITÉ AU DOIGT (décision de l'auteur, 2026-09-20 :
                      « supprimer, en mode mobile, le "10 œuvres en parlent" qui décale tout »).
                      Elle se posait en fin de bloc, en toutes lettres, et sa ligne repoussait le
                      verset suivant : une mention de service coûtait au texte la place qu'un
                      écran étroit n'a pas. Le volet de droite dit la même chose, et mieux, dès
                      qu'on touche le verset. ⚠️ La marque du bureau, elle, reste : c'est un
                      chiffre nu posé dans une marge qui existe là (voir `marque-densite`). */}
                </div>

                {/* Boutons d'action — hors du bloc sélectionné. Sur mobile, ils
                    sortent de la grille : pavé flottant en haut à droite du
                    verset, montré seulement après un appui long. */}
                <div className="verset-actions" style={mobile ? {
                  // Au-dessus du verset (et non sur lui) : le texte reste lisible.
                  position: 'absolute', bottom: '100%', right: '0.25rem', marginBottom: '3px', zIndex: 6,
                  display: actionsMobileId === v.id_verset ? 'flex' : 'none', alignItems: 'center', gap: '0.25rem',
                  background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', boxShadow: 'var(--cs-ombre-flottante)', padding: '0.25rem 0.375rem',
                } : { width: GOUTTIERE_ACTIONS_VERSET, paddingLeft: RETRAIT_ACTIONS_VERSET, display: 'flex', alignItems: 'flex-start', gap: 0, paddingTop: '0.28125rem', overflow: 'visible', position: 'relative' }}>
                  {/* Les actions écrivent encore dans le modèle `versets_v2`. On les masque
                      pour toutes les lignes éditoriales recomposées ; la colonne reste
                      réservée pour préserver l'alignement de la mise en page. */}
                  {!ligneSource && (
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
                  {/* ⛔ La marque de densité FERME la rangée d'actions, et ne paraît qu'au
                      survol (feuille ci-dessus). Elle ne se rend pas du tout quand elle ne
                      tient pas dans la zone de lecture : une opacité nulle déborderait
                      quand même du défileur. Voir marqueDensiteTient (compositionBible). */}
                  {!mobile && densiteTient && densites.get(v.id_verset) && (
                    <span className="marque-densite" title={libelleDensiteVerset(densites.get(v.id_verset)!)}
                      style={styleDensiteVerset()}>
                      {densites.get(v.id_verset)!.oeuvres}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {rendreFluxEditorial(blocsApres, illustrationsApres)}
            </Fragment>
            )
          })}
          {rendreFluxEditorial(indexBlocs.closing, indexIllustrations.closing)}
          </>)}
        </div>
      </div>
      <LassoLecture
        zone={refDefileur}
        defileur={refDefileur}
        actif={lassoActif}
        contexte={`${livreActif}|${chapitreActif}|${traduction}`}
        selecteurCibles="[data-lasso-verset]"
        cleDe={element => element.getAttribute('data-lasso-verset')}
        surbrillance={cle => `[data-lasso-verset="${cle}"]`}
        horsLasso=".verset-row, .cs-bible-bloc"
        unite={UNITE_VERSETS}
        gouttiere={GOUTTIERE_ACTIONS_VERSET}
        dejaEnregistres={cles => numerosEnregistres(cles).length}
        onEnregistrer={enregistrerLasso}
        onRetirer={retirerLasso}
        onCopier={copierLasso}
      />
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
