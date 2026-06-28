'use client'

import { useEffect, useState, useCallback } from 'react'
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
  'Gratuit':    { fond: 'rgba(61,107,79,0.10)',  texte: '#2a5c3a' },
  'Freemium':   { fond: 'rgba(61,107,79,0.08)',  texte: '#3d6b4f' },
  'Service':    { fond: 'rgba(154,126,61,0.12)', texte: '#7a5e1e' },
  'Abonnement': { fond: 'rgba(90,80,140,0.10)',  texte: '#4a3e7a' },
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

      const { data } = await supabase.from('monetisation_votes').select('proposition_id, user_id')
      const comptage: Record<string, number> = {}
      const miens = new Set<string>()
      ;(data ?? []).forEach((v: any) => {
        comptage[v.proposition_id] = (comptage[v.proposition_id] ?? 0) + 1
        if (uid && v.user_id === uid) miens.add(v.proposition_id)
      })
      setVotes(comptage)
      setMesVotes(miens)
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
    <section style={{ maxWidth: '600px', width: '100%', margin: '0 auto', padding: '64px 24px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ width: '36px', height: '1px', background: '#c8c0b4', margin: '0 auto 28px' }} />
        <h2 style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 'clamp(17px, 2.5vw, 22px)',
          fontWeight: 'normal', color: '#2a3d30', marginBottom: '16px',
        }}>
          Pistes de monétisation
        </h2>
        <p style={{ fontSize: '13.5px', color: '#5a6b5e', lineHeight: 1.75, margin: '0 auto', maxWidth: '480px' }}>
          Pour continuer à développer Corpus Scriptura et y consacrer davantage de temps, j'explore plusieurs pistes.
          Aucune décision n'est prise : vos votes m'aident à comprendre ce qui vous semble acceptable.
        </p>
      </div>

      {chargement ? (
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {PROPOSITIONS.map(p => {
            const vote = mesVotes.has(p.id)
            const nb = votes[p.id] ?? 0
            const tag = p.tag ? TAG_COULEUR[p.tag] : null
            return (
              <div key={p.id} style={{
                background: '#fff',
                border: `1px solid ${vote ? 'rgba(61,107,79,0.35)' : '#e4dfd8'}`,
                borderRadius: '10px',
                padding: '16px 18px',
                display: 'flex', gap: '16px', alignItems: 'flex-start',
                transition: 'border-color 0.15s',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      fontSize: '14.5px', color: '#1e2e24', fontWeight: 'normal',
                    }}>
                      {p.titre}
                    </span>
                    {p.tag && tag && (
                      <span style={{
                        fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.06em',
                        textTransform: 'uppercase', padding: '2px 7px', borderRadius: '4px',
                        background: tag.fond, color: tag.texte,
                      }}>
                        {p.tag}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#6b6560', lineHeight: 1.65, margin: 0 }}>
                    {p.description}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                  <button
                    onClick={() => voter(p.id)}
                    title={vote ? 'Retirer mon soutien' : 'Soutenir cette proposition'}
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      border: `1.5px solid ${vote ? '#3d6b4f' : '#d6d0c4'}`,
                      background: vote ? '#3d6b4f' : '#fff',
                      color: vote ? '#fff' : '#9a958d',
                      cursor: 'pointer', fontSize: '15px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                    }}
                  >
                    ▲
                  </button>
                  <span style={{
                    fontSize: '12px', fontWeight: 700,
                    color: vote ? '#3d6b4f' : '#9a958d',
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
        <p style={{ textAlign: 'center', fontSize: '11.5px', color: '#9a958d', marginTop: '16px', fontStyle: 'italic' }}>
          Connectez-vous pour voter.
        </p>
      )}
    </section>
  )
}
