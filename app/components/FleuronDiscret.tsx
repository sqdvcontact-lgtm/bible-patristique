// ── Le FLEURON d'un état vide ──────────────────────────────────────────────────────────
//
// Il suit la mention qui dit une absence : « Aucune occurrence. » dans le volet des Pères
// (demande de l'auteur, 14 septembre 2026), puis, depuis le 21 septembre 2026, tous les
// états vides du volet de droite et des pages blanches, où il remplace les gravures (la
// carapace, l'arbre au corbeau, le désert, l'ordinateur). Demande de l'auteur : « supprime
// la tortue, l'arbre, etc. ; et remplace », avec des fleurons de la liste officielle.
//
// ⛔ UNE SEULE TABLE DIT QUEL FLEURON FERME QUEL VIDE : `FLEURONS_DES_VIDES`. Chaque vide
// a le sien, pris au REGISTRE (`app/lib/fleurons.ts`) et posé à la hauteur que le registre
// lui mesure : une planche se sert au double de sa taille d'affichage, jamais plus, et le
// registre la tient déjà. Depuis le soir du 21 septembre 2026, tous prennent la croix à volutes.
//
// ⚠️ Posé en MASQUE, comme tout fleuron : `.cs-fleuron` porte l'encre du texte second, et
// une seule planche sert les deux thèmes. L'opacité est celle des culs-de-lampe, qui
// n'ornent qu'un vide.
//
// ⛔ Il ne suit qu'une ABSENCE, jamais une invite (« Cliquez sur un paragraphe ») ni un
// filtre qui vide la liste : ceux-là appellent un geste, non un repos.

import { FLEURONS } from '../lib/fleurons'

export const OPACITE_FLEURON_DISCRET = 0.5

/** Quel fleuron ferme quel vide. ⚠️ Un seul depuis le 21 septembre 2026, la croix à volutes, « partout » (décision de l’auteur) ; la table reste pour qu’un vide puisse un jour en prendre un autre. */
export const FLEURONS_DES_VIDES = {
  /** « Aucune occurrence. » — volet des Pères, page Bible et péricopes. */
  peres: 'croix-volutes',
  /** « Aucun commentaire » — volets de commentaires de la Bible et d'une œuvre. */
  commentaires: 'croix-volutes',
  /** « Aucun lien biblique pour ce passage. » — volet de droite d'une œuvre. */
  liensBibliques: 'croix-volutes',
  /** « Lancez une recherche » — page des résultats, avant toute requête. */
  recherche: 'croix-volutes',
  /** « Elle demande un écran large » — Polyglotte sur un petit écran. */
  polyglotte: 'croix-volutes',
} as const

export type VideFleuronne = keyof typeof FLEURONS_DES_VIDES

/** La planche et la hauteur d'un vide. ⛔ Une clé absente du registre lève : c'est une
 *  table écrite dans le code, et une faute de frappe doit se voir aux tests. */
export function poseDuVide(vide: VideFleuronne): { chemin: string; largeur: number; hauteur: number; pose: string } {
  const cle = FLEURONS_DES_VIDES[vide]
  const f = FLEURONS.find(x => x.cle === cle)
  if (!f) throw new Error(`Fleuron « ${cle} » absent du registre`)
  return { chemin: `/ornements/${f.fichier}.png`, largeur: f.planche.largeur, hauteur: f.planche.hauteur, pose: f.hauteur }
}

export default function FleuronDiscret({ vide = 'peres' }: { vide?: VideFleuronne }) {
  const p = poseDuVide(vide)
  const adresse = `url(${p.chemin})`
  return (
    <span
      className="cs-fleuron"
      aria-hidden="true"
      data-vide={vide}
      style={{
        height: p.pose,
        // ⛔ La largeur s'écrit depuis les deux nombres de la planche : un enfant de flex
        // dont la largeur se déduirait d'un rapport CSS pourrait s'effondrer à zéro.
        width: `calc(${p.pose} * ${p.largeur} / ${p.hauteur})`,
        flexShrink: 0,
        opacity: OPACITE_FLEURON_DISCRET,
        WebkitMaskImage: adresse,
        maskImage: adresse,
      }}
    />
  )
}
