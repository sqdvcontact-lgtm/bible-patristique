export type OuvrageNotice = {
  auteurs: string | null
  titre: string | null
  annee: number | null
  type_ouvrage: string | null
  statut_scientifique: string | null
  statut_usage_notice: string | null
  statut_editorial: string | null
}

export type LienSansOuvrage = {
  id: number
  ouvrage_id: number
  rubrique: string | null
  importance: string | null
  reference_passage: string | null
  pages: string | null
  note_editoriale: string | null
  statut_verification: string
  retenu_notice: boolean
  ordre_notice: number | null
  motif_selection: string | null
}

export type Lien = LienSansOuvrage & {
  ouvrages_bibliographiques: OuvrageNotice | null
}

export type OuvrageAdminNotice = OuvrageNotice & { id: number }

// Une péricope peut citer plusieurs fois le même ouvrage. La seconde lecture ne doit
// pourtant demander chaque fiche qu'une fois, et l'ordre de première rencontre rend la
// requête déterministe.
export function idsOuvragesUniques(liens: readonly LienSansOuvrage[]): number[] {
  return [...new Set(liens.map(lien => lien.ouvrage_id))]
}

// Reconstitue exactement la forme historique du lien embarqué, sans changer l'ordre des
// liens. Une fiche absente reste `null` : l'interface sait déjà traiter ce cas comme une
// référence non admissible.
export function fusionnerLiensEtOuvrages(
  liens: readonly LienSansOuvrage[],
  ouvrages: readonly OuvrageAdminNotice[],
): Lien[] {
  const ouvragesParId = new Map(ouvrages.map(({ id, ...ouvrage }) => [id, ouvrage]))
  return liens.map(lien => ({
    ...lien,
    ouvrages_bibliographiques: ouvragesParId.get(lien.ouvrage_id) ?? null,
  }))
}
