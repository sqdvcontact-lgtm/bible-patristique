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

/** La planche du fleuron, mesurée. ⛔ La LARGEUR s'écrit depuis ces deux nombres,
 *  elle ne se déduit pas d'un rapport CSS : c'est la règle posée pour la marque de la
 *  barre, où un enfant de flex effondré à zéro ne se serait vu sur aucune page. */
const PLANCHE_FLEURON = { largeur: 78, hauteur: 86 }

/**
 * LE FLEURON qui sépare la page de titre du texte.
 *
 * ⛔ Ce fut le glyphe ❧ jusqu'au 9 septembre 2026, et c'était le défaut que la charte
 * relève déjà pour le monogramme de l'accueil : un CARACTÈRE, dont le dessin dépend de
 * la police que le système veut bien donner, et qui ne dit rien du site. Il cède à une
 * planche gravée — une croix fleurdelisée en losange, du répertoire typographique du
 * XVIIe siècle —, détourée par la chaîne commune et posée en MASQUE : une seule planche,
 * deux encres, et rien à rattraper au Cuir.
 *
 * ⚠️ 2,75 rem de HAUTEUR, et cela se mesure : sous 36 px les volutes du centre se
 * referment en une tache et le fleuron n'est plus qu'un losange gris ; au-delà de 48 il
 * pèse plus que le titre qu'il précède. Jugé sur planche, à la taille RÉELLE, agrandi au
 * plus proche voisin — un ornement au trait ne se juge pas dans l'éditeur.
 * ⚠️ Le fichier est servi en 78 × 86 pour 40 × 44 affichés, soit un rapport de 1,95 :
 * une planche se sert au double de sa taille d'affichage, jamais plus.
 */
export function Fleuron({ hauteur = '2.75rem' }: { hauteur?: string }) {
  return (
    <span
      className="cs-fleuron"
      aria-hidden="true"
      style={{
        height: hauteur,
        width: `calc(${hauteur} * ${PLANCHE_FLEURON.largeur} / ${PLANCHE_FLEURON.hauteur})`,
        // ⚠️ L'adresse appartient au composant, la composition à la feuille : c'est le
        // partage que le site fait déjà pour les gravures de l'édition.
        WebkitMaskImage: 'url(/ornements/fleuron-croix.png)',
        maskImage: 'url(/ornements/fleuron-croix.png)',
      }}
    />
  )
}
