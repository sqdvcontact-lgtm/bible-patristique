// Cadrage des portraits d'auteur. Module PUR, testé dans photoAuteur.test.ts.
//
// Un portrait paraît sur TROIS surfaces, dont les cadres n'ont ni la même taille
// ni les mêmes proportions. Un cadrage juste sur l'une ne l'est pas sur l'autre :
// c'est pourquoi `photo_position` porte deux réglages, `carte` et `fiche`, et non
// un seul.
//
// ⚠️ Ce module est la SEULE définition de cette géométrie. Elle était jusqu'ici
// recopiée dans quatre fichiers — la bibliothèque, la fiche, l'aperçu et l'écran
// de cadrage de l'admin — avec des valeurs qui avaient déjà divergé. Un aperçu
// d'administration qui recopie les mesures de la page qu'il imite finit toujours
// par mentir : il doit lire les mêmes.

export type AuteurPhotoPos = {
  /** Point de l'image amené au centre du cadre, en pourcentage. */
  x: number
  y: number
  /** Agrandissement, 1 = l'image emplit le cadre au plus juste. */
  scale: number
}

export type AuteurPhotoPositions = {
  /** Carte de la bibliothèque : cadre haut et étroit. */
  carte: AuteurPhotoPos
  /** Fiche de l'auteur : cadre proche du 4:5, sous passe-partout. */
  fiche: AuteurPhotoPos
}

/** Réglages par défaut. Ils diffèrent parce que les cadres diffèrent : la carte
 *  est plus haute que large, et veut donc un point plus haut dans l'image. */
export const POS_CARTE_DEFAUT: AuteurPhotoPos = { x: 50, y: 14, scale: 1 }
export const POS_FICHE_DEFAUT: AuteurPhotoPos = { x: 50, y: 24, scale: 1 }

export const ZOOM_MIN = 1
export const ZOOM_MAX = 3.5

/** Nom d'une surface qui montre un portrait.
 *  ⛔ `apercu` a existé jusqu'au 2026-08-31 : c'était la vignette de la carte que
 *  le survol d'un nom d'auteur faisait paraître. La carte est retirée (voir
 *  `NomVolet`), et la surface avec elle — un écran de cadrage qui propose de
 *  régler une surface inexistante ment autant qu'un cadre aux mauvaises mesures. */
export type SurfacePortrait = 'carte' | 'fiche'

export type CadrePortrait = {
  libelle: string
  /** Mesures EXACTES du composant réel, à l'unité près. */
  largeur: string
  hauteur: string
  /** Marge blanche autour de l'image, s'il y en a une (la fiche en porte une). */
  passePartout: string
  /** Réglage employé par cette surface. L'aperçu emprunte celui de la fiche : son
   *  cadre lui ressemble, et lui donner un troisième réglage à tenir n'apporterait
   *  rien à personne. */
  reglage: keyof AuteurPhotoPositions
}

/** Géométrie de chaque surface. Toute modification d'un de ces cadres dans le
 *  composant correspondant DOIT être répercutée ici, sans quoi l'écran de cadrage
 *  se remet à mentir. */
export const CADRES_PORTRAIT: Record<SurfacePortrait, CadrePortrait> = {
  // app/bibliotheque/BibliothequeClient.tsx : bandeau `height: 200px`, colonne
  // photo `width: 7.5rem`. La photo est étirée par la rangée, elle fait donc
  // toute la hauteur du bandeau.
  carte: { libelle: 'Carte de la bibliothèque', largeur: '7.5rem', hauteur: '200px', passePartout: '0', reglage: 'carte' },
  // app/components/ModaleAuteur.tsx : cadre 6.5rem × 130px, `padding: 5px`.
  fiche: { libelle: 'Fiche de l’auteur', largeur: '6.5rem', hauteur: '130px', passePartout: '5px', reglage: 'fiche' },
}

function normaliser(pos: Partial<AuteurPhotoPos> | null | undefined, defaut: AuteurPhotoPos): AuteurPhotoPos {
  return {
    x: typeof pos?.x === 'number' ? pos.x : defaut.x,
    y: typeof pos?.y === 'number' ? pos.y : defaut.y,
    scale: typeof pos?.scale === 'number' ? pos.scale : defaut.scale,
  }
}

/** Lit la colonne `auteurs.photo_position`, sous toutes ses formes.
 *  ⚠️ L'ancienne forme est PLATE (`{x, y, scale}`), d'un temps où l'on croyait
 *  qu'un seul réglage suffisait. On la reprend pour les deux surfaces : c'est ce
 *  que l'auteur avait réglé, mieux vaut cela qu'un défaut. */
export function parseAuteurPhotoPositions(raw: unknown): AuteurPhotoPositions {
  const r = raw as { x?: unknown; carte?: unknown; fiche?: unknown } | null | undefined
  if (!r) return { carte: { ...POS_CARTE_DEFAUT }, fiche: { ...POS_FICHE_DEFAUT } }
  if (typeof r.x === 'number') {
    const plat = normaliser(r as Partial<AuteurPhotoPos>, POS_CARTE_DEFAUT)
    return { carte: plat, fiche: { ...plat } }
  }
  return {
    carte: normaliser(r.carte as Partial<AuteurPhotoPos>, POS_CARTE_DEFAUT),
    fiche: normaliser(r.fiche as Partial<AuteurPhotoPos>, POS_FICHE_DEFAUT),
  }
}

/** Le style de l'image dans son cadre. `transformOrigin` suit le point visé, sans
 *  quoi l'agrandissement chasserait le cadrage hors du cadre. */
export function stylePhotoAuteur(pos: AuteurPhotoPos) {
  return {
    objectFit: 'cover' as const,
    objectPosition: `${pos.x}% ${pos.y}%`,
    transform: `scale(${pos.scale})`,
    transformOrigin: `${pos.x}% ${pos.y}%`,
  }
}

/** Borne un réglage dans ses limites : le point reste dans l'image, le zoom dans
 *  sa plage. Employé par le glissé comme par la molette. */
export function bornerPos(pos: AuteurPhotoPos): AuteurPhotoPos {
  return {
    x: Math.max(0, Math.min(100, pos.x)),
    y: Math.max(0, Math.min(100, pos.y)),
    scale: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, pos.scale)),
  }
}

/** Déplacement du cadrage pour un glissé de `dx`/`dy` pixels dans un cadre de
 *  `largeur`/`hauteur` pixels. Fonction pure : c'est elle qui porte la sensibilité,
 *  et non le composant, de sorte qu'elle se teste.
 *
 *  On tire l'IMAGE, donc le point visé se déplace en sens inverse ; et plus le zoom
 *  est fort, plus un pixel à l'écran vaut peu de pourcentage d'image. */
export function deplacerPos(base: AuteurPhotoPos, dx: number, dy: number, largeur: number, hauteur: number): AuteurPhotoPos {
  const zoom = Math.max(base.scale, 1)
  if (largeur <= 0 || hauteur <= 0) return base
  return bornerPos({
    ...base,
    x: base.x - (dx * 100) / (largeur * zoom),
    y: base.y - (dy * 100) / (hauteur * zoom),
  })
}

/** URL publique du portrait. Une seule composition pour tout le site : le portrait
 *  vit dans le seau `auteurs`, sous `<id_auteur>.jpg` (voir AGENTS.md). */
export function urlPortrait(baseSupabase: string, idAuteur: string, versionCache?: number): string {
  const v = versionCache === undefined ? '' : `?v=${versionCache}`
  return `${baseSupabase}/storage/v1/object/public/auteurs/${idAuteur}.jpg${v}`
}
