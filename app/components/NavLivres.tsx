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

export default function NavLivres({ livres, livreActif, chapitreActif, traductionIndex, setTraductionIndex, traductions }: Props) {
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

  const renderLivre = (livre: Livre) => {
    const ouvert = livreOuvert === livre.code
    const actif = livreActif === livre.code
    const nb = NB_CHAPITRES[livre.code] || 1

    return (
      <div key={livre.code}>
        <button
          onClick={() => handleLivre(livre.code)}
          className={`w-full text-left px-2 py-1 rounded text-xs flex justify-between items-center ${
            actif
              ? 'bg-violet-50 text-violet-800 font-medium'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <span>{livre.nom}</span>
          <span className="text-stone-300 text-xs">{ouvert ? '▲' : '▼'}</span>
        </button>
        {ouvert && (
          <div className="flex flex-wrap gap-0.5 px-2 pb-1.5 pt-0.5">
            {Array.from({ length: nb }, (_, i) => i + 1).map(ch => (
              <button
                key={ch}
                onClick={() => handleChapitre(livre.code, ch)}
                className={`text-xs w-6 h-6 rounded ${
                  actif && chapitreActif === ch
                    ? 'bg-violet-700 text-white'
                    : 'bg-stone-100 text-stone-500 hover:bg-violet-100 hover:text-violet-700'
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
    <div className="w-44 bg-white border-r border-stone-200 flex flex-col h-screen">
      <div className="p-3 border-b border-stone-200">
        <p className="text-xs font-medium text-stone-400 mb-2">TRADUCTION</p>
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {traductions.map((t, i) => (
            <button
              key={t.code}
              onClick={() => setTraductionIndex(i)}
              className={`text-xs px-2 py-1 rounded whitespace-nowrap flex-shrink-0 ${
                traductionIndex === i
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
          className="w-full text-xs px-2 py-1.5 mt-2 border border-stone-200 rounded bg-stone-50 focus:outline-none focus:border-violet-400 text-stone-800 placeholder-stone-500"
        />
      </div>
      <div ref={scrollRef} className="overflow-y-auto flex-1 p-2">
        {AT.length > 0 && (
          <>
            <p className="text-xs font-medium text-stone-400 px-2 py-1.5">ANCIEN TESTAMENT</p>
            {AT.map(renderLivre)}
          </>
        )}
        {NT.length > 0 && (
          <>
            <p className="text-xs font-medium text-stone-400 px-2 py-1.5 mt-1">NOUVEAU TESTAMENT</p>
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