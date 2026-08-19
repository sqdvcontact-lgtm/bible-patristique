'use client'

import { useEffect, useState, useCallback, type CSSProperties } from 'react'
import { supabase } from '@/app/lib/supabase'

type Proposition = {
  id: string
  titre: string
  description: string
  tag?: string
}

const PROPOSITIONS: Proposition[] = [
  {
    id: 'pub_interrupteur',
    titre: 'Mode « Avec publicité »',
    description: 'Un interrupteur dans votre profil vous permettrait d\'activer des encarts publicitaires discrets sur certaines pages. En échange, l\'accès au site resterait entièrement gratuit.',
    tag: 'Gratuit',
  },
  {
    id: 'article_payant',
    titre: 'Publication d\'un essai',
    description: 'Le premier essai publié serait offert. Les suivants feraient l\'objet d\'une petite contribution, permettant de financer la relecture et la mise en ligne.',
    tag: 'Freemium',
  },
  {
    id: 'relecteur',
    titre: 'Solliciter un relecteur',
    description: 'Depuis la page « Essais », possibilité de demander une relecture orthographique et stylistique de votre texte avant publication, moyennant une contribution modique.',
    tag: 'Service',
  },
  {
    id: 'abonnement_bdd',
    titre: 'Abonnement — Base de données',
    description: 'Accès avancé à la base patristique : exports, recherches croisées, statistiques de lecture et fonctions réservées aux abonnés.',
    tag: 'Abonnement',
  },
  {
    id: 'abonnement_commentaires',
    titre: 'Abonnement — Commentaires',
    description: 'La possibilité de commenter les versets et les essais serait réservée aux membres actifs, afin de maintenir la qualité des échanges.',
    tag: 'Abonnement',
  },
]

const TAG_COULEUR: Record<string, { fond: string; texte: string }> = {
  'Gratuit':    { fond: 'rgba(var(--cs-vert-rgb),0.10)',  texte: '#2a5c3a' },
  'Freemium':   { fond: 'rgba(var(--cs-vert-rgb),0.08)',  texte: 'var(--cs-vert)' },
  'Service':    { fond: 'rgba(154,126,61,0.12)', texte: '#7a5e1e' },
  'Abonnement': { fond: 'rgba(90,80,140,0.10)',  texte: '#4a3e7a' },
}

const fondParchemin: CSSProperties = {
  background: 'rgba(255,253,249,0.92)',
  border: '1px solid #ded6ca',
  boxShadow: '0 4px 14px rgba(44,35,24,0.035)',
}

export default function VotesClient() {
  const [userId, setUserId] = useState<string | null>(null)
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [mesVotes, setMesVotes] = useState<Set<string>>(new Set())
  const [chargement, setChargement] = useState(true)
  const [enCours, setEnCours] = useState<Set<string>>(new Set())

  useEffect(() => {
    const init = async () => {
      const { data: session } = await supabase.auth.getSession()
      const uid = session.session?.user.id ?? null
      setUserId(uid)

      // Totaux via une fonction agrégée (ne renvoie que des comptes, jamais la
      // liste des votants) ; on ne lit directement QUE ses propres votes.
      const [comptesRes, miensRes] = await Promise.all([
        supabase.rpc('compter_votes_monetisation'),
        uid
          ? supabase.from('monetisation_votes').select('proposition_id').eq('user_id', uid)
          : Promise.resolve({ data: [] as { proposition_id: string }[] }),
      ])
      const comptage: Record<string, number> = {}
      ;((comptesRes.data ?? []) as { proposition_id: string; total: number }[]).forEach(r => {
        comptage[r.proposition_id] = Number(r.total)
      })
      setVotes(comptage)
      setMesVotes(new Set(((miensRes.data ?? []) as { proposition_id: string }[]).map(v => v.proposition_id)))
      setChargement(false)
    }
    init()
  }, [])

  const voter = useCallback(async (propId: string) => {
    if (!userId) { alert('Connectez-vous pour voter.'); return }
    if (enCours.has(propId)) return
    setEnCours(prev => new Set([...prev, propId]))

    const dejaVote = mesVotes.has(propId)
    if (dejaVote) {
      setMesVotes(prev => { const n = new Set(prev); n.delete(propId); return n })
      setVotes(prev => ({ ...prev, [propId]: Math.max((prev[propId] ?? 1) - 1, 0) }))
      await supabase.from('monetisation_votes').delete().eq('proposition_id', propId).eq('user_id', userId)
    } else {
      setMesVotes(prev => new Set([...prev, propId]))
      setVotes(prev => ({ ...prev, [propId]: (prev[propId] ?? 0) + 1 }))
      await supabase.from('monetisation_votes').insert({ proposition_id: propId, user_id: userId })
    }
    setEnCours(prev => { const n = new Set(prev); n.delete(propId); return n })
  }, [userId, mesVotes, enCours])

  return (
    <section style={{ maxWidth: '40rem', width: '100%', margin: '0 auto', padding: '64px 24px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ width: '36px', height: '1px', background: 'var(--cs-bord)', margin: '0 auto 28px' }} />
        <h2 style={{
          fontFamily: "var(--font-source-serif), Georgia, serif",
          fontSize: 'clamp(17px, 2.5vw, 22px)',
          fontWeight: 'normal', color: 'var(--cs-encre)', marginBottom: '16px',
        }}>
          Pistes de monétisation
        </h2>
        <div style={{
          ...fondParchemin,
          maxWidth: '32.5rem',
          margin: '0 auto',
          borderRadius: '8px',
          padding: '13px 18px',
        }}>
        <p style={{ fontSize: '0.84375rem', color: '#4f604f', lineHeight: 1.72, margin: 0 }}>
          Pour continuer à développer Corpus Scriptura et y consacrer davantage de temps, j’explore plusieurs pistes.
          Aucune décision n’est prise : vos votes m’aident à comprendre ce qui vous semble acceptable.
        </p>
        </div>
      </div>

      {chargement ? (
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {PROPOSITIONS.map(p => {
            const vote = mesVotes.has(p.id)
            const nb = votes[p.id] ?? 0
            const tag = p.tag ? TAG_COULEUR[p.tag] : null
            return (
              <div key={p.id} style={{
                ...fondParchemin,
                background: vote ? 'rgba(250,253,250,0.96)' : fondParchemin.background,
                border: `1px solid ${vote ? 'rgba(var(--cs-vert-rgb),0.34)' : '#ded6ca'}`,
                borderRadius: '8px',
                padding: '15px 18px 15px 20px',
                display: 'flex', gap: '16px', alignItems: 'flex-start',
                transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <span aria-hidden style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: vote ? '3px' : '1px',
                  background: vote ? 'var(--cs-vert)' : '#d8d0c4',
                  opacity: vote ? 0.72 : 0.9,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: "var(--font-source-serif), Georgia, serif",
                      fontSize: '0.90625rem', color: 'var(--cs-encre-fonce)', fontWeight: 'normal',
                    }}>
                      {p.titre}
                    </span>
                    {p.tag && tag && (
                      <span style={{
                        fontSize: '0.59375rem', fontWeight: 600, letterSpacing: '0.06em',
                        textTransform: 'uppercase', padding: '2px 7px', borderRadius: '4px',
                        background: tag.fond, color: tag.texte,
                      }}>
                        {p.tag}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-second)', lineHeight: 1.65, margin: 0 }}>
                    {p.description}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                  <button
                    onClick={() => voter(p.id)}
                    title={vote ? 'Retirer mon soutien' : 'Soutenir cette proposition'}
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      border: `1px solid ${vote ? 'var(--cs-vert)' : '#d8d0c4'}`,
                      background: vote ? 'var(--cs-vert)' : '#fff',
                      color: vote ? '#fff' : '#8a8278',
                      cursor: 'pointer', fontSize: '0.9375rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                    }}
                  >
                    ▲
                  </button>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700,
                    color: vote ? 'var(--cs-vert)' : 'var(--cs-texte-doux)',
                    lineHeight: 1,
                  }}>
                    {nb}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!userId && !chargement && (
        <p style={{ textAlign: 'center', fontSize: '0.71875rem', color: 'var(--cs-texte-doux)', marginTop: '16px', fontStyle: 'italic' }}>
          Connectez-vous pour voter.
        </p>
      )}
    </section>
  )
}
