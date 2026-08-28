/**
 * La pagination de la lecture — et la règle qui interdit le PARAGRAPHE ORPHELIN.
 *
 * La lecture d'une œuvre se découpe en pages d'un plafond de signes, sans jamais
 * couper un bloc : un groupe de titre est solidaire de ses sous-niveaux, et le
 * scinder mettrait un chapitre d'un côté et sa fin de l'autre.
 *
 * ── LE DÉFAUT QUE CE MODULE RÉPARE ──────────────────────────────────────────────
 *
 * Le plafond seul produit des orphelins. Relevé par l'auteur le 2026-08-28 sur
 * l'*Explication sur le psaume III* de Chrysostome (Jeannin) : la division ne porte
 * que deux blocs dans le corps — le lemme « Psaume pour David lorsqu'il fuyait devant
 * son fils Absalon… », **123 signes**, puis tout le commentaire, **14 952**. Le lemme
 * fait bloc à part parce qu'il porte `ref_niv2` nul quand la suite porte « 1 ». Or
 * 123 + 14 952 = **15 075**, soit **75 signes** au-dessus du plafond de 15 000 : la
 * page se fermait donc après le lemme, seul sur son écran, et le lecteur tombait sur
 * la barre de pages au bout d'une ligne et demie.
 *
 * ⛔ Ce n'est PAS une règle « rompre au changement de `ref_niv2` », et le remède n'est
 * pas de relever le plafond : le texte suivant déborderait d'un signe. C'est que le
 * plafond est un CONFORT, pas une loi, tandis qu'une page qui ne porte qu'un
 * paragraphe est un accident que le lecteur voit.
 *
 * ── LA RÈGLE ────────────────────────────────────────────────────────────────────
 *
 * Une page ne se ferme pas tant qu'elle ne porte pas de quoi être une page. En
 * dessous de `PART_PAGE_ORPHELINE` du plafond — moins d'un écran de lecture — on
 * garde le bloc suivant, quitte à dépasser. Et la DERNIÈRE page, si elle reste sous
 * ce seuil, rejoint celle qui la précède : l'orphelin de queue est le même défaut vu
 * par l'autre bout.
 */

/**
 * En deçà de cette part du plafond, ce n'est pas une page, c'est un reste.
 *
 * Un cinquième de 15 000 fait 3 000 signes, soit à peu près un écran de la colonne de
 * lecture. Au-dessous, la page ne se lit pas comme une page : elle se voit comme une
 * coupure ratée.
 */
export const PART_PAGE_ORPHELINE = 0.2

/** Un bloc à paginer, et ce qu'il pèse. Le bloc lui-même n'est jamais coupé. */
export type BlocPaginable<T> = { bloc: T; signes: number }

/**
 * Répartit les blocs en pages d'au plus `plafond` signes, sans jamais couper un bloc
 * ni laisser une page orpheline.
 *
 * ⚠️ Le plafond cède devant la règle de l'orphelin, jamais l'inverse : une page trop
 * longue se lit, une page d'une ligne et demie s'explique. Un bloc unique plus lourd
 * que le plafond fait sa page à lui seul, comme avant — il n'y a rien à y faire sans
 * le couper.
 */
export function paginerBlocs<T>(blocs: readonly BlocPaginable<T>[], plafond: number): T[][] {
  const seuilOrphelin = plafond * PART_PAGE_ORPHELINE
  const pages: T[][] = []
  let courante: T[] = []
  let signesCourants = 0

  for (const { bloc, signes } of blocs) {
    // On ne ferme la page que si elle porte déjà de quoi en être une. Sinon le bloc
    // suivant la rejoint, plafond ou non : mieux vaut une page longue qu'un orphelin.
    const deborde = courante.length > 0 && signesCourants + signes > plafond
    if (deborde && signesCourants >= seuilOrphelin) {
      pages.push(courante)
      courante = []
      signesCourants = 0
    }
    courante.push(bloc)
    signesCourants += signes
  }
  if (courante.length > 0) pages.push(courante)

  // L'orphelin de QUEUE : la dernière page peut rester sous le seuil sans qu'aucun
  // bloc ne vienne plus la remplir. Elle rejoint alors la précédente.
  if (pages.length > 1 && signesCourants < seuilOrphelin) {
    const derniere = pages.pop() as T[]
    pages[pages.length - 1].push(...derniere)
  }
  return pages
}
