'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import {
  construireIndexEditeurs,
  resoudreNomEditeur,
  type IndexEditeurs,
} from '@/app/lib/editeursNormalisation'

// Cache NAVIGATEUR de la table de référence `editeurs`, pour les surfaces qui se
// composent chez le lecteur (bibliothèque). Les pages rendues sur le serveur passent
// par `app/lib/editeursServeur.ts`, qui résout avant même d'envoyer la page.
//
// Les données brutes (oeuvres.editeur) ne sont jamais modifiées : on remplace, à
// l'affichage, une forme rencontrée par le nom complet quand il est répertorié. La
// table se remplit au fil du catalogage ; tant qu'un éditeur n'y est pas, on garde
// sa forme brute. La construction de l'index et la clé de comparaison vivent dans
// `editeursNormalisation.ts`, module pur partagé avec le serveur.

let cache: IndexEditeurs | null = null
let enCours: Promise<void> | null = null

export function chargerEditeurs(): Promise<void> {
  if (cache) return Promise.resolve()
  if (!enCours) {
    enCours = (async () => {
      try {
        const { data } = await supabase.from('editeurs').select('nom_complet, variantes, ville')
        cache = construireIndexEditeurs(
          (data ?? []) as { nom_complet: string; variantes: string[] | null; ville: string | null }[],
        )
      } catch {
        cache = construireIndexEditeurs([])
      }
    })()
  }
  return enCours
}

// Résolution synchrone depuis le cache : nom complet si connu, sinon null (cache non chargé
// ou éditeur non répertorié).
export function resoudreEditeur(brut: string): string | null {
  return resoudreNomEditeur(brut, cache)
}

// Hook : déclenche le chargement une fois et provoque un re-rendu quand le cache est prêt,
// pour que `formaterEditeur` renvoie alors les noms complets.
export function useEditeursCharges(): boolean {
  const [pret, setPret] = useState<boolean>(!!cache)
  useEffect(() => {
    if (cache) { setPret(true); return }
    let vivant = true
    chargerEditeurs().then(() => { if (vivant) setPret(true) })
    return () => { vivant = false }
  }, [])
  return pret
}

/** Index du navigateur, ou null tant qu'il n'est pas chargé. `normaliserNomEditeur`
 *  sait déjà rendre la forme brute dans ce cas : rien à garder ici. */
export function indexEditeursNavigateur(): IndexEditeurs | null {
  return cache
}
