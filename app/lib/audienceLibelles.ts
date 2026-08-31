// Ce qui se décide à la LECTURE des chiffres d'audience : nommer un chemin.
//
// ⛔ Séparé de `app/lib/audience.ts`, qui porte ce qui se décide à la COLLECTE.
// La balise n'a que faire des noms de livres bibliques, et ce module tire `LIVRES`
// derrière lui : les réunir emporterait le canon entier dans le paquet que reçoit
// chaque visiteur, pour une fonction que seule l'administration appelle.

import { cheminSansCoordonnees } from './audience'
import { nomLivreReference } from './referencesBibliques'

/**
 * Les pages qui n'ont pas d'entité derrière elles, et que la base ne peut donc pas
 * nommer. ⚠️ Elles se nomment ici parce que ce sont des ROUTES, chose que le code
 * connaît et que la donnée ignore.
 */
const PAGES_NOMMEES: Record<string, string> = {
  '/accueil': 'Accueil',
  '/bibliotheque': 'Bibliothèque',
  '/pericopes': 'Catalogue des péricopes',
  '/essais': 'Communauté',
  '/essais/nouveau': 'Écrire une publication',
  '/recherche': 'Recherche',
  '/concordance': 'Concordance',
  '/polyglotte': 'Bible polyglotte',
  '/histoire': 'Histoire de l’Église',
  '/traductions': 'Les traductions',
  '/librairies': 'Acheter des livres',
  '/statistiques': 'Statistiques',
  '/soutenir': 'Soutenir le projet',
  '/contact': 'Contact',
  '/confidentialite': 'Confidentialité',
  '/conditions-utilisation': 'Conditions d’utilisation',
  '/compte': 'Mon compte',
  '/prelevements': 'Mes prélèvements',
  '/notifications': 'Notifications',
  '/messagerie': 'Messagerie',
  '/bienvenue': 'Bienvenue',
  '/quiz': 'Quiz',
  '/manuscrits': 'Manuscrits',
  '/manuscrits/bible-899': 'Bible 899',
}

/**
 * « /?livre=GEN&chapitre=1 » → « Genèse 1 ».
 *
 * ⚠️ Le nom du livre se tire de `LIVRES` par `nomLivreReference`, jamais d'une
 * table écrite ici : un livre ajouté là doit se nommer partout de la même façon.
 * Un chapitre absent rend le seul nom du livre, ce qui reste juste.
 */
export function libelleLectureBiblique(chemin: string): string | null {
  const [nu, requete = ''] = chemin.split('?')
  if (nu !== '/' || !requete) return null
  const params = new URLSearchParams(requete)
  const livre = params.get('livre')
  if (!livre) return null
  const chapitre = params.get('chapitre')
  const nom = nomLivreReference(livre)
  return chapitre ? `${nom} ${chapitre}` : nom
}

/**
 * Le nom d'une page, du plus précis au plus pauvre : ce que la base a su résoudre
 * (une œuvre, un auteur, une péricope, une publication), puis la lecture biblique,
 * puis la table des routes, puis le chemin lui-même.
 *
 * ⛔ Le chemin reste le repli, jamais un blanc : une ligne sans nom serait pire
 * qu'une ligne technique, on ne saurait même plus de quoi elle parle.
 */
export function libellePage(chemin: string, libelleResolu?: string | null): string {
  const resolu = (libelleResolu ?? '').trim()
  if (resolu) return resolu
  const biblique = libelleLectureBiblique(chemin)
  if (biblique) return biblique
  return PAGES_NOMMEES[cheminSansCoordonnees(chemin)] ?? chemin
}
