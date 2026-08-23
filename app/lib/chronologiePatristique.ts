// Ordre chronologique de l'apparat patristique. Module PUR, testé dans
// chronologiePatristique.test.ts.
//
// ⛔ La date d'une œuvre est `oeuvres.date_composition`, JAMAIS `date_publication`.
// Cette dernière porte la date de l'ÉDITION MODERNE : les Confessions y valent 1649,
// la Somme théologique 1984-1986, l'Histoire ecclésiastique le 21 octobre 1532. Trier
// là-dessus ne range pas les Pères, il range les réimpressions françaises — Thomas
// d'Aquin en dernier, Eusèbe en premier.
//
// ⚠️ Ce module ne réutilise pas `parserDateHistorique` (datesHistoriques.ts) pour deux
// raisons, et non par oubli. Celui-ci décrit une période pour l'AFFICHAGE et rend la
// borne HAUTE (`extraireAnneeDateHistorique`), quand un classement demande la borne
// BASSE : une œuvre écrite « 413-426 » se range à 413, comme un catalogue range une
// œuvre à sa date de début. Et il renonce dès que la valeur est de la prose, ce qui est
// ici le cas ORDINAIRE : sur les trente-deux dates de composition du corpus, on lit
// « Carême 387 », « Entre 392 et 430, date précise inconnue », « Vendredi saint, année
// non établie », « Fin du IVe siècle ». Sur les valeurs bien formées, les deux modules
// s'accordent.

const MOIS = 'janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[ûu]t|septembre|octobre|novembre|d[ée]cembre'

// ⛔ Le QUANTIÈME s'ôte AVANT de chercher l'année, sans quoi il passe pour elle.
// « 25 décembre 380 » se rangerait au Ier siècle, et « 1er janvier 379 » à l'an 1 —
// deux valeurs réelles du corpus (Grégoire de Nazianze, Basile de Césarée).
const QUANTIEME = new RegExp(`\\b\\d{1,2}(?:er)?\\s+(?:${MOIS})\\b`, 'gi')

// Tirets longs U+2010 à U+2015 et signe moins U+2212, ramenés au trait d'union.
const TIRETS_LONGS = /[‐-―−]/g

const ORDINAL = '(?:er|ère|ere|ème|eme|ième|ieme|e)'

// Un empan de siècles complet, sur le modèle de `siecles.tsx` : « IVe siècle », mais
// aussi « IIIe–IVe siècle » ou « du IVe au VIIIe siècle ». On garde le PREMIER chiffre
// de l'empan, qui en donne le début.
//
// ⛔ Pas de drapeau insensible à la casse sur le chiffre romain : `[ivxlcdm]` en
// bas-de-casse attraperait le « c » de « ce siècle » et rendrait un centième siècle.
const EMPAN_SIECLE = new RegExp(
  `[IVXLCDM]+${ORDINAL}?\\b(?:\\s*(?:[-–—]|au|et|à)\\s*[IVXLCDM]+${ORDINAL}?\\b)*\\s*(?:siècles?|s\\.)`,
)

const VALEUR_ROMAINE: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }

function lireChiffreRomain(rn: string): number {
  let n = 0
  for (let i = 0; i < rn.length; i++) {
    const courant = VALEUR_ROMAINE[rn[i]] ?? 0
    const suivant = VALEUR_ROMAINE[rn[i + 1]] ?? 0
    n += courant < suivant ? -courant : courant
  }
  return n
}

// ⚠️ La classe ci-dessous est faite de DIACRITIQUES COMBINANTES (U+0300 à U+036F),
// invisibles à la relecture : elles se collent au crochet qui les précède. Ne pas la
// retaper à la main — la recopier, ou la reprendre sur `sansAccents` de la navbar.
function sansAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Un siècle ne vaut pas une année : il vaut un RANG, et ce rang se place au milieu du
// siècle plutôt qu'à son premier jour — sans quoi toute œuvre datée « IVe siècle »
// précéderait celles datées 310 ou 320, ce qui est faux une fois sur deux. Le qualificatif
// qui précède, quand il y en a un, déplace le repère d'un quart de siècle : le corpus
// écrit « Fin du IVe siècle » et « Seconde moitié du Ier siècle ».
function repereDansLeSiecle(prefixe: string): number {
  const queue = sansAccents(prefixe).slice(-40)
  if (/(?:fin|seconde moitie|deuxieme moitie|dernier tiers|dernier quart)\s+(?:du |de la |des )?$/.test(queue)) return 75
  if (/(?:debut|commencement|premiere moitie|premier tiers|premier quart)\s+(?:du |de la |des )?$/.test(queue)) return 25
  return 50
}

/** L'année du premier siècle nommé dans une mention, ou `null`. */
export function anneeDeSiecle(valeur: unknown): number | null {
  if (valeur === null || valeur === undefined) return null
  const texte = String(valeur)
  const empan = EMPAN_SIECLE.exec(texte)
  if (!empan) return null
  const romain = empan[0].match(/[IVXLCDM]+/)
  if (!romain) return null
  const rang = lireChiffreRomain(romain[0])
  if (rang < 1) return null
  return (rang - 1) * 100 + repereDansLeSiecle(texte.slice(0, empan.index))
}

/**
 * L'année la PLUS ANCIENNE nommée par une mention de date, ou `null` si la mention
 * n'en nomme aucune (« Antiquité tardive », « Date non établie »).
 *
 * Une année en chiffres l'emporte sur un siècle en chiffres romains : elle est plus
 * précise, et une mention qui donne les deux (« vers 300-325 (Eusèbe) ») donne son
 * année pour repère.
 */
export function anneeDeMention(valeur: unknown): number | null {
  if (valeur === null || valeur === undefined) return null
  const texte = String(valeur)
    .replace(TIRETS_LONGS, '-')
    .replace(QUANTIEME, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!texte) return null
  const chiffres = texte.match(/\b\d{1,4}\b/)
  if (chiffres) return Number(chiffres[0])
  return anneeDeSiecle(texte)
}

export type ReperesChronologiques = {
  /** `oeuvres.date_composition` — la date de l'œuvre, pas celle de son édition. */
  dateComposition?: string | null
  /** `auteurs.date_mort` — repli quand l'œuvre n'est pas datée. */
  auteurDateMort?: string | null
  /** `auteurs.siecle` — dernier repli. */
  auteurSiecle?: string | null
}

/**
 * L'année de classement d'un extrait : la date de l'œuvre, à défaut celle de son auteur.
 *
 * Le repli n'est pas théorique : toutes les œuvres du corpus portent une
 * `date_composition`, mais plusieurs sont illisibles pour un classement — « Antiquité
 * tardive », « Date non établie », « Vendredi saint, année non établie ». La date de mort
 * de l'auteur place alors l'extrait un peu tard, jamais au mauvais siècle.
 */
export function anneeChronologique(reperes: ReperesChronologiques): number | null {
  return anneeDeMention(reperes.dateComposition)
    ?? anneeDeMention(reperes.auteurDateMort)
    ?? anneeDeMention(reperes.auteurSiecle)
}

export type ClefChronologique = {
  annee: number | null
  auteur: string
  oeuvre: string
  /** `segments.segment_numero` : l'ordre d'apparition dans l'œuvre. */
  numero: number
}

// Accent et casse ne départagent pas deux auteurs : « Élie » se range à sa place
// alphabétique, non derrière « Zosime ».
const COLLATEUR_FR = new Intl.Collator('fr', { sensitivity: 'base', numeric: true })

/**
 * Ordre de l'apparat : chronologie, puis auteur, puis œuvre, puis apparition dans l'œuvre.
 *
 * Auteur et œuvre ne sont pas des ornements du tri : ils garantissent que les extraits
 * d'une même œuvre restent CONTIGUS quand deux œuvres partagent une année. Sans eux, deux
 * commentaires écrits la même année s'entrelaceraient, et la fusion des segments qui se
 * suivent (volet patristique) ne trouverait plus ses paires.
 *
 * Une année inconnue ferme la marche plutôt que d'ouvrir : un extrait qu'on ne sait pas
 * dater ne doit pas se donner pour le plus ancien témoin.
 */
export function comparerChronologie(a: ClefChronologique, b: ClefChronologique): number {
  const anneeA = a.annee ?? Number.POSITIVE_INFINITY
  const anneeB = b.annee ?? Number.POSITIVE_INFINITY
  if (anneeA !== anneeB) return anneeA - anneeB
  const parAuteur = COLLATEUR_FR.compare(a.auteur, b.auteur)
  if (parAuteur !== 0) return parAuteur
  const parOeuvre = COLLATEUR_FR.compare(a.oeuvre, b.oeuvre)
  if (parOeuvre !== 0) return parOeuvre
  return a.numero - b.numero
}
