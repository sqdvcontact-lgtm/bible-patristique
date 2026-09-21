/**
 * L'EXTRACTION DES CITATIONS d'un lecteur en document Word — la forme de la DEMANDE.
 *
 * La page « Mes citations » compose elle-même ce qu'elle montre : le verset lu dans la
 * traduction du menu, les passages d'une même œuvre réunis, le lieu de chaque passage, la
 * notice de l'édition citée. Le document reprend EXACTEMENT cela : la page envoie ce
 * qu'elle a composé, et la route ne fait que le mettre en page. Recomposer côté serveur
 * aurait demandé de réécrire toute la chaîne de la page, et deux écritures d'une même
 * composition divergent au premier réglage.
 *
 * ⛔ Les textes voyagent dans la syntaxe d'enrichissement du site (`*italique*`,
 * `++petites capitales++`, `^^exposant^^`), que le composeur relit par
 * `fragmentsEnrichis`. Aucune mise en forme ne voyage autrement.
 *
 * ⚠️ La demande vient du navigateur : `lireDemandeExtraction` la BORNE avant que rien ne
 * se compose. Elle ne peut rien atteindre d'autre que le document qu'elle décrit, et ce
 * document ne va qu'à celui qui l'a demandé.
 */

import type { FragmentNotice } from '@/app/lib/referenceBibliographique'

export type CorpusExtrait = 'biblique' | 'patristique'

export type CitationExtraite = {
  /** Le repère du passage : « Gn 1, 2-4 », ou le lieu d'un passage des Pères. */
  reference: string
  /** Le passage, déjà préparé comme pour une copie (`preparerTexteCitation`). */
  texte: string
  /** Une mention qui ne vaut que pour ce passage (la traduction d'un verset que le
   *  menu ne porte pas, ou la notice d'une édition différente de celle du groupe). */
  glose?: string
}

export type GroupeExtrait = {
  /** Le livre, ou l'auteur et son œuvre. */
  titre: string
  /** La notice de l'édition citée, commune à tout le groupe. */
  notice?: string
  citations: CitationExtraite[]
}

export type SectionExtraite = {
  corpus: CorpusExtrait
  /** Ce qui vaut pour toute la section : la traduction des versets. */
  chapeau?: string
  groupes: GroupeExtrait[]
}

export type DemandeExtractionCitations = {
  /** Le pseudonyme du lecteur, pour la page de titre. */
  lecteur: string
  sections: SectionExtraite[]
}

/** Le titre de chaque section du document, dans l'ordre où elles se suivent. */
export const TITRE_SECTION: Record<CorpusExtrait, string> = {
  biblique: 'Versets bibliques',
  patristique: 'Textes patristiques',
}

// ── Les bornes ────────────────────────────────────────────────────────────────
/** Le corps d'une demande, en octets. Le plus gros recueil du site n'en approche pas. */
export const OCTETS_MAX_DEMANDE = 3_000_000
export const CITATIONS_MAX = 5_000
const GROUPES_MAX = 2_000
const SIGNES_MAX_TEXTE = 40_000
const SIGNES_MAX_COURT = 2_000

function chaine(valeur: unknown, max: number): string | null {
  if (typeof valeur !== 'string') return null
  const texte = valeur.trim()
  return texte.length <= max ? texte : null
}

function facultative(valeur: unknown, max: number): string | undefined | null {
  if (valeur === undefined || valeur === null || valeur === '') return undefined
  return chaine(valeur, max)
}

/**
 * Lit et borne une demande. Rend `null` dès qu'une pièce n'a pas la forme attendue :
 * on ne compose pas un document à moitié.
 */
export function lireDemandeExtraction(brut: unknown): DemandeExtractionCitations | null {
  if (!brut || typeof brut !== 'object') return null
  const { lecteur, sections } = brut as Record<string, unknown>
  const nom = chaine(lecteur ?? '', 200)
  if (nom === null || !Array.isArray(sections) || sections.length === 0 || sections.length > 2) return null

  let compte = 0
  let groupesVus = 0
  const lues: SectionExtraite[] = []
  const corpusVus = new Set<CorpusExtrait>()
  for (const s of sections) {
    if (!s || typeof s !== 'object') return null
    const { corpus, chapeau, groupes } = s as Record<string, unknown>
    if (corpus !== 'biblique' && corpus !== 'patristique') return null
    if (corpusVus.has(corpus)) return null
    corpusVus.add(corpus)
    const chap = facultative(chapeau, SIGNES_MAX_COURT)
    if (chap === null || !Array.isArray(groupes) || groupes.length === 0) return null
    groupesVus += groupes.length
    if (groupesVus > GROUPES_MAX) return null

    const groupesLus: GroupeExtrait[] = []
    for (const g of groupes) {
      if (!g || typeof g !== 'object') return null
      const { titre, notice, citations } = g as Record<string, unknown>
      const t = chaine(titre, SIGNES_MAX_COURT)
      const n = facultative(notice, SIGNES_MAX_COURT)
      if (!t || n === null || !Array.isArray(citations) || citations.length === 0) return null
      compte += citations.length
      if (compte > CITATIONS_MAX) return null
      const citationsLues: CitationExtraite[] = []
      for (const c of citations) {
        if (!c || typeof c !== 'object') return null
        const { reference, texte, glose } = c as Record<string, unknown>
        const r = chaine(reference ?? '', SIGNES_MAX_COURT)
        const x = chaine(texte, SIGNES_MAX_TEXTE)
        const gl = facultative(glose, SIGNES_MAX_COURT)
        if (r === null || !x || gl === null) return null
        citationsLues.push(gl ? { reference: r, texte: x, glose: gl } : { reference: r, texte: x })
      }
      groupesLus.push(n ? { titre: t, notice: n, citations: citationsLues } : { titre: t, citations: citationsLues })
    }
    lues.push(chap ? { corpus, chapeau: chap, groupes: groupesLus } : { corpus, groupes: groupesLus })
  }
  // L'Écriture d'abord, les Pères ensuite, quel que soit l'ordre de la demande.
  lues.sort((a, b) => (a.corpus === b.corpus ? 0 : a.corpus === 'biblique' ? -1 : 1))
  return { lecteur: nom, sections: lues }
}

/**
 * Écrit les fragments d'une notice dans la syntaxe d'enrichissement du site.
 *
 * ⛔ Les fragments CONSÉCUTIFS d'une même composition se réunissent : le titre, le point
 * de liaison et le sous-titre sont trois fragments d'un seul intitulé, et balisés un à un
 * ils donneraient une italique fermée puis rouverte (`*Titre**. **Sous-titre*`).
 */
export function noticeEnSyntaxe(fragments: readonly FragmentNotice[]): string {
  const courses: { composition: FragmentNotice['composition']; texte: string }[] = []
  for (const f of fragments) {
    if (!f.texte) continue
    const derniere = courses[courses.length - 1]
    if (derniere && derniere.composition === f.composition) derniere.texte += f.texte
    else courses.push({ composition: f.composition, texte: f.texte })
  }
  return courses.map(({ composition, texte }) => {
    if (!texte.trim()) return texte
    if (composition === 'italique') return `*${texte}*`
    if (composition === 'petites-capitales') return `++${texte}++`
    return texte
  }).join('')
}
