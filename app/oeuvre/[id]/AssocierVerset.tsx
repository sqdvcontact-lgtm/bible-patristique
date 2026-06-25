'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from "@/app/lib/supabase"
import type { VRef } from './oeuvreTypes'

// Abréviations françaises d'affichage (mêmes que partout ailleurs sur le site)
const ABREV_FR: Record<string, string> = {
  GEN:'Gn',EXO:'Ex',LEV:'Lv',NUM:'Nb',DEU:'Dt',JOS:'Jos',JDG:'Jg',RUT:'Rt',
  '1SA':'1S','2SA':'2S','1KI':'1R','2KI':'2R','1CH':'1Ch','2CH':'2Ch',
  EZR:'Esd',NEH:'Né',EST:'Est',JOB:'Jb',PSA:'Ps',PRO:'Pr',ECC:'Qo',SNG:'Ct',
  ISA:'Is',JER:'Jr',LAM:'Lm',EZK:'Ez',DAN:'Dn',HOS:'Os',JOL:'Jl',AMO:'Am',
  OBA:'Ab',JON:'Jon',MIC:'Mi',NAM:'Na',HAB:'Ha',ZEP:'So',HAG:'Ag',ZEC:'Za',MAL:'Ml',
  MAT:'Mt',MRK:'Mc',LUK:'Lc',JHN:'Jn',ACT:'Ac',ROM:'Rm','1CO':'1Co','2CO':'2Co',
  GAL:'Ga',EPH:'Ep',PHP:'Ph',COL:'Col','1TH':'1Th','2TH':'2Th','1TI':'1Tm',
  '2TI':'2Tm',TIT:'Tt',PHM:'Phm',HEB:'He',JAS:'Jc','1PE':'1P','2PE':'2P',
  '1JN':'1Jn','2JN':'2Jn','3JN':'3Jn',JUD:'Jude',REV:'Ap',
}
// Les 27 livres du Nouveau Testament sont fixes — tout livre présent en base
// qui n'en fait pas partie est rangé dans l'Ancien Testament (ce qui inclut
// automatiquement les deutérocanoniques, sans avoir à les lister à la main).
const CODES_NT = new Set(['MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV'])

// Le projet Supabase plafonne chaque réponse à 1000 lignes (réglage serveur,
// .range() seul ne suffit pas à le dépasser) : on découpe donc la récupération
// en plusieurs pages de 1000 jusqu'à épuisement des résultats.
async function fetchPagine<T>(requete: (debut: number, fin: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const PAGE = 1000
  let tout: T[] = []
  let debut = 0
  while (true) {
    const { data } = await requete(debut, debut + PAGE - 1)
    const lot = data ?? []
    tout = tout.concat(lot)
    if (lot.length < PAGE) break
    debut += PAGE
  }
  return tout
}

const ORDRE_CANONIQUE = Object.keys(ABREV_FR)

function nomLivre(code: string): string { return ABREV_FR[code] ?? code }

// Cache mémoire au niveau du module : la liste des livres ne change jamais
// pendant une session, pas besoin de la recharger à chaque ouverture.

type Etape = 'testament' | 'livre' | 'chapitre' | 'verset'
type VersetLigne = { id_verset: string; numero: number; texte: string }

const NIVEAUX_LIEN = [
  { champ: 'lien_1', label: 'Citation directe' },
  { champ: 'lien_2', label: 'Citation libre' },
  { champ: 'lien_3', label: 'Commentaire doctrinal' },
] as const

const btnNav: React.CSSProperties = { fontSize: '11px', color: '#6b6560', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }

export default function AssocierVerset({ segId, onAssocie }: {
  segId: number
  onAssocie: (champ: 'lien_1' | 'lien_2' | 'lien_3', verset: VRef) => void
}) {
  const [ouvert, setOuvert] = useState(false)
  const [etape, setEtape] = useState<Etape>('testament')
  const [testament, setTestament] = useState<'AT' | 'NT' | null>(null)
  const [livre, setLivre] = useState<string | null>(null)
  const [chapitre, setChapitre] = useState<number | null>(null)

  const [filtreLivre, setFiltreLivre] = useState('')
  const [chapitres, setChapitres] = useState<number[]>([])
  const [versetsChapitre, setVersetsChapitre] = useState<VersetLigne[]>([])
  const [chargement, setChargement] = useState(false)

  const [debut, setDebut] = useState<number | null>(null)
  const [fin, setFin] = useState<number | null>(null)
  const [niveau, setNiveau] = useState<typeof NIVEAUX_LIEN[number]['champ']>('lien_1')
  const [enregistrement, setEnregistrement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const reinitialiser = () => {
    setEtape('testament'); setTestament(null); setLivre(null); setChapitre(null)
    setFiltreLivre(''); setDebut(null); setFin(null); setErreur(null)
  }

  const choisirTestament = (t: 'AT' | 'NT') => {
    setTestament(t); setErreur(null)
    setEtape('livre')
  }

  const choisirLivre = async (l: string) => {
    setLivre(l); setErreur(null); setChargement(true)
    const lignes = await fetchPagine<{ chapitre: string }>((d, f) => supabase.from('versets').select('chapitre').eq('livre', l).range(d, f))
    const set = new Set<number>()
    lignes.forEach(r => set.add(Number(r.chapitre)))
    setChapitres(Array.from(set).sort((a, b) => a - b))
    setChargement(false)
    setEtape('chapitre')
  }

  const choisirChapitre = async (c: number) => {
    setChapitre(c); setErreur(null); setChargement(true); setDebut(null); setFin(null)
    const { data } = await supabase.from('versets').select('id_verset, verset, "TR0001"').eq('livre', livre).eq('chapitre', String(c))
    const lignes: VersetLigne[] = (data ?? [])
      .map((r: any) => ({ id_verset: r.id_verset, numero: Number(r.verset), texte: r.TR0001 ?? '' }))
      .sort((a, b) => a.numero - b.numero)
    setVersetsChapitre(lignes)
    setChargement(false)
    setEtape('verset')
  }

  const cliquerVerset = (n: number) => {
    if (debut === null || (debut !== null && fin !== null)) { setDebut(n); setFin(null); return }
    if (n < debut) { setFin(debut); setDebut(n) } else { setFin(n) }
  }

  const plageSelectionnee = debut !== null
    ? versetsChapitre.filter(v => v.numero >= debut && v.numero <= (fin ?? debut))
    : []

  const associer = async () => {
    if (plageSelectionnee.length === 0 || !livre || chapitre === null) return
    setEnregistrement(true); setErreur(null)
    try {
      const { data: segActuel, error: e0 } = await supabase.from('segments').select(niveau).eq('id', segId).single()
      if (e0) throw e0
      const existants = ((segActuel as any)?.[niveau] as string | null ?? '').split(';').map(s => s.trim()).filter(Boolean)
      const nouveaux = plageSelectionnee.map(v => v.id_verset).filter(id => !existants.includes(id))
      if (nouveaux.length === 0) { setErreur('Ces versets sont déjà tous associés à ce niveau.'); setEnregistrement(false); return }
      const nouvelleValeur = [...existants, ...nouveaux].join('; ')
      const { error } = await supabase.from('segments').update({ [niveau]: nouvelleValeur }).eq('id', segId)
      if (error) throw error

      plageSelectionnee.forEach(v => {
        if (!nouveaux.includes(v.id_verset)) return
        onAssocie(niveau, {
          id: v.id_verset,
          label: `${nomLivre(livre)} ${chapitre}, ${v.numero}`,
          textes: { TR0001: v.texte },
          livre, chapitre: String(chapitre), verset: String(v.numero),
        })
      })
      setOuvert(false); reinitialiser()
    } catch {
      setErreur("Erreur lors de l'enregistrement.")
    }
    setEnregistrement(false)
  }

  if (!ouvert) {
    return (
      <button onClick={() => { setOuvert(true); reinitialiser() }}
        style={{ fontSize: '11px', color: '#3d6b4f', background: 'none', border: '1px dashed #b8cdc0', borderRadius: '5px', padding: '5px 10px', cursor: 'pointer', marginTop: '8px' }}>
        + Associer un verset
      </button>
    )
  }

  const livresDuTestament = ORDRE_CANONIQUE.filter(l => testament === 'NT' ? CODES_NT.has(l) : !CODES_NT.has(l))
  const livresFiltres = filtreLivre.trim()
    ? livresDuTestament.filter(l => nomLivre(l).toLowerCase().includes(filtreLivre.toLowerCase()) || l.toLowerCase().includes(filtreLivre.toLowerCase()))
    : livresDuTestament

  return (
    <div style={{ marginTop: '10px', padding: '10px 12px', border: '1px solid #d6d0c4', borderRadius: '6px', background: '#faf8f4' }}>

      {/* Fil d'Ariane */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px', flexWrap: 'wrap', fontSize: '11px' }}>
        <button onClick={() => { setEtape('testament'); setTestament(null) }} style={{ ...btnNav, fontWeight: etape === 'testament' ? 600 : 400, color: '#3d6b4f' }}>
          {testament ? (testament === 'AT' ? 'Ancien Testament' : 'Nouveau Testament') : 'Testament'}
        </button>
        {livre && <><span style={{ color: '#c0bab0' }}>›</span>
          <button onClick={() => setEtape('livre')} style={{ ...btnNav, fontWeight: etape === 'livre' ? 600 : 400, color: '#3d6b4f' }}>{nomLivre(livre)}</button>
        </>}
        {chapitre !== null && <><span style={{ color: '#c0bab0' }}>›</span>
          <button onClick={() => setEtape('chapitre')} style={{ ...btnNav, fontWeight: etape === 'chapitre' ? 600 : 400, color: '#3d6b4f' }}>Ch. {chapitre}</button>
        </>}
        <button onClick={() => { setOuvert(false); reinitialiser() }} style={{ ...btnNav, marginLeft: 'auto', color: '#b0a89e' }}>✕</button>
      </div>

      {erreur && <p style={{ fontSize: '11px', color: '#c0562a', marginBottom: '8px' }}>{erreur}</p>}
      {chargement && <p style={{ fontSize: '11px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>}

      {/* Étape 1 — Testament */}
      {!chargement && etape === 'testament' && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => choisirTestament('AT')} style={{ flex: 1, fontSize: '12px', padding: '10px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a3d30', cursor: 'pointer' }}>Ancien Testament</button>
          <button onClick={() => choisirTestament('NT')} style={{ flex: 1, fontSize: '12px', padding: '10px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a3d30', cursor: 'pointer' }}>Nouveau Testament</button>
        </div>
      )}

      {/* Étape 2 — Livre */}
      {!chargement && etape === 'livre' && (
        <div>
          <input type="text" value={filtreLivre} onChange={e => setFiltreLivre(e.target.value)} placeholder="Filtrer…" autoFocus
            style={{ width: '100%', fontSize: '12px', padding: '6px 8px', border: '1px solid #d6d0c4', borderRadius: '4px', marginBottom: '8px', outline: 'none', boxSizing: 'border-box' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px', maxHeight: '220px', overflowY: 'auto' }}>
            {livresFiltres.map(l => (
              <button key={l} onClick={() => choisirLivre(l)}
                style={{ fontSize: '11.5px', padding: '6px 4px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a3d30', cursor: 'pointer' }}>
                {nomLivre(l)}
              </button>
            ))}
            {livresFiltres.length === 0 && <p style={{ fontSize: '11px', color: '#9a958d', fontStyle: 'italic', gridColumn: '1 / -1' }}>Aucun livre trouvé.</p>}
          </div>
        </div>
      )}

      {/* Étape 3 — Chapitre */}
      {!chargement && etape === 'chapitre' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '5px', maxHeight: '220px', overflowY: 'auto' }}>
          {chapitres.map(c => (
            <button key={c} onClick={() => choisirChapitre(c)}
              style={{ fontSize: '11.5px', padding: '6px 0', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a3d30', cursor: 'pointer' }}>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Étape 4 — Versets (sélection de plage type "départ / arrivée") */}
      {!chargement && etape === 'verset' && (
        <>
          <p style={{ fontSize: '10.5px', color: '#9a958d', marginBottom: '6px' }}>
            Cliquez un premier verset, puis un second pour sélectionner toute la plage.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px', maxHeight: '160px', overflowY: 'auto', marginBottom: '10px' }}>
            {versetsChapitre.map(v => {
              const dansPlage = debut !== null && v.numero >= debut && v.numero <= (fin ?? debut)
              const estBorne = v.numero === debut || v.numero === fin
              return (
                <button key={v.numero} onClick={() => cliquerVerset(v.numero)} title={v.texte.slice(0, 80)}
                  style={{ fontSize: '11px', padding: '5px 0', borderRadius: '4px', border: estBorne ? '1px solid #3d6b4f' : '1px solid #d6d0c4', background: dansPlage ? (estBorne ? '#3d6b4f' : 'rgba(61,107,79,0.18)') : '#fff', color: dansPlage && estBorne ? '#fff' : '#2a3d30', cursor: 'pointer', fontWeight: estBorne ? 600 : 400 }}>
                  {v.numero}
                </button>
              )
            })}
          </div>

          {plageSelectionnee.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#3d6b4f', margin: '0 0 4px' }}>
                {nomLivre(livre!)} {chapitre}, {debut}{fin && fin !== debut ? `–${fin}` : ''}
              </p>
              <div style={{ maxHeight: '90px', overflowY: 'auto', fontSize: '11px', color: '#2a2520', fontStyle: 'italic', lineHeight: 1.45 }}>
                {plageSelectionnee.map(v => <p key={v.numero} style={{ margin: '0 0 4px' }}><strong style={{ fontStyle: 'normal' }}>{v.numero}.</strong> {v.texte}</p>)}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {NIVEAUX_LIEN.map(n => (
                  <button key={n.champ} onClick={() => setNiveau(n.champ)}
                    style={{ fontSize: '10.5px', padding: '4px 9px', borderRadius: '4px', border: '1px solid #d6d0c4', background: niveau === n.champ ? '#3d6b4f' : '#fff', color: niveau === n.champ ? '#fff' : '#6b6560', cursor: 'pointer' }}>
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={() => { setDebut(null); setFin(null) }} disabled={debut === null}
              style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: debut === null ? 'default' : 'pointer' }}>
              Réinitialiser
            </button>
            <button onClick={associer} disabled={plageSelectionnee.length === 0 || enregistrement}
              style={{ fontSize: '11px', padding: '5px 14px', borderRadius: '4px', border: 'none', cursor: plageSelectionnee.length > 0 ? 'pointer' : 'default', background: plageSelectionnee.length > 0 ? '#3d6b4f' : '#e4dfd8', color: plageSelectionnee.length > 0 ? '#fff' : '#9a958d', fontWeight: 500 }}>
              {enregistrement ? 'Enregistrement…' : `Associer (${plageSelectionnee.length})`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}