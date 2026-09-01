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
  /** En pixels : le rond est toujours carré. */
  taille: number
  alt?: string
}) {
  const url = urlPortrait(ref)
  const cadre = cadrage ?? CADRAGE_PAR_DEFAUT
  const commun = {
    width: `${taille}px`, height: `${taille}px`, borderRadius: '50%',
    border: '2px solid var(--cs-bord)', flexShrink: 0,
  } as const

  if (!url) {
    return (
      <div style={{ ...commun, background: 'linear-gradient(135deg,var(--cs-vert-aplat),var(--cs-vert-aplat-profond))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span aria-hidden="true" style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: `${Math.round(taille * 0.42)}px`, color: 'var(--cs-fond-doux)' }}>
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
