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
 * Module PUR : il ne rend aucun nœud.
 */

import { normaliserEspaces } from './typographie'
import { libelleLacune } from './marqueurs899'

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
