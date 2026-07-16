'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import type { ElementPanneau } from './texteEnrichiEssai'

function ContenuNote({ el, profond, onNaviguer }: {
  el: ElementPanneau
  profond?: boolean
  onNaviguer: (cible: ElementPanneau) => void
}) {
  const [texte, setTexte] = useState<string | null>(el.type === 'note' ? el.texte : null)
  const [chargement, setChargement] = useState(el.type !== 'note')

  useEffect(() => {
    if (el.type === 'note') { setTexte(el.texte); setChargement(false); return }
    setChargement(true); setTexte(null)
    if (el.type === 'verset') {
      supabase.from('versets').select('TR0002').eq('id_verset', el.id).single()
        .then(({ data }) => { setTexte(data?.TR0002 ?? '(verset introuvable)'); setChargement(false) })
    } else {
      supabase.from('segments').select('segment_texte').eq('id', el.id).single()
        .then(({ data }) => { setTexte(data?.segment_texte ?? '(segment introuvable)'); setChargement(false) })
    }
  }, [el.type, el.type !== 'note' ? (el as { id: string }).id : ''])

  // Rend le texte de la note avec liens internes cliquables
  const rendreTexte = (s: string) => {
    const morceaux: React.ReactNode[] = []
    const regex = /\[(.+?)\]\((verset|segment):(.+?)\)/g
    let dernier = 0, k = 0, m: RegExpExecArray | null
    while ((m = regex.exec(s))) {
      if (m.index > dernier) morceaux.push(s.slice(dernier, m.index))
      const [, label, type, id] = m
      morceaux.push(
        <button key={k++} onClick={() => onNaviguer({ type: type as 'verset' | 'segment', id, label })}
          style={{ color: '#3d6b4f', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>
          {label}
        </button>
      )
      dernier = regex.lastIndex
    }
    if (dernier < s.length) morceaux.push(s.slice(dernier))
    return morceaux
  }

  if (chargement) return (
    <span style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
      <span className="essai-note-spinner" />
    </span>
  )

  if (el.type !== 'note') {
    return (
      <>
        <span style={{ display: 'block', fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#3d6b4f', marginBottom: '6px' }}>
          {el.type === 'verset' ? 'Référence biblique' : 'Référence patristique'}
        </span>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#3d6b4f', display: 'block', marginBottom: '5px' }}>{el.label}</span>
        <span style={{ fontSize: '11.5px', lineHeight: 1.5, color: '#2a2520' }}>{texte}</span>
      </>
    )
  }

  return (
    <span style={{ fontSize: '11.5px', lineHeight: 1.5, color: '#2a2520' }}>
      {texte !== null ? rendreTexte(texte) : null}
    </span>
  )
}

export default function NoteTooltip({ lettre, el, isRef }: {
  lettre: string
  el: ElementPanneau
  isRef?: boolean
}) {
  const [ouvert, setOuvert] = useState(false)
  const [fixe, setFixe] = useState(false)
  const [profondeur, setProfondeur] = useState<ElementPanneau>(el)
  const ref = useRef<HTMLSpanElement>(null)

  // Ferme si clic en dehors quand fixé
  useEffect(() => {
    if (!fixe) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) { setFixe(false); setOuvert(false); setProfondeur(el) }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [fixe, el])

  // Réinitialise la profondeur quand l'élément de base change
  useEffect(() => { setProfondeur(el) }, [el])

  const traiterEntrer = () => { if (!fixe) setOuvert(true) }
  const traiterSortir = () => { if (!fixe) setOuvert(false) }
  const traiterClic = (e: React.MouseEvent) => {
    e.stopPropagation()
    const prochainFixe = !fixe
    setFixe(prochainFixe)
    setOuvert(prochainFixe)
    if (!prochainFixe) setProfondeur(el)
  }

  const boutonStyle: React.CSSProperties = isRef
    ? { color: '#3d6b4f', cursor: 'pointer', background: 'none', border: 'none', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dotted', font: 'inherit' }
    : { color: fixe ? '#1e2e24' : '#3d6b4f', cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontSize: '0.78em', fontWeight: 600 }

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline' }}>
      {isRef ? (
        <button onMouseEnter={traiterEntrer} onMouseLeave={traiterSortir} onClick={traiterClic} style={boutonStyle}>
          {lettre}
        </button>
      ) : (
        <sup style={{ marginLeft: '0.08em' }}>
          <button onMouseEnter={traiterEntrer} onMouseLeave={traiterSortir} onClick={traiterClic} style={boutonStyle}>
            {lettre}
          </button>
        </sup>
      )}
      {ouvert && (
        <span style={{
          position: 'absolute',
          bottom: 'calc(100% + 5px)',
          left: isRef ? '0' : '50%',
          transform: isRef ? 'none' : 'translateX(-30%)',
          zIndex: 200,
          display: 'block',
          background: '#fff',
          border: '1px solid #d6d0c4',
          borderRadius: '5px',
          padding: '10px 12px',
          width: '230px',
          boxShadow: '0 3px 14px rgba(0,0,0,0.11)',
          pointerEvents: fixe ? 'auto' : 'none',
        }}>
          {profondeur !== el && (
            <button onClick={() => setProfondeur(el)}
              style={{ fontSize: '10px', color: '#3d6b4f', background: 'none', border: 'none', padding: '0 0 6px', cursor: 'pointer', display: 'block' }}>
              ← Retour
            </button>
          )}
          <ContenuNote el={profondeur} onNaviguer={cible => { setProfondeur(cible); setFixe(true); setOuvert(true) }} />
          {fixe && (
            <button onClick={() => { setFixe(false); setOuvert(false); setProfondeur(el) }}
              style={{ position: 'absolute', top: '4px', right: '6px', background: 'none', border: 'none', color: '#c0b8b0', cursor: 'pointer', fontSize: '13px', lineHeight: 1 }}>×</button>
          )}
        </span>
      )}
    </span>
  )
}
