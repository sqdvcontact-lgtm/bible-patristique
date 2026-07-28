'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

// Résolution d'AFFICHAGE des noms d'éditeurs, depuis la table de référence `editeurs`.
// Les données brutes (oeuvres.editeur) ne sont jamais modifiées : ici on remplace, à
// l'affichage, une forme rencontrée par le nom complet quand il est répertorié. La table
// se remplit au fil du catalogage ; tant qu'un éditeur n'y est pas, on garde la forme brute.

type Ligne = { nom_complet: string; variantes: string[] | null }

let cache: Map<string, string> | null = null
let enCours: Promise<void> | null = null

// Même clé de comparaison que la fonction SQL `cle_editeur` : minuscule, sans accents ni
// ponctuation, espaces normalisés.
function cle(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function chargerEditeurs(): Promise<void> {
  if (cache) return Promise.resolve()
  if (!enCours) {
    enCours = (async () => {
      try {
        const { data } = await supabase.from('editeurs').select('nom_complet, variantes')
        const m = new Map<string, string>()
        ;(data ?? []).forEach((e: Ligne) => {
          m.set(cle(e.nom_complet), e.nom_complet)
          ;(e.variantes ?? []).forEach(v => { if (v) m.set(cle(v), e.nom_complet) })
        })
        cache = m
      } catch {
        cache = new Map()
      }
    })()
  }
  return enCours
}

// Résolution synchrone depuis le cache : nom complet si connu, sinon null (cache non chargé
// ou éditeur non répertorié).
export function resoudreEditeur(brut: string): string | null {
  if (!cache) return null
  return cache.get(cle(brut)) ?? null
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
