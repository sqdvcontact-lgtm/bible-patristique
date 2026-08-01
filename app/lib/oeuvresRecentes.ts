// Suivi léger, côté navigateur, des dernières œuvres consultées — pour le survol
// de « Patristique » dans la barre de navigation. Purement local (localStorage),
// aucune donnée envoyée : c'est un confort de navigation, pas un historique partagé.

export type OeuvreRecente = { id: string; titre: string; auteur: string }

const CLE = 'cs_oeuvres_recentes'
const MAX = 8

export function enregistrerOeuvreRecente(o: OeuvreRecente): void {
  if (typeof window === 'undefined' || !o?.id) return
  try {
    const brut = localStorage.getItem(CLE)
    const liste: OeuvreRecente[] = brut ? JSON.parse(brut) : []
    const sansDoublon = liste.filter(x => x.id !== o.id)
    sansDoublon.unshift({ id: o.id, titre: o.titre, auteur: o.auteur })
    localStorage.setItem(CLE, JSON.stringify(sansDoublon.slice(0, MAX)))
  } catch { /* localStorage indisponible : le suivi est facultatif */ }
}

export function lireOeuvresRecentes(n = 3): OeuvreRecente[] {
  if (typeof window === 'undefined') return []
  try {
    const brut = localStorage.getItem(CLE)
    const liste: OeuvreRecente[] = brut ? JSON.parse(brut) : []
    return liste.filter(o => o && o.id && o.titre).slice(0, n)
  } catch {
    return []
  }
}
