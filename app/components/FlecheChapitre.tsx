import { chapitreSuivantDisponible } from '@/app/lib/bibleNavigation'

/**
 * La flèche de chapitre de la page Bible, en un seul endroit.
 *
 * Trois surfaces la dessinent : l'en-tête de la lecture simple, celui de la
 * lecture en regard, et le bandeau de navigation mobile. Chacune composait la
 * sienne, et la borne terminale (Gn 50) ne se fermait que dans l'une d'elles :
 * ailleurs la flèche fabriquait « Gn 51 », que l'adresse ramenait à Gn 50 après
 * un aller-retour et un temps d'attente pour rien.
 *
 * Règle : à une borne, le chevron RESTE À SA PLACE, grisé et inerte. Il ne
 * disparaît pas (le titre glisserait), il ne navigue pas, il n'allume pas la
 * marque d'attente. C'est un `<button disabled>` : le navigateur lui-même
 * refuse le clic, le survol et le focus, et la boîte est la même qu'à l'état
 * actif, ce qui tient la géométrie identique d'un chapitre à l'autre.
 *
 * Le composant est sans crochet : il se teste en l'appelant comme une fonction.
 */

export type SensFlecheChapitre = 'precedent' | 'suivant'

/**
 * Gabarit de chaque surface. Les valeurs sont celles que chaque surface
 * portait avant la mise en commun : la géométrie ne bouge pas.
 * - `entete` : en-tête « Genèse ❧ Chapitre N », lecture simple et en regard.
 * - `bandeau` : bandeau mobile fixé en bas, aux chevrons plus larges et espacés.
 */
export type VarianteFlecheChapitre = 'entete' | 'bandeau'

const GABARITS: Readonly<Record<VarianteFlecheChapitre, { fontSize: string; padding: string | number; couleur: string }>> = {
  entete: { fontSize: '1.25rem', padding: 0, couleur: 'var(--cs-texte-faible)' },
  bandeau: { fontSize: '1.375rem', padding: '0 8px', couleur: 'var(--cs-texte-gris)' },
}

const GLYPHES: Readonly<Record<SensFlecheChapitre, string>> = { precedent: '‹', suivant: '›' }
const LIBELLES: Readonly<Record<SensFlecheChapitre, string>> = {
  precedent: 'Chapitre précédent',
  suivant: 'Chapitre suivant',
}

/** La flèche mène-t-elle quelque part ? Avant Gn 1 et après Gn 50, non. */
export function flecheChapitreDisponible(livre: string, chapitre: number, sens: SensFlecheChapitre): boolean {
  return sens === 'precedent' ? chapitre > 1 : chapitreSuivantDisponible(livre, chapitre)
}

/** Le chapitre que la flèche vise ; n'a de sens que si elle est disponible. */
export function chapitreVise(chapitre: number, sens: SensFlecheChapitre): number {
  return sens === 'precedent' ? chapitre - 1 : chapitre + 1
}

export type FlecheChapitreProps = {
  livre: string
  chapitre: number
  sens: SensFlecheChapitre
  variante: VarianteFlecheChapitre
  /** Reçoit le chapitre visé ; n'est jamais appelé depuis une flèche inerte. */
  onAller: (chapitre: number) => void
}

export default function FlecheChapitre({ livre, chapitre, sens, variante, onAller }: FlecheChapitreProps) {
  const actif = flecheChapitreDisponible(livre, chapitre, sens)
  const gabarit = GABARITS[variante]
  const libelle = LIBELLES[sens]
  const style = {
    background: 'none',
    border: 'none',
    fontSize: gabarit.fontSize,
    lineHeight: 1,
    padding: gabarit.padding,
    color: actif ? gabarit.couleur : 'var(--cs-bord)',
    cursor: actif ? 'pointer' : 'default',
    transition: 'color 0.15s',
  } as const

  if (!actif) {
    // ⛔ Ni `onClick`, ni `className` de survol, ni `title` : une flèche inerte ne
    // promet rien, et `disabled` fait que le navigateur n'émet aucun clic.
    return (
      <button type="button" disabled aria-disabled="true" aria-label={libelle} style={style}>
        {GLYPHES[sens]}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onAller(chapitreVise(chapitre, sens))}
      className="nav-chap-arrow"
      aria-label={libelle}
      title={variante === 'entete' ? libelle : undefined}
      style={style}
    >
      {GLYPHES[sens]}
    </button>
  )
}
