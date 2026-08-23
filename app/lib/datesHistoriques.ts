export type PrecisionDateHistorique = 'exacte' | 'circa' | 'vers'

export type BorneDateHistorique = {
  annee: number
  precision?: PrecisionDateHistorique | null
}

export type PeriodeHistorique = {
  debut?: BorneDateHistorique | null
  fin?: BorneDateHistorique | null
}

/* ── Le séparateur d'un intervalle de dates ───────────────────────────────────
 *
 *  Un simple TRAIT D'UNION, une espace de chaque côté : « 354 - 430 », « Vers 480
 *  - 524 », « Début du IXe siècle - Après 868 ». Le demi-cadratin employé jusqu'ici
 *  se posait sans espaces sur les dates lues telles quelles en base, et les deux
 *  bornes se touchaient.
 *
 *  Les deux espaces sont INSÉCABLES à l'affichage : un trait d'union autorise le
 *  retour à la ligne juste après lui, et l'on verrait des dates coupées en deux
 *  (« 354 - » d'un côté, « 430 » de l'autre). La forme CANONIQUE, celle qu'on écrit
 *  en base, garde des espaces ordinaires : rien n'y réclame une insécable, et un
 *  caractère invisible s'oublie dans une colonne de texte.
 */
export const SEPARATEUR_INTERVALLE = ' - '
export const SEPARATEUR_INTERVALLE_AFFICHE = ' - '

// Le tiret qui sépare DEUX BORNES, et lui seul. On le reconnaît à ce qui le
// précède : un chiffre (« 354-430 »), le mot « siècle » (« IVe siècle-Ve siècle »)
// ou l'ordinal d'un romain (« IIIe-IVe siècle »). Sans cette condition, le trait
// d'union de « av. J.-C. », de « Bar-le-Duc » ou de « Jacques-Paul » serait espacé
// lui aussi.
const SEPARATEUR_BORNES = /(\d|siècles?|\bs\.|[IVXLCDM]+(?:er|ère|ere|ème|eme|ième|ieme|e))\s*[-‐-―−]\s*(?=[\p{L}\d])/giu

/** Harmonise l'espacement d'un intervalle déjà rédigé — en base ou par le
 *  formateur — sans rien recalculer de ses bornes : « 354-430 », « 354 – 430 » et
 *  « 354 - 430 » se rendent tous « 354 - 430 », espaces insécables comprises. */
export function espacerIntervallesHistoriques(valeur: string): string {
  return valeur.trim().replace(SEPARATEUR_BORNES, (_, borne: string) => `${borne}${SEPARATEUR_INTERVALLE_AFFICHE}`)
}

const TIRETS_LONGS = /[\u2010-\u2015\u2212]/g
const ESPACES = /\s+/g
const PREFIXE_VERS = /^(?:v\.?|vers)(?=\s|\d|$)\s*/i
const PREFIXE_CIRCA = /^(?:c\.|ca\.?|circa|env\.?|environ)(?=\s|\d|$)\s*/i

function nettoyerBase(valeur: string) {
  return valeur
    .replace(TIRETS_LONGS, '-')
    .replace(ESPACES, ' ')
    .replace(/\s*-\s*/g, '-')
    .trim()
}

function normaliserPrefixeLibre(valeur: string) {
  return nettoyerBase(valeur)
    .replace(PREFIXE_VERS, 'Vers ')
    .replace(PREFIXE_CIRCA, 'Vers ')
}

function lireBorne(partie: string): BorneDateHistorique | null {
  const propre = nettoyerBase(partie)
  if (!propre) return null
  const precision: PrecisionDateHistorique =
    PREFIXE_VERS.test(propre) ? 'vers' :
    PREFIXE_CIRCA.test(propre) ? 'vers' :
    'exacte'
  const sansPrefixe = propre.replace(PREFIXE_VERS, '').replace(PREFIXE_CIRCA, '').trim()
  const match = sansPrefixe.match(/^-?\d{1,4}$/)
  if (!match) return null
  return { annee: Number(match[0]), precision }
}

function formaterBorne(borne: BorneDateHistorique) {
  const annee = String(borne.annee)
  if (borne.precision === 'vers') return `Vers ${annee}`
  if (borne.precision === 'circa') return `Vers ${annee}`
  return annee
}

export function parserDateHistorique(valeur: unknown): PeriodeHistorique | null {
  if (valeur === null || valeur === undefined || valeur === '') return null
  const texte = nettoyerBase(String(valeur))
  if (!texte) return null

  // Essai en tant que borne unique — gère les années négatives comme "-40"
  // (split naïf sur '-' produirait ["", "40"], perdant le signe)
  const borneUnique = lireBorne(texte)
  if (borneUnique) return { debut: borneUnique }

  // Fourchettes en toutes lettres : « Entre 396 et 399 », « de 396 à 399 »,
  // « 396 à 399 », « 396 et 399 » → période « 396-399 ». On exige que les DEUX
  // bornes soient des années, pour ne pas confondre avec un texte libre. Le
  // formateur rendra ensuite « 396-399 » (sans « Entre », avec trait d'union).
  const fourchette =
    texte.match(/^(?:entre|de)\s+(.+?)\s+(?:et|à|a)\s+(.+)$/i) ||
    texte.match(/^(.+?)\s+(?:et|à|a)\s+(.+)$/i)
  if (fourchette) {
    const debut = lireBorne(fourchette[1])
    const fin = lireBorne(fourchette[2])
    if (debut && fin) return { debut, fin }
  }

  // Séparation en période : trouver le tiret séparateur positionné après un chiffre
  // "100-200" → sep=3 ; "-300-200" → sep=4 ; "-300--200" → sep=4
  let sep = -1
  for (let i = 1; i < texte.length; i++) {
    if (texte[i] === '-' && /\d/.test(texte[i - 1])) { sep = i; break }
  }
  if (sep !== -1) {
    const debut = lireBorne(texte.slice(0, sep))
    const fin = lireBorne(texte.slice(sep + 1))
    if (debut || fin) return { debut, fin }
  }
  return null
}

export function formaterPeriodeHistorique(periode: PeriodeHistorique | null | undefined) {
  if (!periode?.debut && !periode?.fin) return ''
  if (periode.debut && periode.fin) return `${formaterBorne(periode.debut)}${SEPARATEUR_INTERVALLE}${formaterBorne(periode.fin)}`
  return formaterBorne((periode.debut ?? periode.fin)!)
}

export function formaterDateHistorique(valeur: unknown) {
  if (valeur === null || valeur === undefined || valeur === '') return ''
  const periode = parserDateHistorique(valeur)
  if (periode) return formaterPeriodeHistorique(periode)
  return normaliserPrefixeLibre(String(valeur))
}

export function normaliserDateHistoriqueTexte(valeur: unknown) {
  const texte = formaterDateHistorique(valeur)
  return texte || null
}

export function formaterPeriodeHistoriqueDepuisBornes(debut: unknown, fin: unknown) {
  const d = normaliserDateHistoriqueTexte(debut)
  const f = normaliserDateHistoriqueTexte(fin)
  if (!d && !f) return null
  if (d && f) return `${d}${SEPARATEUR_INTERVALLE}${f}`
  return d ?? f
}

function premiereBorne(valeur: unknown): BorneDateHistorique | null {
  const periode = parserDateHistorique(valeur)
  return periode?.debut ?? periode?.fin ?? null
}

export function colonnesPeriodeHistorique(prefixe: string, valeur: unknown) {
  const periode = parserDateHistorique(valeur)
  return {
    [`${prefixe}_debut_annee`]: periode?.debut?.annee ?? null,
    [`${prefixe}_debut_precision`]: periode?.debut?.precision ?? null,
    [`${prefixe}_fin_annee`]: periode?.fin?.annee ?? null,
    [`${prefixe}_fin_precision`]: periode?.fin?.precision ?? null,
  }
}

export function colonnesPeriodeHistoriqueDepuisBornes(prefixe: string, debut: unknown, fin: unknown) {
  const borneDebut = premiereBorne(debut)
  const borneFin = premiereBorne(fin)
  return {
    [`${prefixe}_debut_annee`]: borneDebut?.annee ?? null,
    [`${prefixe}_debut_precision`]: borneDebut?.precision ?? null,
    [`${prefixe}_fin_annee`]: borneFin?.annee ?? null,
    [`${prefixe}_fin_precision`]: borneFin?.precision ?? null,
  }
}

export function extraireAnneeDateHistorique(valeur: unknown): number | null {
  const periode = parserDateHistorique(valeur)
  const borne = periode?.fin ?? periode?.debut
  return borne?.annee ?? null
}
