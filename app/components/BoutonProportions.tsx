'use client'

import { Z_FLOTTANT } from '@/app/lib/empilement'

/**
 * RÉTABLIR LES PROPORTIONS — la pastille qui rend au lecteur la largeur de ses volets.
 *
 * Elle ne paraît QUE si l'on a traîné une poignée : c'est le seul chemin de retour, la
 * largeur choisie étant retenue dans le stockage local d'une séance à l'autre.
 *
 * ⛔ UNE SEULE ÉCRITURE POUR LES DEUX PAGES. Elle vivait en DEUX exemplaires, à l'octet
 * près, dans `BibleLayout` et dans `OeuvreClient` — quatorze déclarations recopiées de
 * part et d'autre. Une forme recopiée à deux endroits ne reste identique que par
 * accident, et celle-ci l'était encore : on la réunit avant qu'elle ne dérive.
 *
 * ⛔ ELLE PREND LA RECETTE DE LA CELLULE D'ACTIONS (`STYLE_CELLULE`, celluleActions.ts),
 * et ce n'est pas un rapprochement de commodité : c'est le MÊME objet — un petit
 * contrôle qui flotte au-dessus de la colonne de lecture. Même sol (`--cs-surface`),
 * même filet (`--cs-bord-clair`), même ombre (`--cs-ombre-nette`, celle que la charte
 * réserve au « petit objet qui flotte »), même rang (`Z_FLOTTANT`). Elle portait
 * jusqu'ici un sol et un filet ÉCRITS EN DUR — un crème à 0,86 et un tan à 0,62 —,
 * c'est-à-dire quatre teintes au registre des couleurs en dur et un galet de papier
 * posé sur le maroquin du Cuir, où le site n'a plus de papier.
 *
 * ⚠️ Le VOILE tombe avec elles, et le flou d'arrière-plan avec lui. La charte fixe la
 * borne à 0,5 : au-dessus, un voile ne dit plus « translucide », il dit PAPIER, et il
 * prend `--cs-surface`. Un `backdrop-filter` derrière un fond opaque ne fait rien.
 *
 * ⚠️ La VOIX est celle des actions secondaires du site (`.cs-bouton-lien`) : le sans,
 * en ROMAIN. L'italique sérif est la voix de l'ÉDITEUR — une mention, une glose — et
 * elle faisait lire ce bouton comme une note plutôt que comme un contrôle.
 *
 * ⚠️ L'ÉTAT DE SURVOL vit dans la feuille, jamais ici : un style en ligne bat toute
 * règle de feuille sans `!important`, et le survol serait mort sans que rien ne le
 * dise — le titre de colonne de la Polyglotte l'a été des semaines pour cette raison.
 * Seul le RANG reste en ligne, pour qu'il n'y ait qu'une écriture de `Z_FLOTTANT`.
 */
export default function BoutonProportions({ onRetablir }: { onRetablir: () => void }) {
  return (
    <button type="button" className="cs-bouton-proportions" style={{ zIndex: Z_FLOTTANT }}
      onClick={onRetablir}>
      Rétablir les proportions
    </button>
  )
}
