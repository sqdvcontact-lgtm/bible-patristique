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

export type CitationSortie = {
  /** Ce qui annonce la citation, deux-points compris. Reste au fil du texte. */
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
export function detecterCitationSortie(texte: string): CitationSortie | null {
  const m = MOTIF.exec(texte)
  if (!m) return null
  const avant = m[1].trim()
  // Une citation sortie sans rien pour l'annoncer perdrait son attache : on exige
  // que l'annonce porte du texte, pas seulement le deux-points.
  if (avant.replace(/[:\s]/g, '').length === 0) return null
  const citation = guillemetsInternesEnFrancais(m[2].trim()) + (m[3] ?? '')
  return { avant, citation }
}
