/**
 * Le TÉMOIN de la pièce « Du même auteur » de Fillion, tel que la vue
 * `v_bible_editorial_bibliography_entries` le sert : quinze ouvrages, dans
 * l'ordre de la page imprimée, avec leurs formes d'autorité d'auteur et
 * d'éditeur.
 *
 * ⚠️ Ce n'est pas un jeu d'essai inventé : les quinze lignes sont recopiées de
 * la base, y compris les sous-titres longs, parce que c'est sur elles que se
 * vérifie l'absence de toute description matérielle. Une donnée d'essai plus
 * courte prouverait seulement qu'on sait la composer.
 *
 * ⛔ Fichier de TÉMOIN, employé par les suites de tests. Il n'est appelé par
 * aucune page — sur le modèle de `couleursEnDurInventaire.ts`.
 */
import type { LigneBibliographieOuvrage } from './bibleBibliographieOuvrages'

export const FAMILLE_FILLION = '317d14e6-15f2-44ae-b6f6-39f7809a9c03'

const AUTEUR = {
  auteur_nom: 'Louis-Claude Fillion',
  auteur_prenom: 'Louis-Claude',
  auteur_nom_famille: 'Fillion',
}

type Notice = {
  ordre: number
  ouvrage: number
  titre: string
  sousTitre?: string
  lieu: string
  editeur: string
  annee: number
}

const NOTICES: Notice[] = [
  { ordre: 1, ouvrage: 645, titre: 'Introduction générale aux Évangiles', lieu: 'Paris', editeur: 'P. Lethielleux', annee: 1889 },
  { ordre: 2, ouvrage: 644, titre: 'Évangile selon saint Matthieu', sousTitre: 'Introduction critique et commentaires', lieu: 'Paris', editeur: 'P. Lethielleux', annee: 1878 },
  { ordre: 3, ouvrage: 643, titre: 'Évangile selon saint Marc', sousTitre: 'Introduction critique et commentaires', lieu: 'Paris', editeur: 'P. Lethielleux', annee: 1879 },
  { ordre: 4, ouvrage: 642, titre: 'Évangile selon saint Luc', sousTitre: 'Introduction critique et commentaires', lieu: 'Paris', editeur: 'P. Lethielleux', annee: 1882 },
  { ordre: 5, ouvrage: 641, titre: 'Évangile selon saint Jean', sousTitre: 'Introduction critique et commentaires', lieu: 'Paris', editeur: 'P. Lethielleux', annee: 1887 },
  {
    ordre: 6, ouvrage: 639,
    titre: 'Synopsis evangelica seu quatuor sancta Jesu Christi evangelia',
    sousTitre: 'Secundum Vulgatam editionem ordine chronologico in harmoniam concinnata',
    lieu: 'Paris', editeur: 'P. Lethielleux', annee: 1882,
  },
  {
    ordre: 7, ouvrage: 650,
    titre: 'Essais d’exégèse',
    sousTitre: 'Exposition, réfutation, critique, mœurs juives, etc.',
    lieu: 'Lyon', editeur: 'Delhomme et Briguet', annee: 1884,
  },
  {
    ordre: 8, ouvrage: 649,
    titre: 'Atlas archéologique de la Bible',
    sousTitre: 'D’après les meilleurs documents, soit anciens, soit modernes, et surtout d’après les découvertes les plus récentes faites dans la Palestine, la Syrie, la Phénicie, l’Égypte et l’Assyrie, destiné à faciliter l’intelligence des saintes Écritures',
    lieu: 'Lyon', editeur: 'Delhomme et Briguet', annee: 1883,
  },
  {
    ordre: 9, ouvrage: 648,
    titre: 'Atlas d’histoire naturelle de la Bible',
    sousTitre: 'D’après les monuments anciens et les meilleures sources modernes et contemporaines, destiné à faciliter l’intelligence des saintes Écritures',
    lieu: 'Lyon', editeur: 'Delhomme et Briguet', annee: 1884,
  },
  {
    ordre: 10, ouvrage: 647,
    titre: 'Atlas géographique de la Bible',
    sousTitre: 'D’après les meilleures sources françaises, anglaises et allemandes contemporaines',
    lieu: 'Lyon', editeur: 'Delhomme et Briguet', annee: 1890,
  },
  {
    ordre: 11, ouvrage: 653,
    titre: 'Biblia sacra juxta Vulgatæ exemplaria et correctoria romana denuo edita',
    sousTitre: 'Divisionibus logicis analysique continua, sensum illustrantibus, ornata',
    lieu: 'Paris', editeur: 'Letouzey et Ané', annee: 1887,
  },
  {
    ordre: 12, ouvrage: 654,
    titre: 'Novum Testamentum juxta Vulgatæ exemplaria et correctoria romana denuo editum',
    sousTitre: 'Divisionibus logicis analysique continua, sensum illustrantibus, ornatum',
    lieu: 'Paris', editeur: 'Berche et Tralin', annee: 1885,
  },
  { ordre: 13, ouvrage: 646, titre: 'L’Idée centrale de la Bible', lieu: 'Lyon', editeur: 'Delhomme et Briguet', annee: 1888 },
  { ordre: 14, ouvrage: 652, titre: 'Les Psaumes commentés d’après la Vulgate et l’hébreu', lieu: 'Paris', editeur: 'Letouzey et Ané', annee: 1893 },
  {
    ordre: 15, ouvrage: 651,
    titre: 'Les Saints Évangiles',
    sousTitre: 'Traduction annotée et ornée de nombreuses gravures d’après les monuments anciens',
    lieu: 'Paris', editeur: 'Letouzey et Ané', annee: 1896,
  },
]

/** L'identifiant du bloc matériel d'où l'entrée de rang `ordre` est issue. */
export function blocSourceDuRang(ordre: number): string {
  return `t01-lim-p0002-bibliography-${String(ordre).padStart(2, '0')}`
}

/** Les quinze lignes de la pièce, telles que la vue les sert. */
export const ENTREES_DU_MEME_AUTEUR: LigneBibliographieOuvrage[] = NOTICES.map((notice) => ({
  family_id: FAMILLE_FILLION,
  piece_key: 'du-meme-auteur',
  display_order: notice.ordre,
  source_body_block_id: blocSourceDuRang(notice.ordre),
  ouvrage_id: notice.ouvrage,
  titre: notice.titre,
  sous_titre: notice.sousTitre ?? null,
  lieu: notice.lieu,
  editeur: notice.editeur,
  annee: notice.annee,
  ...AUTEUR,
}))

/** Les blocs matériels de la pièce, dans l'ordre du sommaire. */
export const BLOCS_DU_MEME_AUTEUR = NOTICES.map((notice) => blocSourceDuRang(notice.ordre))
