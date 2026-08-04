'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'
import { LIVRES, LivreBible } from '@/app/lib/bible'

// ── Feu d'artifice ─────────────────────────────────────────────────────────────
const COULEURS_FEU = ['var(--cs-vert)', '#c0562a', '#d4af37', '#8a6fb0', '#3d8bc0', '#c0566a']

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
        <span style={{ fontSize: '0.6875rem', color: '#6b6560', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '0.6875rem', color: 'var(--cs-vert)', fontWeight: 700 }}>{Math.round(pourcentage)}%</span>
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
    <div style={{ padding: '9px 12px', borderRadius: '8px', background: 'rgba(var(--cs-vert-rgb),0.055)', border: '1px solid rgba(var(--cs-vert-rgb),0.10)' }}>
      <p style={{ fontSize: '1.125rem', color: '#2a3d30', fontFamily: "var(--font-source-serif), Georgia, serif", margin: '0 0 2px' }}>{valeur}</p>
      <p style={{ fontSize: '0.65625rem', color: '#7a867b', margin: 0 }}>{label}</p>
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
function CarteLivre({ livre, lu, onToggle }: { livre: LivreBible; lu: boolean; onToggle: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 12px', borderRadius: '8px',
      border: `1px solid ${lu ? 'rgba(var(--cs-vert-rgb),0.35)' : '#e4dfd8'}`,
      background: lu ? 'rgba(var(--cs-vert-rgb),0.07)' : '#fff',
      cursor: 'pointer', textAlign: 'left', width: '100%',
      transition: 'background 0.2s, border-color 0.2s',
    }}>
      <span style={{
        width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
        border: `1.5px solid ${lu ? 'var(--cs-vert)' : '#c8c0b4'}`,
        background: lu ? 'var(--cs-vert)' : 'transparent',
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
        fontSize: '0.8125rem', color: lu ? '#2a3d30' : '#3a3530',
        fontWeight: lu ? 600 : 400, fontFamily: "var(--font-source-serif), Georgia, serif",
      }}>
        {livre.nom}
      </span>
      <span style={{ fontSize: '0.625rem', color: '#b0a89e', marginLeft: 'auto', flexShrink: 0 }}>
        {lu ? 'lu' : 'à lire'}
      </span>
    </button>
  )
}

export default function ProgressionClient() {
  const [lus, setLus] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const [chargement, setChargement] = useState(true)
  const [feux, setFeux] = useState<{ id: number; x: number; y: number }[]>([])
  const feuId = useRef(0)

  useEffect(() => {
    const chargerProgression = async (proprietaire: string | null) => {
      if (!proprietaire) { setLus(new Set()); return }
      const { data } = await supabase
        .from('progression_lecture')
        .select('livre_code')
        .eq('user_id', proprietaire)
      setLus(new Set((data ?? []).map((p: any) => p.livre_code)))
    }

    const { data: abonnement } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user.id ?? null
      setUserId(uid)
      void chargerProgression(uid)
    });

    (async () => {
      const { data: session } = await supabase.auth.getSession()
      const uid = session.session?.user.id ?? null
      setUserId(uid)
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

  // Calcul des pourcentages, pondérés par nombre de versets (comptages statiques)
  const livresAT = LIVRES.filter(l => l.testament === 'AT')
  const livresNT = LIVRES.filter(l => l.testament === 'NT')

  const totalVersets = LIVRES.reduce((s, l) => s + l.nbVersets, 0)
  const totalAT = livresAT.reduce((s, l) => s + l.nbVersets, 0)
  const totalNT = livresNT.reduce((s, l) => s + l.nbVersets, 0)

  const versetsLusAT = livresAT.filter(l => lus.has(l.code)).reduce((s, l) => s + l.nbVersets, 0)
  const versetsLusNT = livresNT.filter(l => lus.has(l.code)).reduce((s, l) => s + l.nbVersets, 0)
  const versetsLusTotal = versetsLusAT + versetsLusNT

  const livresLus = LIVRES.filter(l => lus.has(l.code)).length

  const tousATLus = livresAT.length > 0 && livresAT.every(l => lus.has(l.code))
  const tousNTLus = livresNT.length > 0 && livresNT.every(l => lus.has(l.code))
  const tousTousLus = tousATLus && tousNTLus

  const pourcentATBrut = totalAT > 0 ? (versetsLusAT / totalAT) * 100 : 0
  const pourcentNTBrut = totalNT > 0 ? (versetsLusNT / totalNT) * 100 : 0
  const pourcentTotalBrut = totalVersets > 0 ? (versetsLusTotal / totalVersets) * 100 : 0

  // Bloquer à 99 max si au moins un livre du testament n'est pas lu
  const pourcentAT = tousATLus ? pourcentATBrut : Math.min(pourcentATBrut, 99)
  const pourcentNT = tousNTLus ? pourcentNTBrut : Math.min(pourcentNTBrut, 99)
  const pourcentTotal = tousTousLus ? pourcentTotalBrut : Math.min(pourcentTotalBrut, 99)

  const pourcentTotalAnime = useValeurAnimee(pourcentTotal, 1300)
  const versetsLusAnimes = useValeurAnimee(versetsLusTotal, 1150)

  return (
    <main style={{ background: '#f7f4ef', minHeight: 'calc(100vh - 3.5rem)', padding: '24px 24px 64px' }}>
      <div style={{ maxWidth: '42.5rem', margin: '0 auto' }}>
        <h1 style={{
          fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.375rem',
          fontWeight: 'normal', color: '#2a3d30', marginBottom: '4px', textAlign: 'center',
        }}>
          Ma progression de lecture
        </h1>
        <p style={{ fontSize: '0.75rem', color: '#9a958d', textAlign: 'center', marginBottom: '22px', fontStyle: 'italic' }}>
          Cochez un livre une fois sa lecture achevée.
        </p>

        <section style={{
          background: '#fff', border: '1px solid #e4dfd8', borderRadius: '10px',
          padding: '20px 22px', marginBottom: '24px', boxShadow: '0 8px 28px rgba(var(--cs-vert-rgb),0.06)',
          position: 'sticky', top: '56px', zIndex: 10,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '22px', alignItems: 'center' }}>
            <div style={{
              width: '8.25rem', height: '132px', borderRadius: '50%',
              background: `conic-gradient(var(--cs-vert) ${pourcentTotalAnime}%, #ece8df 0)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
            }}>
              <div style={{ width: '6.625rem', height: '106px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.875rem', color: '#2a3d30', lineHeight: 1 }}>{Math.round(pourcentTotalAnime)}%</span>
                <span style={{ fontSize: '0.625rem', color: '#9a958d', marginTop: '3px' }}>parcouru</span>
              </div>
            </div>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginBottom: '14px' }}>
                <StatutLecture label="livres achevés" valeur={`${livresLus}/${LIVRES.length}`} />
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
            padding: '12px 16px', marginBottom: '24px', fontSize: '0.78125rem', color: '#9a4a2a', textAlign: 'center',
          }}>
            Connectez-vous pour enregistrer votre progression.
          </div>
        )}

        {chargement ? (
          <p style={{ textAlign: 'center', color: '#9a958d', fontSize: '0.8125rem', fontStyle: 'italic' }}>Chargement…</p>
        ) : (
          <>
            <h2 style={{
              fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
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
              fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
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
