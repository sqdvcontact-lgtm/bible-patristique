/**
 * La composition de l'EXERGUE — le verset posé en tête d'une pièce, et sa traduction.
 *
 * Une catéchèse de Cyrille, une homélie, un sermon s'ouvrent souvent sur un verset que
 * la pièce entière va déplier. Ce verset n'est pas un LEMME : le lemme est le mot ou la
 * phrase qu'un commentaire explique à sa place, dans le fil, et se lit comme n'importe
 * quel paragraphe (charte § 3.8, décision de l'auteur du 20 août 2026). L'exergue, lui,
 * est un SEUIL : il ne se commente pas ligne à ligne, il annonce, et l'édition le pose
 * en retrait au-dessus du texte pour qu'on voie qu'on n'y est pas encore entré.
 *
 * ── LA FORME, ET CE QUI LA DÉCIDE ───────────────────────────────────────────────
 *
 * Le bloc est RENTRÉ à gauche du quart de la mesure et JUSTIFIÉ : ses deux bords sont
 * droits, et il pend au bord droit de la colonne (choix de l'auteur, 8 septembre 2026).
 * ⛔ Pas de retrait à droite : deux marges enfermeraient un bloc qui doit au contraire
 * s'appuyer sur la marge de la prose qu'il ouvre. ⛔ Pas de fer à droite non plus, qui
 * est la composition d'un bloc de SIGNATURES : un bord gauche dentelé sur trois ou
 * quatre lignes se lit mal, et l'exergue est du texte suivi, non une liste de noms.
 *
 * ⚠️ LE RETRAIT CÈDE QUAND LA MESURE NE PEUT PLUS LE PAYER. Un quart pris sur une
 * colonne de lecture (31,25 rem) laisse une soixantaine de signes par ligne, largement
 * au-dessus du plancher de la charte (§ 3.11.4 : sous une quarantaine de signes, on
 * ferre au lieu de justifier). Pris sur la colonne d'une comparaison de traductions, ou
 * sur un téléphone étroit, il laisserait des lignes de trente signes que la
 * justification creuserait de lézardes. La mesure minimale garde donc la main : le
 * retrait vaut le quart, mais jamais plus que ce qui reste au-dessus d'elle, et il
 * tombe à zéro quand la colonne descend au-dessous. ⛔ C'est la seule écriture possible
 * en style EN LIGNE, où aucune requête de média ne s'écrit — et le style en ligne est
 * ce qui permet à la planche des styles de composer l'exergue exactement comme la page.
 */

/** La nature de segment qui porte le style. */
export const NATURE_EXERGUE = 'exergue'

/** La part de la mesure que le retrait prend à gauche : le quart. */
export const PART_RETRAIT_EXERGUE = '25%'

/**
 * La mesure au-dessous de laquelle le retrait CÈDE — vingt rem, soit un peu plus de
 * cinquante signes au corps de la lecture. En dessous, la justification se creuserait.
 */
export const MESURE_MINIMALE_EXERGUE = '20rem'

/**
 * Le retrait gauche du bloc : le quart de la mesure, tant qu'il reste la mesure
 * minimale à lire ; ce qui dépasse d'elle sinon ; rien du tout quand la colonne est
 * plus étroite qu'elle.
 */
export const RETRAIT_EXERGUE =
  `max(0px, min(${PART_RETRAIT_EXERGUE}, 100% - ${MESURE_MINIMALE_EXERGUE}))`

/**
 * Le corps de l'exergue, en part de celui du fil. Même rapport que la citation sortie
 * (`.citation-sortie`, `.citation-verset`) : un texte détaché se dit par son retrait et
 * par un corps légèrement moindre, jamais par un ornement.
 */
export const RAPPORT_CORPS_EXERGUE = 0.95

/**
 * Ce bloc est-il un exergue ?
 *
 * ⚠️ Tout ou rien, comme pour les vers, les versets et les signatures : un bloc qui
 * mêlerait un exergue à de la prose se compose en prose. Un retrait posé sur une partie
 * seulement d'un paragraphe ne dirait rien au lecteur, sinon que la mise en page a
 * glissé.
 */
export function estBlocExergue(natures: readonly (string | null | undefined)[]): boolean {
  return natures.length > 0 && natures.every(nature => nature === NATURE_EXERGUE)
}
