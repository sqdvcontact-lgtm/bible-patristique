// Suivi léger, côté navigateur, des dernières œuvres consultées — pour le survol
// de « Patristique » dans la barre de navigation. Purement local (localStorage),
// aucune donnée envoyée : c'est un confort de navigation, pas un historique partagé.

export type OeuvreRecente = {
  id: string
  titre: string
  auteur: string
  /** Le texte lu, quand ce n'est pas celui que l'œuvre ouvre par défaut : sans lui,
   *  l'entrée rouvrirait une autre édition que celle qu'on lisait. */
  texte?: string | null
  /** L'édition lue, en une ligne (« Traduction par L. Moreau, 1846 », « Texte latin,
   *  1896 »). Elle ne paraît que lorsque deux entrées portent le même titre. */
  edition?: string | null
  /** Dernière consultation, en millisecondes. Absente des entrées d'avant le
   *  2026-09-21, qui se montrent sans date. */
  vu?: number
}

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

/** Une consultation est une ÉDITION d'une œuvre : l'œuvre et le texte lu. */
function cleConsultation(o: Pick<OeuvreRecente, 'id' | 'texte'>): string {
  return `${o.id}|${o.texte ?? ''}`
}

/** Ce que le lecteur VOIT d'une entrée. Deux entrées qui s'y confondent n'en font
 *  qu'une : ce sont des restes d'avant l'édition retenue (le menu montrait trois
 *  « La Cité de Dieu » identiques, venues de trois fiches sœurs). */
function cleAffichee(o: OeuvreRecente): string {
  return `${o.titre}|${o.auteur}|${o.edition ?? ''}`
}

function chaine(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null
}

/** Relit une entrée du stockage, et l'écarte si elle n'a pas la forme attendue. */
function lireEntree(v: unknown): OeuvreRecente | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const id = chaine(o.id)
  const titre = chaine(o.titre)
  if (!id || !titre) return null
  return {
    id,
    titre,
    auteur: chaine(o.auteur) ?? '',
    texte: chaine(o.texte),
    edition: chaine(o.edition),
    vu: typeof o.vu === 'number' && Number.isFinite(o.vu) ? o.vu : undefined,
  }
}

function lireBrut(): OeuvreRecente[] {
  const brut = localStorage.getItem(CLE)
  const liste: unknown = brut ? JSON.parse(brut) : []
  return Array.isArray(liste) ? liste.map(lireEntree).filter((o): o is OeuvreRecente => o !== null) : []
}

/** Pur : la liste après une consultation. La plus récente en tête, une seule
 *  entrée par édition, et aucune que le lecteur ne pourrait distinguer d'une autre. */
export function listeApresConsultation(liste: OeuvreRecente[], o: OeuvreRecente): OeuvreRecente[] {
  const cle = cleConsultation(o)
  return dedoublonner([o, ...liste.filter(x => cleConsultation(x) !== cle)]).slice(0, MAX_OEUVRES_RECENTES)
}

/** Pur : garde la PREMIÈRE de chaque entrée affichée, c'est-à-dire la plus récente. */
export function dedoublonner(liste: OeuvreRecente[]): OeuvreRecente[] {
  const vues = new Set<string>()
  return liste.filter(o => {
    const cle = cleAffichee(o)
    if (vues.has(cle)) return false
    vues.add(cle)
    return true
  })
}

export function enregistrerOeuvreRecente(o: Omit<OeuvreRecente, 'vu'>): void {
  if (typeof window === 'undefined' || !o?.id || !o.titre) return
  try {
    const entree: OeuvreRecente = {
      id: o.id,
      titre: o.titre,
      auteur: o.auteur ?? '',
      texte: o.texte ?? null,
      edition: o.edition ?? null,
      vu: Date.now(),
    }
    localStorage.setItem(CLE, JSON.stringify(listeApresConsultation(lireBrut(), entree)))
  } catch { /* localStorage indisponible : le suivi est facultatif */ }
}

export function lireOeuvresRecentes(n = MAX_OEUVRES_RECENTES): OeuvreRecente[] {
  if (typeof window === 'undefined') return []
  try {
    return dedoublonner(lireBrut()).slice(0, n)
  } catch {
    return []
  }
}

/** L'adresse qui rouvre l'édition consultée. */
export function adresseOeuvreRecente(o: Pick<OeuvreRecente, 'id' | 'texte'>): string {
  const base = `/oeuvre/${encodeURIComponent(o.id)}`
  return o.texte ? `${base}?texte=${encodeURIComponent(o.texte)}` : base
}

/** Pur : les titres que plusieurs entrées portent, pour lesquels l'édition se dit. */
export function titresAmbigus(liste: OeuvreRecente[]): Set<string> {
  const comptes = new Map<string, number>()
  for (const o of liste) {
    const cle = `${o.titre}|${o.auteur}`
    comptes.set(cle, (comptes.get(cle) ?? 0) + 1)
  }
  return new Set([...comptes].filter(([, n]) => n > 1).map(([cle]) => cle))
}

export function editionAMontrer(o: OeuvreRecente, ambigus: Set<string>): string | null {
  return o.edition && ambigus.has(`${o.titre}|${o.auteur}`) ? o.edition : null
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

function debutDuJour(t: number): number {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Pur : quand l'œuvre a été ouverte, dit comme on le dit : « aujourd'hui », « hier »,
 *  le jour de la semaine passée, puis la date. `maintenant` se lit au geste, jamais
 *  pendant un rendu. */
export function quandConsultee(vu: number | undefined, maintenant: number): string | null {
  if (vu === undefined || !Number.isFinite(vu) || vu > maintenant + 60_000) return null
  const jours = Math.round((debutDuJour(maintenant) - debutDuJour(vu)) / 86_400_000)
  if (jours <= 0) return 'aujourd’hui'
  if (jours === 1) return 'hier'
  const d = new Date(vu)
  if (jours < 7) return JOURS[d.getDay()]
  const jour = `${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS[d.getMonth()]}`
  return d.getFullYear() === new Date(maintenant).getFullYear() ? jour : `${jour} ${d.getFullYear()}`
}
