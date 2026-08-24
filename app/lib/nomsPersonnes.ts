// Le nom d'une personne, en trois rubriques
//
// Le site nommait ses auteurs par une seule chaîne, « Prénom Nom », sans moyen de savoir
// où finissait l'un et où commençait l'autre. On ne pouvait donc ni classer une
// bibliographie par nom de famille, ni chercher « Vogüé » sans chercher « Adalbert », ni
// dire d'Irénée de Lyon que son nom n'est pas un nom civil.
//
// Trois rubriques, toutes facultatives, et une règle :
//  · `prenom` et `nom` sont le nom civil d'une personne moderne ;
//  · `pseudonyme` est le nom d'usage : celui sous lequel on signe et sous lequel on cite.
//    Voltaire en est un pour François-Marie Arouet ; « Irénée de Lyon » en est un aussi,
//    et il en va de même de TOUS les auteurs jusqu'à la fin du Moyen Âge, dont le nom
//    n'est pas un patronyme mais une désignation (prénom, siège, lieu, surnom).
//  · Quand il y a un pseudonyme, c'est LUI qui paraît. Le nom civil reste pour l'index,
//    le tri et la recherche. On dit « Voltaire », on classe à « Arouet ».
//
// ⚠️ Le découpage automatique est une PROPOSITION, jamais un verdict. Rien, dans
// « José Grosdidier de Matons », ne dit à une machine si le nom de famille est
// « de Matons » ou « Grosdidier de Matons ». Les cas de ce genre sont donc SIGNALÉS
// (`douteux`) pour relecture, et non tranchés en silence.

export type NomStructure = {
  prenom: string | null
  nom: string | null
  pseudonyme: string | null
}

export type Decoupage = NomStructure & {
  /** Vrai quand le découpage demande une relecture humaine (voir `raison`). */
  douteux: boolean
  raison: string | null
}

// Particules nobiliaires et de filiation. Dès qu'un mot de cette liste paraît, tout ce
// qui suit appartient au nom de famille : « Pierre de Martin de Viviés » se classe à
// « de Martin de Viviés », non à « de Viviés ».
const PARTICULES = new Set([
  'de', 'du', 'des', 'd’', "d'", 'da', 'das', 'dos', 'del', 'della', 'di', 'le', 'la', 'les',
  'van', 'von', 'der', 'den', 'ter', 'ten', 'vander', 'zu', 'zum',
  'ben', 'bin', 'ibn', 'al', 'el', 'abu', 'mac', 'mc', 'o’', "o'", 'saint', 'sainte', 'st',
])

// Suffixes de filiation anglo-saxons. Ils suivent le nom de famille et lui restent
// attachés : « Dale C. Allison Jr. » se classe à « Allison Jr. », jamais à « Jr. ».
const SUFFIXES = new Set(['jr.', 'jr', 'sr.', 'sr', 'ii', 'iii', 'iv'])

const estParticule = (mot: string) => PARTICULES.has(mot.toLowerCase())
const estSuffixe = (mot: string) => SUFFIXES.has(mot.toLowerCase())
// Une initiale : « P. », « J.-B. ». Elle appartient au prénom, jamais au nom.
const estInitiale = (mot: string) => /^(?:[A-ZÀ-Ý]\.-?)+$/.test(mot)

/** Espaces normalisés, apostrophe courbe, blancs de bord retirés. */
export function nettoyerNom(brut: string): string {
  return (brut ?? '').replace(/'/g, '’').replace(/\s+/g, ' ').trim()
}

/**
 * Découpe un nom de personne MODERNE écrit « Prénom Nom ».
 *
 * ⛔ Ne pas l'appeler sur un auteur ancien ou médiéval, ni sur un collectif : leur nom
 * n'a pas de patronyme à isoler. Employer `nomAncien` ou `nomCollectif`, qui posent la
 * chaîne entière au bon endroit. La nature de la personne est une donnée de la base
 * (`nature_personne`), elle ne se devine pas au nom.
 */
export function decouperNom(brut: string): Decoupage {
  const propre = nettoyerNom(brut)
  if (!propre) return { prenom: null, nom: null, pseudonyme: null, douteux: true, raison: 'Nom vide.' }

  const mots = propre.split(' ')

  // Un seul mot : rien à découper. C'est un nom d'usage, donc un pseudonyme.
  if (mots.length === 1) {
    return { prenom: null, nom: null, pseudonyme: propre, douteux: true, raison: 'Nom d’un seul mot : posé en pseudonyme, à confirmer.' }
  }

  // Une particule ouvre le nom de famille. On prend la PREMIÈRE : elle marque le début
  // du bloc patronymique, et les suivantes en font partie.
  const iParticule = mots.findIndex((m, i) => i > 0 && estParticule(m))
  if (iParticule > 0) {
    return {
      prenom: mots.slice(0, iParticule).join(' '),
      nom: mots.slice(iParticule).join(' '),
      pseudonyme: null,
      douteux: true,
      raison: 'Particule : le nom de famille peut commencer avant elle (« Grosdidier de Matons »).',
    }
  }

  // Cas ordinaire : le dernier mot est le nom, tout le reste est le prénom, initiales
  // médianes comprises (« Thomas P. Osborne »). Un suffixe de filiation en queue tire le
  // mot qui le précède avec lui, sinon le nom de famille serait « Jr. ».
  const coupe = estSuffixe(mots[mots.length - 1]) && mots.length > 2 ? mots.length - 2 : mots.length - 1
  const nom = mots.slice(coupe).join(' ')
  const prenom = mots.slice(0, coupe).join(' ')
  // Deux mots pleins devant le nom sans initiale : « Deborah Levine Gera » peut se lire
  // « Deborah » + « Levine Gera ». On ne trancherait qu'en connaissant la personne.
  const motsPleins = mots.slice(0, coupe).filter(m => !estInitiale(m))
  const douteux = motsPleins.length > 1
  return {
    prenom, nom, pseudonyme: null,
    douteux,
    raison: douteux ? 'Plusieurs mots devant le nom : le nom de famille est peut-être composé.' : null,
  }
}

/** Un auteur ancien ou médiéval : son nom entier est un nom d'usage. */
export function nomAncien(brut: string): NomStructure {
  return { prenom: null, nom: null, pseudonyme: nettoyerNom(brut) || null }
}

/** Un collectif n'est pas une personne : sa dénomination n'est ni nom ni pseudonyme. */
export function nomCollectif(): NomStructure {
  return { prenom: null, nom: null, pseudonyme: null }
}

/**
 * La forme affichée : « Prénom Nom », ou le pseudonyme quand il y en a un.
 *
 * `repli` est la chaîne déjà en base (`auteurs_valeur.nom`, `nom_affiche`) : tant que les
 * rubriques ne sont pas remplies, c'est elle qui paraît. L'écran ne se vide jamais parce
 * qu'une reprise de données n'est pas encore passée.
 */
export function composerNom(n: Partial<NomStructure> | null | undefined, repli = ''): string {
  const pseudo = nettoyerNom(n?.pseudonyme ?? '')
  if (pseudo) return pseudo
  const compose = [nettoyerNom(n?.prenom ?? ''), nettoyerNom(n?.nom ?? '')].filter(Boolean).join(' ')
  return compose || nettoyerNom(repli)
}

/**
 * La forme de CLASSEMENT : nom de famille d'abord. « Refoulé, François ».
 * Sous pseudonyme, on classe au nom civil s'il est connu, sinon au pseudonyme : on dit
 * Voltaire, mais une bibliographie sérieuse le range à Arouet.
 */
export function composerNomIndex(n: Partial<NomStructure> | null | undefined, repli = ''): string {
  const nom = nettoyerNom(n?.nom ?? '')
  const prenom = nettoyerNom(n?.prenom ?? '')
  if (nom) return prenom ? `${nom}, ${prenom}` : nom
  const pseudo = nettoyerNom(n?.pseudonyme ?? '')
  return pseudo || nettoyerNom(repli)
}

/** Clé de tri : sans accent, en bas de casse, nom de famille d'abord. */
export function cleTriNom(n: Partial<NomStructure> | null | undefined, repli = ''): string {
  return composerNomIndex(n, repli).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Vrai dès qu'une des trois rubriques est renseignée. */
export function nomStructure(n: Partial<NomStructure> | null | undefined): boolean {
  return !!(n && (nettoyerNom(n.nom ?? '') || nettoyerNom(n.prenom ?? '') || nettoyerNom(n.pseudonyme ?? '')))
}

/**
 * Découpe la chaîne d'une notice (« André Caquot; Philippe de Robert ») en noms.
 * Les mentions de rôle collées au dernier nom (« (dir.) », « (éd.) ») sont retirées :
 * elles disent le rôle, que la notice porte déjà par ailleurs.
 */
export function separerNoms(brut: string): string[] {
  return (brut ?? '')
    .split(/\s*[;]\s*/)
    .map(s => nettoyerNom(s).replace(/\s*\((?:dir|éd|ed|trad|collab)\.?\)\s*$/i, '').trim())
    .filter(Boolean)
}
