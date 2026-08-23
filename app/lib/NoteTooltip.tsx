'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'
import { rendreMarquesNote, type ElementPanneau } from './texteEnrichiEssai'

// La bulle devient fixe après 2,3 secondes de survol continu.
const DUREE_FIXATION = 2_300
const DELAI_FERMETURE = 200

function ContenuNote({ el, onNaviguer }: {
  el: ElementPanneau
  onNaviguer: (cible: ElementPanneau) => void
}) {
  const [texte, setTexte] = useState<string | null>(el.type === 'note' ? el.texte : null)
  const [chargement, setChargement] = useState(el.type !== 'note')

  useEffect(() => {
    if (el.type === 'note') { setTexte(el.texte); setChargement(false); return }
    setChargement(true); setTexte(null)
    if (el.type === 'verset') {
      supabase.from('versets_lecture').select('TR0002').eq('id_verset', el.id).single()
        .then(({ data }) => { setTexte(data?.TR0002 ?? '(verset introuvable)'); setChargement(false) })
    } else {
      supabase.from('segments').select('segment_texte').eq('id', el.id).single()
        .then(({ data }) => { setTexte(data?.segment_texte ?? '(segment introuvable)'); setChargement(false) })
    }
  }, [el.type, el.type !== 'note' ? (el as { id: string }).id : ''])

  // Enrichissements d'une note (gras, italique, petites capitales, exposant),
  // rendus à l'identique de ce que compose l'auteur dans le volet.
  const rendreTexteSimple = (t: string, base: number): React.ReactNode[] => rendreMarquesNote(t, base)

  const rendreTexteAvecLiens = (s: string) => {
    const morceaux: React.ReactNode[] = []
    const regex = /\[(.+?)\]\((verset|segment):(.+?)\)/g
    let dernier = 0, k = 0, m: RegExpExecArray | null
    while ((m = regex.exec(s))) {
      if (m.index > dernier) morceaux.push(...rendreTexteSimple(s.slice(dernier, m.index), k))
      const [, label, type, id] = m
      morceaux.push(
        <button key={k++} onClick={() => onNaviguer({ type: type as 'verset' | 'segment', id, label })}
          style={{ color: 'var(--cs-vert)', textDecoration: 'underline', textDecorationStyle: 'dotted', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>
          {label}
        </button>
      )
      dernier = regex.lastIndex
    }
    if (dernier < s.length) morceaux.push(...rendreTexteSimple(s.slice(dernier), k))
    return morceaux
  }

  if (chargement) return (
    <span style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
      <span className="essai-note-spinner" />
    </span>
  )

  if (el.type !== 'note') {
    return (
      <span style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'var(--cs-vert)', marginBottom: '5px', fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>
          {el.type === 'verset' ? 'Référence biblique' : 'Référence patristique'}
        </span>
        <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--cs-vert)', marginBottom: '6px', fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>{el.label}</span>
        <span style={{ display: 'block', fontSize: '0.75rem', lineHeight: 1.52, color: 'var(--cs-texte)', fontFamily: "var(--font-source-sans), Arial, sans-serif", fontStyle: 'normal' }}>{texte}</span>
      </span>
    )
  }

  return (
    <span style={{
      display: 'block',
      fontSize: '0.75rem',
      lineHeight: 1.38,
      color: 'var(--cs-texte-fort)',
      fontFamily: "var(--font-source-serif), Georgia, serif",
      fontStyle: 'normal',
      letterSpacing: '0.002em',
      wordSpacing: '-0.01em',
      textIndent: 0,
    }}>
      {texte !== null ? rendreTexteAvecLiens(texte) : null}
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
  const [cleAnim, setCleAnim] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const timerFermeture = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerFixation = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!fixe) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) fermerComplet()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [fixe])

  useEffect(() => { setProfondeur(el) }, [el])
  useEffect(() => () => viderTimers(), [])

  const viderTimers = () => {
    if (timerFermeture.current) { clearTimeout(timerFermeture.current); timerFermeture.current = null }
    if (timerFixation.current) { clearTimeout(timerFixation.current); timerFixation.current = null }
  }

  const fermerComplet = () => {
    viderTimers(); setOuvert(false); setFixe(false); setProfondeur(el)
  }

  const traiterEntrer = useCallback(() => {
    if (fixe) return
    if (timerFermeture.current) { clearTimeout(timerFermeture.current); timerFermeture.current = null }
    if (!ouvert) { setOuvert(true); setCleAnim(n => n + 1) }
    if (!timerFixation.current) {
      timerFixation.current = setTimeout(() => { timerFixation.current = null; setFixe(true) }, DUREE_FIXATION)
    }
  }, [fixe, ouvert])

  const traiterSortir = useCallback(() => {
    if (fixe) return
    if (timerFermeture.current) clearTimeout(timerFermeture.current)
    if (timerFixation.current) { clearTimeout(timerFixation.current); timerFixation.current = null }
    timerFermeture.current = setTimeout(() => {
      timerFermeture.current = null; viderTimers(); setOuvert(false); setProfondeur(el)
    }, DELAI_FERMETURE)
  }, [fixe, el])

  const traiterClic = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (fixe) { fermerComplet(); return }
    viderTimers(); setFixe(true); setOuvert(true)
  }

  const declencheur = isRef ? (
    <button onMouseEnter={traiterEntrer} onMouseLeave={traiterSortir} onClick={traiterClic}
      style={{ color: 'var(--cs-vert)', cursor: 'pointer', background: 'none', border: 'none', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dotted', font: 'inherit' }}>
      {lettre}
    </button>
  ) : (
    // Exposant qui n'agrandit PAS l'interligne (décalage de peinture + line-height:0),
    // au lieu de <sup> (vertical-align:super) qui gonfle la boîte de ligne.
    <span style={{ marginLeft: 0, display: 'inline-block', position: 'relative', top: '-0.3em', verticalAlign: 'baseline', lineHeight: 0, fontSize: '0.68em' }}>
      <button onMouseEnter={traiterEntrer} onMouseLeave={traiterSortir} onClick={traiterClic}
        style={{ color: fixe ? 'var(--cs-encre-fonce)' : 'var(--cs-vert-aplat)', cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontSize: 'inherit', fontFamily: "var(--font-source-serif), Georgia, serif", fontStyle: 'normal', lineHeight: 1 }}>
        {lettre}
      </button>
    </span>
  )

  // Position de la flèche selon le type de déclencheur
  const flecheLeft = isRef ? '16px' : '28%'

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline' }}>
      {declencheur}

      {ouvert && (
        // Conteneur de positionnement — sépare la logique position de la carte visuelle
        <span
          onMouseEnter={traiterEntrer}
          onMouseLeave={traiterSortir}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 10px)',
            left: isRef ? '0' : '50%',
            transform: isRef ? 'none' : 'translateX(-30%)',
            zIndex: 200,
            display: 'block',
            pointerEvents: 'auto',
          }}>

          {/* Flèche vers le bas — bordure */}
          <span aria-hidden="true" style={{
            position: 'absolute', top: '100%',
            left: flecheLeft,
            width: 0, height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: '7px solid rgba(185,165,120,0.35)',
          }} />
          {/* Flèche vers le bas — remplissage */}
          <span aria-hidden="true" style={{
            position: 'absolute', top: 'calc(100% + 1px)',
            left: `calc(${flecheLeft} + 1px)`,
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid var(--cs-fond)',
          }} />

          {/* Carte */}
          <span style={{
            display: 'block',
            background: 'var(--cs-fond)',
            border: '1px solid #c0a878',
            borderRadius: '4px',
            padding: '10px 12px',
            width: '13.75rem',
            boxShadow: '0 6px 24px rgba(10,8,4,0.13), 0 1px 4px rgba(10,8,4,0.06), inset 0 0 0 1px rgba(255,248,235,0.7)',
            position: 'relative',
            overflow: 'hidden',
            textIndent: 0,
          }}>

            {/* Label « Note X » dans le coin supérieur gauche */}
            {el.type === 'note' && profondeur === el && (
              <span style={{ display: 'block', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cs-etiquette)', marginBottom: '5px', fontFamily: "var(--font-source-sans), Arial, sans-serif", wordSpacing: 0 }}>
                Note {lettre}
              </span>
            )}

            {/* Retour (navigation dans la note) */}
            {profondeur !== el && (
              <button onClick={() => setProfondeur(el)}
                style={{ fontSize: '0.625rem', color: 'var(--cs-vert)', background: 'none', border: 'none', padding: '0 0 6px', cursor: 'pointer', display: 'block', fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>
                ← Retour
              </button>
            )}

            <ContenuNote el={profondeur} onNaviguer={cible => { viderTimers(); setProfondeur(cible); setFixe(true); setOuvert(true) }} />

            {/* Bouton fermeture (fixe seulement) */}
            {fixe && (
              <button onClick={fermerComplet}
                style={{ position: 'absolute', top: '5px', right: '7px', background: 'none', border: 'none', color: 'var(--cs-or-doux)', cursor: 'pointer', fontSize: '0.75rem', lineHeight: 1, fontFamily: 'var(--font-source-sans), Arial, sans-serif' }}>
                ×
              </button>
            )}

            {/* Barre de progression de 2,3 s */}
            {!fixe && (
              <span key={cleAnim} style={{
                position: 'absolute',
                bottom: 0, left: 0,
                height: '2px',
                background: 'linear-gradient(90deg, var(--cs-vert-aplat) 0%, #8abf9e 100%)',
                animation: `essai-note-progress ${DUREE_FIXATION}ms linear forwards`,

              }} />
            )}
          </span>
        </span>
      )}
    </span>
  )
}
