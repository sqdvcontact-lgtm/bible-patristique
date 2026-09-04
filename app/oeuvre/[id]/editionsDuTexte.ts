/**
 * « ÉDITIONS DE CE TEXTE » — le choix d'édition du volet de lecture.
 *
 * ⛔ IL NE PARAÎT QUE S'IL Y A UN CHOIX : deux ÉDITIONS DIFFÉRENTES dans la MÊME
 * LANGUE (décision de l'auteur, 2026-09-04 : « je veux que ce choix s'affiche
 * seulement si on a le choix entre deux éditions différentes pour une même langue »).
 * Trois filtres, dans cet ordre, et le compte se fait après les trois.
 *
 * ⚠️ CE QU'IL RÉPARE, mesuré sur le corpus le 2026-09-04 :
 *
 *  - **Des exemplaires de travail donnés pour des éditions.** `oeuvre_textes` garde
 *    les instantanés d'avant une reprise — `TXT_A0010O0100_FR_1866_JOYEUX_PRE_RESEG_20260903`
 *    à côté de `TXT_A0010O0100_LEGACY`, même traducteur, même millésime, même mention
 *    d'édition. Ils portent `is_public = false`, mais la politique de lecture d'
 *    `oeuvre_textes` dit `is_admin() OR (is_public AND …)` : l'AUTEUR les voyait tous,
 *    et le menu lui proposait deux fois « Abbé Joyeux, 1866 ». ⛔ Le défaut était donc
 *    invisible depuis un compte de lecteur, et visible depuis le seul compte qui
 *    regarde la page tous les jours.
 *  - **Deux exemplaires d'une même édition, tous deux à l'atelier.** Les Homélies sur
 *    l'Hexaéméron portent trois textes grecs, dont DEUX sont le même Migne 1857
 *    (`A0017O0001T0002` et `TXT_A0017O0001_GR_LEGACY_EMBEDDED`).
 *  - **Un tri qui ne regardait pas la langue.** Le filtre d'avant comparait « ceci est
 *    le texte original » à « je lis le texte original », ce qui n'est pas la même
 *    question : une œuvre dont un texte n'est ni l'original ni une traduction reconnue
 *    — sans traducteur et dans une langue tierce — tombait du mauvais côté.
 *
 * ⚠️ APRÈS CES RÈGLES, UNE SEULE ŒUVRE DU CORPUS OFFRE ENCORE CE MENU : la Consolation
 * de la philosophie, en français, entre Ceriziers 1646 et Mirandol 1861. C'est le
 * résultat attendu, non un effet de bord : le site n'a qu'un texte par langue partout
 * ailleurs.
 *
 * Module PUR : ni requête, ni rendu, ni connaissance de la forme des libellés.
 */

export type CandidatEdition = {
  /** Clé de rendu : l'identifiant du texte, ou celui de l'œuvre sœur. */
  cle: string
  /** La langue, telle que la donnée la porte (« Français », « Latin », « Grec »). */
  langue: string | null
  /** ⛔ CE QUI IDENTIFIE L'ÉDITION, et rien d'autre : deux candidats qui s'accordent
   *  sur les trois SONT la même édition, quels que soient leurs identifiants. */
  traducteur: string | null
  annee: number | null
  mention: string | null
  /** Ce que la ligne affiche. Le module ne le compose pas : il ne fait qu'y trier. */
  libelle: string
  /** Où mène la ligne. `null` sur celle qu'on lit. */
  url: string | null
  actif: boolean
  /** Le texte est-il OFFERT À LA LECTURE ? Un instantané de travail ne l'est pas. */
  lisible: boolean
  /** Alignement en cours : la ligne se montre, éteinte, et ne mène nulle part. */
  indisponible?: boolean
  /** Départage deux exemplaires d'une même édition : le texte par défaut l'emporte. */
  prefere?: boolean
}

/** Repli de comparaison : accents, casse et ponctuation ôtés, blancs réduits. */
export function replierEdition(valeur: string | null | undefined): string {
  return (valeur ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim()
}

/**
 * La clé d'une ÉDITION : le traducteur, le millésime, la mention d'édition.
 *
 * ⚠️ L'identifiant du texte n'y entre PAS, et c'est tout l'objet : deux lignes
 * d'`oeuvre_textes` qui ne diffèrent que par leur identifiant sont deux exemplaires
 * d'une seule édition, et le lecteur qui les voit côte à côte n'a aucun moyen de
 * choisir.
 */
export function cleEdition(candidat: Pick<CandidatEdition, 'traducteur' | 'annee' | 'mention'>): string {
  return [replierEdition(candidat.traducteur), candidat.annee ?? '', replierEdition(candidat.mention)].join('|')
}

/** Qui l'emporte entre deux exemplaires d'une même édition. */
function rang(candidat: CandidatEdition): number {
  if (candidat.actif) return 3
  if (candidat.prefere) return 2
  if (candidat.lisible) return 1
  return 0
}

/**
 * Les éditions à offrir, ou RIEN.
 *
 * ⚠️ L'ordre d'entrée est conservé : c'est celui de la donnée, millésime croissant.
 * Remplacer un exemplaire par un autre ne le déplace pas — `Map` garde la place de la
 * première insertion.
 */
export function editionsOffertes(
  candidats: readonly CandidatEdition[],
  langueActive: string | null | undefined,
): CandidatEdition[] {
  const langue = replierEdition(langueActive)
  const parEdition = new Map<string, CandidatEdition>()
  for (const candidat of candidats) {
    if (replierEdition(candidat.langue) !== langue) continue
    // ⚠️ Ce qu'on LIT paraît toujours, fût-il à l'atelier : un menu qui tairait la
    // ligne courante mentirait sur l'endroit où l'on se trouve. C'est la règle du
    // menu des bibles, où le catalogue ne liste que les bibles lisibles mais liste
    // toujours celle qu'on lit.
    if (!candidat.lisible && !candidat.actif) continue
    const cle = cleEdition(candidat)
    const tenant = parEdition.get(cle)
    if (!tenant || rang(candidat) > rang(tenant)) parEdition.set(cle, candidat)
  }
  const retenus = [...parEdition.values()]
  return retenus.length > 1 ? retenus : []
}
