'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { supabase } from '@/app/lib/supabase'
import { rendreMarquesNote, type ElementPanneau } from './texteEnrichiEssai'
import { inlineVersHtml, htmlVersSyntaxe } from './serialisationEssai'

// ── Zone de rédaction d'une note : UNE seule zone, éditable et WYSIWYG ─────────
// On y écrit, on enrichit (gras, italique, petites capitales, exposant) et l'on
// voit la mise en forme immédiatement — plus d'aperçu séparé ni de syntaxe brute.
const BTN_NOTE: CSSProperties = {
  fontSize: '0.6875rem', width: 26, height: 24, display: 'inline-flex', alignItems: 'center',
  justifyContent: 'center', border: '1px solid #d6d0c4', borderRadius: 4, background: '#fff',
  color: '#2a2520', cursor: 'pointer', lineHeight: 1, fontFamily: 'inherit',
}

function EditeurNoteWysiwyg({ valeur, mode, onChange, onEnregistrer }: {
  valeur: string; mode: 'creation' | 'modification'; onChange: (s: string) => void; onEnregistrer: (s: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const chargeRef = useRef(false)

  // Contenu initial posé UNE fois (la zone n'est pas contrôlée : on ne la réécrit
  // pas à chaque frappe, sinon le curseur sauterait).
  useEffect(() => {
    if (ref.current && !chargeRef.current) {
      ref.current.innerHTML = valeur.trim() ? inlineVersHtml(valeur) : ''
      chargeRef.current = true
      ref.current.focus()
    }
  }, [valeur])

  const synchroniser = () => { if (ref.current) onChange(htmlVersSyntaxe(ref.current.innerHTML)) }
  const commande = (cmd: string) => { ref.current?.focus(); document.execCommand(cmd); synchroniser() }
  const petitesCapitales = () => {
    ref.current?.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.getRangeAt(0).collapsed) return
    const r = sel.getRangeAt(0)
    const span = document.createElement('span')
    span.style.fontVariant = 'small-caps'; span.style.letterSpacing = '0.02em'
    span.appendChild(r.extractContents()); r.insertNode(span)
    sel.removeAllRanges()
    synchroniser()
  }
  const valeurCourante = () => (ref.current ? htmlVersSyntaxe(ref.current.innerHTML) : valeur)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <style>{`.note-zone:empty:before { content: attr(data-placeholder); color: #b0a89e; font-style: italic; }`}</style>
      {/* Barre d'enrichissement : agit sur la sélection, dans la zone même. */}
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => commande('bold')} title="Gras" style={{ ...BTN_NOTE, fontWeight: 700 }}>G</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => commande('italic')} title="Italique" style={{ ...BTN_NOTE, fontStyle: 'italic' }}>I</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={petitesCapitales} title="Petites capitales" style={{ ...BTN_NOTE, fontVariant: 'small-caps', letterSpacing: '0.03em' }}>Pc</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => commande('superscript')} title="Exposant" style={BTN_NOTE}>x<sup style={{ fontSize: '0.7em' }}>2</sup></button>
      </div>
      {/* Zone UNIQUE, éditable, WYSIWYG. */}
      <div ref={ref} className="note-zone" contentEditable suppressContentEditableWarning
        onInput={synchroniser} data-placeholder="Texte de la note…"
        style={{ minHeight: '5.5em', fontSize: '0.8125rem', lineHeight: 1.55, color: '#2a2520', fontFamily: 'var(--font-source-serif), Georgia, serif', border: '1px solid #d6d0c4', borderRadius: '6px', background: '#fff', padding: '9px 10px', outline: 'none', overflowY: 'auto' }} />
      <button onClick={() => onEnregistrer(valeurCourante())}
        style={{ alignSelf: 'flex-end', fontSize: '0.71875rem', padding: '6px 14px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
        {mode === 'creation' ? 'Insérer la note' : 'Enregistrer la note'}
      </button>
    </div>
  )
}

type Props = {
  element: ElementPanneau | null
  onFermer: () => void
  toujoursVisible?: boolean
  inline?: boolean
  enTete?: ReactNode
  editionNote?: { actif: boolean; mode: 'creation' | 'modification' }
  onEnregistrerNote?: (texte: string) => void
}

export default function VoletEssai({ element, onFermer, toujoursVisible, inline, enTete, editionNote, onEnregistrerNote }: Props) {
  const [contenu, setContenu] = useState<string | null>(null)
  const [texteNote, setTexteNote] = useState('')
  const [chargement, setChargement] = useState(false)
  const [elementInterne, setElementInterne] = useState<ElementPanneau | null>(null)
  const elementActif = elementInterne ?? element
  // Change à chaque ouverture d'un nouvel élément : sert de `key` à la zone
  // éditable pour la recharger (sans réinitialiser pendant la frappe).
  const [cleEdition, setCleEdition] = useState(0)

  useEffect(() => {
    setElementInterne(null)
    setCleEdition(k => k + 1)
  }, [element])

  useEffect(() => {
    if (!elementActif) return
    if (elementActif.type === 'note') {
      setContenu(elementActif.texte)
      setTexteNote(elementActif.texte)
      return
    }
    setChargement(true)
    setContenu(null)
    if (elementActif.type === 'verset') {
      supabase.from('versets_lecture').select('TR0002').eq('id_verset', elementActif.id).single()
        .then(({ data }) => { setContenu(data?.TR0002 ?? '(verset introuvable)'); setChargement(false) })
    } else {
      supabase.from('segments').select('segment_texte').eq('id', elementActif.id).single()
        .then(({ data }) => { setContenu(data?.segment_texte ?? '(segment introuvable)'); setChargement(false) })
    }
  }, [elementActif])

  // Segments hors renvoi : gras, italique, petites capitales, exposant.
  const rendreTexteSimple = (t: string, base: number): ReactNode[] => rendreMarquesNote(t, base)

  const rendreNote = (texte: string) => {
    const morceaux: ReactNode[] = []
    const regex = /\[(.+?)\]\((verset|segment):(.+?)\)/g
    let dernier = 0, k = 0, m: RegExpExecArray | null
    while ((m = regex.exec(texte))) {
      if (m.index > dernier) morceaux.push(...rendreTexteSimple(texte.slice(dernier, m.index), k))
      const [, label, type, id] = m
      morceaux.push(
        <button key={k++} onClick={() => setElementInterne({ type: type as 'verset' | 'segment', id, label })}
          style={{ color: '#3d6b4f', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>
          {label}
        </button>
      )
      dernier = regex.lastIndex
    }
    if (dernier < texte.length) morceaux.push(...rendreTexteSimple(texte.slice(dernier), k))
    return morceaux
  }

  if (!elementActif && !toujoursVisible) return null

  const contenuVolet = (
    <>
      {enTete && <div style={{ marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid #ede9e2' }}>{enTete}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a958d' }}>
          {!elementActif ? 'Notes et citations' : elementActif.type === 'note' ? 'Note' : elementActif.type === 'verset' ? 'Référence biblique' : 'Référence patristique'}
        </span>
        {elementActif && !toujoursVisible && <button onClick={onFermer} style={{ background: 'none', border: 'none', color: '#b0a89e', cursor: 'pointer', fontSize: '0.875rem' }}>×</button>}
      </div>

      {!elementActif ? (
        <p style={{ fontSize: '0.75rem', color: '#9a958d', fontStyle: 'italic', lineHeight: 1.6 }}>
          Cliquez sur une note ou une citation dans le texte pour l'afficher ici.
        </p>
      ) : (
        <>
          {elementInterne && (
            <button onClick={() => setElementInterne(null)} style={{ fontSize: '0.6875rem', color: '#3d6b4f', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '8px' }}>← Retour à la note</button>
          )}
          {elementActif.type !== 'note' && (
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3d6b4f', marginBottom: '10px' }}>{elementActif.label}</p>
          )}
          {chargement ? (
            <p style={{ fontSize: '0.75rem', color: '#9a958d', fontStyle: 'italic' }}>Chargement...</p>
          ) : elementActif.type === 'note' && editionNote?.actif && onEnregistrerNote ? (
            <EditeurNoteWysiwyg
              key={cleEdition}
              valeur={elementActif.texte}
              mode={editionNote.mode}
              onChange={setTexteNote}
              onEnregistrer={onEnregistrerNote}
            />
          ) : (
            <p style={{ fontSize: '0.84375rem', color: '#2a2520', lineHeight: 1.55, fontStyle: 'normal', whiteSpace: 'pre-wrap' }}>
              {elementActif.type === 'note' ? rendreNote(contenu ?? '') : contenu}
            </p>
          )}
        </>
      )}
    </>
  )

  if (inline) return <div style={{ padding: '14px 16px' }}>{contenuVolet}</div>

  return (
    <div style={{
      position: 'fixed', top: '3.5rem', right: 0, width: '20rem', height: 'calc(100vh - 3.5rem)',
      background: '#faf8f4', borderLeft: '1px solid #d6d0c4', padding: '20px', overflowY: 'auto',
      zIndex: 50, boxShadow: '-4px 0 16px rgba(0,0,0,0.06)',
    }}>
      {contenuVolet}
    </div>
  )
}
