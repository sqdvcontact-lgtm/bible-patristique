'use client'

// Le rond d'un lecteur, partout le même.
//
// ⚠️ Il paraît à cinq endroits : l'aperçu du compte, la rubrique « Présentation », la
// page publique, le bouton de la barre et son menu. Dessiné cinq fois, il aurait
// dérivé au premier réglage de bordure — c'est ce qui est arrivé aux deux listes
// d'entrées de l'administration (app/lib/adminNavigation.ts). Il n'y en a donc qu'un.
//
// ⛔ Il ne prend PAS d'URL. Il prend une référence, et fabrique l'adresse lui-même :
// c'est ainsi qu'aucune adresse venue d'ailleurs ne peut se glisser dans une page
// (voir app/lib/portraits.ts).

import { useState } from 'react'
import Image from 'next/image'
import { CADRAGE_PAR_DEFAUT, urlPortrait, urlVignettePortrait, type Cadrage } from '@/app/lib/portraits'
import { SERIF } from '@/app/lib/polices'

export default function PortraitLecteur({ refPortrait: ref, cadrage, initiale, taille, carre = false, alt = '', couleurFilet = 'var(--cs-bord)' }: {
  refPortrait: string | null | undefined
  cadrage?: Cadrage | null
  /** La lettre qui tient lieu de portrait tant qu'aucun n'est choisi. */
  initiale: string
  /**
   * En pixels À LA RACINE 16, le cas courant : le rond est toujours carré, et il est
   * POSÉ EN REM.
   *
   * ⛔ Il l'était en pixels jusqu'au 2026-09-10, et c'est le défaut que l'auteur a
   * relevé : « le rond du menu déroulant de compte est trop petit ». La police racine du
   * site est FLUIDE — 16 px jusqu'à 1440, jusqu'à 22 au-delà — si bien que le rond
   * rapetissait à mesure que l'écran s'agrandissait, tout son voisinage étant en rem.
   * Mesuré dans la tête du menu de compte, une iframe par racine : le rond couvrait
   * **88 %** de la hauteur du bloc de texte à la racine 16, **73 %** à 19, **64 %** à 22.
   * Posé en rem, il en couvre 99 à 100 % partout.
   *
   * ⚠️ Le FILET, lui, reste en pixels : un rem le rendrait flou. C'est la règle du dépôt.
   */
  taille: number
  /**
   * CARRÉ et à la mesure de sa boîte, au lieu du rond de `taille` : c'est le parent qui
   * dit la mesure. Le bandeau de l'espace du lecteur le veut aussi haut que le bloc de
   * texte qu'il accompagne (auteur, 2026-09-22). `taille` ne règle plus alors que
   * l'initiale.
   */
  carre?: boolean
  alt?: string
  /** La couleur du filet : la page publique le veut doré. */
  couleurFilet?: string
}) {
  // ⛔ La VIGNETTE d'abord (10 à 20 Ko), le portrait entier s'il manque, l'initiale si
  // rien ne vient : le rond de la barre chargeait le portrait entier (60 à 160 Ko) pour
  // 22 px, et montrait une image cassée si le fichier disparaissait.
  const [echecs, setEchecs] = useState<readonly string[]>([])
  const url = [urlVignettePortrait(ref), urlPortrait(ref)].find(u => u && !echecs.includes(u)) ?? null
  const cadre = cadrage ?? CADRAGE_PAR_DEFAUT
  // ⛔ EN REM, jamais en pixels : voir la note de `taille`. Le nombre reçu dit la mesure
  // à la racine 16, et le rond suit la racine partout ailleurs.
  const mesure = `${taille / 16}rem`
  const commun = carre
    ? { width: '100%', height: '100%', borderRadius: '4px', border: `1px solid ${couleurFilet}`, flexShrink: 0 } as const
    : { width: mesure, height: mesure, borderRadius: '50%', border: `2px solid ${couleurFilet}`, flexShrink: 0 } as const

  if (!url) {
    return (
      <div style={{ ...commun, background: 'linear-gradient(135deg,var(--cs-vert-aplat),var(--cs-vert-aplat-profond))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* ⚠️ L'initiale suit le rond, donc la racine : elle se dit en rem comme lui, et
            non plus en pixels arrondis. */}
        <span aria-hidden="true" style={{ fontFamily: SERIF, fontSize: `${(taille * 0.42) / 16}rem`, color: 'var(--cs-sur-aplat-doux)' }}>
          {initiale.charAt(0).toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    <div style={{ ...commun, overflow: 'hidden', position: 'relative' }}>
      {/* ⛔ Le zoom tourne autour du POINT CADRÉ, comme sur la carte et la fiche
          (app/lib/photoAuteur.ts) : les mêmes nombres désignent alors la même région.
          Autour du centre, le visage sortait du rond de Tertullien, Boèce ou Dhuoda. */}
      <Image src={url} alt={alt} fill unoptimized
        onError={() => setEchecs(prev => [...prev, url])}
        style={{
          objectFit: 'cover',
          objectPosition: `${cadre.posX}% ${cadre.posY}%`,
          transform: `scale(${cadre.zoom})`,
          transformOrigin: `${cadre.posX}% ${cadre.posY}%`,
        }} />
    </div>
  )
}
