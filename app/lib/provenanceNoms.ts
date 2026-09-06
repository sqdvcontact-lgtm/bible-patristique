/**
 * CE QUI ATTESTE LE NOM D'UNE PÉRICOPE.
 *
 * Nommer un passage est la seule écriture entièrement propre au site : « Les noces de
 * Cana », « Le premier signe », « Le chant du Serviteur » ne se lisent dans aucun texte
 * biblique. Chaque nom porte donc en base son dossier documentaire — 1 985 liens au
 * 6 septembre 2026, dont 785 vers une source EXTERNE sur un nom visible, répartis sur
 * les 249 péricopes du catalogue — et rien de tout cela ne paraissait.
 *
 * ⛔ ON NE PUBLIE QUE LES SOURCES EXTERNES (`sources_pericopes.est_externe`). Les quatre
 * autres sont des traces d'ATELIER, et le registre le dit lui-même : le lot d'import du
 * 24 juillet « n'a aucune autorité éditoriale », la révision du 3 août est une
 * « provenance technique », l'ossature canonique « ne valide pas les délimitations », et
 * les notices antérieures sont de « provenance indéterminée ». Le document servi au
 * lecteur n'est pas un carnet de travail (charte, § 35.16.15 et suivants).
 *
 * ⚠️ Corollaire MESURÉ, et il commande le titre de la section : une fois les sources
 * internes écartées, le statut `provenance` ne paraît plus JAMAIS — les 785 liens publiés
 * sont 650 témoins et 135 appuis. La section s'appelle donc « Attestation des noms », et
 * non « Provenance » : ce qu'on montre est ce qui atteste, pas d'où le nom est venu.
 * Le vocabulaire garde ses trois valeurs, la donnée pouvant les employer demain.
 *
 * Module PUR : il ne connaît ni Supabase, ni React, ni la mise en page.
 */

import type { NoticeBibliographique } from './referenceBibliographique'

/** Ce que le lien PROUVE. Vocabulaire CLOS, celui de `pericope_nom_sources.statut_lien`. */
export type StatutLien = 'provenance' | 'temoin' | 'appui'
/** Jusqu'où il le prouve. Vocabulaire CLOS, `pericope_nom_sources.degre_preuve`. */
export type DegrePreuve = 'direct' | 'partiel' | 'contextuel'

export type SourcePericope = {
  code: string
  auteur: string | null
  titre: string
  annee: number | null
  editeur: string | null
  url: string | null
  estExterne: boolean
}

export type LienDAttestation = {
  nomId: number
  statut: string | null
  degre: string | null
  /** Où, dans la source, la chose se lit : « § 29 », « Jn 2,11 », une plage canonique. */
  referenceInterne: string | null
  /** La voix de l'éditeur : ce que ce lien établit, et ce qu'il n'établit pas. */
  note: string | null
  source: SourcePericope
}

export type NomAtteste = {
  nomId: number
  nom: string
  estPrincipal: boolean
  liens: LienDAttestation[]
}

// ── Le vocabulaire ───────────────────────────────────────────────────────────
// ⛔ Une valeur hors de ces tables ne se compose PAS : elle rend `null`, et son lien est
// écarté. Une donnée qu'on ne sait pas nommer ne se montre pas sous un nom inventé.

const LIBELLE_STATUT: Record<StatutLien, string> = {
  provenance: 'Provenance',
  temoin: 'Témoin',
  appui: 'Appui',
}

// ⚠️ « Appui · appui contextuel » bégaierait : le degré dit le CHEMIN de la preuve, non
// sa nature, et se formule donc autrement selon qu'il est direct, partiel ou indirect.
const LIBELLE_DEGRE: Record<DegrePreuve, string> = {
  direct: 'attestation directe',
  partiel: 'attestation partielle',
  contextuel: 'par le contexte',
}

/** L'ordre de lecture : ce qui établit le nom d'abord, ce qui l'entoure ensuite. */
const RANG_STATUT: Record<StatutLien, number> = { provenance: 0, temoin: 1, appui: 2 }
const RANG_DEGRE: Record<DegrePreuve, number> = { direct: 0, partiel: 1, contextuel: 2 }

export function libelleStatut(statut: string | null | undefined): string | null {
  return LIBELLE_STATUT[(statut ?? '') as StatutLien] ?? null
}

export function libelleDegre(degre: string | null | undefined): string | null {
  return LIBELLE_DEGRE[(degre ?? '') as DegrePreuve] ?? null
}

/** La ligne d'en-tête d'un lien : « Témoin · attestation directe ». Le degré est
 *  facultatif ; le statut ne l'est pas, il est ce que le lien affirme. */
export function libelleDuLien(lien: LienDAttestation): string | null {
  const statut = libelleStatut(lien.statut)
  if (!statut) return null
  const degre = libelleDegre(lien.degre)
  return degre ? `${statut} · ${degre}` : statut
}

/** ⛔ Le seul filtre de publication : la source est-elle extérieure au site ? */
export function estAttestationPubliable(lien: LienDAttestation): boolean {
  return lien.source.estExterne && libelleStatut(lien.statut) !== null
}

/**
 * Les noms attestés d'une péricope, dans l'ordre où on les lit : le nom principal
 * d'abord — c'est le titre de la page —, les appellations ensuite dans leur ordre
 * éditorial. ⛔ Un nom sans aucun lien publiable ne paraît pas : une rubrique vide sous
 * un nom laisserait croire qu'il n'est attesté par rien, quand il l'est par une source
 * qu'on a choisi de ne pas montrer.
 */
export function nomsAttestes(
  noms: { id: number; nom: string; estPrincipal: boolean; ordre: number | null }[],
  liens: LienDAttestation[],
): NomAtteste[] {
  const publiables = liens.filter(estAttestationPubliable)
  const parNom = new Map<number, LienDAttestation[]>()
  for (const l of publiables) {
    const liste = parNom.get(l.nomId)
    if (liste) liste.push(l)
    else parNom.set(l.nomId, [l])
  }
  return noms
    .filter(n => (parNom.get(n.id)?.length ?? 0) > 0)
    .slice()
    .sort((a, b) => {
      if (a.estPrincipal !== b.estPrincipal) return a.estPrincipal ? -1 : 1
      const oa = a.ordre ?? Number.MAX_SAFE_INTEGER
      const ob = b.ordre ?? Number.MAX_SAFE_INTEGER
      return oa !== ob ? oa - ob : a.id - b.id
    })
    .map(n => ({
      nomId: n.id,
      nom: n.nom,
      estPrincipal: n.estPrincipal,
      liens: (parNom.get(n.id) ?? []).slice().sort(comparerLiens),
    }))
}

function comparerLiens(a: LienDAttestation, b: LienDAttestation): number {
  const ra = RANG_STATUT[(a.statut ?? '') as StatutLien] ?? 9
  const rb = RANG_STATUT[(b.statut ?? '') as StatutLien] ?? 9
  if (ra !== rb) return ra - rb
  const da = RANG_DEGRE[(a.degre ?? '') as DegrePreuve] ?? 9
  const db = RANG_DEGRE[(b.degre ?? '') as DegrePreuve] ?? 9
  if (da !== db) return da - db
  return a.source.titre.localeCompare(b.source.titre, 'fr')
}

/**
 * La source, dans le vocabulaire du MOTEUR bibliographique (charte § 35.6.5). ⛔ On ne
 * recompose pas une référence ici : la page en porte déjà une, celle de la bibliographie
 * de la péricope, et deux apparats dans la même colonne se composent pareil ou pas du
 * tout.
 * ⚠️ `sources_pericopes` ne porte pas de lieu d'édition : la notice n'en invente pas.
 */
export function noticeDeSource(source: SourcePericope, id = 0): NoticeBibliographique {
  const editeur = (source.editeur ?? '').trim()
  return {
    id,
    forme: 'monographie',
    titre: source.titre.trim(),
    sousTitre: null,
    titreHote: null,
    tomaison: null,
    pages: null,
    dateAffichee: null,
    annee: source.annee ?? null,
    lieu: null,
    editeurs: editeur ? [{ rang: 1, role: 'editeur', nom: editeur }] : [],
    collection: null,
    numeroCollection: null,
    contributeurs: [],
    auteursTexte: (source.auteur ?? '').trim() || null,
    directeursTexte: null,
    traducteursTexte: null,
  }
}
