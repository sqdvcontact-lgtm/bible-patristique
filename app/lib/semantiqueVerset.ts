/**
 * L'ANNOTATION SÉMANTIQUE D'UN CHAPITRE — la règle de l'onglet « Sémantique » du volet de
 * droite de la page Bible, pure et testée. Le chargement vit dans la route
 * `/api/admin/semantique`, l'affichage dans `OngletSemantique.tsx`.
 *
 * Demande de l'auteur (2026-09-21) : voir, au clic sur un verset, les annotations qui le
 * couvrent (concepts, autorités, qualifications littéraires), avec un mode d'inspection
 * éditoriale et les arbitrages ouverts à part.
 *
 * ⛔ RÉSERVÉ À L'ADMINISTRATEUR, ET DE PROPOS DÉLIBÉRÉ : les tables `semantique_*` n'ont
 * aucune politique de lecture, seule la clé de service les lit, et l'auteur veut rester le
 * seul à les lire. Ne pas leur ouvrir de politique pour « simplifier » cet onglet.
 *
 * ⚠️ UNE PORTÉE SE LIT PAR SES DEUX BORNES CANONIQUES (`LIV.ch.v`), dans le même livre.
 * Qu'elle couvre un verset se décide sur le couple (chapitre, verset), qui suit l'ordre de
 * `versets_canon.ordre` à l'intérieur d'un livre.
 */

export type TypeAnnotation = 'concept' | 'autorite' | 'litteraire'

export type FormeAutorite = { forme: string; langue: string; typeForme: string; note: string | null }

export type AnnotationSemantique = {
  id: number
  type: TypeAnnotation
  portee: { id: number; debut: string; fin: string; note: string | null }
  importance: string | null
  niveauSemantique: string | null
  certitude: string
  provenance: string
  validation: string
  cycleVie: string
  confianceTechnique: number | null
  justification: string | null
  creePar: string | null
  validePar: string | null
  valideLe: string | null
  creeLe: string
  misAJour: string
  concept: {
    id: number; code: string; versionCode: string; termePrefere: string; categorie: string; statut: string
  } | null
  autorite: {
    id: string; typeCode: string; typeLibelle: string | null; nomCanonique: string
    validation: string; cycleVie: string; formes: FormeAutorite[]
  } | null
  litteraire: { code: string; categorie: string; libelle: string; versionCode: string } | null
}

export type ArbitrageOuvert = {
  id: number
  portee: { id: number; debut: string; fin: string } | null
  systeme: string
  formulationProposee: string
  besoinDocumentaire: string
  identifiantsVoisins: unknown[]
  provenance: string
  sourcesNote: string | null
  creeLe: string
}

export type SemantiqueDuChapitre = {
  livre: string
  chapitre: number
  /** Les créneaux du chapitre, dans l'ordre du canon. */
  versets: string[]
  /** Toutes les annotations dont la portée recoupe le chapitre, y compris retirées et remplacées. */
  annotations: AnnotationSemantique[]
  arbitrages: ArbitrageOuvert[]
}

export const TYPES_ANNOTATION: readonly TypeAnnotation[] = ['concept', 'autorite', 'litteraire']

export const LIBELLES_TYPE: Record<TypeAnnotation, string> = {
  concept: 'Concepts',
  autorite: 'Autorités',
  litteraire: 'Qualifications littéraires',
}

type Point = { livre: string; chapitre: number; verset: number }

/** « GEN.14.9 » → { GEN, 14, 9 } ; rien de ce qui n'a pas la forme d'un créneau. */
export function pointDuCreneau(id: string): Point | null {
  const m = /^([0-9A-Z]{3})\.(\d+)\.(\d+)$/.exec(id)
  return m ? { livre: m[1], chapitre: Number(m[2]), verset: Number(m[3]) } : null
}

function comparer(a: Point, b: Point): number {
  return a.chapitre - b.chapitre || a.verset - b.verset
}

/** La portée couvre-t-elle ce créneau ? Faux dès qu'une borne n'est pas lisible. */
export function porteeCouvre(portee: { debut: string; fin: string }, creneau: string): boolean {
  const d = pointDuCreneau(portee.debut)
  const f = pointDuCreneau(portee.fin)
  const v = pointDuCreneau(creneau)
  if (!d || !f || !v || d.livre !== v.livre || f.livre !== v.livre) return false
  return comparer(d, v) <= 0 && comparer(v, f) <= 0
}

/** La portée recoupe-t-elle le chapitre ? */
export function porteeRecoupeChapitre(portee: { debut: string; fin: string }, livre: string, chapitre: number): boolean {
  const d = pointDuCreneau(portee.debut)
  const f = pointDuCreneau(portee.fin)
  if (!d || !f || d.livre !== livre || f.livre !== livre) return false
  return d.chapitre <= chapitre && chapitre <= f.chapitre
}

/** Une portée de plus d'un verset, qu'on dit en toutes lettres. */
export function porteeEtendue(portee: { debut: string; fin: string }): boolean {
  return portee.debut !== portee.fin
}

export function estActive(a: AnnotationSemantique): boolean {
  return a.cycleVie === 'actif'
}

/** Les annotations qui couvrent un créneau ; les seules actives hors inspection. */
export function annotationsDuVerset(
  annotations: readonly AnnotationSemantique[],
  creneau: string,
  inspection: boolean,
): AnnotationSemantique[] {
  return annotations.filter(a => (inspection || estActive(a)) && porteeCouvre(a.portee, creneau))
}

/**
 * L'ordre de lecture d'une liste : les principales d'abord, puis par portée étroite, puis
 * par libellé. Une annotation inactive passe après les actives.
 */
const RANG_IMPORTANCE: Record<string, number> = { principal: 0, secondaire: 1, contextuel: 2 }

export function libelleAnnotation(a: AnnotationSemantique): string {
  return a.concept?.termePrefere ?? a.autorite?.nomCanonique ?? a.litteraire?.libelle ?? `#${a.id}`
}

export function trierAnnotations(annotations: readonly AnnotationSemantique[]): AnnotationSemantique[] {
  return [...annotations].sort((a, b) =>
    Number(!estActive(a)) - Number(!estActive(b))
    || (RANG_IMPORTANCE[a.importance ?? ''] ?? 9) - (RANG_IMPORTANCE[b.importance ?? ''] ?? 9)
    || libelleAnnotation(a).localeCompare(libelleAnnotation(b), 'fr'),
  )
}

export type ComptesSemantiques = Record<TypeAnnotation, number>

/** Combien d'annotations ACTIVES de chaque type recoupent le chapitre. */
export function comptesDuChapitre(annotations: readonly AnnotationSemantique[]): ComptesSemantiques {
  const comptes: ComptesSemantiques = { concept: 0, autorite: 0, litteraire: 0 }
  for (const a of annotations) if (estActive(a)) comptes[a.type] += 1
  return comptes
}

/** Les créneaux du chapitre que couvre au moins une annotation active, dans l'ordre du canon. */
export function versetsAnnotes(donnees: SemantiqueDuChapitre): string[] {
  const actives = donnees.annotations.filter(estActive)
  return donnees.versets.filter(v => actives.some(a => porteeCouvre(a.portee, v)))
}

/** Les arbitrages ouverts qui touchent un créneau, ou tout le chapitre sans créneau. */
export function arbitragesDuVerset(arbitrages: readonly ArbitrageOuvert[], creneau: string | null): ArbitrageOuvert[] {
  if (creneau === null) return [...arbitrages]
  return arbitrages.filter(a => a.portee !== null && porteeCouvre(a.portee, creneau))
}

/** Le voisin annoté d'un créneau, avant ou après ; `null` au bord. */
export function voisinAnnote(annotes: readonly string[], creneau: string | null, sens: -1 | 1): string | null {
  if (annotes.length === 0) return null
  if (creneau === null) return sens === 1 ? annotes[0] : annotes[annotes.length - 1]
  const v = pointDuCreneau(creneau)
  if (!v) return null
  const candidats = annotes.filter(id => {
    const p = pointDuCreneau(id)
    return p !== null && Math.sign(comparer(p, v)) === sens
  })
  return (sens === 1 ? candidats[0] : candidats[candidats.length - 1]) ?? null
}
