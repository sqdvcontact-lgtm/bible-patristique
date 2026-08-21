'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { ENCRE_TITRE, GRAISSE_TITRE, TITRE_PAGE } from '@/app/lib/hierarchieTitres'

type EssaiPerso = { id: number; titre: string; sous_titre: string | null; statut: string; updated_at: string }

const STATUTS: Record<string, { label: string; couleur: string }> = {
  brouillon:    { label: 'Brouillon',               couleur: 'var(--cs-texte-doux)' },
  en_attente:   { label: 'En attente de validation', couleur: 'var(--cs-attente)' },
  a_reviser:    { label: 'À réviser',                couleur: 'var(--cs-danger)' },
  publie:       { label: 'Publié',                   couleur: 'var(--cs-vert)' },
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
      <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', padding: '36px 40px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-second)', marginBottom: '16px' }}>Connectez-vous pour voir vos écrits.</p>
          <Link href="/chantier" style={{ display: 'inline-block', padding: '9px 20px', fontSize: '0.8125rem', fontWeight: 500, background: 'var(--cs-vert)', color: 'var(--cs-surface)', borderRadius: '8px', textDecoration: 'none' }}>
            Se connecter
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main style={{
      background: 'var(--cs-fond)',
      // AUCUN paddingTop ici. Le décalage sous la navbar fixe est posé UNE SEULE fois
      // pour tout le site, par #cs-corps dans app/layout.tsx. Le répéter le comptait
      // deux fois : 107px entre la barre et le titre au lieu de 38.
      minHeight: 'calc(100vh - 3.5rem)',
    }}>
      <div style={{ maxWidth: '43.75rem', margin: '0 auto', padding: '40px 32px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: TITRE_PAGE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE, margin: 0 }}>Mes écrits</h1>
          <Link href="/essais/nouveau" style={{ fontSize: '0.78125rem', padding: '7px 16px', borderRadius: '4px', background: 'var(--cs-vert)', color: 'var(--cs-surface)', textDecoration: 'none', fontWeight: 500 }}>
            + Écrire
          </Link>
        </div>

        {essais === null ? (
          <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>
        ) : essais.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: '40px' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', marginBottom: '16px' }}>Aucun écrit pour l&apos;instant.</p>
            <Link href="/essais/nouveau" style={{ fontSize: '0.8125rem', padding: '9px 20px', borderRadius: '8px', background: 'var(--cs-vert)', color: 'var(--cs-surface)', textDecoration: 'none', fontWeight: 500 }}>
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
                <div key={e.id} style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Lien principal */}
                  <Link
                    href={e.statut === 'publie' ? `/essais/${e.id}` : `/essais/${e.id}/modifier`}
                    style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
                    <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.9375rem', color: 'var(--cs-encre-fonce)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.titre}</p>
                    {e.sous_titre && <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-gris)', fontStyle: 'italic', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.sous_titre}</p>}
                  </Link>

                  {/* Méta droite */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.625rem', color: 'var(--cs-texte-faible)' }}>{maj}</span>
                    <span style={{ fontSize: '0.65625rem', fontWeight: 600, color: st.couleur }}>{st.label}</span>

                    {modifiable && (
                      <Link href={`/essais/${e.id}/modifier`}
                        style={{ fontSize: '0.6875rem', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--cs-bord)', color: 'var(--cs-texte)', textDecoration: 'none', background: 'var(--cs-surface)' }}>
                        Modifier
                      </Link>
                    )}

                    {supprimable && (
                      <button
                        onClick={() => setSupprConfirm(e.id)}
                        style={{ fontSize: '0.6875rem', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--cs-danger-bord)', color: 'var(--cs-danger)', background: 'var(--cs-surface)', cursor: 'pointer' }}>
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
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--cs-surface)', borderRadius: '8px', padding: '28px 28px 24px', maxWidth: '22.5rem', width: '100%', boxShadow: 'var(--cs-ombre-modale)' }}>
            <h3 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.0625rem', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', margin: '0 0 12px' }}>
              Supprimer ce brouillon ?
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte)', lineHeight: 1.65, margin: '0 0 22px' }}>
              <em>{essais?.find(e => e.id === supprConfirm)?.titre}</em>
              <br />
              <span style={{ fontSize: '0.75rem', color: 'var(--cs-texte-doux)' }}>Cette action est irréversible.</span>
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setSupprConfirm(null)} style={{ fontSize: '0.78125rem', padding: '8px 18px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte)', cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={() => supprimer(supprConfirm)} style={{ fontSize: '0.78125rem', padding: '8px 18px', borderRadius: '4px', border: 'none', background: 'var(--cs-danger)', color: 'var(--cs-surface)', cursor: 'pointer', fontWeight: 600 }}>
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
