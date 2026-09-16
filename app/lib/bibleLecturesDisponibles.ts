/**
 * CE QUE LE VOLET D'UNE ŒUVRE SAIT LIRE, et sous quel nom il le propose.
 *
 * Le volet de droite d'une page Œuvre montre les versets cités par le passage qu'on
 * lit. Il ne lisait qu'une source, la vue large `versets_lecture`, et son menu ne
 * pouvait donc offrir que les cinq bibles qu'elle matérialise — aucune n'appartenant
 * à une famille d'édition, aucun sous-menu n'y paraissait jamais. Décision de
 * l'auteur, 16 septembre 2026 : « reprendre le menu de la page Bible classique,
 * permettre de choisir, via sous-menu déroulant, les modes alternatifs d'une même
 * trad (diplomatique, latin, français, etc.) ».
 *
 * Une LECTURE est donc le couple que le lecteur choisit vraiment : une traduction,
 * et — quand le témoin en porte plusieurs — la graphie dans laquelle on la lit. Les
 * deux ne font qu'une entrée de menu, parce que dans ce volet elles répondent à la
 * même question : quel texte veut-on voir sous la référence ?
 *
 * ⛔ LE CHEMIN EST UN FAIT, JAMAIS UNE DEVINETTE SUR L'IDENTIFIANT. Une bible se lit
 * là où son texte se trouve : colonne de la vue large, table canonique `versets_v2`,
 * vue de recomposition du témoin 899, ou tables éditoriales. Ce module reçoit ce que
 * la page a observé et en déduit le chemin ; le jour où une édition change de place,
 * c'est l'observation qui bouge, non une liste écrite ici.
 *
 * ⛔ LE REGROUPEMENT EN FAMILLES N'EST PAS REFAIT ICI : les lectures sortent avec
 * leur appartenance (`famille`), et `menuTraductionsBible.entreesDuMenu` les réunit
 * comme il réunit celles de la page Bible. Une seule composition pour les deux pages,
 * sous peine de voir les mêmes bibles rangées de deux façons selon l'endroit.
 *
 * Module pur, testé par bibleLecturesDisponibles.test.ts.
 */

import { coucheDefaut899, TRAD_ID_BIBLE899, type Couche899 } from './bible899'
import type { AppartenanceFamille, BibleDuMenu } from './menuTraductionsBible'

/** Où le texte d'une lecture se prend. */
export type CheminDeLecture =
  /** Une colonne de la vue large `versets_lecture` : le volet l'a déjà en mémoire. */
  | 'canonique'
  /** Une traduction rangée par le canon dans `versets_v2` (la Bible du XIIIe moderne). */
  | 'v2'
  /** Le témoin 899, recomposé par sa vue, graphie par graphie. */
  | 'temoin899'
  /** Une édition segmentée : alignements, segments, unités-source (Fillion). */
  | 'editoriale'

/**
 * Une entrée du menu des bibles du volet.
 *
 * ⚠️ `code` est la CLÉ DU MENU, et non l'identifiant de la traduction : deux graphies
 * d'un même témoin sont deux entrées, et se distinguent par lui. Ce qui part dans une
 * adresse, dans un signet ou dans la préférence du lecteur reste `tradId`.
 */
export type LectureBiblique = BibleDuMenu & {
  tradId: string
  /** La graphie lue ; `null` quand la bible n'en offre qu'une. */
  couche: Couche899 | null
  chemin: CheminDeLecture
  /** Les sources de l'édition, pour le chemin éditorial. Vide ailleurs. */
  sourceIds: readonly string[]
}

/** Une ligne du catalogue des éditions, réduite à ce que ce module en tire. */
export type AppartenanceCatalogue = {
  tradId: string
  familleId: string
  role: string
  rang: number
  sourceId: string
}

/** Ce que la page a observé. Aucun de ces faits n'est déduit d'un identifiant. */
export type FaitsDesBibles = {
  /** Les notices bibliques de `traductions`, dans leur ordre de catalogue. */
  traductions: readonly { code: string; label: string }[]
  /** Les codes réellement matérialisés en colonnes de `versets_lecture`. */
  colonnesVersetsLecture: readonly string[]
  /** Le catalogue des éditions : famille, rôle, rang, sources. */
  catalogue: readonly AppartenanceCatalogue[]
  /** Les traductions dont le catalogue annonce une lecture par verset DISPONIBLE. */
  lisiblesEditorialement: ReadonlySet<string>
  /** Celles que `livres_par_traduction` porte, et qui se lisent donc par le canon. */
  lisiblesParLeCanon: ReadonlySet<string>
  /** Les graphies que la vue de recomposition expose vraiment. */
  couches899: readonly Couche899[]
}

/**
 * Le nom d'une graphie, tel qu'il s'ajoute au nom de la bible.
 *
 * ⚠️ Il porte le mot « graphie » ou « abréviations », que la page Bible laisse à
 * l'étiquette de son groupe (« Graphie : Diplomatique »). Ici il n'y a pas de groupe :
 * l'entrée doit se suffire, sinon « Diplomatique » paraît seul sous un nom de bible et
 * ne dit plus de quoi il est le mode.
 */
const NOM_DE_GRAPHIE: Record<Couche899, string> = {
  diplomatic: 'graphie diplomatique',
  expanded: 'abréviations développées',
  modernized: 'graphie modernisée',
}

/**
 * L'ordre des graphies dans le sous-menu : la plus aisée d'abord, la plus fidèle au
 * témoin ensuite — le même que celui du menu « Graphie » de la page Bible.
 */
const ORDRE_DES_GRAPHIES: readonly Couche899[] = ['modernized', 'expanded', 'diplomatic']

/**
 * Les graphies à proposer, la lecture ordinaire en tête.
 *
 * ⛔ Une seule graphie n'est pas un choix : la bible garde alors son nom nu, et le
 * volet ne montre aucune variante. C'est la règle du menu « occasionnel » de la page
 * Bible, et elle vaut ici pour la même raison.
 */
export function graphiesDuTemoin(disponibles: readonly Couche899[]): Couche899[] {
  const presentes = ORDRE_DES_GRAPHIES.filter((couche) => disponibles.includes(couche))
  if (presentes.length < 2) return []
  const defaut = coucheDefaut899(presentes)
  return [defaut, ...presentes.filter((couche) => couche !== defaut)]
}

/**
 * Le chemin par lequel une traduction se lit, ou `null` si le volet ne sait pas la lire.
 *
 * ⛔ L'ORDRE DES ÉPREUVES COMPTE. Le témoin 899 est à la fois une édition segmentée et
 * une vue de recomposition ; c'est la vue qu'on lit, parce qu'elle seule sait rendre
 * les suppressions du manuscrit (`<del>`) comme la page Bible les rend. La colonne de
 * la vue large passe avant tout : le volet l'a déjà chargée avec le texte de la page.
 */
export function cheminDeLecture(code: string, faits: FaitsDesBibles): CheminDeLecture | null {
  if (faits.colonnesVersetsLecture.includes(code)) return 'canonique'
  if (code === TRAD_ID_BIBLE899 && faits.lisiblesEditorialement.has(code)) return 'temoin899'
  if (faits.lisiblesEditorialement.has(code)) return 'editoriale'
  if (faits.lisiblesParLeCanon.has(code)) return 'v2'
  return null
}

/**
 * Les lectures que le volet peut offrir, dans l'ordre du catalogue des traductions.
 *
 * ⚠️ Le rang de famille est MULTIPLIÉ par dix avant qu'on y ajoute celui de la
 * graphie : les graphies d'un même texte se suivent ainsi dans le sous-menu, sans
 * jamais s'intercaler entre deux membres de la famille.
 */
export function lecturesDisponibles(faits: FaitsDesBibles): LectureBiblique[] {
  const parTrad = new Map<string, AppartenanceCatalogue[]>()
  for (const ligne of faits.catalogue) {
    parTrad.set(ligne.tradId, [...(parTrad.get(ligne.tradId) ?? []), ligne])
  }

  const lectures: LectureBiblique[] = []
  for (const traduction of faits.traductions) {
    const chemin = cheminDeLecture(traduction.code, faits)
    if (chemin === null) continue
    const lignes = parTrad.get(traduction.code) ?? []
    const sourceIds = [...new Set(lignes.map((ligne) => ligne.sourceId))]
    const premiere = lignes[0]
    const famille = (cle: string, rang: number): AppartenanceFamille | null =>
      premiere ? { cle, role: premiere.role, rang } : null

    // Une bible à graphie unique : une entrée, sous son nom de catalogue.
    const graphies = chemin === 'temoin899' ? graphiesDuTemoin(faits.couches899) : []
    if (graphies.length === 0) {
      lectures.push({
        code: traduction.code,
        label: traduction.label,
        famille: premiere ? famille(premiere.familleId, premiere.rang * 10) : null,
        tradId: traduction.code,
        couche: chemin === 'temoin899' ? coucheDefaut899(faits.couches899) : null,
        chemin,
        sourceIds,
      })
      continue
    }

    // ⛔ La lecture ORDINAIRE garde le nom nu de la bible : c'est elle qu'on ouvre
    // quand on choisit la famille, et la nommer « abréviations développées » ferait
    // passer l'état ordinaire du texte pour une curiosité d'atelier.
    graphies.forEach((couche, rangGraphie) => {
      const ordinaire = rangGraphie === 0
      lectures.push({
        code: ordinaire ? traduction.code : `${traduction.code}:${couche}`,
        label: ordinaire ? traduction.label : `${traduction.label}, ${NOM_DE_GRAPHIE[couche]}`,
        famille: premiere ? famille(premiere.familleId, premiere.rang * 10 + rangGraphie) : null,
        tradId: traduction.code,
        couche,
        chemin,
        sourceIds,
      })
    })
  }
  return lectures
}

/**
 * Le rang d'une lecture demandée par son code, `-1` si elle n'est pas offerte.
 *
 * ⚠️ Une préférence enregistrée — celle du profil, celle du navigateur — ne retient
 * que la TRADUCTION, et c'est bien ainsi : le lecteur choisit une bible pour de bon,
 * une graphie pour le temps d'un passage. Un code de traduction retombe donc sur sa
 * lecture ORDINAIRE, celle dont le code n'est pas suffixé, jamais sur une graphie
 * qu'on ne lui a pas demandée.
 */
export function rangDeLaLecture(lectures: readonly LectureBiblique[], code: string | null): number {
  if (!code) return -1
  const exacte = lectures.findIndex((lecture) => lecture.code === code)
  if (exacte >= 0) return exacte
  return lectures.findIndex((lecture) => lecture.tradId === code && lecture.code === lecture.tradId)
}

/** Le repli quand aucune lecture ne répond : la vue large, qui est toujours là. */
export const LECTURE_DE_REPLI: LectureBiblique = {
  code: 'TR0001',
  label: 'Bible de Sacy',
  famille: null,
  tradId: 'TR0001',
  couche: null,
  chemin: 'canonique',
  sourceIds: [],
}
