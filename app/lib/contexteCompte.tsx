'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { supabase } from './supabase'
import { appliquerTheme, lireTheme, themeValide, type Theme } from './theme'
import { CADRAGE_PAR_DEFAUT, type Cadrage } from './portraits'
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
  // Le PORTRAIT choisi, sous forme de référence, et son cadrage : la barre les montre
  // sur toutes les pages. Voir app/lib/portraits.ts — c'est une référence, jamais une
  // adresse.
  portrait: string | null
  cadragePortrait: Cadrage | null
  // La MARQUE DE MÉCÈNE du compte connecté, pour que le commentaire qu'on vient de
  // poser la porte aussitôt, sans attendre le prochain chargement complet. Elle vient
  // avec le reste : deux colonnes de plus sur une requête qui part déjà.
  // ⛔ Ce n'est PAS un droit. Voir app/components/MarqueMecene.tsx.
  estMecene: boolean
  profilPret: boolean
  /** Après une modification du profil (pseudonyme, droits) : relire la ligne. */
  rafraichirProfil: () => void
  // Le thème de lecture (Clair / Cuir). C'est une PRÉFÉRENCE DE COMPTE, retenue dans
  // `profils.theme_lecture` et miroitée dans le stockage local, qui seul sait la poser
  // avant peinture. `changerTheme` écrit les trois : l'écran, le miroir, le compte.
  theme: Theme
  /** Rend l'écriture en base, pour qui veut en signaler l'échec (page du compte). */
  changerTheme: (theme: Theme) => Promise<void>
  // Vrai seulement pour un compte PERSONNEL (ni anonyme, ni compte de démo partagé).
  aUnCompte: boolean
  // Garde à poser en tête de toute action d'écriture : renvoie true si le visiteur
  // a un compte personnel (l'action peut suivre), sinon ouvre la modale d'invitation
  // et renvoie false. `contexte` amorce la phrase (« pour commenter ce passage… »).
  exigerCompte: (contexte?: string) => boolean
}

const Contexte = createContext<ContexteCompte>({
  userId: null, email: null, pret: false,
  pseudo: null, estAdmin: false, portrait: null, cadragePortrait: null, estMecene: false,
  profilPret: false, rafraichirProfil: () => {},
  theme: 'clair', changerTheme: async () => {},
  aUnCompte: false, exigerCompte: () => false,
})

export function ProvisionCompte({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [pret, setPret] = useState(false)
  // Le profil est gardé AVEC l'identifiant auquel il appartient : c'est ce qui permet
  // d'en dériver `pseudo`, `estAdmin` et `profilPret` pendant le rendu, sans poser
  // d'état dans le corps de l'effet (cascade de rendus, cf. AGENTS.md).
  const [profil, setProfil] = useState<{ pour: string; pseudo: string | null; estAdmin: boolean; portrait: string | null; cadrage: Cadrage | null; estMecene: boolean } | null>(null)
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

  // ── Thème de lecture ────────────────────────────────────────────────────────
  // L'état part du CLAIR, comme le rendu serveur, et se rattrape au montage : le
  // thème réel est déjà posé sur <html> par le script du gabarit, on ne dessine ici
  // que de quoi rendre l'interrupteur. Partir de la valeur mémorisée ferait diverger
  // les deux rendus.
  //
  // ⚠️ La référence double l'état parce que le rapprochement ci-dessous a lieu dans
  // une réponse réseau : il doit lire le thème du MOMENT, non celui capturé au rendu
  // où la requête est partie.
  const [theme, setTheme] = useState<Theme>('clair')
  const themeRef = useRef<Theme>('clair')
  useEffect(() => {
    const local = lireTheme()
    themeRef.current = local
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (local !== 'clair') setTheme(local)
  }, [])

  const changerTheme = useCallback(async (choisi: Theme) => {
    themeRef.current = choisi
    setTheme(choisi)
    appliquerTheme(choisi)
    // Le compte fait foi : c'est lui qui portera la préférence sur le prochain poste.
    if (!userId) return
    const { error } = await supabase.from('profils').update({ theme_lecture: choisi }).eq('id', userId)
    if (error) throw error
  }, [userId])

  // Rapprochement, à l'arrivée du profil, une seule fois par session. Le COMPTE
  // l'emporte : c'est la préférence enregistrée, le stockage local n'en est que le
  // miroir de ce poste. Et un navigateur qui porte un choix que le compte ignore
  // encore le lui remonte, pour que les préférences d'avant ne soient pas perdues.
  //
  // ⛔ Ce rapprochement ne peut pas boucler : le profil est demandé sur `userId`, non
  // sur le thème. Le défaut du 2026-08-24 sur la traduction biblique venait
  // précisément d'un effet qui avait dans ses dépendances la valeur qu'il posait.
  const accorderTheme = useCallback((pour: string, duCompte: Theme | null) => {
    const duPoste = themeRef.current
    if (duCompte && duCompte !== duPoste) {
      themeRef.current = duCompte
      setTheme(duCompte)
      appliquerTheme(duCompte)
      return
    }
    if (!duCompte && duPoste !== 'clair') {
      supabase.from('profils').update({ theme_lecture: duPoste }).eq('id', pour).then(() => {})
    }
  }, [])

  // Le profil, une fois par session. `onAuthStateChange` émettant un événement de
  // session initiale juste après `getSession`, `userId` prend sa valeur une seule
  // fois : la requête ne part donc pas deux fois, comme elle le faisait quand chaque
  // composant tenait son propre abonnement.
  useEffect(() => {
    if (!userId) return
    let vivant = true
    // ⚠️ Le PORTRAIT vient avec le reste, et non d'une seconde lecture. La barre le
    // montre sur toutes les pages : demandé à part, il aurait ajouté une requête par
    // chargement pour quatre colonnes que celle-ci rapporte sans rien coûter de plus.
    supabase.from('profils')
      .select('pseudo, est_admin, theme_lecture, avatar_ref, avatar_pos_x, avatar_pos_y, avatar_zoom, mecene_depuis, pub_mecene')
      .eq('id', userId).maybeSingle()
      .then(({ data }) => {
        if (!vivant) return
        setProfil({
          pour: userId,
          pseudo: data?.pseudo ?? null,
          estAdmin: data?.est_admin === true,
          // ⚠️ `pub_mecene` compte ICI comme partout : un lecteur qui retire sa marque
          // ne doit pas la voir reparaître sur ses propres commentaires.
          estMecene: !!data?.mecene_depuis && data?.pub_mecene !== false,
          portrait: data?.avatar_ref ?? null,
          cadrage: data?.avatar_ref
            ? {
                posX: data.avatar_pos_x ?? CADRAGE_PAR_DEFAUT.posX,
                posY: data.avatar_pos_y ?? CADRAGE_PAR_DEFAUT.posY,
                zoom: data.avatar_zoom ?? CADRAGE_PAR_DEFAUT.zoom,
              }
            : null,
        })
        accorderTheme(userId, themeValide(data?.theme_lecture))
      })
    return () => { vivant = false }
  }, [userId, relecture, accorderTheme])

  const rafraichirProfil = useCallback(() => setRelecture(n => n + 1), [])

  const profilCourant = profil && profil.pour === userId ? profil : null
  const pseudo = profilCourant?.pseudo ?? null
  const estAdmin = profilCourant?.estAdmin ?? false
  const portrait = profilCourant?.portrait ?? null
  const cadragePortrait = profilCourant?.cadrage ?? null
  const estMecene = profilCourant?.estMecene ?? false
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
    <Contexte.Provider value={{ userId, email, pret, pseudo, estAdmin, portrait, cadragePortrait, estMecene, profilPret, rafraichirProfil, theme, changerTheme, aUnCompte, exigerCompte }}>
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
