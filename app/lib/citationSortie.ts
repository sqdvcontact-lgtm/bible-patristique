// Citations sorties du texte (charte §3.8, cinquième règle). Fonctions PURES,
// testées dans citationSortie.test.ts.
//
// Une citation longue ne se lit pas entre guillemets au fil de la prose : elle se
// détache. Elle perd alors ses guillemets encadrants, et ceux qu'elle contient
// reviennent à la forme française, les guillemets anglais n'ayant plus lieu d'être
// une fois l'encadrement disparu.
//
// ⚠️ Transformation INVERSE de celle du copier-coller (`app/lib/citation.ts`), qui
// encadre de guillemets français et fait donc passer les internes en anglais. Les
// deux servent des fins opposées : ne pas les confondre.

/** Seuil de longueur, en signes, arrêté avec l'auteur le 2026-08-17. Il vise 214
 *  citations du corpus, dont 61 remplissent aussi les conditions d'isolement et de
 *  finale. Repères : médiane 61 signes, 90ᵉ centile 171, 95ᵉ 238. */
export const SEUIL_CITATION_SORTIE = 400

const ESPACES = '[ \\u00A0\\u202F\\t]'
const APPEL_DE_NOTE = '(?:\\[\\[[A-Z0-9]+\\]\\])?'

// Trois conditions, dans l'ordre où la regex les lit :
//  — ISOLÉE   : un deux-points annonce la citation ;
//  — LONGUE   : au moins SEUIL_CITATION_SORTIE signes entre les guillemets ;
//  — TERMINALE: rien après le guillemet fermant, sinon un appel de note.
// Le `[^«»]*` du contenu interdit toute autre paire de guillemets français : une
// citation qui en contient reste au fil du texte, faute de savoir laquelle sortir.
const MOTIF = new RegExp(
  `^(.*?:${ESPACES}*)«${ESPACES}*([^«»]{${SEUIL_CITATION_SORTIE},}?)${ESPACES}*»${ESPACES}*(${APPEL_DE_NOTE})${ESPACES}*$`,
  // `d` : les INDICES des groupes, dont `debutCitation` a besoin pour reporter
  // sur la citation les locutions marquées qui la traversent.
  'sd',
)

// Le segment est la citation, tout entier : il OUVRE sur le guillemet, et le
// deux-points qui l'annonçait, s'il y en a un, appartient au texte cité (« Le
// Seigneur dit à Moïse : Prenez les encensoirs… »). Le motif ci-dessus ne pouvait
// pas l'atteindre, puisqu'il exige de la prose avant le guillemet ouvrant. Ici la
// condition d'isolement est remplie de la meilleure façon qui soit : rien à couper,
// donc rien à orphelin. ⚠️ Réservé à la prose (`nature = 'texte'`, voir l'option
// `sansAnnonce`) : la réplique d'un dialogue est elle aussi entre guillemets, et la
// sortir en ferait à tort une citation d'auteur (constaté sur Boèce).
const MOTIF_SANS_ANNONCE = new RegExp(
  `^«${ESPACES}*([^«»]{${SEUIL_CITATION_SORTIE},}?)${ESPACES}*»${ESPACES}*(${APPEL_DE_NOTE})${ESPACES}*$`,
  'sd',
)

export type OptionsCitationSortie = {
  /** Autorise le cas où le segment est la citation entière, sans prose d'annonce.
   *  À n'ouvrir que pour de la prose : voir `MOTIF_SANS_ANNONCE`. */
  sansAnnonce?: boolean
}

export type CitationSortie = {
  /** Ce qui annonce la citation, deux-points compris. Reste au fil du texte.
   *  VIDE quand le segment est la citation entière. */
  avant: string
  /** Le texte cité, sans ses guillemets encadrants, guillemets internes francisés. */
  citation: string
  /**
   * Où commence, dans le texte SOURCE, ce qui est devenu `citation`. Les surfaces
   * qui posent leurs locutions marquées et leurs appels de note par OFFSET — la
   * page Bible — s'y reportent par soustraction ; la page d'œuvre, qui les pose
   * par marqueur dans le texte, n'en a pas l'usage.
   *
   * ⛔ `null` quand la francisation a déplacé les signes : `“` devient `« `, deux
   * caractères pour un, et la correspondance cesse d'être exacte. Mieux vaut ne
   * rien reporter que reporter de travers.
   */
  debutCitation: number | null
}

export type BlocCitationStructurelle<T> = {
  /** Vrai quand tous les éléments du bloc portent explicitement `nature = citation`. */
  citation: boolean
  elements: T[]
}

/** Réunit les citations structurelles consécutives pour que la segmentation
 *  technique reste invisible dans le bloc typographique. Les éléments ordinaires
 *  sont eux aussi réunis par plages : l'appelant peut ainsi rendre une seule suite
 *  ordonnée sans perdre les jointures entre segments. */
export function regrouperCitationsStructurelles<T>(
  elements: readonly T[],
  estCitation: (element: T) => boolean,
): BlocCitationStructurelle<T>[] {
  const blocs: BlocCitationStructurelle<T>[] = []
  for (const element of elements) {
    const citation = estCitation(element)
    const dernier = blocs[blocs.length - 1]
    if (dernier && dernier.citation === citation) dernier.elements.push(element)
    else blocs.push({ citation, elements: [element] })
  }
  return blocs
}

/** Une citation déjà balisée par sa nature obéit au même seuil que la détection
 *  textuelle. La longueur se calcule sur toute la suite, et non segment par segment :
 *  une longue citation peut être découpée à des articulations internes sûres. */
export function citationStructurelleEstLongue(
  textes: readonly string[],
  seuil = SEUIL_CITATION_SORTIE,
): boolean {
  return textes.reduce((total, texte) => total + texte.length, 0) >= seuil
}

/** Prépare une citation structurelle pour son bloc de lecture. L'ancien modèle
 *  conserve parfois les guillemets encadrants dans le premier et le dernier
 *  segment ; le modèle éditorial récent les a déjà retirés. Les deux formes doivent
 *  donc converger au rendu, sans supprimer un guillemet isolé qui appartiendrait au
 *  texte cité. */
export function textesCitationStructurelleSansEncadrement(textes: readonly string[]): string[] {
  const resultat = textes.map(guillemetsInternesEnFrancais)
  if (resultat.length === 0) return resultat
  const premier = resultat[0]
  const dernierIndex = resultat.length - 1
  const dernier = resultat[dernierIndex]
  const ouvre = /^«[ \u00A0\u202F\t]*/.exec(premier)
  const ferme = /[ \u00A0\u202F\t]*»([ \u00A0\u202F\t]*(?:\[\[[A-Z0-9]+\]\])?[ \u00A0\u202F\t]*)$/.exec(dernier)
  if (!ouvre || !ferme) return resultat
  resultat[0] = premier.slice(ouvre[0].length)
  resultat[dernierIndex] = dernier.slice(0, ferme.index) + ferme[1]
  return resultat
}

/** Les guillemets anglais d'une citation deviennent français dès que l'encadrement
 *  disparaît : ils passent au premier niveau (charte §3.3). */
export function guillemetsInternesEnFrancais(texte: string): string {
  return texte.replace(/“/g, '« ').replace(/”/g, ' »')
}

/** Décrit la citation à sortir, ou `null` si le texte n'en porte pas. */
/** Le début, dans le texte source, du contenu cité — ou `null` si la francisation
 *  des guillemets a déplacé les signes et rompu la correspondance. */
function debutDuContenu(m: RegExpExecArray, rang: number, brut: string): number | null {
  const bornes = m.indices?.[rang]
  if (!bornes) return null
  if (guillemetsInternesEnFrancais(brut) !== brut) return null
  return bornes[0] + (brut.length - brut.trimStart().length)
}

export function detecterCitationSortie(texte: string, options: OptionsCitationSortie = {}): CitationSortie | null {
  const m = MOTIF.exec(texte)
  if (!m) {
    if (!options.sansAnnonce) return null
    const seule = MOTIF_SANS_ANNONCE.exec(texte)
    if (!seule) return null
    return {
      avant: '',
      citation: guillemetsInternesEnFrancais(seule[1].trim()) + (seule[2] ?? ''),
      debutCitation: debutDuContenu(seule, 1, seule[1]),
    }
  }
  const avant = m[1].trim()
  // Une citation sortie sans rien pour l'annoncer perdrait son attache : on exige
  // que l'annonce porte du texte, pas seulement le deux-points.
  if (avant.replace(/[:\s]/g, '').length === 0) return null
  const citation = guillemetsInternesEnFrancais(m[2].trim()) + (m[3] ?? '')
  return { avant, citation, debutCitation: debutDuContenu(m, 2, m[2]) }
}
