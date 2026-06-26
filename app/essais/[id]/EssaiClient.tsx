'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { rendreEssai, extraireSommaire, type ElementPanneau } from '@/app/lib/texteEnrichiEssai'
import VoletEssai from '@/app/lib/VoletEssai'
import EssaiCommentaires from './EssaiCommentaires'

type Essai = {
  id: number; titre: string; sous_titre: string | null; resume: string | null
  categories: string[]; contenu: string; statut: string; nb_vues: number
  user_id: string; created_at: string; publie_at: string | null; auteur_pseudo: string | null
}

export default function EssaiClient({ essai }: { essai: Essai }) {
  const [panneau, setPanneau] = useState<ElementPanneau | null>(null)
  const [voletOuvert, setVoletOuvert] = useState(true)
  const [nbVues, setNbVues] = useState(essai.nb_vues)
  const [nbAppreciations, setNbAppreciations] = useState(0)
  const [aApprecie, setApprecie] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const sommaire = extraireSommaire(essai.contenu)
  const aDesNotes = /\[\^.+?\]/.test(essai.contenu)
  const dateAffichee = essai.publie_at ?? essai.created_at

  useEffect(() => {
    supabase.rpc('incrementer_vues_essai', { p_id: essai.id })
    setNbVues(v => v + 1)
  }, [essai.id])

  useEffect(() => {
    supabase.from('essais_appreciations').select('user_id', { count: 'exact' }).eq('id_essai', essai.id)
      .then(({ data, count }) => {
        setNbAppreciations(count ?? data?.length ?? 0)
      })
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null
      setUserId(uid)
      if (uid) {
        supabase.from('essais_appreciations').select('user_id').eq('id_essai', essai.id).eq('user_id', uid).maybeSingle()
          .then(({ data }) => setApprecie(!!data))
      }
    })
  }, [essai.id])

  const toggleApprecier = async () => {
    if (!userId) return
    if (aApprecie) {
      await supabase.from('essais_appreciations').delete().eq('id_essai', essai.id).eq('user_id', userId)
      setApprecie(false); setNbAppreciations(n => Math.max(0, n - 1))
    } else {
      await supabase.from('essais_appreciations').insert({ id_essai: essai.id, user_id: userId })
      setApprecie(true); setNbAppreciations(n => n + 1)
    }
  }

  const ouvrirPanneau = (el: ElementPanneau) => { setPanneau(el); setVoletOuvert(true) }

  return (
    <main style={{ background: '#f7f4ef', minHeight: 'calc(100vh - 48px)', paddingRight: (aDesNotes && voletOuvert) ? '320px' : 0, transition: 'padding-right 0.15s' }}>
      <div style={{ maxWidth: '660px', margin: '0 auto', padding: '0 32px 80px' }}>

        {essai.statut === 'en_attente' && (
          <p style={{ fontSize: '11.5px', color: '#9a5a2a', background: '#fff8f0', border: '1px solid #e4c4a0', borderRadius: '6px', padding: '8px 12px', margin: '24px 0 0' }}>
            Cet essai est en attente de validation par l'administration — seul vous pouvez le voir ainsi.
          </p>
        )}

        {/* En-tête façon page « Œuvre » : Auteur > Titre > Sous-titre > date */}
        <div style={{
          minHeight: '46vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '64px 24px 48px', borderBottom: '1px solid #d6d0c4',
          marginBottom: '48px', textAlign: 'center',
        }}>
          {essai.auteur_pseudo && (
            <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3d6b4f', marginBottom: '24px', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
              {essai.auteur_pseudo}
            </p>
          )}
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 'normal', color: '#1e2e24', lineHeight: 1.2, margin: '0 0 14px', maxWidth: '560px' }}>
            {essai.titre}
          </h1>
          {essai.sous_titre && (
            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 'clamp(15px, 2vw, 18px)', fontStyle: 'italic', color: '#8a8278', margin: '0 0 22px', letterSpacing: '0.01em' }}>
              {essai.sous_titre}
            </p>
          )}
          <div style={{ width: '36px', height: '1px', background: '#c8c0b4', marginBottom: '16px' }} />
          <p style={{ fontSize: '11px', letterSpacing: '0.06em', color: '#b0a89e' }}>
            {new Date(dateAffichee).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '16px' }}>
            {essai.categories.map(c => (
              <span key={c} style={{ fontSize: '10px', color: '#3d6b4f', background: 'rgba(61,107,79,0.08)', padding: '2px 9px', borderRadius: '10px', fontWeight: 600, letterSpacing: '0.02em' }}>{c}</span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11.5px', color: '#9a958d', marginBottom: '32px' }}>
          <span>{nbVues} vue{nbVues > 1 ? 's' : ''}</span>
          <button onClick={toggleApprecier} disabled={!userId}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: aApprecie ? '#3d6b4f' : '#9a958d', background: 'none', border: 'none', cursor: userId ? 'pointer' : 'default' }}>
            <svg width="13" height="13" viewBox="0 0 12 12" fill={aApprecie ? 'currentColor' : 'none'}>
              <path d="M6 11S1 7.5 1 4a2.5 2.5 0 0 1 5-.8A2.5 2.5 0 0 1 11 4c0 3.5-5 7-5 7z" stroke="currentColor" strokeWidth="1"/>
            </svg>
            {nbAppreciations}
          </button>
          {aDesNotes && !voletOuvert && (
            <button onClick={() => setVoletOuvert(true)} style={{ marginLeft: 'auto', fontSize: '11px', color: '#3d6b4f', background: 'none', border: '1px solid #3d6b4f', borderRadius: '4px', padding: '3px 9px', cursor: 'pointer' }}>
              Notes et citations ›
            </button>
          )}
        </div>

        {sommaire.length > 1 && (
          <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '16px 20px', marginBottom: '32px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#9a958d', marginBottom: '8px' }}>SOMMAIRE</p>
            {sommaire.map(s => (
              <a key={s.id} href={`#${s.id}`} style={{ display: 'block', fontSize: '12.5px', color: '#3d6b4f', textDecoration: 'none', padding: '3px 0' }}>{s.titre}</a>
            ))}
          </div>
        )}

        <div style={{ fontSize: '15px', color: '#1e1a16', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
          {rendreEssai(essai.contenu, { onOuvrirPanneau: ouvrirPanneau })}
        </div>

        <EssaiCommentaires idEssai={essai.id} />
      </div>

      {aDesNotes && voletOuvert && (
        <VoletEssai element={panneau} onFermer={() => setPanneau(null)} toujoursVisible enTete={
          <button onClick={() => setVoletOuvert(false)} style={{ fontSize: '11px', color: '#9a958d', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            › Réduire ce volet
          </button>
        } />
      )}
    </main>
  )
}