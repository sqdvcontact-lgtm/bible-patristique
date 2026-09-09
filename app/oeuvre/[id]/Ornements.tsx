// ── Ornements de la page Œuvre ──────────────────────────────────────────────────
// Deux ornements dans la palette du site :
//   · MarqueImprimeur — la marque d'imprimeur de Corpus Scriptura (deux figures
//     drapées adossées, épée en main, devant une cité et des flots), dessin au trait
//     posé sur la page de titre entre le titre et les mentions d'édition.
//     `size` en gouverne la HAUTEUR, la largeur suit le rapport d'origine. Le PNG est
//     détouré (fond transparent) et ses traits sont teintés dans le brun-gris de
//     « Traduction par » (var(--cs-texte-second)), légèrement grisés (opacity 0.82) ; il se pose donc
//     directement sur le papier, sans rectangle visible ;
//   · Fleuron — l'ornement de séparation entre la page de titre et le niveau 1.
//     Une planche gravée détourée, posée en MASQUE : le dessin est dans la couche
//     alpha, l'encre se repose en CSS, et une seule planche sert les deux thèmes.
// Purement décoratifs : aria-hidden, aucune sémantique.

export function MarqueImprimeur({ size = 150 }: { size?: number }) {
  return (
    <img
      className="cs-ornement" src="/ornements/marque-imprimeur.png"
      alt=""
      aria-hidden="true"
      style={{
        height: `${size}px`,
        width: 'auto',
        opacity: 0.82,
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    />
  )
}

import { adresseFleuron, fleuronDe } from '@/app/lib/fleurons'

/**
 * LE FLEURON qui sépare la page de titre du texte.
 *
 * ⛔ Ce fut le glyphe ❧ jusqu'au 9 septembre 2026, et c'était le défaut que la charte
 * relève déjà pour le monogramme de l'accueil : un CARACTÈRE, dont le dessin dépend de
 * la police que le système veut bien donner, et qui ne dit rien du site. Il cède à une
 * planche gravée, détourée par la chaîne commune et posée en MASQUE : une seule planche,
 * deux encres, et rien à rattraper au Cuir.
 *
 * ⛔ QUELLE planche est un choix de l'auteur, œuvre par œuvre : la clé vient de
 * `oeuvres.fleuron`, et `null` — le cas ordinaire — veut dire « celui du site ». Tout
 * le registre, ses dimensions et ses hauteurs de pose vivent dans `app/lib/fleurons.ts`,
 * sous garde ; ⛔ ne rien écrire ici qui les redise.
 *
 * ⚠️ La HAUTEUR est propre à chaque ornement, et elle se MESURE : un dessin dense pèse
 * plus qu'un dessin ajouré à taille égale, et un fleuron très allongé disparaît si on lui
 * donne la hauteur d'un fleuron carré. `hauteur` ne se passe que pour un APERÇU, jamais
 * pour la page — sur elle, c'est le registre qui décide.
 */
export function Fleuron({ cle, hauteur }: { cle?: string | null; hauteur?: string }) {
  const f = fleuronDe(cle)
  const h = hauteur ?? f.hauteur
  const adresse = `url(${adresseFleuron(f)})`
  return (
    <span
      className="cs-fleuron"
      aria-hidden="true"
      style={{
        height: h,
        // ⛔ La LARGEUR s'écrit depuis les deux nombres du registre, elle ne se déduit pas
        // d'un rapport CSS : c'est la règle posée pour la marque de la barre, où un enfant
        // de flex effondré à zéro ne se serait vu sur aucune page.
        width: `calc(${h} * ${f.planche.largeur} / ${f.planche.hauteur})`,
        // ⚠️ L'adresse appartient au composant, la composition à la feuille : c'est le
        // partage que le site fait déjà pour les gravures de l'édition.
        WebkitMaskImage: adresse,
        maskImage: adresse,
      }}
    />
  )
}
