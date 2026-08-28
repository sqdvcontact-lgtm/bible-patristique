import { Fragment } from 'react'

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
 * pas quinze fois.
 *
 * ⛔ Aucune puce, aucun tiret, aucun cadre, aucun fond, aucune bordure : une
 * bibliographie imprimée se tient par son retrait et par son blanc. La forme
 * vit dans `.cs-bibliographie-ouvrages` (`app/globals.css`).
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
    <ul className="cs-bibliographie-ouvrages">
      {ouvrages.map((ouvrage) => (
        <li key={ouvrage.id} id={`ouvrage-${ouvrage.id}`} data-ouvrage-id={ouvrage.id}>
          {segmentsReference(ouvrage, { avecAuteur }).map((segment, rang) => (
            <RendreSegment key={`${ouvrage.id}:${rang}`} segment={segment} />
          ))}
        </li>
      ))}
    </ul>
  )
}

/**
 * Un fragment de référence, composé selon son RÔLE.
 *
 * Trois compositions, et rien d'autre : l'italique pour l'intitulé de l'ouvrage
 * — titre, sous-titre et le deux-points qui les joint ne font qu'un seul titre
 * typographique —, les petites capitales pour le nom d'autorité de l'auteur, le
 * romain pour tout le reste. ⚠️ Le nom se compose depuis la donnée
 * (`auteurs_valeur.nom_famille`), ⛔ jamais par découpe de la chaîne affichée.
 */
function RendreSegment({ segment }: { segment: SegmentReference }) {
  // Le champ d'origine reste dans le document : c'est par lui qu'on vérifie
  // qu'un titre et son sous-titre n'ont pas été fondus, et qu'aucune donnée
  // matérielle ne s'est glissée dans la référence.
  const champ = segment.champ ?? undefined
  if (segment.composition === 'italique') {
    return <em data-champ={champ}>{segment.texte}</em>
  }
  if (segment.composition === 'petites-capitales') {
    return (
      <span data-champ={champ} style={{ fontVariant: 'small-caps', letterSpacing: '0.02em' }}>
        {segment.texte}
      </span>
    )
  }
  // La ponctuation que le composant ajoute n'a pas de champ, donc rien à
  // baliser : elle se pose telle quelle, au fil du texte.
  if (!champ) return <Fragment>{segment.texte}</Fragment>
  return <span data-champ={champ}>{segment.texte}</span>
}
