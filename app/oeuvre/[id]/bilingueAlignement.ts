/**
 * La lecture bilingue, composée depuis l'ALIGNEMENT.
 *
 * ⛔ RÈGLE : un texte en langue originale n'existe QU'À UN SEUL ENDROIT, dans ses
 * propres `segments`, sous son propre `id_texte`. Il a ses titres, son sommaire, son
 * apparat et ses notes, et il se lit pour lui-même. La colonne `segments.texte_original`
 * en gardait une SECONDE copie, recollée dans chaque segment de la traduction : deux
 * exemplaires du même latin, que rien n'obligeait à rester d'accord, et que rien
 * n'obligeait non plus à exister tous les deux. La Doctrine des Apôtres en a fait la
 * démonstration le 2026-08-24 : son grec est entré comme texte à part entière, sans
 * passer par la colonne, et la lecture bilingue n'a plus rien eu à mettre en regard.
 *
 * La correspondance entre les deux textes vit donc là où elle doit vivre : dans
 * `texte_alignement_ensembles` / `texte_alignements` / `texte_alignement_membres`. Un
 * GROUPE d'alignement est le paragraphe de la lecture bilingue — l'unité qui se recoupe
 * d'une colonne à l'autre. C'est lui qui découpe les deux colonnes, et non `paragraphe`,
 * qui ne vaut que dans un seul texte à la fois : sur les 57 groupes de la Didachè, 28
 * enjambent deux sections numérotées, et sur la Cité de Dieu 4 groupes enjambent deux
 * paragraphes. Découper au paragraphe aurait remis les colonnes en désaccord.
 *
 * ⚠️ `texte_original` reste lu en REPLI, le temps que les sept œuvres dont l'original
 * n'a pas encore de texte propre (Consolation de Mirandol, Ratramne, Hexaéméron,
 * Discours 38, Jonas, Joël, Abdias) reçoivent le leur. Ce repli n'est pas une seconde
 * façon de faire : c'est la première qui s'éteint. Il tombe avec la colonne.
 */

import type { NoteStructuree } from './oeuvreTypes'
import {
  projeterAppelsNotesStructurees,
  type AncreNoteStructureeProjection,
} from '@/app/lib/appelsNotesStructurees'

/** Un ensemble d'alignement, tel que la page le charge déjà pour la comparaison. */
export type EnsembleAlignement = {
  alignmentSetId: string
  referenceTextId: string
  alignedTextId: string
  alignmentLevel?: string | null
}

/** Une ligne de `texte_alignement_membres`. */
export type MembreAlignement = {
  alignment_id: string
  role: 'reference' | 'aligned'
  member_order: number
  id_texte: string
  segment_key: string
}

/** Un segment du texte en langue originale, tel qu'il sort de `segments`. */
export type SegmentOriginal = {
  segment_key: string
  segment_texte: string
  nature: string | null
  join_before: string | null
}

/** L'original d'un groupe d'alignement, prêt à composer dans la colonne de droite. */
export type BlocOriginal = {
  alignmentId: string
  /** Les segments d'origine joints. Donnée canonique : copie, signalement, citation. */
  texte: string
  /** Le même, appels de notes matérialisés — l'équivalent de `texteAffichage`. */
  texteAffichage: string
  /** Les notes de TOUS les segments originaux du groupe, fondues en une table. */
  notes: Record<string, NoteStructuree>
  /** Le groupe est entièrement en vers : la colonne se compose ligne à ligne. */
  toutVers: boolean
}

export type ProjectionBilingue = {
  /** `segment_key` du texte traduit → identifiant de son groupe d'alignement. */
  groupeParCle: Map<string, string>
  /** Identifiant de groupe → l'original de ce groupe. */
  blocParGroupe: Map<string, BlocOriginal>
}

/**
 * Le niveau d'alignement qui fait un paragraphe de lecture, du plus juste au moins
 * juste. `paragraph` est l'unité voulue ; `segment` est plus fin mais se recoupe tout
 * aussi bien ; `division` est grossier (un chapitre entier en regard d'un chapitre) et
 * ne sert qu'à défaut.
 */
const ORDRE_NIVEAUX = ['paragraph', 'segment', 'division'] as const

/**
 * Choisit l'ensemble d'alignement qui portera la lecture bilingue.
 *
 * On ne retient qu'un ensemble dont UNE des deux faces est le texte lu et l'autre le
 * texte en langue originale : un alignement entre deux traductions françaises (Boèce)
 * n'a rien à faire dans une colonne de latin.
 */
export function choisirEnsembleBilingue(
  ensembles: readonly EnsembleAlignement[],
  idTexteTraduit: string,
  idTexteOriginal: string,
): EnsembleAlignement | null {
  const candidats = ensembles.filter(e =>
    (e.referenceTextId === idTexteTraduit && e.alignedTextId === idTexteOriginal)
    || (e.referenceTextId === idTexteOriginal && e.alignedTextId === idTexteTraduit))
  if (candidats.length === 0) return null
  const rang = (e: EnsembleAlignement) => {
    const index = ORDRE_NIVEAUX.indexOf((e.alignmentLevel ?? '') as (typeof ORDRE_NIVEAUX)[number])
    return index < 0 ? ORDRE_NIVEAUX.length : index
  }
  return [...candidats].sort((a, b) => rang(a) - rang(b))[0]
}

/**
 * Joint les segments originaux d'un même groupe.
 *
 * ⚠️ Les VERS se joignent par un saut de ligne, jamais par une espace : la colonne les
 * recompose ligne à ligne (`lignesDeVers`), et un poème joint par des espaces se
 * justifierait en prose pendant que le français d'en face resterait en vers. La prose,
 * elle, suit `join_before`, qui porte l'espace ou son absence voulue par l'édition.
 */
export function joindreSegmentsOriginaux(
  segments: readonly { texte: string; joinBefore: string | null; estVers: boolean }[],
): string {
  return segments.reduce((acc, s, i) => {
    if (i === 0) return s.texte
    const liant = s.estVers ? '\n' : (s.joinBefore ?? ' ')
    return acc + liant + s.texte
  }, '')
}

/**
 * Construit la projection bilingue : à quel groupe appartient chaque segment traduit,
 * et quel original ce groupe met en regard.
 *
 * ⚠️ Les appels de notes se matérialisent segment PAR segment, avant la jonction. Les
 * offsets d'ancre (`segment_offset_unicode`) se comptent depuis le début de LEUR
 * segment : projetés sur le texte déjà joint, ils tomberaient tous à côté, d'autant plus
 * loin que le groupe est long.
 */
export function projeterBilingue(params: {
  membres: readonly MembreAlignement[]
  idTexteTraduit: string
  idTexteOriginal: string
  segmentsOriginaux: readonly SegmentOriginal[]
  notesOriginales?: Record<string, Record<string, NoteStructuree>>
  ancresOriginales?: Record<string, AncreNoteStructureeProjection[]>
}): ProjectionBilingue {
  const { membres, idTexteTraduit, idTexteOriginal, segmentsOriginaux } = params
  const notesOriginales = params.notesOriginales ?? {}
  const ancresOriginales = params.ancresOriginales ?? {}

  const segmentParCle = new Map(segmentsOriginaux.map(s => [s.segment_key, s]))

  const groupeParCle = new Map<string, string>()
  const clesOriginalesParGroupe = new Map<string, { ordre: number; cle: string }[]>()

  for (const membre of membres) {
    if (membre.id_texte === idTexteTraduit) {
      groupeParCle.set(membre.segment_key, membre.alignment_id)
    } else if (membre.id_texte === idTexteOriginal) {
      const liste = clesOriginalesParGroupe.get(membre.alignment_id) ?? []
      liste.push({ ordre: membre.member_order, cle: membre.segment_key })
      clesOriginalesParGroupe.set(membre.alignment_id, liste)
    }
  }

  const blocParGroupe = new Map<string, BlocOriginal>()
  for (const [alignmentId, liste] of clesOriginalesParGroupe) {
    const segments = [...liste]
      .sort((a, b) => a.ordre - b.ordre)
      .map(({ cle }) => segmentParCle.get(cle))
      .filter((s): s is SegmentOriginal => Boolean(s))
    if (segments.length === 0) continue

    // Un groupe est « en vers » quand TOUS ses segments le sont : un groupe mixte se
    // compose en prose, faute de savoir où le poème commence.
    const toutVers = segments.every(s => s.nature === 'vers')
    const parts = segments.map(s => ({
      texte: s.segment_texte,
      joinBefore: s.join_before,
      estVers: toutVers,
    }))
    const texte = joindreSegmentsOriginaux(parts)
    const texteAffichage = joindreSegmentsOriginaux(segments.map(s => ({
      texte: projeterAppelsNotesStructurees(s.segment_texte, ancresOriginales[s.segment_key]),
      joinBefore: s.join_before,
      estVers: toutVers,
    })))

    const notes: Record<string, NoteStructuree> = {}
    for (const s of segments) Object.assign(notes, notesOriginales[s.segment_key] ?? {})

    blocParGroupe.set(alignmentId, { alignmentId, texte, texteAffichage, notes, toutVers })
  }

  // Un segment traduit dont le groupe n'a pas d'original (cardinalité `1:0`, une
  // addition du traducteur) ne porte rien : il se compose seul, sans colonne en regard,
  // au lieu d'être rattaché à un bloc vide qui aurait ouvert une grille bilingue nue.
  for (const [cle, groupe] of [...groupeParCle]) {
    if (!blocParGroupe.has(groupe)) groupeParCle.delete(cle)
  }

  return { groupeParCle, blocParGroupe }
}

/**
 * Le premier et le dernier segment traduit de chaque groupe, dans l'ordre de lecture.
 *
 * ⛔ Un groupe d'alignement peut ENJAMBER deux sections — 28 des 57 groupes de la
 * Didachè le font — et les sections se rendent séparément, chacune sous son titre. La
 * découpe en blocs ne peut donc pas les réunir, et il faut deux bornes pour rendre
 * l'empan quand même :
 *
 * - le PREMIER porte l'original. Sans cette borne, il se recomposait dans chaque section
 *   traversée : le grec de la troisième section de la Didachè paraissait deux fois de
 *   suite, en regard de « Et voici l'enseignement… » puis de « Abstiens-toi… ».
 *   Les blocs suivants gardent leur grille, colonne de droite vide, pour que le français
 *   ne reprenne pas toute la largeur au milieu d'un empan.
 * - le DERNIER porte le filet. Celui-ci marque l'appariement empan par empan : tiré
 *   entre deux blocs d'un MÊME groupe, il annonce une frontière que l'alignement ne
 *   reconnaît pas, et les deux moitiés d'un empan se lisent comme deux empans.
 */
export function bornesDesGroupes(
  segments: readonly { id: number; groupeOriginal?: string | null }[],
): Map<string, { premier: number; dernier: number }> {
  const bornes = new Map<string, { premier: number; dernier: number }>()
  for (const s of segments) {
    if (!s.groupeOriginal) continue
    const borne = bornes.get(s.groupeOriginal)
    if (borne) borne.dernier = s.id
    else bornes.set(s.groupeOriginal, { premier: s.id, dernier: s.id })
  }
  return bornes
}

/** Ce que la colonne de droite compose, d'où qu'il vienne. */
export type OriginalEnRegard<N> = {
  texte: string
  /** Le même, appels de note matérialisés. */
  affichage: string
  notes: N
  /** `null` = l'origine ne sait pas si c'est du vers ; la colonne française tranchera. */
  toutVers: boolean | null
}

/**
 * L'original mis en regard d'un bloc de lecture : celui de l'ALIGNEMENT quand le bloc
 * en a un, la colonne `texte_original` en repli.
 *
 * ⛔ L'alignement a la priorité, et sans condition. Une œuvre peut porter les deux — les
 * Confessions ont leur latin comme texte à part entière ET recopié dans les 932 segments
 * de la traduction — et c'est alors le texte qui fait foi, jamais la copie : elle seule
 * peut avoir dérivé. Le repli ne sert qu'aux œuvres dont l'original n'a pas encore de
 * texte propre, et il tombera avec la colonne.
 *
 * Rend `null` quand il n'y a rien à mettre en regard : le bloc se compose alors seul,
 * sans ouvrir une grille bilingue vide.
 */
export function originalEnRegard<N>(params: {
  groupe: string | null
  blocs: Record<string, BlocOriginal>
  /** Les segments TRADUITS du bloc, dans l'ordre de lecture — pour le seul repli. */
  segmentsDuBloc: readonly {
    texteOriginal?: string | null
    texteOriginalAffichage?: string
    notesOriginal?: N
    notes?: N
  }[]
  /** La table de notes vide, faute de savoir la fabriquer sur un type générique. */
  notesVides: N
}): OriginalEnRegard<N> | null {
  const { groupe, blocs, segmentsDuBloc, notesVides } = params
  if (groupe) {
    const bloc = blocs[groupe]
    if (bloc) return {
      texte: bloc.texte,
      affichage: bloc.texteAffichage,
      notes: bloc.notes as N,
      toutVers: bloc.toutVers,
    }
  }
  const seg = segmentsDuBloc.find(s => Boolean(s?.texteOriginal?.trim()))
  if (!seg?.texteOriginal) return null
  return {
    texte: seg.texteOriginal,
    affichage: seg.texteOriginalAffichage ?? seg.texteOriginal,
    notes: seg.notesOriginal ?? seg.notes ?? notesVides,
    toutVers: null,
  }
}

/** Taille des lots d'un filtre `in(...)` : au-delà, l'URL PostgREST casse. */
const LOT_CLES = 200

function lots<T>(items: readonly T[], taille = LOT_CLES): T[][] {
  const sortie: T[][] = []
  for (let i = 0; i < items.length; i += taille) sortie.push(items.slice(i, i + taille))
  return sortie
}

/**
 * Le strict nécessaire d'un client Supabase, pour que le serveur et le client appellent
 * le MÊME chargeur — la page en a deux, et deux chargeurs auraient dérivé.
 *
 * ⚠️ `from` rend `unknown`, et la requête est retypée à l'intérieur. Décrire le
 * constructeur de requêtes fidèlement ferait comparer à ce type toute la générique du
 * client Supabase, et le compilateur y renonce (TS2589, « type instantiation is
 * excessively deep »). C'est le seul endroit du module où l'on retype quelque chose.
 */
export type ClientLecture = { from: (table: string) => unknown }

type RequeteLecture = {
  select: (colonnes: string) => RequeteLecture
  eq: (colonne: string, valeur: string) => RequeteLecture
  in: (colonne: string, valeurs: readonly string[]) => PromiseLike<{ data: unknown[] | null }>
}

/**
 * Charge la projection bilingue pour les segments traduits actuellement à l'écran.
 *
 * On ne charge PAS tout l'alignement de l'œuvre : les Confessions en ont 932 groupes et
 * plus de onze mille membres, quand la page n'affiche qu'un livre à la fois. On part
 * donc des clés affichées, on remonte à leurs groupes, puis on redescend sur l'original.
 */
export async function chargerProjectionBilingue(
  client: ClientLecture,
  params: {
    alignmentSetId: string
    idTexteTraduit: string
    idTexteOriginal: string
    clesTraduites: readonly string[]
    notesOriginales?: Record<string, Record<string, NoteStructuree>>
    ancresOriginales?: Record<string, AncreNoteStructureeProjection[]>
  },
): Promise<ProjectionBilingue> {
  const vide: ProjectionBilingue = { groupeParCle: new Map(), blocParGroupe: new Map() }
  if (params.clesTraduites.length === 0) return vide

  const table = (nom: string) => client.from(nom) as RequeteLecture

  const membreSelect = 'alignment_id,role,member_order,id_texte,segment_key'
  const lireMembres = (colonne: 'segment_key' | 'alignment_id', valeurs: string[], idTexte: string) =>
    Promise.all(lots(valeurs).map(lot =>
      table('texte_alignement_membres').select(membreSelect)
        .eq('alignment_set_id', params.alignmentSetId)
        .eq('id_texte', idTexte)
        .in(colonne, lot)))

  const cotesTraduits = await lireMembres('segment_key', [...params.clesTraduites], params.idTexteTraduit)
  const membresTraduits = cotesTraduits.flatMap(r => (r.data ?? []) as MembreAlignement[])
  if (membresTraduits.length === 0) return vide

  const groupes = [...new Set(membresTraduits.map(m => m.alignment_id))]
  const cotesOriginaux = await lireMembres('alignment_id', groupes, params.idTexteOriginal)
  const membresOriginaux = cotesOriginaux.flatMap(r => (r.data ?? []) as MembreAlignement[])

  const clesOriginales = [...new Set(membresOriginaux.map(m => m.segment_key))]
  const pagesSegments = await Promise.all(lots(clesOriginales).map(lot =>
    table('segments').select('segment_key,segment_texte,nature,join_before')
      .eq('id_texte', params.idTexteOriginal)
      .in('segment_key', lot)))
  const segmentsOriginaux = pagesSegments.flatMap(r => (r.data ?? []) as SegmentOriginal[])

  return projeterBilingue({
    membres: [...membresTraduits, ...membresOriginaux],
    idTexteTraduit: params.idTexteTraduit,
    idTexteOriginal: params.idTexteOriginal,
    segmentsOriginaux,
    notesOriginales: params.notesOriginales,
    ancresOriginales: params.ancresOriginales,
  })
}

/**
 * Découpe une suite de segments traduits en blocs de lecture bilingue : un bloc par
 * groupe d'alignement, dans l'ordre de lecture.
 *
 * ⛔ On ne fond JAMAIS au groupe voisin un segment que l'alignement ne couvre pas : ce
 * serait le mettre en regard d'un original qu'il ne traduit pas. Les segments hors
 * alignement sortent donc en suites à `groupe: null`, que l'appelant redécoupe par
 * `paragraphe` — leur composition ordinaire, celle du français seul.
 *
 * ⚠️ Aucun tri interne, à la différence de `paragraphesDe`, qui range ses segments par
 * `rang`. Un groupe d'alignement peut enjamber deux paragraphes (28 des 57 groupes de la
 * Didachè enjambent deux sections), et `rang` repart à 1 à chaque paragraphe : trier
 * dessus mêlerait les deux moitiés du groupe. L'ordre de lecture reçu fait foi.
 */
export function blocsBilingues<T>(
  itemIds: readonly T[],
  cleDe: (item: T) => string | null | undefined,
  groupeParCle: ReadonlyMap<string, string>,
): { ids: T[]; groupe: string | null }[] {
  const blocs: { ids: T[]; groupe: string | null }[] = []
  for (const item of itemIds) {
    const cle = cleDe(item)
    const groupe = (cle && groupeParCle.get(cle)) || null
    const dernier = blocs[blocs.length - 1]
    if (dernier && dernier.groupe === groupe) dernier.ids.push(item)
    else blocs.push({ ids: [item], groupe })
  }
  return blocs
}
