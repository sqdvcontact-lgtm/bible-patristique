import type { ReactElement, ReactNode } from 'react'

import { CLASSES_BIBLIOGRAPHIE } from '@/app/lib/apparatBibliographie'
import { MARGE_PARAGRAPHE_ENCART, sequencesDeLaNote } from '@/app/lib/compositionNote'
import type { NoteBlocData } from './oeuvreTypes'

/**
 * LA SÉRIE BIBLIOGRAPHIQUE D'UNE NOTE — une liste, et non des paragraphes (charte § 47.2,
 * « SÉRIES BIBLIOGRAPHIQUES DANS LES NOTES »).
 *
 * La donnée matérialise chaque œuvre d'une énumération dans son propre bloc `reference`,
 * marqué `bibliography_list_item` ; le rendu réunit les blocs marqués qui se suivent dans
 * la famille bibliographique commune, celle de « Du même auteur » et de la fenêtre d'une
 * note biblique. ⛔ Aucune reconnaissance : seule la marque fait une entrée.
 *
 * ⚠️ CHAQUE BLOC GARDE SON RENDU ENTIER — attributs, renvois en ligne, point final — et
 * l'entrée ne fait que l'envelopper. Ce n'est pas une seconde écriture du bloc.
 *
 * ⛔ LA COMPOSITION PROPRE À LA NOTE — retrait, encre, blanc entre les entrées — N'EST PAS
 * ICI. Elle vit dans la feuille, sous l'encart (`.cs-encart-propos`), qui est le cadre de
 * toute note du site : la fenêtre de la page Bible la reçoit du même geste, sans qu'on ait
 * à l'instruire. Le style en ligne ne pose que le blanc qui sépare la série de ses
 * voisins, celui de tout bloc de note.
 */
export function composerSeriesBibliographiques(
  blocs: readonly NoteBlocData[],
  rendus: readonly ReactElement[],
): ReactNode[] {
  return sequencesDeLaNote(blocs).flatMap(({ serie, debut, fin }) => {
    const tranche = rendus.slice(debut, fin)
    if (!serie) return tranche
    return [
      <div
        key={`serie:${blocs[debut].blockId}`}
        className={CLASSES_BIBLIOGRAPHIE.bloc}
        style={{ margin: `0 0 ${MARGE_PARAGRAPHE_ENCART}` }}
      >
        <ul className={CLASSES_BIBLIOGRAPHIE.liste}>
          {tranche.map((rendu, i) => (
            <li key={blocs[debut + i].blockId} className={CLASSES_BIBLIOGRAPHIE.entree}>{rendu}</li>
          ))}
        </ul>
      </div>,
    ]
  })
}
