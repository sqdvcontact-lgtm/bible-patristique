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
  's',
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
  's',
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
}

/** Les guillemets anglais d'une citation deviennent français dès que l'encadrement
 *  disparaît : ils passent au premier niveau (charte §3.3). */
export function guillemetsInternesEnFrancais(texte: string): string {
  return texte.replace(/“/g, '« ').replace(/”/g, ' »')
}

/** Décrit la citation à sortir, ou `null` si le texte n'en porte pas. */
export function detecterCitationSortie(texte: string, options: OptionsCitationSortie = {}): CitationSortie | null {
  const m = MOTIF.exec(texte)
  if (!m) {
    if (!options.sansAnnonce) return null
    const seule = MOTIF_SANS_ANNONCE.exec(texte)
    if (!seule) return null
    return { avant: '', citation: guillemetsInternesEnFrancais(seule[1].trim()) + (seule[2] ?? '') }
  }
  const avant = m[1].trim()
  // Une citation sortie sans rien pour l'annoncer perdrait son attache : on exige
  // que l'annonce porte du texte, pas seulement le deux-points.
  if (avant.replace(/[:\s]/g, '').length === 0) return null
  const citation = guillemetsInternesEnFrancais(m[2].trim()) + (m[3] ?? '')
  return { avant, citation }
}
