'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
type Traduction = { code: 'TR0001' | 'TR0002' | 'TR0003' | 'TR0004'; label: string }

const TRAD_SLUG: Record<string, string> = {
  TR0001: 'TR0001', TR0002: 'TR0002', TR0003: 'TR0003', TR0004: 'TR0004',
}

const TRAD_NOM_OFFICIEL: Record<string, string> = {
  TR0001: 'Bible de Sacy',
  TR0002: 'Bible Segond',
  TR0003: 'Bible Crampon',
  TR0004: 'Vulgate',
}

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
  const [atOuvert, setAtOuvert] = useState(true)
  const [ntOuvert, setNtOuvert] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const filtrer = (liste: Livre[]) =>
    liste.filter(l => l.nom.toLowerCase().includes(recherche.toLowerCase()))

  const AT = filtrer(livres.filter(l => l.testament === 'AT'))
  const NT = filtrer(livres.filter(l => l.testament === 'NT'))

  const handleLivre = (code: string) => {
    const pos = scrollRef.current?.scrollTop || 0
    if (livreOuvert === code) {
      setLivreOuvert(null)
    } else {
      setLivreOuvert(code)
      const tradCode = traductions[traductionIndex]?.code ?? 'TR0001'
      router.push(`/?livre=${code}&chapitre=1&trad=${tradCode}`)
    }
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = pos
    })
  }

  const handleChapitre = (code: string, ch: number) => {
    const pos = scrollRef.current?.scrollTop || 0
    const tradCode = traductions[traductionIndex]?.code ?? 'TR0001'
    router.push(`/?livre=${code}&chapitre=${ch}&trad=${tradCode}`)
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = pos
    })
  }

  const handleTrad = (i: number) => { setTraductionIndex(i); setTradOuverte(false) }

  const tradCode = traductions[traductionIndex]?.code ?? ''
  const tradSlug = TRAD_SLUG[tradCode] ?? ''
  const tradNomOfficiel = TRAD_NOM_OFFICIEL[tradCode] ?? traductions[traductionIndex]?.label ?? ''

  const renderLivre = (livre: Livre) => {
    const ouvert = livreOuvert === livre.code
    const actif = livreActif === livre.code
    const nb = NB_CHAPITRES[livre.code] || 1

    return (
      <div key={livre.code}>
        <button onClick={() => handleLivre(livre.code)} style={{
          width: '100%', textAlign: 'left',
          padding: '2px 6px',
          borderRadius: '4px', fontSize: '11px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: actif ? 'rgba(61,107,79,0.10)' : 'transparent',
          color: actif ? '#2a3d30' : '#4a4540',
          fontWeight: actif ? 600 : 400,
          border: 'none', cursor: 'pointer',
          lineHeight: 1.4,
        }}>
          <span>{livre.nom}</span>
          <span style={{ color: '#c0bab0', fontSize: '8px', flexShrink: 0 }}>{ouvert ? '▲' : '▼'}</span>
        </button>

        {ouvert && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(20px, 1fr))',
            gap: '2px',
            padding: '2px 6px 5px 6px',
            boxSizing: 'border-box',
          }}>
            {Array.from({ length: nb }, (_, i) => i + 1).map(ch => (
              <button key={ch} onClick={() => handleChapitre(livre.code, ch)} style={{
                fontSize: '9.5px', height: '20px', borderRadius: '3px',
                border: 'none', cursor: 'pointer', padding: 0,
                background: actif && chapitreActif === ch ? '#3d6b4f' : '#e8e4dc',
                color: actif && chapitreActif === ch ? '#fff' : '#6b6560',
                lineHeight: 1, textAlign: 'center',
              }}>
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
      width: '192px', flexShrink: 0, background: '#faf8f4',
      borderRight: '1px solid #d6d0c4', display: 'flex', flexDirection: 'column', height: '100%',
    }}>

      {/* Zone fixe en haut : recherche uniquement */}
      <div style={{ padding: '8px 8px 6px', borderBottom: '1px solid #d6d0c4' }}>
        <input type="text" placeholder="Rechercher un livre…" value={recherche}
          onChange={e => setRecherche(e.target.value)}
          style={{ width: '100%', fontSize: '10.5px', padding: '4px 7px', border: '1px solid #d6d0c4', borderRadius: '4px', background: '#f0ede7', color: '#3a3530', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {/* Liste livres — zone scrollable */}
      <div ref={scrollRef} style={{ overflowY: 'auto', flex: 1, padding: '4px 2px' }}>

        {/* Ancien Testament — rétractable */}
        {AT.length > 0 && (
          <>
            <button onClick={() => setAtOuvert(!atOuvert)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: '5px 6px 2px', textAlign: 'left',
            }}>
              <span style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.10em', color: '#7a7268', textTransform: 'uppercase' }}>
                Ancien Testament
              </span>
              <span style={{ fontSize: '7px', color: '#c0bab0' }}>{atOuvert ? '▲' : '▼'}</span>
            </button>
            {atOuvert && AT.map(renderLivre)}
          </>
        )}

        {/* Nouveau Testament — rétractable */}
        {NT.length > 0 && (
          <>
            <button onClick={() => setNtOuvert(!ntOuvert)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: '7px 6px 2px', textAlign: 'left',
            }}>
              <span style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.10em', color: '#7a7268', textTransform: 'uppercase' }}>
                Nouveau Testament
              </span>
              <span style={{ fontSize: '7px', color: '#c0bab0' }}>{ntOuvert ? '▲' : '▼'}</span>
            </button>
            {ntOuvert && NT.map(renderLivre)}
          </>
        )}

        {AT.length === 0 && NT.length === 0 && (
          <p style={{ fontSize: '11px', color: '#9a958d', textAlign: 'center', padding: '16px 0' }}>Aucun résultat</p>
        )}
      </div>
    </div>
  )
}