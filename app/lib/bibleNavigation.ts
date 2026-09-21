/**
 * L'URL de lecture de la page Bible, en un seul endroit.
 *
 * Elle était composée à la main en six endroits, dans trois fichiers. C'est
 * ainsi que la lecture « Latin & Français » se perdait : le volet des livres
 * reconstruisait l'adresse sans reporter le mode, et changer de chapitre
 * ramenait le lecteur à une colonne sans qu'il l'ait demandé.
 *
 * Règle : ce qui décrit la MANIÈRE de lire voyage avec le chapitre — le mode,
 * la graphie, la lecture en regard. Ce qui décrit une CIBLE ponctuelle ne
 * voyage pas : viser un verset suppose de pouvoir le désigner, ce que la
 * lecture en regard ne fait pas.
 *
 * Module pur, testé par bibleNavigation.test.ts.
 */

export type CibleLectureBible = {
  livre: string
  chapitre: number
  trad: string
  /** Mode de lecture (`verse`, `paragraph`…) ; omis, la page choisit le premier disponible. */
  mode?: string
  /** Graphie de Bible 899 ; omise, la page reprend la couche par défaut. */
  couche?: string
  /** Verset à désigner. Sa présence exclut la lecture en regard. */
  verset?: number
  /** Lecture « Latin & Français » de l'édition. */
  bilingue?: boolean
  /** Lecture « Texte biblique seul » : l'appareil éditorial de l'édition est écarté. */
  texteSeul?: boolean
  /**
   * Pièce LIMINAIRE de l'édition à lire à la place du chapitre : page de titre,
   * dédicace, avant-propos, introduction générale. Sa clé est celle du premier
   * bloc de la pièce (voir `bibleSommaireEdition.ts`).
   *
   * ⛔ Elle ne voyage PAS d'un chapitre à l'autre : c'est une CIBLE, non une
   * manière de lire, et changer de chapitre en sort. Le livre et le chapitre
   * restent pourtant dans l'adresse, pour que fermer la pièce ramène le lecteur
   * là où il lisait.
   */
  piece?: string | null
}

/**
 * Borne terminale explicitement certifiée pendant le chantier en cours.
 *
 * ⛔ Ne pas généraliser cette table depuis `versets_canon` sans audit du modèle de
 * navigation : certains livres ont des additions ou des découpages éditoriaux
 * distincts de l'axe canonique. Ici, seule la Genèse est dans le périmètre et sa
 * borne 50/50 a été vérifiée directement en base le 2026-09-03.
 */
const DERNIER_CHAPITRE_CERTIFIE: Readonly<Record<string, number>> = Object.freeze({ GEN: 50 })

export function dernierChapitreBible(livre: string): number | null {
  return DERNIER_CHAPITRE_CERTIFIE[livre] ?? null
}

export function chapitreSuivantDisponible(livre: string, chapitre: number): boolean {
  const dernier = dernierChapitreBible(livre)
  return dernier === null || chapitre < dernier
}

/**
 * Ce qui décrit la MANIÈRE de lire, et voyage donc d'un chapitre à l'autre : la
 * graphie, la lecture en regard, le texte nu. Les surfaces qui composent une
 * adresse (volet des livres, flèches de chapitre) le reçoivent d'un bloc et le
 * reportent tel quel, plutôt que d'énumérer les réglages à ne pas oublier — c'est
 * ainsi qu'ils se perdaient un à un.
 */
export type ManiereDeLireBible = Pick<CibleLectureBible, 'couche' | 'bilingue' | 'texteSeul'>

/**
 * Le numéro de chapitre demandé par l'adresse, ramené à un ENTIER d'au moins 1.
 * Pour un livre dont la borne a été explicitement certifiée, le même garde-fou
 * borne aussi le maximum : une flèche terminale ne peut donc jamais fabriquer
 * « Gn 51 » même si un appelant oublie de la désactiver visuellement.
 *
 * ⛔ `parseInt` rend `NaN` sur « abc », et un `NaN` ne se contente pas de mal
 * s'afficher : il descend jusqu'au recalage en phase de rendu de `NavLivres`, dont
 * la comparaison est un `!==`. Or NaN n'est jamais égal à lui-même, la condition
 * est donc vraie à chaque rendu et React coupe la page entière. Une adresse tordue
 * ne doit pas pouvoir sortir le lecteur du site : elle se borne ici, à l'entrée.
 */
export function normaliserChapitreBible(
  valeur: string | null | undefined,
  livre?: string | null,
): number {
  const n = Number.parseInt((valeur ?? '').trim(), 10)
  const minimum = Number.isFinite(n) && n >= 1 ? n : 1
  const dernier = livre ? dernierChapitreBible(livre) : null
  return dernier === null ? minimum : Math.min(minimum, dernier)
}

export function urlLectureBible(cible: CibleLectureBible): string {
  const parametres = new URLSearchParams()
  parametres.set('livre', cible.livre)
  parametres.set('chapitre', String(normaliserChapitreBible(String(cible.chapitre), cible.livre)))
  parametres.set('trad', cible.trad)
  if (cible.mode) parametres.set('mode', cible.mode)
  if (cible.couche) parametres.set('couche', cible.couche)
  if (cible.verset !== undefined) parametres.set('verset', String(cible.verset))
  // Une cible ponctuelle l'emporte sur la manière de lire : on ne reste pas en
  // regard pour montrer un verset qu'on ne saurait pas y désigner.
  if (cible.bilingue && cible.verset === undefined) parametres.set('bilingue', '1')
  // L'appareil éditorial est un axe INDÉPENDANT de ce qu'on lit : il s'écarte
  // d'une colonne comme des deux en regard.
  if (cible.texteSeul) parametres.set('texte', 'seul')
  if (cible.piece) parametres.set('piece', cible.piece)
  return `/?${parametres.toString()}`
}

// ── Une PLAGE de versets dans l'adresse (audit ergonomique du 2026-09-21) ────
// « Mt 5, 3-12 » ouvrait le chapitre sur le seul verset 3. Le paramètre `verset`
// porte désormais une plage, `verset=3-12` : le lecteur la surligne entière et
// défile au premier. ⛔ Un verset unique s'écrit toujours `verset=3`, et tout ce qui
// le lit ailleurs le lit comme avant.

export type PlageVersets = { debut: number; fin: number }

/** « 3 » → 3 à 3 ; « 3-12 » ou « 3–12 » → 3 à 12. Une plage à l'envers ou illisible
 *  ne vaut rien ; une plage d'un seul verset (« 5-5 ») vaut ce verset. */
export function lirePlageVersets(valeur: string | null | undefined): PlageVersets | null {
  const m = (valeur ?? '').trim().match(/^(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?$/)
  if (!m) return null
  const debut = Number(m[1])
  const fin = m[2] != null ? Number(m[2]) : debut
  if (debut < 1 || fin < debut) return null
  return { debut, fin }
}

/** La valeur du paramètre `verset` : « 3 », ou « 3-12 » pour une plage. */
export function ecrirePlageVersets(debut: number, fin?: number | null): string {
  return fin != null && fin > debut ? `${debut}-${fin}` : String(debut)
}

// ── La Polyglotte ouverte sur un verset ──────────────────────────────────────
// Le bouton « Voir dans la Polyglotte » d'une rangée de verset (page Bible) y mène.
// ⛔ Les coordonnées sont celles du CANON : la Polyglotte range ses lignes sur
// l'ossature canonique, non sur la numérotation d'une édition.

const RE_CODE_LIVRE = /^[A-Z0-9]{2,6}$/

export type PlacePolyglotte = { livre: string; chapitre: number; verset: number | null }

export function urlPolyglotte(livre: string, chapitre: number, verset?: number | null): string {
  const parametres = new URLSearchParams()
  parametres.set('livre', livre)
  parametres.set('chapitre', String(chapitre))
  if (verset != null) parametres.set('verset', String(verset))
  return `/polyglotte?${parametres.toString()}`
}

/** Relit l'adresse de la Polyglotte. `null` sans livre plausible : la page retombe
 *  alors sur la reprise de lecture. Un chapitre absurde vaut 1, un verset absurde rien. */
export function placePolyglotteDemandee(recherche: string): PlacePolyglotte | null {
  const p = new URLSearchParams(recherche)
  const livre = p.get('livre')
  if (!livre || !RE_CODE_LIVRE.test(livre)) return null
  const entier = (v: string | null) => {
    const n = Number(v)
    return v !== null && Number.isInteger(n) && n >= 1 && n <= 400 ? n : null
  }
  return { livre, chapitre: entier(p.get('chapitre')) ?? 1, verset: entier(p.get('verset')) }
}

// ── L'état de la Polyglotte dans l'adresse (audit ergonomique 2026-09-21) ────
// Livre, chapitre (ou livre entier) et colonnes affichées : l'adresse désigne ce
// qu'on voit, pour qu'on puisse la partager, la recharger et revenir en arrière.
// ⛔ Les colonnes gardent leur RANG, une colonne vide s'écrivant vide
// (« TR0001,,TR0004 ») : c'est l'ordre du tableau, non un ensemble.

export type EtatPolyglotte = {
  livre: string
  /** `null` : le livre entier. */
  chapitre: number | null
  colonnes: string[]
  verset?: number | null
}

const RE_COLONNE = /^[A-Za-z0-9#_.:-]{1,40}$/

export function urlEtatPolyglotte(etat: EtatPolyglotte): string {
  const parametres = new URLSearchParams()
  parametres.set('livre', etat.livre)
  if (etat.chapitre == null) parametres.set('entier', '1')
  else parametres.set('chapitre', String(etat.chapitre))
  if (etat.verset != null && etat.chapitre != null) parametres.set('verset', String(etat.verset))
  if (etat.colonnes.some(Boolean)) parametres.set('trads', etat.colonnes.join(','))
  return `/polyglotte?${parametres.toString()}`
}

/** Les colonnes que l'adresse nomme, dans leur ordre, ou `null` si elle n'en nomme
 *  aucune (les réglages mémorisés font alors le repli). Un code illisible vaut une
 *  colonne vide : il garde son rang sans rien imposer. */
export function colonnesPolyglotteDemandees(recherche: string): string[] | null {
  const brut = new URLSearchParams(recherche).get('trads')
  if (!brut) return null
  const colonnes = brut.split(',').slice(0, 12).map(c => (RE_COLONNE.test(c.trim()) ? c.trim() : ''))
  return colonnes.some(Boolean) ? colonnes : null
}

/** Vrai si l'adresse demande le livre ENTIER plutôt qu'un chapitre. */
export function livreEntierDemande(recherche: string): boolean {
  return new URLSearchParams(recherche).get('entier') === '1'
}

const RE_CANON_VERSET = /^([A-Z0-9]{2,6})\.(\d+)\.(\d+)$/

/** La place canonique d'une rangée de verset : son identifiant (`GEN.29.3`, ou
 *  `899:GEN.29.3` pour une ligne recomposée), sinon sa référence, sinon ce que la
 *  page affiche. */
export function placeCanoniqueDuVerset(
  v: { id_verset: string; ref?: string | null; verset: number },
  livre: string,
  chapitre: number,
): PlacePolyglotte {
  for (const candidat of [String(v.id_verset).replace(/^[^:]*:/, ''), v.ref ?? '']) {
    const m = RE_CANON_VERSET.exec(candidat)
    if (m) return { livre: m[1], chapitre: Number(m[2]), verset: Number(m[3]) }
  }
  return { livre, chapitre, verset: v.verset }
}
