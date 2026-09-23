// Fleurons des couvertures de publication : un fleuron du registre du site par genre,
// posé entre le sous-titre et la date, comme la vignette d'une page de titre ancienne.
//
// Ils remplacent les gravures (2026-09-23, décision de l'auteur), et ce sont LES
// FLEURONS DE L'AUTEUR, ceux du registre (`app/lib/fleurons.ts`) : aucune planche
// n'est dessinée ici. Chacune est posée en MASQUE sur l'encre de la couverture,
// comme au frontispice des œuvres, si bien qu'un seul fichier sert les fonds clairs
// et les fonds sombres.
//
// ⛔ LA POLARITÉ. Une couverture sur deux porte une encre claire sur un fond sombre :
// le fleuron s'y lit en NÉGATIF. Une silhouette le supporte ; une gravure à hachures
// ou à reflets, non, ses ombres devenant des lumières. Le registre a été jugé planche
// par planche dans les deux encres, et seules les SILHOUETTES PLEINES y ont droit :
// ni hachures, ni ombres, ni yeux ou orbites qui s'inversent. Sont exclus Œil
// fleurdelisé, Poisson, Grappe de raisin, Rayon de miel, Encensoir, Épée feuillagée,
// Cognée, Ailes déployées, Soleil, Corbeau, Aigle, Pélican, Fournaise, Ange déchu,
// Main feuillagée, Cerf, Taureau, Memento mori et Trompette (décision de l'auteur,
// 2026-09-23). Avant d'en attribuer un nouveau à un genre, le poser sur les deux sols.

import type { CSSProperties } from 'react'
import { adresseFleuron, fleuronDe } from './fleurons'

/** Le fleuron de chaque catégorie de publication (`CATEGORIES_ESSAIS`), par CLÉ du
 *  registre. Une clé inconnue retombe sur le fleuron du site : jamais de couverture nue. */
const FLEURON_PAR_GENRE: Record<string, string> = {
  // L'entrelacs : le texte et son commentaire noués l'un à l'autre.
  'Exégèse': 'entrelacs',
  // Les volutes : l'arabesque du récit.
  'Fiction': 'volutes',
  // La roue : les temps qui tournent, et la fortune des empires.
  'Histoire': 'roue',
  // Le brin de lavande : ce qu'on laisse infuser.
  'Méditation': 'lavande',
  // « Je suis le froment de Dieu » (Ignace d'Antioche).
  'Patristique': 'epis-croises',
  // « Prudents comme les serpents » (Mt 10, 16).
  'Philosophie': 'serpent',
  'Poésie': 'lyre',
  'Prière': 'calice',
  'Spiritualité': 'lys-flamboyant',
  'Théologie': 'croix-volutes',
}

/** Le fleuron d'un genre, posé en masque sur l'encre courante (`currentColor`).
 *  `echelle` est la longueur d'un rem de pose : la hauteur rendue vaut la hauteur que
 *  le registre a mesurée pour la planche, multipliée par elle. Un fleuron dense garde
 *  ainsi, sur la couverture, le poids qu'il a au frontispice. */
export function FleuronGenre({ categorie, echelle, className, style }: {
  categorie: string | null | undefined; echelle: string; className?: string; style?: CSSProperties
}) {
  const f = fleuronDe(FLEURON_PAR_GENRE[(categorie ?? '').trim()])
  const h = `calc(${parseFloat(f.hauteur)} * ${echelle})`
  const adresse = `url(${adresseFleuron(f)})`
  return (
    <span className={className} aria-hidden="true" style={{
      display: 'block', backgroundColor: 'currentColor',
      height: h,
      // La largeur s'écrit depuis les deux nombres du registre, comme au frontispice.
      width: `calc(${h} * ${f.planche.largeur} / ${f.planche.hauteur})`,
      WebkitMaskImage: adresse, maskImage: adresse,
      WebkitMaskSize: 'contain', maskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center', maskPosition: 'center',
      ...style,
    }} />
  )
}

/** La clé du registre que porte une catégorie, ou `null` si elle n'en a pas. */
export function cleFleuronDe(categorie: string | null | undefined): string | null {
  return FLEURON_PAR_GENRE[(categorie ?? '').trim()] ?? null
}

/** La CATÉGORIE PRINCIPALE d'une publication (décision de l'auteur, 2026-09-21).
 *  Une publication peut porter plusieurs catégories ; son auteur en désigne une, qui
 *  est écrite sur la couverture ET qui en donne le fleuron. Elle est stockée dans
 *  `essais.embleme` (la colonne garde son nom : la donnée le porte).
 *
 *  La lecture est TOLÉRANTE, et elle doit le rester : un choix qui ne figure plus
 *  parmi les catégories cochées, ou dont la catégorie a perdu son fleuron, ne doit
 *  pas laisser la couverture nue. On retombe alors sur la première catégorie qui a
 *  un fleuron, puis sur la première tout court, que le fleuron du site ornera.
 *
 *  ⚠️ La donnée stocke une CATÉGORIE, jamais un fleuron : le lien catégorie →
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
 *  catégorie ajoutée sans fleuron. */
export function aUnFleuron(categorie: string | null | undefined): boolean {
  return Object.hasOwn(FLEURON_PAR_GENRE, (categorie ?? '').trim())
}
