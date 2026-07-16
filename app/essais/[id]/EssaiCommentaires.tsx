'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { calculerRang, couleurRang } from '@/app/lib/classement'
import EditeurCommentaire from '@/app/components/EditeurCommentaire'

type CommentaireEssai = {
  id: number; texte: string; passage_cite: string | null; reponse_a: number | null
  user_id: string | null; auteur_nom: string | null; valide: boolean; created_at: string; supprime: boolean
  score?: number | null
}

export default function EssaiCommentaires({ idEssai }: { idEssai: number }) {
  const [commentaires, setCommentaires] = useState<CommentaireEssai[]>([])
  const [tri, setTri] = useState<'pertinents' | 'recents'>('pertinents')
  const [texte, setTexte] = useState('')
  const [passageCite, setPassageCite] = useState('')
  const [afficherPassage, setAfficherPassage] = useState(false)
  const [cibleReponse, setCibleReponse] = useState<CommentaireEssai | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [pseudo, setPseudo] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [revelees, setRevelees] = useState<Set<number>>(new Set())

  useEffect(() => {
    supabase.from('essais_commentaires').select('id, texte, passage_cite, reponse_a, user_id, auteur_nom, valide, created_at, supprime').eq('id_essai', idEssai).order('created_at', { ascending: true })
      .then(async ({ data }) => {
        const lignes = data ?? []
        const ids = [...new Set(lignes.map(c => c.user_id).filter((id): id is string => !!id))]
        const { data: scores } = ids.length
          ? await supabase.from('classement_utilisateurs').select('user_id, score').in('user_id', ids)
          : { data: [] as any[] }
        const scoreMap = new Map((scores ?? []).map((s: any) => [s.user_id, s.score]))
        setCommentaires(lignes.map(c => ({ ...c, score: c.user_id ? scoreMap.get(c.user_id) ?? 0 : null })))
      })
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id ?? null
      setUserId(uid)
      if (uid) {
        const { data: profil } = await supabase.from('profils').select('pseudo, est_admin').eq('id', uid).maybeSingle()
        setPseudo(profil?.pseudo ?? null)
        setIsAdmin(profil?.est_admin ?? false)
      }
    })
  }, [idEssai])

  const supprimerCommentaire = async (id: number) => {
    if (!window.confirm('Supprimer définitivement ce commentaire ?')) return
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    const res = await fetch('/api/essais/supprimer-commentaire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setCommentaires(prev => prev.filter(c => c.id !== id))
  }

  const supprimerMonCommentaire = async (id: number) => {
    if (!window.confirm('Supprimer ce commentaire ? Il restera visible en tant que commentaire supprimé.')) return
    const { error } = await supabase.from('essais_commentaires').update({ supprime: true }).eq('id', id)
    if (!error) setCommentaires(prev => prev.map(c => c.id === id ? { ...c, supprime: true } : c))
  }

  const envoyer = async () => {
    if (!texte.trim() || !userId) return
    setEnvoi(true)
    const { data, error } = await supabase.from('essais_commentaires').insert({
      id_essai: idEssai,
      texte: texte.trim(),
      passage_cite: passageCite.trim() || null,
      reponse_a: cibleReponse?.id ?? null,
      user_id: userId,
      auteur_nom: pseudo ?? 'Utilisateur',
      valide: false,
    }).select().single()
    setEnvoi(false)
    if (!error && data) {
      setCommentaires(prev => [...prev, data])
      setTexte('')
      setPassageCite('')
      setAfficherPassage(false)
      setCibleReponse(null)
    }
  }

  const nbReponses = (id: number) => commentaires.filter(c => c.reponse_a === id).length
  const racines = commentaires.filter(c => c.reponse_a === null)
  const racinesTriees = [...racines].sort((a, b) => {
    if (tri === 'recents') return +new Date(b.created_at) - +new Date(a.created_at)
    const diff = nbReponses(b.id) - nbReponses(a.id)
    return diff !== 0 ? diff : +new Date(b.created_at) - +new Date(a.created_at)
  })
  const dateHeureCommentaire = (date: string) =>
    new Date(date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const changerTri = (valeur: 'pertinents' | 'recents') => {
    const doc = document as Document & { startViewTransition?: (callback: () => void) => void }
    if (doc.startViewTransition) doc.startViewTransition(() => setTri(valeur))
    else setTri(valeur)
  }

  const LigneActions = ({ c, petit = false }: { c: CommentaireEssai; petit?: boolean }) => (
    <div style={{ display: 'flex', gap: petit ? '7px' : '8px', alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap', marginTop: petit ? '4px' : '5px' }}>
      {userId && !petit && (
        <button onClick={() => setCibleReponse(c)} style={{ fontSize: '10.5px', color: '#3d6b4f', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Répondre</button>
      )}
      {isAdmin && (
        <button onClick={() => supprimerCommentaire(c.id)} style={{ fontSize: petit ? '10px' : '10.5px', color: '#c0562a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>Supprimer</button>
      )}
      {!isAdmin && userId === c.user_id && (
        <button onClick={() => supprimerMonCommentaire(c.id)} style={{ fontSize: petit ? '10px' : '10.5px', color: '#9a958d', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Supprimer</button>
      )}
    </div>
  )

  const CommentaireRetracte = ({ c, petit = false }: { c: CommentaireEssai; petit?: boolean }) => (
    <button className="commentaire-retracte" onClick={() => setRevelees(prev => new Set(prev).add(c.id))}
      style={{ width: '100%', display: 'block', position: 'relative', overflow: 'hidden', background: 'rgba(176,58,42,0.06)', border: '1px solid rgba(176,58,42,0.20)', borderRadius: petit ? '5px' : '6px', cursor: 'pointer', padding: petit ? '7px 9px' : '8px 11px', textAlign: 'left' }}>
      <span className="commentaire-retracte-contenu" style={{ display: 'block', fontSize: petit ? '11px' : '12px', color: '#b0392b', fontWeight: 600 }}>
        Commentaire en attente de contrôle.
      </span>
    </button>
  )

  const Carte = ({ c }: { c: CommentaireEssai }) => {
    const reponses = commentaires.filter(r => r.reponse_a === c.id)
    const cache = !c.supprime && !c.valide && !revelees.has(c.id)
    const styleCarte: React.CSSProperties = c.valide
      ? { border: '1px solid #e4dfd8', borderLeft: '4px solid #d6d0c4', background: '#fff' }
      : { border: '1px solid rgba(176,58,42,0.26)', borderLeft: '4px solid #b03a2a', background: 'rgba(176,58,42,0.07)' }
    const rang = c.score !== null && c.score !== undefined ? calculerRang(c.score).rang : null
    const rangCouleur = rang ? couleurRang(rang) : null

    return (
      <article className="commentaire-carte" style={{ padding: '12px 0', borderBottom: '1px solid #ede9e2', viewTransitionName: `commentaire-essai-${c.id}` }}>
        {c.supprime ? (
          <p style={{ fontSize: '12.5px', color: '#9a958d', fontStyle: 'italic', margin: 0, background: '#f3f0ea', padding: '8px 10px', borderRadius: '4px' }}>
            {c.auteur_nom ?? 'Un utilisateur'} a supprimé un commentaire
          </p>
        ) : cache ? (
          <CommentaireRetracte c={c} />
        ) : (
          <div className="commentaire-carte" style={{ ...styleCarte, padding: '10px 12px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', gap: '10px' }}>
              <p style={{ fontSize: '11.5px', fontWeight: 600, color: '#2a3d30', margin: 0 }}>
                {c.auteur_nom ?? 'Anonyme'}
                {rang && rangCouleur && <span style={{ marginLeft: '7px', fontSize: '9px', color: rangCouleur.texte, background: rangCouleur.fond, borderRadius: '3px', padding: '1px 6px' }}>{rang}</span>}
                {!c.valide && <span style={{ marginLeft: '8px', fontSize: '8px', fontWeight: 700, color: '#b03a2a', background: 'rgba(176,58,42,0.10)', padding: '1px 6px', borderRadius: '3px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>En révision</span>}
              </p>
              <span style={{ fontSize: '10px', color: '#b0a89e', whiteSpace: 'nowrap', flexShrink: 0 }}>{dateHeureCommentaire(c.created_at)}</span>
            </div>
            {c.passage_cite && (
              <blockquote style={{ fontSize: '12px', color: '#756d64', fontStyle: 'italic', borderLeft: '2px solid #d6d0c4', paddingLeft: '10px', margin: '0 0 7px' }}>
                « {c.passage_cite} »
              </blockquote>
            )}
            <div style={{ fontSize: '12.5px', color: c.valide ? '#3a3020' : '#6f3d35', lineHeight: 1.55 }}>{rendreTexteEnrichi(c.texte)}</div>
            <LigneActions c={c} />
          </div>
        )}

        {reponses.map(r => (
          (() => {
            const rangR = r.score !== null && r.score !== undefined ? calculerRang(r.score).rang : null
            const rangCouleurR = rangR ? couleurRang(rangR) : null
            const cacheReponse = !r.supprime && !r.valide && !revelees.has(r.id)
            return (
          <div className="commentaire-carte" key={r.id} style={{ marginLeft: '20px', marginTop: '10px', paddingLeft: '12px', borderLeft: '2px solid #ede9e2', viewTransitionName: `commentaire-essai-${r.id}` }}>
            {r.supprime ? (
              <p style={{ fontSize: '11.5px', color: '#9a958d', fontStyle: 'italic', margin: 0, background: '#f3f0ea', padding: '6px 9px', borderRadius: '4px' }}>
                {r.auteur_nom ?? 'Un utilisateur'} a supprimé un commentaire
              </p>
            ) : cacheReponse ? (
              <CommentaireRetracte c={r} petit />
            ) : (
              <div className="commentaire-carte" style={{ padding: '9px 11px', borderRadius: '5px', background: r.valide ? '#fff' : 'rgba(176,58,42,0.07)', border: `1px solid ${r.valide ? '#e4dfd8' : 'rgba(176,58,42,0.26)'}`, borderLeft: `3px solid ${r.valide ? '#d6d0c4' : '#b03a2a'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px', gap: '8px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#2a3d30', margin: 0 }}>
                    {r.auteur_nom ?? 'Anonyme'}
                    {rangR && rangCouleurR && <span style={{ marginLeft: '6px', fontSize: '8.5px', color: rangCouleurR.texte, background: rangCouleurR.fond, borderRadius: '3px', padding: '1px 5px' }}>{rangR}</span>}
                    {!r.valide && <span style={{ marginLeft: '7px', fontSize: '7.5px', fontWeight: 700, color: '#b03a2a', letterSpacing: '0.06em', textTransform: 'uppercase' }}>En révision</span>}
                  </p>
                  <span style={{ fontSize: '9.5px', color: '#b0a89e', whiteSpace: 'nowrap', flexShrink: 0 }}>{dateHeureCommentaire(r.created_at)}</span>
                </div>
                {r.passage_cite && (
                  <blockquote style={{ fontSize: '11.5px', color: '#756d64', fontStyle: 'italic', borderLeft: '2px solid #d6d0c4', paddingLeft: '8px', margin: '0 0 5px' }}>« {r.passage_cite} »</blockquote>
                )}
                <div style={{ fontSize: '12px', color: r.valide ? '#3a3020' : '#6f3d35', lineHeight: 1.55 }}>{rendreTexteEnrichi(r.texte)}</div>
                <LigneActions c={r} petit />
              </div>
            )}
          </div>
            )
          })()
        ))}
      </article>
    )
  }

  return (
    <section style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #d6d0c4' }}>
      <style>{`
        .commentaire-carte {
          transition: opacity 180ms ease, box-shadow 180ms ease, margin 180ms ease;
        }
        .commentaire-retracte {
          transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
        }
        .commentaire-retracte:hover {
          background: rgba(176,58,42,0.09) !important;
          border-color: rgba(176,58,42,0.30) !important;
          transform: translateX(1px);
        }
        .commentaire-retracte-contenu {
          transition: opacity 150ms ease, transform 150ms ease;
        }
        .commentaire-retracte:hover .commentaire-retracte-contenu {
          opacity: 0.13;
          transform: translateX(-6px);
        }
        .commentaire-retracte::after {
          content: "Lire tout de même  →";
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(176,58,42,0);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.04em;
          pointer-events: none;
          transform: translateX(-10px);
          transition: color 160ms ease, transform 160ms ease;
        }
        .commentaire-retracte:hover::after {
          color: rgba(176,58,42,0.82);
          transform: translateX(0);
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '17px', fontWeight: 'normal', color: '#2a3d30', margin: 0 }}>
          {racines.length > 0
            ? <>{racines.length} <span style={{ fontStyle: 'italic' }}>commentaire{racines.length > 1 ? 's' : ''}</span></>
            : <span style={{ fontStyle: 'italic' }}>Commentaires</span>}
        </h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['pertinents', 'recents'] as const).map(t => (
            <button key={t} onClick={() => changerTri(t)}
              style={{ fontSize: '10.5px', padding: '3px 10px', borderRadius: '10px', border: `1px solid ${tri === t ? '#3d6b4f' : '#d6d0c4'}`, background: tri === t ? 'rgba(61,107,79,0.10)' : '#fff', color: tri === t ? '#3d6b4f' : '#8a8278', cursor: 'pointer' }}>
              {t === 'pertinents' ? 'Pertinents' : 'Récents'}
            </button>
          ))}
        </div>
      </div>

      {userId ? (
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {cibleReponse && (
            <p style={{ fontSize: '11px', color: '#6b6560', background: '#faf8f4', padding: '5px 9px', borderRadius: '4px', margin: 0 }}>
              En réponse à {cibleReponse.auteur_nom} - <button onClick={() => setCibleReponse(null)} style={{ color: '#c0562a', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px' }}>annuler</button>
            </p>
          )}
          <EditeurCommentaire value={texte} onChange={setTexte} placeholder="Votre commentaire…" minHeight={76} />
          {!afficherPassage ? (
            <button onClick={() => setAfficherPassage(true)} style={{ fontSize: '10.5px', color: '#3d6b4f', background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start', padding: 0 }}>+ Citer un passage précis de l'essai</button>
          ) : (
            <textarea value={passageCite} onChange={e => setPassageCite(e.target.value)} rows={2} placeholder="Collez ici le passage exact que vous commentez…"
              style={{ width: '100%', fontSize: '12px', fontStyle: 'italic', padding: '7px 9px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#faf8f4', color: '#5a5450', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
          )}
          <button onClick={envoyer} disabled={envoi || !texte.trim()} style={{ alignSelf: 'flex-end', fontSize: '11.5px', padding: '6px 16px', borderRadius: '5px', border: 'none', background: texte.trim() ? '#3d6b4f' : '#e4dfd8', color: texte.trim() ? '#fff' : '#9a958d', cursor: texte.trim() ? 'pointer' : 'default', fontWeight: 500 }}>
            {envoi ? 'Envoi…' : 'Publier'}
          </button>
        </div>
      ) : (
        <p style={{ fontSize: '12px', color: '#9a958d', marginBottom: '20px' }}>Connectez-vous pour commenter.</p>
      )}

      {racinesTriees.length === 0 ? (
        <p style={{ fontSize: '12.5px', color: '#9a958d', fontStyle: 'italic' }}>Aucun commentaire pour l'instant.</p>
      ) : racinesTriees.map(c => <Carte key={c.id} c={c} />)}
    </section>
  )
}
