// Césures du texte latin. Fonctions PURES, testées dans cesuresLatines.test.ts.
//
// ⚠️ Aucun navigateur ne livre de dictionnaire de coupure pour le latin : sur un
// `lang="la"`, `hyphens: auto` ne fait RIEN. Mesuré dans le navigateur intégré, sur
// une colonne de 170 px : 23 lignes avec `hyphens: auto`, 23 sans césure du tout,
// et 23 encore en déclarant `lang="it"` pour emprunter le dictionnaire italien.
// Les mêmes 170 px descendent à 21 lignes dès que les points de coupure sont posés
// dans le texte. C'est donc à nous de syllaber.
//
// On pose des césures CONDITIONNELLES (U+00AD, « soft hyphen ») : invisibles tant
// que la ligne n'a pas besoin d'être coupée, elles n'apparaissent qu'au point de
// coupe et ne changent pas le texte. La donnée n'est pas touchée : la syllabation
// se fait au rendu, comme l'espacement (charte §3.2).

// Voyelles, y compris les formes accentuées et les ligatures que portent les
// éditions du corpus.
const VOYELLES = 'aeiouyāēīōūăĕĭŏŭäëïöüáéíóúàèìòùâêîôûæœ'

// Groupes qui ne se coupent JAMAIS et passent entiers à la syllabe suivante :
// muette + liquide (« pa-tris », « du-plex »), digrammes grecs, s + occlusive
// (« ca-stra », « no-ster ») et le groupe `gn` (« ma-gnus »).
const GROUPES_INSECABLES = new Set([
  'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr',
  'ch', 'ph', 'th', 'rh',
  'gn', 'sc', 'sp', 'st',
  // `qu` et `gu` ne sont qu'une consonne : « lo-qui-tur », jamais « loq-ui-tur ».
  'qu', 'gu',
])

// Diphtongues : un seul noyau vocalique, jamais coupées.
const DIPHTONGUES = new Set(['ae', 'au', 'ei', 'eu', 'oe', 'ui'])

// Syllaber et couper sont deux choses distinctes. La syllabation est affaire de
// langue : « do-mi-ne » a trois syllabes, un point. Le choix des points de coupe
// est affaire de composition : on ne renvoie jamais moins de trois lettres à la
// ligne suivante, et l'on n'en laisse pas moins de deux en fin de ligne. Deux
// devant plutôt que trois : c'est ce qui rend au latin la densité voulue, sur des
// mots courts et nombreux.
const MIN_AVANT = 2
const MIN_APRES = 3
const LONGUEUR_MINIMALE = MIN_AVANT + MIN_APRES

export const CESURE = '­'

function estVoyelle(c: string): boolean {
  return VOYELLES.includes(c)
}

/** Noyaux vocaliques d'un mot, en indices [début, fin] sur la forme minuscule.
 *  Le `u` de `qu`/`gu` devant voyelle est consonantique : il ne compte pas comme
 *  noyau, sans quoi « quomodo » se couperait en « qu-omo-do ». */
function noyaux(bas: string): [number, number][] {
  const trouves: [number, number][] = []
  for (let i = 0; i < bas.length; i++) {
    if (!estVoyelle(bas[i])) continue
    if (bas[i] === 'u' && i > 0 && (bas[i - 1] === 'q' || bas[i - 1] === 'g') && estVoyelle(bas[i + 1] ?? '')) continue
    const paire = bas.slice(i, i + 2)
    if (DIPHTONGUES.has(paire)) { trouves.push([i, i + 1]); i++ }
    else trouves.push([i, i])
  }
  return trouves
}

/** Frontières de syllabes d'un mot latin, en indices. Purement linguistique :
 *  aucune considération de longueur n'y entre. */
export function frontieresSyllabiques(mot: string): number[] {
  const bas = mot.toLowerCase()
  const n = noyaux(bas)
  if (n.length < 2) return []

  const coupes: number[] = []
  for (let k = 0; k < n.length - 1; k++) {
    const finVoyelle = n[k][1]
    const debutSuivante = n[k + 1][0]
    const consonnes = bas.slice(finVoyelle + 1, debutSuivante)

    let coupe: number
    if (consonnes.length === 0) {
      // Deux voyelles en hiatus : « de-us », « fi-li-i ».
      coupe = debutSuivante
    } else if (consonnes.length === 1) {
      // Consonne simple : elle ouvre la syllabe suivante. « do-mi-ne ».
      coupe = finVoyelle + 1
    } else if (GROUPES_INSECABLES.has(consonnes)) {
      // Le groupe entier passe à la syllabe suivante. « ne-sci-ens », « pa-tris ».
      coupe = finVoyelle + 1
    } else if (consonnes.length === 3 && consonnes[0] === 's' && GROUPES_INSECABLES.has(consonnes.slice(1))) {
      // `s` + muette + liquide reste d'un seul tenant : « ca-stra », « no-strum ».
      coupe = finVoyelle + 1
    } else if (GROUPES_INSECABLES.has(consonnes.slice(-2))) {
      // Groupe long dont les deux dernières consonnes sont insécables :
      // « in-spi-ra-re », « tem-plum ».
      coupe = debutSuivante - 2
    } else {
      // Cas ordinaire : la dernière consonne ouvre la syllabe suivante.
      // « in-tel-le-ge-re », « prae-di-can-te ».
      coupe = debutSuivante - 1
    }
    coupes.push(coupe)
  }
  return coupes
}

/** Les syllabes d'un mot latin, telles que la langue les découpe. */
export function syllabesLatines(mot: string): string[] {
  const frontieres = frontieresSyllabiques(mot)
  const morceaux: string[] = []
  let debut = 0
  for (const f of frontieres) { morceaux.push(mot.slice(debut, f)); debut = f }
  morceaux.push(mot.slice(debut))
  return morceaux.filter(m => m.length > 0)
}

/** Les seules frontières où l'on accepte de couper la ligne. */
export function pointsDeCoupe(mot: string): number[] {
  if (mot.length < LONGUEUR_MINIMALE) return []
  return frontieresSyllabiques(mot)
    .filter(f => f >= MIN_AVANT && mot.length - f >= MIN_APRES)
}

/** Un mot, porteur de ses césures conditionnelles. */
export function cesurerMot(mot: string): string {
  const coupes = pointsDeCoupe(mot)
  if (coupes.length === 0) return mot
  let sortie = ''
  let debut = 0
  for (const c of coupes) { sortie += mot.slice(debut, c) + CESURE; debut = c }
  return sortie + mot.slice(debut)
}

// Ne touche QUE les suites de lettres assez longues pour mériter une coupe. Les
// marqueurs de note `[[81]]`, les nombres et la ponctuation restent intacts, ce
// qui laisse `rendreTexteAvecNotes` reconnaître ses appels.
const MOT = new RegExp(`[A-Za-z${VOYELLES}\\u0100-\\u017F]{${LONGUEUR_MINIMALE},}`, 'g')

/** Pose les césures conditionnelles dans un texte latin. Idempotent : un texte
 *  déjà césuré est nettoyé avant d'être re-syllabé. */
export function cesurerLatin(texte: string): string {
  return texte.split(CESURE).join('').replace(MOT, cesurerMot)
}

/** Retire toute césure conditionnelle. À appliquer sur tout texte qui QUITTE la
 *  page : copier-coller, citation, export. Une césure est une affaire de mise en
 *  page, elle n'a rien à faire dans un presse-papiers. */
export function sansCesures(texte: string): string {
  return texte.split(CESURE).join('')
}
