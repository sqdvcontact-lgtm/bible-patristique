/* La galerie de noms de la page d'accueil : qui paraît, et dans quel ordre.
 *
 * Module PUR — aucune lecture, aucun client. La page apporte les lignes, le
 * module décide. Les règles vivent ici et nulle part ailleurs : une liste de
 * noms recomposée dans un composant dérive au premier ajout de corpus.
 */

export type AuteurDuCorpus = {
  id_auteur: string
  nom: string
  /** Année de naissance ou de floruit, telle que la porte « auteurs ». */
  date_debut_annee: number | null
}

/** Une signature : l'œuvre, et l'auteur qui la signe (premier ou co-signataire). */
export type SignatureOeuvre = {
  id_oeuvre: string
  auteur: AuteurDuCorpus | null
}

/* ⛔ ÉCARTÉ À LA MAIN, ET C'EST UNE DETTE DE DONNÉE, NON UN CHOIX DE DESSIN.
   « Douze Apôtres » (A0012) n'est pas une personne : c'est l'attribution
   traditionnelle de la Doctrine des Apôtres, une œuvre anonyme. La table
   « auteurs » ne porte AUCUNE colonne qui distingue une personne d'une
   attribution — pas de « nature_personne », qui n'existe que sur
   « auteurs_valeur » — et sa seule marque est un « titre » rédigé
   (« Attribution traditionnelle aux Douze Apôtres ») que porte UNE fiche sur
   536. Une règle tirée de là inventerait une convention que la base n'a pas.
   On écarte donc par IDENTIFIANT, qui ne bouge pas, et jamais par le nom, qui
   se réécrit. ⚠️ Le remède durable est une colonne de nature sur « auteurs » :
   le jour où elle existe, cette liste disparaît. */
export const AUTEURS_ECARTES: readonly string[] = ['A0012']

/** L'auteur d'une ligne d'embed PostgREST, qui rend tantôt un objet, tantôt un
 *  tableau selon la cardinalité qu'il infère. Les deux formes se lisent ici. */
export function auteurDeLigne(brut: unknown): AuteurDuCorpus | null {
  const o = Array.isArray(brut) ? brut[0] : brut
  if (!o || typeof o !== 'object') return null
  const r = o as Record<string, unknown>
  const id = typeof r.id_auteur === 'string' ? r.id_auteur : null
  const nom = typeof r.nom === 'string' ? r.nom : null
  if (!id || !nom) return null
  const annee = typeof r.date_debut_annee === 'number' ? r.date_debut_annee : null
  return { id_auteur: id, nom, date_debut_annee: annee }
}

/* ⚠️ L'ordre est CHRONOLOGIQUE, et c'est le propos de la bande : elle va de
   Tertullien à Thomas d'Aquin, et cette suite raconte quelque chose qu'un
   classement alphabétique effacerait. Un auteur sans année ferme la marche
   plutôt que d'ouvrir : on ne met pas en tête ce qu'on ne sait pas dater.
   Le nom départage deux contemporains — à donnée égale, la porte doit être la
   même à chaque visite. */
function comparer(a: AuteurDuCorpus, b: AuteurDuCorpus): number {
  const x = a.date_debut_annee, y = b.date_debut_annee
  if (x !== y) {
    if (x === null) return 1
    if (y === null) return -1
    return x - y
  }
  return a.nom.localeCompare(b.nom, 'fr')
}

/**
 * Les auteurs dont au moins une œuvre est offerte à la lecture, chronologiques.
 *
 * ⛔ Les CO-SIGNATURES comptent. « v_oeuvres_auteurs » fait autorité sur ce
 * point (cf. AGENTS.md) : le premier auteur vit dans « oeuvres.id_auteur », les
 * suivants dans « oeuvres_auteurs », et s'en tenir au premier perd Rufin
 * d'Aquilée, second auteur de l'Histoire ecclésiastique.
 *
 * ⚠️ « oeuvresPubliees » est la liste des œuvres RÉELLEMENT servies au lecteur.
 * Une co-signature portée par une œuvre retenue ne fait donc pas paraître son
 * auteur : c'est le seul filtre, et il ne se devine pas depuis la table de
 * liaison, qui ignore la publication.
 */
export function auteursDuCorpus(
  signatures: readonly SignatureOeuvre[],
  oeuvresPubliees: ReadonlySet<string>,
): AuteurDuCorpus[] {
  const vus = new Map<string, AuteurDuCorpus>()
  for (const s of signatures) {
    if (!s.auteur) continue
    if (!oeuvresPubliees.has(s.id_oeuvre)) continue
    if (AUTEURS_ECARTES.includes(s.auteur.id_auteur)) continue
    if (!vus.has(s.auteur.id_auteur)) vus.set(s.auteur.id_auteur, s.auteur)
  }
  return [...vus.values()].sort(comparer)
}
