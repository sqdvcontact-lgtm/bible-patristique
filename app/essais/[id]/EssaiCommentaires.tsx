'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

type CommentaireEssai = {
  id: number; texte: string; passage_cite: string | null; reponse_a: number | null
  user_id: string | null; auteur_nom: string | null; valide: boolean; created_at: string; supprime: boolean
}

export default function EssaiCommentaires({ idEssai }: { idEssai: number }) {
  const [commentaires, setCommentaires] = useState<CommentaireEssai[]>([])
  const [tri, setTri] = useState<'pertinents' | 'recents'>('pertinents')
  const [texte, setTexte] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)
  const inserer = (fragment: string) => {
    const ta = taRef.current
    if (!ta) { setTexte(texte + fragment); return }
    const d = ta.selectionStart, f = ta.selectionEnd
    const nouveau = texte.slice(0, d) + fragment + texte.slice(f)
    setTexte(nouveau)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(d + fragment.length, d + fragment.length) }, 0)
  }
  const entourer = (avant: string, apres: string = avant) => {
    const ta = taRef.current
    if (!ta) return
    const d = ta.selectionStart, f = ta.selectionEnd
    const selection = texte.slice(d, f) || 'texte'
    setTexte(texte.slice(0, d) + avant + selection + apres + texte.slice(f))
    setTimeout(() => { ta.focus(); ta.setSelectionRange(d + avant.length, d + avant.length + selection.length) }, 0)
  }
  const [passageCite, setPassageCite] = useState('')
  const [afficherPassage, setAfficherPassage] = useState(false)
  const [cibleReponse, setCibleReponse] = useState<CommentaireEssai | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [pseudo, setPseudo] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    supabase.from('essais_commentaires').select('*').eq('id_essai', idEssai).order('created_at', { ascending: true })
      .then(({ data }) => setCommentaires(data ?? []))
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
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setCommentaires(prev => prev.filter(c => c.id !== id))
  }

  // Suppression par son propre auteur : on ne retire pas la ligne, on la marque
  // « supprimée » pour ne pas casser le fil des réponses.
  const supprimerMonCommentaire = async (id: number) => {
    if (!window.confirm('Supprimer ce commentaire ? Il restera visible en tant que « commentaire supprimé ».')) return
    const { error } = await supabase.from('essais_commentaires').update({ supprime: true }).eq('id', id)
    if (!error) setCommentaires(prev => prev.map(c => c.id === id ? { ...c, supprime: true } : c))
  }

  const envoyer = async () => {
    if (!texte.trim() || !userId) return
    setEnvoi(true)
    const { data, error } = await supabase.from('essais_commentaires').insert({
      id_essai: idEssai, texte: texte.trim(), passage_cite: passageCite.trim() || null,
      reponse_a: cibleReponse?.id ?? null, user_id: userId, auteur_nom: pseudo ?? 'Utilisateur', valide: false,
    }).select().single()
    setEnvoi(false)
    if (!error && data) {
      setCommentaires(prev => [...prev, data])
      setTexte(''); setPassageCite(''); setAfficherPassage(false); setCibleReponse(null)
    }
  }

  const nbReponses = (id: number) => commentaires.filter(c => c.reponse_a === id).length
  const racines = commentaires.filter(c => c.reponse_a === null)
  const racinesTriees = [...racines].sort((a, b) => {
    if (tri === 'recents') return +new Date(b.created_at) - +new Date(a.created_at)
    const diff = nbReponses(b.id) - nbReponses(a.id)
    return diff !== 0 ? diff : +new Date(b.created_at) - +new Date(a.created_at)
  })

  const Carte = ({ c }: { c: CommentaireEssai }) => (
    <div style={{ padding: '12px 0', borderBottom: '1px solid #ede9e2' }}>
      {c.supprime ? (
        <p style={{ fontSize: '12.5px', color: '#9a958d', fontStyle: 'italic', margin: 0, background: '#f3f0ea', padding: '8px 10px', borderRadius: '4px' }}>
          {c.auteur_nom ?? 'Un utilisateur'} a supprimé un commentaire
        </p>
      ) : (
        <>
          {!c.valide && <span style={{ fontSize: '9px', fontWeight: 600, color: '#b03a2a', letterSpacing: '0.03em' }}>NON CONTRÔLÉ</span>}
          <p style={{ fontSize: '11.5px', fontWeight: 600, color: '#3d6b4f', margin: '2px 0 4px' }}>{c.auteur_nom ?? 'Anonyme'}</p>
          {c.passage_cite && (
            <blockquote style={{ fontSize: '12px', color: '#8a8278', fontStyle: 'italic', borderLeft: '2px solid #d6d0c4', paddingLeft: '10px', margin: '0 0 6px' }}>
              « {c.passage_cite} »
            </blockquote>
          )}
          <p style={{ fontSize: '13px', color: '#2a2520', lineHeight: 1.6, margin: '0 0 6px', whiteSpace: 'pre-line' }}>{c.texte}</p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '10.5px', color: '#b0a89e' }}>{new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
            {userId && (
              <button onClick={() => setCibleReponse(c)} style={{ fontSize: '10.5px', color: '#3d6b4f', background: 'none', border: 'none', cursor: 'pointer' }}>Répondre</button>
            )}
            {userId === c.user_id && (
              <button onClick={() => supprimerMonCommentaire(c.id)} style={{ fontSize: '10.5px', color: '#9a958d', background: 'none', border: 'none', cursor: 'pointer' }}>Supprimer</button>
            )}
            {isAdmin && userId !== c.user_id && (
              <button onClick={() => supprimerCommentaire(c.id)} style={{ fontSize: '10.5px', color: '#c0562a', background: 'none', border: 'none', cursor: 'pointer' }}>Supprimer (admin)</button>
            )}
          </div>
        </>
      )}
      {commentaires.filter(r => r.reponse_a === c.id).map(r => (
        <div key={r.id} style={{ marginLeft: '20px', marginTop: '10px', paddingLeft: '12px', borderLeft: '2px solid #ede9e2' }}>
          {r.supprime ? (
            <p style={{ fontSize: '11.5px', color: '#9a958d', fontStyle: 'italic', margin: 0, background: '#f3f0ea', padding: '6px 9px', borderRadius: '4px' }}>
              {r.auteur_nom ?? 'Un utilisateur'} a supprimé un commentaire
            </p>
          ) : (
            <>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#3d6b4f', margin: '0 0 3px' }}>{r.auteur_nom ?? 'Anonyme'}</p>
              {r.passage_cite && (
                <blockquote style={{ fontSize: '11.5px', color: '#8a8278', fontStyle: 'italic', borderLeft: '2px solid #d6d0c4', paddingLeft: '8px', margin: '0 0 4px' }}>« {r.passage_cite} »</blockquote>
              )}
              <p style={{ fontSize: '12.5px', color: '#2a2520', lineHeight: 1.55, margin: '0 0 4px', whiteSpace: 'pre-line' }}>{r.texte}</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                {userId === r.user_id && (
                  <button onClick={() => supprimerMonCommentaire(r.id)} style={{ fontSize: '10px', color: '#9a958d', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Supprimer</button>
                )}
                {isAdmin && userId !== r.user_id && (
                  <button onClick={() => supprimerCommentaire(r.id)} style={{ fontSize: '10px', color: '#c0562a', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Supprimer (admin)</button>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #d6d0c4' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: '17px', color: '#2a3d30', margin: 0 }}>Commentaires ({racines.length})</h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['pertinents', 'recents'] as const).map(t => (
            <button key={t} onClick={() => setTri(t)}
              style={{ fontSize: '10.5px', padding: '3px 10px', borderRadius: '10px', border: `1px solid ${tri === t ? '#3d6b4f' : '#d6d0c4'}`, background: tri === t ? 'rgba(61,107,79,0.10)' : '#fff', color: tri === t ? '#3d6b4f' : '#8a8278', cursor: 'pointer' }}>
              {t === 'pertinents' ? 'Pertinents' : 'Récents'}
            </button>
          ))}
        </div>
      </div>

      {userId ? (
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {cibleReponse && (
            <p style={{ fontSize: '11px', color: '#6b6560', background: '#faf8f4', padding: '5px 9px', borderRadius: '4px' }}>
              En réponse à {cibleReponse.auteur_nom} — <button onClick={() => setCibleReponse(null)} style={{ color: '#c0562a', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px' }}>annuler</button>
            </p>
          )}
          <textarea ref={taRef} value={texte} onChange={e => setTexte(e.target.value)} rows={3} placeholder="Votre commentaire…"
            style={{ width: '100%', fontSize: '13px', padding: '10px 12px', border: '1.5px solid #b8cdc0', borderRadius: '6px', background: '#fbfdfc', color: '#1e1a16', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5, boxShadow: 'inset 0 1px 3px rgba(61,107,79,0.06)' }} />
          <div style={{ display: 'flex', gap: '4px' }}>
            <button type="button" onClick={() => inserer('\u00A0')} title="Espace insécable"
              style={{ fontSize: '9px', padding: '3px 7px', borderRadius: '3px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a2520', cursor: 'pointer' }}>Esp. ins.</button>
            <button type="button" onClick={() => inserer('\u202F')} title="Espace fine insécable"
              style={{ fontSize: '9px', padding: '3px 7px', borderRadius: '3px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a2520', cursor: 'pointer' }}>Esp. fine</button>
            <button type="button" onClick={() => entourer('«\u202F', '\u202F»')} title="Guillemets français"
              style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '3px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a2520', cursor: 'pointer' }}>« »</button>
            <button type="button" onClick={() => entourer('\u201C', '\u201D')} title="Guillemets anglais (citation imbriquée)"
              style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '3px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a2520', cursor: 'pointer' }}>“ ”</button>
          </div>
          {!afficherPassage ? (
            <button onClick={() => setAfficherPassage(true)} style={{ fontSize: '10.5px', color: '#3d6b4f', background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}>+ Citer un passage précis de l'essai</button>
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
    </div>
  )
}