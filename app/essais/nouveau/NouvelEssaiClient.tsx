'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import EditeurEssai from '../EditeurEssai'
import type { Metadonnees } from '../EtapeMetadonnees'

export default function NouvelEssaiClient() {
  const [metadonneesInitiales, setMetadonneesInitiales] = useState<Metadonnees | null>(null)
  const [versetEnTete, setVersetEnTete] = useState<{ ref: string; texte: string } | null>(null)
  const [pret, setPret] = useState(false)

  useEffect(() => {
    const brutes = window.sessionStorage.getItem('nouvel-essai-metadonnees')
    if (brutes) {
      try {
        setMetadonneesInitiales(JSON.parse(brutes) as Metadonnees)
        window.sessionStorage.removeItem('nouvel-essai-metadonnees')
      } catch {
        window.sessionStorage.removeItem('nouvel-essai-metadonnees')
      }
    }
    const bruteVerset = window.sessionStorage.getItem('suggestion-verset-en-tete')
    if (bruteVerset) {
      try {
        setVersetEnTete(JSON.parse(bruteVerset) as { ref: string; texte: string })
      } catch {}
      window.sessionStorage.removeItem('suggestion-verset-en-tete')
    }
    // Rafraîchir la session côté client (le serveur a déjà vérifié l'auth au
    // moment du rendu, mais le token peut expirer pendant la session)
    supabase.auth.getSession().then(() => setPret(true))
  }, [])

  if (!pret) return null

  return <EditeurEssai metadonneesInitiales={metadonneesInitiales} versetEnTeteInitial={versetEnTete} />
}
