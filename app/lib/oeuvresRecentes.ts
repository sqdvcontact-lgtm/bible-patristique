// Suivi léger, côté navigateur, des dernières œuvres consultées — pour le survol
// de « Patristique » dans la barre de navigation. Purement local (localStorage),
// aucune donnée envoyée : c'est un confort de navigation, pas un historique partagé.

export type OeuvreRecente = { id: string; titre: string; auteur: string }

const CLE = 'cs_oeuvres_recentes'

/**
 * Ce qu'on retient, et ce qu'on montre : un seul nombre pour les deux, sinon
 * la moitié de ce qu'on garde ne paraît jamais. Le menu n'en montrait que trois
 * sur les huit retenues.
 *
 * ⚠️ Douze n'est pas un chiffre rond posé au hasard : au delà, une liste cesse
 * d'être « les dernières consultées » et devient un historique, qu'on parcourt
 * au lieu d'y retrouver ce qu'on lisait. Le menu se borne de toute façon à la
 * hauteur de la fenêtre et défile.
 */
export const MAX_OEUVRES_RECENTES = 12

export function enregistrerOeuvreRecente(o: OeuvreRecente): void {
  if (typeof window === 'undefined' || !o?.id) return
  try {
    const brut = localStorage.getItem(CLE)
    const liste: OeuvreRecente[] = brut ? JSON.parse(brut) : []
    const sansDoublon = liste.filter(x => x.id !== o.id)
    sansDoublon.unshift({ id: o.id, titre: o.titre, auteur: o.auteur })
    localStorage.setItem(CLE, JSON.stringify(sansDoublon.slice(0, MAX_OEUVRES_RECENTES)))
  } catch { /* localStorage indisponible : le suivi est facultatif */ }
}

export function lireOeuvresRecentes(n = MAX_OEUVRES_RECENTES): OeuvreRecente[] {
  if (typeof window === 'undefined') return []
  try {
    const brut = localStorage.getItem(CLE)
    const liste: OeuvreRecente[] = brut ? JSON.parse(brut) : []
    return liste.filter(o => o && o.id && o.titre).slice(0, n)
  } catch {
    return []
  }
}
