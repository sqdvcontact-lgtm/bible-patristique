'use client'

/**
 * LE BRANCHEMENT DE LA VISITE DE L'ACCUEIL.
 *
 * ⚠️ Un composant à part, et non le câblage glissé dans « AccueilCards » : la
 * visite parle de la BARRE, non des cartes, et les cartes n'ont pas à savoir
 * qu'une visite existe. La page de l'accueil est rendue par le serveur ; c'est
 * donc ici que vit le peu d'état qu'il faut.
 *
 * ⛔ ELLE NE S'OUVRE QU'EN ÉCRAN LARGE. Sous le seuil du menu déroulant, la barre
 * se replie en bouton de menu : ses onglets restent dans le document mais de
 * taille nulle, et les sept étapes s'effaceraient l'une après l'autre, chacune au
 * prix d'une seconde d'attente. La page dit donc elle-même quand elle peut porter
 * sa visite (charte § 46).
 */

import { useEffect, useRef, useState } from 'react'
import VisiteGuidee from '@/app/components/VisiteGuidee'
import { CLE_VISITE_ACCUEIL, VISITE_ACCUEIL } from '@/app/lib/visiteAccueil'
import { useCompte } from '@/app/lib/contexteCompte'
import { offrirLaVisite } from '@/app/lib/demandeDeVisite'
import { useEstMobile } from '@/app/lib/useEstMobile'

/** Le seuil du menu déroulant de la barre : `lg`, 1024 px. ⚠️ Ce n'est PAS le 900
 *  de la charte, et c'est motivé — la barre se replie à `lg`, non à 900, et c'est
 *  elle que la visite montre. */
const SEUIL_BARRE_DEPLOYEE = 1024

export default function VisiteDeLAccueil() {
  const barrePliee = useEstMobile(SEUIL_BARRE_DEPLOYEE)
  // La mémoire des visites vit sur le COMPTE, miroitée sur ce poste : une seule porte.
  const { visiteFaite, oublierVisite, profilPret } = useCompte()

  // ⚠️ L'état est un COMPTEUR, non un drapeau : rappelée par la barre alors qu'elle
  // est déjà ouverte, la visite repart de son grand message, et le composant ne s'y
  // remet qu'en se REMONTANT. Le compteur lui sert de clé.
  const [visite, setVisite] = useState(0)
  const proposee = useRef(false)

  // ⛔ ON ATTEND `profilPret` : la décision de passer une visite vit sur le COMPTE,
  // et tant que le profil n'est pas arrivé on ne sait pas ce qu'il en dit. Sans cette
  // garde, un lecteur qui a passé la visite ailleurs la reverrait sur ce poste — le
  // défaut même que la colonne `visites_faites` corrige. ⚠️ Ce n'est PAS un délai pour
  // le visiteur sans compte : `profilPret` ne vaut alors que « la session est connue »,
  // ce que `getSession` rend depuis le stockage local, sans réseau.
  useEffect(() => {
    if (barrePliee || !profilPret || proposee.current) return
    proposee.current = true
    const params = new URLSearchParams(window.location.search)
    if (params.has('visite')) oublierVisite(CLE_VISITE_ACCUEIL)
    else if (visiteFaite(CLE_VISITE_ACCUEIL)) return
    // Le frontispice et les cartes sont rendus par le serveur : il ne reste qu'à
    // laisser la barre finir de se mesurer, elle qui se replie par crans.
    const depart = window.setTimeout(() => setVisite(1), 320)
    return () => window.clearTimeout(depart)
  }, [barrePliee, profilPret, visiteFaite, oublierVisite])

  // La page OFFRE sa visite à la barre, qui porte un bouton d'administration pour la
  // rappeler (voir app/lib/demandeDeVisite.ts). ⛔ Rien à offrir tant que la barre
  // est pliée : le bouton promettrait une visite qui s'effacerait aussitôt.
  useEffect(() => {
    if (barrePliee) return
    return offrirLaVisite(() => setVisite(n => n + 1))
  }, [barrePliee])

  if (visite === 0) return null
  return <VisiteGuidee key={visite} visite={VISITE_ACCUEIL} onFin={() => setVisite(0)} />
}
