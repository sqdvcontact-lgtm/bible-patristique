'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

type EssaiPerso = { id: number; titre: string; sous_titre: string | null; statut: string; updated_at: string }

const STATUTS: Record<string, { label: string; couleur: string }> = {
  brouillon:    { label: 'Brouillon',               couleur: '#9a958d' },
  en_attente:   { label: 'En attente de validation', couleur: '#9a5a2a' },
  a_reviser:    { label: 'À réviser',                couleur: '#c0562a' },
  publie:       { label: 'Publié',                   couleur: '#3d6b4f' },
}

export default function MesEcritsPage() {
  const [essais, setEssais] = useState<EssaiPerso[] | null>(null)
  const [connecte, setConnecte] = useState<boolean | null>(null)
  const [supprConfirm, setSupprConfirm] = useState<number | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null
      setConnecte(!!uid)
      setUserId(uid)
      if (!uid) { setEssais([]); return }
      supabase.from('essais').select('id, titre, sous_titre, statut, updated_at')
        .eq('user_id', uid).order('updated_at', { ascending: false })
        .then(({ data }) => setEssais(data ?? []))
    })
  }, [])

  const supprimer = async (id: number) => {
    await supabase.from('essais').delete().eq('id', id).eq('user_id', userId!)
    setEssais(prev => prev?.filter(e => e.id !== id) ?? null)
    setSupprConfirm(null)
  }

  if (connecte === false) {
    return (
      <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f7f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', border: '1px solid #d6d0c4', borderRadius: '10px', padding: '36px 40px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#6b6560', marginBottom: '16px' }}>Connectez-vous pour voir vos écrits.</p>
          <Link href="/chantier" style={{ display: 'inline-block', padding: '9px 20px', fontSize: '13px', fontWeight: 500, background: '#3d6b4f', color: '#fff', borderRadius: '6px', textDecoration: 'none' }}>
            Se connecter
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main style={{ background: '#f7f4ef', minHeight: 'calc(100vh - 48px)', paddingTop: '48px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 32px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: 'clamp(22px, 4vw, 28px)', color: '#1e2e24', margin: 0 }}>Mes écrits</h1>
          <Link href="/essais/nouveau" style={{ fontSize: '12.5px', padding: '7px 16px', borderRadius: '5px', background: '#3d6b4f', color: '#fff', textDecoration: 'none', fontWeight: 500 }}>
            + Écrire
          </Link>
        </div>

        {essais === null ? (
          <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>
        ) : essais.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: '40px' }}>
            <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic', marginBottom: '16px' }}>Aucun écrit pour l&apos;instant.</p>
            <Link href="/essais/nouveau" style={{ fontSize: '13px', padding: '9px 20px', borderRadius: '6px', background: '#3d6b4f', color: '#fff', textDecoration: 'none', fontWeight: 500 }}>
              Commencer un essai
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {essais.map(e => {
              const st = STATUTS[e.statut] ?? STATUTS.brouillon
              const modifiable = e.statut === 'brouillon' || e.statut === 'a_reviser'
              const supprimable = e.statut === 'brouillon'
              const maj = new Date(e.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

              return (
                <div key={e.id} style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Lien principal */}
                  <Link
                    href={e.statut === 'publie' ? `/essais/${e.id}` : `/essais/${e.id}/modifier`}
                    style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
                    <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '15px', color: '#1e2e24', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.titre}</p>
                    {e.sous_titre && <p style={{ fontSize: '12px', color: '#8a8278', fontStyle: 'italic', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.sous_titre}</p>}
                  </Link>

                  {/* Méta droite */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <span style={{ fontSize: '10px', color: '#b0a89e' }}>{maj}</span>
                    <span style={{ fontSize: '10.5px', fontWeight: 600, color: st.couleur }}>{st.label}</span>

                    {modifiable && (
                      <Link href={`/essais/${e.id}/modifier`}
                        style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #d6d0c4', color: '#3a3530', textDecoration: 'none', background: '#fff' }}>
                        Modifier
                      </Link>
                    )}

                    {supprimable && (
                      <button
                        onClick={() => setSupprConfirm(e.id)}
                        style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #e4c4b8', color: '#c0562a', background: '#fff', cursor: 'pointer' }}>
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modale de confirmation suppression */}
      {supprConfirm !== null && (
        <div onClick={() => setSupprConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.32)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '10px', padding: '28px 28px 24px', maxWidth: '360px', width: '100%', boxShadow: '0 16px 48px rgba(0,0,0,0.18)' }}>
            <h3 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '17px', fontWeight: 'normal', color: '#1e2e24', margin: '0 0 12px' }}>
              Supprimer ce brouillon ?
            </h3>
            <p style={{ fontSize: '13px', color: '#5a5450', lineHeight: 1.65, margin: '0 0 22px' }}>
              <em>{essais?.find(e => e.id === supprConfirm)?.titre}</em>
              <br />
              <span style={{ fontSize: '12px', color: '#9a958d' }}>Cette action est irréversible.</span>
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setSupprConfirm(null)} style={{ fontSize: '12.5px', padding: '8px 18px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#3a3530', cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={() => supprimer(supprConfirm)} style={{ fontSize: '12.5px', padding: '8px 18px', borderRadius: '5px', border: 'none', background: '#c0562a', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
