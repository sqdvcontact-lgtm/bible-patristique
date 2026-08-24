/**
 * La matérialisation de `join_before` — le séparateur posé AVANT un segment quand
 * plusieurs segments se recomposent en un texte suivi.
 *
 * ⛔ `join_before` est une INSTRUCTION, pas du texte. La concaténer telle quelle
 * (`precedent + s.join_before + s.segment_texte`) fait entrer la métadonnée dans le
 * corpus rendu. C'est ce qui est arrivé au latin de Zycha des « Questions sur
 * l'Heptateuque » (`TXT_A0010O0023_LA_1895_ZYCHA`), où le lecteur composait
 * « ut multos gignerent?spacenon enim et Adam ipse » : le mot `space` s'imprimait au
 * beau milieu d'Augustin. Le même défaut frappait la Dhuoda de Bondurand
 * (`TXT_A0176O0001_1887_BONDURAND`). Toute recomposition passe désormais ici.
 *
 * ⚠️ La colonne porte DEUX conventions, qu'aucune contrainte SQL ne départage, parce
 * qu'elle est en texte libre et que les lots d'import se sont succédé :
 *
 * 1. un JETON SYMBOLIQUE, qui nomme le séparateur sans l'écrire (`space`, `none`,
 *    `line_break`, `paragraph_break`). C'est le vocabulaire du modèle éditorial, celui
 *    que la contrainte `bible_editorial_segment_sources_join_before_check` impose à la
 *    couche Bible 899, et que les imports de Zycha et de Bondurand ont repris ;
 * 2. le SÉPARATEUR LITTÉRAL lui-même, écrit tel qu'il doit paraître : l'espace, la
 *    chaîne vide qui recolle un mot coupé, le saut de ligne, l'insécable, le tiret
 *    cadratin encadré d'espaces des Jeannin. Convention des lots Mirandol, Ceriziers,
 *    Jeannin et de la plupart des œuvres du fonds.
 *
 * Les deux se distinguent sans ambiguïté : un séparateur littéral ne porte ni lettre ni
 * chiffre. Une valeur qui en porte est donc un jeton ; connu, il est matérialisé ;
 * inconnu, il retombe sur le liant par défaut. ⛔ Un jeton n'est JAMAIS rendu tel quel :
 * c'est toute la raison d'être de ce module.
 */

/**
 * Le vocabulaire symbolique réellement admis par l'application.
 *
 * ⛔ Il est tenu par la contrainte SQL `bible_editorial_segment_sources_join_before_check`
 * et par le type `BibleSourceFragment['joinBefore']`. L'allonger ici sans l'allonger là
 * rouvrirait l'écart entre la donnée et son rendu.
 */
export const JONCTIONS_SYMBOLIQUES = ['none', 'space', 'line_break', 'paragraph_break'] as const

export type JonctionSymbolique = (typeof JONCTIONS_SYMBOLIQUES)[number]

/**
 * Le liant posé quand la donnée ne dit rien (`join_before` nul).
 *
 * ⚠️ Une espace simple, et non rien : c'est la règle de la charte (§6.1, « la
 * recomposition d'un paragraphe insère une espace simple entre deux segments, sauf
 * lorsqu'un signe, `join_before` ou un balisage exige une jonction différente et
 * contrôlée »), et c'est ce dont vivent les 65 798 segments du fonds dont la colonne
 * n'a jamais été renseignée. Rendre `''` par défaut souderait les mots de 44 œuvres.
 */
export const LIANT_DEFAUT = ' '

export function estJonctionSymbolique(valeur: string): valeur is JonctionSymbolique {
  return (JONCTIONS_SYMBOLIQUES as readonly string[]).includes(valeur)
}

/** Le séparateur que nomme un jeton du vocabulaire. `switch` exhaustif : ajouter une
 *  valeur à `JonctionSymbolique` sans l'écrire ici casse la compilation. */
export function liantSymbolique(jonction: JonctionSymbolique): string {
  switch (jonction) {
    case 'none': return ''
    case 'space': return ' '
    case 'line_break': return '\n'
    case 'paragraph_break': return '\n\n'
    default: {
      const jamais: never = jonction
      void jamais
      return LIANT_DEFAUT
    }
  }
}

/** Une valeur littérale est faite de séparateurs, jamais de mots : ni lettre ni chiffre. */
function estSeparateurLitteral(valeur: string): boolean {
  return !/[\p{L}\p{N}]/u.test(valeur)
}

/**
 * Le séparateur à poser avant CE segment, matérialisé.
 *
 * ⚠️ À n'appeler qu'entre deux segments : le premier d'un bloc ne reçoit aucun préfixe,
 * quel que soit son `join_before`. La décision appartient à l'appelant, qui seul sait
 * où son bloc commence.
 *
 * `liantDefaut` permet à une surface d'imposer le sien (les vers se joignent par un saut
 * de ligne, jamais par une espace) sans dupliquer la table des jetons.
 */
export function liantAvantSegment(
  joinBefore: string | null | undefined,
  liantDefaut: string = LIANT_DEFAUT,
): string {
  if (joinBefore == null) return liantDefaut
  if (estJonctionSymbolique(joinBefore)) return liantSymbolique(joinBefore)
  if (estSeparateurLitteral(joinBefore)) return joinBefore
  // Jeton hors vocabulaire : on ignore ce qu'il demande, on ne l'imprime pas.
  return liantDefaut
}

export type SegmentARecomposer = {
  texte: string
  joinBefore?: string | null
}

/**
 * Recompose une suite de segments en un texte suivi.
 *
 * ⚠️ Recomposition LOGIQUE seulement. Les transformations d'affichage (espace fine
 * avant la haute ponctuation, césures conditionnelles, justification) s'appliquent
 * ensuite, et segment par segment : aucune métadonnée n'entre dans la chaîne remise au
 * moteur typographique. Passer `composer` applique cette mise en forme à chaque
 * `texte`, jamais aux liants.
 */
export function recomposerSegments(
  segments: readonly SegmentARecomposer[],
  options?: { liantDefaut?: string; composer?: (texte: string) => string },
): string {
  const composer = options?.composer ?? ((t: string) => t)
  return segments.reduce((acc, s, i) => {
    if (i === 0) return composer(s.texte)
    return acc + liantAvantSegment(s.joinBefore, options?.liantDefaut) + composer(s.texte)
  }, '')
}
