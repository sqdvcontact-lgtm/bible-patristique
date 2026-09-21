/**
 * LE CHEMIN DE RETOUR d'un passage des Pères vers le verset d'où on l'a ouvert
 * (audit ergonomique, 2026-09-21).
 *
 * Le volet des Pères ouvre le passage DANS le même onglet : le bouton Précédent ramène
 * au verset, l'adresse de la Bible portant `&verset=N`. La page d'œuvre reçoit en plus
 * `?depuis=` et offre un lien discret « Retour à Jean 3, 16 ».
 *
 * ⛔ `depuis` vient de l'adresse, donc de n'importe qui : on n'y accepte qu'un chemin
 * INTERNE du site (une barre oblique en tête, jamais deux, ni antislash ni protocole),
 * et seulement les deux formes que le volet écrit — la page Bible, une péricope. Tout
 * le reste rend `null`, et la page n'offre alors aucun retour.
 *
 * Module pur, testé par retourLecture.test.ts.
 */

import { nomLivreReference } from './referencesBibliques'

/** Au-delà, ce n'est pas une adresse que le volet a écrite. */
const LONGUEUR_MAX = 400

/** Les paramètres de la page Bible qui décrivent la MANIÈRE de lire : ils voyagent. */
const PARAMETRES_BIBLE_GARDES = ['trad', 'couche', 'bilingue', 'texte', 'mode']

/**
 * L'adresse du chapitre ouvert, verset compris, telle que le retour doit la rendre.
 * `recherche` est la chaîne de requête de la page courante (`window.location.search`) :
 * on n'en garde que la manière de lire.
 */
export function adresseRetourBible(
  { livre, chapitre, verset }: { livre: string; chapitre: number; verset?: number | null },
  recherche = '',
): string {
  const courante = new URLSearchParams(recherche)
  const p = new URLSearchParams()
  p.set('livre', livre)
  p.set('chapitre', String(chapitre))
  if (verset != null) p.set('verset', String(verset))
  for (const cle of PARAMETRES_BIBLE_GARDES) {
    const v = courante.get(cle)
    if (v) p.set(cle, v)
  }
  return `/?${p.toString()}`
}

export type RetourLecture = { href: string; libelle: string }

/** Relit `?depuis=` : l'adresse où revenir et le nom du passage, ou `null`. */
export function lireRetour(depuis: string | null | undefined): RetourLecture | null {
  if (!depuis || depuis.length > LONGUEUR_MAX) return null
  if (!depuis.startsWith('/') || depuis.startsWith('//') || depuis.includes('\\')) return null
  let url: URL
  try {
    url = new URL(depuis, 'https://corpus-scriptura.invalid')
  } catch {
    return null
  }
  if (url.origin !== 'https://corpus-scriptura.invalid') return null
  const href = `${url.pathname}${url.search}`

  if (url.pathname === '/') {
    const livre = url.searchParams.get('livre') ?? ''
    const brutChapitre = url.searchParams.get('chapitre')
    const chapitre = Number(brutChapitre)
    if (!/^[A-Z0-9]{2,4}$/.test(livre) || !brutChapitre || !Number.isInteger(chapitre) || chapitre < 0) return null
    const brut = url.searchParams.get('verset')
    const verset = brut === null ? null : Number(brut)
    const reference = verset !== null && Number.isInteger(verset) && verset > 0
      ? `${nomLivreReference(livre)} ${chapitre}, ${verset}`
      : `${nomLivreReference(livre)} ${chapitre}`
    return { href, libelle: `Retour à ${reference}` }
  }
  if (/^\/pericopes\/[\w-]+$/.test(url.pathname)) {
    return { href: url.pathname, libelle: 'Retour à la péricope' }
  }
  return null
}
