/**
 * LES CITATIONS FAVORITES — une de l'Écriture, une des Pères
 *
 * ⛔ UNE PAR CORPUS (décision de l'auteur, 2026-09-14 : « Sur Ma page, n'afficher que les
 * citations favorites, une Bible, une Pères »). Le lecteur en portait une seule, toutes
 * natures confondues, dans `profils.citation_preferee`. Il en porte désormais une dans
 * chaque colonne, `citation_favorite_biblique` et `citation_favorite_patristique`, et en
 * choisir une de l'Écriture ne touche plus à celle des Pères.
 *
 * Module PUR, ni React ni Supabase. Il porte ce que « Mes citations » ÉCRIT
 * (`favoritePourEcriture`), et ce que l'API LIT puis COMPOSE pour la page publique
 * (`lireFavorite`, `composerFavorites`). Ce que la page MONTRE d'un passage vit avec son
 * rendu, dans `app/profil/[pseudo]/CitationsFavorites.tsx`.
 */

import { ABREV_FR } from './bible'
import { formaterPlageCanonique } from './referencesBibliques'
import { sansAppelsDeNote } from './appelsDeNote'
import { lieuDuPrelevement } from './lieuPrelevement'

export type TypeCitation = 'biblique' | 'patristique'

/**
 * Ce qu'une colonne de `profils` garde d'une citation favorite : le passage tel que le
 * lecteur l'a lu en le choisissant.
 *
 * ⚠️ Le TEXTE est une copie, et c'est voulu : un verset choisi se lit dans la traduction
 * où on l'a choisi, et des segments réunis gardent leur « […] ». Tout le reste, la
 * référence, l'œuvre, le lien et le droit de paraître, se RELIT dans les prélèvements au
 * moment de servir la page (`composerFavorites`).
 */
export type CitationPreferee = {
  /** Le premier prélèvement du passage : c'est lui qui désigne le choix. */
  id: string
  /** Tous les prélèvements réunis dans le passage, le premier compris. */
  ids?: string[]
  type: TypeCitation
  texte: string
  /** « Gn 25, 1–3 » : la référence que montre la fenêtre de remplacement. */
  ref?: string
  /** La traduction où le lecteur lisait le verset quand il l'a choisi. */
  traduction?: string
  auteur?: string
  titre_oeuvre?: string
}

/** La colonne de `profils` qui porte la favorite de chaque corpus. */
export const COLONNE_FAVORITE = {
  biblique: 'citation_favorite_biblique',
  patristique: 'citation_favorite_patristique',
} as const satisfies Record<TypeCitation, string>

/** Ce qu'une favorite garde au plus de son texte. La page publique n'en montre jamais
 *  autant, et un profil n'est pas un dépôt de données : la base borne la ligne entière. */
export const LONGUEUR_MAX_TEXTE = 2000

/** Ce qu'une favorite réunit au plus de prélèvements. */
export const PRELEVEMENTS_MAX = 200

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const estUuid = (x: unknown): x is string => typeof x === 'string' && UUID.test(x)

/** Les blancs ASCII seuls se resserrent : une insécable ou une fine dit quelque chose. */
const BLANCS = /[ \t\r\n]+/g

function chaine(x: unknown, max: number): string | undefined {
  if (typeof x !== 'string') return undefined
  const t = x.replace(BLANCS, ' ').trim()
  return t ? t.slice(0, max) : undefined
}

/**
 * Un texte coupé au dernier mot entier avant `max`, sans ponctuation pendante.
 *
 * ⚠️ On ne coupe qu'à une espace ORDINAIRE : une insécable ou une fine lie deux signes
 * qu'on ne sépare pas. Faute d'espace dans les deux derniers cinquièmes, la coupe tombe
 * au signe près plutôt que de laisser un moignon.
 */
export function couperAuMot(texte: string, max: number): string {
  if (texte.length <= max) return texte
  // Le signe qui SUIT la coupe compte : une espace à cet endroit dit que le dernier mot
  // tient entier.
  const tete = texte.slice(0, max + 1)
  const blanc = Math.max(tete.lastIndexOf(' '), tete.lastIndexOf('\n'))
  const coupe = blanc >= max * 0.6 ? texte.slice(0, blanc) : texte.slice(0, max)
  return coupe.replace(/[\s,;:.·—–-]+$/u, '')
}

/** La favorite telle que « Mes citations » l'écrit : prélèvements dédoublonnés et bornés,
 *  texte borné au dernier mot entier. */
export function favoritePourEcriture(pref: CitationPreferee): CitationPreferee {
  const ids = [...new Set([pref.id, ...(pref.ids ?? [])])].filter(estUuid).slice(0, PRELEVEMENTS_MAX)
  const texte = pref.texte.length > LONGUEUR_MAX_TEXTE
    ? `${couperAuMot(pref.texte, LONGUEUR_MAX_TEXTE)}…`
    : pref.texte
  const propre: CitationPreferee = { id: pref.id, ids, type: pref.type, texte }
  const ref = chaine(pref.ref, 120)
  const traduction = chaine(pref.traduction, 200)
  const auteur = chaine(pref.auteur, 200)
  const titre = chaine(pref.titre_oeuvre, 300)
  if (ref) propre.ref = ref
  if (traduction) propre.traduction = traduction
  if (auteur) propre.auteur = auteur
  if (titre) propre.titre_oeuvre = titre
  return propre
}

/**
 * Lit la valeur d'une colonne de favorite. Le lecteur l'écrit lui-même : tout ce qui n'a
 * pas la forme attendue vaut « aucune favorite ».
 */
export function lireFavorite(valeur: unknown, type: TypeCitation): CitationPreferee | null {
  if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) return null
  const v = valeur as Record<string, unknown>
  if (v.type !== type || !estUuid(v.id) || typeof v.texte !== 'string' || !v.texte.trim()) return null
  const autres = Array.isArray(v.ids) ? v.ids.filter(estUuid) : []
  const lue: CitationPreferee = {
    id: v.id,
    ids: [...new Set([v.id, ...autres])].slice(0, PRELEVEMENTS_MAX),
    type,
    texte: v.texte,
  }
  const ref = chaine(v.ref, 120)
  const traduction = chaine(v.traduction, 200)
  const auteur = chaine(v.auteur, 200)
  const titre = chaine(v.titre_oeuvre, 300)
  if (ref) lue.ref = ref
  if (traduction) lue.traduction = traduction
  if (auteur) lue.auteur = auteur
  if (titre) lue.titre_oeuvre = titre
  return lue
}

/** Les colonnes de `prelevements` que la composition relit. */
export const COLONNES_PRELEVEMENT_FAVORITE =
  'id, type, ref_livre_abr, ref_chapitre, ref_verset, traduction, auteur, titre_oeuvre, id_oeuvre, id_texte, segment_numero, ref_niv1, ref_niv2'

/** Une ligne de `prelevements`, telle que `COLONNES_PRELEVEMENT_FAVORITE` la demande. */
export type PrelevementDeFavorite = {
  id: string
  type: string
  ref_livre_abr: string | null
  ref_chapitre: number | null
  ref_verset: number | null
  traduction: string | null
  auteur: string | null
  titre_oeuvre: string | null
  id_oeuvre: string | null
  /** Le TEXTE du passage : une œuvre en porte plusieurs, et leurs numéros de segment se
   *  recouvrent. Vide sur un prélèvement ancien. */
  id_texte: string | null
  segment_numero: number | null
  ref_niv1: string | null
  ref_niv2: string | null
}

/** Une favorite telle que la page publique la reçoit : rien n'y reste à composer. */
export type CitationFavoritePublique = {
  type: TypeCitation
  /** Le passage, tel que le lecteur l'a choisi. */
  texte: string
  /** Ce qui désigne le passage : « Jean 3, 16 », ou le nom du Père. */
  reference: string
  /** D'où il vient : la traduction d'un verset, l'œuvre d'un Père. */
  source: string | null
  /** Où, dans l'œuvre : « Livre premier, I ». Rien pour un verset. */
  lieu: string | null
  /** La page où le passage se lit, quand elle est ouverte. */
  lien: string | null
}

/** L'inverse d'ABREV_FR : un prélèvement ne garde que l'abréviation, la page Bible ne
 *  connaît que le code. */
const CODE_PAR_ABREV: Record<string, string> = Object.fromEntries(
  Object.entries(ABREV_FR).map(([code, abrev]) => [abrev, code]),
)

/** Tous les prélèvements qu'il faut relire pour servir les favorites. */
export function prelevementsDesFavorites(favorites: readonly (CitationPreferee | null)[]): string[] {
  return [...new Set(favorites.flatMap(f => (f ? f.ids ?? [f.id] : [])))]
}

/** Les œuvres dont il faut savoir si elles sont ouvertes à la lecture. */
export function oeuvresDesFavorites(lignes: readonly PrelevementDeFavorite[]): string[] {
  return [...new Set(
    lignes.filter(l => l.type === 'patristique' && l.id_oeuvre).map(l => l.id_oeuvre as string),
  )]
}

/** Les textes dont il faut savoir s'ils sont ouverts, et lequel est celui par défaut. */
export function textesDesFavorites(lignes: readonly PrelevementDeFavorite[]): string[] {
  return [...new Set(
    lignes.filter(l => l.type === 'patristique' && l.id_texte).map(l => l.id_texte as string),
  )]
}

/** Ce qu'une favorite des Pères doit savoir du texte qu'elle cite. */
export type TexteCite = { is_default: boolean | null; is_public: boolean | null }

/** Un intitulé copié d'un segment peut garder ses appels de note : ils ne voyagent pas. */
function nette(s: string | null | undefined): string {
  return s ? sansAppelsDeNote(s).replace(BLANCS, ' ').trim() : ''
}

function composerBiblique(
  fav: CitationPreferee,
  lignes: readonly PrelevementDeFavorite[],
): CitationFavoritePublique | null {
  const ids = new Set(fav.ids ?? [fav.id])
  const miennes = lignes.filter(l => l.type === 'biblique' && ids.has(l.id))
  const tete = miennes.find(l => l.id === fav.id)
  // ⛔ Sans le prélèvement qui la désigne, la favorite ne paraît pas : « Mes citations »
  // ne la montrerait plus comme choisie, et le lecteur ne pourrait pas la retirer.
  if (!tete) return null
  const abrev = tete.ref_livre_abr ?? ''
  const code = CODE_PAR_ABREV[abrev]
  const places = miennes
    .filter(l => l.ref_livre_abr === abrev && l.ref_chapitre != null)
    .sort((a, b) => ((a.ref_chapitre ?? 0) - (b.ref_chapitre ?? 0)) || ((a.ref_verset ?? 0) - (b.ref_verset ?? 0)))
  const premier = places[0] ?? tete
  const dernier = places[places.length - 1] ?? tete
  const point = (l: PrelevementDeFavorite) =>
    [code, l.ref_chapitre, l.ref_verset].filter(v => v != null).join('.')
  // La référence se compose par la règle du site, le Psautier au singulier compris.
  const reference = code && premier.ref_chapitre != null
    ? formaterPlageCanonique(point(premier), point(dernier))
    : fav.ref ?? ''
  // La traduction où le lecteur lisait. À défaut, celle du prélèvement, sauf quand elle
  // n'en garde que le code : « TR0003 » ne se lit pas.
  const source = fav.traduction
    ?? (tete.traduction && !/^TR\d+$/.test(tete.traduction) ? nette(tete.traduction) || null : null)
  const lien = code && premier.ref_chapitre != null
    ? `/?livre=${code}&chapitre=${premier.ref_chapitre}${premier.ref_verset != null ? `&verset=${premier.ref_verset}` : ''}`
    : null
  return { type: 'biblique', texte: fav.texte, reference, source, lieu: null, lien }
}

function composerPatristique(
  fav: CitationPreferee,
  lignes: readonly PrelevementDeFavorite[],
  publiees: ReadonlySet<string>,
  textes: ReadonlyMap<string, TexteCite>,
): CitationFavoritePublique | null {
  const ids = new Set(fav.ids ?? [fav.id])
  const tete = lignes.find(l => l.id === fav.id && l.type === 'patristique')
  if (!tete) return null
  // ⛔ Le titre d'une œuvre retirée de la lecture ne paraît pas, ni son texte : c'est la
  // garde de la bibliothèque du même profil (charte § 40.12).
  if (!tete.id_oeuvre || !publiees.has(tete.id_oeuvre)) return null
  // ⛔ UN TEXTE EST UNE ÉDITION À PART ENTIÈRE (charte § 5.5.1) : retiré de la lecture, il
  // ne paraît pas, et un texte qu'on n'a pas pu lire ferme la porte plutôt que de l'ouvrir.
  // Un prélèvement ancien, qui ne retient pas son texte, garde l'adresse de l'œuvre.
  const texte = tete.id_texte ? textes.get(tete.id_texte) : undefined
  if (tete.id_texte && texte?.is_public !== true) return null
  const premier = lignes
    .filter(l => l.type === 'patristique' && ids.has(l.id) && l.id_oeuvre === tete.id_oeuvre && l.id_texte === tete.id_texte)
    .sort((a, b) => (a.segment_numero ?? 0) - (b.segment_numero ?? 0))[0] ?? tete
  // ⚠️ Un lieu localise, il ne résume pas : la règle est celle de « Mes citations »
  // (`lieuPrelevement.ts`), qui tait un intitulé de niveau devenu sommaire.
  const lieu = lieuDuPrelevement(undefined, { n1: premier.ref_niv1, n2: premier.ref_niv2 })
  return {
    type: 'patristique',
    texte: fav.texte,
    reference: nette(tete.auteur) || fav.auteur || '',
    source: nette(tete.titre_oeuvre) || fav.titre_oeuvre || null,
    lieu: lieu || null,
    // ⚠️ Hors du texte par défaut, le lien porte `texte=` : la page ouvrirait sinon l'autre
    // édition, et le même numéro de segment y désigne un autre passage.
    lien: `/oeuvre/${encodeURIComponent(tete.id_oeuvre)}${tete.id_texte && texte?.is_default !== true ? `?texte=${encodeURIComponent(tete.id_texte)}` : ''}${premier.segment_numero ? `#s${premier.segment_numero}` : ''}`,
  }
}

/**
 * Les favorites telles que la page publique les montre : l'Écriture d'abord, les Pères
 * ensuite, et seulement celles qui peuvent paraître.
 */
export function composerFavorites(
  favorites: readonly (CitationPreferee | null)[],
  lignes: readonly PrelevementDeFavorite[],
  oeuvresPubliees: ReadonlySet<string>,
  /** L'état des textes cités (`textesDesFavorites`). ⚠️ Sans elle, une favorite qui retient
   *  son texte ne paraît pas : la porte se ferme d'elle-même. */
  textes: ReadonlyMap<string, TexteCite> = new Map(),
): CitationFavoritePublique[] {
  const ordre: TypeCitation[] = ['biblique', 'patristique']
  return ordre.flatMap(type => {
    const fav = favorites.find(f => f?.type === type)
    if (!fav) return []
    const composee = type === 'biblique'
      ? composerBiblique(fav, lignes)
      : composerPatristique(fav, lignes, oeuvresPubliees, textes)
    return composee ? [composee] : []
  })
}
