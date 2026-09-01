'use client'

// Le CADRE de l'espace du lecteur : la session, le profil, la colonne.
//
// ⛔ Chaque rubrique NE relit PAS le profil. La page du compte tenait ses sept blocs
// dans un seul fichier de 978 lignes ; découpés en rubriques, ils auraient chacun
// refait la même lecture de `profils` à chaque changement d'onglet. Le cadre la fait
// une fois et la passe par ce contexte, sur le modèle de `contexteCompte`, qui a réglé
// le même problème pour la barre du haut.
//
// ⚠️ Ce contexte est LOCAL à /compte. Le contexte global (app/lib/contexteCompte.tsx)
// porte ce dont tout le site a besoin, à savoir le pseudonyme, les droits et le thème.
// Il n'a pas à charger la bio, les interrupteurs de visibilité ni la date d'inscription
// pour un visiteur qui lit un chapitre de la Genèse.

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { useCompte } from '@/app/lib/contexteCompte'
import { entreeCourante, entreesEspace, GROUPES_ESPACE } from '@/app/lib/espaceLecteurNavigation'
import { ENCRE_TITRE_CARTE, GRAISSE_TITRE, TITRE_CARTE } from '@/app/lib/hierarchieTitres'

export type ProfilLecteur = {
  id: string
  pseudo: string
  nom: string | null
  prenom: string | null
  traduction_defaut: string
  // Thème de lecture retenu sur le compte : « clair », « sombre », ou null tant
  // qu'aucune préférence n'a été enregistrée. Voir app/lib/theme.ts.
  theme_lecture: string | null
  bio: string | null
  contact_email: string | null
  pub_rang: boolean
  pub_essais: boolean
  pub_favoris_oeuvre: boolean
  pub_favoris_versets: boolean
  onboarding_vu: boolean | null
  // ⛔ `membre_depuis` n'existe pas dans `profils` : c'est `created_at`, renommé à
  // la lecture, comme le fait déjà l'API de la page publique.
  membre_depuis: string | null
  avatar_url: string | null
  avatar_nom: string | null
  avatar_pos_x: number | null
  avatar_pos_y: number | null
  avatar_zoom: number | null
}

const CHAMPS_PROFIL =
  'id, pseudo, nom, prenom, traduction_defaut, theme_lecture, bio, contact_email, ' +
  'pub_rang, pub_essais, pub_favoris_oeuvre, pub_favoris_versets, onboarding_vu, ' +
  'avatar_url, avatar_nom, avatar_pos_x, avatar_pos_y, avatar_zoom, membre_depuis:created_at'

export type UtilisateurEspace = { id: string; email: string; email_confirmed_at: string | null }

type Espace = {
  user: UtilisateurEspace
  profil: ProfilLecteur
  /** Tient la copie locale à jour après un enregistrement réussi, pour que les
   *  autres rubriques voient le changement sans relire la ligne. */
  majProfil: (champs: Partial<ProfilLecteur>) => void
}

const Contexte = createContext<Espace | null>(null)

export function useEspace(): Espace {
  const espace = useContext(Contexte)
  if (!espace) throw new Error('useEspace s’appelle sous le cadre de /compte, jamais ailleurs.')
  return espace
}

const attente = (
  <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>
  </main>
)

export default function CadreEspace({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { userId, email, pret } = useCompte()
  const [confirmeLe, setConfirmeLe] = useState<string | null>(null)
  const [profil, setProfil] = useState<ProfilLecteur | null>(null)
  const [chargement, setChargement] = useState(true)

  // La date de confirmation ne vit que dans le jeton, que le contexte global n'expose
  // pas : `getSession` la lit du stockage local, sans requête au serveur.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setConfirmeLe(data.session?.user?.email_confirmed_at ?? null))
  }, [userId])

  // Un visiteur sans session n'a rien à faire ici : le proxy l'aura déjà renvoyé au
  // chantier, et ce garde ne sert qu'au cas où la session expire pendant qu'il y est.
  useEffect(() => {
    if (pret && !userId) router.replace('/chantier')
  }, [pret, userId, router])

  useEffect(() => {
    if (!userId) return
    let annule = false
    supabase.from('profils').select(CHAMPS_PROFIL).eq('id', userId).maybeSingle()
      .then(({ data, error }) => {
        if (annule) return
        if (error) console.error('Espace du lecteur : le profil n’a pas pu être lu.', error)
        setProfil((data as ProfilLecteur | null) ?? null)
        setChargement(false)
      })
    return () => { annule = true }
  }, [userId])

  // L'accueil ne se voit qu'une fois, et il se voit AVANT le compte : un lecteur qui
  // vient de s'inscrire n'a rien à régler, il a le site à découvrir.
  useEffect(() => {
    if (profil && !profil.onboarding_vu) router.replace('/bienvenue')
  }, [profil, router])

  const majProfil = useCallback((champs: Partial<ProfilLecteur>) => {
    setProfil(p => (p ? { ...p, ...champs } : p))
  }, [])

  if (!pret || !userId || chargement) return attente
  if (!profil) return <ChoixPseudoInitial userId={userId} onCree={setProfil} />
  if (!profil.onboarding_vu) return attente

  const user: UtilisateurEspace = { id: userId, email: email ?? '', email_confirmed_at: confirmeLe }

  return (
    <Contexte.Provider value={{ user, profil, majProfil }}>
      <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)', padding: '40px 20px 100px' }}>
        <style>{`
          .esp-cadre { display: flex; gap: 30px; width: 100%; max-width: 60rem; margin: 0 auto; align-items: flex-start; }
          .esp-colonne { width: 15rem; flex-shrink: 0; position: sticky; top: 5rem; }
          .esp-contenu { flex: 1; min-width: 0; }
          /* ⚠️ Sous 60rem la colonne ne peut plus tenir à gauche : elle passe au-dessus,
             et ses gloses s'effacent. C'est la règle déjà posée pour le panneau mobile
             de la barre (charte § 36.2) : une ligne par entrée, sinon c'est un rouleau. */
          @media (max-width: 60rem) {
            .esp-cadre { flex-direction: column; gap: 20px; }
            .esp-colonne { width: 100%; position: static; }
            .esp-glose { display: none; }
          }
        `}</style>
        <div className="esp-cadre">
          <nav className="esp-colonne" aria-label="Mon espace">
            <ColonneEspace pseudo={profil.pseudo} />
          </nav>
          <div className="esp-contenu">{children}</div>
        </div>
      </main>
    </Contexte.Provider>
  )
}

// ── La colonne ───────────────────────────────────────────────────────────────
function ColonneEspace({ pseudo }: { pseudo: string }) {
  const chemin = usePathname() ?? '/compte'
  const courante = entreeCourante(chemin, pseudo)
  const entrees = entreesEspace(pseudo)

  return (
    <>
      {GROUPES_ESPACE.map(({ cle, label }, rang) => (
        <div key={cle} style={rang > 0 ? { marginTop: '22px', paddingTop: '18px', borderTop: '1px solid var(--cs-bord-clair)' } : undefined}>
          <p style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)', margin: '0 0 8px', paddingLeft: '12px' }}>
            {label}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {entrees.filter(e => e.groupe === cle).map(entree => {
              const actif = courante?.href === entree.href
              return (
                <Link
                  key={entree.href}
                  href={entree.href}
                  {...(entree.sortant ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  aria-current={actif ? 'page' : undefined}
                  style={{
                    display: 'block', padding: '9px 12px', borderRadius: '8px', textDecoration: 'none',
                    background: actif ? 'var(--cs-surface)' : 'transparent',
                    border: `1px solid ${actif ? 'var(--cs-bord-clair)' : 'transparent'}`,
                    borderLeft: `3px solid ${actif ? 'var(--cs-vert)' : 'transparent'}`,
                  }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84375rem', color: actif ? 'var(--cs-encre)' : 'var(--cs-texte)', fontWeight: actif ? 600 : 400 }}>
                    {entree.label}
                    {entree.sortant && (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.6 }}>
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="esp-glose" style={{ display: 'block', fontSize: '0.65625rem', color: 'var(--cs-texte-doux)', lineHeight: 1.45, marginTop: '2px' }}>
                    {entree.glose}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}

// ── Le pseudonyme, avant tout le reste ───────────────────────────────────────
function ChoixPseudoInitial({ userId, onCree }: { userId: string; onCree: (p: ProfilLecteur) => void }) {
  const [pseudo, setPseudo] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const valider = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pseudo.trim()) { setErreur('Le pseudonyme est requis.'); return }
    setEnvoi(true); setErreur(null)
    const res = await fetch('/api/compte/creer-profil', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, pseudo: pseudo.trim() }),
    })
    const json = await res.json()
    setEnvoi(false)
    if (!res.ok) { setErreur(json.error ?? 'Le profil n’a pas pu être créé. Réessayez.'); return }
    onCree({
      id: userId, pseudo: pseudo.trim(), nom: null, prenom: null, traduction_defaut: 'TR0001',
      theme_lecture: null, bio: null, contact_email: null,
      pub_rang: true, pub_essais: true, pub_favoris_oeuvre: false, pub_favoris_versets: false,
      onboarding_vu: false, membre_depuis: null,
      avatar_url: null, avatar_nom: null, avatar_pos_x: null, avatar_pos_y: null, avatar_zoom: null,
    })
  }

  return (
    <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '12px', padding: '32px 36px', width: '100%', maxWidth: '23.75rem' }}>
        <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: TITRE_CARTE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE_CARTE, marginBottom: '8px' }}>Choisissez votre pseudonyme</h1>
        <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', marginBottom: '20px', lineHeight: 1.5 }}>Il vous identifie sur le site et doit être unique.</p>
        {erreur && <p style={{ fontSize: '0.78125rem', color: 'var(--cs-danger-fonce)', marginBottom: '12px' }}>{erreur}</p>}
        <form onSubmit={valider} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="text" value={pseudo} onChange={e => setPseudo(e.target.value)} maxLength={32} autoFocus placeholder="Pseudonyme"
            style={{ width: '100%', padding: '9px 12px', fontSize: '0.84375rem', border: '1px solid var(--cs-bord)', borderRadius: '8px', background: 'var(--cs-fond-clair)', color: 'var(--cs-texte-fort)', outline: 'none', boxSizing: 'border-box' }} />
          <button type="submit" disabled={envoi}
            style={{ padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', fontSize: '0.84375rem', fontWeight: 500, cursor: 'pointer' }}>
            {envoi ? 'Enregistrement…' : 'Valider'}
          </button>
        </form>
      </div>
    </main>
  )
}
