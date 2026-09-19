/**
 * Projection des vues AELF vers le contrat interne de la Polyglotte.
 *
 * Les traductions historiques ne sont pas recopiées dans `versets_v2` : leur texte
 * publié arrive par `v_aelf_polyglotte_cells`, déjà filtré par les validations
 * structurelles. La vue porte à la fois la référence native de l'édition et la case de
 * l'axe AELF. C'est cette DERNIÈRE qui place la cellule dans le tableau.
 */

export type CellulePolyglotteAelf = {
  id: string
  aelf_book_code: string
  aelf_chapter_base: number
  aelf_verse_base: number
  historical_canon_id: string
  livre: string
  trad_id: string
  ch_orig: number
  v_orig: number
  v_orig_suffixe: string | null
  texte: string | null
  notes: string | null
}

export type LignePolyglotteAelf = {
  id: string
  canon_id: string
  canon_id_fin: null
  livre: string
  trad_id: string
  ch_orig: number
  v_orig: number
  v_orig_suffixe: string | null
  texte: string | null
  notes: string | null
  lectureSeuleAelf: true
}

export type LivreAelfParTraduction = {
  trad_id: string
  livre: string
  nb_unites: number
}

export type LivresAelfParTraduction = Map<string, Set<string>>

export type TraductionCatalogueAelf = {
  trad_id: string
  nom: string
  ordre: number | null
  source_edition: string | null
  publication_fin_annee: number | null
  langue: string | null
}

export type TraductionPublieeAelf = {
  trad_id: string
  nom: string
  ordre: number | null
  langue: string | null
}

/** Place une cellule sur l'axe lu par la Polyglotte, sans confondre celui-ci avec
 * `historical_canon_id`, qui conserve la numérotation historique de la source. */
export function projeterCelluleAelf(cellule: CellulePolyglotteAelf): LignePolyglotteAelf {
  return {
    // Le préfixe interdit de confondre l'identifiant du mapping avec celui d'une ligne
    // de `versets_v2`, notamment dans les clés React et le cache d'administration.
    id: `aelf:${cellule.id}`,
    canon_id: `${cellule.aelf_book_code}.${cellule.aelf_chapter_base}.${cellule.aelf_verse_base}`,
    canon_id_fin: null,
    livre: cellule.aelf_book_code,
    trad_id: cellule.trad_id,
    ch_orig: cellule.ch_orig,
    v_orig: cellule.v_orig,
    v_orig_suffixe: cellule.v_orig_suffixe,
    texte: cellule.texte,
    notes: cellule.notes,
    // Ces lignes viennent d'une vue de publication : le crayon qui écrit dans
    // `versets_v2` ne doit jamais leur être proposé.
    lectureSeuleAelf: true,
  }
}

export function indexerLivresAelf(lignes: readonly LivreAelfParTraduction[]): LivresAelfParTraduction {
  const index: LivresAelfParTraduction = new Map()
  for (const ligne of lignes) {
    const livres = index.get(ligne.trad_id) ?? new Set<string>()
    livres.add(ligne.livre)
    index.set(ligne.trad_id, livres)
  }
  return index
}

/** La vue de publication peut annoncer une traduction que le catalogue historique ne
 * rend pas encore au navigateur. Elle complète alors le catalogue au lieu d'être mise en
 * intersection avec lui ; les métadonnées d'édition absentes restent simplement nulles. */
export function fusionnerCatalogueAelf(
  catalogue: readonly TraductionCatalogueAelf[],
  publiees: readonly TraductionPublieeAelf[],
): TraductionCatalogueAelf[] {
  const fusion = [...catalogue]
  const ids = new Set(catalogue.map(t => t.trad_id))
  for (const traduction of publiees) {
    if (ids.has(traduction.trad_id)) continue
    fusion.push({
      ...traduction,
      source_edition: null,
      publication_fin_annee: null,
    })
    ids.add(traduction.trad_id)
  }
  return fusion
}

/**
 * Les traductions déjà servies par `versets_v2` gardent le comportement historique du
 * menu. Une traduction propre à l'axe AELF, elle, n'est offerte que si la vue des livres
 * la publie dans au moins un des livres actuellement affichés.
 */
export function traductionsDisponiblesPourLivres<T extends { trad_id: string; sourceAelf?: boolean }>(
  traductions: readonly T[],
  livresAffiches: readonly string[],
  livresParTraduction: LivresAelfParTraduction,
): T[] {
  return traductions.filter(traduction => {
    if (!traduction.sourceAelf) return true
    const livres = livresParTraduction.get(traduction.trad_id)
    return livres !== undefined && livresAffiches.some(livre => livres.has(livre))
  })
}

/**
 * Une sélection conservée dans le navigateur ne doit pas réexposer une traduction AELF
 * quand le lecteur quitte le seul livre publié. Le choix reste mémorisé dans `slots`, mais
 * la colonne devient vide jusqu'au retour dans un livre couvert.
 */
export function masquerTraductionsAelfIndisponibles<T extends { trad_id: string; sourceAelf?: boolean }>(
  slots: readonly string[],
  traductions: readonly T[],
  disponibles: readonly T[],
): string[] {
  const idsAelf = new Set(traductions.filter(t => t.sourceAelf).map(t => t.trad_id))
  const idsDisponibles = new Set(disponibles.map(t => t.trad_id))
  return slots.map(id => idsAelf.has(id) && !idsDisponibles.has(id) ? '' : id)
}
