'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from './supabase'
import ModaleCompteRequis from '@/app/components/ModaleCompteRequis'

// Adresse du compte de démonstration partagé (bêta), exposée au navigateur comme
// l'est déjà NEXT_PUBLIC_ADMIN_EMAIL. Ce n'est pas un secret : seulement le repère
// qui distingue « visiteur sans compte personnel » d'un vrai inscrit.
const EMAIL_INVITE = (process.env.NEXT_PUBLIC_EMAIL_INVITE ?? '').trim().toLowerCase()

type ContexteCompte = {
  userId: string | null
  pret: boolean
  // Vrai seulement pour un compte PERSONNEL (ni anonyme, ni compte de démo partagé).
  aUnCompte: boolean
  // Garde à poser en tête de toute action d'écriture : renvoie true si le visiteur
  // a un compte personnel (l'action peut suivre), sinon ouvre la modale d'invitation
  // et renvoie false. `contexte` amorce la phrase (« pour commenter ce passage… »).
  exigerCompte: (contexte?: string) => boolean
}

const Contexte = createContext<ContexteCompte>({
  userId: null, pret: false, aUnCompte: false, exigerCompte: () => false,
})

export function ProvisionCompte({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [pret, setPret] = useState(false)
  // Contexte affiché dans la modale ; null = modale fermée.
  const [invitation, setInvitation] = useState<string | null>(null)

  useEffect(() => {
    let vivant = true
    supabase.auth.getSession().then(({ data }) => {
      if (!vivant) return
      setUserId(data.session?.user.id ?? null)
      setEmail(data.session?.user.email ?? null)
      setPret(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null)
      setEmail(session?.user.email ?? null)
      setPret(true)
    })
    return () => { vivant = false; listener.subscription.unsubscribe() }
  }, [])

  // « Avoir un compte » = être connecté avec un compte personnel. Le compte de
  // démonstration partagé (EMAIL_INVITE) ne compte pas : ceux qui l'empruntent
  // sont invités à créer le leur. Tant qu'EMAIL_INVITE n'est pas renseigné, seul
  // l'anonyme (aucune session) est tenu pour « sans compte ».
  const aUnCompte = !!userId && (!EMAIL_INVITE || (email ?? '').trim().toLowerCase() !== EMAIL_INVITE)

  const exigerCompte = useCallback((contexte?: string) => {
    if (aUnCompte) return true
    setInvitation(contexte ?? '')
    return false
  }, [aUnCompte])

  return (
    <Contexte.Provider value={{ userId, pret, aUnCompte, exigerCompte }}>
      {children}
      {invitation !== null && (
        <ModaleCompteRequis contexte={invitation} onClose={() => setInvitation(null)} />
      )}
    </Contexte.Provider>
  )
}

export function useCompte() {
  return useContext(Contexte)
}
