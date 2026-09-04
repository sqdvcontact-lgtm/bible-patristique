/**
 * LE MILLÉSIME D'UNE ÉDITION, tel que la Polyglotte l'affiche et le range.
 *
 * Le menu des colonnes et l'en-tête de chaque colonne portent, sous le nom de la bible,
 * un millésime seul — sans « Édition de », sans ponctuation. Une date sous un titre n'a
 * pas besoin qu'on la présente. Ce module dit d'où elle vient, et comment elle range.
 *
 * ⛔ Il ne connaît ni Supabase, ni React : la dérivation depuis la prose de
 * `traductions.source_edition` est la partie FRAGILE du dispositif, et c'est elle qu'on
 * éprouve — sur les dix notices réelles du corpus, pas sur un jeu d'essai.
 *
 * Testé par millesimeEdition.test.ts.
 */

/** Ce qu'une notice de traduction porte de sa date. */
export type SourceMillesime = {
  source_edition?: string | null
  publication_fin_annee?: number | null
}

/**
 * Le millésime AFFICHÉ : le dernier que cite la notice d'édition-source, à défaut la
 * fin de la période de publication.
 *
 * ⚠️ Le « vers » qui PRÉCÈDE le millésime part avec lui. La notice du manuscrit Français
 * 899 écrit « Paris, XIIIe siècle (vers 1260) » : rendre « 1260 » tout court donnerait à
 * un témoin daté par approximation la précision d'un colophon. ⛔ Ce n'est pas une
 * lecture de la prose : on ne prend que le qualificatif ACCOLÉ au millésime, celui que
 * la source a écrit devant lui.
 *
 * ⚠️ Le DERNIER millésime, et non le premier : une notice ouvre sur l'auteur et le titre,
 * et ferme sur l'adresse — « Paris, Letouzey et Ané, 8 vol. ; … t. VIII, 9e éd., 1925 ».
 * Elle peut par ailleurs porter des chiffres qui n'en sont pas (la cote « 7268.2.2 » du
 * manuscrit), et ceux-là ne sont jamais en queue.
 */
export function millesimeEdition(t: SourceMillesime): string | null {
  if (t.source_edition) {
    const millesimes = [...t.source_edition.matchAll(/(vers\s+)?(\d{4})/gi)]
    const dernier = millesimes[millesimes.length - 1]
    if (dernier) return (dernier[1] ? 'vers ' : '') + dernier[2]
  }
  if (t.publication_fin_annee) return String(t.publication_fin_annee)
  return null
}

/** Le millésime en NOMBRE, pour ranger.
 *  ⚠️ Trois chiffres suffisent : la Bible du XIIIe siècle en a besoin le jour où sa
 *  notice daterait un témoin d'avant l'an mil. */
export function anneeDuMillesime(millesime: string | null | undefined): number | null {
  const m = (millesime ?? '').match(/\d{3,4}/)
  return m ? Number(m[0]) : null
}

/** Ce qu'il faut savoir d'une entrée de menu pour la ranger. */
export type RangeableParMillesime = { millesime: string | null; ordre: number | null }

/**
 * L'ordre du menu des traductions : par MILLÉSIME croissant (demande de l'auteur,
 * 2026-09-04).
 *
 * ⛔ On range sur la date QU'ON MONTRE, jamais sur une autre. La première parution d'une
 * traduction et le millésime de l'édition servie ne coïncident presque jamais — Sacy
 * paraît de 1667 à 1696 et l'on sert l'édition de 1730, la Vulgate clémentine est de
 * 1592 et l'on sert Madrid 1946 —, si bien qu'un menu rangé sur la première et affichant
 * la seconde donnerait à lire 1946, 1730, 1912 dans cet ordre : il passerait pour cassé.
 *
 * ⛔ Une entrée SANS millésime se range à la FIN, jamais au début : on ne devine pas une
 * date, et une date manquante ne vaut pas zéro.
 *
 * ⚠️ Le rang de la base départage deux entrées de même millésime — la Vulgate de Fillion
 * et son français portent tous deux 1925.
 */
export function comparerParMillesime(a: RangeableParMillesime, b: RangeableParMillesime): number {
  const rang = (x: RangeableParMillesime) => x.ordre ?? 9999
  const da = anneeDuMillesime(a.millesime)
  const db = anneeDuMillesime(b.millesime)
  if (da == null && db == null) return rang(a) - rang(b)
  if (da == null) return 1
  if (db == null) return -1
  return da - db || rang(a) - rang(b)
}
