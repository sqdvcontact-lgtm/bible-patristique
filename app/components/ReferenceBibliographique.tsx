import { Fragment } from 'react'

import { rendreSiecles } from '@/app/lib/siecles'
import { normaliserEspaces } from '@/app/lib/typographie'
import {
  CLASSE_CARACTERE_BIBLIOGRAPHIE,
  CLASSES_BIBLIOGRAPHIE,
} from '@/app/lib/apparatBibliographie'
import {
  fragmentsReference,
  type FragmentNotice,
  type NoticeBibliographique,
} from '@/app/lib/referenceBibliographique'

/**
 * UNE RÉFÉRENCE BIBLIOGRAPHIQUE, composée depuis la donnée structurée.
 *
 * Le moteur (`app/lib/referenceBibliographique.ts`) décide de l'ordre, de la
 * ponctuation et du rôle de chaque fragment ; ce composant ne fait que les baliser,
 * et la feuille les compose (`.cs-reference-bibliographique .cs-apparat-…`). Il
 * rend des NŒUDS, jamais du HTML injecté, et il sert le serveur comme le
 * navigateur : aucun crochet, aucun accès à la session.
 *
 * ⚠️ Il ne porte AUCUN identifiant : c'est l'appelant qui sait où la référence
 * paraît — une entrée de liste porte son `data-ouvrage-id`, un segment d'œuvre
 * son `id` — et une référence qui se déclarerait elle-même ferait doublon.
 */
export default function ReferenceBibliographique({
  notice,
  avecAuteur = true,
  className,
}: {
  notice: NoticeBibliographique
  /** L'auteur paraît en tête. Faux quand le titre de la pièce l'établit déjà. */
  avecAuteur?: boolean
  className?: string
}) {
  const fragments = fragmentsReference(notice, { avecAuteur })
  if (fragments.length === 0) return null
  const classe = className
    ? `${CLASSES_BIBLIOGRAPHIE.reference} ${className}`
    : CLASSES_BIBLIOGRAPHIE.reference
  return (
    <span className={classe}>
      {fragments.map((fragment, rang) => (
        <FragmentReference key={rang} segment={fragment} />
      ))}
    </span>
  )
}

/**
 * La typographie de LECTURE d'un fragment : l'apostrophe courbe, et les espaces
 * insécables que la haute ponctuation et les guillemets demandent. La norme est au
 * RENDU (charte § 3.2) : la donnée garde ses espaces ordinaires, et
 * `normaliserEspaces` ne fait que convertir le TYPE d'une espace déjà là, jamais
 * en ajouter. Un titre tapé « assertore : disputatio » se lit donc avec son
 * insécable, sans qu'une ligne de la base ait bougé.
 */
export function typographieFragment(texte: string): string {
  return normaliserEspaces(texte.replace(/'/gu, '’'))
}

/**
 * Un fragment de référence, composé selon son RÔLE.
 *
 * Le rôle est nommé par la donnée (`segment.style`) et la feuille le compose :
 * l'italique pour l'intitulé de l'ouvrage — titre, sous-titre et le point qui les
 * joint ne font qu'un seul titre typographique —, les petites capitales pour le
 * nom d'autorité de l'auteur, le romain pour tout le reste. ⚠️ Le nom se compose
 * depuis la donnée (`auteurs_valeur.nom_famille`), ⛔ jamais par découpe de la
 * chaîne affichée.
 *
 * ⚠️ EXPORTÉ : la fiche « À propos de cette traduction » compose de la même façon
 * la référence des volumes servis, qui n'est pas une œuvre du catalogue mais suit
 * les mêmes normes. Deux copies de ces trois lignes divergeraient au premier style
 * ajouté au vocabulaire.
 *
 * ⚠️ LES SIÈCLES SE COMPOSENT (demande de l'auteur, 2026-09-04). « Bible française du
 * XIIIe siècle — manuscrit Français 899 » est un intitulé d'édition comme un autre :
 * son ordinal y prenait des chiffres ordinaires quand la même chaîne, deux centimètres
 * plus haut, portait ses petites capitales et son exposant.
 * ⛔ `rendreSiecles`, et non `rendreEnrichi` : celui-ci italiserait un titre entre
 * astérisques, et un `em` posé dans un fragment DÉJÀ italique — l'intitulé de
 * l'ouvrage l'est — ne se verrait pas. La composition des italiques appartient ici au
 * RÔLE du fragment, que la donnée nomme ; elle ne se prend pas dans son texte.
 */
export function FragmentReference({ segment }: { segment: FragmentNotice }) {
  // Le champ d'origine reste dans le document : c'est par lui qu'on vérifie
  // qu'un titre et son sous-titre n'ont pas été fondus, et qu'aucune donnée
  // matérielle ne s'est glissée dans la référence.
  const champ = segment.champ ?? undefined
  const classe = segment.style ? CLASSE_CARACTERE_BIBLIOGRAPHIE[segment.style] : undefined
  const texte = rendreSiecles(typographieFragment(segment.texte))
  if (segment.composition === 'italique') {
    return <em className={classe} data-champ={champ}>{texte}</em>
  }
  // La ponctuation que le moteur ajoute n'a ni champ ni style : elle se pose
  // telle quelle, au fil du texte, et hérite de la séquence qui l'entoure.
  if (!champ && !classe) return <Fragment>{texte}</Fragment>
  return <span className={classe} data-champ={champ}>{texte}</span>
}
