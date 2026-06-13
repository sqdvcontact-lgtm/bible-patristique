'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const NB_CHAPITRES: Record<string, number> = {
  GEN:50,EXO:40,LEV:27,NUM:36,DEU:34,JOS:24,JDG:21,RUT:4,
  '1SA':31,'2SA':24,'1KI':22,'2KI':25,'1CH':29,'2CH':36,
  EZR:10,NEH:13,EST:16,JOB:42,PSA:150,PRO:31,ECC:12,SNG:8,
  ISA:66,JER:52,LAM:5,EZK:48,DAN:14,HOS:14,JOL:3,AMO:9,
  OBA:1,JON:4,MIC:7,NAM:3,HAB:3,ZEP:3,HAG:2,ZEC:14,MAL:4,
  MAT:28,MRK:16,LUK:24,JHN:21,ACT:28,ROM:16,'1CO':16,'2CO':13,
  GAL:6,EPH:6,PHP:4,COL:4,'1TH':5,'2TH':3,'1TI':6,'2TI':4,
  TIT:3,PHM:1,HEB:13,JAS:5,'1PE':5,'2PE':3,'1JN':5,'2JN':1,
  '3JN':1,JUD:1,REV:22,
}

type Livre = { code: string; nom: string; testament: string }
type Traduction = { code: 'trad_sacy' | 'trad_lsg' | 'trad_crampon' | 'trad_vulgate'; label: string }

type Props = {
  livres: Livre[]
  livreActif: string
  chapitreActif: number
  traductionIndex: number
  setTraductionIndex: (i: number) => void
  traductions: Traduction[]
}

export default function NavLivres({
  livres, livreActif, chapitreActif,
  traductionIndex, setTraductionIndex, traductions
}: Props) {
  const [recherche, setRecherche] = useState('')
  const [livreOuvert, setLivreOuvert] = useState<string | null>(livreActif)
  const [tradOuverte, setTradOuverte] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const filtrer = (liste: Livre[]) =>
    liste.filter(l => l.nom.toLowerCase().includes(recherche.toLowerCase()))

  const AT = filtrer(livres.filter(l => l.testament === 'AT'))
  const NT = filtrer(livres.filter(l => l.testament === 'NT'))

  const handleLivre = (code: string) => {
    const pos = scrollRef.current?.scrollTop || 0
    setLivreOuvert(livreOuvert === code ? null : code)
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = pos
    })
  }

  const handleChapitre = (code: string, ch: number) => {
    const pos = scrollRef.current?.scrollTop || 0
    router.push(`/?livre=${code}&chapitre=${ch}`)
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = pos
    })
  }

  const handleTrad = (i: number) => {
    setTraductionIndex(i)
    setTradOuverte(false)
  }

  const renderLivre = (livre: Livre) => {
    const ouvert = livreOuvert === livre.code
    const actif = livreActif === livre.code
    const nb = NB_CHAPITRES[livre.code] || 1

    return (
      <div key={livre.code}>
        <button
          onClick={() => handleLivre(livre.code)}
          style={{
            width: '100%',
            textAlign: 'left',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '11.5px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: actif ? 'rgba(61,107,79,0.10)' : 'transparent',
            color: actif ? '#2a3d30' : '#5a6055',
            fontWeight: actif ? 500 : 400,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <span>{livre.nom}</span>
          <span style={{ color: '#c0bab0', fontSize: '9px' }}>{ouvert ? '▲' : '▼'}</span>
        </button>
        {ouvert && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', padding: '2px 8px 6px' }}>
            {Array.from({ length: nb }, (_, i) => i + 1).map(ch => (
              <button
                key={ch}
                onClick={() => handleChapitre(livre.code, ch)}
                style={{
                  fontSize: '10px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '3px',
                  border: 'none',
                  cursor: 'pointer',
                  background: actif && chapitreActif === ch ? '#3d6b4f' : '#ebe7e0',
                  color: actif && chapitreActif === ch ? '#fff' : '#6b6560',
                }}
              >
                {ch}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{
      width: '168px',
      flexShrink: 0,
      background: '#faf8f4',
      borderRight: '1px solid #d6d0c4',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid #d6d0c4' }}>

        {/* Sélecteur de traduction — dropdown */}
        <p style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d', marginBottom: '5px' }}>
          TRADUCTION
        </p>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setTradOuverte(!tradOuverte)}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '5px 8px',
              borderRadius: '5px',
              border: '1px solid #d6d0c4',
              background: '#fff',
              fontSize: '11.5px',
              color: '#2a3d30',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <span>{traductions[traductionIndex]?.label}</span>
            <span style={{ color: '#9a958d', fontSize: '9px' }}>{tradOuverte ? '▲' : '▼'}</span>
          </button>
          {tradOuverte && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 3px)',
              left: 0,
              right: 0,
              background: '#fff',
              border: '1px solid #d6d0c4',
              borderRadius: '5px',
              zIndex: 50,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              maxHeight: '200px',
              overflowY: 'auto',
            }}>
              {traductions.map((t, i) => (
                <button
                  key={t.code}
                  onClick={() => handleTrad(i)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '7px 10px',
                    fontSize: '11.5px',
                    border: 'none',
                    borderBottom: i < traductions.length - 1 ? '1px solid #ede9e2' : 'none',
                    background: traductionIndex === i ? 'rgba(61,107,79,0.08)' : '#fff',
                    color: traductionIndex === i ? '#3d6b4f' : '#3a3530',
                    fontWeight: traductionIndex === i ? 500 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recherche livre */}
        <input
          type="text"
          placeholder="Rechercher un livre…"
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          style={{
            width: '100%',
            fontSize: '11px',
            padding: '5px 8px',
            marginTop: '7px',
            border: '1px solid #d6d0c4',
            borderRadius: '4px',
            background: '#f3f0ea',
            color: '#3a3530',
            outline: 'none',
          }}
        />
      </div>

      {/* Liste des livres */}
      <div ref={scrollRef} style={{ overflowY: 'auto', flex: 1, padding: '6px' }}>
        {AT.length > 0 && (
          <>
            <p style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d', padding: '6px 8px 3px' }}>
              ANCIEN TESTAMENT
            </p>
            {AT.map(renderLivre)}
          </>
        )}
        {NT.length > 0 && (
          <>
            <p style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d', padding: '8px 8px 3px' }}>
              NOUVEAU TESTAMENT
            </p>
            {NT.map(renderLivre)}
          </>
        )}
        {AT.length === 0 && NT.length === 0 && (
          <p style={{ fontSize: '11px', color: '#9a958d', textAlign: 'center', padding: '16px 0' }}>Aucun résultat</p>
        )}
      </div>
    </div>
  )
}