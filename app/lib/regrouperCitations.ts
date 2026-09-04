/**
 * REGROUPER LES CITATIONS D'UNE MÊME ŒUVRE PATRISTIQUE.
 *
 * Le volet de droite réunissait déjà les segments qui SE SUIVENT en une seule
 * occurrence : un commentaire coupé en trois paragraphes par l'édition se lit
 * d'un trait, comme il a été écrit. Demande de l'auteur du 4 septembre 2026 :
 * « regrouper les citations d'une même œuvre patristique (seulement ; non
 * biblique) comme c'est déjà le cas pour les segments qui se suivent ; toutefois,
 * il faut remplacer l'élision par un « […] » et que l'élision soit de taille
 * raisonnable. Disons, au maximum, 500 caractères. »
 *
 * ⛔ ON NE RÉUNIT QUE CE QU'ON PEUT MESURER. Un écart se juge en SIGNES ÉLIDÉS,
 * non en nombre de segments : deux paragraphes séparés par une incise de trente
 * mots forment un développement, deux paragraphes séparés par trois pages n'en
 * forment pas. Le nombre de segments ne dit rien de cela — une édition en découpe
 * un en dix, une autre en fait un seul. ⚠️ Il faut donc CONNAÎTRE le texte élidé,
 * c'est-à-dire l'avoir chargé : `ecartsAMesurer` dit ce qu'il reste à aller lire,
 * et un écart dont un seul segment manque à l'appel ne se réunit pas.
 *
 * ⛔ ET L'ON NE RÉUNIT QUE DANS UN MÊME TEXTE, non dans une même œuvre. Une œuvre
 * en porte plusieurs — La Cité de Dieu a son latin et son français, tous deux liés
 * à des versets — et leurs `segment_numero` se recouvrent : réunir sur la seule
 * œuvre collait un paragraphe latin à un paragraphe français dès que leurs numéros
 * se suivaient. Le défaut était là depuis l'origine du regroupement.
 *
 * ⚠️ RIEN ICI NE CONCERNE LES VERSETS BIBLIQUES. Une suite de versets se réunit
 * déjà, et par une tout autre règle : elle garde ses bornes (« 12-15 »), et une
 * élision y ferait disparaître un verset sans le dire.
 *
 * Module pur : aucune requête, aucun rendu.
 */

/**
 * Le plafond d'ÉLISION, en signes. Au delà, deux citations restent deux
 * citations : le lecteur doit voir qu'il manque quelque chose de conséquent, et
 * un « […] » ne peut pas porter trois pages.
 */
export const PLAFOND_ELISION_SIGNES = 500

/**
 * Combien de segments on accepte d'aller MESURER dans un écart. ⚠️ Borne
 * TECHNIQUE, non éditoriale : elle ne juge pas la longueur, elle borne la
 * requête. Un écart plus large ne se réunit pas, et il n'avait de toute façon
 * presque aucune chance de tenir sous les cinq cents signes.
 */
export const PLAFOND_SEGMENTS_ELIDES = 6

/** La marque de l'élision, telle que l'auteur la veut. */
export const MARQUE_ELISION = '[…]'

export type CitationRegroupable = {
  /** L'œuvre — pour la nommer, jamais pour décider d'un regroupement. */
  idOeuvre: string
  /** LE TEXTE : c'est lui qui décide. `null` quand on ne le sait pas, et l'on ne
   *  réunit alors rien. */
  idTexte: string | null
  numero: number
  texte: string
}

/** Un écart entre deux citations voisines, dans un même texte. Les bornes sont
 *  EXCLUSIVES : ce qui manque est `de + 1` à `a - 1`. */
export type Ecart = { idTexte: string; de: number; a: number }

/** Les numéros que porte un écart. */
export function numerosDeLEcart(ecart: Ecart): number[] {
  const numeros: number[] = []
  for (let n = ecart.de + 1; n < ecart.a; n += 1) numeros.push(n)
  return numeros
}

/**
 * Les écarts qu'il faut mesurer pour savoir si deux citations voisines se
 * réunissent. ⚠️ On les prend sur la liste ENTIÈRE, filtres écartés : un filtre
 * qui retire une citation d'entre deux autres ouvre un écart dont on connaît
 * déjà le texte, puisqu'on l'avait chargé.
 */
export function ecartsAMesurer<T>(liste: readonly T[], cle: (item: T) => CitationRegroupable): Ecart[] {
  const vus = new Set<string>()
  const ecarts: Ecart[] = []
  for (let i = 1; i < liste.length; i += 1) {
    const prec = cle(liste[i - 1])
    const suiv = cle(liste[i])
    if (!prec.idTexte || prec.idTexte !== suiv.idTexte) continue
    const manquants = suiv.numero - prec.numero - 1
    if (manquants <= 0 || manquants > PLAFOND_SEGMENTS_ELIDES) continue
    const empreinte = `${prec.idTexte}|${prec.numero}|${suiv.numero}`
    if (vus.has(empreinte)) continue
    vus.add(empreinte)
    ecarts.push({ idTexte: prec.idTexte, de: prec.numero, a: suiv.numero })
  }
  return ecarts
}

/**
 * Les groupes : des tranches CONSÉCUTIVES de la liste, dans un même texte, aux
 * numéros croissants, l'écart admis tant que le texte élidé tient sous le
 * plafond.
 *
 * `signesElides` rend le nombre de signes qui manquent entre deux numéros, ou
 * `null` quand on ne le sait pas — ⛔ et l'on ne réunit alors PAS : un « […] »
 * qui cacherait une quantité inconnue ne dit rien au lecteur.
 */
export function regrouperCitations<T>(
  liste: readonly T[],
  cle: (item: T) => CitationRegroupable,
  signesElides: (ecart: Ecart) => number | null,
): T[][] {
  const groupes: T[][] = []
  for (const item of liste) {
    const groupe = groupes[groupes.length - 1]
    const dernier = groupe?.[groupe.length - 1]
    const prec = dernier === undefined ? null : cle(dernier)
    const cet = cle(item)
    if (prec && prec.idTexte && prec.idTexte === cet.idTexte && cet.numero > prec.numero) {
      const manquants = cet.numero - prec.numero - 1
      if (manquants === 0) { groupe.push(item); continue }
      if (manquants <= PLAFOND_SEGMENTS_ELIDES) {
        const signes = signesElides({ idTexte: prec.idTexte, de: prec.numero, a: cet.numero })
        if (signes !== null && signes <= PLAFOND_ELISION_SIGNES) { groupe.push(item); continue }
      }
    }
    groupes.push([item])
  }
  return groupes
}

/**
 * Le texte d'un groupe : les citations à la suite, l'élision marquée d'un
 * « […] ». ⚠️ La marque n'apparaît qu'aux jonctions qui en ont une : deux
 * segments qui se suivent se joignent d'une simple espace, comme avant.
 */
export function texteDuGroupe<T>(groupe: readonly T[], cle: (item: T) => CitationRegroupable): string {
  return groupe.reduce((acc, item, i) => {
    const cet = cle(item)
    if (i === 0) return cet.texte
    const joint = cet.numero === cle(groupe[i - 1]).numero + 1 ? ' ' : ` ${MARQUE_ELISION} `
    return acc + joint + cet.texte
  }, '')
}
