// Typographie ÉDITORIALE, écrite dans la DONNÉE au moment de l'import (charte § 3.2,
// « Où la règle s'applique : au STOCKAGE, dès l'import et lors des reprises
// éditoriales »). Fonctions PURES, testées dans typographieEdition.test.ts.
//
// Les fonctions de `typographie.ts` composent au RENDU et restent les garde-fous des
// données anciennes ; celle-ci fait entrer un texte nouveau déjà composé. Elle ne
// modernise jamais la langue : `avoit` reste `avoit`.
//
// ⛔ Elle ne s'applique qu'aux éditions NON MÉDIÉVALES et NON DIPLOMATIQUES. Un témoin
// médiéval ou une couche diplomatique garde la typographie de sa transcription. C'est
// pourquoi aucun importeur ne l'appelle directement : il passe par `composerLignesImport`,
// qui exige que le régime de l'édition soit DÉCLARÉ. Un régime deviné (d'après une date,
// une langue, un nom de fichier) ne vaut pas déclaration.
//
// ⚠️ La longueur du texte change (une fine s'ajoute devant un « ; » collé). La passe se
// fait donc AVANT tout calcul d'ancre ou de décalage, jamais sur un texte qui porte déjà
// des ancres positionnelles.
//
// Ce module n'importe rien et n'emploie que de la syntaxe effaçable : un script `.mjs`
// l'importe tel quel par son chemin `.ts` (Node 24 retire les types), comme sous `tsx`.

// Les espaces se construisent par leur point de code : un littéral invisible tapé à la
// main a déjà été remplacé sans bruit par une espace ordinaire (AGENTS.md, « Piège
// d'édition » de la typographie).
const FINE = String.fromCharCode(0x202f)
const INSECABLE = String.fromCharCode(0x00a0)
const FINE_SECABLE = String.fromCharCode(0x2009)
const ESP = `[ \\t${INSECABLE}${FINE}${FINE_SECABLE}]`

export type RegimeTypographique = 'edition' | 'diplomatique'

export const REGIMES_TYPOGRAPHIQUES: readonly RegimeTypographique[] = ['edition', 'diplomatique']

/** Lit un régime déclaré (corps de requête, option de script) ; `null` s'il manque ou ne se reconnaît pas. */
export function lireRegimeTypographique(valeur: unknown): RegimeTypographique | null {
  return REGIMES_TYPOGRAPHIQUES.find(r => r === valeur) ?? null
}

// Variantes purement glyphiques d'une édition imprimée : le mot ne change pas.
const GLYPHES = ([
  [0x017f, 's'], // s long
  [0xfb00, 'ff'],
  [0xfb01, 'fi'],
  [0xfb02, 'fl'],
  [0xfb03, 'ffi'],
  [0xfb04, 'ffl'],
  [0xfb05, 'st'],
  [0xfb06, 'st'],
] as const).map(([code, rendu]) => [String.fromCharCode(code), rendu] as const)

export function normaliserGlyphesEdition(texte: string): string {
  let sortie = texte
  for (const [glyphe, rendu] of GLYPHES) sortie = sortie.split(glyphe).join(rendu)
  return sortie
}

// Ce que la passe ne doit jamais toucher : une adresse (son « ? » et son « : »), une
// entité HTML (son « ; »), une balise et ses attributs.
const PROTEGES = /(https?:\/\/[^\s<>"'\])]+|mailto:[^\s<>"'\])]+|&#?[A-Za-z0-9]+;|<[^<>\n]*>)/g

function horsProteges(texte: string, transformer: (fragment: string) => string): string {
  return texte
    .split(PROTEGES)
    .map((fragment, i) => (i % 2 === 1 ? fragment : transformer(fragment)))
    .join('')
}

// Un signe de ponctuation haute ne se compose qu'après un mot : ni en tête de ligne,
// ni juste après une parenthèse ou un crochet ouvrants, où « (?) » et « [!] » sont
// des marques d'éditeur.
const APRES_MOT = '(?<![\\s(\\[])'
const HAUTES = new RegExp(`${APRES_MOT}${ESP}*([;!?]+)`, 'g')
// Le deux-points n'est composé que lorsqu'il joue son rôle de ponctuation : suivi d'une
// espace, d'un guillemet, d'une parenthèse ou de la fin. « 10:30 » et « Jn 3:16 »
// restent intacts.
const DEUX_POINTS = new RegExp(`${APRES_MOT}${ESP}*:(?=[\\s«“"(]|$)`, 'g')
const OUVRANT = new RegExp(`«${ESP}*`, 'g')
const FERMANT = new RegExp(`${ESP}*»`, 'g')

/**
 * Compose un texte d'édition non médiévale selon la charte § 3.2 : insécable U+00A0
 * avant le deux-points, fine U+202F avant ; ! ? et à l'intérieur des guillemets
 * français, apostrophe typographique, s long et ligatures développés, espaces doubles
 * réduites, bords nettoyés. Idempotente. Les guillemets droits et les « ... » ne sont
 * PAS convertis : la charte n'y touche que lorsque la fonction est certaine, ce qu'un
 * automate ne sait pas établir seul.
 */
export function normaliserTypographieEdition(texte: string): string {
  const compose = horsProteges(normaliserGlyphesEdition(texte), fragment => fragment
    .replace(/ {2,}(?![ \n])/g, ' ')
    .replace(HAUTES, `${FINE}$1`)
    .replace(DEUX_POINTS, `${INSECABLE}:`)
    .replace(OUVRANT, `«${FINE}`)
    .replace(FERMANT, `${FINE}»`)
    .replace(/(\p{L})'(\p{L})/gu, '$1’$2'))
  return compose.replace(new RegExp(`^${ESP}+|${ESP}+$`, 'g'), '')
}

/**
 * L'UTILITAIRE D'ÉCRITURE COMMUN des importeurs : compose les champs textuels des lignes
 * juste avant leur écriture en base, selon le régime DÉCLARÉ de l'édition. Une édition
 * `diplomatique` (témoin médiéval, transcription diplomatique) entre telle quelle. Un
 * régime absent ou inconnu est une erreur : on ne compose jamais par défaut.
 */
export function composerLignesImport<T extends Record<string, unknown>>(
  lignes: readonly T[],
  champs: readonly (keyof T & string)[],
  regime: RegimeTypographique,
): T[] {
  if (!lireRegimeTypographique(regime)) {
    throw new Error(`Régime typographique non déclaré ou inconnu : ${String(regime)}.`)
  }
  if (regime === 'diplomatique') return lignes.map(l => ({ ...l }))
  return lignes.map(ligne => {
    const sortie: Record<string, unknown> = { ...ligne }
    for (const champ of champs) {
      const valeur = sortie[champ]
      if (typeof valeur === 'string') sortie[champ] = normaliserTypographieEdition(valeur)
    }
    return sortie as T
  })
}
