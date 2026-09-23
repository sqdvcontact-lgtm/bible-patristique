/**
 * LE TEXTE LISIBLE D'UNE LIGNE DU TÉMOIN 899 — ce que l'écran montre, en chaîne.
 *
 * La colonne du manuscrit (TR0009) porte ses marqueurs éditoriaux EN CLAIR dans la donnée
 * (« [lecture incertaine : preig] », « [ajout marginal : …] », « [lacune : déchirure] »),
 * et `rendreMarqueurs899` (app/lib/marqueurs899.tsx) les rend d'une teinte : l'écran ne
 * montre jamais leurs crochets ni leurs étiquettes. ⛔ Ce qui SORT de la page — la copie,
 * le prélèvement, le lasso, le signalement — emportait pourtant le texte brut, termes
 * d'atelier compris. Cette fonction rend le texte que l'écran montre.
 *
 * ⛔ ELLE SUIT L'AUTOMATE DE `rendreMarqueurs899`, TOKEN POUR TOKEN : même expression
 * (lacune nue, lacune motivée, ouverture, fermeture), même mode de départ (un verset qui
 * s'ouvre sur une fermeture orpheline prolonge une lecture incertaine), même libellé de
 * lacune (`libelleLacune`), même fine contre un mot coupé, même contenu masqué d'une
 * lacune ouverte. `texteLisible899.test.tsx` rend les deux sur les mêmes versets et
 * exige le même texte : une règle qui changerait d'un côté ferait rougir la garde.
 *
 * ⛔ ET LA TRADUCTION MODERNE DU MÊME TÉMOIN (TR0013) A SA FONCTION SŒUR,
 * `texteLisibleModerne899` : son texte n'est pas recomposé, il porte ses marqueurs en
 * clair dans `versets_v2` (1 811 versets), et c'est `marquerLacunesDuTemoin` qui les met
 * en forme à l'écran. La copie, le prélèvement, le lasso et le signalement emportaient
 * donc « [lecture difficile : … ] » au milieu d'une phrase française (audit du
 * 2026-09-22). Chacune suit SON automate, token pour token.
 *
 * Module PUR : il ne rend aucun nœud.
 */

import { normaliserEspaces } from './typographie'
import { libelleLacune, sansGuillemetsDeCitation } from './marqueurs899'
import { estTraductionModerne899, TRAD_ID_BIBLE899 } from './bible899'

// ⚠️ La même expression que `RE_TOKEN` de `marqueurs899.tsx`, qui ne l'exporte pas.
const RE_TOKEN = /\[\s*(?:…|\.\.\.|[Ll]acune)\s*\]|\[\s*lacune\s*:\s*(?<cause>[^\]]*)\]|\[(?<type>lecture incertaine|lecture difficile|lacune|ajout marginal)\s*:\s*|\]/gu

/** L'espace fine insécable, que le rendu pose entre une lacune et le mot qu'elle coupe. */
const FINE = String.fromCharCode(0x202f)

type Mode = 'normal' | 'teinte' | 'lacune'

export function texteLisible899(texteBrut: string): string {
  if (!texteBrut) return texteBrut
  const texte = normaliserEspaces(texteBrut)

  RE_TOKEN.lastIndex = 0
  const premier = RE_TOKEN.exec(texte)
  let mode: Mode = premier?.[0] === ']' ? 'teinte' : 'normal'

  let sortie = ''
  const pousser = (txt: string, m: Mode) => {
    // Le contenu d'une lacune ouverte est un MOTIF, non du texte : l'écran le tait.
    if (txt && m !== 'lacune') sortie += txt
  }
  const fineSiColle = (index: number) => {
    const c = texte[index]
    if (c && /[\p{L}\p{N}]/u.test(c)) sortie += FINE
  }

  RE_TOKEN.lastIndex = 0
  let dernier = 0
  let m: RegExpExecArray | null
  while ((m = RE_TOKEN.exec(texte)) !== null) {
    pousser(texte.slice(dernier, m.index), mode)
    const fin = m.index + m[0].length
    const { cause, type } = m.groups ?? {}
    if (m[0] === ']') {
      if (mode === 'lacune') fineSiColle(fin)
      mode = 'normal'
    } else if (cause !== undefined) {
      fineSiColle(m.index - 1)
      sortie += libelleLacune(cause)
      fineSiColle(fin)
    } else if (type === undefined) {
      fineSiColle(m.index - 1)
      sortie += libelleLacune()
      fineSiColle(fin)
    } else if (type === 'lacune') {
      fineSiColle(m.index - 1)
      sortie += libelleLacune()
      mode = 'lacune'
    } else {
      mode = 'teinte'
    }
    dernier = fin
  }
  pousser(texte.slice(dernier), mode)
  return sortie
}

// ── La traduction moderne du témoin (TR0013), qui porte ses marqueurs en clair ────────
//
// ⚠️ La même expression que `RE_MARQUEUR_TEMOIN` de `marqueurs899.tsx`, qui ne l'exporte
// pas. Sa règle cardinale tient ici comme là : ON NE CONSOMME JAMAIS UN « ] » QUI SUIT UN
// « [ » DANS LA MÊME PORTION, faute de quoi les quatre-vingt-cinq RESTITUTIONS de cette
// traduction (« il [m'exauça] ») perdraient leur crochet fermant.
const RE_MARQUEUR_TEMOIN = /\[\s*(?:…|\.\.\.|[Ll]acune)\s*\]|\[\s*lacune\s*:\s*(?<cause>[^\]]*)\]|\[\s*(?<type>lecture incertaine|lecture difficile|ajout marginal)\s*:\s*(?<contenu>[^\]]*)\]|\[\s*(?<ouvert>lecture incertaine|lecture difficile|ajout marginal|lacune)\s*:\s*(?<reste>[^\]]*)$/gu

/**
 * Le texte que l'écran montre d'un verset de la traduction moderne du témoin (TR0013).
 *
 * ⛔ ELLE SUIT L'AUTOMATE DE `marquerLacunesDuTemoin`, TOKEN POUR TOKEN : même expression,
 * même fermeture orpheline (un « ] » qui précède TOUT crochet ouvrant), même retrait des
 * guillemets qui citent l'ancien français, même libellé de lacune, même fine contre un mot
 * coupé. L'appel de note qui explique une lecture incertaine n'est pas du texte : il ne
 * sort pas. `texteLisible899.test.tsx` rend les deux sur les mêmes versets et exige le
 * même texte.
 */
export function texteLisibleModerne899(texteBrut: string): string {
  if (!texteBrut) return texteBrut
  const texte = normaliserEspaces(texteBrut)
  if (!texte.includes('[') && !texte.includes(']')) return texte

  let sortie = ''
  let dernier = 0
  const fineSiColle = (index: number) => {
    const c = texte[index]
    if (c && /[\p{L}\p{N}]/u.test(c)) sortie += FINE
  }
  // Un ajout marginal garde ses guillemets : c'est la lecture incertaine, qui laisse
  // l'ancien français tel quel, que le rendu dégage de sa citation.
  const marque = (contenu: string, nom?: string) =>
    nom === 'ajout marginal' ? contenu : sansGuillemetsDeCitation(contenu)

  const iFerme = texte.indexOf(']')
  const iOuvre = texte.indexOf('[')
  if (iFerme >= 0 && (iOuvre < 0 || iFerme < iOuvre)) {
    sortie += marque(texte.slice(0, iFerme))
    dernier = iFerme + 1
  }

  RE_MARQUEUR_TEMOIN.lastIndex = dernier
  let m: RegExpExecArray | null
  while ((m = RE_MARQUEUR_TEMOIN.exec(texte)) !== null) {
    const { cause, type, contenu, ouvert, reste } = m.groups ?? {}
    sortie += texte.slice(dernier, m.index)
    if (type !== undefined) {
      sortie += marque(contenu ?? '', type)
    } else if (ouvert !== undefined) {
      // Une LACUNE ouverte n'a pas de cause lisible : elle retombe sur le mot nu.
      if (ouvert === 'lacune') {
        fineSiColle(m.index - 1)
        sortie += libelleLacune()
      } else {
        sortie += marque(reste ?? '', ouvert)
      }
    } else {
      fineSiColle(m.index - 1)
      sortie += libelleLacune(cause)
      fineSiColle(m.index + m[0].length)
    }
    dernier = m.index + m[0].length
  }
  return sortie + texte.slice(dernier)
}

/**
 * Ce qui SORT de la page pour une bible donnée : le texte que l'écran montre.
 *
 * ⛔ Une seule écriture pour les deux lectures (simple et en regard) et pour les deux
 * membres de l'édition du témoin : la colonne du manuscrit passe par `texteLisible899`,
 * sa traduction moderne par `texteLisibleModerne899`, toute autre bible ressort telle
 * quelle. ⚠️ En lecture simple, c'est la LIGNE qui dit si elle est recomposée
 * (`_est899`), non le code de la bible : voir `texteDuVerset` (TexteBible).
 */
export function texteLisibleDeLaBible(texte: string, tradId: string | null | undefined): string {
  const code = (tradId ?? '').split('#')[0]
  if (code === TRAD_ID_BIBLE899) return texteLisible899(texte)
  if (estTraductionModerne899(tradId)) return texteLisibleModerne899(texte)
  return texte
}
