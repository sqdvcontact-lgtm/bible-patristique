/**
 * Les manières ALTERNATIVES de lire un même texte biblique, réunies en un seul
 * endroit — le menu « occasionnel » du volet de gauche (Bible classique).
 *
 * Distinction cardinale : le menu déroulant CENTRAL choisit LA BIBLE (quel témoin
 * on lit), ce menu-ci choisit COMMENT on la lit. Les deux ne se mélangent jamais :
 * une façon de lire glissée parmi les traductions se donne pour une traduction de
 * plus, et le lecteur qui la choisit croit changer de bible.
 *
 * ⛔ Les axes sont INDÉPENDANTS, jamais fondus en une liste unique. « Sans les
 * commentaires » s'applique à ce qu'on lit, quel que soit ce qu'on lit : le latin
 * seul, le français seul ou les deux en regard. Une liste exclusive obligerait à
 * énumérer les combinaisons — six entrées pour deux choix — et le lecteur devrait
 * relire toute la liste pour changer un seul réglage.
 *
 * ⛔ Rien ici n'est déduit d'un identifiant de traduction. Le menu se compose des
 * FAITS que la page a lus dans les données : les membres de la famille éditoriale
 * et leur langue, les couches textuelles réellement exposées par la vue,
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

/**
 * Ce qu'un choix change dans l'adresse de lecture (voir `urlLectureBible`). C'est
 * une SURCHARGE, non une adresse complète : ce que le choix ne nomme pas est
 * repris de la lecture courante. C'est ce qui rend les axes indépendants — passer
 * au latin garde le réglage des commentaires, et l'inverse aussi.
 */
export type CibleLectureAlternative = {
  trad?: string
  couche?: Couche899
  bilingue?: boolean
  texteSeul?: boolean
}

export type ChoixLectureBible = {
  cle: string
  label: string
  /**
   * Le libellé d'ACTION, quand le groupe se rend en une seule ligne : ce qu'un
   * clic fera, non l'état où l'on est. « Masquer les commentaires » plutôt que
   * « Sans les commentaires ». ⚠️ Les deux sont nécessaires : le premier nomme
   * un état pour l'infobulle et le contrôle, le second dit un geste.
   */
  labelAction?: string
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
  /**
   * Groupe BINAIRE, rendu en une seule ligne d'action plutôt qu'en deux choix.
   * Un oui-ou-non ne demande pas deux cases : il demande une ligne qui dit ce
   * qu'un clic fera. Le volet montre alors le seul choix INACTIF, sous son
   * libellé d'action, et se passe d'étiquette — la ligne se nomme elle-même.
   */
  bascule?: boolean
}

/** Un membre de la famille éditoriale, tel que le catalogue le décrit. */
export type MembreFamilleLecture = {
  tradId: string
  /** Code de langue du catalogue (`fr`, `la`, `grc`…). */
  langue: string
  /** `translation` = la traduction ; toute autre valeur = le texte dans sa langue d'origine. */
  role: string
}

/**
 * Les faits que la page a lus dans les données. Tout est optionnel : une
 * traduction ordinaire n'en porte aucun, et n'obtient donc aucun menu.
 */
export type FaitsLectureBible = {
  /** Couches textuelles réellement exposées par la vue (pilote le groupe « Graphie »). */
  couchesDisponibles?: readonly Couche899[]
  coucheActive?: Couche899 | null
  /** Membres de la famille éditoriale, dans l'ordre d'affichage du catalogue. */
  membresFamille?: readonly MembreFamilleLecture[]
  /** La traduction lue, pour désigner le membre actif. */
  tradActive?: string
  bilingueActif?: boolean
  /** L'édition porte un appareil éditorial (introductions, commentaires, notes). */
  paratexteDisponible?: boolean
  texteSeulActif?: boolean
}

// Vocabulaire des langues. Deux formes, parce qu'une langue nommée SEULE ouvre la
// ligne (« Latin ») tandis qu'en regard elle suit un tiret (« Latin-français »).
const NOM_LANGUE: Record<string, { seule: string; suivante: string }> = {
  fr: { seule: 'Français', suivante: 'français' },
  la: { seule: 'Latin', suivante: 'latin' },
  grc: { seule: 'Grec', suivante: 'grec' },
  el: { seule: 'Grec', suivante: 'grec' },
  he: { seule: 'Hébreu', suivante: 'hébreu' },
  hbo: { seule: 'Hébreu', suivante: 'hébreu' },
}

function nomLangue(code: string): { seule: string; suivante: string } {
  const connu = NOM_LANGUE[code?.toLowerCase()]
  if (connu) return connu
  // Langue non répertoriée : on rend le code tel quel plutôt qu'un nom inventé.
  const brut = (code || '').trim() || '—'
  return { seule: brut.charAt(0).toUpperCase() + brut.slice(1), suivante: brut.toLowerCase() }
}

/**
 * « Latin-français » : la langue d'ORIGINE ouvre, la traduction suit. L'ordre ne
 * vient pas de l'affichage des colonnes (le français est à gauche chez Fillion)
 * mais du rôle des membres, si bien qu'une future édition grecque se nommera
 * « Grec-français » sans qu'on y touche.
 */
function libelleEnRegard(membres: readonly MembreFamilleLecture[]): string {
  const original = membres.find((m) => m.role !== 'translation') ?? membres[0]
  const traduction = membres.find((m) => m !== original) ?? membres[1]
  if (!original || !traduction) return 'Les deux en regard'
  return `${nomLangue(original.langue).seule}-${nomLangue(traduction.langue).suivante}`
}

/** Ordre de présentation : de la lecture la plus aisée à la plus fidèle au témoin. */
const ORDRE_COUCHES: readonly Couche899[] = ['modernized', 'expanded', 'diplomatic']

/**
 * ⚠️ Les libellés ne redisent pas le nom de l'axe : sous l'étiquette « Graphie »,
 * « Graphie modernisée » et « Abréviations développées » écrivaient deux fois le
 * même mot, et le second débordait à lui seul la largeur du volet. Ce sont des
 * ADJECTIFS qui qualifient la graphie ; la description en donne le sens entier.
 */
const LIBELLE_COUCHE: Record<Couche899, { label: string; description: string }> = {
  modernized: {
    label: 'Modernisée',
    description: 'Orthographe modernisée, établie et validée par l’édition',
  },
  expanded: {
    label: 'Développées',
    description: 'Graphie du manuscrit, abréviations développées sans modernisation',
  },
  diplomatic: {
    label: 'Diplomatique',
    description: 'Transcription au plus près du manuscrit, abréviations comprises',
  },
}

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

/**
 * Premier axe : QUEL TEXTE de l'édition on lit. Chaque membre de la famille, plus
 * la lecture en regard, glissée après le premier membre comme sur la page Œuvre
 * (Français · Français & Latin · Latin).
 */
function groupeTexte(faits: FaitsLectureBible): GroupeLectureBible | null {
  const membres = faits.membresFamille ?? []
  // Une famille à un seul membre se lit comme une traduction ordinaire.
  if (membres.length < 2) return null
  const bilingueActif = faits.bilingueActif === true
  const choix: ChoixLectureBible[] = membres.map((membre) => ({
    cle: `membre:${membre.tradId}`,
    label: nomLangue(membre.langue).seule,
    description: 'Ce seul texte de l’édition, en une colonne',
    actif: !bilingueActif && faits.tradActive === membre.tradId,
    // `bilingue: false` est EXPLICITE : choisir un membre quitte la lecture en
    // regard, alors que le réglage des commentaires, lui, est conservé.
    cible: { trad: membre.tradId, bilingue: false },
  }))
  choix.splice(1, 0, {
    cle: 'bilingue',
    label: libelleEnRegard(membres),
    description: 'Les deux textes de l’édition en regard, alignés créneau par créneau',
    actif: bilingueActif,
    cible: { bilingue: true },
  })
  return { cle: 'texte', titre: 'Lecture', choix }
}

/**
 * Second axe, INDÉPENDANT du premier : l'appareil éditorial. Il s'applique à ce
 * qu'on lit, que ce soit une colonne ou deux.
 */
function groupeCommentaires(faits: FaitsLectureBible): GroupeLectureBible | null {
  if (!faits.paratexteDisponible) return null
  const texteSeul = faits.texteSeulActif === true
  return {
    cle: 'commentaires',
    titre: 'Commentaires',
    bascule: true,
    choix: [
      {
        cle: 'avec-commentaires',
        label: 'Avec les commentaires',
        labelAction: 'Afficher les commentaires',
        description: 'Le texte avec l’appareil de l’édition : introductions, commentaires et notes',
        actif: !texteSeul,
        cible: { texteSeul: false },
      },
      {
        cle: 'sans-commentaires',
        label: 'Sans les commentaires',
        labelAction: 'Masquer les commentaires',
        description: 'Le seul texte biblique, sans introduction, commentaire ni note',
        actif: texteSeul,
        cible: { texteSeul: true },
      },
    ],
  }
}

/**
 * Les groupes de choix à montrer, dans l'ordre. Liste vide = aucun menu, ce qui
 * est le cas ordinaire d'une traduction sans couche ni appareil éditorial.
 */
export function modesLectureAlternatifs(faits: FaitsLectureBible): GroupeLectureBible[] {
  return [groupeTexte(faits), groupeCommentaires(faits), groupeGraphie(faits)].filter(
    (groupe): groupe is GroupeLectureBible => groupe !== null,
  )
}
