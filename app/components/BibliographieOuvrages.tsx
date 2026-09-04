import { Fragment } from 'react'

import {
  CLASSE_CARACTERE_BIBLIOGRAPHIE,
  CLASSES_BIBLIOGRAPHIE,
} from '@/app/lib/apparatBibliographie'
import {
  segmentsReference,
  type OuvrageBibliographique,
  type SegmentReference,
} from '@/app/lib/bibleBibliographieOuvrages'

/**
 * Une LISTE D'OUVRAGES, composée depuis les champs de chaque notice.
 *
 * Le composant est générique : il sert « Du même auteur » de Fillion comme
 * toute autre liste bibliographique structurée, et c'est l'appelant qui dit si
 * l'auteur doit paraître — dans une rubrique qui le nomme déjà, on ne le répète
 * pas quinze fois. ⛔ Rien ici ne connaît le titre de la pièce : le composant ne
 * lit pas « Du même auteur » pour en déduire quoi que ce soit.
 *
 * La forme est celle de TOUTES les bibliographies de l'apparat —
 * `.cs-apparat-bibliographie` — et non une composition propre à cette pièce :
 * ⛔ aucune puce, aucun tiret, aucun cadre, aucun fond, aucune bordure, une
 * bibliographie imprimée se tenant par son retrait et par son blanc.
 *
 * ⚠️ Chaque `<li>` répond d'UN `ouvrage_id`, et sa clé React est cet
 * identifiant : ⛔ jamais le rang dans le tableau, qui change dès qu'une entrée
 * s'insère et ferait recomposer les suivantes.
 */
export default function BibliographieOuvrages({
  ouvrages,
  avecAuteur = true,
}: {
  ouvrages: readonly OuvrageBibliographique[]
  /** L'auteur paraît en tête de chaque référence. Faux quand le titre de la
   *  pièce l'établit déjà pour toutes. */
  avecAuteur?: boolean
}) {
  if (ouvrages.length === 0) return null
  return (
    // Une liste structurée se lit aujourd'hui comme une pièce entière : aucun
    // ancêtre ne porte la composition dont elle devrait descendre d'un cran,
    // elle la pose donc elle-même. Le reste est celui de toute bibliographie.
    <div className={`${CLASSES_BIBLIOGRAPHIE.bloc} ${CLASSES_BIBLIOGRAPHIE.sansHote}`}>
      <ul className={CLASSES_BIBLIOGRAPHIE.liste}>
        {ouvrages.map((ouvrage) => (
          <li
            key={ouvrage.id}
            id={`ouvrage-${ouvrage.id}`}
            className={CLASSES_BIBLIOGRAPHIE.entree}
            data-ouvrage-id={ouvrage.id}
          >
            {segmentsReference(ouvrage, { avecAuteur }).map((segment, rang) => (
              <FragmentReference key={`${ouvrage.id}:${rang}`} segment={segment} />
            ))}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Un fragment de référence, composé selon son RÔLE.
 *
 * Le rôle est nommé par la donnée (`segment.style`) et la feuille le compose :
 * l'italique pour l'intitulé de l'ouvrage — titre, sous-titre et le deux-points
 * qui les joint ne font qu'un seul titre typographique —, les petites capitales
 * pour le nom d'autorité de l'auteur, le romain pour tout le reste. ⚠️ Le nom se
 * compose depuis la donnée (`auteurs_valeur.nom_famille`), ⛔ jamais par découpe
 * de la chaîne affichée.
 *
 * ⚠️ EXPORTÉ : la fiche « À propos de cette traduction » compose de la même façon
 * la référence des volumes servis, qui n'est pas une œuvre du catalogue mais suit
 * les mêmes normes. Deux copies de ces trois lignes divergeraient au premier style
 * ajouté au vocabulaire.
 */
export function FragmentReference({ segment }: { segment: SegmentReference }) {
  // Le champ d'origine reste dans le document : c'est par lui qu'on vérifie
  // qu'un titre et son sous-titre n'ont pas été fondus, et qu'aucune donnée
  // matérielle ne s'est glissée dans la référence.
  const champ = segment.champ ?? undefined
  const classe = segment.style ? CLASSE_CARACTERE_BIBLIOGRAPHIE[segment.style] : undefined
  if (segment.composition === 'italique') {
    return <em className={classe} data-champ={champ}>{segment.texte}</em>
  }
  // La ponctuation que le composant ajoute n'a ni champ ni style : elle se pose
  // telle quelle, au fil du texte, et hérite de la séquence qui l'entoure.
  if (!champ && !classe) return <Fragment>{segment.texte}</Fragment>
  return <span className={classe} data-champ={champ}>{segment.texte}</span>
}
