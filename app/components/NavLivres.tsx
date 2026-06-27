'use client'

import { useState, useRef, useEffect } from 'react'
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

const ABREV_TO_CODE: Record<string, string> = {
  gn:'GEN',gen:'GEN',genese:'GEN',
  ex:'EXO',exo:'EXO',exode:'EXO',
  lv:'LEV',lev:'LEV',levitique:'LEV',
  nb:'NUM',num:'NUM',nombres:'NUM',
  dt:'DEU',deu:'DEU',deuteronome:'DEU',
  jos:'JOS',josue:'JOS',
  jg:'JDG',jdg:'JDG',juges:'JDG',
  rt:'RUT',rut:'RUT',ruth:'RUT',
  '1s':'1SA','1sa':'1SA','1samuel':'1SA',
  '2s':'2SA','2sa':'2SA','2samuel':'2SA',
  '1r':'1KI','1ki':'1KI','1rois':'1KI',
  '2r':'2KI','2ki':'2KI','2rois':'2KI',
  '1ch':'1CH','1chr':'1CH','1chroniques':'1CH',
  '2ch':'2CH','2chr':'2CH','2chroniques':'2CH',
  esd:'EZR',ezr:'EZR',esdras:'EZR',
  ne:'NEH',neh:'NEH',nehemie:'NEH',
  est:'EST',esther:'EST',
  jb:'JOB',job:'JOB',
  ps:'PSA',psa:'PSA',psaume:'PSA',psaumes:'PSA',
  pr:'PRO',pro:'PRO',proverbes:'PRO',
  qo:'ECC',ecc:'ECC',ecclesiaste:'ECC',
  ct:'SNG',sng:'SNG',cantique:'SNG',
  is:'ISA',isa:'ISA',isaie:'ISA',
  jr:'JER',jer:'JER',jeremie:'JER',
  lm:'LAM',lam:'LAM',lamentations:'LAM',
  ez:'EZK',ezk:'EZK',ezechiel:'EZK',
  dn:'DAN',dan:'DAN',daniel:'DAN',
  os:'HOS',hos:'HOS',osee:'HOS',
  jl:'JOL',jol:'JOL',joel:'JOL',
  am:'AMO',amo:'AMO',amos:'AMO',
  ab:'OBA',oba:'OBA',abdias:'OBA',
  jon:'JON',jonas:'JON',
  mi:'MIC',mic:'MIC',michee:'MIC',
  na:'NAM',nam:'NAM',nahum:'NAM',
  ha:'HAB',hab:'HAB',habacuc:'HAB',
  so:'ZEP',zep:'ZEP',sophonie:'ZEP',
  ag:'HAG',hag:'HAG',aggee:'HAG',
  za:'ZEC',zec:'ZEC',zacharie:'ZEC',
  ml:'MAL',mal:'MAL',malachie:'MAL',
  mt:'MAT',mat:'MAT',matthieu:'MAT',
  mc:'MRK',mrk:'MRK',marc:'MRK',
  lc:'LUK',luk:'LUK',luc:'LUK',
  jn:'JHN',jhn:'JHN',jean:'JHN',
  ac:'ACT',act:'ACT',actes:'ACT',
  rm:'ROM',rom:'ROM',romains:'ROM',
  '1co':'1CO','1cor':'1CO','1corinthiens':'1CO',
  '2co':'2CO','2cor':'2CO','2corinthiens':'2CO',
  ga:'GAL',gal:'GAL',galates:'GAL',
  ep:'EPH',eph:'EPH',ephesiens:'EPH',
  ph:'PHP',php:'PHP',philippiens:'PHP',
  col:'COL',colossiens:'COL',
  '1th':'1TH','1thess':'1TH','1thessaloniciens':'1TH',
  '2th':'2TH','2thess':'2TH','2thessaloniciens':'2TH',
  '1tm':'1TI','1ti':'1TI','1timothee':'1TI',
  '2tm':'2TI','2ti':'2TI','2timothee':'2TI',
  tt:'TIT',tit:'TIT',tite:'TIT',
  phm:'PHM',philemon:'PHM',
  he:'HEB',heb:'HEB',hebreux:'HEB',
  jc:'JAS',jas:'JAS',jacques:'JAS',
  '1p':'1PE','1pe':'1PE','1pierre':'1PE',
  '2p':'2PE','2pe':'2PE','2pierre':'2PE',
  '1jn':'1JN','1jean':'1JN',
  '2jn':'2JN','2jean':'2JN',
  '3jn':'3JN','3jean':'3JN',
  jude:'JUD',jud:'JUD',
  ap:'REV',rev:'REV',apocalypse:'REV',
}

type Livre = { code: string; nom: string; testament: string }
type Traduction = { code: string; label: string }

type Props = {
  livres: Livre[]
  livreActif: string
  chapitreActif: number
  traductionIndex: number
  setTraductionIndex: (i: number) => void
  traductions: Traduction[]
}

/**
 * Parse "ex 20 20", "ex 20, 20", "Exode 20:20", "1Co 3 1"…
 * Retourne { code, chapitre, verset } ou null.
 */
function parseRefBiblique(saisie: string): { code: string; chapitre: number; verset: number } | null {
  const norm = saisie.trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[,.:;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Extraire les deux derniers nombres
  const m = norm.match(/^(.+?)\s+(\d{1,3})\s+(\d{1,3})$/)
  if (!m) return null

  const livreRaw = m[1].replace(/\s+/g, '')
  const chapitre = parseInt(m[2])
  const verset   = parseInt(m[3])
  const code     = ABREV_TO_CODE[livreRaw]
  if (!code || chapitre < 1 || verset < 1) return null

  return { code, chapitre, verset }
}

export default function NavLivres({
  livres, livreActif, chapitreActif,
  traductionIndex, setTraductionIndex, traductions
}: Props) {
  const [recherche, setRecherche] = useState('')
  const [livreActifLocal, setLivreActifLocal] = useState(livreActif)
  const [chapitreActifLocal, setChapitreActifLocal] = useState(chapitreActif)
  useEffect(() => { setLivreActifLocal(livreActif) }, [livreActif])
  useEffect(() => { setChapitreActifLocal(chapitreActif) }, [chapitreActif])
  const [livreOuvert, setLivreOuvert] = useState<string | null>(livreActif)
  const [atOuvert, setAtOuvert] = useState(true)
  const [ntOuvert, setNtOuvert] = useState(true)
  const [ouvert, setOuvert] = useState(true)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 880) setOuvert(false)
  }, [])
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const tradCode = traductions[traductionIndex]?.code ?? 'TR0001'
  const refParsee = parseRefBiblique(recherche)

  // Si ref parsée : filtrer ne fait rien (on affiche tout pour voir le livre suggéré)
  const filtrer = (liste: Livre[]) => {
    if (!recherche.trim() || refParsee) return liste
    return liste.filter(l => l.nom.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .includes(
        recherche.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      ))
  }

  const AT = filtrer(livres.filter(l => l.testament === 'AT'))
  const NT = filtrer(livres.filter(l => l.testament === 'NT'))

  const handleLivre = (code: string) => {
    const pos = scrollRef.current?.scrollTop || 0
    setLivreActifLocal(code)
    if (livreOuvert === code) {
      setLivreOuvert(null)
    } else {
      setLivreOuvert(code)
      router.push(`/?livre=${code}&chapitre=1&trad=${tradCode}`)
    }
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = pos
    })
  }

  const handleChapitre = (code: string, ch: number) => {
    setLivreActifLocal(code)
    setChapitreActifLocal(ch)
    router.push(`/?livre=${code}&chapitre=${ch}&trad=${tradCode}`)
  }

  // Navigation vers ref parsée :
  // 1. Ouvre le livre dans le nav (déplie les chapitres)
  // 2. Navigue vers le chapitre avec le verset ciblé dans l'URL (?verset=N)
  //    TexteBible scrollera jusqu'à lui et l'affichera en surbrillance
  const appliquerRefParsee = () => {
    if (!refParsee) return
    setLivreOuvert(refParsee.code)
    setLivreActifLocal(refParsee.code)
    setChapitreActifLocal(refParsee.chapitre)
    setRecherche('')
    router.push(`/?livre=${refParsee.code}&chapitre=${refParsee.chapitre}&trad=${tradCode}&verset=${refParsee.verset}`)
  }

  const renderLivre = (livre: Livre) => {
    const ouvert = livreOuvert === livre.code
    const actif  = livreActifLocal === livre.code
    // Si ref parsée, mettre en avant le livre correspondant
    const suggere = refParsee?.code === livre.code
    const nb = NB_CHAPITRES[livre.code] || 1

    return (
      <div key={livre.code}>
        <button onClick={() => handleLivre(livre.code)} style={{
          width: '100%', textAlign: 'left',
          padding: '2px 6px', borderRadius: '4px', fontSize: '11px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: suggere ? 'rgba(61,107,79,0.12)' : actif ? 'rgba(61,107,79,0.10)' : 'transparent',
          color: actif || suggere ? '#2a3d30' : '#4a4540',
          fontWeight: actif || suggere ? 600 : 400,
          border: suggere ? '1px solid rgba(61,107,79,0.30)' : '1px solid transparent',
          cursor: 'pointer', lineHeight: 1.4, boxSizing: 'border-box',
        }}>
          <span>{livre.nom}</span>
          <span style={{ color: '#c0bab0', fontSize: '6.5px', flexShrink: 0, opacity: 0.55 }}>{ouvert ? '▲' : '▼'}</span>
        </button>

        {(ouvert || suggere) && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(20px, 1fr))',
            gap: '2px', padding: '2px 6px 5px 6px', boxSizing: 'border-box',
          }}>
            {Array.from({ length: nb }, (_, i) => i + 1).map(ch => {
              const estChapSuggere = suggere && refParsee?.chapitre === ch
              return (
                <button key={ch} onClick={() => {
                  if (suggere && refParsee?.chapitre === ch) {
                    appliquerRefParsee()
                  } else {
                    handleChapitre(livre.code, ch)
                  }
                }} style={{
                  fontSize: '9.5px', height: '20px', borderRadius: '3px',
                  border: estChapSuggere ? '1px solid #3d6b4f' : 'none',
                  cursor: 'pointer', padding: 0,
                  background: (actif && chapitreActifLocal === ch) ? '#3d6b4f'
                    : estChapSuggere ? 'rgba(61,107,79,0.15)' : '#e8e4dc',
                  color: (actif && chapitreActifLocal === ch) ? '#fff'
                    : estChapSuggere ? '#2a3d30' : '#6b6560',
                  fontWeight: estChapSuggere ? 700 : 400,
                  lineHeight: 1, textAlign: 'center',
                }}>
                  {ch}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} title="Ouvrir le sommaire des livres"
        style={{ width: '22px', flexShrink: 0, background: '#faf8f4', border: 'none', borderRight: '1px solid #d6d0c4', cursor: 'pointer', color: '#9a958d', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', writingMode: 'vertical-rl' as any, height: '100%' }}>
        ☰
      </button>
    )
  }

  return (
    <div style={{
      width: '192px', flexShrink: 0, background: '#faf8f4',
      borderRight: '1px solid #d6d0c4', display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      {/* Barre de recherche */}
      <div style={{ padding: '8px 8px 6px', borderBottom: '1px solid #d6d0c4', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          type="text"
          placeholder="Recherche"
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && refParsee) appliquerRefParsee() }}
          style={{ flex: 1, minWidth: 0, fontSize: '10.5px', padding: '4px 7px', border: '1px solid #d6d0c4', borderRadius: '4px', background: '#f0ede7', color: '#3a3530', outline: 'none', boxSizing: 'border-box' }}
        />
        <button onClick={() => setOuvert(false)} title="Fermer ce volet"
          style={{ flexShrink: 0, fontSize: '11px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>✕</button>
      </div>

      {/* Suggestion de ref parsée — remplace toute la liste tant qu'une référence est reconnue */}
      {refParsee && (
        <div style={{ padding: '8px' }}>
          <button onClick={appliquerRefParsee} style={{
            width: '100%', textAlign: 'left',
            fontSize: '11px', padding: '8px 9px', borderRadius: '5px',
            background: 'rgba(61,107,79,0.10)', border: '1px solid rgba(61,107,79,0.25)',
            color: '#2a3d30', cursor: 'pointer', lineHeight: 1.5, boxSizing: 'border-box',
          }}>
            ↳ {livres.find(l => l.code === refParsee.code)?.nom ?? refParsee.code}
            {' · ch.'} {refParsee.chapitre} · v. {refParsee.verset}
          </button>
        </div>
      )}

      {/* Liste des livres — masquée tant qu'une référence est reconnue */}
      {!refParsee && (
      <div ref={scrollRef} style={{ overflowY: 'auto', flex: 1, padding: '4px 2px' }}>
        {AT.length > 0 && (
          <>
            <button onClick={() => setAtOuvert(!atOuvert)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: '5px 6px 2px', textAlign: 'left',
            }}>
              <span style={{ fontSize: '9.5px', fontWeight: 800, letterSpacing: '0.10em', color: '#3a4a3e', textTransform: 'uppercase' }}>Ancien Testament</span>
              <span style={{ fontSize: '7px', color: '#c0bab0' }}>{atOuvert ? '▲' : '▼'}</span>
            </button>
            {atOuvert && AT.map(renderLivre)}
          </>
        )}

        {NT.length > 0 && (
          <>
            <button onClick={() => setNtOuvert(!ntOuvert)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: '7px 6px 2px', textAlign: 'left',
            }}>
              <span style={{ fontSize: '9.5px', fontWeight: 800, letterSpacing: '0.10em', color: '#3a4a3e', textTransform: 'uppercase' }}>Nouveau Testament</span>
              <span style={{ fontSize: '7px', color: '#c0bab0' }}>{ntOuvert ? '▲' : '▼'}</span>
            </button>
            {ntOuvert && NT.map(renderLivre)}
          </>
        )}

        {AT.length === 0 && NT.length === 0 && (
          <p style={{ fontSize: '11px', color: '#9a958d', textAlign: 'center', padding: '16px 0' }}>Aucun résultat</p>
        )}
      </div>
      )}
    </div>
  )
}
