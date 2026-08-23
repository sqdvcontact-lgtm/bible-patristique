// ── Les langues, telles qu'elles paraissent ───────────────────────────────────
//
// `auteurs.langue_principale` est saisie en bas de casse (« latin », « grec »,
// « grec ; latin ») quand `oeuvres.langue_originale` porte déjà la capitale
// (« Latin », « Grec »). Les deux se retrouvent côte à côte — dans les pastilles
// de filtre de la bibliothèque et dans la ligne de métadonnées de la fiche
// d'auteur —, et l'écart s'y voyait : « latin » en pastille sous une étiquette
// « LANGUE », entre un siècle et une tradition qui, eux, prenaient la capitale.
//
// Une langue nommée DANS UNE PHRASE garde bien sûr son bas de casse (« traduit
// du latin ») ; c'est l'étiquette, posée seule, qui prend la capitale. La base
// n'est pas touchée : c'est l'affichage qui compose.

// L'initiale de chaque langue énumérée : celle de tête, et celle qui suit un
// point-virgule, une virgule, un point médian ou un « et ».
const INITIALE_DE_LANGUE = /(^|[;,·]\s*|\s+et\s+)(\p{Ll})/gu

/** Une langue, ou une énumération de langues, mise en étiquette : « grec ; latin »
 *  → « Grec ; Latin ». La ponctuation d'origine est conservée telle quelle. */
export function libelleLangue(valeur: string | null | undefined): string {
  const texte = (valeur ?? '').trim()
  if (!texte) return ''
  return texte.replace(INITIALE_DE_LANGUE, (_, avant: string, initiale: string) =>
    `${avant}${initiale.toLocaleUpperCase('fr-FR')}`)
}

/** Le nom que porte, dans une liste d'œuvres, le texte en langue d'origine :
 *  « Texte original latin », « Texte original grec ».
 *
 *  UN SEUL libellé pour les deux cas qui mènent à lire l'original : l'œuvre dont
 *  l'édition est elle-même en langue ancienne (aucune traduction à nommer), et le
 *  texte original donné en regard d'une traduction. Ils s'écrivaient l'un
 *  « Texte latin », l'autre « Texte original latin », et se suivaient dans la même
 *  liste. Ici la langue est dans une phrase : elle reste en bas de casse. */
export function libelleTexteOriginal(langue: string | null | undefined): string {
  const nom = (langue ?? '').trim().toLocaleLowerCase('fr-FR')
  return nom ? `Texte original ${nom}` : 'Texte original'
}
