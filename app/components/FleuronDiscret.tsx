// ── Le PETIT FLEURON d'un état vide ────────────────────────────────────────────────
//
// Il suit « Aucune occurrence. » dans le volet des Pères (demande de l'auteur, 14 septembre
// 2026 : « ajoute un petit fleuron parmi la liste des fleurons ; le plus élégant, discret »).
//
// ⛔ CE N'EST PAS UNE ENTRÉE DU REGISTRE (`app/lib/fleurons.ts`). Le registre est la liste des
// fleurons qu'on OFFRE à une œuvre, et y inscrire cette planche la ferait paraître à la
// roulette du volet. C'est le fleuron à volutes, le plus ajouré du jeu, refait à sa taille par
// la chaîne commune : une planche se sert au double de sa taille d'affichage, jamais plus, et
// celle du registre (60 × 103, pour une pose de 3,25 rem) l'aurait été plus de trois fois.
//
// ⚠️ Posé en MASQUE, comme tout fleuron : `.cs-fleuron` porte l'encre du texte second, et une
// seule planche sert les deux thèmes. L'opacité est celle des culs-de-lampe, qui n'ornent
// qu'un vide.

/** La planche, et ses dimensions RÉELLES : la largeur rendue se calcule sur elles. */
export const PLANCHE_FLEURON_DISCRET = { chemin: '/ornements/fleuron-volutes-petit.png', largeur: 38, hauteur: 63 } as const

/** La hauteur de pose. ⚠️ 63 pixels de planche pour 32 affichés à la racine 16 : 1,97. */
export const HAUTEUR_FLEURON_DISCRET = '2rem'

export const OPACITE_FLEURON_DISCRET = 0.5

export default function FleuronDiscret() {
  const adresse = `url(${PLANCHE_FLEURON_DISCRET.chemin})`
  return (
    <span
      className="cs-fleuron"
      aria-hidden="true"
      style={{
        height: HAUTEUR_FLEURON_DISCRET,
        // ⛔ La largeur s'écrit depuis les deux nombres de la planche, comme celle du fleuron
        // d'une œuvre : un enfant de flex dont la largeur se déduirait d'un rapport CSS
        // pourrait s'effondrer à zéro sans que rien ne le dise.
        width: `calc(${HAUTEUR_FLEURON_DISCRET} * ${PLANCHE_FLEURON_DISCRET.largeur} / ${PLANCHE_FLEURON_DISCRET.hauteur})`,
        opacity: OPACITE_FLEURON_DISCRET,
        WebkitMaskImage: adresse,
        maskImage: adresse,
      }}
    />
  )
}
