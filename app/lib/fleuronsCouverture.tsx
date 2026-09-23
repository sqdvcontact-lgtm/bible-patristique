// Fleurons des couvertures de publication : un ornement typographique par genre,
// posé entre le sous-titre et la date, comme la vignette d'une page de titre ancienne.
//
// Ils remplacent les gravures (2026-09-23, décision de l'auteur) : un fleuron tient
// en une ligne d'imprimerie, il orne sans occuper le milieu de la page, et il reste
// lisible sur toutes les couvertures. Les gravures, rendues claires sur un fond
// sombre, passaient en négatif et réclamaient une plaque ; les fleurons n'en ont pas
// besoin.
//
// Gabarit commun : viewBox 0 0 120 40, motif centré sur (60, 20), et de part et
// d'autre des filets ou des rinceaux qui portent le motif jusqu'aux bords. Le côté
// gauche est le miroir du droit (`MIROIR`). Aucune couleur n'est écrite : tout est
// en currentColor, si bien que le fleuron prend l'encre de sa couverture.
// Le trait (`T`) est à l'échelle du dessin, non en non-scaling-stroke : un fleuron
// est une pièce de fonte, son filet grossit avec lui.

import type { ReactNode, SVGProps } from 'react'

const T = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const G = { fill: 'currentColor' }
/** Le côté gauche d'un fleuron : le droit, retourné autour de l'axe x = 60. */
const MIROIR = 'matrix(-1 0 0 1 120 0)'

/** Un fleuron par catégorie de publication (`CATEGORIES_ESSAIS`). Chacun dit son
 *  genre par un objet : le livre ouvert (Exégèse), l’étoile du conte (Fiction), le
 *  laurier (Histoire), les cercles de l’eau (Méditation), la grappe et le cep
 *  (Patristique), la lampe d’étude (Philosophie), la lyre (Poésie), l’encensoir
 *  (Prière), le lys (Spiritualité), la triquetra (Théologie). */
const FLEURONS: Record<string, ReactNode> = {
  'Exégèse': <>
    <path {...T} d="M60 26.5C56 24 51.5 23.4 47 24.4V13.4C51.5 12.4 56 13 60 15.5C64 13 68.5 12.4 73 13.4V24.4C68.5 23.4 64 24 60 26.5ZM60 15.5V26.5" />
    <path {...T} opacity={0.7} d="M50 17C52.6 16.6 55 17 57.2 18.2M50 20.6C52.6 20.2 55 20.6 57.2 21.8M70 17C67.4 16.6 65 17 62.8 18.2M70 20.6C67.4 20.2 65 20.6 62.8 21.8" />
    <path {...T} d="M43 20H18M77 20H102" />
    <path {...G} d="M12.2 20L14.6 18.1L17 20L14.6 21.9ZM103 20L105.4 18.1L107.8 20L105.4 21.9Z" />
  </>,
  'Fiction': <>
    <path {...G} d="M60 12.6L60.9 17.8L63.5 16.5L62.2 19.1L67.4 20L62.2 20.9L63.5 23.5L60.9 22.2L60 27.4L59.1 22.2L56.5 23.5L57.8 20.9L52.6 20L57.8 19.1L56.5 16.5L59.1 17.8Z" />
    <path {...T} d="M70 20C75 20 77 26.5 83 26.5C89 26.5 91 20 97 20C102 20 105 17 105 14.3C105 11.8 103 10.3 101 10.3C99 10.3 97.8 11.8 97.8 13.4C97.8 15 99 16 100.4 16" />
    <path {...T} transform={MIROIR} d="M70 20C75 20 77 26.5 83 26.5C89 26.5 91 20 97 20C102 20 105 17 105 14.3C105 11.8 103 10.3 101 10.3C99 10.3 97.8 11.8 97.8 13.4C97.8 15 99 16 100.4 16" />
  </>,
  'Histoire': <>
    <path {...T} d="M64 20Q86 22.5 107 15.5" />
    <path {...G} d="M68.4 20.4C71.1 20.9 73.5 19 74.2 16.9C71.9 16.5 69.2 17.8 68.4 20.4ZM73.6 20.6C74.1 23.2 76.7 24.7 78.8 24.5C78.4 22.4 76.3 20.4 73.6 20.6ZM78.8 20.6C81.4 20.8 83.4 18.9 83.8 16.8C81.7 16.7 79.3 18.1 78.8 20.6ZM84 20.3C84.7 22.6 87.2 23.7 89.1 23.3C88.5 21.4 86.4 19.8 84 20.3ZM89.2 19.7C91.5 19.7 93.1 17.7 93.2 15.8C91.3 15.9 89.3 17.4 89.2 19.7ZM94.3 18.8C95.1 20.9 97.4 21.6 99.2 21.1C98.5 19.4 96.4 18.1 94.3 18.8ZM99.4 17.7C101.5 17.5 102.8 15.6 102.7 13.9C100.9 14.1 99.3 15.6 99.4 17.7ZM104.1 16.4C105.9 17.3 108 16.4 108.8 15C107.3 14.3 105.1 14.7 104.1 16.4Z" />
    <path {...T} transform={MIROIR} d="M64 20Q86 22.5 107 15.5" />
    <path {...G} transform={MIROIR} d="M68.4 20.4C71.1 20.9 73.5 19 74.2 16.9C71.9 16.5 69.2 17.8 68.4 20.4ZM73.6 20.6C74.1 23.2 76.7 24.7 78.8 24.5C78.4 22.4 76.3 20.4 73.6 20.6ZM78.8 20.6C81.4 20.8 83.4 18.9 83.8 16.8C81.7 16.7 79.3 18.1 78.8 20.6ZM84 20.3C84.7 22.6 87.2 23.7 89.1 23.3C88.5 21.4 86.4 19.8 84 20.3ZM89.2 19.7C91.5 19.7 93.1 17.7 93.2 15.8C91.3 15.9 89.3 17.4 89.2 19.7ZM94.3 18.8C95.1 20.9 97.4 21.6 99.2 21.1C98.5 19.4 96.4 18.1 94.3 18.8ZM99.4 17.7C101.5 17.5 102.8 15.6 102.7 13.9C100.9 14.1 99.3 15.6 99.4 17.7ZM104.1 16.4C105.9 17.3 108 16.4 108.8 15C107.3 14.3 105.1 14.7 104.1 16.4Z" />
    <circle {...T} cx={60} cy={20} r={3.4} />
    <circle {...G} cx={60} cy={20} r={1.2} />
  </>,
  'Méditation': <>
    <circle {...G} cx={60} cy={20} r={1.8} />
    <circle {...T} cx={60} cy={20} r={5} />
    <circle {...T} cx={60} cy={20} r={8.6} />
    <path {...T} d="M71 20q2.5-2.6 5 0t5 0t5 0t5 0t5 0t5 0t5 0" />
    <path {...T} transform={MIROIR} d="M71 20q2.5-2.6 5 0t5 0t5 0t5 0t5 0t5 0t5 0" />
    <circle {...G} cx={110} cy={20} r={1.3} />
    <circle {...G} cx={10} cy={20} r={1.3} />
  </>,
  'Patristique': <>
    <circle {...G} cx={55.6} cy={13.4} r={2.05} />
    <circle {...G} cx={60} cy={13.4} r={2.05} />
    <circle {...G} cx={64.4} cy={13.4} r={2.05} />
    <circle {...G} cx={57.8} cy={17.4} r={2.05} />
    <circle {...G} cx={62.2} cy={17.4} r={2.05} />
    <circle {...G} cx={60} cy={21.4} r={2.05} />
    <circle {...G} cx={57.8} cy={25.2} r={1.7} />
    <circle {...G} cx={62.2} cy={25.2} r={1.7} />
    <circle {...G} cx={60} cy={28.9} r={1.5} />
    <path {...T} d="M60 11C66 7.5 72 17 80 18.5C87 19.8 91 16 97 16.5C101.5 17 104 20 103 23C102.2 25.4 99.2 25.4 98.6 23.4C98.2 22 99.4 21 100.4 21.6" />
    <path {...T} transform={MIROIR} d="M60 11C66 7.5 72 17 80 18.5C87 19.8 91 16 97 16.5C101.5 17 104 20 103 23C102.2 25.4 99.2 25.4 98.6 23.4C98.2 22 99.4 21 100.4 21.6" />
    <path {...G} transform="matrix(1 0 0 -1 0 37.2)" d="M84 18.6c-2.5-0.7 -5.1-3.2 -3.7-6.2c1.2 0.5 2.1 0.5 2.8-0.5c0.2-1.4 0.5-2.1 0.9-2.8c0.5 0.7 0.7 1.4 0.9 2.8c0.7 0.9 1.6 0.9 2.8 0.5c1.4 3 -1.1 5.5 -3.7 6.2Z" />
    <path {...G} transform="matrix(-1 0 0 -1 120 37.2)" d="M84 18.6c-2.5-0.7 -5.1-3.2 -3.7-6.2c1.2 0.5 2.1 0.5 2.8-0.5c0.2-1.4 0.5-2.1 0.9-2.8c0.5 0.7 0.7 1.4 0.9 2.8c0.7 0.9 1.6 0.9 2.8 0.5c1.4 3 -1.1 5.5 -3.7 6.2Z" />
    <path {...T} d="M60 11V7.6" />
  </>,
  'Philosophie': <>
    <path {...T} d="M49.5 21.5C49.5 18 55 16.8 60.5 16.8C65 16.8 68 17.8 70.4 19.4L74.4 18.6C73.8 21 72.2 22.8 69.4 23.3C64.6 25 54 25.4 49.5 21.5Z" />
    <path {...T} d="M49.8 19.8C46.6 18.4 45.4 21 46.6 22.4C47.6 23.6 49.6 23 50.4 22.2" />
    <path {...T} d="M56.5 25V27.4H64.5V25" />
    <circle {...G} cx={59.5} cy={18.4} r={1.1} />
    <path {...G} d="M74 17.2C71.8 15.6 72.2 12.4 74.6 9C76.4 12.2 76.6 15.8 74 17.2Z" />
    <path {...T} d="M41 22.2H18M79 22.2H102" />
    <path {...G} d="M12.2 22.2L14.6 20.3L17 22.2L14.6 24.1ZM103 22.2L105.4 20.3L107.8 22.2L105.4 24.1Z" />
  </>,
  'Poésie': <>
    <path {...T} d="M53.6 24C54 28.4 66 28.4 66.4 24" />
    <path {...T} d="M53.6 24C50.2 20.4 50.4 14.4 54 11C55.2 9.8 54.2 8 52.4 8.6" />
    <path {...T} d="M66.4 24C69.8 20.4 69.6 14.4 66 11C64.8 9.8 65.8 8 67.6 8.6" />
    <path {...T} d="M53.4 12.6H66.6" />
    <path {...T} strokeWidth={0.9} opacity={0.75} d="M57.6 12.6V26.2M60 12.6V26.7M62.4 12.6V26.2" />
    <path {...T} d="M47 20H18M73 20H102" />
    <path {...G} d="M12.2 20L14.6 18.1L17 20L14.6 21.9ZM103 20L105.4 18.1L107.8 20L105.4 21.9Z" />
  </>,
  'Prière': <>
    <path {...G} d="M52.6 23H67.4C66.8 28.6 53.2 28.6 52.6 23Z" />
    <path {...T} d="M57 31H63M60 27.6V31" />
    <path {...T} d="M60 21C57.2 18 62.8 15.2 60 12C57.4 9.2 61.6 7 60 4.2" />
    <path {...T} opacity={0.8} d="M56.4 21C54.2 18.8 57.4 16.6 55.4 14.2" />
    <path {...T} opacity={0.8} d="M63.6 21C65.8 18.8 62.6 16.6 64.6 14.2" />
    <path {...T} d="M49 23H18M71 23H102" />
    <path {...G} d="M12.2 23L14.6 21.1L17 23L14.6 24.9ZM103 23L105.4 21.1L107.8 23L105.4 24.9Z" />
  </>,
  'Spiritualité': <>
    <path {...G} d="M60 4C64.2 8 65.2 13.4 62.2 19.2H57.8C54.8 13.4 55.8 8 60 4Z" />
    <path {...G} d="M62.8 19.2C63.6 14.2 67.8 10.8 71.6 11.8C74.8 12.8 74.8 16.6 72.2 17.4C71.8 15.8 70 15.2 68.6 16.2C67 17.3 66.4 18.4 66.4 19.2Z" />
    <path {...G} d="M57.2 19.2C56.4 14.2 52.2 10.8 48.4 11.8C45.2 12.8 45.2 16.6 47.8 17.4C48.2 15.8 50 15.2 51.4 16.2C53 17.3 53.6 18.4 53.6 19.2Z" />
    <path {...G} d="M52.6 19.9H67.4V22.3H52.6Z" />
    <path {...G} d="M58.4 23C57.8 26 56 28 53 28.6C55.8 30.4 59 28.8 60 26.2C61 28.8 64.2 30.4 67 28.6C64 28 62.2 26 61.6 23Z" />
    <path {...T} d="M44 20H18M76 20H102" />
    <path {...G} d="M12.2 20L14.6 18.1L17 20L14.6 21.9ZM103 20L105.4 18.1L107.8 20L105.4 21.9Z" />
  </>,
  'Théologie': <>
    <path {...T} d="M60 27A12.1 12.1 0 0 0 60 6A12.1 12.1 0 0 0 60 27Z" />
    <path {...T} transform="rotate(120 60 20)" d="M60 27A12.1 12.1 0 0 0 60 6A12.1 12.1 0 0 0 60 27Z" />
    <path {...T} transform="rotate(240 60 20)" d="M60 27A12.1 12.1 0 0 0 60 6A12.1 12.1 0 0 0 60 27Z" />
    <circle {...T} cx={60} cy={20} r={9.4} />
    <path {...T} d="M42 20H18M78 20H102" />
    <path {...G} d="M12.2 20L14.6 18.1L17 20L14.6 21.9ZM103 20L105.4 18.1L107.8 20L105.4 21.9Z" />
  </>,
}

/** Le fleuron rendu quand la catégorie n'en a pas : un losange entre deux filets,
 *  l'ornement du site. Une couverture n'est jamais nue. */
const FLEURON_REPLI: ReactNode = <>
    <path {...G} d="M54.5 20L60 15.6L65.5 20L60 24.4Z" />
    <path {...T} d="M50 20H18M70 20H102" />
    <path {...G} d="M12.2 20L14.6 18.1L17 20L14.6 21.9ZM103 20L105.4 18.1L107.8 20L105.4 21.9Z" />
</>

/** Le fleuron d'un genre, prêt à poser : la viewBox vit ici, avec les dessins. */
export function FleuronGenre({ categorie, ...props }: { categorie: string | null | undefined } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 40" role="presentation" aria-hidden="true" {...props}>
      {FLEURONS[(categorie ?? '').trim()] ?? FLEURON_REPLI}
    </svg>
  )
}

/** La CATÉGORIE PRINCIPALE d'une publication (décision de l'auteur, 2026-09-21).
 *  Une publication peut porter plusieurs catégories ; son auteur en désigne une, qui
 *  est écrite sur la couverture ET qui en donne le fleuron. Elle est stockée dans
 *  `essais.embleme` (la colonne garde son nom : la donnée le porte).
 *
 *  La lecture est TOLÉRANTE, et elle doit le rester : un choix qui ne figure plus
 *  parmi les catégories cochées, ou dont la catégorie a perdu son fleuron, ne doit
 *  pas laisser la couverture nue. On retombe alors sur la première catégorie qui a
 *  un fleuron, puis sur la première tout court, que le fleuron de repli ornera.
 *
 *  ⚠️ La donnée stocke une CATÉGORIE, jamais un nom de dessin : le lien catégorie →
 *  fleuron vit ici et doit pouvoir changer sans migration. */
export function categoriePrincipale(
  categories: readonly string[] | null | undefined,
  choix?: string | null,
): string | null {
  const liste = (categories ?? []).map(c => (c ?? '').trim()).filter(Boolean)
  const voulu = (choix ?? '').trim()
  if (voulu && liste.includes(voulu) && aUnFleuron(voulu)) return voulu
  return liste.find(aUnFleuron) ?? liste[0] ?? null
}

/** Vrai si la catégorie a son propre fleuron. Sert aux tests, et à repérer une
 *  catégorie ajoutée sans dessin. */
export function aUnFleuron(categorie: string | null | undefined): boolean {
  return Object.hasOwn(FLEURONS, (categorie ?? '').trim())
}
