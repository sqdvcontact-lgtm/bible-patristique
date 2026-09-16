// Le lexique d'accentuation : ce que la route accepte, et ce que l'écran range.
//
// Il remplace, depuis le 16 septembre 2026, la « charte d'accentuation » qui vivait en un seul
// texte dans `parametres.charte_accentuation` (demande de l'auteur : « faire une liste
// alphabétique des mots, avec possibilité d'ajout manuel, de suppression »). Les mots vivent
// dans la table `accentuation_mots`, un mot par ligne ; les règles qui n'étaient pas des mots
// ont rejoint la charte, § 3.12.
//
// Une entrée porte la forme JUSTE du mot (« Élie », « À », « Ô »). Sa forme fautive ne
// s'écrit pas : elle se déduit en ôtant l'accent de l'initiale, ce qui est la faute même que
// le lexique relève. Un mot marqué `faux_positif` est l'inverse : une capitale qu'un contrôle
// croirait fautive et qu'il faut laisser telle quelle (« Esther », « Ecce », « En »).
//
// ⚠️ Imports relatifs ou aucun : la suite de tests ne résout pas l'alias du dépôt.

export type MotAccentuation = {
  id: number
  mot: string
  faux_positif: boolean
  note: string | null
}

export type EntreeAccentuation = Pick<MotAccentuation, 'mot' | 'faux_positif' | 'note'>

export const LONGUEUR_MOT = 60
export const LONGUEUR_NOTE = 500

/** Une lettre d'abord, une lettre à la fin ; entre les deux, des lettres, des apostrophes,
 *  des traits d'union ou des espaces. Une lettre seule est un mot (« À », « Ô »).
 *  ⚠️ La contrainte `accentuation_mots_mot_forme` dit la même chose en base : les deux se
 *  changent ensemble. */
const FORME_MOT = /^\p{L}(?:[\p{L}’ -]*\p{L})?$/u

/** Le mot tel qu'il s'enregistre, ou `null` s'il n'en est pas un. Composé en NFC, bords
 *  rognés, blancs réduits, apostrophe droite rendue typographique. */
export function motValide(valeur: unknown): string | null {
  if (typeof valeur !== 'string') return null
  const mot = valeur.normalize('NFC').trim().replace(/\s+/gu, ' ').replace(/'/g, '’')
  if (!mot || [...mot].length > LONGUEUR_MOT) return null
  return FORME_MOT.test(mot) ? mot : null
}

/** La note, bords rognés ; `null` quand il n'y en a pas. ⚠️ Une note trop longue n'est pas
 *  tronquée ici : `lireEntree` la refuse, et l'auteur la raccourcit lui-même. */
export function noteNettoyee(valeur: unknown): string | null {
  if (typeof valeur !== 'string') return null
  const note = valeur.normalize('NFC').trim()
  return note || null
}

/** Ce qu'un corps de requête propose d'écrire, ou l'erreur à rendre telle quelle. */
export function lireEntree(corps: unknown): EntreeAccentuation | { erreur: string } {
  const o = corps && typeof corps === 'object' ? (corps as Record<string, unknown>) : {}
  const mot = motValide(o.mot)
  if (!mot) {
    return { erreur: `Un mot se compose de lettres, d’apostrophes, de traits d’union ou d’espaces, et ne dépasse pas ${LONGUEUR_MOT} signes.` }
  }
  const note = noteNettoyee(o.note)
  if (note && [...note].length > LONGUEUR_NOTE) {
    return { erreur: `La note dépasse ${LONGUEUR_NOTE} signes.` }
  }
  return { mot, faux_positif: o.faux_positif === true, note }
}

/** Les ligatures ne se décomposent pas en NFD : leur forme ouverte se dit à part. */
const LIGATURES: Record<string, string> = { 'Œ': 'Oe', 'œ': 'oe', 'Æ': 'Ae', 'æ': 'ae' }

function initialeNue(initiale: string): string {
  return LIGATURES[initiale] ?? initiale.normalize('NFD').replace(/\p{M}/gu, '')
}

/** La forme fautive du mot : son initiale sans accent (« Élie » → « Elie », « âme » →
 *  « ame »), sa ligature ouverte (« Œuvre » → « Oeuvre »). `null` quand l'initiale n'a rien
 *  à perdre, ce qui est le cas de tout faux positif bien inscrit. */
export function formeFautive(mot: string): string | null {
  const [initiale, ...reste] = [...mot]
  if (!initiale) return null
  const nue = initialeNue(initiale)
  return nue === initiale ? null : nue + reste.join('')
}

/** La lettre sous laquelle le mot se range : « Élie » à E, « Ôtez » à O, « Œuvre » à O. */
export function lettreDe(mot: string): string {
  const [initiale = ''] = [...mot]
  return initialeNue(initiale).slice(0, 1).toLocaleUpperCase('fr')
}

// ⛔ L'ordre est celui du français, et non celui des points de code : par ce dernier, « Élie »
// se rangerait après « Zacharie ». L'accent et la casse ne départagent que deux mots égaux
// par ailleurs.
const COLLATEUR = new Intl.Collator('fr', { sensitivity: 'variant', numeric: true })

export function trierMots<T extends { mot: string }>(mots: readonly T[]): T[] {
  return [...mots].sort((a, b) => COLLATEUR.compare(a.mot, b.mot))
}

export type GroupeLettre<T> = { lettre: string; mots: T[] }

/** Les mots dans l'ordre alphabétique, rangés sous leur lettre. */
export function grouperParLettre<T extends { mot: string }>(mots: readonly T[]): GroupeLettre<T>[] {
  const groupes: GroupeLettre<T>[] = []
  for (const m of trierMots(mots)) {
    const lettre = lettreDe(m.mot)
    const dernier = groupes[groupes.length - 1]
    if (dernier && dernier.lettre === lettre) dernier.mots.push(m)
    else groupes.push({ lettre, mots: [m] })
  }
  return groupes
}

/** Un texte replié pour la recherche : sans accent, sans ligature, en bas de casse. On
 *  cherche « elie » et l'on trouve « Élie », qui est précisément ce qu'on vient vérifier. */
export function replier(texte: string): string {
  return texte.normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/œ/giu, 'oe').replace(/æ/giu, 'ae')
    .replace(/’/g, "'")
    .toLocaleLowerCase('fr')
}

export type RegimeAccentuation = 'tous' | 'accentuer' | 'faux_positif'

/** Les mots que montre l'écran : le régime choisi, et la recherche, qui lit aussi la note
 *  (« Segond » y trouve tout ce que la Bible Segond a fait relever). */
export function filtrerMots<T extends EntreeAccentuation>(mots: readonly T[], recherche: string, regime: RegimeAccentuation): T[] {
  const cherche = replier(recherche.trim())
  return mots.filter(m => {
    if (regime !== 'tous' && (regime === 'faux_positif') !== m.faux_positif) return false
    if (!cherche) return true
    return replier(m.mot).includes(cherche) || replier(m.note ?? '').includes(cherche)
  })
}
