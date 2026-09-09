export type AncreNoteStructureeProjection = {
  noteKey: string
  marker: string
  segmentOffsetUnicode: number
  sourceTarget: string | null
}

const MARQUEUR_NOTE = /^\[\[([A-Z0-9]+)\]\]$/u

function comparerMarqueurs(a: string, b: string): number {
  const cleA = a.match(MARQUEUR_NOTE)?.[1] ?? a
  const cleB = b.match(MARQUEUR_NOTE)?.[1] ?? b
  return cleA.localeCompare(cleB, 'fr', { numeric: true })
}

/** Ce qui rend une ancre INPROJETABLE sur un texte de `longueur` points de code,
 *  ou `null` si elle se projette. Une seule écriture des deux contrôles, pour la
 *  projection stricte comme pour celle qui ne faillit pas. */
export function refusDAncre(ancre: AncreNoteStructureeProjection, longueur: number): string | null {
  if (!MARQUEUR_NOTE.test(ancre.marker)) {
    return `Marqueur de note invalide pour ${ancre.noteKey} : ${ancre.marker}`
  }
  if (!Number.isInteger(ancre.segmentOffsetUnicode)
    || ancre.segmentOffsetUnicode < 0
    || ancre.segmentOffsetUnicode > longueur) {
    return `Offset Unicode hors limites pour ${ancre.noteKey} : ${ancre.segmentOffsetUnicode}/${longueur}`
  }
  return null
}

type SurRefus = (ancre: AncreNoteStructureeProjection, refus: string) => void

/**
 * LE CHAMP dans lequel on projette — `source_target` de l'ancre (charte § 13.6).
 *
 * ⛔ La projection ne connaissait que `segment_texte`, et TOUT LE RESTE était laissé de
 * côté SANS UN MOT. Mesuré le 9 septembre 2026 : 36 ancres du corpus visent un champ de
 * TITRE sans porter leur marqueur matériellement — 30 sur `ref_niv1_texte` et 3 sur
 * `ref_niv2` dans les Homélies sur la Genèse, une sur `ref_niv1_texte` dans les
 * Catéchèses, deux sur `work_title` (Annotations sur le livre de Job, De la vanité des
 * idoles). Leur appel ne paraissait NULLE PART, et rien ne le disait.
 *
 * ⚠️ Les 57 autres ancres de titre du corpus portent leur marqueur DANS le champ : elles
 * se rendaient déjà, et la projection les laisse telles quelles (elle ne double jamais un
 * marqueur matériel).
 */
export const CHAMP_SEGMENT = 'segment_texte'

/**
 * Le nom que `source_target` donne à un CHAMP DE TITRE.
 *
 * ⛔ Les deux vocabulaires ne coïncident PAS : un groupe de rendu appelle son titre
 * `niv1`, l'ancre nomme la COLONNE de `segments`, `ref_niv1`. Projeter sur le nom du
 * groupe ne trouverait aucune ancre, et l'appel manquerait sans un mot — c'est
 * exactement le défaut qu'on vient de fermer.
 */
export function champDuTitre(champ: string): string {
  return `ref_${champ}`
}

/**
 * Reconstruit la projection textuelle des appels de notes à partir des ancres
 * structurées. Les offsets Postgres comptent les points de code Unicode depuis
 * zéro ; `Array.from` reproduit cette convention, contrairement aux indices
 * UTF-16 natifs de JavaScript.
 *
 * La donnée canonique n'est jamais modifiée. Les marqueurs déjà matériels sont
 * conservés sans duplication, pour que les anciens imports restent compatibles.
 *
 * ⛔ Une ancre inprojetable LÈVE : c'est la projection de CONTRÔLE, celle des
 * scripts et des tests (charte § 13.6, l'erreur est remontée). Une PAGE emploie
 * `projeterAppelsNotesStructureesSansFaillir`, qui laisse l'ancre de côté et la
 * signale : une seule ancre ne ferme pas une œuvre au lecteur (2026-09-05).
 */
export function projeterAppelsNotesStructurees(
  texte: string,
  ancres: readonly AncreNoteStructureeProjection[] | null | undefined,
  champ: string = CHAMP_SEGMENT,
): string {
  return projeter(texte, ancres, (_ancre, refus) => { throw new Error(refus) }, champ)
}

/** La même projection, pour une PAGE : une ancre que le texte ne peut pas recevoir
 *  est laissée de côté et passée à `signaler`, les autres se posent. Le texte rendu
 *  est celui de la projection stricte dès que rien n'est refusé. */
export function projeterAppelsNotesStructureesSansFaillir(
  texte: string,
  ancres: readonly AncreNoteStructureeProjection[] | null | undefined,
  signaler: SurRefus,
  champ: string = CHAMP_SEGMENT,
): string {
  return projeter(texte, ancres, signaler, champ)
}

/** Pour une surface rendue par le NAVIGATEUR (rechargement d'une division ou de
 *  l'apparat, traductions parallèles) : l'ancre refusée est dite à la console, le
 *  segment se lit. Le serveur, lui, compte les refus pour le bandeau de la page. */
export function projeterAppelsNotesStructureesEnSignalant(
  texte: string,
  ancres: readonly AncreNoteStructureeProjection[] | null | undefined,
  champ: string = CHAMP_SEGMENT,
): string {
  return projeter(texte, ancres, (_ancre, refus) => { console.error('[lecture] appel de note laissé de côté :', refus) }, champ)
}

function projeter(
  texte: string,
  ancres: readonly AncreNoteStructureeProjection[] | null | undefined,
  surRefus: SurRefus,
  champ: string = CHAMP_SEGMENT,
): string {
  if (!ancres?.length) return texte

  const pointsDeCode = Array.from(texte)
  const insertions = new Map<number, string[]>()
  const dejaPlanifies = new Set<string>()

  for (const ancre of ancres) {
    if (ancre.sourceTarget !== champ) continue
    const refus = refusDAncre(ancre, pointsDeCode.length)
    if (refus !== null) {
      surRefus(ancre, refus)
      continue
    }
    if (texte.includes(ancre.marker)) continue

    const cle = `${ancre.segmentOffsetUnicode}|${ancre.marker}`
    if (dejaPlanifies.has(cle)) continue
    dejaPlanifies.add(cle)
    const marqueurs = insertions.get(ancre.segmentOffsetUnicode) ?? []
    marqueurs.push(ancre.marker)
    insertions.set(ancre.segmentOffsetUnicode, marqueurs)
  }

  for (const [offset, marqueurs] of [...insertions.entries()].sort((a, b) => b[0] - a[0])) {
    marqueurs.sort(comparerMarqueurs)
    pointsDeCode.splice(offset, 0, ...Array.from(marqueurs.join('')))
  }

  return pointsDeCode.join('')
}
