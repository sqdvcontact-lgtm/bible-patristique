/**
 * Le GRAIN de l'empan — la mesure de la règle, en code.
 *
 * Doctrine : charte `parametres.charte_ia`, § 12.2, « Le grain de l'empan ». La règle
 * était écrite et rien ne la vérifiait : ce module la rend MESURABLE.
 *
 *   1. le paragraphe de l'édition TRADUITE fait loi, et c'est une frontière absolue —
 *      ⛔ aucun groupe ne l'enjambe. La langue originale, elle, n'oppose aucune
 *      frontière : ses paragraphes et ses sections se traversent librement ;
 *   2. à défaut de paragraphage, on pose les frontières à la main aux jonctions
 *      sémantiques — ce module ne sait pas les juger, il ne mesure que ce qui se compte ;
 *   3. l'empan reste bref : `REPERE_EMPAN` en cible, `LIMITE_EMPAN` en limite haute.
 *
 * ⛔ Il MESURE, il ne corrige rien et ne décide rien. Une coupe se place au sens, jamais
 * au compteur : le repère dit où regarder, il ne dit pas où couper.
 */

/**
 * ⛔ `paragraphe` SEUL n'identifie pas un paragraphe : il repart à 1 dans chaque
 * division. Un `count(distinct paragraphe)` sur un texte entier rend son plus grand
 * NUMÉRO — 18 pour les 932 paragraphes du français des Confessions —, et deux
 * paragraphes de deux livres différents s'y confondent. La clé est donc la division
 * ENTIÈRE plus le numéro.
 *
 * Le séparateur s'écrit par son code : c'est un caractère de contrôle, qu'aucun texte ne
 * porte, et un littéral échappé se ferait convertir à la première réécriture du fichier.
 */
const SEPARATEUR = String.fromCharCode(31)

/** Un segment du texte TRADUIT, tel que le contrôle a besoin de le voir. */
export type SegmentTraduit = {
  segmentKey: string
  refNiv1?: string | null
  refNiv2?: string | null
  refNiv3?: string | null
  paragraphe?: number | null
  /** Longueur du texte, en points de code — voir `longueurUnicode`. */
  longueur: number
}

/**
 * La clé du paragraphe qui porte ce segment, ou `null` quand la donnée ne la dit pas.
 *
 * ⛔ Un segment sans numéro de paragraphe ne se range NI d'un côté NI de l'autre, et
 * c'est un troisième état, non un cas limite. Les six préfaces des livres VI et VII de
 * la Cité de Dieu sont dans ce cas : quatre et deux paragraphes de prose, dont
 * l'importation n'a pas retenu la numérotation.
 *
 * - les fondre en un seul paragraphe (ce que fait un `coalesce` en SQL) laisse passer un
 *   chevauchement réel : on déclare sain ce qu'on n'a pas regardé ;
 * - en faire un paragraphe chacun crie à la violation là où l'on ne sait rien.
 *
 * Les deux mentent. L'empan porte donc `paragrapheInconnu`, qui désigne un défaut de
 * DONNÉE — c'est le cas de la règle 2, où il faut d'abord rendre au texte les alinéas de
 * son édition — et il n'entre jamais dans le compte des frontières franchies.
 */
export function cleDeParagraphe(s: SegmentTraduit): string | null {
  if (s.paragraphe == null) return null
  return [s.refNiv1 ?? '', s.refNiv2 ?? '', s.refNiv3 ?? '', String(s.paragraphe)].join(SEPARATEUR)
}

/** La longueur d'un texte en POINTS DE CODE, comme la compte `length()` de Postgres. */
export function longueurUnicode(texte: string): number {
  return [...texte].length
}

/** La cible : un empan qui se lit d'un seul regard. Voir charte § 12.2, règle 3. */
export const REPERE_EMPAN = 900
/** La limite haute : au-delà, l'empan se subdivise à une jonction sémantique. */
export const LIMITE_EMPAN = 1500

export type EmpanMesure = {
  alignmentId: string
  /** Nombre de segments traduits que le groupe réunit. */
  segments: number
  /** Signes de la colonne traduite, points de code. */
  signes: number
  /** Les paragraphes CONNUS traversés, dans l'ordre de première rencontre. */
  paragraphes: string[]
  /** Combien de ses segments ne portent aucun numéro de paragraphe. */
  segmentsSansParagraphe: number
  /** ⛔ Le groupe enjambe une frontière du texte traduit : violation de la règle 1. */
  aCheval: boolean
  /** ⚠️ Le groupe dépasse la limite haute : excès de grain, règle 3. */
  tropLong: boolean
  /** ⚠️ La donnée ne dit pas où sont les paragraphes : on ne peut RIEN conclure ici. */
  paragrapheInconnu: boolean
}

/**
 * Mesure chaque groupe d'alignement sur la colonne TRADUITE.
 *
 * ⚠️ L'ordre des segments reçus fait foi — c'est l'ordre de LECTURE. On ne trie sur
 * rien : `rang` repart à 1 à chaque paragraphe, et trier dessus mêlerait les deux
 * moitiés d'un groupe à cheval, c'est-à-dire effacerait précisément ce qu'on cherche.
 *
 * Les segments qu'aucun groupe ne couvre sont ignorés : ils ne composent pas en regard,
 * ils n'ont donc pas d'empan à mesurer.
 */
export function mesurerEmpans(
  segments: readonly SegmentTraduit[],
  groupeParCle: ReadonlyMap<string, string>,
): EmpanMesure[] {
  const empans = new Map<string, EmpanMesure>()
  for (const segment of segments) {
    const groupe = groupeParCle.get(segment.segmentKey)
    if (!groupe) continue
    const cle = cleDeParagraphe(segment)
    let empan = empans.get(groupe)
    if (!empan) {
      empan = {
        alignmentId: groupe,
        segments: 0,
        signes: 0,
        paragraphes: [],
        segmentsSansParagraphe: 0,
        aCheval: false,
        tropLong: false,
        paragrapheInconnu: false,
      }
      empans.set(groupe, empan)
    }
    empan.segments += 1
    empan.signes += segment.longueur
    if (cle === null) empan.segmentsSansParagraphe += 1
    else if (!empan.paragraphes.includes(cle)) empan.paragraphes.push(cle)
    empan.aCheval = empan.paragraphes.length > 1
    empan.tropLong = empan.signes > LIMITE_EMPAN
    empan.paragrapheInconnu = empan.segmentsSansParagraphe > 0
  }
  return [...empans.values()]
}

export type BilanGrain = {
  empans: number
  /** Combien enjambent une frontière du texte traduit. Doit valoir zéro. */
  aCheval: number
  /** Combien dépassent la limite haute. */
  tropLong: number
  /** Combien atteignent déjà le repère de brièveté. */
  sousLeRepere: number
  /** ⚠️ Combien reposent sur une donnée qui ne dit pas où sont les paragraphes. */
  paragrapheInconnu: number
  medianeSignes: number
  maxSignes: number
  /**
   * ⛔ La règle 1 est tenue : aucun groupe n'enjambe une frontière CONNUE.
   *
   * ⚠️ Elle ne vaut donc que sur ce que la donnée dit. Un ensemble qui compte des empans
   * à paragraphe inconnu peut la tenir ici et la violer dans le texte : le lire sans
   * regarder `paragrapheInconnu`, c'est prendre une ignorance pour une garantie.
   */
  frontieresTenues: boolean
}

/**
 * Le bilan d'un ensemble.
 *
 * ⚠️ La médiane est la médiane BASSE, celle de `percentile_disc(0.5)` en SQL : les
 * chiffres publiés dans `AGENTS.md` viennent de là, et deux façons de la prendre les
 * feraient diverger d'un signe sans qu'on sache laquelle croire.
 */
export function bilanDuGrain(empans: readonly EmpanMesure[]): BilanGrain {
  const signes = empans.map(e => e.signes).sort((a, b) => a - b)
  const aCheval = empans.filter(e => e.aCheval).length
  return {
    empans: empans.length,
    aCheval,
    tropLong: empans.filter(e => e.tropLong).length,
    sousLeRepere: empans.filter(e => e.signes <= REPERE_EMPAN).length,
    paragrapheInconnu: empans.filter(e => e.paragrapheInconnu).length,
    medianeSignes: signes.length === 0 ? 0 : signes[Math.max(0, Math.ceil(signes.length / 2) - 1)],
    maxSignes: signes.length === 0 ? 0 : signes[signes.length - 1],
    frontieresTenues: aCheval === 0,
  }
}

/**
 * Les empans à reprendre, les plus graves d'abord : ceux qui enjambent une frontière,
 * puis les plus longs. C'est l'ordre dans lequel un atelier les présenterait.
 */
export function empansARependre(empans: readonly EmpanMesure[]): EmpanMesure[] {
  return empans
    .filter(e => e.aCheval || e.tropLong)
    .sort((a, b) => Number(b.aCheval) - Number(a.aCheval) || b.signes - a.signes)
}
