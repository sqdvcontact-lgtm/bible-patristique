// Les missions du centre de contrôle, et l'ordre du volet qui les nomme.
//
// Une mission est une ligne de `controle_sections` : un intitulé, une note de synthèse et
// une liste de tâches (charte § 30.1). Le volet les nomme TOUTES, dans l'ordre de la table,
// et une seule se charge à la fois : c'est ce qui permet au centre de contrôle de s'ouvrir
// quand l'un de ses calculs dépasse son délai.
//
// ⛔ La liste vient de la BASE, jamais d'une énumération écrite dans une page. La page des
// statistiques posait ses cartes à la main : deux missions tenues en base depuis août,
// « Eusèbe » et « Espace du lecteur », n'y paraissaient nulle part, et une carte appelait
// une section que la base ne porte pas. Le code ne déclare ici que ce que la base ne peut
// pas porter : un OUTIL sans note ni tâches, et les segments d'adresse qu'aucune mission
// ne peut prendre.

export type LigneMission = { cle: string | null; titre: string | null; ordre: number | null }

export type Mission = {
  cle: string
  titre: string
  ordre: number
  /** Une mission tenue en base porte une note et des tâches ; un outil n'en porte pas. */
  enBase: boolean
}

/** Le segment d'adresse de l'état du système de contrôle v2. */
export const SEGMENT_SYSTEME = 'systeme'

export const ADRESSE_SYSTEME = `/admin/controle/${SEGMENT_SYSTEME}`

/** Les segments que le centre de contrôle se réserve : l'état du contrôle v2, et l'ancienne
 *  adresse des statistiques du corpus, qui ne fait plus que rediriger. Une mission de ce
 *  nom serait inatteignable, la route statique l'emportant sur la route dynamique. */
export const CLES_RESERVEES: ReadonlySet<string> = new Set([SEGMENT_SYSTEME, 'statistiques'])

/** Ce que la base ne connaît pas : un outil posé dans le volet sans ligne de journal. Son
 *  rang le range entre deux missions de la base, là où la page des statistiques le montrait. */
export const OUTILS_DU_CONTROLE: readonly Mission[] = [
  { cle: 'facsimile_bible899', titre: 'Fac-similé Bible 899', ordre: 6.5, enBase: false },
]

const RANG_INCONNU = Number.POSITIVE_INFINITY

/**
 * La liste du volet : les missions de la base, les outils déclarés, dans l'ordre.
 *
 * La base l'emporte sur un outil de même clé, puisqu'elle porte alors une note et des
 * tâches. Un rang absent range la mission en dernier plutôt que de l'écarter : une mission
 * qu'on ne voit pas est une mission qu'on oublie. À rang égal, l'intitulé départage, pour
 * que l'ordre ne dépende pas de celui des lignes rendues.
 */
export function composerMissions(
  lignes: readonly LigneMission[],
  outils: readonly Mission[] = OUTILS_DU_CONTROLE,
): Mission[] {
  const parCle = new Map<string, Mission>()
  for (const outil of outils) parCle.set(outil.cle, outil)
  for (const ligne of lignes) {
    const cle = ligne.cle?.trim()
    if (!cle) continue
    const titre = ligne.titre?.trim() || cle
    parCle.set(cle, { cle, titre, ordre: ligne.ordre ?? RANG_INCONNU, enBase: true })
  }
  return [...parCle.values()]
    .filter((mission) => !CLES_RESERVEES.has(mission.cle))
    .sort((a, b) => {
      if (a.ordre !== b.ordre) return a.ordre < b.ordre ? -1 : 1
      return a.titre.localeCompare(b.titre, 'fr')
    })
}

export function adresseDeMission(cle: string): string {
  return `/admin/controle/${encodeURIComponent(cle)}`
}

export type Todo = { texte: string; fait: boolean }

/** Le préfixe d'une tâche active, que le journal des missions impose (charte § 30.1). */
const PREFIXE_EN_COURS = '⏳ En cours'

/** Ce que la liste d'une mission compte, pour le dire sous son intitulé. */
export function comptesDesTaches(todos: readonly Todo[] | null | undefined) {
  const liste = todos ?? []
  return {
    total: liste.length,
    faites: liste.filter((todo) => todo.fait).length,
    enCours: liste.filter((todo) => !todo.fait && todo.texte.trimStart().startsWith(PREFIXE_EN_COURS)).length,
  }
}
