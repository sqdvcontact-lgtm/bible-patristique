'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

const DELAI_MS = 4000
const R = 6
const CIRC = 2 * Math.PI * R

type Position = 'top' | 'bottom' | 'left' | 'right'

type Props = {
  texte: string
  children: React.ReactNode
  position?: Position
  avecFixation?: boolean
}

function posStyle(pos: Position): React.CSSProperties {
  switch (pos) {
    case 'top':    return { bottom: 'calc(100% + 7px)', left: '50%', transform: 'translateX(-50%)' }
    case 'bottom': return { top:    'calc(100% + 7px)', left: '50%', transform: 'translateX(-50%)' }
    case 'left':   return { right:  'calc(100% + 7px)', top:  '50%', transform: 'translateY(-50%)' }
    case 'right':  return { left:   'calc(100% + 7px)', top:  '50%', transform: 'translateY(-50%)' }
  }
}

function fleche(pos: Position): React.CSSProperties {
  const b: React.CSSProperties = { position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }
  switch (pos) {
    case 'top':    return { ...b, top: '100%',    left: '50%', transform: 'translateX(-50%)', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #2a3d30' }
    case 'bottom': return { ...b, bottom: '100%', left: '50%', transform: 'translateX(-50%)', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '5px solid #2a3d30' }
    case 'left':   return { ...b, left: '100%',   top:  '50%', transform: 'translateY(-50%)', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '5px solid #2a3d30' }
    case 'right':  return { ...b, right: '100%',  top:  '50%', transform: 'translateY(-50%)', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: '5px solid #2a3d30' }
  }
}

export function Bulle({ texte, children, position = 'top', avecFixation = false }: Props) {
  const [visible,  setVisible]  = useState(false)
  const [fixee,    setFixee]    = useState(false)
  const [progress, setProgress] = useState(0)

  const timerRef    = useRef<ReturnType<typeof setTimeout>  | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef    = useRef<number>(0)

  const clear = useCallback(() => {
    if (timerRef.current)    clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const entrer = useCallback(() => {
    if (fixee) return
    setVisible(true)
    if (!avecFixation) return
    setProgress(0)
    startRef.current = Date.now()

    intervalRef.current = setInterval(() => {
      setProgress(Math.min((Date.now() - startRef.current) / DELAI_MS, 1))
    }, 40)

    timerRef.current = setTimeout(() => {
      clearInterval(intervalRef.current!)
      setProgress(1)
      setFixee(true)
    }, DELAI_MS)
  }, [fixee, avecFixation])

  const sortir = useCallback(() => {
    if (fixee) return
    clear()
    setVisible(false)
    setProgress(0)
  }, [fixee, clear])

  const fermer = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    clear()
    setVisible(false)
    setFixee(false)
    setProgress(0)
  }, [clear])

  useEffect(() => () => clear(), [clear])

  const dashoffset = CIRC * (1 - progress)

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={entrer}
      onMouseLeave={sortir}
    >
      {children}

      {visible && (
        <span style={{
          position: 'absolute',
          ...posStyle(position),
          background: '#2a3d30',
          color: '#f2ede6',
          fontSize: '0.6875rem',
          lineHeight: 1.45,
          padding: '5px 9px',
          borderRadius: '5px',
          whiteSpace: 'nowrap',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.22)',
          pointerEvents: fixee ? 'auto' : 'none',
          userSelect: 'none',
        }}>

          {/* Flèche directionnelle */}
          <span style={fleche(position)} />

          {texte}

          {avecFixation && (!fixee ? (
            <svg width="16" height="16" viewBox="0 0 16 16" style={{ flexShrink: 0 }} aria-hidden="true">
              <circle cx="8" cy="8" r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.8" />
              <circle
                cx="8" cy="8" r={R}
                fill="none"
                stroke="#6a9a7a"
                strokeWidth="1.8"
                strokeDasharray={CIRC}
                strokeDashoffset={dashoffset}
                strokeLinecap="round"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '8px 8px' }}
              />
            </svg>
          ) : (
            <button
              onClick={fermer}
              aria-label="Fermer"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(242,237,230,0.55)', fontSize: '0.875rem', lineHeight: 1,
                padding: '0 0 0 1px', flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f2ede6')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(242,237,230,0.55)')}
            >
              ×
            </button>
          ))}
        </span>
      )}
    </span>
  )
}
