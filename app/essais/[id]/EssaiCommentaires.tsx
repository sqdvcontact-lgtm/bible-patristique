'use client'

import { useEffect, useState } from 'react'
import { MESSAGE_COMMENTAIRE_INTERDIT, termesInterditsDansTexte } from '@/app/lib/moderationLexique'
import { supabase } from '@/app/lib/supabase'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { calculerRang, couleurRang } from '@/app/lib/classement'
import EditeurCommentaire from '@/app/components/EditeurCommentaire'
import { useCompte } from '@/app/lib/contexteCompte'
import InvitationCompteInline from '@/app/components/InvitationCompteInline'

type CommentaireEssai = {
  id: number; texte: string; passage_cite: string | null; reponse_a: number | null
  user_id: string | null; auteur_nom: string | null; valide: boolean; created_at: string; supprime: boolean
  lecture?: { nb_auteurs: number; total_auteurs: number } | null
}

export default function EssaiCommentaires({ idEssai }: { idEssai: number }) {
  const [commentaires, setCommentaires] = useState<CommentaireEssai[]>([])
  const [texte, setTexte] = useState('')
  const [passageCite, setPassageCite] = useState('')
  const [afficherPassage, setAfficherPassage] = useState(false)
  const [cibleReponse, setCibleReponse] = useState<CommentaireEssai | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [pseudo, setPseudo] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [revelees, setRevelees] = useState<Set<number>>(new Set())
  const { aUnCompte, exigerCompte } = useCompte()

  useEffect(() => {
    supabase.from('essais_commentaires').select('id, texte, passage_cite, reponse_a, user_id, auteur_nom, valide, created_at, supprime').eq('id_essai', idEssai).order('created_at', { ascending: true })
      .then(async ({ data }) => {
        const lignes = data ?? []
        const ids = [...new Set(lignes.map(c => c.user_id).filter((id): id is string => !!id))]
        const { data: scores } = ids.length
          ? await supabase.from('classement_utilisateurs').select('user_id, score').in('user_id', ids)
          : { data: [] as any[] }
        const scoreMap = new Map((scores ?? []).map((s: any) => [s.user_id, s]))
        setCommentaires(lignes.map(c => ({ ...c, lecture: c.user_id ? scoreMap.get(c.user_id) ?? null : null })))
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
    if (!exigerCompte('commenter cette publication')) return
    if (!texte.trim() || !userId) return
    if (termesInterditsDansTexte(texte).length) { setErreur(MESSAGE_COMMENTAIRE_INTERDIT); return }
    setErreur('')
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
    if (error) { setErreur(error.code === 'ZL001' ? error.message : 'L’envoi a échoué.'); return }
    if (data) {
      setCommentaires(prev => [...prev, data])
      setTexte('')
      setPassageCite('')
      setAfficherPassage(false)
      setCibleReponse(null)
    }
  }

  const nbReponses = (id: number) => commentaires.filter(c => c.reponse_a === id).length
  const racines = commentaires.filter(c => c.reponse_a === null)
  // Tri unique : les plus commentés d'abord, puis les plus récents.
  const racinesTriees = [...racines].sort((a, b) => {
    const diff = nbReponses(b.id) - nbReponses(a.id)
    return diff !== 0 ? diff : +new Date(b.created_at) - +new Date(a.created_at)
  })
  const dateHeureCommentaire = (date: string) =>
    new Date(date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const LigneActions = ({ c, petit = false }: { c: CommentaireEssai; petit?: boolean }) => (
    <div style={{ display: 'flex', gap: petit ? '7px' : '8px', alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap', marginTop: petit ? '4px' : '5px' }}>
      {userId && !petit && (
        <button onClick={() => setCibleReponse(c)} style={{ fontSize: '0.65625rem', color: 'var(--cs-vert)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Répondre</button>
      )}
      {isAdmin && (
        <button onClick={() => supprimerCommentaire(c.id)} style={{ fontSize: petit ? '10px' : '10.5px', color: 'var(--cs-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>Supprimer</button>
      )}
      {!isAdmin && userId === c.user_id && (
        <button onClick={() => supprimerMonCommentaire(c.id)} style={{ fontSize: petit ? '10px' : '10.5px', color: 'var(--cs-texte-doux)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Supprimer</button>
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
      ? { border: '1px solid var(--cs-bord-clair)', borderLeft: '4px solid var(--cs-bord)', background: 'var(--cs-surface)' }
      : { border: '1px solid rgba(176,58,42,0.26)', borderLeft: '4px solid var(--cs-danger)', background: 'rgba(176,58,42,0.07)' }
    const rang = c.lecture ? calculerRang(c.lecture.nb_auteurs, c.lecture.total_auteurs).rang : null
    const rangCouleur = rang ? couleurRang(rang) : null

    return (
      <article className="commentaire-carte" style={{ padding: '9px 0', borderBottom: '1px solid var(--cs-fond-doux)', viewTransitionName: `commentaire-essai-${c.id}` }}>
        {c.supprime ? (
          <p style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', margin: 0, background: 'var(--cs-fond)', padding: '6px 9px', borderRadius: '4px' }}>
            {c.auteur_nom ?? 'Un utilisateur'} a supprimé un commentaire
          </p>
        ) : cache ? (
          <CommentaireRetracte c={c} />
        ) : (
          <div className="commentaire-carte" style={{ ...styleCarte, padding: '8px 10px', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px', gap: '8px' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--cs-encre)', margin: 0 }}>
                {c.auteur_nom ?? 'Anonyme'}
                {rang && rangCouleur && <span style={{ marginLeft: '6px', fontSize: '0.53125rem', color: rangCouleur.texte, background: rangCouleur.fond, borderRadius: '4px', padding: '1px 5px' }}>{rang}</span>}
                {!c.valide && <span style={{ marginLeft: '6px', fontSize: '0.46875rem', fontWeight: 700, color: 'var(--cs-danger)', background: 'rgba(176,58,42,0.10)', padding: '1px 5px', borderRadius: '4px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>En révision</span>}
              </p>
              <span style={{ fontSize: '0.5625rem', color: 'var(--cs-texte-faible)', whiteSpace: 'nowrap', flexShrink: 0 }}>{dateHeureCommentaire(c.created_at)}</span>
            </div>
            {c.passage_cite && (
              <blockquote style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-second)', fontStyle: 'italic', borderLeft: '2px solid var(--cs-bord)', paddingLeft: '8px', margin: '0 0 5px' }}>
                « {c.passage_cite} »
              </blockquote>
            )}
            <div style={{ fontSize: '0.75rem', color: c.valide ? 'var(--cs-texte)' : '#6f3d35', lineHeight: 1.5 }}>{rendreTexteEnrichi(c.texte)}</div>
            <LigneActions c={c} />
          </div>
        )}

        {reponses.map(r => (
          (() => {
            const rangR = r.lecture ? calculerRang(r.lecture.nb_auteurs, r.lecture.total_auteurs).rang : null
            const rangCouleurR = rangR ? couleurRang(rangR) : null
            const cacheReponse = !r.supprime && !r.valide && !revelees.has(r.id)
            return (
          <div className="commentaire-carte" key={r.id} style={{ marginLeft: '14px', marginTop: '7px', paddingLeft: '10px', borderLeft: '2px solid var(--cs-fond-doux)', viewTransitionName: `commentaire-essai-${r.id}` }}>
            {r.supprime ? (
              <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', margin: 0, background: 'var(--cs-fond)', padding: '5px 8px', borderRadius: '4px' }}>
                {r.auteur_nom ?? 'Un utilisateur'} a supprimé un commentaire
              </p>
            ) : cacheReponse ? (
              <CommentaireRetracte c={r} petit />
            ) : (
              <div className="commentaire-carte" style={{ padding: '7px 9px', borderRadius: '4px', background: r.valide ? 'var(--cs-surface)' : 'rgba(176,58,42,0.07)', border: `1px solid ${r.valide ? 'var(--cs-bord-clair)' : 'rgba(176,58,42,0.26)'}`, borderLeft: `3px solid ${r.valide ? 'var(--cs-bord)' : 'var(--cs-danger)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px', gap: '6px' }}>
                  <p style={{ fontSize: '0.65625rem', fontWeight: 600, color: 'var(--cs-encre)', margin: 0 }}>
                    {r.auteur_nom ?? 'Anonyme'}
                    {rangR && rangCouleurR && <span style={{ marginLeft: '5px', fontSize: '0.5rem', color: rangCouleurR.texte, background: rangCouleurR.fond, borderRadius: '4px', padding: '1px 4px' }}>{rangR}</span>}
                    {!r.valide && <span style={{ marginLeft: '5px', fontSize: '0.4375rem', fontWeight: 700, color: 'var(--cs-danger)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>En révision</span>}
                  </p>
                  <span style={{ fontSize: '0.5625rem', color: 'var(--cs-texte-faible)', whiteSpace: 'nowrap', flexShrink: 0 }}>{dateHeureCommentaire(r.created_at)}</span>
                </div>
                {r.passage_cite && (
                  <blockquote style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-second)', fontStyle: 'italic', borderLeft: '2px solid var(--cs-bord)', paddingLeft: '7px', margin: '0 0 4px' }}>« {r.passage_cite} »</blockquote>
                )}
                <div style={{ fontSize: '0.71875rem', color: r.valide ? 'var(--cs-texte)' : '#6f3d35', lineHeight: 1.48 }}>{rendreTexteEnrichi(r.texte)}</div>
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
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
          font-size:0.75rem;
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
      {/* Décompte, en tête (le tri a été retiré). */}
      <div style={{ flexShrink: 0, padding: '12px 14px 8px' }}>
        <span style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>
          {racines.length > 0 ? `${racines.length} commentaire${racines.length > 1 ? 's' : ''}` : 'Aucun commentaire'}
        </span>
      </div>

      {/* Liste défilante des commentaires. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 14px 12px' }}>
        {racinesTriees.map(c => <Carte key={c.id} c={c} />)}
      </div>

      {/* Outil de rédaction : ancré EN BAS du volet. */}
      {aUnCompte ? (
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--cs-fond-doux)', background: 'var(--cs-fond-clair)', padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {cibleReponse && (
            <p style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-second)', background: 'var(--cs-surface)', padding: '4px 8px', borderRadius: '4px', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M7 4 3.5 7.5 7 11M3.5 7.5H10a2.5 2.5 0 0 1 2.5 2.5V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              En réponse à <strong>{cibleReponse.auteur_nom}</strong>{' '}
              <button onClick={() => setCibleReponse(null)} style={{ color: 'var(--cs-danger)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.65625rem', padding: 0 }}>✕</button>
            </p>
          )}
          <EditeurCommentaire value={texte} onChange={setTexte} placeholder="Votre commentaire…" minHeight={64} />
          {!afficherPassage ? (
            <button onClick={() => setAfficherPassage(true)} style={{ fontSize: '0.625rem', color: 'var(--cs-vert)', background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start', padding: 0 }}>+ Citer un passage</button>
          ) : (
            <textarea value={passageCite} onChange={e => setPassageCite(e.target.value)} rows={2} placeholder="Passage exact à commenter…"
              style={{ width: '100%', fontSize: '0.71875rem', fontStyle: 'italic', padding: '6px 8px', border: '1px solid var(--cs-bord)', borderRadius: '4px', background: 'var(--cs-surface)', color: 'var(--cs-texte)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
          )}
          {erreur && <p style={{ margin: 0, fontSize: '0.65625rem', color: 'var(--cs-danger)' }}>{erreur}</p>}
          <button onClick={envoyer} disabled={envoi || !texte.trim()} style={{ alignSelf: 'flex-end', fontSize: '0.6875rem', padding: '5px 14px', borderRadius: '4px', border: 'none', background: texte.trim() ? 'var(--cs-vert-aplat)' : 'var(--cs-bord-clair)', color: texte.trim() ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-doux)', cursor: texte.trim() ? 'pointer' : 'default', fontWeight: 500 }}>
            {envoi ? 'Envoi…' : 'Publier'}
          </button>
        </div>
      ) : (
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--cs-fond-doux)', background: 'var(--cs-fond-clair)', padding: '10px 14px 12px' }}>
          <InvitationCompteInline action="commenter cette publication" />
        </div>
      )}
    </div>
  )
}
