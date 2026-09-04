/**
 * OÙ LE LECTEUR EN ÉTAIT — la reprise de lecture des deux pages bibliques.
 *
 * Deux pages lisent la Bible, et chacune retient sa propre place : la Bible
 * classique depuis longtemps (`BibleLayout`, pour la carte de reprise de
 * l'accueil et pour le rendu serveur), la Polyglotte depuis le 4 septembre 2026,
 * à la demande de l'auteur : « supprimer le dessin et afficher soit le dernier
 * emplacement de lecture de l'utilisateur (il faut donc l'enregistrer) soit la
 * Genèse ».
 *
 * ⛔ LES DEUX CLÉS SE LISENT ET S'ÉCRIVENT ICI, ET NULLE PART AILLEURS. La
 * première (`cs_dernier_bible`) était posée à la main dans `BibleLayout` et lue à
 * la main dans `AccueilCards` : deux écritures d'une même forme, dont l'une
 * n'aurait pas suivi l'autre au premier champ ajouté.
 *
 * ⚠️ LA POLYGLOTTE RETOMBE SUR LA CLASSIQUE avant de retomber sur la Genèse. Le
 * lecteur n'a qu'une lecture en cours, même s'il la mène sur deux pages : la
 * première visite de la Polyglotte s'ouvre donc là où il lisait, et non sur un
 * livre choisi pour lui. La Genèse ne sert que le tout premier passage.
 *
 * ⛔ ON NE RETIENT JAMAIS « LE LIVRE ENTIER ». C'est un geste explicite et coûteux
 * — les Psaumes entiers sur quatre colonnes —, et une ouverture de page doit être
 * brève. Un livre entier laissé à la dernière visite rouvre à son premier
 * chapitre.
 *
 * ⚠️ Le cœur est PUR (`ouvertureDepuis`, les deux lecteurs) et se prouve sans
 * navigateur ; seules les trois fonctions qui touchent `localStorage` ne le sont
 * pas. Elles n'y écrivent qu'en tolérant le refus : un stockage fermé ne doit
 * jamais empêcher de lire.
 */

/** La place retenue par la Bible classique. Lue aussi par la carte de reprise de
 *  l'accueil (`AccueilCards`) : ⛔ ne pas changer la forme sans elle. */
export const CLE_BIBLE = 'cs_dernier_bible'

/** La place retenue par la Polyglotte. */
export const CLE_POLYGLOTTE = 'cs_derniere_polyglotte'

/** À défaut de tout, on ouvre au commencement. */
export const LIVRE_PAR_DEFAUT = 'GEN'

/** Le plus grand numéro de chapitre du canon est 150 (les Psaumes) ; la borne est
 *  large à dessein — elle écarte une valeur absurde, elle ne juge pas le canon. */
const CHAPITRE_MAX = 400

export type PositionBible = {
  livre: string
  chapitre: number
  /** La bible qu'on lisait, pour la rouvrir dans la même. */
  trad: string
  /** Le nom du livre tel que la page l'affichait, pour l'écrire sans le rechercher. */
  nomLivre: string
}

export type PositionPolyglotte = {
  livre: string
  chapitre: number
}

/** Un code de livre plausible : trois à cinq signes, capitales et chiffres. Le
 *  seul contrôle qui vaille est celui de l'appelant, qui a la liste ; celui-ci
 *  n'écarte qu'une valeur qui n'a jamais pu être un code. */
function codeLivrePlausible(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Z0-9]{2,6}$/.test(v)
}

function chapitrePlausible(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= CHAPITRE_MAX
}

/** Relit ce que la Bible classique a écrit. `null` sur tout ce qui n'est pas une
 *  position complète : une forme à moitié reconnue vaut moins que rien. */
export function positionBibleDepuis(brut: unknown): PositionBible | null {
  if (!brut || typeof brut !== 'object') return null
  const o = brut as Record<string, unknown>
  if (!codeLivrePlausible(o.livre) || !chapitrePlausible(o.chapitre)) return null
  return {
    livre: o.livre,
    chapitre: o.chapitre,
    trad: typeof o.trad === 'string' ? o.trad : '',
    nomLivre: typeof o.nomLivre === 'string' ? o.nomLivre : '',
  }
}

/** Relit ce que la Polyglotte a écrit. */
export function positionPolyglotteDepuis(brut: unknown): PositionPolyglotte | null {
  if (!brut || typeof brut !== 'object') return null
  const o = brut as Record<string, unknown>
  if (!codeLivrePlausible(o.livre) || !chapitrePlausible(o.chapitre)) return null
  return { livre: o.livre, chapitre: o.chapitre }
}

/**
 * Où ouvrir la Polyglotte, dans l'ordre : sa propre place, celle de la Bible
 * classique, la Genèse. ⛔ Elle rend TOUJOURS une position : la page n'a plus
 * d'écran vide où attendre un choix.
 */
export function ouvertureDepuis(brutPolyglotte: unknown, brutBible: unknown): PositionPolyglotte {
  const sienne = positionPolyglotteDepuis(brutPolyglotte)
  if (sienne) return sienne
  const classique = positionBibleDepuis(brutBible)
  if (classique) return { livre: classique.livre, chapitre: classique.chapitre }
  return { livre: LIVRE_PAR_DEFAUT, chapitre: 1 }
}

// ── Ce qui touche le stockage ────────────────────────────────────────────────
// ⚠️ Aucune de ces trois fonctions ne s'appelle au rendu serveur : `localStorage`
// n'y existe pas, et une position lue au rendu ferait diverger l'hydratation.

function lireJson(cle: string): unknown {
  try {
    const brut = window.localStorage.getItem(cle)
    return brut ? JSON.parse(brut) : null
  } catch {
    return null
  }
}

function ecrireJson(cle: string, valeur: unknown): void {
  try {
    window.localStorage.setItem(cle, JSON.stringify(valeur))
  } catch {
    /* stockage indisponible : on lit sans retenir, ce qui est le pire acceptable */
  }
}

/** La Bible classique retient sa place. */
export function retenirPositionBible(position: PositionBible): void {
  ecrireJson(CLE_BIBLE, position)
}

/** La carte de reprise de l'accueil. */
export function lirePositionBible(): PositionBible | null {
  return positionBibleDepuis(lireJson(CLE_BIBLE))
}

/** La Polyglotte retient sa place. ⛔ Un livre entier (`chapitre` nul) se retient
 *  à son premier chapitre : voir l'en-tête. */
export function retenirPositionPolyglotte(livre: string, chapitre: number | null): void {
  if (!codeLivrePlausible(livre)) return
  ecrireJson(CLE_POLYGLOTTE, { livre, chapitre: chapitrePlausible(chapitre) ? chapitre : 1 })
}

/** Où la Polyglotte s'ouvre. */
export function ouvertureDeLaPolyglotte(): PositionPolyglotte {
  return ouvertureDepuis(lireJson(CLE_POLYGLOTTE), lireJson(CLE_BIBLE))
}
