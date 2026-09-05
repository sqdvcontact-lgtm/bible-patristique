/**
 * LES SORTIES D'UNE RÉFÉRENCE, hors du document.
 *
 * Le moteur (`referenceBibliographique.ts`) rend des FRAGMENTS typés ; la page les
 * balise en nœuds React (`ReferenceBibliographique.tsx`). Mais une référence sort
 * aussi du navigateur : elle part au presse-papiers en plein-texte et en HTML riche,
 * et elle entre dans la note d'un essai, où l'italique s'écrit entre astérisques.
 *
 * ⛔ Ces trois écritures ne recomposent RIEN : elles reçoivent les fragments du
 * moteur et se contentent de dire l'italique et les petites capitales dans leur
 * langue. L'ordre, la ponctuation, les liants et le point final restent au moteur, et
 * une règle qui changerait là-bas suit ici sans qu'on y touche.
 *
 * ⚠️ Les fragments ITALIQUES CONSÉCUTIFS se réunissent en une seule course. Le titre,
 * le point qui le joint à son sous-titre et le sous-titre sont trois fragments d'un
 * seul intitulé : balisés un à un, ils donneraient `*Titre**. **Sous-titre*`, que
 * l'enrichissement lit comme une italique fermée puis rouverte — c'est-à-dire comme
 * rien du tout.
 *
 * Module PUR : ni React, ni Supabase. Testé dans `referenceBibliographiqueSorties.test.ts`.
 */

import type { FragmentNotice } from './referenceBibliographique'
import { normaliserEspaces } from './typographie'

/**
 * La typographie de LECTURE d'un fragment : l'apostrophe courbe, et les espaces
 * insécables que la haute ponctuation et les guillemets demandent. La norme est au
 * RENDU (charte § 3.2) : la donnée garde ses espaces ordinaires, et
 * `normaliserEspaces` ne fait que convertir le TYPE d'une espace déjà là, jamais en
 * ajouter. Un titre tapé « assertore : disputatio » se lit donc avec son insécable,
 * sans qu'une ligne de la base ait bougé.
 *
 * ⚠️ Elle vaut pour TOUTES les sorties, l'écran comme le presse-papiers : une
 * référence collée dans un traitement de texte porte les mêmes espaces que celle
 * qu'on avait sous les yeux.
 */
export function typographieFragment(texte: string): string {
  return normaliserEspaces(texte.replace(/'/gu, '’'))
}

/**
 * La référence sans son POINT FINAL, pour qu'une phrase la continue.
 *
 * Le moteur ferme toute notice d'un point, et c'est bien : une notice est une phrase.
 * Mais la citation du presse-papiers enchaîne « …, disponible sur le site Corpus
 * Scriptura : “…” », et la note d'un essai ajoute son locus : le point tomberait au
 * milieu. ⛔ On ne retire que le point que le MOTEUR a posé — un fragment sans champ
 * ni style dont le texte est un point seul —, jamais la ponctuation d'une donnée.
 */
export function fragmentsSansPointFinal(fragments: readonly FragmentNotice[]): FragmentNotice[] {
  const dernier = fragments[fragments.length - 1]
  if (dernier && dernier.champ === null && dernier.style === null && dernier.texte === '.') {
    return fragments.slice(0, -1)
  }
  return [...fragments]
}

/** Les courses de même composition, dans l'ordre : une italique en trois fragments
 *  n'en fait qu'une. */
function courses(fragments: readonly FragmentNotice[]): { composition: FragmentNotice['composition']; texte: string }[] {
  const suites: { composition: FragmentNotice['composition']; texte: string }[] = []
  for (const fragment of fragments) {
    const texte = typographieFragment(fragment.texte)
    const derniere = suites[suites.length - 1]
    if (derniere && derniere.composition === fragment.composition) derniere.texte += texte
    else suites.push({ composition: fragment.composition, texte })
  }
  return suites
}

/** La référence en TEXTE NU : ce que le lecteur lit, sans sa composition. */
export function texteFragments(fragments: readonly FragmentNotice[]): string {
  return fragments.map(f => typographieFragment(f.texte)).join('')
}

export function echapperHtml(texte: string): string {
  return texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * La référence en HTML, pour un collage RICHE dans un traitement de texte.
 *
 * ⚠️ Les petites capitales s'y écrivent en style inline : un presse-papiers n'emporte
 * pas la feuille du site, et une classe seule y arriverait nue. C'est la seule
 * exception à la règle qui veut que la composition vienne de la feuille — hors du
 * site, il n'y a plus de feuille.
 */
export function htmlFragments(fragments: readonly FragmentNotice[]): string {
  return courses(fragments).map(({ composition, texte }) => {
    const echappe = echapperHtml(texte)
    if (composition === 'italique') return `<em>${echappe}</em>`
    if (composition === 'petites-capitales') return `<span style="font-variant: small-caps">${echappe}</span>`
    return echappe
  }).join('')
}

/**
 * La référence dans le BALISAGE des textes du site : l'italique entre astérisques,
 * que `rendreEnrichi` compose. C'est la forme qu'attend la note d'un essai.
 *
 * ⛔ Les petites capitales n'ont pas de marque dans ce balisage : le nom s'y écrit
 * tel quel plutôt que de porter une marque que rien ne lirait.
 */
export function baliseFragments(fragments: readonly FragmentNotice[]): string {
  return courses(fragments)
    .map(({ composition, texte }) => (composition === 'italique' && texte ? `*${texte}*` : texte))
    .join('')
}
