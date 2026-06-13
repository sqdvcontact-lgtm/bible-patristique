'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const TRADUCTIONS = [
  { code: 'trad_sacy', label: 'Sacy' },
  { code: 'trad_lsg', label: 'Segond' },
  { code: 'trad_crampon', label: 'Crampon' },
  { code: 'trad_vulgate', label: 'Vulgate' },
]

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

type Props = {
  livres: Livre[]
  livreActif: string
  chapitreActif: number
  traduction: string
  setTraduction: (t: any) => void
}

export default function NavLivres({ livres, livreActif, chapitreActif, traduction, setTraduction }: Props) {
  const [recherche, setRecherche] = useState('')
  const [livreOuvert, setLivreOuvert] = useState<string | null>(livreActif)
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const filtrer = (liste: Livre[]) =>
    liste.filter(l => l.nom.toLowerCase().includes(recherche.toLowerCase()))

  const AT = filtrer(livres.filter(l => l.testament === 'AT'))
  const NT = filtrer(livres.filter(l => l.testament === 'NT'))

  const handleLivre = (code: string) => {
    const pos = scrollRef.current?.scrollTop || 0
    setLivreOuvert(livreOuvert === code ? null : code)
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = pos
    }, 0)
  }

  const handleChapitre = (code: string, ch: number) => {
    const pos = scrollRef.current?.scrollTop || 0
    router.push(`/?livre=${code}&chapitre=${ch}`)
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = pos
    }, 50)
  }

  const renderLivre = (livre: Livre) => {
    const ouvert = livreOuvert === livre.code
    const actif = livreActif === livre.code
    const nb = NB_CHAPITRES[livre.code] || 1

    return (
      <div key={livre.code}>
        <button
          onClick={() => handleLivre(livre.code)}
          className={`w-full text-left px-2 py-1.5 rounded text-sm flex justify-between items-center ${
            actif
              ? 'bg-violet-50 text-violet-800 font-medium'
              : 'text-stone-700 hover:bg-stone-100'
          }`}
        >
          <span>{livre.nom}</span>
          <span className="text-stone-400 text-xs">{ouvert ? '▲' : '▼'}</span>
        </button>
        {ouvert && (
          <div className="flex flex-wrap gap-1 px-2 pb-2">
            {Array.from({ length: nb }, (_, i) => i + 1).map(ch => (
              <button
                key={ch}
                onClick={() => handleChapitre(livre.code, ch)}
                className={`text-xs w-7 h-7 rounded ${
                  actif && chapitreActif === ch
                    ? 'bg-violet-700 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-violet-100 hover:text-violet-700'
                }`}
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
    <div className="w-48 bg-white border-r border-stone-200 flex flex-col h-screen">
      <div className="p-3 border-b border-stone-200">
        <p className="text-xs font-medium text-stone-400 mb-2">TRADUCTION</p>
        <div className="flex flex-wrap gap-1 mb-3">
          {TRADUCTIONS.map(t => (
            <button
              key={t.code}
              onClick={() => setTraduction(t.code)}
              className={`text-xs px-2 py-1 rounded ${
                traduction === t.code
                  ? 'bg-violet-700 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Rechercher un livre…"
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          className="w-full text-xs px-2 py-1.5 border border-stone-200 rounded bg-stone-50 focus:outline-none focus:border-violet-400 text-stone-800 placeholder-stone-500"
        />
      </div>
      <div ref={scrollRef} className="overflow-y-auto flex-1 p-2">
        {AT.length > 0 && (
          <>
            <p className="text-xs font-medium text-stone-400 px-2 py-2">ANCIEN TESTAMENT</p>
            {AT.map(renderLivre)}
          </>
        )}
        {NT.length > 0 && (
          <>
            <p className="text-xs font-medium text-stone-400 px-2 py-2 mt-2">NOUVEAU TESTAMENT</p>
            {NT.map(renderLivre)}
          </>
        )}
        {AT.length === 0 && NT.length === 0 && (
          <p className="text-xs text-stone-400 text-center py-4">Aucun résultat</p>
        )}
      </div>
    </div>
  )
}