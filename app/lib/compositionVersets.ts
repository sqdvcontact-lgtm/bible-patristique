/**
 * La composition d'une citation biblique DÉCOUPÉE EN VERSETS — une seule règle,
 * deux surfaces.
 *
 * Un Père cite parfois l'Écriture au long, et l'édition ne coule pas ces citations
 * dans sa prose : elle les pose verset par verset, chacun sur sa ligne. La `citation`
 * ordinaire ne sait pas rendre cela — sortie du texte, elle réunit au contraire tous
 * ses segments en un seul bloc coulant, pour que la segmentation technique reste
 * invisible (voir `citationSortie.ts`). Ici, la coupure n'est pas technique : elle est
 * VOULUE par l'édition, et l'effacer serait effacer le verset.
 *
 * ── CE QUE LE STYLE REPREND DE LA CITATION SORTIE ───────────────────────────────
 *
 * Le corps légèrement réduit, la justification, l'absence de guillemets et de filet :
 * une citation détachée se dit par son retrait, pas par un ornement. Le retrait GAUCHE
 * vaut la même mesure qu'elle (8 mm, 5 mm sur écran étroit), pour une seule forme sur
 * le site.
 *
 * ── CE QU'IL EN CHANGE, ET POURQUOI ─────────────────────────────────────────────
 *
 * ⛔ Pas de retrait à DROITE. La citation sortie est un bloc unique, que deux marges
 * égales enferment ; un bloc de versets est une SUITE de lignes courtes déjà rentrées
 * à gauche, et la seconde marge ne ferait qu'étrangler la colonne.
 *
 * ⛔ Pas de blanc de paragraphe entre deux versets. Le blanc de la prose (0,72 rem)
 * dirait qu'on change de sujet à chaque verset, alors qu'on lit UN passage continu.
 * Un léger blanc suffit à séparer les versets sans les disjoindre — décision de
 * l'auteur, 2026-08-28 : « sans grand espace entre paragraphes de même style ; un
 * léger blanc suffit ». Le blanc de paragraphe entier, lui, reste AUTOUR du bloc :
 * c'est la citation qui est un paragraphe, pas chacun de ses versets.
 */

/** La nature de segment qui porte le style. Un segment = un verset. */
export const NATURE_VERSET = 'verset'

/**
 * La case où s'écrit le numéro de verset : `segment_metadata.biblical_verse_number`.
 *
 * ⛔ **PAS `verse_number`**, qui est déjà pris et veut dire autre chose : chez Ceriziers,
 * il porte le rang du VERS dans son poème (1 213 lignes, trente-neuf poèmes qui ont
 * chacun leur ligne 1). Un vers n'est pas un verset ; réemployer la clé mêlerait la
 * numérotation d'un mètre de Boèce à celle d'un chapitre d'Isaïe.
 *
 * ⚠️ Le numéro ne se DEVINE pas. Ni au nombre en tête du segment — un verset peut
 * commencer par un nombre (« Quarante jours et quarante nuits… ») —, ni au lien
 * biblique, qui relève d'un travail de liaison distinct et n'est pas toujours fait.
 * Il est écrit à la main, verset par verset, par qui tient la donnée.
 */
export const CLE_NUMERO_VERSET = 'biblical_verse_number'

/** Au-delà, ce n'est plus un numéro : « 12-13 » fait cinq signes, « 105a-106b » neuf. */
export const LONGUEUR_MAX_NUMERO_VERSET = 12

/**
 * Le numéro de verset tel qu'il s'affichera, ou `null` s'il n'y en a pas.
 *
 * On accepte le nombre comme la chaîne (un `jsonb` rend l'un ou l'autre), et les formes
 * composées que l'édition imprime vraiment : « 12 », « 12-13 » quand un segment couvre
 * deux versets, « 12a » quand elle coupe le verset. On refuse en revanche ce qui ne
 * porte aucun chiffre, et ce qui dépasse la longueur d'un numéro : mieux vaut ne rien
 * afficher qu'imprimer une bribe de commentaire au milieu du texte cité.
 */
export function numeroVersetLisible(brut: unknown): string | null {
  if (typeof brut === 'number') return Number.isFinite(brut) ? String(brut) : null
  if (typeof brut !== 'string') return null
  const valeur = brut.trim()
  if (valeur === '' || valeur.length > LONGUEUR_MAX_NUMERO_VERSET) return null
  return /[0-9]/.test(valeur) ? valeur : null
}

/** Le retrait gauche du bloc. Même mesure que la citation sortie. */
export const RETRAIT_VERSET = '8mm'

/** Le même, sur écran étroit — comme la citation sortie, qui s'y resserre aussi. */
export const RETRAIT_VERSET_ETROIT = '5mm'

/** Le léger blanc entre deux versets. À comparer aux 0,72 rem de la prose : le tiers,
 *  assez pour qu'on voie deux versets, trop peu pour qu'on lise deux paragraphes. */
export const BLANC_ENTRE_VERSETS = '0.25rem'

/**
 * Ce bloc est-il une citation en versets ?
 *
 * ⚠️ La règle est le TOUT ou RIEN, comme pour les vers et les signatures : un bloc
 * mêlant un verset et de la prose se compose en prose. Un retrait posé sur une partie
 * seulement d'un paragraphe ne dirait rien au lecteur, sinon que la mise en page a
 * glissé.
 */
export function estBlocVersets(natures: readonly (string | null | undefined)[]): boolean {
  return natures.length > 0 && natures.every(nature => nature === NATURE_VERSET)
}
