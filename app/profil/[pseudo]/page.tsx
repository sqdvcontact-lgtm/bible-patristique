'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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

type PhotoProfil = { id_auteur: string; nom: string; imageUrl: string; posX?: number; posY?: number; zoom?: number }

// ── Filet ornemental ─────────────────────────────────────────────────────────
function Filet({ couleur = '#c8b89e', symbole = '✦', maxWidth = '200px' }: { couleur?: string; symbole?: string; maxWidth?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth, margin: '0 auto' }}>
      <div style={{ flex: 1, height: '1px', background: `linear-gradient(to right, transparent, ${couleur})` }} />
      <span style={{ fontSize: '9px', color: couleur, letterSpacing: '0.18em' }}>{symbole}</span>
      <div style={{ flex: 1, height: '1px', background: `linear-gradient(to left, transparent, ${couleur})` }} />
    </div>
  )
}

// ── Étiquette de section ──────────────────────────────────────────────────────
function Etiquette({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#7a8a6e', margin: '0 0 16px', fontFamily: 'Georgia, serif' }}>
      {children}
    </p>
  )
}

export default function ProfilPublicPage() {
  const params = useParams()
  const pseudo = decodeURIComponent(params.pseudo as string)
  const [profil, setProfil] = useState<ProfilPublic | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [monPseudo, setMonPseudo] = useState<string | null>(null)
  const [citationPreferee, setCitationPreferee] = useState<CitationPreferee | null>(null)
  const [photoProfil, setPhotoProfil] = useState<PhotoProfil | null>(null)

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
          if (p.pseudo === pseudo) {
            try {
              const savedCitation = localStorage.getItem('cs_citation_preferee')
              if (savedCitation) setCitationPreferee(JSON.parse(savedCitation))
              const savedPhoto = localStorage.getItem('cs_photo_profil')
              if (savedPhoto) setPhotoProfil(JSON.parse(savedPhoto))
            } catch {}
          }
        }
      })
    })
  }, [pseudo])

  if (erreur) return (
    <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f3efe2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#b0a89e', marginBottom: '8px' }}>Profil introuvable</p>
        <p style={{ fontSize: '12.5px', color: '#c8c0b8' }}>@{pseudo}</p>
        <Link href="/" style={{ fontSize: '12px', color: '#3a5030', textDecoration: 'none', marginTop: '16px', display: 'inline-block' }}>← Accueil</Link>
      </div>
    </main>
  )

  if (!profil) return (
    <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f3efe2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: '13px', color: '#9a8a72', fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>Chargement…</p>
    </main>
  )

  const rang = profil.classement ? calculerRang(profil.classement.score) : null
  const couleurs = rang ? couleurRang(rang.rang) : null
  const annee = new Date(profil.membre_depuis).getFullYear()
  const aVersets = profil.versets_favoris && profil.versets_favoris.length > 0
  const aBibliotheque = profil.bibliotheque && profil.bibliotheque.length > 0
  const aEssais = profil.essais && profil.essais.length > 0
  const rienDePublic = !profil.classement && !aEssais && !aVersets && !profil.bio && !profil.contact_email && !aBibliotheque

  return (
    <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f3efe2', padding: '48px 20px 96px' }}>
      <style>{`
        .profil-section {
          background: #faf8f2;
          border: 1px solid #d8cdb0;
          border-radius: 8px;
          padding: 28px 32px;
          margin-bottom: 10px;
        }
        .profil-livre-link {
          display: flex; align-items: baseline; gap: 0;
          padding: 5px 0; text-decoration: none;
          border-bottom: 1px solid #ede8df;
          transition: background 0.1s;
        }
        .profil-livre-link:last-child { border-bottom: none; }
        .profil-livre-link:hover { background: #f4f1ea; }
        .profil-essai-link {
          display: flex; align-items: baseline; gap: 10px;
          padding: 5px 0; text-decoration: none;
          border-bottom: 1px solid #ede8df;
          transition: opacity 0.1s;
        }
        .profil-essai-link:last-child { border-bottom: none; }
        .profil-essai-link:hover { opacity: 0.75; }
      `}</style>

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        {/* ── EN-TÊTE CENTRÉ ────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: '10px', background: '#faf8f2', border: '1px solid #d8cdb0', borderRadius: '10px', padding: '28px 28px 22px' }}>

          {/* Photo ou monogramme */}
          <div style={{ marginBottom: '12px' }}>
            {photoProfil ? (
              <div title={photoProfil.nom} style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto', border: '2px solid #c8b89e', position: 'relative', cursor: 'default' }}>
                <Image
                  src={photoProfil.imageUrl}
                  alt={photoProfil.nom}
                  fill sizes="72px" unoptimized
                  style={{
                    objectFit: 'cover',
                    objectPosition: `${photoProfil.posX ?? 50}% ${photoProfil.posY ?? 20}%`,
                    transform: `scale(${photoProfil.zoom ?? 1})`,
                    transformOrigin: 'center center',
                  }}
                />
              </div>
            ) : (
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(145deg, #3a5030, #2a3d22)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '2px solid #b8c8b0', boxShadow: '0 2px 12px rgba(40,60,30,0.14)' }}>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#e0ead8', fontWeight: 'normal', lineHeight: 1 }}>
                  {profil.pseudo.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Pseudo */}
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 'normal', color: '#1a2818', margin: '0 0 4px', letterSpacing: '0.01em' }}>
            {profil.pseudo}
          </h1>

          {profil.nom_reel && (
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '12px', color: '#6a6050', margin: '0 0 6px', fontStyle: 'italic' }}>
              {profil.nom_reel}
            </p>
          )}

          {/* Date + email */}
          <p style={{ fontSize: '10px', color: '#9a8e82', margin: '0 0 12px', letterSpacing: '0.05em' }}>
            Lecteur depuis {annee}
            {profil.contact_email && (
              <>
                {' · '}
                <a href={`mailto:${profil.contact_email}`} style={{ color: '#3a5030', textDecoration: 'none' }}>
                  {profil.contact_email}
                </a>
              </>
            )}
          </p>

          {/* Filet */}
          <div style={{ marginBottom: rang || profil.bio ? '14px' : '0' }}>
            <Filet couleur='#c8b89e' symbole='❧' maxWidth='120px' />
          </div>

          {/* Rang */}
          {rang && couleurs && (
            <div style={{ marginBottom: profil.bio ? '14px' : '0' }}>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '11px', fontStyle: 'italic', color: couleurs.texte }}>
                {rang.rang}
              </span>
              <span style={{ fontSize: '10px', color: '#b0a898', marginLeft: '8px', fontFamily: 'Georgia, serif' }}>
                · {profil.classement!.score} pt{profil.classement!.score !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Bio */}
          {profil.bio && (
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: '#3a3020', lineHeight: 1.65, margin: rang ? '18px 0 0' : '0', fontStyle: 'italic', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
              {profil.bio}
            </p>
          )}

          {/* Bouton messagerie */}
          {monPseudo && monPseudo !== profil.pseudo && (
            <div style={{ marginTop: '22px' }}>
              <Link href={`/messagerie/${encodeURIComponent(profil.pseudo)}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid #3a5030', color: '#3a5030', borderRadius: '20px', padding: '7px 18px', fontSize: '11.5px', fontWeight: 500, textDecoration: 'none', letterSpacing: '0.04em', fontFamily: 'Georgia, serif', transition: 'background 0.14s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(58,80,48,0.06)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Écrire
              </Link>
            </div>
          )}
        </div>

        {/* ── CITATION PRÉFÉRÉE ─────────────────────────────────────────────── */}
        {citationPreferee && (
          <div style={{ textAlign: 'center', margin: '0 0 10px', background: 'rgba(154,122,56,0.06)', border: '1px solid rgba(154,122,56,0.28)', borderRadius: '8px', padding: '16px 28px 14px', position: 'relative' }}>
            <Filet couleur='#c8a858' symbole='★' maxWidth='80px' />
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '14px', fontStyle: 'italic', color: '#2a2010', lineHeight: 1.45, margin: '10px 0 8px' }}>
              «&#8201;{citationPreferee.texte.length > 220 ? citationPreferee.texte.slice(0, 220) + '…' : citationPreferee.texte}&#8201;»
            </p>
            {(citationPreferee.ref || citationPreferee.auteur) && (
              <p style={{ fontSize: '10px', color: '#9a7a38', margin: 0, letterSpacing: '0.10em', fontFamily: 'Georgia, serif' }}>
                {citationPreferee.type === 'biblique'
                  ? citationPreferee.ref
                  : [citationPreferee.auteur, citationPreferee.titre_oeuvre].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        )}

        {/* ── BIBLIOTHÈQUE ──────────────────────────────────────────────────── */}
        {aBibliotheque && (
          <div className="profil-section">
            <Etiquette>Bibliothèque</Etiquette>
            <div>
              {profil.bibliotheque!.map((o) => (
                <Link key={o.id} href={`/oeuvre/${o.id}`} className="profil-livre-link">
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '13.5px', color: '#1a2818', flex: 1, lineHeight: 1.4 }}>
                    {o.titre}
                  </span>
                  <span style={{ fontSize: '10.5px', color: '#8a7e72', flexShrink: 0, marginLeft: '12px', fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>
                    {o.auteur}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── VERSETS FAVORIS ───────────────────────────────────────────────── */}
        {aVersets && (
          <div className="profil-section">
            <Etiquette>Versets</Etiquette>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {profil.versets_favoris!.map((v, i) => (
                <div key={i} style={{ paddingLeft: '10px', borderLeft: '2px solid #c8d8b8' }}>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#2a2818', lineHeight: 1.6, margin: '0 0 4px', fontStyle: 'italic' }}>
                    «&#8201;{v.texte.length > 160 ? v.texte.slice(0, 160) + '…' : v.texte}&#8201;»
                  </p>
                  <p style={{ fontSize: '9.5px', color: '#8a7e72', margin: 0, letterSpacing: '0.04em', fontFamily: 'Georgia, serif' }}>
                    {v.ref_livre_abr} {v.ref_chapitre},{v.ref_verset}
                    {v.traduction && <span style={{ marginLeft: '5px', opacity: 0.65 }}>· {v.traduction}</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PUBLICATIONS ──────────────────────────────────────────────────── */}
        {aEssais && (
          <div className="profil-section">
            <Etiquette>Publications</Etiquette>
            <div>
              {profil.essais!.map((e, i) => (
                <Link key={e.id} href={`/essais/${e.id}`} className="profil-essai-link">
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '13.5px', fontStyle: 'italic', color: '#1a2818', flex: 1, lineHeight: 1.4 }}>
                    {e.titre}
                  </span>
                  {e.publie_at && (
                    <span style={{ fontSize: '10px', color: '#b0a090', flexShrink: 0, fontFamily: 'Georgia, serif' }}>
                      {new Date(e.publie_at).getFullYear()}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Rien de public */}
        {rienDePublic && (
          <p style={{ fontSize: '12.5px', color: '#b0a89e', fontStyle: 'italic', textAlign: 'center', paddingTop: '32px', fontFamily: 'Georgia, serif' }}>
            Ce profil ne partage pas encore d&apos;informations publiques.
          </p>
        )}

      </div>
    </main>
  )
}
