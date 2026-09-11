/**
 * LE PIPELINE DES SEGMENTS — de la ligne brute au segment qu'on lit.
 *
 * ⛔ IL N'Y EN A QU'UN, et c'est tout l'objet de ce module. Le chemin « segments bruts →
 * segments affichables » était écrit DEUX FOIS : dans `page.tsx` pour le premier rendu,
 * dans `chargerNiv1Data` d'`OeuvreClient` pour chaque changement de division. Cinq
 * fonctions y étaient recopiées mot pour mot, et trois autres refaites autrement.
 *
 * ⚠️ ELLES AVAIENT DÉJÀ DIVERGÉ, et c'est ce qui a imposé cette extraction. Le repli
 * `v.ref ?? v.id_verset` — posé le jour où une ligne sans référence avait fermé une page —
 * n'existait que côté serveur : le premier écran était juste, et le rechargement d'une
 * division l'aurait défait. La numérotation locale, elle, remet son compteur à zéro à
 * chaque `ref_niv1` d'un côté et jamais de l'autre.
 *
 * ⛔ Le module est PUR : ni React, ni Supabase, ni `window`. C'est ce qui le rend testable,
 * et c'est la seule garantie que les deux surfaces feront la même chose — un test ne peut
 * pas éprouver ce qui vit dans un composant de 4 400 lignes.
 *
 * ⚠️ Ce qui reste À CHAQUE SURFACE, et qui ne peut pas venir ici : le CHARGEMENT (le
 * serveur lit par `Promise.all`, le client par lots successifs), la projection bilingue
 * (le serveur la reçoit toute faite, le client la rattache après coup), et l'apparat, dont
 * seul le serveur tire les notices bibliographiques.
 */
import { ABREV_FR } from '@/app/lib/bible'
import { mesureAlinea, marqueStrophe } from '@/app/lib/compositionVers'
import { numeroVersetLisible } from '@/app/lib/compositionVersets'
import { parseNotes } from '@/app/lib/notes'
import { sectionDApparat, type SectionApparat } from '@/app/lib/oeuvreSelects'
import { identifiantOuvrage } from '@/app/lib/referenceBibliographique'
import type { ChampTitre, GroupeData, NoteAffichee, SegData } from './oeuvreTypes'

/** Les huit champs de titre, dans l'ordre où on les compose. */
const CHAMPS_TITRE: readonly ChampTitre[] = [
  'niv1', 'niv1_texte', 'niv2', 'niv2_texte', 'niv3', 'niv3_texte', 'niv4', 'niv4_texte',
]

/**
 * Pose les appels de note d'un CHAMP DE TITRE.
 *
 * ⛔ Elle reçoit les clés de TOUS les segments du groupe, non celle du premier : dans les
 * imports à notes structurées, l'ancre d'un chapeau tombe quelques segments plus loin —
 * l'appel du chapeau du « Premier discours » est ancré au huitième segment des Discours
 * sur la Genèse. C'est déjà ce que fait `notesDuTitre` pour le CONTENU de la note ; il
 * fallait le faire aussi pour son APPEL.
 */
export type ProjeterTitre = (texte: string, cles: readonly string[], champ: ChampTitre) => string

/**
 * Une ligne de `segments` telle que `SELECT_SEGMENT` la DEMANDE.
 *
 * ⚠️ Le type décrit la requête, non la table : une colonne retirée du `select` casse alors
 * à la compilation (charte, « Typer une lecture Supabase »). Les quatre dernières entrées
 * ne sont pas des colonnes mais des champs de `segment_metadata`, que PostgREST rend en
 * TEXTE quel que soit leur type en base.
 */
export type SegmentBrut = {
  id: number
  id_texte: string
  segment_key: string | null
  segment_numero: number
  segment_texte: string
  ref_niv1: string | null; ref_niv2: string | null; ref_niv3: string | null
  ref_niv4: string | null; ref_niv5: string | null
  ref_niv1_texte: string | null; ref_niv2_texte: string | null
  ref_niv3_texte: string | null; ref_niv4_texte: string | null
  lien_1: string | null; lien_2: string | null; lien_3: string | null; lien_4: string | null
  nature: string | null
  paragraphe: number | null; rang: number | null; texte_original: string | null
  espace_textuel: string | null; join_before: string | null
  alinea: string | null; strophe_avant: string | null; numero_verset: string | null
  forme: string | null
  cle_original: string | null
  ouvrage_id: string | null
  /** `segment_metadata.presentation.style` : le style de composition que la donnée déclare. */
  style_presentation: string | null
  /**
   * L'ancienne colonne de notes libres, encore lue en REPLI des notes structurées.
   * ⚠️ Du TEXTE, non du JSON : `parseNotes` en tire les appels par expression régulière.
   */
  notes?: string | null
}

/**
 * Les quatre natures de lien biblique, DANS L'ORDRE DES COLONNES `lien_1` à `lien_4`.
 *
 * ⚠️ Un même verset peut être visé par plusieurs liens du même segment — chez un
 * commentateur, il est cité PUIS commenté, et l'arbitrage n°17 rend ce cumul obligatoire.
 * Il ne paraît qu'une fois dans le volet, en portant ses deux natures.
 */
export const NATURE_LIEN = ['citation', 'reprise', 'doctrine', 'écho'] as const

export type VersetVise = { id: string; natures: string[] }

/** Les versets qu'un segment vise, dédoublonnés, chacun avec les natures rencontrées. */
export function extraireVersetsAvecNature(s: Pick<SegmentBrut, 'lien_1' | 'lien_2' | 'lien_3' | 'lien_4'>): VersetVise[] {
  const ordre: string[] = []
  const natures = new Map<string, string[]>()
  ;[s.lien_1, s.lien_2, s.lien_3, s.lien_4].forEach((col, i) => {
    String(col ?? '').split(';').map(v => v.trim()).filter(Boolean).forEach(vid => {
      if (!natures.has(vid)) { natures.set(vid, []); ordre.push(vid) }
      const n = NATURE_LIEN[i]
      if (!natures.get(vid)!.includes(n)) natures.get(vid)!.push(n)
    })
  })
  return ordre.map(id => ({ id, natures: natures.get(id)! }))
}

/** Les seuls identifiants, sans les natures. */
export function extraireVersets(s: Pick<SegmentBrut, 'lien_1' | 'lien_2' | 'lien_3' | 'lien_4'>): string[] {
  return extraireVersetsAvecNature(s).map(v => v.id)
}

/**
 * Ce segment a-t-il quelque chose à montrer ?
 *
 * ⚠️ Un segment SANS TEXTE reste affichable s'il porte un lien biblique : le volet de
 * droite a alors de quoi répondre. C'est un séparateur, ou une rubrique vraiment vide, qui
 * ne se rend pas.
 */
export function segmentAffichable(s: Pick<SegmentBrut, 'nature' | 'segment_texte' | 'lien_1' | 'lien_2' | 'lien_3' | 'lien_4'>): boolean {
  if (s.nature === 'separateur') return false
  return Boolean((s.segment_texte ?? '').trim() || extraireVersets(s).length > 0)
}

/** Un segment hissé en tête de division, hors des groupes et de la pagination. */
export function estIntroduction(s: Pick<SegmentBrut, 'nature'>): boolean {
  return s.nature === 'introduction'
}

/** Ce qui entre dans les groupes et dans la numérotation : ni séparateur, ni introduction. */
function entreDansLeCorps(s: SegmentBrut): boolean {
  return segmentAffichable(s) && !estIntroduction(s)
}

/**
 * Les groupes de rendu : une suite de segments qui partagent leurs quatre niveaux.
 *
 * ⚠️ Le préfixe de l'ancre est passé par l'appelant (`g` pour le corps, `a` pour
 * l'apparat) : les deux surfaces posent des ancres qui ne doivent pas se heurter dans le
 * même document.
 *
 * ⛔ `avecSection` sert l'APPARAT, et la SECTION y coupe le groupe comme le ferait un
 * niveau : ses deux tranches — l'auteur, puis l'éditeur — sont voisines dans la liste, et
 * deux pièces de mains différentes qui porteraient le même `ref_niv1` ne feraient qu'un
 * groupe, sous un en-tête qui mentirait. ⚠️ C'est un AXE, non deux appels : les deux
 * surfaces groupaient l'apparat de deux façons — le serveur par deux `grouper` successifs
 * à ancres continues, le client par une passe qui comparait la section — et deux écritures
 * du même découpage ne restent d'accord que par accident.
 */
export function grouper(
  segments: readonly SegmentBrut[],
  prefixeAncre = 'g',
  options: { avecSection?: boolean; projeterTitre?: ProjeterTitre } = {},
): GroupeData[] {
  type EnCours = Omit<GroupeData, 'anchor'> & { niv1_texte: string; niv2_texte: string; niv3_texte: string; niv4_texte: string }
  const groupes: EnCours[] = []
  // Les clés de segment de chaque groupe, dans l'ordre : c'est là que se cherchent les
  // ancres d'un titre.
  const clesParGroupe: string[][] = []
  let clesCourantes: string[] = []
  let cur: EnCours = {
    niv1: '', niv2: '', niv3: '', niv4: '',
    niv1_texte: '', niv2_texte: '', niv3_texte: '', niv4_texte: '',
    itemIds: [],
  }
  let sectionCourante: SectionApparat | undefined
  for (const s of segments) {
    if (!entreDansLeCorps(s)) continue
    const n1 = s.ref_niv1 || '', n2 = s.ref_niv2 || '', n3 = s.ref_niv3 || '', n4 = s.ref_niv4 || ''
    const section = options.avecSection ? sectionDApparat(s) : undefined
    if (n1 !== cur.niv1 || n2 !== cur.niv2 || n3 !== cur.niv3 || n4 !== cur.niv4 || section !== sectionCourante) {
      if (cur.itemIds.length > 0) { groupes.push({ ...cur }); clesParGroupe.push(clesCourantes) }
      sectionCourante = section
      clesCourantes = s.segment_key ? [s.segment_key] : []
      cur = {
        niv1: n1, niv2: n2, niv3: n3, niv4: n4,
        niv1_texte: s.ref_niv1_texte || '', niv2_texte: s.ref_niv2_texte || '',
        niv3_texte: s.ref_niv3_texte || '', niv4_texte: s.ref_niv4_texte || '',
        itemIds: [s.id],
        ...(section ? { section } : {}),
      }
    } else {
      cur.itemIds.push(s.id)
      if (s.segment_key) clesCourantes.push(s.segment_key)
    }
  }
  if (cur.itemIds.length > 0) { groupes.push({ ...cur }); clesParGroupe.push(clesCourantes) }
  return groupes.map((g, i) => {
    const groupe: GroupeData = { ...g, anchor: `${prefixeAncre}${i}` }
    if (!options.projeterTitre) return groupe
    // ⛔ La projection se pose À CÔTÉ du titre, jamais à sa place : `niv1` est une
    // identité, et un « [[12]] » glissé dedans romprait la navigation.
    const projetes: Partial<Record<ChampTitre, string>> = {}
    for (const champ of CHAMPS_TITRE) {
      const brut = groupe[champ] ?? ''
      if (!brut) continue
      const pose = options.projeterTitre(brut, clesParGroupe[i] ?? [], champ)
      if (pose !== brut) projetes[champ] = pose
    }
    return Object.keys(projetes).length > 0 ? { ...groupe, titresAffichage: projetes } : groupe
  })
}

/**
 * L'ordinal d'un segment DANS SA DIVISION.
 *
 * ⛔ Le compteur repart de zéro à chaque `ref_niv1` : c'est ce qui fait qu'un « § 12 » veut
 * dire le douzième paragraphe du livre qu'on lit, et non le douzième de l'ouvrage. Le
 * client comptait d'un bout à l'autre de ce qu'il avait chargé — sans effet tant qu'il ne
 * charge qu'une division, faux dès qu'il en charge deux.
 */
export function numerotationLocale(segments: readonly SegmentBrut[]): Map<number, number> {
  const ordinaux = new Map<number, number>()
  let compteur = 0
  let niveauCourant = ''
  for (const s of segments) {
    if (!entreDansLeCorps(s)) continue
    const n1 = s.ref_niv1 || ''
    if (n1 !== niveauCourant) { compteur = 0; niveauCourant = n1 }
    ordinaux.set(s.id, ++compteur)
  }
  return ordinaux
}

export type DetailRefBiblique = { label: string; livre: string; chapitre: string; verset: string }

/**
 * « JHN.4.1 » → « Jean 4, 1 ».
 *
 * ⛔ L'APPELANT DOIT AVOIR UN REPLI : cette fonction appelle `trim()` sur son argument, et
 * une ligne de `versets_lecture` sans `ref` a déjà fermé une page. Passer
 * `v.ref ?? v.id_verset` — à défaut de référence, l'identifiant canonique sert d'étiquette.
 */
export function detailsRefBiblique(ref: string): DetailRefBiblique {
  const p = ref.trim().split(' ')
  if (p.length < 2) return { label: ref, livre: '', chapitre: '', verset: '' }
  const cv = p[1].split(':')
  const label = cv[1] ? `${ABREV_FR[p[0]] ?? p[0]} ${cv[0]}, ${cv[1]}` : `${ABREV_FR[p[0]] ?? p[0]} ${cv[0]}`
  return { label, livre: p[0], chapitre: cv[0] || '', verset: cv[1] || '' }
}

/** Le texte d'un verset cité, par code de traduction. */
export type VersetCite = DetailRefBiblique & { textes: Record<string, string> }
export type VersetsCites = Record<string, VersetCite>

/**
 * Une ligne de `versets_lecture` : les colonnes de traduction sont nommées à l'exécution
 * (TR0001, TR0002…), d'où l'index de chaîne.
 */
export type LigneVersetCite = { id_verset: string; ref: string | null; [colonne: string]: string | null }

/**
 * Range les lignes de `versets_lecture` par identifiant, prêtes à l'affichage.
 *
 * ⛔ Le repli sur `id_verset` est ICI, une fois pour toutes : c'est le point où la
 * divergence entre les deux surfaces avait vécu.
 */
export function indexerVersetsCites(lignes: readonly LigneVersetCite[], codesTraductions: readonly string[]): VersetsCites {
  const table: VersetsCites = {}
  for (const v of lignes) {
    const textes = Object.fromEntries(codesTraductions.map(code => [code, v[code] || '']))
    table[v.id_verset] = { ...detailsRefBiblique(v.ref ?? v.id_verset), textes }
  }
  return table
}

/** Les versets d'un segment, avec leur texte quand on l'a chargé. */
export function versetsDuSegment(s: SegmentBrut, cites: VersetsCites) {
  return extraireVersetsAvecNature(s).map(({ id, natures }) => ({
    id, natures,
    ...(cites[id] || { label: id, livre: '', chapitre: '', verset: '', textes: {} }),
  }))
}

/** Ce dont la projection a besoin et qu'elle ne peut pas déduire d'un segment. */
export type ContexteProjection = {
  /** Les ordinaux locaux (`numerotationLocale`). */
  ordinaux: Map<number, number>
  /** Les versets cités, déjà chargés (`indexerVersetsCites`). */
  versetsCites: VersetsCites
  /** Les notes structurées du texte lu, par clé de segment. */
  notes: Record<string, Record<string, NoteAffichee>>
  /** Celles du texte en langue originale, par clé d'origine. */
  notesOriginal: Record<string, Record<string, NoteAffichee>>
  /** Pose les appels de note dans un texte, sans faillir. */
  projeterAppels: (texte: string, cle: string | null) => string
  /** Pose les appels dans le texte ORIGINAL, dont les ancres sont indexées autrement. */
  projeterAppelsOriginal: (texte: string, cle: string | null) => string
  /**
   * Pose les appels dans un CHAMP DE TITRE. ⛔ Sans elle, une note qui vise
   * `ref_niv1_texte`, `ref_niv2` ou un autre champ de titre n'a AUCUN appel : la
   * projection ne connaissait que `segment_texte`, et laissait le reste de côté sans un
   * mot (34 ancres du corpus, mesuré le 9 septembre 2026).
   */
  projeterTitre?: ProjeterTitre
  /** Le groupe d'alignement d'un segment, quand la surface le connaît déjà. */
  groupeOriginal?: (cle: string | null) => string | null
  /** L'apparat SEUL porte des notices bibliographiques. */
  avecOuvrage?: boolean
  /**
   * ⛔ L'APPARAT N'A PAS DE VOLET BIBLIQUE, et ce n'est pas la donnée qui le dit : aucun de
   * ses 2 195 segments ne porte de lien au 9 septembre 2026, mais un lien posé demain sur
   * l'un d'eux y ferait paraître un volet que personne n'a décidé d'ouvrir. La surface le
   * déclare donc, au lieu de s'en remettre à ce que la table contient.
   */
  sansVersets?: boolean
}

/**
 * Un segment brut devient le segment qu'on lit.
 *
 * ⚠️ `numero` retombe sur `segment_numero` pour une INTRODUCTION et pour tout segment que
 * la numérotation locale ne connaît pas : elle n'indexe que le corps.
 */
export function projeterSegment(s: SegmentBrut, ctx: ContexteProjection): SegData {
  const projete: SegData = {
    id: s.id,
    idTexte: s.id_texte,
    segmentKey: s.segment_key,
    numero: ctx.ordinaux.get(s.id) || s.segment_numero,
    numeroSource: s.segment_numero,
    texte: s.segment_texte,
    texteAffichage: ctx.projeterAppels(s.segment_texte, s.segment_key),
    versets: ctx.sansVersets ? [] : versetsDuSegment(s, ctx.versetsCites),
    notes: (s.segment_key && ctx.notes[s.segment_key]) || parseNotes(s.notes),
    paragraphe: s.paragraphe,
    rang: s.rang,
    texteOriginal: s.texte_original,
    cleOriginal: s.cle_original,
    texteOriginalAffichage: s.texte_original
      ? ctx.projeterAppelsOriginal(s.texte_original, s.cle_original)
      : undefined,
    notesOriginal: (s.cle_original && ctx.notesOriginal[s.cle_original]) || undefined,
    groupeOriginal: ctx.groupeOriginal ? ctx.groupeOriginal(s.segment_key) : null,
    nature: s.nature,
    espaceTextuel: s.espace_textuel,
    joinBefore: s.join_before,
    alinea: mesureAlinea(s.alinea),
    stropheAvant: marqueStrophe(s.strophe_avant),
    numeroVerset: numeroVersetLisible(s.numero_verset),
    forme: s.forme,
  }
  // ⛔ La notice bibliographique n'appartient qu'à l'apparat : la poser sur un segment de
  // corps ferait chercher un ouvrage à des milliers de lignes qui n'en citent aucun.
  if (ctx.avecOuvrage) projete.ouvrageId = identifiantOuvrage(s.ouvrage_id)
  // Le style DÉCLARÉ ne voyage que s'il existe : 141 segments du corpus en portent un
  // au 11 septembre 2026, et une clé nulle sur tous les autres pèserait sur chaque page.
  const style = s.style_presentation?.trim()
  if (style) projete.presentationStyle = style
  return projete
}

/**
 * La chaîne entière : des lignes brutes aux segments et à leurs groupes.
 *
 * ⚠️ La numérotation se calcule sur TOUS les segments reçus, groupes et introductions
 * comprises, avant tout filtrage : c'est la suite de lecture qui la fonde.
 */
export function composerSegments(
  bruts: readonly SegmentBrut[],
  ctx: Omit<ContexteProjection, 'ordinaux'>,
  options: { prefixeAncre?: string; avecSection?: boolean } = {},
): { segments: SegData[]; groupes: GroupeData[]; ordinaux: Map<number, number> } {
  const ordinaux = numerotationLocale(bruts)
  const contexte: ContexteProjection = { ...ctx, ordinaux }
  return {
    segments: bruts.filter(segmentAffichable).map(s => projeterSegment(s, contexte)),
    groupes: grouper(bruts, options.prefixeAncre ?? 'g', {
      avecSection: options.avecSection,
      projeterTitre: ctx.projeterTitre,
    }),
    ordinaux,
  }
}
