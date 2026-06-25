'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type ContexteAffichageAdmin = {
  modeUtilisateurStandard: boolean
  setModeUtilisateurStandard: (v: boolean) => void
}

const Contexte = createContext<ContexteAffichageAdmin>({
  modeUtilisateurStandard: false,
  setModeUtilisateurStandard: () => {},
})

const CLE_STOCKAGE = 'bp_mode_affichage'

// Réglage purement cosmétique : quand actif, un compte admin voit le site
// comme un utilisateur standard (crayons et lien Administration masqués),
// sans que ses droits réels (profils.est_admin, RLS, routes serveur) changent
// en quoi que ce soit. Persisté en local pour rester stable entre les pages.
export function ProvisionAffichageAdmin({ children }: { children: ReactNode }) {
  const [modeUtilisateurStandard, setModeUtilisateurStandardEtat] = useState(false)

  useEffect(() => {
    const valeur = window.localStorage.getItem(CLE_STOCKAGE)
    if (valeur === '1') setModeUtilisateurStandardEtat(true)
  }, [])

  const setModeUtilisateurStandard = (v: boolean) => {
    setModeUtilisateurStandardEtat(v)
    window.localStorage.setItem(CLE_STOCKAGE, v ? '1' : '0')
  }

  return (
    <Contexte.Provider value={{ modeUtilisateurStandard, setModeUtilisateurStandard }}>
      {children}
    </Contexte.Provider>
  )
}

export function useAffichageAdmin() {
  return useContext(Contexte)
}