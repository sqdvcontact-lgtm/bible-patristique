'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'

type LivreInfo = { code: string; nom: string; testament: 'AT' | 'NT'; nbVersets: number }

// Le projet Supabase plafonne chaque réponse à 1000 lignes (réglage serveur) :
// sur ~41 900 versets, il faut donc paginer pour tout récupérer.
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

const LIVRES: { code: string; nom: string; testament: 'AT' | 'NT' }[] = [
  { code: 'GEN', nom: 'Genèse', testament: 'AT' },
  { code: 'EXO', nom: 'Exode', testament: 'AT' },
  { code: 'LEV', nom: 'Lévitique', testament: 'AT' },
  { code: 'NUM', nom: 'Nombres', testament: 'AT' },
  { code: 'DEU', nom: 'Deutéronome', testament: 'AT' },
  { code: 'JOS', nom: 'Josué', testament: 'AT' },
  { code: 'JDG', nom: 'Juges', testament: 'AT' },
  { code: 'RUT', nom: 'Ruth', testament: 'AT' },
  { code: '1SA', nom: '1 Samuel', testament: 'AT' },
  { code: '2SA', nom: '2 Samuel', testament: 'AT' },
  { code: '1KI', nom: '1 Rois', testament: 'AT' },
  { code: '2KI', nom: '2 Rois', testament: 'AT' },
  { code: '1CH', nom: '1 Chroniques', testament: 'AT' },
  { code: '2CH', nom: '2 Chroniques', testament: 'AT' },
  { code: 'EZR', nom: 'Esdras', testament: 'AT' },
  { code: 'NEH', nom: 'Néhémie', testament: 'AT' },
  { code: 'EST', nom: 'Esther', testament: 'AT' },
  { code: 'JOB', nom: 'Job', testament: 'AT' },
  { code: 'PSA', nom: 'Psaumes', testament: 'AT' },
  { code: 'PRO', nom: 'Proverbes', testament: 'AT' },
  { code: 'ECC', nom: 'Ecclésiaste', testament: 'AT' },
  { code: 'SNG', nom: 'Cantique des cantiques', testament: 'AT' },
  { code: 'ISA', nom: 'Isaïe', testament: 'AT' },
  { code: 'JER', nom: 'Jérémie', testament: 'AT' },
  { code: 'LAM', nom: 'Lamentations', testament: 'AT' },
  { code: 'EZK', nom: 'Ézéchiel', testament: 'AT' },
  { code: 'DAN', nom: 'Daniel', testament: 'AT' },
  { code: 'HOS', nom: 'Osée', testament: 'AT' },
  { code: 'JOL', nom: 'Joël', testament: 'AT' },
  { code: 'AMO', nom: 'Amos', testament: 'AT' },
  { code: 'OBA', nom: 'Abdias', testament: 'AT' },
  { code: 'JON', nom: 'Jonas', testament: 'AT' },
  { code: 'MIC', nom: 'Michée', testament: 'AT' },
  { code: 'NAM', nom: 'Nahum', testament: 'AT' },
  { code: 'HAB', nom: 'Habacuc', testament: 'AT' },
  { code: 'ZEP', nom: 'Sophonie', testament: 'AT' },
  { code: 'HAG', nom: 'Aggée', testament: 'AT' },
  { code: 'ZEC', nom: 'Zacharie', testament: 'AT' },
  { code: 'MAL', nom: 'Malachie', testament: 'AT' },
  { code: 'MAT', nom: 'Matthieu', testament: 'NT' },
  { code: 'MRK', nom: 'Marc', testament: 'NT' },
  { code: 'LUK', nom: 'Luc', testament: 'NT' },
  { code: 'JHN', nom: 'Jean', testament: 'NT' },
  { code: 'ACT', nom: 'Actes', testament: 'NT' },
  { code: 'ROM', nom: 'Romains', testament: 'NT' },
  { code: '1CO', nom: '1 Corinthiens', testament: 'NT' },
  { code: '2CO', nom: '2 Corinthiens', testament: 'NT' },
  { code: 'GAL', nom: 'Galates', testament: 'NT' },
  { code: 'EPH', nom: 'Éphésiens', testament: 'NT' },
  { code: 'PHP', nom: 'Philippiens', testament: 'NT' },
  { code: 'COL', nom: 'Colossiens', testament: 'NT' },
  { code: '1TH', nom: '1 Thessaloniciens', testament: 'NT' },
  { code: '2TH', nom: '2 Thessaloniciens', testament: 'NT' },
  { code: '1TI', nom: '1 Timothée', testament: 'NT' },
  { code: '2TI', nom: '2 Timothée', testament: 'NT' },
  { code: 'TIT', nom: 'Tite', testament: 'NT' },
  { code: 'PHM', nom: 'Philémon', testament: 'NT' },
  { code: 'HEB', nom: 'Hébreux', testament: 'NT' },
  { code: 'JAS', nom: 'Jacques', testament: 'NT' },
  { code: '1PE', nom: '1 Pierre', testament: 'NT' },
  { code: '2PE', nom: '2 Pierre', testament: 'NT' },
  { code: '1JN', nom: '1 Jean', testament: 'NT' },
  { code: '2JN', nom: '2 Jean', testament: 'NT' },
  { code: '3JN', nom: '3 Jean', testament: 'NT' },
  { code: 'JUD', nom: 'Jude', testament: 'NT' },
  { code: 'REV', nom: 'Apocalypse', testament: 'NT' },
]

// ── Feu d'artifice ─────────────────────────────────────────────────────────────
const COULEURS_FEU = ['#3d6b4f', '#c0562a', '#d4af37', '#8a6fb0', '#3d8bc0', '#c0566a']

function FeuArtifice({ x, y, onFin }: { x: number; y: number; onFin: () => void }) {
  // 14 particules avec angle/distance/couleur/délai aléatoires
  const particules = useRef(
    Array.from({ length: 14 }, (_, i) => {
      const angle = (i / 14) * 360 + (Math.random() * 18 - 9)
      const distance = 32 + Math.random() * 28
      const couleur = COULEURS_FEU[Math.floor(Math.random() * COULEURS_FEU.length)]
      const taille = 3 + Math.random() * 2.5
      const delai = Math.random() * 60
      return { angle, distance, couleur, taille, delai }
    })
  ).current

  useEffect(() => {
    const t = setTimeout(onFin, 900)
    return () => clearTimeout(t)
  }, [onFin])

  return (
    <div style={{ position: 'fixed', left: x, top: y, pointerEvents: 'none', zIndex: 2000 }}>
      {particules.map((p, i) => {
        const rad = (p.angle * Math.PI) / 180
        const dx = Math.cos(rad) * p.distance
        const dy = Math.sin(rad) * p.distance
        return (
          <span key={i}
            style={{
              position: 'absolute', left: 0, top: 0,
              width: p.taille, height: p.taille, borderRadius: '50%',
              background: p.couleur,
              animation: `feu-particule 0.75s ease-out ${p.delai}ms forwards`,
              ['--dx' as any]: `${dx}px`,
              ['--dy' as any]: `${dy}px`,
            }}
          />
        )
      })}
      <style>{`
        @keyframes feu-particule {
          0%   { transform: translate(0, 0) scale(1);   opacity: 1; }
          70%  { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0.3); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ── Barre de progression ───────────────────────────────────────────────────────
function BarreProgression({ label, pourcentage, couleur }: { label: string; pourcentage: number; couleur: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', gap: '12px' }}>
        <span style={{ fontSize: '11px', color: '#6b6560', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '11px', color: '#3d6b4f', fontWeight: 700 }}>{Math.round(pourcentage)}%</span>
      </div>
      <div style={{ height: '7px', background: '#ebe7df', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pourcentage}%`, background: couleur,
          borderRadius: '999px', transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}

function StatutLecture({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div style={{ padding: '9px 12px', borderRadius: '8px', background: 'rgba(61,107,79,0.055)', border: '1px solid rgba(61,107,79,0.10)' }}>
      <p style={{ fontSize: '18px', color: '#2a3d30', fontFamily: "Georgia, 'Times New Roman', serif", margin: '0 0 2px' }}>{valeur}</p>
      <p style={{ fontSize: '10.5px', color: '#7a867b', margin: 0 }}>{label}</p>
    </div>
  )
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function useValeurAnimee(cible: number, duree = 1100) {
  const [valeur, setValeur] = useState(cible)
  const valeurRef = useRef(cible)

  useEffect(() => {
    const depart = valeurRef.current
    const delta = cible - depart
    if (Math.abs(delta) < 0.01) {
      setValeur(cible)
      valeurRef.current = cible
      return
    }

    let frame = 0
    const debut = performance.now()
    const animer = (maintenant: number) => {
      const progression = Math.min((maintenant - debut) / duree, 1)
      const suivante = depart + delta * easeOutCubic(progression)
      valeurRef.current = suivante
      setValeur(suivante)
      if (progression < 1) frame = requestAnimationFrame(animer)
    }

    frame = requestAnimationFrame(animer)
    return () => cancelAnimationFrame(frame)
  }, [cible, duree])

  return valeur
}

// ── Carte livre ─────────────────────────────────────────────────────────────────
function CarteLivre({ livre, lu, onToggle }: { livre: LivreInfo; lu: boolean; onToggle: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 12px', borderRadius: '8px',
      border: `1px solid ${lu ? 'rgba(61,107,79,0.35)' : '#e4dfd8'}`,
      background: lu ? 'rgba(61,107,79,0.07)' : '#fff',
      cursor: 'pointer', textAlign: 'left', width: '100%',
      transition: 'background 0.2s, border-color 0.2s',
    }}>
      <span style={{
        width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
        border: `1.5px solid ${lu ? '#3d6b4f' : '#c8c0b4'}`,
        background: lu ? '#3d6b4f' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s, border-color 0.2s',
      }}>
        {lu && (
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path d="M1 4.5L4 7.5L10 1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span style={{
        fontSize: '13px', color: lu ? '#2a3d30' : '#3a3530',
        fontWeight: lu ? 600 : 400, fontFamily: "Georgia, 'Times New Roman', serif",
      }}>
        {livre.nom}
      </span>
      <span style={{ fontSize: '10px', color: '#b0a89e', marginLeft: 'auto', flexShrink: 0 }}>
        {lu ? 'lu' : 'à lire'}
      </span>
    </button>
  )
}

export default function ProgressionClient() {
  const [livres, setLivres] = useState<LivreInfo[]>([])
  const [lus, setLus] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const [chargement, setChargement] = useState(true)
  const [feux, setFeux] = useState<{ id: number; x: number; y: number }[]>([])
  const feuId = useRef(0)

  // Charger session + nb versets par livre + livres déjà lus
  useEffect(() => {
    const chargerProgression = async (proprietaire: string | null) => {
      if (!proprietaire) {
        setLus(new Set())
        return
      }
      const { data: progData } = await supabase
        .from('progression_lecture')
        .select('livre_code')
        .eq('user_id', proprietaire)
      setLus(new Set((progData ?? []).map((p: any) => p.livre_code)))
    }

    const { data: abonnement } = supabase.auth.onAuthStateChange((_event, session) => {
      const prochainUid = session?.user.id ?? null
      setUserId(prochainUid)
      void chargerProgression(prochainUid)
    });

    (async () => {
      const { data: session } = await supabase.auth.getSession()
      const uid = session.session?.user.id ?? null
      setUserId(uid)

      // Compter les versets par livre
      const versetsData = await fetchPagine<{ livre: string }>((d, f) => supabase.from('versets').select('livre').range(d, f))
      const compte: Record<string, number> = {}
      ;(versetsData ?? []).forEach((v: any) => {
        compte[v.livre] = (compte[v.livre] ?? 0) + 1
      })
      const infos: LivreInfo[] = LIVRES.map(l => ({
        ...l,
        nbVersets: compte[l.code] ?? 0,
      }))
      setLivres(infos)

      await chargerProgression(uid)

      setChargement(false)
    })()

    return () => abonnement.subscription.unsubscribe()
  }, [])

  const toggleLivre = useCallback(async (code: string, e: React.MouseEvent) => {
    if (!userId) {
      alert('Connectez-vous pour suivre votre progression de lecture.')
      return
    }
    const dejaLu = lus.has(code)

    if (!dejaLu) {
      // Déclencher le feu d'artifice à la position du clic
      const id = feuId.current++
      setFeux(prev => [...prev, { id, x: e.clientX, y: e.clientY }])
      // Mise à jour immédiate (optimiste) : la case et les barres de
      // progression réagissent au clic sans attendre la réponse réseau.
      setLus(prev => new Set([...prev, code]))
      let { error } = await supabase
        .from('progression_lecture')
        .upsert({ user_id: userId, livre_code: code }, { onConflict: 'user_id,livre_code' })
      if (error) {
        const { error: deleteError } = await supabase.from('progression_lecture').delete().eq('user_id', userId).eq('livre_code', code)
        const { error: insertError } = deleteError
          ? { error: deleteError }
          : await supabase.from('progression_lecture').insert({ user_id: userId, livre_code: code })
        error = insertError
      }
      if (error) {
        // L'enregistrement a échoué : on annule la mise à jour optimiste.
        setLus(prev => { const n = new Set(prev); n.delete(code); return n })
      }
    } else {
      setLus(prev => { const n = new Set(prev); n.delete(code); return n })
      const { error } = await supabase.from('progression_lecture').delete().eq('user_id', userId).eq('livre_code', code)
      if (error) {
        setLus(prev => new Set([...prev, code]))
      }
    }
  }, [userId, lus])

  const retirerFeu = useCallback((id: number) => {
    setFeux(prev => prev.filter(f => f.id !== id))
  }, [])

  // Calcul des pourcentages, pondérés par nombre de versets
  const totalVersets = livres.reduce((s, l) => s + l.nbVersets, 0)
  const totalAT = livres.filter(l => l.testament === 'AT').reduce((s, l) => s + l.nbVersets, 0)
  const totalNT = livres.filter(l => l.testament === 'NT').reduce((s, l) => s + l.nbVersets, 0)

  const versetsLusAT = livres.filter(l => l.testament === 'AT' && lus.has(l.code)).reduce((s, l) => s + l.nbVersets, 0)
  const versetsLusNT = livres.filter(l => l.testament === 'NT' && lus.has(l.code)).reduce((s, l) => s + l.nbVersets, 0)
  const versetsLusTotal = versetsLusAT + versetsLusNT

  const pourcentTotal = totalVersets > 0 ? (versetsLusTotal / totalVersets) * 100 : 0
  const pourcentAT = totalAT > 0 ? (versetsLusAT / totalAT) * 100 : 0
  const pourcentNT = totalNT > 0 ? (versetsLusNT / totalNT) * 100 : 0
  const livresLus = livres.filter(l => lus.has(l.code)).length
  const pourcentTotalAnime = useValeurAnimee(pourcentTotal, 1300)
  const versetsLusAnimes = useValeurAnimee(versetsLusTotal, 1150)

  const livresAT = livres.filter(l => l.testament === 'AT')
  const livresNT = livres.filter(l => l.testament === 'NT')

  return (
    <main style={{ background: '#f7f4ef', minHeight: 'calc(100vh - 48px)', padding: '24px 24px 64px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <h1 style={{
          fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '22px',
          fontWeight: 'normal', color: '#2a3d30', marginBottom: '4px', textAlign: 'center',
        }}>
          Ma progression de lecture
        </h1>
        <p style={{ fontSize: '12px', color: '#9a958d', textAlign: 'center', marginBottom: '22px', fontStyle: 'italic' }}>
          Cochez un livre une fois sa lecture achevée.
        </p>

        <section style={{
          background: '#fff', border: '1px solid #e4dfd8', borderRadius: '10px',
          padding: '20px 22px', marginBottom: '24px', boxShadow: '0 8px 28px rgba(61,107,79,0.06)',
          position: 'sticky', top: '56px', zIndex: 10,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '22px', alignItems: 'center' }}>
            <div style={{
              width: '132px', height: '132px', borderRadius: '50%',
              background: `conic-gradient(#3d6b4f ${pourcentTotalAnime}%, #ece8df 0)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
            }}>
              <div style={{ width: '106px', height: '106px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '30px', color: '#2a3d30', lineHeight: 1 }}>{Math.round(pourcentTotalAnime)}%</span>
                <span style={{ fontSize: '10px', color: '#9a958d', marginTop: '3px' }}>parcouru</span>
              </div>
            </div>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginBottom: '14px' }}>
                <StatutLecture label="livres achevés" valeur={`${livresLus}/${livres.length || 66}`} />
                <StatutLecture label="versets couverts" valeur={Math.round(versetsLusAnimes).toLocaleString('fr-FR')} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                <BarreProgression label="Ancien Testament" pourcentage={pourcentAT} couleur="#7a8e7e" />
                <BarreProgression label="Nouveau Testament" pourcentage={pourcentNT} couleur="#9a7e5e" />
              </div>
            </div>
          </div>
        </section>

        {!userId && !chargement && (
          <div style={{
            background: '#fff', border: '1px solid #e4c4b8', borderRadius: '8px',
            padding: '12px 16px', marginBottom: '24px', fontSize: '12.5px', color: '#9a4a2a', textAlign: 'center',
          }}>
            Connectez-vous pour enregistrer votre progression.
          </div>
        )}

        {chargement ? (
          <p style={{ textAlign: 'center', color: '#9a958d', fontSize: '13px', fontStyle: 'italic' }}>Chargement…</p>
        ) : (
          <>
            <h2 style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#7a7268', marginBottom: '12px', marginTop: '8px',
            }}>
              Ancien Testament
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '32px' }}>
              {livresAT.map(l => (
                <CarteLivre key={l.code} livre={l} lu={lus.has(l.code)} onToggle={(e) => toggleLivre(l.code, e)} />
              ))}
            </div>

            <h2 style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#7a7268', marginBottom: '12px',
            }}>
              Nouveau Testament
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {livresNT.map(l => (
                <CarteLivre key={l.code} livre={l} lu={lus.has(l.code)} onToggle={(e) => toggleLivre(l.code, e)} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Animations feu d'artifice */}
      {feux.map(f => (
        <FeuArtifice key={f.id} x={f.x} y={f.y} onFin={() => retirerFeu(f.id)} />
      ))}
    </main>
  )
}
