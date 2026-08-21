import React from 'react'
import { rendreSiecles } from './siecles'

// ── Enrichissements des notices ──────────────────────────────────────────────
// Les notices d'auteur (vie, pensée, anecdotes, postérité) portent depuis peu un
// balisage léger : *un titre d'œuvre entre astérisques*. La convention vient de
// Markdown, mais on n'en implémente QUE cette marque, et volontairement. Une
// notice n'est pas un document : elle n'a ni titres, ni listes, ni liens, et
// accepter une syntaxe plus large reviendrait à ouvrir une porte que personne ne
// surveille — d'autant qu'on ne passe jamais par du HTML brut ici.
//
// ⚠️ ON NE REND JAMAIS CE TEXTE EN HTML. `dangerouslySetInnerHTML` sur une
// colonne rédigée hors du dépôt serait une injection à retardement. On découpe
// la chaîne et l'on rend des ÉLÉMENTS React : une balise écrite dans la base
// ressort alors comme du texte, ce qu'elle est.
//
// Les siècles continuent d'être composés à l'intérieur comme à l'extérieur des
// passages en italique : chaque morceau repasse par `rendreSiecles`.

/** Le texte nu, sans les marques. Pour tout ce qui n'est pas du rendu composé :
 *  métadonnées de page, JSON-LD, mesure d'une longueur, comparaison, tri. */
export function sansEnrichissements(texte: string | null | undefined): string {
  return (texte ?? '').replace(/\*/g, '')
}

/** Une troncature peut couper une paire d'astérisques en son milieu, et la marque
 *  restée seule s'afficherait telle quelle. On la referme. */
export function equilibrerEnrichissements(texte: string): string {
  const marques = (texte.match(/\*/g) ?? []).length
  return marques % 2 === 0 ? texte : `${texte}*`
}

/** La notice composée : les titres d'œuvres en `<em>`, les siècles en petites
 *  capitales, et rien d'autre. */
export function rendreEnrichi(texte: string | null | undefined): React.ReactNode {
  const t = texte ?? ''
  if (!t.includes('*')) return rendreSiecles(t)

  // Expression LOCALE : une expression globale de module garde son `lastIndex`
  // d'un appel à l'autre et sauterait un titre sur deux.
  const marque = /\*([^*]+)\*/g
  const morceaux: React.ReactNode[] = []
  let curseur = 0
  let trouve: RegExpExecArray | null

  while ((trouve = marque.exec(t)) !== null) {
    if (trouve.index > curseur) {
      morceaux.push(
        <React.Fragment key={`t${curseur}`}>{rendreSiecles(t.slice(curseur, trouve.index))}</React.Fragment>,
      )
    }
    morceaux.push(<em key={`i${trouve.index}`}>{rendreSiecles(trouve[1])}</em>)
    curseur = trouve.index + trouve[0].length
  }
  if (curseur < t.length) {
    morceaux.push(<React.Fragment key={`t${curseur}`}>{rendreSiecles(t.slice(curseur))}</React.Fragment>)
  }
  return morceaux
}
