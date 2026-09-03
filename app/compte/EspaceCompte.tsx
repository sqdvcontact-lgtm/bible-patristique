'use client'

// Le CADRE de l'espace du lecteur : la session, le profil, la feuille.
//
// ⛔ IL NE PORTE PLUS DE COLONNE DE NAVIGATION. Chaque page pose son propre
// sommaire — les ancres n'étant pas les mêmes des deux côtés — et le cadre ne
// garde que ce qui est commun : la session, le profil lu une fois, et la feuille.
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
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { useCompte } from '@/app/lib/contexteCompte'
import { ENCRE_TITRE_CARTE, GRAISSE_TITRE, TITRE_CARTE } from '@/app/lib/hierarchieTitres'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { FEUILLE_ESPACE } from '@/app/compte/piecesEspace'

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
  // La MARQUE DE MÉCÈNE : la date du premier don reçu, ou null. ⛔ Elle ne s'écrit
  // jamais d'ici — le trigger `profils_garde_colonnes` la retient. Seul `pub_mecene`
  // appartient au lecteur, qui peut se taire. Voir app/components/MarqueMecene.tsx.
  mecene_depuis: string | null
  pub_mecene: boolean
  onboarding_vu: boolean | null
  // ⛔ `membre_depuis` n'existe pas dans `profils` : c'est `created_at`, renommé à
  // la lecture, comme le fait déjà l'API de la page publique.
  membre_depuis: string | null
  // Le portrait est une RÉFÉRENCE — « auteur:A0010 » —, jamais une adresse : voir
  // app/lib/portraits.ts. Les trois autres champs portent son cadrage.
  avatar_ref: string | null
  avatar_pos_x: number | null
  avatar_pos_y: number | null
  avatar_zoom: number | null
}

const CHAMPS_PROFIL =
  'id, pseudo, nom, prenom, traduction_defaut, theme_lecture, bio, contact_email, ' +
  'pub_rang, pub_essais, pub_favoris_oeuvre, pub_favoris_versets, mecene_depuis, pub_mecene, onboarding_vu, ' +
  'avatar_ref, avatar_pos_x, avatar_pos_y, avatar_zoom, membre_depuis:created_at'

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
      <main style={{ minHeight: `calc(100vh - ${HAUTEUR_NAVBAR})`, background: 'var(--cs-fond)' }}>
        <style>{FEUILLE_ESPACE}</style>
        {children}
      </main>
    </Contexte.Provider>
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
      mecene_depuis: null, pub_mecene: true,
      onboarding_vu: false, membre_depuis: null,
      avatar_ref: null, avatar_pos_x: null, avatar_pos_y: null, avatar_zoom: null,
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
