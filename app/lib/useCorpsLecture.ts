'use client'

import { useSyncExternalStore } from 'react'
import { abonnerCorps, CORPS_DEFAUT, lireCorps, type CorpsLecture } from './corpsLecture'

/**
 * Le cran de « Taille du texte » que ce navigateur a retenu. Le rendu serveur et la
 * première peinture lisent le cran normal ; l'attribut, lui, est déjà posé sur <html>
 * par `SCRIPT_CORPS`, si bien que le TEXTE est juste dès la première image : seul le
 * choix coché du volet se rattrape à l'hydratation.
 */
export function useCorpsLecture(): CorpsLecture {
  return useSyncExternalStore(abonnerCorps, lireCorps, () => CORPS_DEFAUT)
}
