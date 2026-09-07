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
 * `texte_alignement_ensembles` / `texte_alignements` / `texte_alignement_membres`.
 *
 * ⛔ ALIGNEMENT N'EST PAS PARAGRAPHAGE (décision de l'auteur, 2026-09-07). Un groupe
 * d'alignement dit ce qui se répond d'une colonne à l'autre ; il ne dit RIEN de la
 * découpe du texte, qui appartient à l'édition seule et se lit dans `paragraphe`. Ce
 * module a tenu l'inverse jusqu'au 2026-09-07, et le Discours 38 de Grégoire de Nazianze
 * l'a démenti : son alignement, posé au SEGMENT, compte 76 groupes sur un corps de deux
 * paragraphes, et le lecteur en tirait 76 blocs, chacun sous son filet et son blanc. On
 * lisait donc soixante-seize paragraphes ouverts en minuscule — « ces choses là… », « ce
 * qu'endure aussi maintenant le Verbe… », « aussi ont faict les Juifs… » — là où Morel
 * n'en a écrit qu'un, dont ces minuscules sont justement la preuve.
 *
 * ⛔ LA RÈGLE, EN DEUX TEMPS. La COMPOSITION appartient au PARAGRAPHE de l'édition —
 * clé éditoriale entière (`id_texte`, `espace_textuel`, `ref_niv*`, `paragraphe`),
 * segments rangés par `rang` et joints par `join_before` : lui seul pose un filet, un
 * blanc et un alinéa. La MISE EN REGARD appartient au GROUPE : lui seul tient les deux
 * colonnes en face l'une de l'autre, et il lui faut pour cela son propre rang de grille.
 * `repartirGroupes` découpe donc aux DEUX, et COUD les rangs d'un même paragraphe : ils
 * se touchent, sans filet, sans blanc et sans retrait.
 *
 * ⚠️ Il reste une coupure de LIGNE à chaque empan, et elle est irréductible : aucune
 * écriture CSS ne fait couler un texte d'un rang de grille au suivant en gardant deux
 * colonnes accordées. Une page en regard se paie de ce prix ; elle ne se paie pas de
 * soixante-seize faux paragraphes.
 *
 * ⚠️ Un groupe qui enjambe deux paragraphes décale la correspondance HORIZONTALE : 28 des
 * 57 groupes de la Didachè le font. La coupure de l'ÉDITION l'emporte alors ; le rang
 * suivant garde sa grille, colonne de droite vide, l'empan étant composé au-dessus.
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
import { liantAvantSegment } from '@/app/lib/jonctionSegments'
import { estBlocDeVers } from '@/app/lib/compositionVers'

/** Un ensemble d'alignement, tel que la page le charge déjà pour la comparaison. */
export type EnsembleAlignement = {
  alignmentSetId: string
  referenceTextId: string
  alignedTextId: string
  alignmentLevel?: string | null
  /** Nombre de GROUPES de l'ensemble, compté sur `texte_alignements` (une ligne par
   *  groupe). C'est la mesure de finesse, et elle n'est chargée que lorsque plusieurs
   *  alignements se disputent la même paire de textes. `null` ou absent : inconnue. */
  nbGroupes?: number | null
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
  /** La forme, à plat : `forme:segment_metadata->>forme`. Voir `compositionVers`. */
  forme?: string | null
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
  /**
   * Le `join_before` du PREMIER segment original du groupe — le liant qui rattache ce
   * groupe à celui qui le précède, quand un même paragraphe en réunit plusieurs.
   *
   * ⛔ Sans lui, `fondreOriginaux` n'avait qu'un saut de ligne à poser, et le grec de
   * deux groupes voisins d'un même paragraphe se lisait sur deux lignes au lieu de
   * couler. Le liant du premier segment ne servait à personne à l'intérieur du groupe,
   * où il ne joint rien ; il sert ici, où il joint deux groupes.
   */
  joinBefore: string | null
}

export type ProjectionBilingue = {
  /** `segment_key` du texte traduit → identifiant de son groupe d'alignement. */
  groupeParCle: Map<string, string>
  /** Identifiant de groupe → l'original de ce groupe. */
  blocParGroupe: Map<string, BlocOriginal>
}

/**
 * Le niveau d'alignement, du plus juste au moins juste, quand rien d'autre ne départage.
 * `paragraph` est l'unité voulue ; `segment` est plus fin mais se recoupe tout aussi
 * bien ; `division` est grossier — en principe.
 *
 * ⛔ Cette échelle ne vaut que comme DÉPARTAGE, jamais comme mesure. Elle décrit ce que
 * l'éditeur a voulu nommer, non ce que l'alignement fait. La Doctrine des Apôtres l'a
 * montré le 2026-08-25 : son ensemble `…:SECTION`, étiqueté `division`, apparie les
 * sections numérotées de Funk une à une — 100 groupes, dont 90 un pour un — quand son
 * ensemble `…:PARAGRAPH`, étiqueté `paragraph`, en réunit jusqu'à cinq contre cinq en
 * 57 groupes seulement. Croire l'étiquette faisait retenir le plus GROSSIER des deux, et
 * le lecteur voyait alors trois sections grecques en regard d'une seule phrase française.
 */
const ORDRE_NIVEAUX = ['paragraph', 'segment', 'division'] as const

/**
 * Choisit l'ensemble d'alignement qui portera la lecture bilingue.
 *
 * On ne retient qu'un ensemble dont UNE des deux faces est le texte lu et l'autre le
 * texte en langue originale : un alignement entre deux traductions françaises (Boèce)
 * n'a rien à faire dans une colonne de latin.
 *
 * ⛔ LA RÈGLE : le plus FIN l'emporte, et la finesse se COMPTE — c'est le nombre de
 * groupes posés sur les deux mêmes textes. Plus il y en a, plus l'unité de lecture est
 * courte, et plus la colonne de droite répond à ce qu'on lit à gauche. Le niveau déclaré
 * ne tranche qu'à défaut : finesse inconnue (un seul candidat, alors rien à compter) ou
 * égale.
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
  // Finesse inconnue = 0 : tous les candidats s'égalisent, et l'ancien classement par
  // niveau reprend la main tel quel. Rien ne change pour une œuvre à un seul alignement.
  const finesse = (e: EnsembleAlignement) => e.nbGroupes ?? 0
  return [...candidats].sort((a, b) => finesse(b) - finesse(a) || rang(a) - rang(b))[0]
}

/**
 * Joint les segments originaux d'un même groupe.
 *
 * ⚠️ Les VERS se joignent par un saut de ligne, jamais par une espace : la colonne les
 * recompose ligne à ligne (`lignesDeVers`), et un poème joint par des espaces se
 * justifierait en prose pendant que le français d'en face resterait en vers. La prose,
 * elle, suit `join_before`, qui porte l'espace ou son absence voulue par l'édition.
 *
 * ⛔ `join_before` passe par `liantAvantSegment` : la colonne originale rendait sinon le
 * jeton `space` en toutes lettres au milieu du latin de Zycha.
 */
export function joindreSegmentsOriginaux(
  segments: readonly { texte: string; joinBefore: string | null; estVers: boolean }[],
): string {
  return segments.reduce((acc, s, i) => {
    if (i === 0) return s.texte
    const liant = s.estVers ? '\n' : liantAvantSegment(s.joinBefore)
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
    const toutVers = estBlocDeVers(segments)
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

    blocParGroupe.set(alignmentId, {
      alignmentId, texte, texteAffichage, notes, toutVers,
      joinBefore: segments[0].join_before,
    })
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
 * ⛔ Un groupe d'alignement peut ENJAMBER deux blocs de lecture — deux sections, 28 des
 * 57 groupes de la Didachè le font, ou deux paragraphes, ce qui est le cas ordinaire
 * depuis que le bloc est le paragraphe. Le bloc ne peut alors pas le contenir, et il
 * faut deux bornes pour rendre l'empan quand même :
 *
 * - le PREMIER porte l'original. Sans cette borne, il se recomposait dans chaque bloc
 *   traversé : le grec de la troisième section de la Didachè paraissait deux fois de
 *   suite, en regard de « Et voici l'enseignement… » puis de « Abstiens-toi… ».
 *   Les blocs suivants gardent leur grille, colonne de droite vide, pour que le français
 *   ne reprenne pas toute la largeur au milieu d'un empan.
 * - le DERNIER porte le filet. Celui-ci marque l'appariement empan par empan : tiré
 *   entre deux blocs d'un MÊME groupe, il annonce une frontière que l'alignement ne
 *   reconnaît pas, et les deux moitiés d'un empan se lisent comme deux empans.
 *
 * ⚠️ Les bornes se comptent sur TOUT ce qui est à l'écran, jamais sur un seul bloc :
 * c'est ce qui permet à `repartirGroupes` de savoir qu'un empan vient de plus haut.
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

/**
 * Fond les originaux qu'un même bloc de lecture met en regard, dans l'ordre de lecture.
 *
 * ⛔ La PROSE se joint par `join_before`, exactement comme deux segments d'un même
 * groupe. Un paragraphe qui réunit plusieurs groupes — c'est le cas ordinaire depuis
 * que le bloc est le paragraphe — doit couler d'un seul tenant dans la colonne de
 * droite : le grec de Grégoire n'a pas plus de raison de sauter une ligne entre deux
 * groupes que le français d'en face n'en a d'ouvrir un paragraphe.
 *
 * ⚠️ Les VERS, eux, se joignent par un SAUT : la colonne les recompose ligne à ligne
 * (`lignesDeVers`), et deux strophes jointes par une espace couleraient en prose. La
 * jonction se juge donc bloc par bloc, sur `toutVers`, et non une fois pour toutes.
 *
 * Rend `null` si aucun des groupes ne porte d'original : le bloc se compose alors seul,
 * sans ouvrir une colonne vide.
 */
export function fondreOriginaux(
  groupes: readonly string[],
  blocs: Record<string, BlocOriginal>,
): BlocOriginal | null {
  const presents = groupes.map(g => blocs[g]).filter((b): b is BlocOriginal => Boolean(b))
  if (presents.length === 0) return null
  if (presents.length === 1) return presents[0]
  const joindre = (lire: (b: BlocOriginal) => string) => presents.reduce(
    (acc, b, i) => i === 0
      ? lire(b)
      : acc + (b.toutVers ? '\n' : liantAvantSegment(b.joinBefore)) + lire(b),
    '',
  )
  return {
    alignmentId: presents[0].alignmentId,
    texte: joindre(b => b.texte),
    texteAffichage: joindre(b => b.texteAffichage),
    notes: Object.assign({}, ...presents.map(b => b.notes)) as Record<string, NoteStructuree>,
    toutVers: presents.every(b => b.toutVers),
    joinBefore: presents[0].joinBefore,
  }
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
  /** Les groupes que CE bloc compose, dans l'ordre de lecture — ceux dont il est le
   *  premier à porter l'empan. Leurs originaux se suivent dans une seule colonne, et
   *  s'y joignent comme le paragraphe d'en face (voir `fondreOriginaux`). */
  groupes: readonly string[]
  /** Le bloc est COUVERT par l'alignement sans rien avoir à composer : son empan l'a
   *  été par un bloc précédent. Sa colonne de droite reste vide, et il ne va surtout
   *  pas chercher la copie — elle redirait ce que la colonne porte déjà plus haut. */
  couvert?: boolean
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
  const { groupes, couvert, blocs, segmentsDuBloc, notesVides } = params
  const fondu = groupes.length > 0 ? fondreOriginaux(groupes, blocs) : null
  if (fondu) return {
    texte: fondu.texte,
    affichage: fondu.texteAffichage,
    notes: fondu.notes as N,
    toutVers: fondu.toutVers,
  }
  // ⛔ Le bloc n'a rien à composer et son empan est ailleurs : sa colonne reste vide.
  // Retomber ici sur la copie ferait paraître deux fois le même original, une fois dans
  // le bloc qui porte l'empan et une fois dans chacun de ceux qui le prolongent.
  if (groupes.length === 0 && couvert) return null
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
    table('segments').select('segment_key,segment_texte,nature,join_before,forme:segment_metadata->>forme')
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

/** Un bloc de lecture — un PARAGRAPHE — et ce que l'alignement lui met en regard. */
export type BlocEnRegard<T> = {
  ids: T[]
  /** Les groupes que ce bloc COMPOSE, dans l'ordre de lecture : ceux dont il porte le
   *  premier segment. Vide quand l'empan est composé plus haut, ou qu'il n'y en a pas. */
  groupes: string[]
  /** Au moins un groupe couvre ce bloc, qu'il le compose ou le prolonge. Un bloc couvert
   *  garde sa grille même sans rien composer : le français ne reprend pas toute la
   *  largeur au milieu d'un empan. */
  couvert: boolean
  /**
   * Ce bloc FERME un paragraphe de l'édition : filet et blanc de paragraphe.
   *
   * ⛔ Faux, le bloc est COUSU au suivant — ni filet, ni blanc, ni retrait : les deux
   * rangs appartiennent au même paragraphe, et seule la mise en regard demandait de les
   * séparer en deux rangs de grille.
   */
  clot: boolean
}

/**
 * Découpe chaque PARAGRAPHE en rangs de grille, un par groupe d'alignement.
 *
 * ⛔ DEUX DÉCOUPES, ET ELLES NE DISENT PAS LA MÊME CHOSE. Le paragraphe est l'unité de
 * la COMPOSITION : c'est lui, et lui seul, qui pose un filet, un blanc et un alinéa.
 * Le groupe est l'unité de la MISE EN REGARD : c'est lui qui tient les deux colonnes en
 * face l'une de l'autre, et il ne peut le faire qu'en occupant son propre rang de
 * grille — aucune écriture CSS ne fait couler un texte d'un rang à l'autre en gardant
 * deux colonnes accordées.
 *
 * ⚠️ Les deux se sont chassées l'une l'autre en un jour, le 7 septembre 2026, et il faut
 * savoir les deux échecs. Découper au GROUPE seul faisait de chaque empan un paragraphe :
 * les 76 groupes du Discours 38 rendaient 76 filets et 76 blancs sur un corps qui n'a que
 * deux paragraphes. Découper au PARAGRAPHE seul fondait les 76 empans en un rang unique :
 * plus un filet, mais plus rien en regard non plus, une colonne de français contre une
 * colonne de grec que rien ne raccordait.
 *
 * ⛔ On découpe donc aux DEUX, et c'est la COUTURE qui répare : un rang par groupe, mais
 * les rangs d'un même paragraphe se touchent — `clot` faux — sans filet, sans blanc et
 * sans retrait. Seul le dernier rang d'un paragraphe le ferme. Il reste une coupure de
 * ligne à chaque empan, et elle est irréductible : c'est le prix de toute page en regard.
 *
 * ⛔ Un groupe ne se compose qu'UNE fois, dans le premier rang qui le touche : les rangs
 * suivants du même empan le déclarent `couvert` sans le composer. Sans quoi le grec d'un
 * empan à cheval sur deux paragraphes paraîtrait deux fois de suite.
 */
export function repartirGroupes<T>(
  paragraphes: readonly { ids: T[] }[],
  groupeDe: (item: T) => string | null | undefined,
  bornes: ReadonlyMap<string, { premier: T; dernier: T }>,
): BlocEnRegard<T>[] {
  const sortie: BlocEnRegard<T>[] = []
  for (const { ids } of paragraphes) {
    // Un rang par suite d'items de MÊME groupe. Un groupe interrompu puis repris dans le
    // même paragraphe rouvre un rang : l'ordre de lecture prime.
    const rangs: { ids: T[]; groupe: string | null }[] = []
    for (const item of ids) {
      const groupe = groupeDe(item) ?? null
      const dernier = rangs[rangs.length - 1]
      if (dernier && dernier.groupe === groupe) dernier.ids.push(item)
      else rangs.push({ ids: [item], groupe })
    }
    for (const [i, rang] of rangs.entries()) {
      // Faute de borne — un groupe annoncé dont rien n'est encore chargé — le rang le
      // compose : c'est le seul qu'on lui connaisse.
      const borne = rang.groupe ? bornes.get(rang.groupe) : undefined
      const porte = Boolean(rang.groupe) && (!borne || rang.ids.includes(borne.premier))
      sortie.push({
        ids: rang.ids,
        groupes: porte && rang.groupe ? [rang.groupe] : [],
        couvert: rang.groupe !== null,
        // ⛔ Le filet et le blanc appartiennent au PARAGRAPHE : seul son dernier rang le
        // ferme. Un empan à cheval sur deux paragraphes n'y change rien — la coupure que
        // l'édition a voulue se voit, et c'est le décalage horizontal qui cède.
        clot: i === rangs.length - 1,
      })
    }
  }
  return sortie
}

/**
 * Refait le POÈME dans la lecture en regard : les blocs voisins entièrement composés
 * de vers n'en font plus qu'un.
 *
 * ⛔ L'empan est la bonne unité de la PROSE, et il ne l'est pas du vers. Un mètre de
 * Boèce se découpe en quatorze groupes d'alignement : le lecteur recevait quatorze
 * rangs de grille, séparés d'un blanc de strophe, pour un seul poème. Mesuré sur le
 * mètre I du Livre premier, la colonne latine ne mesure que 209 px et 29 des 46 vers
 * s'y enroulaient — le poème occupait 75 lignes au lieu de 46. Un vers ne se coupe
 * pas, et aucune colonne étroite ne peut en tenir un.
 *
 * ⚠️ La lecture ORDINAIRE fondait déjà ses poèmes (`fusionnerBlocs`, employé hors
 * regard), et ne pouvait pas le faire ici : le latin d'une strophe vit sur son vers de
 * rang 1, si bien que fondre les blocs n'en gardait qu'un original et jetait les
 * autres. C'est `fondreOriginaux` qui lève l'obstacle, en les faisant tous suivre.
 *
 * Le bloc fondu réunit les groupes de tous ceux qu'il absorbe, dans l'ordre de lecture,
 * et prend le `clot` du DERNIER : c'est lui qui décide si le filet se tire.
 */
export function fusionnerBlocsDeVers<T>(
  blocs: readonly BlocEnRegard<T>[],
  toutEnVers: (ids: readonly T[]) => boolean,
): BlocEnRegard<T>[] {
  const sortie: BlocEnRegard<T>[] = []
  let precedentEnVers = false
  for (const bloc of blocs) {
    const enVers = bloc.ids.length > 0 && toutEnVers(bloc.ids)
    const dernier = sortie[sortie.length - 1]
    if (enVers && precedentEnVers && dernier) {
      dernier.ids.push(...bloc.ids)
      dernier.groupes.push(...bloc.groupes)
      dernier.couvert = dernier.couvert || bloc.couvert
      dernier.clot = bloc.clot
    } else {
      sortie.push({ ids: [...bloc.ids], groupes: [...bloc.groupes], couvert: bloc.couvert, clot: bloc.clot })
    }
    precedentEnVers = enVers
  }
  return sortie
}
