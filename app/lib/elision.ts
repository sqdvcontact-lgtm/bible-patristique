// L'élision de « de » devant un nom. La règle est ISOLÉE ici parce que deux modules
// en répondent — les métadonnées (`metadonneesSeo.ts` : « la Consolation de Boèce »)
// et les mentions de traducteur (`traducteurs.ts` : « sous la direction de Corpus
// Scriptura ») — et qu'une règle d'orthographe écrite à deux endroits finit par
// diverger. `metadonneesSeo` la ré-exporte pour ses appelants historiques.

// « de Augustin » ne s'écrit pas. La règle vaut devant une voyelle et devant un
// h muet, qui est le cas de tous les noms du corpus (Hilaire, Hippolyte,
// Hermas). Un h aspiré s'éliderait à tort : c'est le seul défaut connu, et il
// ne se rencontre pas ici.
const INITIALE_ELIDABLE = /^[aàâäeéèêëiîïoôöuùûüyh]/i

export function deNom(nom: string): string {
  return INITIALE_ELIDABLE.test(nom.trim()) ? `d’${nom.trim()}` : `de ${nom.trim()}`
}
