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

import Image from 'next/image'
import { CADRAGE_PAR_DEFAUT, urlPortrait, type Cadrage } from '@/app/lib/portraits'

export default function PortraitLecteur({ refPortrait: ref, cadrage, initiale, taille, alt = '' }: {
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
  alt?: string
}) {
  const url = urlPortrait(ref)
  const cadre = cadrage ?? CADRAGE_PAR_DEFAUT
  // ⛔ EN REM, jamais en pixels : voir la note de `taille`. Le nombre reçu dit la mesure
  // à la racine 16, et le rond suit la racine partout ailleurs.
  const mesure = `${taille / 16}rem`
  const commun = {
    width: mesure, height: mesure, borderRadius: '50%',
    border: '2px solid var(--cs-bord)', flexShrink: 0,
  } as const

  if (!url) {
    return (
      <div style={{ ...commun, background: 'linear-gradient(135deg,var(--cs-vert-aplat),var(--cs-vert-aplat-profond))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* ⚠️ L'initiale suit le rond, donc la racine : elle se dit en rem comme lui, et
            non plus en pixels arrondis. */}
        <span aria-hidden="true" style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: `${(taille * 0.42) / 16}rem`, color: 'var(--cs-fond-doux)' }}>
          {initiale.charAt(0).toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    <div style={{ ...commun, overflow: 'hidden', position: 'relative' }}>
      <Image src={url} alt={alt} fill sizes={`${taille}px`} unoptimized
        style={{
          objectFit: 'cover',
          objectPosition: `${cadre.posX}% ${cadre.posY}%`,
          transform: `scale(${cadre.zoom})`,
          transformOrigin: 'center center',
        }} />
    </div>
  )
}
