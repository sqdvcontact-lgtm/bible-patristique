/**
 * Le NOM DU SITE d'où vient un texte numérisé.
 *
 * `editions_sources.source_nom` n'est pas un nom, c'est une PHRASE : le site, puis ce
 * qu'on y a pris — « eBible.org — corpus BibleNLP, édition fra-fraLSG », « Gallica,
 * Bibliothèque nationale de France — manuscrit Français 899 ». Rendue telle quelle dans
 * la colonne étroite d'une fiche, elle ne se lit pas (relevé de l'auteur, 2026-09-05 :
 * « toujours illisible ; se contenter de donner le nom du site »).
 *
 * ⛔ Le nom du site n'est PAS l'hôte de l'adresse. Trois des sept sources du corpus sont
 * hébergées sur `github.com`, et le lecteur n'y reconnaîtrait ni eBible.org, ni le dépôt
 * scrollmapper, ni lxx-swete. C'est le début de `source_nom` qui nomme, et la suite qui
 * précise. L'hôte ne sert que de dernier repli, quand aucun nom n'est écrit.
 *
 * ⚠️ La coupe se fait sur un SÉPARATEUR EXPLICITE, jamais sur une position ni sur la
 * première virgule : « Gallica, Bibliothèque nationale de France » porte la sienne dans
 * son nom même. Deux séparateurs, tous deux attestés dans les sept sources — le tiret
 * (cadratin ou demi-cadratin), et l'incise « , d'après … » qui introduit la provenance.
 *
 * Module pur, testé dans `sourceNumerique.test.ts`.
 */

/** Ce qui, dans `source_nom`, sépare le NOM du site de ce qu'on y a pris. */
const SEPARATEURS = /\s[—–]\s|,\s*d[’']après\s/u

export function nomDuSite(nom: string | null | undefined): string {
  const entier = (nom ?? '').trim()
  if (!entier) return ''
  const coupe = entier.split(SEPARATEURS)[0].trim()
  // Une coupe qui ne laisserait rien n'est pas une coupe : mieux vaut la phrase entière
  // qu'une valeur vide, et le nom d'un site ne commence pas par son séparateur.
  return coupe || entier
}

/** L'hôte d'une adresse, sans son « www. ». Dernier repli quand aucun nom n'est écrit. */
export function hoteDeLAdresse(url: string | null | undefined): string {
  const adresse = (url ?? '').trim()
  if (!adresse) return ''
  try {
    const hote = new URL(adresse).host
    return hote.startsWith('www.') ? hote.slice(4) : hote
  } catch {
    return ''
  }
}

/** Ce qu'une fiche écrit dans sa rangée « Source numérique » : le nom du site, sinon l'hôte. */
export function libelleSourceNumerique(nom: string | null | undefined, url: string | null | undefined): string {
  return nomDuSite(nom) || hoteDeLAdresse(url)
}
