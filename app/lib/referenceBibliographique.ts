/**
 * LE MOTEUR DE RENDU BIBLIOGRAPHIQUE — la seule logique du site (charte § 35.6.1 et
 * § 35.6.2, étendus le 5 septembre 2026).
 *
 * Il reçoit une NOTICE — les champs structurés d'un ouvrage, ses contributeurs et ses
 * éditeurs déjà résolus sur leurs autorités — et rend des FRAGMENTS typés : ce que
 * chacun EST (le champ d'origine, la fonction bibliographique) et comment il se
 * compose (romain, italique, petites capitales). La ponctuation, les liants — « dans »,
 * « éd. », « trad. », « dir. », « coll. », « p. » — et les guillemets sont des
 * fragments SANS champ ni style : ils appartiennent à la séquence où ils tombent et
 * en héritent la composition.
 *
 * ⛔ Rien ne se devine ici : pas de découpe d'une chaîne précomposée, pas de
 * dictionnaire d'éditeurs, pas d'expression régulière pour reconnaître un nom. Ce qui
 * n'est pas dans un champ n'est pas affiché, et un champ absent emporte son
 * séparateur. Un point final, et un seul, ferme la notice.
 *
 * Les quatre SURFACES qui composent une notice passent toutes par ici : la liste
 * structurée d'une pièce liminaire (Fillion, par l'adaptateur de
 * `bibleBibliographieOuvrages.ts`), l'apparat d'une œuvre dont un segment porte un
 * `ouvrage_id` (Boèce), la bibliographie d'une péricope, et la fiche d'un ouvrage
 * dans l'administration. Une règle qui changerait ici change partout, et c'est le but.
 *
 * Module PUR : ni React, ni Supabase. Testé dans `referenceBibliographique.test.ts`.
 */

import type { StyleCaractereBibliographie } from './apparatBibliographie'
import { SEPARATEUR_COEDITEURS } from './editeursNormalisation'

/**
 * La FORME d'une notice décide de sa composition, non de sa valeur scientifique
 * (qui est `type_ouvrage`). `monographie` : titre en italique. Les trois autres :
 * titre en romain entre guillemets, puis l'hôte en italique — précédé de « dans »
 * pour un collectif ou un dictionnaire, jamais pour un périodique.
 */
export const FORMES_NOTICE = [
  'monographie', 'article_periodique', 'contribution_collectif', 'entree_dictionnaire',
] as const
export type FormeNotice = typeof FORMES_NOTICE[number]

export type RoleContributeur =
  | 'auteur_scientifique' | 'auteur_source' | 'editeur_scientifique' | 'traducteur' | 'directeur'

/** Ce que la base dit de la personne. `inconnue` : un nom en texte libre, sans fiche. */
export type NaturePersonne = 'chercheur' | 'auteur_ancien' | 'collectif' | 'inconnue'

export type ContributeurNotice = {
  role: RoleContributeur
  nature: NaturePersonne
  ordre: number
  /** La forme que la notice affiche (`nom_affiche`). */
  nomAffiche: string
  /** Les rubriques de l'autorité (`auteurs_valeur`), quand la personne en a une. */
  prenom?: string | null
  nomFamille?: string | null
  pseudonyme?: string | null
  /** La forme d'autorité entière (`auteurs_valeur.nom`, ou `auteurs.nom` pour un ancien). */
  nomAutorite?: string | null
}

export type EditeurNotice = {
  rang: number
  /** `editeur`, `coediteur`, `imprimeur` se composent ; `diffuseur` et `reimprimeur` non. */
  role: string
  nom: string
}

/** La notice telle que le moteur la lit — l'adaptation de la vue
 *  `v_references_bibliographiques`, ou d'une autre source qui en dit autant. */
export type NoticeBibliographique = {
  id: number
  forme: FormeNotice | null
  titre: string
  sousTitre: string | null
  titreHote: string | null
  tomaison: string | null
  pages: string | null
  dateAffichee: string | null
  annee: number | null
  lieu: string | null
  editeurs: EditeurNotice[]
  collection: string | null
  numeroCollection: string | null
  contributeurs: ContributeurNotice[]
  /** Les REPLIS en texte libre, quand aucun contributeur structuré ne porte le rôle. */
  auteursTexte: string | null
  directeursTexte: string | null
  traducteursTexte: string | null
  langue?: string | null
}

/**
 * Le champ d'origine d'un fragment. Il reste dans le document (`data-champ`) : c'est
 * par lui qu'on vérifie qu'un titre et son sous-titre n'ont pas été fondus, et
 * qu'aucune donnée matérielle ne s'est glissée dans la référence.
 * ⚠️ Un nom d'autorité composé ENTIER porte `nom_famille` : c'est la partie du nom
 * qui prend les petites capitales, qu'elle se distingue d'un prénom ou non.
 */
export type ChampReference =
  | 'prenom' | 'nom_famille' | 'auteurs'
  | 'titre' | 'sous_titre' | 'titre_hote' | 'tomaison' | 'pages'
  | 'editeur_scientifique' | 'traducteur' | 'directeur'
  | 'collection' | 'numero_collection'
  | 'lieu' | 'editeur' | 'annee' | 'date_affichee'
  | 'mention_edition' | 'depot_manuscrit' | 'cote_manuscrit'

export type FragmentNotice = {
  champ: ChampReference | null
  style: StyleCaractereBibliographie | null
  composition: 'romain' | 'italique' | 'petites-capitales'
  texte: string
}

// Le POINT qui détache un sous-titre de son titre, et la virgule qui sépare les
// mentions d'une même notice (charte § 35.6.1). ⚠️ Décision de l'auteur du 28 août
// 2026 : un sous-titre EST un sous-titre, non une apposition — il se détache par un
// POINT, ⛔ ni deux-points, ni virgule. Un intitulé qui se ferme déjà sur une
// ponctuation forte ne reçoit pas un second point (charte § 3.4).
export const LIAISON_SOUS_TITRE = '. '
export const SEPARATEUR = ', '
export const PONCTUATION_FORTE = /[.!?…]$/u

// Les guillemets FRANÇAIS d'un titre d'article, avec leurs fines insécables (U+202F),
// et l'insécable (U+00A0) qui suit « p. ». Écrits par leur point de code : tapés,
// ils ne se distinguent pas d'une espace, et le dépôt en a déjà perdu ainsi.
const FINE = String.fromCharCode(0x202f)
const INSECABLE = String.fromCharCode(0x00a0)
export const GUILLEMET_OUVRANT = '«' + FINE
export const GUILLEMET_FERMANT = FINE + '»'
const TIRET_DE_PLAGE = String.fromCharCode(0x2013)

/** Un champ propre : blancs de bord ôtés, blancs répétés réduits ; `null` s'il ne reste rien. */
export function propre(valeur: string | null | undefined): string | null {
  const texte = (valeur ?? '').replace(/ {2,}/gu, ' ').trim()
  return texte ? texte : null
}

/** Une plage de pages s'écrit avec le tiret demi-cadratin : « 330–360 ». Une page seule
 *  reste telle quelle. ⚠️ On ne touche qu'au tiret ENTRE deux nombres. */
export function pagesLisibles(pages: string | null | undefined): string | null {
  const texte = propre(pages)
  if (!texte) return null
  return texte.replace(/([0-9]) ?[-–—] ?([0-9])/gu, '$1' + TIRET_DE_PLAGE + '$2')
}

/**
 * La forme effective : celle que la notice déclare, sinon celle que ses champs disent —
 * un titre hôte fait un article, faute de quoi c'est une monographie. ⚠️ Le repli
 * choisit le périodique, qui ne pose pas de « dans » : mieux vaut un liant en moins
 * qu'un liant faux.
 */
export function formeDeLaNotice(notice: Pick<NoticeBibliographique, 'forme' | 'titreHote'>): FormeNotice {
  if (notice.forme) return notice.forme
  return propre(notice.titreHote) ? 'article_periodique' : 'monographie'
}

/** Deux intitulés qui ne diffèrent que par la casse ou les blancs disent la même chose. */
function memeIntitule(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = propre(a), y = propre(b)
  return Boolean(x && y) && (x as string).toLowerCase() === (y as string).toLowerCase()
}
const ponctuation = (texte: string, composition: FragmentNotice['composition'] = 'romain'): FragmentNotice =>
  ({ champ: null, style: null, composition, texte })

const donnee = (champ: ChampReference, texte: string): FragmentNotice =>
  ({ champ, style: 'bibliographie-donnees', composition: 'romain', texte })

/** « A », « A et B », « A, B et C » : les fragments des personnes, joints à la française. */
function enumerer(personnes: FragmentNotice[][]): FragmentNotice[] {
  const fragments: FragmentNotice[] = []
  personnes.forEach((personne, rang) => {
    if (rang > 0) fragments.push(ponctuation(rang === personnes.length - 1 ? ' et ' : SEPARATEUR))
    fragments.push(...personne)
  })
  return fragments
}

/**
 * Un AUTEUR, en tête de notice (charte § 35.6.1).
 *
 * Un chercheur dont l'autorité porte prénom et nom de famille : le prénom en romain,
 * le nom en PETITES CAPITALES. Une autorité que ce couple ne décrit pas — un ancien,
 * un médiéval, une fiche sans rubriques — se compose ENTIÈRE en petites capitales,
 * ⛔ jamais coupée à la première espace. Un collectif n'est pas une personne : romain.
 * ⛔ Un nom en TEXTE LIBRE, sans fiche, reste en romain : les petites capitales viennent
 * de la donnée structurée, jamais d'une heuristique sur la chaîne.
 */
function composerAuteur(c: ContributeurNotice): FragmentNotice[] {
  const prenom = propre(c.prenom)
  const nomFamille = propre(c.nomFamille)
  if (c.nature === 'chercheur' && prenom && nomFamille) {
    return [
      { champ: 'prenom', style: 'bibliographie-auteur', composition: 'romain', texte: prenom },
      ponctuation(' '),
      { champ: 'nom_famille', style: 'bibliographie-nom-auteur', composition: 'petites-capitales', texte: nomFamille },
    ]
  }
  const entier = propre(c.nomAutorite) ?? propre(c.nomAffiche) ?? ''
  if (!entier) return []
  if (c.nature === 'chercheur' || c.nature === 'auteur_ancien') {
    return [{ champ: 'nom_famille', style: 'bibliographie-nom-auteur', composition: 'petites-capitales', texte: entier }]
  }
  return [{ champ: 'auteurs', style: 'bibliographie-auteur', composition: 'romain', texte: entier }]
}

/** Une personne citée APRÈS le titre (éd., trad., dir.) : « Prénom Nom » en romain. */
function nomDePersonne(c: ContributeurNotice): string {
  const prenom = propre(c.prenom)
  const nomFamille = propre(c.nomFamille)
  if (prenom && nomFamille) return `${prenom} ${nomFamille}`
  return propre(c.nomAutorite) ?? propre(c.nomAffiche) ?? ''
}

/** Les noms d'un champ libre du catalogue, séparés par « ; » (charte § 5). */
function nomsDuTexte(texte: string | null): string[] {
  return (texte ?? '').split(';').map(n => propre(n)).filter((n): n is string => Boolean(n))
}

const LIANT_PAR_ROLE: Record<'editeur_scientifique' | 'traducteur' | 'directeur', string> = {
  editeur_scientifique: 'éd. ',
  traducteur: 'trad. ',
  directeur: 'dir. ',
}

/**
 * Les mentions de responsabilité secondaire — « éd. X », « trad. X », « dir. X » —
 * depuis les contributeurs structurés, sinon depuis le texte libre de la notice.
 * Le liant est un fragment sans champ ; chaque nom porte le champ de son rôle.
 */
function mentionsDeRole(
  notice: NoticeBibliographique,
  role: 'editeur_scientifique' | 'traducteur' | 'directeur',
): FragmentNotice[] {
  const structures = notice.contributeurs
    .filter(c => c.role === role)
    .sort((a, b) => a.ordre - b.ordre)
    .map(nomDePersonne)
    .filter(Boolean)
  const noms = structures.length > 0
    ? structures
    : role === 'traducteur' ? nomsDuTexte(notice.traducteursTexte)
      : role === 'directeur' ? nomsDuTexte(notice.directeursTexte)
        : []
  if (noms.length === 0) return []
  return [
    ponctuation(SEPARATEUR),
    ponctuation(LIANT_PAR_ROLE[role]),
    ...enumerer(noms.map(nom => [donnee(role, nom)])),
  ]
}

/**
 * L'ÉDITEUR du lieu : les maisons liées par rang (éditeur, coéditeur, imprimeur),
 * jointes par la barre à fines de la charte § 35.6.4 — jamais le point-virgule du
 * catalogue. Un diffuseur ou un réimprimeur n'est pas l'éditeur de l'ouvrage.
 */
function fragmentsEditeurs(notice: NoticeBibliographique): FragmentNotice[] {
  const maisons = [...notice.editeurs]
    .filter(e => ['editeur', 'coediteur', 'imprimeur'].includes(e.role) && propre(e.nom))
    .sort((a, b) => a.rang - b.rang)
  const fragments: FragmentNotice[] = []
  maisons.forEach((maison, rang) => {
    if (rang > 0) fragments.push(ponctuation(SEPARATEUR_COEDITEURS))
    fragments.push(donnee('editeur', propre(maison.nom) as string))
  })
  return fragments
}

export type OptionsReference = {
  /** L'auteur paraît en tête. Faux quand le titre de la pièce l'établit déjà pour toutes
   *  ses entrées (« Du même auteur », charte § 35.6.1). */
  avecAuteur?: boolean
}

/**
 * La référence, fragment par fragment.
 *
 * Ordre : auteur(s) ; titre — italique pour une monographie, « en romain » puis l'hôte
 * en italique et sa tomaison pour un article ou une contribution ; éd., trad., dir. ;
 * collection ; lieu, éditeur(s), date ; pages ; point final. Un champ absent emporte
 * son séparateur : sans lieu, « Titre, Éditeur, 1887. » et non « Titre, , Éditeur ».
 * ⛔ Sans titre, il n'y a pas de référence : la fonction rend une liste vide.
 */
export function fragmentsReference(
  notice: NoticeBibliographique,
  options: OptionsReference = {},
): FragmentNotice[] {
  const titre = propre(notice.titre)
  if (!titre) return []
  const avecAuteur = options.avecAuteur ?? true
  const fragments: FragmentNotice[] = []
  let directeursEnTete = false

  // ── La tête : les auteurs, sinon le texte libre, sinon la direction ───────────
  if (avecAuteur) {
    const auteurs = notice.contributeurs
      .filter(c => c.role === 'auteur_scientifique' || c.role === 'auteur_source')
      .sort((a, b) => a.ordre - b.ordre)
      .map(composerAuteur)
      .filter(f => f.length > 0)
    const auteursTexte = propre(notice.auteursTexte)
    if (auteurs.length > 0) {
      fragments.push(...enumerer(auteurs), ponctuation(SEPARATEUR))
    } else if (auteursTexte) {
      fragments.push({ champ: 'auteurs', style: 'bibliographie-auteur', composition: 'romain', texte: auteursTexte })
      fragments.push(ponctuation(SEPARATEUR))
    } else {
      const direction = mentionsDeRole(notice, 'directeur')
      if (direction.length > 0) {
        // Sans auteur, l'ouvrage collectif s'ouvre sur sa direction : « dir. X, Titre ».
        fragments.push(...direction.slice(1), ponctuation(SEPARATEUR))
        directeursEnTete = true
      }
    }
  }

  // ── L'intitulé ────────────────────────────────────────────────────────────────
  const forme = formeDeLaNotice(notice)
  const sousTitre = propre(notice.sousTitre)
  if (forme === 'monographie') {
    fragments.push({ champ: 'titre', style: 'bibliographie-titre-ouvrage', composition: 'italique', texte: titre })
    if (sousTitre) {
      // Le point de liaison n'a pas de style à lui : il reste dans la séquence
      // italique du titre, dont il est la charnière.
      fragments.push(ponctuation(PONCTUATION_FORTE.test(titre) ? ' ' : LIAISON_SOUS_TITRE, 'italique'))
      fragments.push({ champ: 'sous_titre', style: 'bibliographie-sous-titre', composition: 'italique', texte: sousTitre })
    }
  } else {
    // ⚠️ Les guillemets appartiennent au français qui cite : romain, avec leurs fines.
    fragments.push(ponctuation(GUILLEMET_OUVRANT))
    fragments.push({ champ: 'titre', style: 'bibliographie-titre-article', composition: 'romain', texte: titre })
    if (sousTitre) {
      fragments.push(ponctuation(PONCTUATION_FORTE.test(titre) ? ' ' : LIAISON_SOUS_TITRE))
      fragments.push({ champ: 'sous_titre', style: 'bibliographie-titre-article', composition: 'romain', texte: sousTitre })
    }
    fragments.push(ponctuation(GUILLEMET_FERMANT))
    const titreHote = propre(notice.titreHote)
    if (titreHote) {
      fragments.push(ponctuation(SEPARATEUR))
      // « dans » pour l'ouvrage collectif et le dictionnaire ; un périodique se nomme seul.
      if (forme !== 'article_periodique') fragments.push(ponctuation('dans '))
      fragments.push({ champ: 'titre_hote', style: 'bibliographie-titre-hote', composition: 'italique', texte: titreHote })
    }
  }

  // ── Les responsabilités secondaires ───────────────────────────────────────────
  fragments.push(...mentionsDeRole(notice, 'editeur_scientifique'))
  fragments.push(...mentionsDeRole(notice, 'traducteur'))
  if (!directeursEnTete) fragments.push(...mentionsDeRole(notice, 'directeur'))

  // La tomaison suit l'hôte et ses responsables : « …, dir. X, 1re section, t. XI ».
  const tomaison = propre(notice.tomaison)
  if (forme !== 'monographie' && tomaison) {
    fragments.push(ponctuation(SEPARATEUR), donnee('tomaison', tomaison))
  }

  // ── La collection, à la manière du site : « coll. « X », n » ─────────────────
  // ⛔ Une « collection » qui REDIT l’hôte n’en est pas une : c’est l’hôte rangé dans la
  // mauvaise colonne (vu sur les trois articles de Boèce, dont l’autorité de collection
  // portait le titre du périodique). Elle ne se compose pas une seconde fois.
  const collection = propre(notice.collection)
  if (collection && !memeIntitule(collection, notice.titreHote)) {
    fragments.push(ponctuation(SEPARATEUR), ponctuation('coll. ' + GUILLEMET_OUVRANT))
    fragments.push(donnee('collection', collection))
    fragments.push(ponctuation(GUILLEMET_FERMANT))
    const numero = propre(notice.numeroCollection)
    if (numero) fragments.push(ponctuation(SEPARATEUR), donnee('numero_collection', numero))
  }

  // ── L'adresse : lieu, éditeur(s), date ───────────────────────────────────────
  const lieu = propre(notice.lieu)
  if (lieu) fragments.push(ponctuation(SEPARATEUR), donnee('lieu', lieu))
  const editeurs = fragmentsEditeurs(notice)
  if (editeurs.length > 0) fragments.push(ponctuation(SEPARATEUR), ...editeurs)
  const dateAffichee = propre(notice.dateAffichee)
  if (dateAffichee) fragments.push(ponctuation(SEPARATEUR), donnee('date_affichee', dateAffichee))
  else if (typeof notice.annee === 'number') fragments.push(ponctuation(SEPARATEUR), donnee('annee', String(notice.annee)))

  // ── Les pages de la contribution dans son hôte ────────────────────────────────
  const pages = pagesLisibles(notice.pages)
  if (pages) fragments.push(ponctuation(SEPARATEUR), ponctuation('p.' + INSECABLE), donnee('pages', pages))

  // ── Le point final, un seul ───────────────────────────────────────────────────
  const dernier = fragments[fragments.length - 1]
  if (!PONCTUATION_FORTE.test(dernier.texte)) fragments.push(ponctuation('.'))
  return fragments
}

/** La référence en texte nu : ce que le lecteur lit, sans sa composition. Sert les
 *  tests et les métadonnées, ⛔ jamais le rendu, qui compose ses fragments. */
export function texteReference(notice: NoticeBibliographique, options: OptionsReference = {}): string {
  return fragmentsReference(notice, options).map(f => f.texte).join('')
}

// ── Depuis la base ────────────────────────────────────────────────────────────

/** Une ligne de `v_references_bibliographiques`, telle que PostgREST la sert. */
export type LigneVueReference = {
  ouvrage_id: number
  type_ouvrage?: string | null
  forme_notice: string | null
  titre: string
  sous_titre: string | null
  titre_hote: string | null
  tomaison: string | null
  pages: string | null
  date_affichee: string | null
  annee: number | null
  lieu: string | null
  collection: string | null
  numero_collection: string | null
  langue?: string | null
  auteurs_texte: string | null
  directeurs_texte: string | null
  traducteurs_texte: string | null
  editeur: string | null
  editeurs_lies: unknown
  contributeurs: unknown
}

const ROLES: readonly RoleContributeur[] = ['auteur_scientifique', 'auteur_source', 'editeur_scientifique', 'traducteur', 'directeur']
const NATURES: readonly NaturePersonne[] = ['chercheur', 'auteur_ancien', 'collectif']

function chaine(v: unknown): string | null {
  return typeof v === 'string' ? propre(v) : null
}

/** La liste JSON d'une colonne agrégée, tolérante : autre chose qu'un tableau vaut vide. */
function liste(v: unknown): Record<string, unknown>[] {
  const brut = typeof v === 'string' ? (() => { try { return JSON.parse(v) as unknown } catch { return null } })() : v
  return Array.isArray(brut) ? brut.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object') : []
}

/** La notice que le moteur lit, depuis la vue. Un rôle ou une nature inconnus sont
 *  écartés ou rabattus sur « inconnue » : le rendu ne compose que ce qu'il sait nommer. */
export function noticeDepuisVue(ligne: LigneVueReference): NoticeBibliographique {
  const contributeurs: ContributeurNotice[] = liste(ligne.contributeurs).flatMap((c, rang) => {
    const role = ROLES.find(r => r === c.role)
    const nomAffiche = chaine(c.nom_affiche) ?? chaine(c.nom_autorite)
    if (!role || !nomAffiche) return []
    const nature = NATURES.find(n => n === c.nature) ?? 'inconnue'
    const ordre = typeof c.ordre === 'number' ? c.ordre : rang + 1
    return [{
      role, nature, ordre, nomAffiche,
      prenom: chaine(c.prenom), nomFamille: chaine(c.nom_famille), pseudonyme: chaine(c.pseudonyme),
      nomAutorite: chaine(c.nom_autorite),
    }]
  })
  const lies: EditeurNotice[] = liste(ligne.editeurs_lies).flatMap((e, rang) => {
    const nom = chaine(e.nom)
    if (!nom) return []
    return [{ rang: typeof e.rang === 'number' ? e.rang : rang + 1, role: chaine(e.role) ?? 'editeur', nom }]
  })
  const editeur = chaine(ligne.editeur)
  const forme = FORMES_NOTICE.find(f => f === ligne.forme_notice) ?? null
  return {
    id: ligne.ouvrage_id,
    forme,
    titre: chaine(ligne.titre) ?? '',
    sousTitre: chaine(ligne.sous_titre),
    titreHote: chaine(ligne.titre_hote),
    tomaison: chaine(ligne.tomaison),
    pages: chaine(ligne.pages),
    dateAffichee: chaine(ligne.date_affichee),
    annee: typeof ligne.annee === 'number' ? ligne.annee : null,
    lieu: chaine(ligne.lieu),
    // Les maisons liées font foi ; l'éditeur de la notice n'est que le repli.
    editeurs: lies.length > 0 ? lies : editeur ? [{ rang: 1, role: 'editeur', nom: editeur }] : [],
    collection: chaine(ligne.collection),
    numeroCollection: chaine(ligne.numero_collection),
    contributeurs,
    auteursTexte: chaine(ligne.auteurs_texte),
    directeursTexte: chaine(ligne.directeurs_texte),
    traducteursTexte: chaine(ligne.traducteurs_texte),
    langue: chaine(ligne.langue),
  }
}

/** Les champs LIBRES d'une notice, quand la vue n'est pas là (un formulaire en cours
 *  de saisie, une vue qui ne porte pas les autorités) : aucune petite capitale, la
 *  ponctuation et l'ordre restent ceux du moteur. */
export type ChampsLibresNotice = {
  id?: number | null
  forme_notice?: string | null
  titre?: string | null
  sous_titre?: string | null
  titre_hote?: string | null
  tomaison?: string | null
  pages?: string | null
  date_affichee?: string | null
  auteurs?: string | null
  directeurs?: string | null
  traducteurs?: string | null
  collection?: string | null
  numero_collection?: string | null
  lieu?: string | null
  editeur?: string | null
  annee?: number | null
}

export function noticeDepuisChampsLibres(champs: ChampsLibresNotice): NoticeBibliographique {
  return noticeDepuisVue({
    ouvrage_id: champs.id ?? 0,
    forme_notice: champs.forme_notice ?? null,
    titre: champs.titre ?? '',
    sous_titre: champs.sous_titre ?? null,
    titre_hote: champs.titre_hote ?? null,
    tomaison: champs.tomaison ?? null,
    pages: champs.pages ?? null,
    date_affichee: champs.date_affichee ?? null,
    annee: champs.annee ?? null,
    lieu: champs.lieu ?? null,
    collection: champs.collection ?? null,
    numero_collection: champs.numero_collection ?? null,
    auteurs_texte: champs.auteurs ?? null,
    directeurs_texte: champs.directeurs ?? null,
    traducteurs_texte: champs.traducteurs ?? null,
    editeur: champs.editeur ?? null,
    editeurs_lies: [],
    contributeurs: [],
  })
}

/** L'identifiant d'ouvrage porté par une métadonnée (`segment_metadata.ouvrage_id`,
 *  servi en TEXTE par PostgREST) : un entier positif, ou rien. */
export function identifiantOuvrage(valeur: unknown): number | null {
  const n = typeof valeur === 'number' ? valeur : typeof valeur === 'string' && valeur.trim() ? Number(valeur) : NaN
  return Number.isInteger(n) && n > 0 ? n : null
}
