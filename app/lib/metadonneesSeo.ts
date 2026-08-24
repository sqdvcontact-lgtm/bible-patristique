// Modèles de métadonnées — titre d'onglet, description, en-têtes de partage.
//
// Une règle unique commande tout ce fichier : ON N'ANNONCE QUE CE QUE LA PAGE
// PORTE. Un auteur n'est nommé que s'il commente réellement le passage, une
// langue que si le texte existe dans cette langue, un commentaire que s'il y en
// a un. À défaut, la formule se replie sur plus simple — jamais sur plus riche.
//
// Deuxième règle : à donnée égale, résultat égal. Aucune variation d'une visite
// à l'autre, aucun tirage au sort de formule ; les mêmes entrées rendent le
// même titre, sans quoi un moteur ne saurait à quoi s'en tenir.
//
// Les fonctions d'ici sont PURES et testées (`metadonneesSeo.test.ts`) ; les
// lectures en base qui les alimentent vivent dans `metadonneesSeoServeur.ts`.
//
// ⚠️ Le nom du site ne s'écrit PAS dans les titres : `app/layout.tsx` pose le
// gabarit « %s · Corpus Scriptura ». Seule la page racine, que le gabarit
// n'atteint pas (même segment), compose son titre entier — d'où `avecNomDuSite`.

import { enumererNoms } from './traducteurs'

export const NOM_SITE = 'Corpus Scriptura'
/** Le séparateur du site, celui du gabarit de `app/layout.tsx`. */
export const SEPARATEUR_SITE = '·'

/** Titre entier, nom du site compris. Réservé aux pages hors gabarit. */
export function avecNomDuSite(titre: string): string {
  return `${titre} ${SEPARATEUR_SITE} ${NOM_SITE}`
}

// ── Coupe d'une description ──────────────────────────────────────────────────
// Google n'affiche guère plus de 160 signes. On coupe donc, mais JAMAIS au
// milieu d'un mot : à la fin de la dernière phrase entière si l'on en garde
// l'essentiel, sinon au dernier mot, points de suspension à l'appui.
export const LONGUEUR_DESCRIPTION = 160

// ⚠️ Un point suivi d'une espace ne finit pas toujours une phrase : le corpus
// écrit « M. Horiot », « J.-B. Aubert », et couper là donnait « traduit par M. »,
// c'est-à-dire une description qui ment sur ce qu'elle décrit (relevé le
// 2026-08-24, page de l'Homélie pour la Nativité). On exige donc TROIS lettres
// devant le point : une initiale n'en a qu'une.
const FIN_DE_PHRASE = /\p{L}{3,}[.!?](?=\s)/gu

export function couperDescription(texte: string, longueur = LONGUEUR_DESCRIPTION): string {
  const propre = texte.replace(/\s+/g, ' ').trim()
  if (propre.length <= longueur) return propre
  const tronque = propre.slice(0, longueur)
  // Une phrase entière vaut mieux qu'un fragment, à condition d'en garder la
  // moitié au moins : sous ce seuil, la description perdrait sa substance.
  let finPhrase = -1
  for (const trouve of tronque.matchAll(FIN_DE_PHRASE)) finPhrase = trouve.index + trouve[0].length
  if (finPhrase >= longueur * 0.5) return propre.slice(0, finPhrase)
  const finMot = tronque.lastIndexOf(' ')
  return `${propre.slice(0, finMot > 0 ? finMot : longueur).replace(/[,;:.…\s]+$/, '')}…`
}

// ── Élision ──────────────────────────────────────────────────────────────────
// « de Augustin » ne s'écrit pas. La règle vaut devant une voyelle et devant un
// h muet, qui est le cas de tous les noms du corpus (Hilaire, Hippolyte,
// Hermas). Un h aspiré s'éliderait à tort : c'est le seul défaut connu, et il
// ne se rencontre pas ici.
const INITIALE_ELIDABLE = /^[aàâäeéèêëiîïoôöuùûüyh]/i

export function deNom(nom: string): string {
  return INITIALE_ELIDABLE.test(nom.trim()) ? `d’${nom.trim()}` : `de ${nom.trim()}`
}

// ── Nombres en toutes lettres ────────────────────────────────────────────────
// Une description est une phrase : « et de six autres auteurs », non « et de 6 ».
const NOMBRES = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
]

export function nombreEnLettres(n: number): string {
  return NOMBRES[n] ?? String(n)
}

// ── Dates d'un auteur, mises en incise ───────────────────────────────────────
// La base écrit « Vers 347-407 » avec la capitale d'une étiquette. Au milieu
// d'une phrase, entre parenthèses, la capitale ne se justifie plus.
export function datesEnIncise(dates: string | null | undefined): string {
  const texte = (dates ?? '').trim()
  if (!texte) return ''
  const initiale = texte[0]
  return /\p{Lu}/u.test(initiale) && !/^\d/.test(texte)
    ? initiale.toLocaleLowerCase('fr-FR') + texte.slice(1)
    : texte
}

// ═══ Passage biblique ════════════════════════════════════════════════════════
//
// Le rapport qu'un passage entretient avec le corpus patristique n'est pas d'une
// seule sorte : la charte §9 en distingue quatre (citation, reprise, commentaire
// doctrinal, écho). Le titre nomme la plus forte des sortes PRÉSENTES, et rien
// d'autre : un chapitre que les Pères citent sans le commenter ne s'annonce pas
// « commenté ».

export type NaturePatristique = 'commentaire' | 'citation' | 'echo'

/** La plus forte des natures présentes, ou `null` si le passage n'en a aucune.
 *  Types de `liens_bibliques` : 1 citation, 2 reprise, 3 doctrine, 4 écho. */
export function naturePatristique(types: Iterable<number>): NaturePatristique | null {
  const presents = new Set(types)
  if (presents.has(3)) return 'commentaire'
  if (presents.has(1) || presents.has(2)) return 'citation'
  if (presents.has(4)) return 'echo'
  return null
}

const APPOINT_TITRE: Record<NaturePatristique, string> = {
  commentaire: 'Commentaires des Pères de l’Église',
  citation: 'Citations des Pères de l’Église',
  echo: 'Échos chez les Pères de l’Église',
}

/** « Jean 1 — Commentaires des Pères de l’Église ». Sans nom de site. */
export function titreChapitreBible(reference: string, nature: NaturePatristique | null): string {
  return `${reference} — ${nature ? APPOINT_TITRE[nature] : 'Texte biblique et traductions'}`
}

// Combien d'auteurs une description nomme au plus. Au-delà, la phrase devient un
// catalogue de mots-clés, ce qu'une description ne doit jamais être. Un quatrième
// est toutefois nommé plutôt que compté : « et d'un autre auteur » coûte le même
// nombre de signes et apprend moins.
const AUTEURS_NOMMES = 3

const TOURNURE: Record<NaturePatristique, { avant: string; suite: string }> = {
  commentaire: { avant: 'le texte biblique et les commentaires de', suite: 'et de' },
  citation: { avant: 'le texte biblique, cité par', suite: 'et par' },
  echo: { avant: 'le texte biblique et ses échos chez', suite: 'et chez' },
}

/** « … : le texte biblique et les commentaires de Jean Chrysostome, Augustin
 *  d’Hippone et Origène, et de six autres auteurs. »
 *
 *  `auteurs` est la liste COMPLÈTE de ceux qui sont réellement liés au passage,
 *  déjà classée par l'appelant (les plus anciens d'abord). Servie au chapitre
 *  comme à la péricope : le sujet change, la phrase est la même. */
function phraseDeNature(sujet: string, nature: NaturePatristique, auteurs: readonly string[]): string {
  const { avant, suite } = TOURNURE[nature]
  const tousNommes = auteurs.length <= AUTEURS_NOMMES + 1
  const nommes = tousNommes ? [...auteurs] : auteurs.slice(0, AUTEURS_NOMMES)
  const reste = auteurs.length - nommes.length
  const queue = reste > 0 ? `, ${suite} ${nombreEnLettres(reste)} autres auteurs` : ''
  return couperDescription(`${sujet} : ${avant} ${enumererNoms(nommes)}${queue}.`)
}

/** « Jean 1 : le texte biblique et les commentaires de Jean Chrysostome,
 *  Augustin d’Hippone et Origène, et de six autres auteurs. » */
export function descriptionChapitreBible(
  reference: string,
  nature: NaturePatristique | null,
  auteurs: readonly string[],
): string {
  if (!nature || auteurs.length === 0) {
    return couperDescription(
      `${reference} : le texte du chapitre dans les traductions éditées sur ${NOM_SITE}.`,
    )
  }
  return phraseDeNature(reference, nature, auteurs)
}

// ═══ Péricope ════════════════════════════════════════════════════════════════
//
// Une péricope se cherche sous son NOM (« les noces de Cana ») autant que sous
// sa référence, et le titre porte donc les deux. L'appoint patristique se dit
// plus court qu'ailleurs : la référence occupe déjà la place.

const APPOINT_PERICOPE: Record<NaturePatristique, string> = {
  commentaire: 'commentaires patristiques',
  citation: 'citations patristiques',
  echo: 'échos patristiques',
}

// ⚠️ Le nom d'une péricope peut à lui seul être une phrase : « Mon Dieu, mon
// Dieu, pourquoi m'as-tu abandonné ? ». Avec sa référence, le gabarit du site et
// l'appoint patristique, dix-sept titres passaient cent signes, quand un moteur
// n'en montre qu'une soixantaine. C'est l'APPOINT qui cède, étant le seul des
// trois à n'être ni le nom du passage ni sa référence : au delà de ce seuil, il
// ne serait de toute façon pas lu, et il ferait du titre un catalogue.
const LONGUEUR_TITRE_PERICOPE = 72

/** « Les noces de Cana — Jean 2, 1-11 et commentaires patristiques ». Une
 *  péricope dont aucune occurrence n'est résolue au canon garde son nom seul. */
export function titrePericope(
  nom: string,
  reference: string | null | undefined,
  nature: NaturePatristique | null,
): string {
  const ref = (reference ?? '').trim()
  if (ref && nature) {
    const entier = `${nom} — ${ref} et ${APPOINT_PERICOPE[nature]}`
    return entier.length <= LONGUEUR_TITRE_PERICOPE ? entier : `${nom} — ${ref}`
  }
  if (ref) return `${nom} — ${ref}`
  if (nature) return `${nom} — ${APPOINT_TITRE[nature]}`
  return nom
}

/** La notice fait la meilleure description : elle est propre à cette péricope,
 *  elle se lit comme une phrase, et le titre porte déjà nom et référence. Les
 *  249 péricopes en ont une ; la composition ci-dessous est un filet. */
export function descriptionPericope(
  nom: string,
  options: {
    reference?: string | null
    notice?: string | null
    nature?: NaturePatristique | null
    auteurs?: readonly string[]
  } = {},
): string {
  const notice = (options.notice ?? '').trim()
  if (notice) return couperDescription(notice)
  const ref = (options.reference ?? '').trim()
  const sujet = ref ? `${nom} (${ref})` : nom
  const auteurs = options.auteurs ?? []
  if (options.nature && auteurs.length) return phraseDeNature(sujet, options.nature, auteurs)
  return couperDescription(`${sujet} : le passage biblique et son dossier sur ${NOM_SITE}.`)
}

// ═══ Auteur ══════════════════════════════════════════════════════════════════
//
// Trois états, et trois seulement : l'auteur dont les œuvres portent des liens
// bibliques constitués, celui dont les œuvres sont éditées sans que les liens
// le soient encore, et celui qui n'a sur le site qu'une notice.

export type EtatAuteur = { nbOeuvres: number; aLiensBibliques: boolean }

export function titreAuteur(nom: string, etat: EtatAuteur): string {
  if (etat.nbOeuvres > 0 && etat.aLiensBibliques) return `${nom} — Œuvres et commentaires bibliques`
  if (etat.nbOeuvres > 0) return `${nom} — Œuvres éditées`
  return `${nom} — Notice biographique`
}

/** La notice biographique fait la meilleure description qui soit : elle est
 *  propre à cette page et se lit comme une phrase. À défaut seulement, on
 *  compose à partir de ce que la page porte. */
export function descriptionAuteur(
  nom: string,
  etat: EtatAuteur,
  options: { notice?: string | null; dates?: string | null } = {},
): string {
  const notice = (options.notice ?? '').trim()
  if (notice) return couperDescription(notice)
  const incise = datesEnIncise(options.dates)
  const sujet = incise ? `${nom} (${incise})` : nom
  if (etat.nbOeuvres > 0 && etat.aLiensBibliques) {
    return couperDescription(
      `${sujet} : notice, œuvres éditées et commentaires de l’Écriture sur ${NOM_SITE}.`,
    )
  }
  if (etat.nbOeuvres > 0) {
    return couperDescription(`${sujet} : notice et œuvres éditées sur ${NOM_SITE}.`)
  }
  return couperDescription(`${sujet} : notice biographique sur ${NOM_SITE}.`)
}

// ═══ Œuvre ═══════════════════════════════════════════════════════════════════

/** Les langues d'une œuvre, dédoublonnées, en bas de casse, et RANGÉES : la
 *  langue d'origine d'abord, le français en dernier. C'est l'ordre dans lequel
 *  on parle d'un texte en regard, et il ne dépend pas de celui de la base. */
export function languesOrdonnees(langues: readonly string[]): string[] {
  const propres = [...new Set(langues.map(l => l.trim().toLocaleLowerCase('fr-FR')).filter(Boolean))]
  const francais = propres.filter(l => l === 'français')
  const autres = propres.filter(l => l !== 'français').sort((a, b) => a.localeCompare(b, 'fr'))
  return [...autres, ...francais]
}

/** « latin et français ». */
export function libelleLanguesOeuvre(langues: readonly string[]): string {
  return enumererNoms(languesOrdonnees(langues))
}

export type EtatOeuvre = {
  auteur?: string | null
  /** Langues des textes RÉELLEMENT publics de l'œuvre. */
  langues: readonly string[]
  traducteur?: string | null
  aLiensBibliques?: boolean
  /** Faux quand l'œuvre est répertoriée mais qu'aucun texte n'en est public :
   *  la page ne montre alors qu'un avis, et rien ne doit promettre un texte.
   *  Trois commentaires de Jérôme sont dans ce cas au 2026-08-24. */
  aTexte?: boolean
}

/** « Les Confessions — Augustin d’Hippone : texte latin et français ». La
 *  mention des langues ne paraît qu'à partir de deux, faute de quoi elle
 *  n'apprendrait rien. Sans nom de site. */
export function titreOeuvre(titre: string, etat: EtatOeuvre): string {
  const langues = languesOrdonnees(etat.langues)
  const tete = etat.auteur ? `${titre} — ${etat.auteur}` : titre
  return langues.length >= 2 ? `${tete} : texte ${enumererNoms(langues)}` : tete
}

/** « Les Confessions d’Augustin d’Hippone : le texte intégral en latin et en
 *  français, traduit par Joseph Trabucco, avec ses références bibliques. » */
export function descriptionOeuvre(titre: string, etat: EtatOeuvre): string {
  const langues = languesOrdonnees(etat.langues)
  const sujet = etat.auteur ? `${titre} ${deNom(etat.auteur)}` : titre
  if (etat.aTexte === false) {
    return couperDescription(`${sujet} : œuvre répertoriée sur ${NOM_SITE}, dont le texte n’est pas encore édité.`)
  }
  // « en latin et en français » : la préposition se répète, c'est l'usage.
  const enLangues = langues.length
    ? ` en ${enumererNoms(langues.map((l, i) => (i === 0 ? l : `en ${l}`)))}`
    : ''
  const tete = `le texte intégral${enLangues}`
  const complements = [
    etat.traducteur ? `traduit par ${etat.traducteur}` : null,
    etat.aLiensBibliques ? 'avec ses références bibliques' : null,
  ].filter((m): m is string => !!m)
  // Trop long ? On RETIRE un complément, on ne coupe pas la phrase : une œuvre
  // au titre de cinquante-cinq signes rendait « …, traduit par M. », qui n'est
  // pas une phrase et qui, de surcroît, se lit comme un nom de traducteur.
  for (let gardes = complements.length; gardes > 0; gardes--) {
    const phrase = `${sujet} : ${[tete, ...complements.slice(0, gardes)].join(', ')}.`
    if (phrase.length <= LONGUEUR_DESCRIPTION) return phrase
  }
  return couperDescription(`${sujet} : ${tete}.`)
}

// ═══ En-têtes de partage ═════════════════════════════════════════════════════
//
// ⚠️ `openGraph` et `twitter` ne se FUSIONNENT PAS avec ceux du layout racine :
// une page qui en déclare un le remplace ENTIÈREMENT (doc Next, « Merging »).
// Une page qui ne veut que changer le titre doit donc reposer l'image, le type
// et le nom du site — c'est le rôle de cette fonction.
const IMAGE_PARTAGE = { url: '/og-image.png', width: 1200, height: 630, alt: NOM_SITE }

export function enTetesPartage(titre: string, description: string) {
  return {
    openGraph: {
      type: 'website' as const,
      locale: 'fr_FR',
      siteName: NOM_SITE,
      title: titre,
      description,
      images: [IMAGE_PARTAGE],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: titre,
      description,
      images: [IMAGE_PARTAGE.url],
    },
  }
}
