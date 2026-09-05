import { CLASSES_BIBLIOGRAPHIE } from '@/app/lib/apparatBibliographie'
import {
  noticeDUnOuvrage,
  type OuvrageBibliographique,
} from '@/app/lib/bibleBibliographieOuvrages'
import ReferenceBibliographique, { FragmentReference } from './ReferenceBibliographique'

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
 * bibliographie imprimée se tenant par son retrait et par son blanc. Chaque
 * entrée compose sa référence par LE moteur bibliographique du site
 * (`ReferenceBibliographique`) : la liste n'a pas de règle à elle.
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
            <ReferenceBibliographique notice={noticeDUnOuvrage(ouvrage)} avecAuteur={avecAuteur} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * ⚠️ Ré-exporté pour les appelants historiques (la fiche « À propos de cette
 * traduction » compose ainsi la référence des volumes servis) : le fragment vit
 * désormais dans `ReferenceBibliographique.tsx`, avec la référence entière.
 */
export { FragmentReference }
