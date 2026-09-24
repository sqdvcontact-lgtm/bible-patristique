// Cadrage des portraits d'auteur. Module PUR, testé dans photoAuteur.test.ts.
//
// Un portrait paraît sur DEUX surfaces, la carte de la bibliothèque et la fiche de
// l'auteur, dont les cadres n'ont ni la même taille ni les mêmes proportions (0,60 et
// 2/3). Un cadrage juste sur l'une ne l'est pas sur l'autre : c'est pourquoi
// `photo_position` porte deux réglages, `carte` et `fiche`, et non un seul. Les ronds
// des lecteurs reprennent le réglage `fiche` (app/lib/portraits.ts).
//
// ⛔ Ce module est la SEULE définition de cette géométrie, de l'ADRESSE d'un portrait
// et de ses initiales de repli. La carte et la fiche en portaient chacune une copie,
// avec des défauts différents, et la fiche composait son adresse sans version
// (audit du 24 septembre 2026). `photoAuteur.test.ts` refuse qu'une adresse du seau
// soit écrite ailleurs.

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
  /** Mesures EXACTES de la ZONE D'IMAGE du composant réel, à l'unité près :
   *  passe-partout NON compris, c'est la zone que le cadrage vise. */
  largeur: string
  hauteur: string
  /** Marge blanche autour de l'image, s'il y en a une (la fiche en porte une). */
  passePartout: string
  /** Réglage employé par cette surface. Les ronds des lecteurs empruntent celui de la
   *  fiche (app/lib/portraits.ts), dont le cadre est le plus proche du carré. */
  reglage: keyof AuteurPhotoPositions
}

/** Géométrie de chaque surface. Toute modification d'un de ces cadres dans le
 *  composant correspondant DOIT être répercutée ici, sans quoi l'écran de cadrage
 *  se remet à mentir. */
export const CADRES_PORTRAIT: Record<SurfacePortrait, CadrePortrait> = {
  // app/bibliotheque/BibliothequeClient.tsx : bandeau `height: 12.5rem`, colonne
  // photo `width: 7.5rem`. La photo est étirée par la rangée, elle fait donc
  // toute la hauteur du bandeau. ⛔ Les deux mesures en REM : la proportion (0,60)
  // est la même sur tous les écrans, et le cadrage réglé ici vaut partout. La hauteur
  // était en pixels jusqu'au 2026-09-24, et la carte passait de 0,60 à 0,825.
  carte: { libelle: 'Carte de la bibliothèque', largeur: '7.5rem', hauteur: '12.5rem', passePartout: '0', reglage: 'carte' },
  // app/components/FicheModele.tsx (`PortraitFiche`) : zone d'image de 8,75 rem au
  // rapport 2/3, sous un passe-partout de 5 px. C'est le cadre des fiches d'auteur et de
  // traduction depuis le 15 septembre 2026 (« uniformiser toutes ces fenêtres ») : la
  // fiche d'auteur prenait 128 × 200 px posés, celle d'une traduction 8,75 rem, et sur un
  // grand écran la seconde était moitié plus grande que la première.
  // ⚠️ En rem, et non plus en pixels : la prose qu'il accompagne suit la police racine.
  // ⛔ `globals.css` (`.cs-fiche-portrait-fenetre`) écrit la même mesure, et
  // `ficheModele.test.ts` confronte les deux écritures.
  fiche: { libelle: 'Fiche de l’auteur', largeur: '8.75rem', hauteur: '13.125rem', passePartout: '5px', reglage: 'fiche' },
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

/** Le seau des portraits SERVIS : 800 × 1000 au plus. Depuis le 2026-09-24, ils sont
 *  refaits depuis leurs sources Midjourney (ou retravaillés quand il n'y en a pas) ;
 *  ce qui avait été déposé vit dans le seau privé des originaux, et le dépôt y écrit
 *  aussi. */
export const SEAU_PORTRAITS_AUTEURS = 'auteurs'
/** Le seau PRIVÉ des originaux : les fichiers tels qu'ils avaient été déposés. Rien ne
 *  s'y lit depuis une page. */
export const SEAU_ORIGINAUX_AUTEURS = 'auteurs-originaux'
/** Le seau des VIGNETTES : copies réduites (280 × 350 au plus, même proportion, donc
 *  même cadrage), pour les petits ronds. Fabriquées au dépôt, jamais à la main. */
export const SEAU_VIGNETTES_AUTEURS = 'auteurs-vignettes'

/** Adresse publique d'un fichier de portrait. `version` est `auteurs.photo_version` :
 *  l'instant du dernier dépôt. L'adresse reste donc STABLE tant que le fichier ne
 *  change pas (le navigateur la garde en cache), et devient neuve dès qu'il change. */
function adresse(seau: string, idAuteur: string, version: number | null | undefined, base: string): string {
  const v = typeof version === 'number' && Number.isFinite(version) ? `?v=${version}` : ''
  return `${base}/storage/v1/object/public/${seau}/${idAuteur}.jpg${v}`
}

export function urlPortraitAuteur(idAuteur: string, version?: number | null, base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''): string {
  return adresse(SEAU_PORTRAITS_AUTEURS, idAuteur, version, base)
}

export function urlVignetteAuteur(idAuteur: string, version?: number | null, base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''): string {
  return adresse(SEAU_VIGNETTES_AUTEURS, idAuteur, version, base)
}

/** Ce qui ne compte pas dans les initiales d'un nom : les particules et les liaisons. */
const MOTS_MUETS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'von', 'van', 'di', 'da'])

/** Les deux initiales qui tiennent lieu de portrait : « Victorin de Poetovio » donne
 *  « VP », « Augustin d’Hippone » « AH », « Anonyme / Conciles… » « AC ». Les particules,
 *  les élisions (d’, l’) et les signes ne comptent pas. */
export function initialesDuNom(nom: string): string {
  return nom
    .split(/[\s/,;:()–—-]+/)
    .map(m => m.replace(/^[dl][’']/i, ''))
    .filter(m => m && !MOTS_MUETS.has(m.toLowerCase()))
    .map(m => (m.match(/\p{L}/u) ?? [''])[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
