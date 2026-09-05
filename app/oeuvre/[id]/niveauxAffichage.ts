/**
 * LES NIVEAUX D'AFFICHAGE d'une œuvre — ce que le panneau d'administration promet.
 *
 * La roue crantée du volet de lecture règle deux choses, séparément pour le SOMMAIRE et
 * pour le CORPS : jusqu'à quel niveau de titre on descend, et lesquels de ces niveaux
 * montrent leur CHAPEAU (le complément `ref_nivN_texte`). Les quatre valeurs vivent sur
 * l'ŒUVRE — `oeuvres.niveaux_sommaire`, `niveaux_corps`, `texte_sommaire`, `texte_corps`
 * — et gouvernent donc TOUS ses textes à la fois.
 *
 * ⛔ CE QUE CE MODULE RÉPARE (relevé par l'auteur le 2026-09-05 : « y'a des N toujours
 * cochés, même quand grisés, et n'affichent pas toujours les niveaux existants »). Le
 * panneau disait trois choses fausses, et elles n'avaient pas la même cause :
 *
 *  1. **Un chapeau restait COCHÉ au-dessus du niveau affiché.** Sa pastille se peignait
 *     sur `texte_sommaire[i]` et se grisait sur `i >= niveaux_sommaire` : les deux
 *     pouvaient valoir vrai en même temps, et c'est le cas ORDINAIRE en base. Mesuré le
 *     2026-09-05 : Du combat chrétien porte `niveaux 1,1` et `chapeaux 1,1,1` des deux
 *     côtés ; la Somme théologique `sommaire 2` et `chapeaux 1,1,1,1,1`. La pastille
 *     était donc verte ET éteinte à 40 %, et — le bouton étant `disabled` — **on ne
 *     pouvait plus la décocher** : « toujours cochés », au mot près. Pire, remonter le
 *     niveau rallumait d'un coup des chapeaux que personne n'avait choisis.
 *  2. **Le panneau offrait des niveaux que la page ne sait pas rendre.** Le sommaire
 *     s'arrête au niveau 3 (`profondeurSommaire >= 3` est son test le plus profond) et
 *     le corps au niveau 4 ; le panneau en proposait CINQ de chaque côté. La Somme
 *     théologique est enregistrée à `niveaux_corps = 5`, qui rend exactement comme 4.
 *  3. **Un niveau existant pouvait se griser.** La sonde d'existence lisait `data` sans
 *     regarder `error` : une requête en échec valait « niveau absent ». Or elle coûte,
 *     mesuré sur la Somme théologique, **3,1 s par niveau ABSENT** — elle parcourt les
 *     32 367 segments du texte pour ne rien trouver — et cinq partaient EN PARALLÈLE,
 *     sous le délai de huit secondes du rôle `authenticated`. D'où un grisé
 *     intermittent, c'est-à-dire « pas toujours ».
 *
 * Module PUR : ni requête, ni rendu, ni React.
 */

/** Les deux surfaces réglées séparément. */
export type Surface = 'sommaire' | 'corps'

/**
 * Jusqu'où chaque surface sait RÉELLEMENT descendre, mesuré dans `OeuvreClient`.
 *
 * ⛔ Le panneau n'offre jamais au delà : promettre un niveau que le rendu ignore, c'est
 * laisser l'administrateur croire qu'il a réglé quelque chose. Le sommaire teste
 * `profondeurSommaire >= 3` au plus profond, le corps `profondeurCorps >= 4`.
 *
 * ⚠️ Et c'est cohérent avec la donnée : `GroupeData` s'arrête au niveau 4, et AUCUN
 * segment du corpus ne porte de `ref_niv5` (mesuré à zéro le 2026-08-29).
 */
export const PROFONDEUR_MAX: Record<Surface, number> = { sommaire: 3, corps: 4 }

/** Le nombre de colonnes `ref_nivN` de `segments` — donc la longueur des deux tableaux
 *  de chapeaux, que `texte_sommaire` / `texte_corps` stockent en « 1,0,0,0,0 ». */
export const NIVEAUX_EN_BASE = 5

export type ConfigNiveaux = {
  sommaire: number
  corps: number
  txtSommaire: boolean[]
  txtCorps: boolean[]
  afficherNumeros: boolean
  texteEntier: boolean
}

/** La clé du champ de profondeur, et celle des chapeaux, pour une surface donnée. */
export function clesDeSurface(surface: Surface) {
  return surface === 'sommaire'
    ? { profondeur: 'sommaire' as const, chapeaux: 'txtSommaire' as const }
    : { profondeur: 'corps' as const, chapeaux: 'txtCorps' as const }
}

/** Les niveaux que le panneau propose pour une surface : 1 à 3, ou 1 à 4. */
export function niveauxOfferts(surface: Surface): number[] {
  return Array.from({ length: PROFONDEUR_MAX[surface] }, (_, i) => i + 1)
}

/** Un tableau de chapeaux ramené à la longueur de la base, quoi qu'on lui donne. */
function tableauDeChapeaux(brut: readonly boolean[] | undefined): boolean[] {
  return Array.from({ length: NIVEAUX_EN_BASE }, (_, i) => brut?.[i] === true)
}

/**
 * Un chapeau au-dessus du niveau affiché ne rend RIEN : la page pose le complément à
 * l'intérieur du titre, et le titre n'existe pas. On l'éteint donc, au lieu de le
 * montrer allumé et hors de portée.
 */
function chapeauxBornes(brut: readonly boolean[] | undefined, profondeur: number): boolean[] {
  return tableauDeChapeaux(brut).map((actif, i) => actif && i + 1 <= profondeur)
}

/** Une profondeur ramenée entre 1 et ce que la surface sait rendre. */
export function profondeurBornee(valeur: number | null | undefined, surface: Surface): number {
  const n = Number.isFinite(valeur) ? Math.trunc(valeur as number) : 1
  return Math.min(Math.max(n, 1), PROFONDEUR_MAX[surface])
}

/**
 * La configuration telle que le panneau doit l'OUVRIR : bornée à ce que la page rend,
 * chapeaux éteints au-dessus de leur niveau.
 *
 * ⚠️ La normalisation ne peut RIEN changer à l'écran de lecture : un niveau au delà du
 * maximum rend comme le maximum (`>= 4` est le test le plus profond du corps), et un
 * chapeau au delà de sa profondeur ne rend pas du tout. Elle ne fait qu'accorder ce que
 * le panneau MONTRE avec ce que la page FAIT — et, une fois enregistrée, la donnée avec
 * les deux.
 */
export function normaliserConfig(brut: {
  sommaire?: number | null
  corps?: number | null
  txtSommaire?: readonly boolean[]
  txtCorps?: readonly boolean[]
  afficherNumeros?: boolean | null
  texteEntier?: boolean | null
}): ConfigNiveaux {
  const sommaire = profondeurBornee(brut.sommaire, 'sommaire')
  const corps = profondeurBornee(brut.corps, 'corps')
  return {
    sommaire,
    corps,
    txtSommaire: chapeauxBornes(brut.txtSommaire, sommaire),
    txtCorps: chapeauxBornes(brut.txtCorps, corps),
    afficherNumeros: brut.afficherNumeros !== false,
    texteEntier: brut.texteEntier === true,
  }
}

/**
 * Poser une profondeur, et éteindre les chapeaux qui tombent hors de portée.
 *
 * ⛔ C'est l'autre moitié de la correction : sans elle, baisser le niveau laisserait un
 * chapeau allumé qu'on ne peut plus atteindre, et le remonter le rallumerait sans qu'on
 * l'ait demandé.
 */
export function poserProfondeur(config: ConfigNiveaux, surface: Surface, niveau: number): ConfigNiveaux {
  const cles = clesDeSurface(surface)
  const borne = profondeurBornee(niveau, surface)
  return {
    ...config,
    [cles.profondeur]: borne,
    [cles.chapeaux]: chapeauxBornes(config[cles.chapeaux], borne),
  }
}

/** Basculer le chapeau du niveau `niveau` (1-indexé). Sans effet hors de portée. */
export function basculerChapeau(config: ConfigNiveaux, surface: Surface, niveau: number): ConfigNiveaux {
  const cles = clesDeSurface(surface)
  if (niveau < 1 || niveau > config[cles.profondeur]) return config
  const chapeaux = [...config[cles.chapeaux]]
  chapeaux[niveau - 1] = !chapeaux[niveau - 1]
  return { ...config, [cles.chapeaux]: chapeaux }
}

/** La forme d'enregistrement de `texte_sommaire` / `texte_corps` : « 1,0,0,0,0 ». */
export function chapeauxEnTexte(chapeaux: readonly boolean[]): string {
  return tableauDeChapeaux(chapeaux).map(x => (x ? '1' : '0')).join(',')
}

/**
 * La profondeur RÉELLEMENT présente dans l'œuvre, cherchée du plus haut niveau au plus
 * bas, en s'arrêtant au premier absent.
 *
 * ⛔ Du plus haut au plus bas, et pas l'inverse : une sonde qui TROUVE s'arrête à la
 * première ligne, une sonde qui ne trouve rien parcourt tout le texte. Sur la Somme
 * théologique, un niveau présent répond en quelques millisecondes quand un niveau absent
 * coûte 3,1 s. En descendant, on ne paie qu'UNE fois ce prix — celui du premier absent —
 * au lieu de trois, et en série plutôt qu'en parallèle : rien ne se dispute le délai.
 *
 * ⚠️ Cela suppose les niveaux EMBOÎTÉS, ce que la donnée dit : sur les 46 œuvres du
 * corpus, aucune ne porte un niveau sans porter celui du dessus (mesuré le 2026-09-05 ;
 * 42 segments sur 108 586 ont un `ref_niv3` sans `ref_niv2`, mais leur œuvre porte un
 * niveau 2 par ailleurs). ⛔ C'est pourquoi le résultat ne sert qu'à SIGNALER un niveau
 * vide, jamais à l'interdire : si l'emboîtement venait à se rompre, l'administrateur
 * verrait une pastille éteinte, non un bouton mort.
 *
 * Rend `null` — « on ne sait pas » — dès qu'une sonde échoue. ⛔ Une requête en échec
 * n'est pas un niveau absent : c'est ce qui grisait des niveaux existants.
 */
export async function profondeurPresente(
  sonder: (niveau: number) => Promise<boolean | null>,
  maximum: number = NIVEAUX_EN_BASE,
): Promise<number | null> {
  let profondeur = 0
  for (let niveau = 1; niveau <= maximum; niveau++) {
    const present = await sonder(niveau)
    if (present === null) return null
    if (!present) break
    profondeur = niveau
  }
  return profondeur
}

/**
 * Le niveau `n` est-il VIDE, c'est-à-dire sans aucun titre dans l'œuvre ?
 *
 * ⛔ Le niveau CHOISI n'est jamais dit vide : c'est le réglage en vigueur, et une
 * pastille à la fois verte et éteinte ne se lit pas. Le panneau montre d'abord ce qui
 * est réglé ; il signale ensuite ce qui est creux.
 */
export function niveauVide(profondeur: number | null, niveau: number, choisi: boolean): boolean {
  return profondeur !== null && !choisi && niveau > profondeur
}
