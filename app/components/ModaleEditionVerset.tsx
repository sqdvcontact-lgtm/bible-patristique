'use client'

// ── LA FENÊTRE D'ÉDITION D'UN VERSET (administrateur réel, vérifié côté serveur) ──
//
// Sortie de `TexteBible` le 2026-09-22 pour être chargée au CLIC (`next/dynamic`) : elle
// ne sert qu'à l'administrateur, et son code pesait sur chaque lecture de la page Bible.
//
// ⚠️ Sa zone de saisie est justifiée SANS césure, et c'est voulu : un champ de saisie ne
// promet pas le rendu final (exemption nommée dans `densiteTypographique.test.ts`).

import { useEffect, useRef, useState } from 'react'
import { Z_MODALE } from '@/app/lib/empilement'
import { supabase } from '@/app/lib/supabase'
import { hrefSur } from '@/app/lib/liensSurs'
import { raccourcisEditeur, collageTexteBrut } from '@/app/lib/raccourcisEditeur'
import { useFermerAEchap } from '@/app/lib/useFermerAEchap'
import { useFenetreModale } from '@/app/lib/useFenetreModale'
import IconeCroix from '@/app/components/IconeCroix'
import { rendreEnrichi } from '@/app/lib/enrichissements'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'

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
    // ⛔ L'adresse passe par `hrefSur` (un `javascript:` ne devient pas un lien) et
    // s'ÉCHAPPE pour l'attribut : un guillemet y fermait `href` et ouvrait un attribut
    // de plus dans la zone éditable. Une adresse refusée reste du texte, telle qu'écrite,
    // pour que la conversion inverse la rende intacte.
    .replace(/\[(.+?)\]\((.+?)\)/g, (tout, libelle: string, adresse: string) => {
      const brute = adresse.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      const sure = hrefSur(brute)
      return sure ? `<a href="${echapperAttribut(sure)}">${libelle}</a>` : tout
    })
}

function echapperAttribut(valeur: string): string {
  return valeur.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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

// ── Modale d'édition d'un verset (admin réel, vérifié côté serveur) ──────────
export default function ModaleEditionVerset({ verset, traduction, traductionLabel, refCourt, valeurActuelle, onClose, onEnregistre }: {
  verset: { id_verset: string }; traduction: string; traductionLabel: string; refCourt: string; valeurActuelle: string
  onClose: () => void; onEnregistre: (nouvelleValeur: string) => void
}) {
  useFermerAEchap(true, onClose)
  const [valeur, setValeur] = useState(valeurActuelle)
  const [statut, setStatut] = useState<'idle' | 'envoi' | 'erreur'>('idle')
  const edRef = useRef<HTMLDivElement>(null)
  // Tab et Maj+Tab restent dans la fenêtre, et le foyer revient au crayon à la
  // fermeture. ⚠️ Pas de foyer initial : la zone d'édition le prend elle-même.
  const boiteRef = useRef<HTMLDivElement>(null)
  useFenetreModale(boiteRef, true, { foyerInitial: false })

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
    // ⛔ Aucun texte de remplissage : sans sélection, le curseur se pose entre les deux.
    const sel = window.getSelection()
    const texte = sel?.toString() ?? ''
    document.execCommand('insertText', false, `${avant}${texte}${apres}`)
    if (!texte) for (let i = 0; i < apres.length; i++) sel?.modify('move', 'backward', 'character')
    sync()
  }
  // Petites capitales : span dédié inséré autour de la sélection (pas de commande native).
  const petitesCaps = () => {
    const el = edRef.current; if (!el) return; el.focus()
    const sel = window.getSelection(); if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const texte = sel.toString()
    if (!texte) return
    range.deleteContents()
    const span = document.createElement('span')
    span.style.fontVariant = 'small-caps'; span.style.letterSpacing = '0.04em'; span.textContent = texte
    range.insertNode(span); sel.collapseToEnd(); sync()
  }

  const enregistrer = async () => {
    setStatut('envoi')
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      // ⛔ Pas de « Bearer undefined » : sans jeton, l'envoi n'a aucune chance.
      if (!token) { setStatut('erreur'); return }
      const res = await fetch('/api/admin/verset-modifier-canon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_verset: verset.id_verset, traduction, valeur }),
      })
      // ⚠️ Le verrou de bêta REDIRIGE au lieu de refuser : sa page revient en 200.
      if (!res.ok || res.redirected) { setStatut('erreur'); return }
      onEnregistre(valeur)
    } catch (erreur) {
      console.error('[édition verset]', erreur)
      setStatut('erreur')
    }
  }

  const btnEd: React.CSSProperties = { fontSize:'0.6875rem', padding:'4px 9px', borderRadius:'4px', border:'1px solid var(--cs-bord)', background:'var(--cs-surface)', color:'var(--cs-texte-fort)', cursor:'pointer' }
  const gardeSel = (e: React.MouseEvent) => e.preventDefault()

  // `Z_MODALE` : la fenêtre d'édition passe au-dessus des barres mobiles de la page
  // Bible (`Z_ONGLETS_LECTURE`, `Z_BANDEAU_LECTURE`), et sous la barre de navigation.
  return (
    <div style={{ position:'fixed', top:HAUTEUR_NAVBAR, left:0, right:0, bottom:0, background:'var(--cs-calque-modale)', zIndex:Z_MODALE, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={onClose}>
      <div ref={boiteRef} role="dialog" aria-modal="true" aria-label={`Modifier ${refCourt} de la ${traductionLabel}`}
        onClick={e => e.stopPropagation()} style={{ background:'var(--cs-surface)', borderRadius:'12px', padding:'20px 22px', width:'30rem', maxWidth:'100%', boxShadow:'var(--cs-ombre-modale)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
          <p style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--cs-attente)', margin:0 }}>
            Modifier {refCourt} de la {rendreEnrichi(traductionLabel)}
          </p>
          <button type="button" onClick={onClose} aria-label="Fermer" className="cs-croix-fermer"><IconeCroix /></button>
        </div>
        <div style={{ display:'flex', gap:'6px', marginBottom:'8px', flexWrap:'wrap' }}>
          <button onMouseDown={gardeSel} onClick={() => commande('bold')} style={{ ...btnEd, fontWeight:700 }}>G</button>
          <button onMouseDown={gardeSel} onClick={() => commande('italic')} style={{ ...btnEd, fontStyle:'italic' }}>I</button>
          <button onMouseDown={gardeSel} onClick={petitesCaps} title="Petites capitales" style={{ ...btnEd, fontSize:'0.625rem', fontVariant:'small-caps', letterSpacing:'0.04em' }}>Petites capitales</button>
          <button onMouseDown={gardeSel} onClick={() => commande('superscript')} title="Exposant" style={btnEd}>x²</button>
          <span style={{ width:'1px', background:'var(--cs-bord-clair)' }} />
          <button onClick={() => inserer('\u00A0')} title="Espace insécable" style={{ fontSize:'0.6875rem', padding:'4px 9px', borderRadius:'4px', border:'1px solid var(--cs-bord)', background:'var(--cs-surface)', color:'var(--cs-texte-fort)', cursor:'pointer' }}>Esp. insécable</button>
          <button onClick={() => inserer('\u202F')} title="Espace fine insécable" style={{ fontSize:'0.6875rem', padding:'4px 9px', borderRadius:'4px', border:'1px solid var(--cs-bord)', background:'var(--cs-surface)', color:'var(--cs-texte-fort)', cursor:'pointer' }}>Esp. fine</button>
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
          <button onClick={enregistrer} disabled={statut === 'envoi'} className="cs-bouton-plein cs-bouton-plein--compact">
            {statut === 'envoi' ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
