/**
 * Les manières ALTERNATIVES de lire un même texte biblique, réunies en un seul
 * endroit — le menu « occasionnel » du volet de gauche (Bible classique).
 *
 * Distinction cardinale : le menu déroulant CENTRAL choisit LA BIBLE (quel témoin
 * on lit), ce menu-ci choisit COMMENT on la lit. Les deux ne se mélangent jamais :
 * une façon de lire glissée parmi les traductions se donne pour une traduction de
 * plus, et le lecteur qui la choisit croit changer de bible.
 *
 * ⛔ Rien ici n'est déduit d'un identifiant de traduction. Le menu se compose des
 * FAITS que la page a lus dans les données : les couches textuelles réellement
 * exposées par la vue, l'existence d'un second membre dans la famille éditoriale,
 * l'existence d'un appareil éditorial. Le jour où une couche modernisée est
 * publiée, ou une nouvelle famille bilingue importée, le choix paraît de lui-même,
 * sans qu'une ligne change ici.
 *
 * Un groupe qui n'offre qu'un seul choix ne paraît pas : c'est ce qui rend le menu
 * « occasionnel » plutôt que permanent.
 *
 * Module pur, testé par bibleModesAlternatifs.test.ts.
 */

import type { Couche899 } from './bible899'

/** Ce qu'un choix change dans l'adresse de lecture (voir `urlLectureBible`). */
export type CibleLectureAlternative = {
  couche?: Couche899
  bilingue?: boolean
  texteSeul?: boolean
}

export type ChoixLectureBible = {
  cle: string
  label: string
  /** Infobulle : ce que ce mode montre, en une phrase. */
  description: string
  actif: boolean
  cible: CibleLectureAlternative
}

export type GroupeLectureBible = {
  cle: string
  /** Intitulé du groupe, au rang des étiquettes de volet. */
  titre: string
  choix: ChoixLectureBible[]
}

/**
 * Les faits que la page a lus dans les données. Tout est optionnel : une
 * traduction ordinaire n'en porte aucun, et n'obtient donc aucun menu.
 */
export type FaitsLectureBible = {
  /** Couches textuelles réellement exposées par la vue (pilote le groupe « Graphie »). */
  couchesDisponibles?: readonly Couche899[]
  coucheActive?: Couche899 | null
  /** La famille éditoriale porte un second membre : la lecture en regard est possible. */
  bilingueDisponible?: boolean
  bilingueActif?: boolean
  /** L'édition porte un appareil éditorial (introductions, commentaires, notes). */
  paratexteDisponible?: boolean
  texteSeulActif?: boolean
}

// Vocabulaire des couches. Il reprend mot pour mot celui du catalogue des modes
// de lecture (`bibleReadingModes.ts`) : une même chose ne porte pas deux noms
// selon l'écran qui la montre.
const LIBELLE_COUCHE: Record<Couche899, { label: string; description: string }> = {
  modernized: {
    label: 'Graphie modernisée',
    description: 'Orthographe modernisée, établie et validée par l’édition',
  },
  expanded: {
    label: 'Abréviations développées',
    description: 'Graphie du manuscrit, abréviations développées sans modernisation',
  },
  diplomatic: {
    label: 'Diplomatique',
    description: 'Transcription au plus près du manuscrit, abréviations comprises',
  },
}

/** Ordre de présentation : de la lecture la plus aisée à la plus fidèle au témoin. */
const ORDRE_COUCHES: readonly Couche899[] = ['modernized', 'expanded', 'diplomatic']

function groupeGraphie(faits: FaitsLectureBible): GroupeLectureBible | null {
  const disponibles = ORDRE_COUCHES.filter((couche) => faits.couchesDisponibles?.includes(couche))
  // Une seule graphie n'est pas un choix : on ne montre pas un menu à une entrée.
  if (disponibles.length < 2) return null
  return {
    cle: 'graphie',
    titre: 'Graphie',
    choix: disponibles.map((couche) => ({
      cle: `graphie:${couche}`,
      label: LIBELLE_COUCHE[couche].label,
      description: LIBELLE_COUCHE[couche].description,
      actif: faits.coucheActive === couche,
      cible: { couche },
    })),
  }
}

function groupePresentation(faits: FaitsLectureBible): GroupeLectureBible | null {
  const choix: ChoixLectureBible[] = []
  const bilingueActif = faits.bilingueActif === true
  const texteSeulActif = faits.texteSeulActif === true
  if (faits.paratexteDisponible) {
    choix.push({
      cle: 'texte-commentaires',
      label: 'Texte et commentaires',
      description: 'Le texte biblique avec l’appareil de l’édition : introductions, commentaires et notes',
      actif: !bilingueActif && !texteSeulActif,
      cible: {},
    })
    choix.push({
      cle: 'texte-seul',
      label: 'Texte biblique seul',
      description: 'Le seul texte biblique, sans introduction, commentaire ni note',
      actif: !bilingueActif && texteSeulActif,
      cible: { texteSeul: true },
    })
  }
  if (faits.bilingueDisponible) {
    choix.push({
      cle: 'bilingue',
      label: 'Latin-français',
      description: 'Les deux membres de l’édition en regard, alignés créneau par créneau',
      actif: bilingueActif,
      cible: { bilingue: true },
    })
  }
  if (choix.length < 2) return null
  return { cle: 'presentation', titre: 'Lecture', choix }
}

/**
 * Les groupes de choix à montrer, dans l'ordre. Liste vide = aucun menu, ce qui
 * est le cas ordinaire d'une traduction sans couche ni appareil éditorial.
 */
export function modesLectureAlternatifs(faits: FaitsLectureBible): GroupeLectureBible[] {
  return [groupePresentation(faits), groupeGraphie(faits)].filter(
    (groupe): groupe is GroupeLectureBible => groupe !== null,
  )
}
