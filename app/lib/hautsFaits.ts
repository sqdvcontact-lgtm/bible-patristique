// LES HAUTS FAITS — ce que le code sait en faire.
//
// Partage net avec la base : `public.hauts_faits` dit COMBIEN et COMMENT ça s'appelle,
// ce module sait seulement COMPTER et CLASSER. Les seuils et les textes se corrigent
// donc sans déploiement, ce qui est la condition pour les recalibrer après l'ouverture,
// sur la distribution réelle — avec six comptes, aucune rareté ne se calibre encore.
//
// ⛔ LA RÈGLE QUI COMMANDE TOUT LE RESTE : il doit toujours rester un haut fait À DEUX
// PAS. Anderson, Huttenlocher, Kleinberg et Leskovec (WWW 2013) ont mesuré sur
// plusieurs millions de comptes Stack Overflow que l'activité s'accélère fortement à
// l'approche d'un badge, puis s'effondre après l'obtention et retourne au niveau de
// base. ⚠️ Le remède n'est PAS un palier lointain : le gradient est nul à distance
// jugée infinie, et un degré hors de portée masque la clôture au lieu de l'éviter.
// Ce sont des séries DÉCALÉES qu'il faut, et c'est `serieLaPlusProche` qui les fait
// jouer : à tout moment, la page met en avant celle dont le degré suivant est le
// plus près, quelle que soit la série.

/** Ce que le code sait compter. Une mesure absente d'ici ne peut pas être servie,
 *  quand bien même la base la nommerait : le référentiel se corrige librement, mais
 *  il ne peut pas inventer un compteur. */
export const MESURES = [
  'passages_retenus',
  'oeuvres_bibliotheque',
  'peres_retenus',
  'siecles_retenus',
  'commentaires_valides',
  'essais_publies',
] as const

export type Mesure = (typeof MESURES)[number]

export function mesureConnue(nom: string): nom is Mesure {
  return (MESURES as readonly string[]).includes(nom)
}

/** Ce que le lecteur a marqué, mesure par mesure. */
export type Compteurs = Record<Mesure, number>

/** Ce que la bibliothèque donne à lire aujourd'hui : le dénominateur des seuils
 *  exprimés en part. Il monte avec le corpus, et les derniers degrés avec lui. */
export type Corpus = { auteurs: number; siecles: number }

/** À quel total se rapporte une part. Une mesure qui n'a pas de total ne peut pas
 *  porter de seuil relatif : `seuilEffectif` le refuse plutôt que de deviner. */
const TOTAL_DE_LA_MESURE: Partial<Record<Mesure, keyof Corpus>> = {
  peres_retenus: 'auteurs',
  siecles_retenus: 'siecles',
}

export type HautFait = {
  code: string
  serie: string
  serie_nom: string
  degre: number
  nom: string
  notice: string
  mesure: string
  seuil: number | null
  seuil_part: number | null
  ordre: number
}

/** Le seuil réellement à atteindre.
 *
 *  ⛔ Un seuil en PART se recalcule sur le corpus du jour : « les trois quarts des
 *  auteurs » vaut onze aujourd'hui et vingt demain. C'est ce qui empêche un dernier
 *  degré de devenir soit impossible, soit trivial — un palier à cinquante Pères n'est
 *  pas rare quand il n'y en a que quinze, il est hors d'atteinte, et un haut fait
 *  hors d'atteinte est un défaut, non un défi.
 *
 *  Rend `null` si le seuil ne peut pas se résoudre : le haut fait est alors écarté
 *  plutôt que présenté avec un but faux. */
export function seuilEffectif(hf: HautFait, corpus: Corpus): number | null {
  if (hf.seuil != null) return hf.seuil
  if (hf.seuil_part == null || !mesureConnue(hf.mesure)) return null
  const cle = TOTAL_DE_LA_MESURE[hf.mesure]
  if (!cle) return null
  const total = corpus[cle]
  if (!total || total <= 0) return null
  // On arrondit vers le HAUT : « les trois quarts de quinze » font onze, non dix.
  return Math.max(1, Math.ceil(total * hf.seuil_part))
}

export type DegreEtat = HautFait & {
  seuilAtteindre: number
  obtenu: boolean
  obtenuLe: string | null
}

export type SerieEtat = {
  serie: string
  nom: string
  mesure: Mesure
  /** Où en est le compteur aujourd'hui. */
  valeur: number
  degres: DegreEtat[]
  /** Le prochain degré non obtenu, et ce qu'il reste à faire pour lui. */
  prochain: DegreEtat | null
  restant: number | null
}

/** L'état d'une série : ses degrés, celui qui vient, et la distance qui l'en sépare. */
export function etatDesSeries(
  hautsFaits: HautFait[],
  compteurs: Compteurs,
  corpus: Corpus,
  obtenus: Map<string, string>,
): SerieEtat[] {
  const parSerie = new Map<string, HautFait[]>()
  for (const hf of hautsFaits) {
    if (!mesureConnue(hf.mesure)) continue
    if (!parSerie.has(hf.serie)) parSerie.set(hf.serie, [])
    parSerie.get(hf.serie)!.push(hf)
  }

  const series: SerieEtat[] = []
  for (const [serie, liste] of parSerie) {
    const mesure = liste[0].mesure as Mesure
    const valeur = compteurs[mesure] ?? 0

    const degres: DegreEtat[] = liste
      .map(hf => ({ hf, seuilAtteindre: seuilEffectif(hf, corpus) }))
      .filter((d): d is { hf: HautFait; seuilAtteindre: number } => d.seuilAtteindre != null)
      .sort((a, b) => a.seuilAtteindre - b.seuilAtteindre || a.hf.degre - b.hf.degre)
      .map(({ hf, seuilAtteindre }) => ({
        ...hf,
        seuilAtteindre,
        // ⛔ Un degré obtenu le RESTE, même si le compteur redescend : c'est le journal
        // qui fait foi, jamais le compteur du jour. Une perte démotive plus qu'un gain
        // ne motive, et l'on ne retire pas ce qui a été acquis.
        obtenu: obtenus.has(hf.code) || valeur >= seuilAtteindre,
        obtenuLe: obtenus.get(hf.code) ?? null,
      }))

    if (!degres.length) continue
    const prochain = degres.find(d => !d.obtenu) ?? null
    series.push({
      serie,
      nom: liste[0].serie_nom,
      mesure,
      valeur,
      degres,
      prochain,
      restant: prochain ? Math.max(0, prochain.seuilAtteindre - valeur) : null,
    })
  }

  return series.sort((a, b) => (a.degres[0]?.ordre ?? 0) - (b.degres[0]?.ordre ?? 0))
}

/** La série dont le degré suivant est le PLUS PROCHE, toutes séries confondues.
 *
 *  C'est elle que la page met en avant, et c'est tout le mécanisme : après une
 *  obtention, ce n'est pas le degré supérieur de la même série qui reprend la main,
 *  c'est la série voisine, celle où il ne manque plus qu'un ou deux gestes. À égalité,
 *  la première dans l'ordre du référentiel — pour que l'ordre reste une décision
 *  éditoriale, et non le fruit du hasard. */
export function serieLaPlusProche(series: SerieEtat[]): SerieEtat | null {
  const enCours = series.filter(s => s.prochain && s.restant != null)
  if (!enCours.length) return null
  return enCours.reduce((meilleure, s) => (s.restant! < meilleure.restant! ? s : meilleure))
}

/** Les codes que le lecteur vient d'atteindre et que le journal ne porte pas encore. */
export function obtentionsNouvelles(series: SerieEtat[], obtenus: Map<string, string>): string[] {
  return series.flatMap(s => s.degres.filter(d => d.obtenu && !obtenus.has(d.code)).map(d => d.code))
}

/** Ce qu'on annonce pour une série en cours.
 *
 *  ⚠️ Toujours ce qui RESTE, jamais le chemin parcouru : ici, contrairement au
 *  parcours d'entrée, le lecteur est déjà engagé, et c'est le petit reste qui porte
 *  (Koo et Fishbach). « Encore deux » se lit ; « 8 sur 10 » se calcule. */
export function libelleRestant(serie: SerieEtat): string | null {
  if (!serie.prochain || serie.restant == null) return null
  if (serie.restant === 0) return 'Atteint.'
  return serie.restant === 1 ? 'Encore un.' : `Encore ${serie.restant}.`
}
