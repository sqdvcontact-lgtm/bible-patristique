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
  email: string | null
  pret: boolean
  // Le PROFIL du compte connecté, lu une seule fois pour toute la page.
  //
  // ⛔ Ne plus interroger `profils` depuis un composant. La barre, le texte biblique,
  // le volet patristique et la page Bible le faisaient chacun pour soi : six requêtes
  // par chargement pour deux informations, dont trois pour le même `est_admin`
  // (mesuré le 2026-08-24). `pseudo` vaut null tant que `profilPret` est faux.
  pseudo: string | null
  estAdmin: boolean
  profilPret: boolean
  /** Après une modification du profil (pseudonyme, droits) : relire la ligne. */
  rafraichirProfil: () => void
  // Vrai seulement pour un compte PERSONNEL (ni anonyme, ni compte de démo partagé).
  aUnCompte: boolean
  // Garde à poser en tête de toute action d'écriture : renvoie true si le visiteur
  // a un compte personnel (l'action peut suivre), sinon ouvre la modale d'invitation
  // et renvoie false. `contexte` amorce la phrase (« pour commenter ce passage… »).
  exigerCompte: (contexte?: string) => boolean
}

const Contexte = createContext<ContexteCompte>({
  userId: null, email: null, pret: false,
  pseudo: null, estAdmin: false, profilPret: false, rafraichirProfil: () => {},
  aUnCompte: false, exigerCompte: () => false,
})

export function ProvisionCompte({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [pret, setPret] = useState(false)
  // Le profil est gardé AVEC l'identifiant auquel il appartient : c'est ce qui permet
  // d'en dériver `pseudo`, `estAdmin` et `profilPret` pendant le rendu, sans poser
  // d'état dans le corps de l'effet (cascade de rendus, cf. AGENTS.md).
  const [profil, setProfil] = useState<{ pour: string; pseudo: string | null; estAdmin: boolean } | null>(null)
  // Incrémenté par `rafraichirProfil` : c'est la seule façon de redemander la ligne.
  const [relecture, setRelecture] = useState(0)
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

  // Le profil, une fois par session. `onAuthStateChange` émettant un événement de
  // session initiale juste après `getSession`, `userId` prend sa valeur une seule
  // fois : la requête ne part donc pas deux fois, comme elle le faisait quand chaque
  // composant tenait son propre abonnement.
  useEffect(() => {
    if (!userId) return
    let vivant = true
    supabase.from('profils').select('pseudo, est_admin').eq('id', userId).maybeSingle()
      .then(({ data }) => {
        if (vivant) setProfil({ pour: userId, pseudo: data?.pseudo ?? null, estAdmin: data?.est_admin === true })
      })
    return () => { vivant = false }
  }, [userId, relecture])

  const rafraichirProfil = useCallback(() => setRelecture(n => n + 1), [])

  const profilCourant = profil && profil.pour === userId ? profil : null
  const pseudo = profilCourant?.pseudo ?? null
  const estAdmin = profilCourant?.estAdmin ?? false
  // « Prêt » veut dire « on sait à quoi s'en tenir » : soit personne n'est connecté,
  // soit la ligne est arrivée. C'est ce qui permet à un panneau de ne pas se peindre
  // deux fois, une première comme anonyme puis une seconde comme lecteur connecté.
  const profilPret = pret && (!userId || profilCourant !== null)

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
    <Contexte.Provider value={{ userId, email, pret, pseudo, estAdmin, profilPret, rafraichirProfil, aUnCompte, exigerCompte }}>
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
