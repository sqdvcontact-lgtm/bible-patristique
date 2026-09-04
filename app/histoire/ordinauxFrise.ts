/**
 * LES ORDINAUX DE LA FRISE — « Albert Ier », « du XIIe », et rien d'autre.
 *
 * ⛔ « LE SCRIBE SHLOMO » COMPOSAIT « Lᵉ SCRIBE » (relevé de l'auteur, 2026-09-04 :
 * « le "e" de "le" est en exposant ; il faut vérifier l'ensemble des textes »). Le motif
 * d'avant était `\b([IVXLCDM]+)(er|re|e)\b` : le L de « Le » EST un chiffre romain, le C
 * de « Ce » et le D de « De » aussi, et le « e » qui suit passait pour un ordinal.
 *
 * ⚠️ MESURÉ SUR TOUT LE CORPUS DES ÉVÉNEMENTS (titres, notices, notes de datation) :
 * **516 « Le », 23 « De », 20 « Ce »** — cinq cent cinquante-neuf faux exposants — contre
 * 98 « Ier », 1 « Ire », et quatre chiffres de siècle élidé. Le défaut ne tenait donc pas
 * à un texte, mais à la moitié des phrases du corpus.
 *
 * ⛔ LA RÈGLE EST DOUBLE, et chaque moitié a sa raison :
 *  — l'ordinal d'un SOUVERAIN n'existe qu'au premier : « Ier », « Ire ». Aucun roi n'est
 *    « Vᵉʳ ». Le motif se borne donc au I, ce qui met hors d'atteinte « Mer », « Ver »,
 *    « Der », mots français que `[IVXLCDM]+(er)` aurait pris ;
 *  — un chiffre de SIÈCLE élidé demande au moins DEUX lettres romaines : « XIe », « IIe ».
 *    C'est ce qui écarte « Le », « Ce », « De », « Me », tous d'une seule lettre. ⚠️ La même
 *    parade est écrite depuis longtemps dans `app/admin/controleQualite.ts` — elle n'avait
 *    simplement jamais été portée ici.
 *
 * ⚠️ Un siècle ÉCRIT EN TOUTES LETTRES (« IVe siècle ») ne passe pas par ici : il est
 * reconnu en amont par `decouperSiecles`. Ce module ne voit que ce qui reste.
 *
 * ⛔ Deux cas du corpus restent SANS exposant, et c'est une correction de DONNÉE, non de
 * rendu : « la première moitié du IIe ; » et « du IIe. » — un siècle y est élidé après un
 * chiffre d'une seule lettre, que rien ne distingue d'un article. Les écrire « du IIe
 * siècle » les rendrait au module des siècles.
 *
 * Module PUR : ni rendu, ni surlignage.
 */

export type FragmentOrdinal =
  | { t: 'texte'; v: string }
  /** Le chiffre romain, à composer en capitales normales. */
  | { t: 'romain'; v: string }
  /** Le suffixe, à composer en exposant. */
  | { t: 'ordinal'; v: string }

/** ⚠️ Deux alternatives, et l'ordre compte : « Ier » doit être vu avant que la seconde
 *  ne cherche deux lettres, sinon « IIer » (qui n'existe pas) brouillerait la lecture. */
const ORDINAUX = /\b(I)(er|re)\b|\b([IVXLCDM]{2,})(e)\b/g

export function decouperOrdinaux(texte: string): FragmentOrdinal[] {
  const frags: FragmentOrdinal[] = []
  const pousser = (v: string) => { if (v) frags.push({ t: 'texte', v }) }
  let dernier = 0, m: RegExpExecArray | null
  ORDINAUX.lastIndex = 0
  while ((m = ORDINAUX.exec(texte))) {
    pousser(texte.slice(dernier, m.index))
    frags.push({ t: 'romain', v: m[1] ?? m[3] }, { t: 'ordinal', v: m[2] ?? m[4] })
    dernier = ORDINAUX.lastIndex
  }
  pousser(texte.slice(dernier))
  return frags
}
