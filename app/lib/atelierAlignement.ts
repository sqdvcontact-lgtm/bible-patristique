/**
 * L'ATELIER D'ALIGNEMENT — la règle, en code.
 *
 * Doctrine : charte `parametres.charte_ia`, § 12.2, « Le grain de l'empan ». La règle 2
 * y dit qu'à défaut de paragraphage on pose les frontières À LA MAIN : ce module est ce
 * qui le permet. Il ne lit rien et n'écrit rien. Il dit :
 *
 *   - ce que chaque groupe d'un ensemble pèse, et s'il est à revoir (la MESURE, prise à
 *     `grainAlignement.ts`, jamais réécrite) ;
 *   - comment un groupe se COUPE à une jonction de segments, et comment deux groupes
 *     voisins se FUSIONNENT, sous forme d'un plan que la base applique d'un seul tenant
 *     (`atelier_alignement_couper`, `atelier_alignement_fusionner`).
 *
 * ⛔ La mesure du contrôle et celle de l'atelier sont la MÊME : `empansDesMesures` passe
 * par `mesurerEmpans`. Une seconde écriture divergerait au premier réglage, et l'atelier
 * désignerait d'autres groupes que le contrôle.
 */
import {
  LIMITE_EMPAN,
  REPERE_EMPAN,
  cleDeParagraphe,
  longueurUnicode,
  mesurerEmpans,
  type EmpanMesure,
  type SegmentTraduit,
} from './grainAlignement'
import { memeLangue } from './langues'

export type Role = 'reference' | 'aligned'
export type Cardinalite = '1:1' | '1:n' | 'n:1' | 'n:m' | '1:0' | '0:1'

/**
 * La cardinalité d'un groupe, `reference:aligned`, comme la table la déclare.
 * Un groupe sans aucun membre n'en a pas : c'est un groupe qui ne doit pas exister.
 */
export function cardinalite(nReference: number, nAligned: number): Cardinalite | null {
  if (nReference <= 0 && nAligned <= 0) return null
  if (nReference <= 0) return '0:1'
  if (nAligned <= 0) return '1:0'
  if (nReference === 1 && nAligned === 1) return '1:1'
  if (nReference === 1) return '1:n'
  if (nAligned === 1) return 'n:1'
  return 'n:m'
}

// ── Quelle colonne est la traduction ────────────────────────────────────────────

export type EnsembleLu = { referenceTextId: string; alignedTextId: string }

/**
 * Le rôle que joue le texte TRADUIT dans l'ensemble — c'est sur lui que la règle 1
 * porte, le paragraphe de l'édition traduite faisant loi.
 *
 * ⚠️ Un ensemble peut confronter deux traductions (Boèce, Mirandol et Ceriziers) ou
 * placer l'original en `reference` (la Somme met le français en tête). La langue
 * décide ; à défaut, la référence.
 */
export function roleDuTraduit(
  ensemble: EnsembleLu,
  langueDe: (idTexte: string) => string | null | undefined,
  langueOriginale: string | null | undefined,
): Role {
  const refOriginal = memeLangue(langueDe(ensemble.referenceTextId), langueOriginale)
  const aliOriginal = memeLangue(langueDe(ensemble.alignedTextId), langueOriginale)
  if (refOriginal && !aliOriginal) return 'aligned'
  return 'reference'
}

/**
 * Les textes dont le CONTRÔLE mesure le grain : ceux qui ne sont pas dans la langue
 * originale de l'œuvre. Deux traductions confrontées se mesurent toutes les deux.
 */
export function colonnesTraduites(
  ensemble: EnsembleLu,
  langueDe: (idTexte: string) => string | null | undefined,
  langueOriginale: string | null | undefined,
): string[] {
  const ids = [ensemble.referenceTextId, ensemble.alignedTextId]
    .filter(id => !memeLangue(langueDe(id), langueOriginale))
  return ids.length > 0 ? ids : [ensemble.referenceTextId]
}

// ── La mesure, lue dans la base ─────────────────────────────────────────────────

/** Une ligne de `atelier_alignement_mesures(ensemble, texte)`, dans l'ordre de lecture. */
export type LigneMesure = {
  segmentKey: string
  alignmentId: string
  book: number
  division: number
  groupOrder: number
  refNiv1: string | null
  refNiv2: string | null
  refNiv3: string | null
  paragraphe: number | null
  longueur: number
}

const texteOuNul = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const entierOuNul = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

/**
 * Relit le jsonb que rend la fonction de mesure : un tableau de tableaux
 * `[segment_key, alignment_id, book, division, group_order, niv1, niv2, niv3,
 * paragraphe, longueur]`. Une ligne mal formée est écartée, jamais devinée.
 */
export function lireMesures(brut: unknown): LigneMesure[] {
  if (!Array.isArray(brut)) return []
  const lignes: LigneMesure[] = []
  for (const l of brut) {
    if (!Array.isArray(l) || l.length < 10) continue
    const [cle, groupe, book, division, ordre, n1, n2, n3, paragraphe, longueur] = l
    if (typeof cle !== 'string' || typeof groupe !== 'string') continue
    const b = entierOuNul(book)
    const d = entierOuNul(division)
    const o = entierOuNul(ordre)
    if (b === null || d === null || o === null) continue
    lignes.push({
      segmentKey: cle,
      alignmentId: groupe,
      book: b,
      division: d,
      groupOrder: o,
      refNiv1: texteOuNul(n1),
      refNiv2: texteOuNul(n2),
      refNiv3: texteOuNul(n3),
      paragraphe: entierOuNul(paragraphe),
      longueur: entierOuNul(longueur) ?? 0,
    })
  }
  return lignes
}

/** Les empans d'un ensemble, mesurés par la fonction du contrôle, et par elle seule. */
export function empansDesMesures(lignes: readonly LigneMesure[]): EmpanMesure[] {
  const segments: SegmentTraduit[] = lignes.map(l => ({
    segmentKey: l.segmentKey,
    refNiv1: l.refNiv1,
    refNiv2: l.refNiv2,
    refNiv3: l.refNiv3,
    paragraphe: l.paragraphe,
    longueur: l.longueur,
  }))
  return mesurerEmpans(segments, new Map(lignes.map(l => [l.segmentKey, l.alignmentId])))
}

/** Un groupe est À REVOIR s'il enjambe un paragraphe traduit ou passe le repère. */
export function estARevoir(e: EmpanMesure): boolean {
  return e.aCheval || e.signes > REPERE_EMPAN
}

/** Le degré d'un empan, du plus grave au plus doux : ce qu'on écrit à côté de lui. */
export function degreDeLEmpan(e: Pick<EmpanMesure, 'aCheval' | 'signes'>): 'a-cheval' | 'limite' | 'repere' | null {
  if (e.aCheval) return 'a-cheval'
  if (e.signes > LIMITE_EMPAN) return 'limite'
  if (e.signes > REPERE_EMPAN) return 'repere'
  return null
}

// ── Les divisions ───────────────────────────────────────────────────────────────

export type DivisionMesuree = {
  book: number
  division: number
  /** Le titre du premier segment traduit de la division, tel que la donnée le porte. */
  libelle: string
  groupes: number
  aRevoir: number
  aCheval: number
  auDelaLimite: number
  auDessusDuRepere: number
  maxSignes: number
}

export const cleDivision = (book: number, division: number) => `${book}-${division}`

export function lireCleDivision(valeur: string | null | undefined): { book: number; division: number } | null {
  const m = /^(\d+)-(\d+)$/.exec(valeur ?? '')
  if (!m) return null
  return { book: Number(m[1]), division: Number(m[2]) }
}

/**
 * Les divisions d'un ensemble, dans l'ordre de lecture du texte traduit, chacune avec
 * le compte de ses groupes à revoir. Un groupe se range dans la division qui le porte
 * en base (`book`, `canonical_division_order`), pas dans celle de son premier segment.
 */
export function divisionsMesurees(
  lignes: readonly LigneMesure[],
  empans: readonly EmpanMesure[],
): DivisionMesuree[] {
  const empanDe = new Map(empans.map(e => [e.alignmentId, e]))
  const divisions = new Map<string, DivisionMesuree & { vus: Set<string> }>()
  for (const l of lignes) {
    const cle = cleDivision(l.book, l.division)
    let d = divisions.get(cle)
    if (!d) {
      const libelle = [l.refNiv1, l.refNiv2].filter(Boolean).join(' · ')
        || `Livre ${l.book}, division ${l.division}`
      d = {
        book: l.book, division: l.division, libelle,
        groupes: 0, aRevoir: 0, aCheval: 0, auDelaLimite: 0, auDessusDuRepere: 0, maxSignes: 0,
        vus: new Set(),
      }
      divisions.set(cle, d)
    }
    if (d.vus.has(l.alignmentId)) continue
    d.vus.add(l.alignmentId)
    const e = empanDe.get(l.alignmentId)
    if (!e) continue
    d.groupes += 1
    if (estARevoir(e)) d.aRevoir += 1
    if (e.aCheval) d.aCheval += 1
    if (e.signes > LIMITE_EMPAN) d.auDelaLimite += 1
    if (e.signes > REPERE_EMPAN) d.auDessusDuRepere += 1
    d.maxSignes = Math.max(d.maxSignes, e.signes)
  }
  return [...divisions.values()].map(({ vus: _vus, ...d }) => d)
}

// ── Les groupes d'une division, tels que l'atelier les montre ──────────────────

export type SegmentAtelier = {
  cle: string
  /** `segment_numero` : l'ordre de lecture du texte. */
  numero: number
  texte: string
  refNiv1: string | null
  refNiv2: string | null
  refNiv3: string | null
  paragraphe: number | null
}

export type GroupeAtelier = {
  alignmentId: string
  groupOrder: number
  cardinality: string | null
  status: string | null
  traduits: SegmentAtelier[]
  originaux: SegmentAtelier[]
}

export type LigneGroupe = { alignment_id: string; group_order: number; cardinality: string | null; status: string | null }
export type LigneMembre = { alignment_id: string; role: string; segment_key: string }

const parNumero = (a: SegmentAtelier, b: SegmentAtelier) => a.numero - b.numero || a.cle.localeCompare(b.cle)

/**
 * Compose les groupes d'une division : chacun avec ses segments traduits et originaux,
 * rangés dans l'ORDRE DE LECTURE de leur texte (`segment_numero`), jamais dans l'ordre
 * de `member_order`, qui n'a pas à le suivre.
 */
export function composerGroupes(params: {
  groupes: readonly LigneGroupe[]
  membres: readonly LigneMembre[]
  roleTraduit: Role
  segmentsTraduits: ReadonlyMap<string, SegmentAtelier>
  segmentsOriginaux: ReadonlyMap<string, SegmentAtelier>
}): GroupeAtelier[] {
  const { groupes, membres, roleTraduit, segmentsTraduits, segmentsOriginaux } = params
  const parGroupe = new Map<string, GroupeAtelier>()
  for (const g of [...groupes].sort((a, b) => a.group_order - b.group_order)) {
    parGroupe.set(g.alignment_id, {
      alignmentId: g.alignment_id,
      groupOrder: g.group_order,
      cardinality: g.cardinality,
      status: g.status,
      traduits: [],
      originaux: [],
    })
  }
  for (const m of membres) {
    const g = parGroupe.get(m.alignment_id)
    if (!g) continue
    if (m.role === roleTraduit) {
      const s = segmentsTraduits.get(m.segment_key)
      if (s) g.traduits.push(s)
    } else {
      const s = segmentsOriginaux.get(m.segment_key)
      if (s) g.originaux.push(s)
    }
  }
  for (const g of parGroupe.values()) {
    g.traduits.sort(parNumero)
    g.originaux.sort(parNumero)
  }
  return [...parGroupe.values()]
}

/** Les signes de la colonne traduite d'un groupe, en points de code. */
export function signesTraduits(g: Pick<GroupeAtelier, 'traduits'>): number {
  return g.traduits.reduce((n, s) => n + longueurUnicode(s.texte), 0)
}

const commeSegmentTraduit = (s: SegmentAtelier): SegmentTraduit => ({
  segmentKey: s.cle, refNiv1: s.refNiv1, refNiv2: s.refNiv2, refNiv3: s.refNiv3,
  paragraphe: s.paragraphe, longueur: longueurUnicode(s.texte),
})

/** Le même empan que le contrôle, pris sur un groupe composé. */
export function empanDuGroupe(g: GroupeAtelier): EmpanMesure | null {
  const [e] = mesurerEmpans(
    g.traduits.map(commeSegmentTraduit),
    new Map(g.traduits.map(s => [s.cle, g.alignmentId])),
  )
  return e ?? null
}

/**
 * Pour chaque JONCTION du texte traduit d'un groupe (entre le segment i et le i + 1),
 * dit si elle tombe sur une frontière de paragraphe. C'est là que la règle 1 veut une
 * coupe. ⚠️ Un paragraphe inconnu ne fait pas frontière : on ne sait rien.
 */
export function jonctionsDeParagraphe(traduits: readonly SegmentAtelier[]): boolean[] {
  const sortie: boolean[] = []
  for (let i = 0; i + 1 < traduits.length; i++) {
    const a = cleDeParagraphe(commeSegmentTraduit(traduits[i]))
    const b = cleDeParagraphe(commeSegmentTraduit(traduits[i + 1]))
    sortie.push(a !== null && b !== null && a !== b)
  }
  return sortie
}

/**
 * La jonction de l'ORIGINAL qui répond le mieux à une coupe du texte traduit après
 * `k` segments : celle dont la part de signes cumulés est la plus proche. Ce n'est
 * qu'une PROPOSITION — une coupe se place au sens, et l'atelier la laisse déplacer.
 */
export function coupeOriginaleProposee(g: Pick<GroupeAtelier, 'traduits' | 'originaux'>, k: number): number {
  const n = g.originaux.length
  if (n === 0) return 0
  const tot = g.traduits.reduce((s, x) => s + longueurUnicode(x.texte), 0)
  if (tot === 0) return Math.round((k / Math.max(1, g.traduits.length)) * n)
  let cum = 0
  for (let i = 0; i < Math.min(k, g.traduits.length); i++) cum += longueurUnicode(g.traduits[i].texte)
  const part = cum / tot
  const totO = g.originaux.reduce((s, x) => s + longueurUnicode(x.texte), 0)
  let meilleur = 0
  let ecart = Infinity
  let cumO = 0
  for (let j = 0; j <= n; j++) {
    const partO = totO === 0 ? j / n : cumO / totO
    const d = Math.abs(partO - part)
    if (d < ecart) { ecart = d; meilleur = j }
    if (j < n) cumO += longueurUnicode(g.originaux[j].texte)
  }
  return meilleur
}

// ── Couper, fusionner ───────────────────────────────────────────────────────────

/** Un identifiant libre, dérivé de celui du groupe qu'on coupe : `X-C1`, `X-C2`… */
export function nouvelIdentifiant(alignmentId: string, pris: ReadonlySet<string>): string {
  for (let n = 1; ; n++) {
    const candidat = `${alignmentId}-C${n}`
    if (!pris.has(candidat)) return candidat
  }
}

export type PlanCoupe = {
  groupe: string
  nouveau: string
  referenceGarde: string[]
  alignedGarde: string[]
  referencePart: string[]
  alignedPart: string[]
  cardinaliteGarde: Cardinalite
  cardinalitePart: Cardinalite
}

export type Resultat<T> = { ok: true; plan: T } | { ok: false; raison: string }

const cles = (s: readonly SegmentAtelier[]) => s.map(x => x.cle)

/**
 * Le plan d'une coupe : le groupe garde les `k` premiers segments traduits et les `j`
 * premiers originaux, un groupe neuf prend le reste. `k` et `j` sont des JONCTIONS,
 * comptées de 0 (avant le premier) à la longueur (après le dernier).
 *
 * ⛔ Chaque moitié garde au moins un membre. ⚠️ Une moitié peut n'avoir qu'une seule
 * colonne (`1:0`, `0:1`) : c'est ce que l'édition fait d'une addition du traducteur.
 */
export function planDeCoupe(params: {
  groupe: GroupeAtelier
  k: number
  j: number
  roleTraduit: Role
  pris: ReadonlySet<string>
}): Resultat<PlanCoupe> {
  const { groupe: g, k, j, roleTraduit, pris } = params
  const nT = g.traduits.length
  const nO = g.originaux.length
  if (!Number.isInteger(k) || k < 0 || k > nT) return { ok: false, raison: 'Jonction traduite hors du groupe.' }
  if (!Number.isInteger(j) || j < 0 || j > nO) return { ok: false, raison: 'Jonction originale hors du groupe.' }
  if (k + j === 0) return { ok: false, raison: 'Le groupe coupé resterait vide.' }
  if (nT - k + (nO - j) === 0) return { ok: false, raison: 'Le groupe neuf serait vide.' }
  const tGarde = cles(g.traduits.slice(0, k))
  const tPart = cles(g.traduits.slice(k))
  const oGarde = cles(g.originaux.slice(0, j))
  const oPart = cles(g.originaux.slice(j))
  const [referenceGarde, alignedGarde, referencePart, alignedPart] =
    roleTraduit === 'reference' ? [tGarde, oGarde, tPart, oPart] : [oGarde, tGarde, oPart, tPart]
  const cardinaliteGarde = cardinalite(referenceGarde.length, alignedGarde.length)
  const cardinalitePart = cardinalite(referencePart.length, alignedPart.length)
  if (!cardinaliteGarde || !cardinalitePart) return { ok: false, raison: 'Une moitié serait vide.' }
  return {
    ok: true,
    plan: {
      groupe: g.alignmentId,
      nouveau: nouvelIdentifiant(g.alignmentId, pris),
      referenceGarde, alignedGarde, referencePart, alignedPart,
      cardinaliteGarde, cardinalitePart,
    },
  }
}

export type PlanFusion = {
  groupe: string
  absorbe: string
  reference: string[]
  aligned: string[]
  cardinalite: Cardinalite
}

/**
 * Le plan d'une fusion : `premier` absorbe `second`, qui doit le SUIVRE dans la
 * division. Les membres se rangent dans l'ordre de lecture de leur texte. La base
 * revérifie le voisinage : ce plan n'en est que la proposition.
 */
export function planDeFusion(params: {
  premier: GroupeAtelier
  second: GroupeAtelier
  roleTraduit: Role
}): Resultat<PlanFusion> {
  const { premier, second, roleTraduit } = params
  if (premier.alignmentId === second.alignmentId) return { ok: false, raison: 'Un groupe ne se fusionne pas avec lui-même.' }
  if (second.groupOrder <= premier.groupOrder) return { ok: false, raison: 'Le second groupe doit suivre le premier.' }
  const traduits = cles([...premier.traduits, ...second.traduits].sort(parNumero))
  const originaux = cles([...premier.originaux, ...second.originaux].sort(parNumero))
  const [reference, aligned] = roleTraduit === 'reference' ? [traduits, originaux] : [originaux, traduits]
  const c = cardinalite(reference.length, aligned.length)
  if (!c) return { ok: false, raison: 'Les deux groupes sont vides.' }
  return { ok: true, plan: { groupe: premier.alignmentId, absorbe: second.alignmentId, reference, aligned, cardinalite: c } }
}

/** Ce que les membres d'un groupe étaient, tel que l'écran les a montrés : la base refuse
 *  tout plan bâti sur un état qui a changé depuis, et la route le compare d'abord. */
export function memesMembres(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((x, i) => x === sb[i])
}
