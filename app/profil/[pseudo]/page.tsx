'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { calculerRang, couleurRang } from '@/app/lib/classement'
import type { CitationPreferee } from '@/app/prelevements/page'

type ProfilPublic = {
  pseudo: string
  nom_reel?: string | null
  bio: string | null
  contact_email: string | null
  membre_depuis: string
  classement?: { score: number; nb_commentaires: number; nb_valides: number; nb_likes_recus: number; nb_essais_publies: number }
  bibliotheque?: { id: string; titre: string; auteur: string }[]
  essais?: { id: number; titre: string; sous_titre: string | null; categories: string[]; publie_at: string | null; nb_vues: number }[]
  oeuvre_favorite?: { titre: string; auteur: string; id: string; n: number } | null
  versets_favoris?: { ref_livre_abr: string | null; ref_chapitre: number | null; ref_verset: number | null; texte: string; traduction: string | null }[]
}

function toRomain(n: number): string {
  const table: [number, string][] = [[10,'x'],[9,'ix'],[5,'v'],[4,'iv'],[1,'i']]
  let r = ''
  for (const [v, s] of table) { while (n >= v) { r += s; n -= v } }
  return r
}

export default function ProfilPublicPage() {
  const params = useParams()
  const pseudo = decodeURIComponent(params.pseudo as string)
  const [profil, setProfil] = useState<ProfilPublic | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [monPseudo, setMonPseudo] = useState<string | null>(null)
  const [citationPreferee, setCitationPreferee] = useState<CitationPreferee | null>(null)

  useEffect(() => {
    if (!pseudo) return
    fetch(`/api/profil/${encodeURIComponent(pseudo)}`)
      .then(async res => {
        if (!res.ok) throw new Error((await res.json()).error ?? 'Introuvable')
        return res.json()
      })
      .then(setProfil)
      .catch(e => setErreur(e.message))

    import('@/app/lib/supabase').then(({ supabase }) => {
      supabase.auth.getSession().then(async ({ data }) => {
        const uid = data.session?.user.id
        if (!uid) return
        const { data: p } = await supabase.from('profils').select('pseudo').eq('id', uid).maybeSingle()
        if (p) {
          setMonPseudo(p.pseudo)
          // Charger la citation préférée depuis localStorage uniquement pour son propre profil
          if (p.pseudo === pseudo) {
            try {
              const saved = localStorage.getItem('cs_citation_preferee')
              if (saved) setCitationPreferee(JSON.parse(saved))
            } catch {}
          }
        }
      })
    })
  }, [pseudo])

  if (erreur) return (
    <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f2ede6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#b0a89e', marginBottom: '8px' }}>Profil introuvable</p>
        <p style={{ fontSize: '12.5px', color: '#c8c0b8' }}>@{pseudo}</p>
        <Link href="/" style={{ fontSize: '12px', color: '#3d6b4f', textDecoration: 'none', marginTop: '16px', display: 'inline-block' }}>← Accueil</Link>
      </div>
    </main>
  )

  if (!profil) return (
    <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f2ede6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: '13px', color: '#b0a89e', fontStyle: 'italic' }}>Chargement…</p>
    </main>
  )

  const rang = profil.classement ? calculerRang(profil.classement.score) : null
  const couleurs = rang ? couleurRang(rang.rang) : null
  const annee = new Date(profil.membre_depuis).getFullYear()
  const aVersets = profil.versets_favoris && profil.versets_favoris.length > 0
  const aBibliotheque = profil.bibliotheque && profil.bibliotheque.length > 0

  return (
    <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f2ede6', padding: '52px 20px 96px' }}>
      <div style={{ maxWidth: '660px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0' }}>

        {/* ── EN-TÊTE ─────────────────────────────────────────── */}
        <div style={{ background: '#faf8f4', border: '1px solid #ddd8d0', borderRadius: '12px 12px 0 0', borderBottom: 'none', padding: '36px 36px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 'normal', color: '#1e2e22', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
                {profil.pseudo}
              </h1>
              {profil.nom_reel && (
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#5a5450', margin: '0 0 4px', fontStyle: 'italic' }}>
                  {profil.nom_reel}
                </p>
              )}
              <p style={{ fontSize: '11px', color: '#a89e94', margin: 0, letterSpacing: '0.02em' }}>
                Lecteur depuis {annee}
                {profil.contact_email && (
                  <>
                    {' · '}
                    <a href={`mailto:${profil.contact_email}`} style={{ color: '#6a9a7a', textDecoration: 'none' }}>
                      {profil.contact_email}
                    </a>
                  </>
                )}
              </p>
            </div>
            {rang && couleurs && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', color: couleurs.texte, background: couleurs.fond, padding: '4px 12px', borderRadius: '4px' }}>
                  {rang.rang}
                </span>
                <p style={{ fontSize: '10.5px', color: '#a89e94', margin: '5px 0 0', fontFamily: 'Georgia, serif' }}>
                  {profil.classement!.score} point{profil.classement!.score !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>

          {profil.bio && (
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '14.5px', color: '#3a3530', lineHeight: 1.7, margin: '20px 0 0', fontStyle: 'italic', borderLeft: '2px solid #c8d8cc', paddingLeft: '14px' }}>
              {profil.bio}
            </p>
          )}

          {monPseudo && monPseudo !== profil.pseudo && (
            <div style={{ marginTop: '18px' }}>
              <Link href={`/messagerie/${encodeURIComponent(profil.pseudo)}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid #3d6b4f', color: '#3d6b4f', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, textDecoration: 'none', letterSpacing: '0.03em', transition: 'background 0.14s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#f0f7f2' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Écrire
              </Link>
            </div>
          )}
        </div>

        {/* ── CITATION PRÉFÉRÉE ────────────────────────────────── */}
        {citationPreferee && (
          <div style={{ background: '#fdf9f3', border: '1px solid #ddd8d0', borderTop: '1px solid #e8e2da', padding: '28px 36px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: '#9a7a38', margin: '0 0 14px' }}>
              Citation préférée
            </p>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '14px', fontStyle: 'italic', color: '#2a2218', lineHeight: 1.75, margin: '0 0 10px' }}>
              «&#8201;{citationPreferee.texte.length > 200 ? citationPreferee.texte.slice(0, 200) + '…' : citationPreferee.texte}&#8201;»
            </p>
            <p style={{ fontSize: '10px', color: '#a89e8e', margin: 0, letterSpacing: '0.08em', fontFamily: 'Georgia, serif' }}>
              {citationPreferee.type === 'biblique'
                ? citationPreferee.ref
                : [citationPreferee.auteur, citationPreferee.titre_oeuvre].filter(Boolean).join(', ')}
            </p>
          </div>
        )}

        {/* ── BIBLIOTHÈQUE ─────────────────────────────────────── */}
        {aBibliotheque && (
          <div style={{ background: '#fff', border: '1px solid #ddd8d0', borderTop: '1px solid #e8e2da', padding: '0' }}>
            <div style={{ padding: '24px 36px 8px', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6a9a7a' }}>
                Bibliothèque
              </span>
              <span style={{ fontSize: '10px', color: '#c8c0b8' }}>
                {profil.bibliotheque!.length} {profil.bibliotheque!.length > 1 ? 'œuvres' : 'œuvre'}
              </span>
            </div>
            <div style={{ padding: '4px 0 20px' }}>
              {profil.bibliotheque!.map((o, i) => (
                <Link key={o.id} href={`/oeuvre/${o.id}`}
                  style={{ display: 'flex', alignItems: 'baseline', gap: '0', padding: '9px 36px', textDecoration: 'none', transition: 'background 0.1s' }}
                  onMouseEnter={el => (el.currentTarget.style.background = '#f9f6f1')}
                  onMouseLeave={el => (el.currentTarget.style.background = 'transparent')}>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '10px', color: '#c0b8ae', minWidth: '22px', flexShrink: 0, userSelect: 'none' }}>
                    {toRomain(i + 1)}.
                  </span>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: '#1e2e22', flex: 1, lineHeight: 1.45 }}>
                    {o.titre}
                  </span>
                  <span style={{ fontSize: '11px', color: '#a89e94', flexShrink: 0, marginLeft: '12px', fontStyle: 'italic' }}>
                    {o.auteur}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── VERSETS ──────────────────────────────────────────── */}
        {aVersets && (
          <div style={{ border: '1px solid #ddd8d0', borderTop: '1px solid #e8e2da', background: '#faf8f4', padding: '24px 36px 28px' }}>
            <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a89e94', display: 'block', marginBottom: '16px' }}>
              Versets
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {profil.versets_favoris!.map((v, i) => (
                <div key={i}>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#2a2520', lineHeight: 1.65, margin: '0 0 5px', fontStyle: 'italic' }}>
                    «&#8201;{v.texte.length > 160 ? v.texte.slice(0, 160) + '…' : v.texte}&#8201;»
                  </p>
                  <p style={{ fontSize: '10px', color: '#a89e94', margin: 0, letterSpacing: '0.02em' }}>
                    {v.ref_livre_abr} {v.ref_chapitre},{v.ref_verset}
                    {v.traduction && <span style={{ marginLeft: '5px', opacity: 0.75 }}>· {v.traduction}</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ESSAIS ──────────────────────────────────────────── */}
        {profil.essais && profil.essais.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #ddd8d0', borderTop: '1px solid #e8e2da', padding: '24px 36px 28px' }}>
            <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a89e94', display: 'block', marginBottom: '14px' }}>
              Publications
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {profil.essais.map((e, i) => (
                <Link key={e.id} href={`/essais/${e.id}`}
                  style={{ display: 'flex', alignItems: 'baseline', gap: '10px', padding: '9px 0', textDecoration: 'none', borderBottom: i < profil.essais!.length - 1 ? '1px solid #f0ece6' : 'none' }}>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '13.5px', fontStyle: 'italic', color: '#1e2e22', flex: 1, lineHeight: 1.4 }}>
                    {e.titre}
                  </span>
                  {e.publie_at && (
                    <span style={{ fontSize: '10px', color: '#c0b8ae', flexShrink: 0, fontFamily: 'Georgia, serif' }}>
                      {new Date(e.publie_at).getFullYear()}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Arrondi bas */}
        <div style={{ height: '0', border: '1px solid #ddd8d0', borderTop: 'none', borderRadius: '0 0 12px 12px', marginTop: '-1px' }} />

        {/* Rien de public */}
        {!profil.classement && !profil.essais && !aVersets && !profil.bio && !profil.contact_email && !aBibliotheque && (
          <p style={{ fontSize: '12.5px', color: '#b0a89e', fontStyle: 'italic', textAlign: 'center', paddingTop: '24px' }}>
            Ce profil ne partage pas encore d&apos;informations publiques.
          </p>
        )}

      </div>
    </main>
  )
}
