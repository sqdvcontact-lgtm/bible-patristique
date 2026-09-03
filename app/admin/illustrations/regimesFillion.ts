// ── Les trois régimes de composition des gravures Fillion ────────────────────
//
// Ce fichier ne porte que la DOCTRINE : ce que chaque régime est, à quoi il sert,
// et ce qu'on ne doit pas lui faire. ⛔ Il ne porte AUCUN classement : le régime
// et la part de colonne sont ÉCRITS dans la base par la chaîne d'image (règle
// dans `scripts/fillion/regime-gravure.mjs`), et la page de lecture comme la
// planche les LISENT, par `regimeEtPartDeLActif` (`app/lib/bibleEdition.ts`).
//
// ⚠️ Une première version nommait les régimes A, B et C et recopiait un classement
// mesuré à la main ; une deuxième les dérivait au rendu. Les deux sont tombés :
// le nom parce que la page de lecture en employait un autre, et deux vocabulaires
// pour une seule chose sont la dérive que ce dépôt paie le plus cher ; la
// dérivation parce qu'un lot rempli par une autre chaîne (1 Samuel, 31 août 2026)
// l'a mise en défaut sans qu'aucun test le voie.

import type { RegimeIllustration } from '@/app/lib/bibleEdition'

export type Regime = {
  titre: string
  pour: string
  propos: string
  detourage: boolean
  cadre: boolean
  habillage: boolean
}

export const REGIMES: Record<RegimeIllustration, Regime> = {
  'vignette': {
    titre: 'Vignette',
    pour: 'tient dans une colonne de la page imprimée',
    propos:
      'Un boisseau, un charpentier, un outil, une scène brève. Détourée, l’encre reposée au rendu, à trente pour cent de la colonne de lecture. Le commentaire qui COUVRE son verset l’habille, et les vignettes alternent d’un bord à l’autre le long du chapitre. ⚠️ L’ancre ne bouge pas pour autant : elle dit où la gravure est imprimée dans le volume, et c’est la composition qui la fond dans la prose.',
    detourage: true,
    cadre: false,
    habillage: true,
  },
  'au-fil': {
    titre: 'Scène cadrée',
    pour: 'enjambe les deux colonnes de la page imprimée',
    propos:
      'Une vue, une photogravure en ton continu. ⛔ Elle ne se détoure PAS : son encre couvre tout le champ, et mesurée, sa surface transparente valait 3 % quand une gravure au trait en rend 85 à 94. Elle garde son papier, rognée EN DEDANS du filet gravé — irrégulier, écaillé aux angles — et prend le filet du site, droit. Le texte ne l’habille pas : une scène large coupée par de la prose ne se lit plus.',
    detourage: false,
    cadre: true,
    habillage: false,
  },
  'hors-texte': {
    titre: 'Planche hors-texte',
    pour: 'page entière du volume',
    propos:
      'Ce ne sont pas des illustrations mais des reproductions de page, avec le papier de 1923 et la légende gravée DANS l’image. Elles se posent dans un passe-partout qui assume ce papier au lieu de le subir. ⛔ Ne jamais les détourer, ni répéter sous elles la légende qu’elles portent déjà.',
    detourage: false,
    cadre: false,
    habillage: false,
  },
}

/** L'ordre d'exposition : du plus intégré au texte au plus détaché. */
export const ORDRE_REGIMES: RegimeIllustration[] = ['vignette', 'au-fil', 'hors-texte']

/** La colonne de lecture d'un chapitre. ⛔ Elle vit dans `bibleEdition`, où la
 *  règle d'habillage la lit pour calculer la hauteur d'un flottant : deux
 *  déclarations d'une même mesure ne restent égales que par accident. */
export { MESURE_COLONNE } from '@/app/lib/bibleEdition'

/** Une gravure telle que la planche la montre : ce que la base sait en dire, plus
 *  le régime DÉRIVÉ et la largeur imprimée qui l'a décidé.
 *
 *  ⛔ Le type vit ICI, dans le module pur, et non dans `mesures.ts` : ce dernier
 *  ouvre un client Supabase à clé de service au chargement, et la planche est un
 *  composant client. Un `import type` est bien effacé à la compilation, mais on
 *  ne fait pas dépendre un module client d'un module qui porte un secret. */
export type GravureFillion = {
  cle: string
  legende: string
  verset: string
  url: string
  largeur: number
  hauteur: number
  /** Part du bloc de lecture que la gravure occupe, telle que la chaîne d'image
   *  l'a écrite dans la base ; la planche la montre pour qu'on puisse en juger. */
  part: number
  regime: RegimeIllustration
}

/** Le texte réel de Fillion sur Marc 4, 21-25. ⚠️ Recopié pour la planche seule :
 *  un spécimen d'habillage ne se juge pas sur du texte inventé, et le charger
 *  depuis la base pour une démonstration coûterait une requête à chaque visite. */
export const SPECIMEN_HABILLAGE = {
  manchette: '21-25. Nécessité d’écouter attentivement la parole divine.',
  avant:
    'Comparer Luc 8, 16-18. Saint Matthieu ne cite point ici ces paroles, mais il en donne la substance en plusieurs autres endroits (comparer Matthieu 5, 15 ; Matthieu 7, 2 ; Matthieu 10, 26). Jésus a pu les répéter plusieurs fois. Et dicebat… Formule d’introduction propre à notre auteur dans ce passage. De même au verset 24.',
  apres:
    'Numquid… lucerna… ? Voyez les notes de Matthieu 5, 15. Les disciples, qui recevaient de Jésus la lumière spirituelle, devaient à leur tour la communiquer aux autres hommes. Non est enim… (verset 22). Explication et développement de la pensée. Rien n’est caché d’une manière absolue ; c’est pourquoi Notre-Seigneur recommande à ses apôtres de manifester leur lumière en temps opportun, lorsqu’elle pourra procurer la gloire de Dieu et le bien du prochain.',
}
