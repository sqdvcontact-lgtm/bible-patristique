// ⛔ RÉSERVÉ À LA PAGE DE TITRE (décision de l'auteur, 2026-08-24). Le frontispice
// est une composition, et son titre n'y porte pas de point final. Partout AILLEURS,
// la charte fait foi : « La ponctuation d’un titre […] transcrit depuis une édition
// source est conservée telle qu’elle est attestée. Un point final imprimé n’est donc
// jamais supprimé par une règle générale. » Les titres de niveau du corps, la fiche
// d'auteur et la recherche gardent donc leur ponctuation attestée.
//
// Retire un point final unique, en préservant les points de suspension (« … » ou
// « ... ») et les points internes. Sert aussi aux commentaires publics, dont la charte
// dit qu'ils « ne prennent pas de point final », et à la comparaison d'intitulés.
export function sansPointFinal(titre: string | null | undefined): string {
  if (!titre) return ''
  return titre.replace(/([^.\s])\s*\.\s*$/, '$1')
}

// Capitale initiale (locale FR), le reste inchangé.
function capitaliserInitiale(mot: string): string {
  return mot ? `${mot.charAt(0).toLocaleUpperCase('fr-FR')}${mot.slice(1)}` : mot
}

// Titres « techniques » hérités d'un atelier d'import (clés de structure brutes) :
// « caput_002 » → « Caput 2 », « quaestio_089 » → « Quaestio 89 » (séparateur et
// zéros de tête normalisés). Et un mot latin isolé, tout en bas de casse
// (« prolegomena », « subscriptio », « incipit »), reçoit sa capitale initiale.
// Règle éditoriale : un titre ne paraît jamais sous sa forme d'atelier. Fonction
// PURE et idempotente ; ne touche qu'aux formes « mot_nombre » ou au mot unique
// tout en minuscules — un vrai intitulé (« Homélie sur… », « Question 2 sur… »)
// n'est jamais modifié (l'ancrage ^…$ l'exige). Testée dans `titres.test.ts`.
export function normaliserTitreTechnique(titre: string | null | undefined): string {
  if (!titre) return ''
  const t = titre.trim()
  const m = t.match(/^([A-Za-zÀ-ÿ]+)[ _]0*(\d+)$/u)
  if (m) return `${capitaliserInitiale(m[1])} ${parseInt(m[2], 10)}`
  if (/^[a-zà-ÿ]{4,}$/u.test(t)) return capitaliserInitiale(t)
  return titre
}

// Clé de tri d'un titre : sans article/déterminant de tête, sans accents, pour un
// classement alphabétique (« La Cité de Dieu » → à « C », « L'Évangile » → à « E »).
// À utiliser avec localeCompare('fr'), avec le titre brut en départage.
const ARTICLE_TETE = /^(l'|d'|le |la |les |un |une |des |du |de |au |aux )/
export function cleTriTitre(titre: string | null | undefined): string {
  if (!titre) return ''
  const t = titre.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, "'")
  return t.replace(ARTICLE_TETE, '').trim()
}

// Deux intitulés sont « le même » quand ils ne diffèrent que par ce que la
// composition ignore de toute façon : les blancs (le titre d'affichage porte des
// sauts de ligne éditoriaux que le titre original n'a pas), la casse, la forme de
// l'apostrophe, le point final proscrit et les appels de note. Les accents, eux,
// restent distinctifs : ils appartiennent au mot.
// Sert à ne pas répéter un intitulé sous lui-même sur la page de titre, quand
// l'œuvre est nommée par son titre d'origine (« Confessiones »).
const APPEL_NOTE_INTITULE = /[ \t]*\[\[[A-Z0-9]+\]\]/g
function cleIntitule(titre: string | null | undefined): string {
  if (!titre) return ''
  return sansPointFinal(titre.replace(APPEL_NOTE_INTITULE, ''))
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[’']/g, "'")
    .toLocaleLowerCase('fr-FR')
}
export function memeIntitule(a: string | null | undefined, b: string | null | undefined): boolean {
  const cle = cleIntitule(a)
  return cle !== '' && cle === cleIntitule(b)
}

// Le COMPLÉMENT d'un titre de niveau — ce qu'il faut en composer, s'il dit quelque chose.
//
// `ref_nivN` est le titre STRUCTUREL du niveau N, `ref_nivN_texte` son complément, et
// ce complément est FACULTATIF : son absence est le cas ordinaire, non un défaut. Au
// 29 août 2026, 27 156 segments portent un titre de niveau 1 sans complément (28 %),
// 31 550 au niveau 2 (36 %), 1 534 au niveau 3. Un niveau sans complément se compose
// donc seul, sans séparateur, sans tiret et sans emplacement vide — c'est ce que fait
// le lecteur depuis toujours, chaque complément étant rendu sous condition.
//
// ⛔ Ce que le lecteur ne faisait PAS : écarter le complément qui REDIT son titre.
// 1 524 segments sont dans ce cas, et la Somme théologique est la seule œuvre qui les
// montre (89 segments aux niveaux 2 et 3), les autres ayant `texte_corps` à zéro. Le
// titre y paraissait deux fois de suite, en romain puis en italique.
//
// ⚠️ La comparaison est celle de `memeIntitule` : blancs, casse, forme de l'apostrophe,
// point final et appels de note. Les accents restent distinctifs.
//
// ⚠️ Écarter n'est pas corriger : `app/admin/controleQualite.ts` continue de signaler
// le cas comme un défaut de DONNÉE, et le crayon de l'administrateur montre toujours
// la valeur réelle. On refuse seulement de composer deux fois le même intitulé.
export function complementDeTitre(
  titre: string | null | undefined,
  complement: string | null | undefined,
): string {
  if (!complement || !complement.trim()) return ''
  return memeIntitule(titre, complement) ? '' : complement
}

/** Comment COMPOSER un intitulé de sommaire. Deux réglages, et ils ne se gênent pas.
 *
 *  `white-space: pre-line` fait voir le saut de ligne SAISI par l'éditeur. Un chapeau
 *  comme « Comment Caïn a-t-il pu bâtir une ville ?⏎Genèse 4, 17 » porte sa référence sur
 *  une ligne à part parce qu'on l'a voulu ainsi ; sans ce réglage, le saut se rendait
 *  comme une simple espace et la référence venait se coller à la question.
 *
 *  `text-wrap: balance` égalise les lignes qu'un intitulé long produit dans une colonne
 *  étroite. Sans lui, la coupure tombe où elle peut et rejette volontiers deux syllabes
 *  seules à la fin : « … un commerce / impur ? ».
 *
 *  ⛔ On avait craint que le second ne défasse le premier, et prévu de l'interdire dès
 *  qu'un saut manuel était présent. MESURÉ, ce n'est pas le cas : un saut forcé est une
 *  frontière que l'équilibrage ne franchit pas. Sur « Comment les Anges … impur ?⏎Genèse
 *  6, 4 », « Genèse 6, 4 » reste sur sa ligne à toutes les largeurs, et l'écart entre les
 *  lignes de la QUESTION tombe de 13 caractères à 3 sur une colonne de 130 px, de 18 à
 *  10 sur 150, de 6 à 2 sur 170.
 *
 *  ⚠️ Mais chaque tronçon ne s'équilibre PAS seul, contrairement à ce qu'on avait écrit
 *  ici (corrigé le 2026-09-03). Le navigateur équilibre en réduisant UNE largeur commune
 *  à toutes les lignes : dès qu'un tronçon forcé occupe une ligne entière, il ne peut
 *  plus rien réduire sans la casser, et les tronçons suivants retombent dans
 *  l'enroulement ordinaire. Mesuré sur « On demande aussi comment, avec ses dimensions
 *  telles qu'elles sont décrites,⏎l'arche de Noé put contenir … et leur nourriture » :
 *  la première ligne remplie, « nourriture » retombe seul. Un saut saisi ne rend donc
 *  service que si ce qui le suit tient sur sa ligne ou s'équilibre de lui-même.
 *
 *  L'interdiction aurait donc coûté sans rien protéger : elle aurait laissé sans remède
 *  les intitulés qui portent une référence en seconde ligne, c'est-à-dire précisément
 *  ceux qui sont longs. L'éditeur garde ses coupures ; l'équilibrage ne travaille que sur
 *  celles que personne n'a choisies.
 */
export const COMPOSITION_INTITULE = { whiteSpace: 'pre-line', textWrap: 'balance' } as const
