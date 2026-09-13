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

// ── Le rôle d'un texte se lit sur ses LANGUES ─────────────────────────────────
//
// ⛔ AUCUNE LANGUE PAR DÉFAUT. Un texte est l'ORIGINAL quand sa langue est celle de
// l'œuvre et qu'il n'a pas de traducteur ; tout autre texte est une TRADUCTION, et sa
// langue la nomme dès qu'elle n'est pas le français : « Traduction latine ». Relevé
// par l'auteur le 13 septembre 2026 : la Doctrina apostolorum, traduction latine d'un
// original grec, se donnait dans la bibliothèque pour le « Texte original latin » des
// Douze Apôtres, et plusieurs libellés du site tenaient le latin pour la langue de tout
// original qu'ils ne savaient pas nommer.

function replierLangue(valeur: string | null | undefined): string {
  return (valeur ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/** Deux langues sont la même, accents et casse ignorés : les fiches écrivent « Grec »
 *  ici et « grec » là. Une langue absente ne s'accorde avec rien. */
export function memeLangue(a: string | null | undefined, b: string | null | undefined): boolean {
  const gauche = replierLangue(a)
  return gauche.length > 0 && gauche === replierLangue(b)
}

/** Le français est la langue du site : une traduction française ne se désigne pas par
 *  sa langue, que presque toutes les lignes porteraient. */
export function estFrancais(langue: string | null | undefined): boolean {
  return replierLangue(langue) === 'francais'
}

/** L'adjectif qui qualifie une TRADUCTION, au féminin. La table tient les langues du
 *  corpus et de ses voisines ; une langue qu'elle ignore se dit par son nom. */
const TRADUCTION_EN: Record<string, string> = {
  latin: 'latine',
  grec: 'grecque',
  francais: 'française',
  syriaque: 'syriaque',
  copte: 'copte',
  armenien: 'arménienne',
  georgien: 'géorgienne',
  ethiopien: 'éthiopienne',
  arabe: 'arabe',
  hebreu: 'hébraïque',
  slavon: 'slavonne',
  allemand: 'allemande',
  anglais: 'anglaise',
  italien: 'italienne',
  espagnol: 'espagnole',
}

/** « Traduction latine », « Traduction grecque » ; « Traduction en tokharien » pour une
 *  langue que la table ne connaît pas ; rien sans langue. Seul le premier mot décide de
 *  l'adjectif : « grec ancien » fait une traduction grecque. */
export function libelleTraductionEnLangue(langue: string | null | undefined): string {
  const nom = (langue ?? '').trim()
  if (!nom) return ''
  const adjectif = TRADUCTION_EN[replierLangue(nom).split(/[\s(;,]+/u)[0]]
  return adjectif ? `Traduction ${adjectif}` : `Traduction en ${nom.toLocaleLowerCase('fr-FR')}`
}

/** La langue d'une traduction entre dans son libellé quand ce n'est pas le français :
 *  « Traduction par Franz Xaver Funk » devient « Traduction latine par Franz Xaver
 *  Funk ». Un libellé qui ne s'ouvre pas sur « Traduction » reste tel quel. */
export function preciserLangueTraduction(libelle: string, langue: string | null | undefined): string {
  if (!libelle || !(langue ?? '').trim() || estFrancais(langue)) return libelle
  return libelle.replace(/^Traduction(?=[\s:])/u, libelleTraductionEnLangue(langue))
}
