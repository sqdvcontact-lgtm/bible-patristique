/**
 * Le PORTRAIT d'une traduction, et son cadrage.
 *
 * Une notice de traduction porte deux images : `photo`, le bandeau horizontal qui
 * coiffe la carte, et `photo_encart`, un portrait debout. Les deux cadrages vivent
 * dans `photo_position`, sous `bandeau` et sous `encart`.
 *
 * ⚠️ `lateral` est l'ANCIEN nom du cadrage de l'encart, du temps où la même image
 * servait aux deux cadres. L'administration a pu depuis recopier ce réglage sous
 * `encart` : on lit donc le nouveau nom d'abord.
 *
 * ⛔ Cette règle ne s'écrit qu'ICI. Elle valait pour la page publique des
 * traductions ; elle vaut désormais aussi pour la fiche « À propos de cette
 * traduction » du volet de lecture, et deux copies auraient divergé au premier
 * réglage nouveau.
 */

export type CadragePhoto = { x: number; y: number; scale: number }

export type PositionsPhotoTraduction = {
  bandeau?: CadragePhoto
  encart?: CadragePhoto
  /** Ancien nom de l'encart, du temps où la même image servait aux deux cadres. */
  lateral?: CadragePhoto
} | null | undefined

export type PortraitTraduction = { url: string } & CadragePhoto

/** Ce qu'une source porte, quel que soit le nom de ses colonnes en base. */
export type SourcePortraitTraduction = {
  photo?: string | null
  photo_encart?: string | null
  photo_position?: PositionsPhotoTraduction
}

/**
 * L'image de portrait et son cadrage, ou `null` si la notice n'en porte aucune.
 *
 * Tant qu'une notice n'a pas reçu son portrait, le BANDEAU en tient lieu, avec le
 * cadrage qui avait été réglé pour lui : la fiche ne se troue pas en attendant.
 */
export function portraitTraduction(source: SourcePortraitTraduction): PortraitTraduction | null {
  const positions = source.photo_position ?? null
  if (source.photo_encart) {
    const p = positions?.encart
    return { url: source.photo_encart, x: p?.x ?? 50, y: p?.y ?? 50, scale: p?.scale ?? 1 }
  }
  if (source.photo) {
    const p = positions?.encart ?? positions?.lateral
    return { url: source.photo, x: p?.x ?? 50, y: p?.y ?? 20, scale: p?.scale ?? 1 }
  }
  return null
}

/** Le style d'image qui applique ce cadrage. Le même que celui des portraits d'auteur. */
export function styleImagePortrait(p: PortraitTraduction) {
  return {
    width: '100%',
    height: '100%',
    display: 'block',
    objectFit: 'cover',
    objectPosition: `${p.x}% ${p.y}%`,
    transform: `scale(${p.scale})`,
    transformOrigin: `${p.x}% ${p.y}%`,
  } as const
}
