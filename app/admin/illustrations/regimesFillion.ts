// ── Les trois régimes de composition des gravures Fillion ────────────────────
//
// Ce fichier ne porte que la DOCTRINE : ce que chaque régime est, à quoi il sert,
// et ce qu'on ne doit pas lui faire. ⛔ Il ne porte AUCUN classement : le régime
// se DÉRIVE de la largeur imprimée, par `regimeIllustration` (`app/lib/bibleEdition.ts`),
// et c'est la même fonction qui sert la page de lecture.
//
// ⚠️ Une première version nommait les régimes A, B et C et recopiait un classement
// mesuré à la main. Les deux sont tombés le 30 août 2026 : le nom parce que la
// page de lecture en employait un autre, et deux vocabulaires pour une seule
// chose sont la dérive que ce dépôt paie le plus cher ; le classement parce
// qu'une valeur recopiée ne peut que s'écarter de ce qu'elle décrit.

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
      'Un boisseau, un charpentier, un outil, une scène brève. Détourée, l’encre reposée au rendu, à trente pour cent de la colonne de lecture. ⚠️ Elle n’est habillée que si son ancre la pose DANS un bloc de commentaire : ancrée sur un verset, elle a son propre axe et n’a rien à contourner. C’est la structure qui le dit, et la page ne le force pas.',
    detourage: true,
    cadre: false,
    habillage: true,
  },
  'au-fil': {
    titre: 'Gravure au fil du texte',
    pour: 'enjambe les deux colonnes de la page imprimée',
    propos:
      'Une vue, un bas-relief, une photogravure. Elle porte son cadre gravé : on rogne AU filet, on pose autour un filet à l’encre du site, et le texte ne l’habille pas. Une scène large coupée par de la prose ne se lit plus.',
    detourage: true,
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

/** La colonne de lecture d'un chapitre, en pixels, à la racine 16. C'est sur elle
 *  que se comptent les largeurs, non sur la fenêtre. */
export const MESURE_COLONNE = 502

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
  /** Part de la page imprimée qu'occupait la gravure, en largeur. C'est elle qui
   *  décide du régime, et la planche la montre pour qu'on puisse en juger. */
  largeurImprimee: number | null
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
