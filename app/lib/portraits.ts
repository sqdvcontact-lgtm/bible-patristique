// Le PORTRAIT d'un lecteur : une référence, jamais une adresse.
//
// ⛔ La page du compte écrivait dans `profils.avatar_url` une URL COMPLÈTE, envoyée
// par le navigateur. La politique de sécurité borne la LIGNE qu'un lecteur peut
// modifier, pas la VALEUR qu'il y écrit : n'importe quelle adresse extérieure y
// passait, et la page publique la servait ensuite à tous ses visiteurs, qui allaient
// donc chercher une image sur un serveur tiers sans le savoir.
//
// On ne retient donc plus qu'une RÉFÉRENCE — « auteur:A0010 », « traduction:TR0002 » —
// et l'adresse se fabrique à la lecture. Le format est en outre borné en base par une
// contrainte, ce qui ferme la porte du côté où elle devait l'être.
//
// ⚠️ Un second bénéfice, moins visible : une référence survit à un déplacement de
// seau ou à un changement de domaine, là où une URL figée dans six lignes de table
// aurait été à réécrire.

/** Les deux familles d'illustrations que le corpus porte déjà. */
export type FamillePortrait = 'auteur' | 'traduction'

export const SEAU_AUTEURS = 'auteurs'
export const SEAU_TRADUCTIONS = 'traductions'

// ⚠️ Le MÊME motif que la contrainte posée en base. Les deux doivent rester d'accord :
// celui-ci écarte poliment, celle-là refuse.
const MOTIF_REF = /^(auteur|traduction):[A-Za-z0-9_-]{1,40}$/

export function refPortraitValide(ref: string | null | undefined): ref is string {
  return typeof ref === 'string' && MOTIF_REF.test(ref)
}

export function familleDeRef(ref: string): FamillePortrait | null {
  if (!refPortraitValide(ref)) return null
  return ref.startsWith('auteur:') ? 'auteur' : 'traduction'
}

export function identifiantDeRef(ref: string): string | null {
  if (!refPortraitValide(ref)) return null
  return ref.slice(ref.indexOf(':') + 1)
}

export function refPortrait(famille: FamillePortrait, identifiant: string): string {
  return `${famille}:${identifiant}`
}

/** Le fichier d'une référence, dans son seau.
 *
 *  ⛔ Un portrait de traducteur prend l'ENCART, jamais le bandeau. La charte § 37 le
 *  dit pour la notice de traduction, et la raison vaut ici plus encore : le bandeau
 *  est couché, il ne donnerait dans un rond qu'une bande de ciel. Les traductions
 *  sans encart ne sont donc pas proposées du tout. */
export function cheminPortrait(ref: string): { seau: string; fichier: string } | null {
  const famille = familleDeRef(ref)
  const identifiant = identifiantDeRef(ref)
  if (!famille || !identifiant) return null
  return famille === 'auteur'
    ? { seau: SEAU_AUTEURS, fichier: `${identifiant}.jpg` }
    : { seau: SEAU_TRADUCTIONS, fichier: `${identifiant}-encart.jpg` }
}

/** Le nom de fichier d'un encart de traduction, tel qu'il paraît dans le seau. */
export function estEncartTraduction(nom: string): boolean {
  return /^TR[0-9A-Za-z_-]+-encart\.jpg$/i.test(nom)
}

/** L'identifiant d'une traduction, tiré du nom de son encart. */
export function traductionDeLEncart(nom: string): string | null {
  const m = nom.match(/^(TR[0-9A-Za-z_-]+)-encart\.jpg$/i)
  return m ? m[1] : null
}

/** L'identifiant d'un auteur, tiré du nom de son portrait. */
export function auteurDuPortrait(nom: string): string | null {
  const m = nom.match(/^(A[0-9]{3,6})\.jpg$/i)
  return m ? m[1] : null
}

/** L'adresse publique d'un portrait. Rend null si la référence ne vaut rien : une
 *  référence illisible ne doit jamais devenir une adresse à moitié formée. */
export function urlPortrait(ref: string | null | undefined, base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''): string | null {
  if (!refPortraitValide(ref) || !base) return null
  const chemin = cheminPortrait(ref)
  if (!chemin) return null
  return `${base}/storage/v1/object/public/${chemin.seau}/${chemin.fichier}`
}

// ── Le cadrage ───────────────────────────────────────────────────────────────

export type Cadrage = { posX: number; posY: number; zoom: number }

/** Le cadrage retenu quand personne n'a rien réglé. Le haut de l'image plutôt que
 *  son milieu : sur un portrait en pied, le milieu tombe sur la ceinture. */
export const CADRAGE_PAR_DEFAUT: Cadrage = { posX: 50, posY: 20, zoom: 1 }

/** Le zoom que le curseur du profil sait rendre. Un cadrage d'administration monte
 *  jusqu'à 3,5 : repris tel quel, il sortirait de la course du curseur, et le lecteur
 *  ne pourrait plus revenir en arrière. */
export const ZOOM_MIN = 1
export const ZOOM_MAX = 1.8

/** Le cadrage de départ d'un portrait d'auteur, repris de celui que l'administration
 *  a déjà réglé pour sa fiche.
 *
 *  ⚠️ On prend « fiche » et non « carte » : la fiche est en 0,80 de proportion, la
 *  carte en 0,60, et le rond du profil est carré. C'est la fiche qui en est la plus
 *  proche, donc celle dont le point d'intérêt tombe le mieux. Personne n'a à recadrer
 *  ce qui l'a déjà été. */
export function cadrageDepuisPhotoPosition(position: unknown): Cadrage {
  const pos = position as { fiche?: { x?: number; y?: number; scale?: number }; carte?: { x?: number; y?: number; scale?: number } } | null
  const source = pos?.fiche ?? pos?.carte
  if (!source || typeof source.x !== 'number' || typeof source.y !== 'number') return CADRAGE_PAR_DEFAUT
  return {
    posX: Math.max(0, Math.min(100, source.x)),
    posY: Math.max(0, Math.min(100, source.y)),
    zoom: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, typeof source.scale === 'number' ? source.scale : 1)),
  }
}
