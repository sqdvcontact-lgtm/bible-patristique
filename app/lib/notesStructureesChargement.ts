/**
 * LE CHARGEMENT DES NOTES STRUCTURÉES d'un texte — notes, ancres, blocs, relations.
 *
 * ⚠️ Il vivait dans `app/oeuvre/[id]/page.tsx`, donc hors d'atteinte de toute autre
 * surface : l'extraction d'une œuvre en a eu besoin à son tour, et un chargeur recopié
 * ne reste identique que par accident — c'est la dérive que la charte a déjà payée quatre
 * fois avec les listes de natures. La page et la route l'appellent désormais tel quel.
 *
 * ⛔ Le client est REÇU, jamais importé : la page lit la session du visiteur, la route
 * aussi, et un module qui ouvrirait son propre client deviendrait intestable (piège de
 * `pericopesRecherche`).
 *
 * ⚠️ C'est une couche SECONDAIRE : son échec ne ferme pas la page qui la demande. Elle
 * lève, et l'appelant l'enveloppe dans `tolerer` ; les incidents qu'elle sait traverser —
 * une ancre incomplète, une division introuvable — s'inscrivent dans le journal des
 * dégradations qu'on lui passe.
 *
 * ⛔ DEUX CHARGEURS, UN SEUL ASSEMBLAGE (2026-09-11). La page d'une œuvre charge les
 * notes d'un texte ENTIER (`chargerNotesStructurees`) ; le volet patristique de la page
 * Bible n'en veut que celles de la vingtaine d'extraits qu'il montre, pris dans des
 * œuvres différentes (`chargerNotesDesSegments`). Ce qui fait d'une ligne de base une
 * note — les blocs, leurs relations, le marqueur d'une ancre — vit dans
 * `assemblerNotesStructurees`, et les deux s'en servent : deux assemblages diverger ne
 * montreraient pas la même note sur la page de l'œuvre et dans le volet.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { chargerPagesEnParallele, chargerParTranchesDeCle, chargerToutesPagesSupabase, lotsPourClauseIn } from '@/app/lib/paginationSupabase'
import {
  estNoteApparatCritique,
  lireMetadonneesBlocNote,
  metadonneesDesColonnes,
  SELECT_METADONNEES_BLOC_LUES,
  type ColonnesMetadonneesBloc,
} from '@/app/lib/apparatCritique'
import { natureBlocNoteSur } from '@/app/lib/naturesNote'
import { messageDErreur, noterDegradation, tolerer, type DegradationChargement } from '@/app/lib/chargementTolerant'
import {
  attacherRenvois,
  chargerContexteNumerotation,
  chargerRenvoisDesNotes,
  chargerRenvoisDuTexte,
  construireContexteNumerotation,
  resoudreTete,
  resoudreTetesDesRenvois,
  type ContextesDeNumerotation,
  type LigneRenvoi,
} from '@/app/lib/renvoisNotesChargement'
import type { IdentiteNote, TeteRenvoi } from '@/app/lib/renvoisNotes'
import type { AncreNoteStructureeProjection } from '@/app/lib/appelsNotesStructurees'
import type { NoteBlocData, NoteStructuree } from '@/app/oeuvre/[id]/oeuvreTypes'

/** Le client de lecture — celui de la page, celui de la route, jamais un client à soi.
 *  ⚠️ Le type du client SSR et celui du client de service sont structurellement le même
 *  `SupabaseClient` : on le nomme, plutôt que d'ouvrir un `any` de plus. */
type ClientLecture = Pick<SupabaseClient, 'from'>

export type NotesStructureesChargees = {
  notesParSegment: Record<string, Record<string, NoteStructuree>>
  ancresParSegment: Record<string, AncreNoteStructureeProjection[]>
}

/** Le repli d'une couche absente. FABRIQUE : un objet vide partagé entre deux appelants
 *  finirait par être modifié par l'un d'eux. */
export const AUCUNE_NOTE = (): NotesStructureesChargees => ({ notesParSegment: {}, ancresParSegment: {} })

/** Les premières clés d'une liste, pour un journal qui ne doit pas en porter mille. */
const apercu = (cles: readonly string[], n = 8) =>
  cles.slice(0, n).join(', ') + (cles.length > n ? `… (${cles.length} en tout)` : '')

// ── LES LIGNES, telles que les quatre `select` les demandent ───────────────────
// ⚠️ Le type décrit ce que le `select` DEMANDE, pas ce que la table contient : une
// colonne retirée de l'une des listes ci-dessous doit casser à la compilation.
type NoteRow = { note_key: string; note_number: number }
type AnchorRow = {
  note_key: string
  marker: string | null
  segment_key: string | null
  source_target: string | null
  segment_offset_unicode: number | null
}
type BlockRow = {
  note_key: string
  block_id: string
  rank: number
  kind: string
  form: string
  language: string | null
  text: string
  rendering: string | null
  needs_review: boolean
  // ⛔ Le jsonb n'est PLUS lu entier : seules ses clés de rendu sont demandées
  // (`SELECT_METADONNEES_BLOC_LUES`), puis recomposées ici. Entier, il pesait 38,7 Mo
  // sur les 7 277 blocs de l'apparat de Knöll — les traces de toutes les passes
  // d'atelier —, tirés de la base à CHAQUE ouverture des Confessions (2026-09-21).
  metadata: Record<string, unknown> | null
}
/** La ligne telle que PostgREST la rend, avant recomposition de `metadata`. */
type BlockRowBrute = Omit<BlockRow, 'metadata'> & ColonnesMetadonneesBloc & { metadata?: unknown }
const versBlockRow = (ligne: BlockRowBrute): BlockRow => ({
  note_key: ligne.note_key,
  block_id: ligne.block_id,
  rank: ligne.rank,
  kind: ligne.kind,
  form: ligne.form,
  language: ligne.language,
  text: ligne.text,
  rendering: ligne.rendering,
  needs_review: ligne.needs_review,
  metadata: metadonneesDesColonnes(ligne),
})
type RelationRow = {
  note_key: string
  relation_kind: string
  source_block_id: string
  target_block_id: string | null
}

const COLONNES_NOTES = 'note_key,note_number'
const COLONNES_ANCRES = 'note_key,marker,segment_key,source_target,segment_offset_unicode'
const COLONNES_BLOCS = `note_key,block_id,rank,kind,form,language,text,rendering,needs_review,${SELECT_METADONNEES_BLOC_LUES}`
const COLONNES_RELATIONS = 'note_key,relation_kind,source_block_id,target_block_id'

export type NotesAssemblees = NotesStructureesChargees & {
  /** Chaque note, par sa clé : c'est sur elle que se pose ensuite le numéro affiché. */
  parNote: Map<string, NoteStructuree>
  /** Les ancres laissées de côté — note absente, marqueur mal formé, offset manquant
   *  sur le texte. À l'appelant de dire où elles se signalent. */
  ancresIncompletes: string[]
}

/**
 * Fait des lignes de base des NOTES : les blocs rangés sous leur note, leurs relations
 * posées sur eux, et chaque ancre rangée sous son segment.
 *
 * ⛔ PUR, et c'est ce qui le rend partageable : il ne lit rien, il ne journalise rien,
 * il ne lève pas. Ce qu'il ne sait pas ranger, il le COMPTE (`ancresIncompletes`), et
 * l'appelant décide de la dégradation.
 */
export function assemblerNotesStructurees({ notes, ancres, blocs, relations }: {
  notes: readonly NoteRow[]
  ancres: readonly AnchorRow[]
  blocs: readonly BlockRow[]
  relations: readonly RelationRow[]
}): NotesAssemblees {
  const relationsParBloc = new Map<string, Record<string, string | null>>()
  const numeros = new Map(notes.map(note => [note.note_key, note.note_number]))
  for (const relation of relations) {
    const key = `${relation.note_key}:${relation.source_block_id}`
    relationsParBloc.set(key, { ...(relationsParBloc.get(key) ?? {}), [relation.relation_kind]: relation.target_block_id })
  }
  const parNote = new Map<string, NoteStructuree>()
  for (const block of blocs) {
    const noteNumber = numeros.get(block.note_key)
    if (typeof noteNumber !== 'number') continue
    if (!parNote.has(block.note_key)) parNote.set(block.note_key, { noteKey: block.note_key, noteNumber, blocks: [] })
    const relation = relationsParBloc.get(`${block.note_key}:${block.block_id}`) ?? {}
    const meta = lireMetadonneesBlocNote(block.metadata)
    // ⛔ UN CHAMP NUL NE VOYAGE PAS. Les huit champs facultatifs d'un bloc étaient
    // toujours émis, fussent-ils nuls, et la charge de flux les porte ESCAMPÉS — chaque
    // guillemet compte double. Mesuré le 9 septembre 2026 sur La Cité de Dieu : quatre
    // d'entre eux (`rendering`, `editorialRole`, `printedLine`, `visualReviewReason`)
    // sont nuls sur les 5 564 blocs, soit 100 %, et la page en sérialisait quinze clés
    // par bloc pour une charge de 4,3 Mo dont 265 Ko seulement de texte.
    // ⚠️ Les huit sont DÉJÀ facultatifs dans `NoteBlocData` : un consommateur qui lit
    // `undefined` là où il lisait `null` se comporte pareil (`x ?? …`, `x === 'la'`,
    // `String(x)` hors vocabulaire). Rien du rendu ne change.
    const bloc: NoteBlocData = {
      blockId: block.block_id,
      rank: block.rank,
      kind: natureBlocNoteSur(block.kind) ?? 'commentary',
      form: block.form as NoteStructuree['blocks'][number]['form'],
      text: block.text,
      needsReview: block.needs_review,
    }
    if (block.language != null) bloc.language = block.language
    if (block.rendering != null) bloc.rendering = block.rendering
    if (relation.target_block != null) bloc.targetBlockId = relation.target_block
    if (relation.translation_of != null) bloc.translationOf = relation.translation_of
    if (meta.editorialRole != null) bloc.editorialRole = meta.editorialRole
    if (meta.printedLine != null) bloc.printedLine = meta.printedLine
    if (meta.visualReviewReason != null) bloc.visualReviewReason = meta.visualReviewReason
    if (meta.humanValidated != null) bloc.humanValidated = meta.humanValidated
    // ⛔ La DISPOSITION déclarée voyage ; les TRACES documentaires, jamais (voir
    // `lireMetadonneesBlocNote`) : le texte lu est `block.text`, et lui seul.
    if (meta.citationLayout != null) bloc.citationLayout = meta.citationLayout
    // La marque d'une ENTRÉE de série bibliographique voyage, et seulement quand elle vaut
    // vrai : le rendu en fait une liste (`serieBibliographiqueNote.tsx`).
    if (meta.bibliographyListItem) bloc.bibliographyListItem = true
    // ⛔ Le STYLE DE LECTURE voyage quand la donnée le déclare, et son libellé avec lui
    // (`explicationCorpus.ts`) : c'est sur lui, et jamais sur le rôle éditorial, que se
    // déclenche le rendu d'une explication de Corpus Scriptura.
    if (meta.readerStyle != null) bloc.readerStyle = meta.readerStyle
    if (meta.readerLabel != null) bloc.readerLabel = meta.readerLabel
    parNote.get(block.note_key)!.blocks.push(bloc)
  }
  const notesParSegment: Record<string, Record<string, NoteStructuree>> = {}
  const ancresParSegment: Record<string, AncreNoteStructureeProjection[]> = {}
  // ⛔ Une ancre INCOMPLÈTE est laissée de côté et comptée, jamais levée. Le 5
  // septembre 2026, pendant qu'une écriture reprenait les notes des Confessions,
  // UNE ancre est restée un moment sans sa note (« Ancre de note structurée
  // incomplète : AUG-CONF-KNOLL-APP-0154 ») : la page levait dessus et fermait
  // l'œuvre entière à tout lecteur, puis rouvrait d'elle-même l'écriture finie.
  // Un import n'est pas atomique, et le lecteur ne paie pas l'intervalle. Le
  // compte part au journal et au bandeau : l'erreur est REMONTÉE (charte § 13.6),
  // elle n'est plus fatale.
  const ancresIncompletes: string[] = []
  for (const anchor of ancres) {
    const note = parNote.get(anchor.note_key)
    const marker = anchor.marker?.match(/^\[\[([A-Z0-9]+)\]\]$/)?.[1]
    if (!note || !marker || !anchor.segment_key) {
      ancresIncompletes.push(anchor.note_key)
      continue
    }
    notesParSegment[anchor.segment_key] ??= {}
    notesParSegment[anchor.segment_key][marker] = note
    // ⛔ ON INDEXE TOUTES LES CIBLES, non le seul `segment_texte`, et c'était le
    //    second étage du même défaut : la projection avait beau savoir viser un CHAMP
    //    DE TITRE, l'ancre qui en vise un n'arrivait jamais jusqu'à elle. C'est le
    //    consommateur qui choisit son champ (`projeter(…, champ)`), et sa valeur par
    //    défaut reste `segment_texte` : un appelant qui ne demande rien ne voit rien
    //    de plus qu'avant.
    if (anchor.segment_offset_unicode === null || !Number.isInteger(anchor.segment_offset_unicode)) {
      // ⚠️ Un offset absent n'est un DÉFAUT que sur le texte : là, l'appel manque au
      //    lecteur. Sur un champ de titre il dit seulement que le marqueur est posé
      //    MATÉRIELLEMENT — les deux ancres `work_title` du corpus sont dans ce cas,
      //    et leur appel paraît déjà au frontispice. Le crier ferait paraître un
      //    bandeau de dégradation sur deux œuvres qui n'ont rien perdu.
      if (anchor.source_target === 'segment_texte') ancresIncompletes.push(`${anchor.note_key} (offset absent)`)
      continue
    }
    ancresParSegment[anchor.segment_key] ??= []
    ancresParSegment[anchor.segment_key].push({
      noteKey: anchor.note_key,
      marker: `[[${marker}]]`,
      segmentOffsetUnicode: anchor.segment_offset_unicode,
      sourceTarget: anchor.source_target ?? '',
    })
  }
  return { parNote, notesParSegment, ancresParSegment, ancresIncompletes }
}

export async function chargerNotesStructurees(
  supabase: ClientLecture,
  idTexte: string | null,
  degradations: DegradationChargement[],
): Promise<NotesStructureesChargees> {
  if (!idTexte) return AUCUNE_NOTE()
  let rows: [NoteRow[], AnchorRow[], BlockRow[], RelationRow[]]
  try {
    // Notes et ancres par vagues de deux pages : sur un apparat savant (Knöll : 7 277
    // notes, huit pages chacune) elles se lisaient page après page, soit huit
    // allers-retours. Les blocs vont par tranches de clé, et le tout garde au plus cinq
    // requêtes en vol (REQUETES_EN_VOL).
    rows = await Promise.all([
      chargerPagesEnParallele<NoteRow>((debut, fin) => supabase.from('texte_notes')
        .select(COLONNES_NOTES).eq('id_texte', idTexte)
        // Le numéro recommence à 1 dans chaque division. Il ne suffit donc plus
        // à stabiliser une pagination : sans ce départage, une note peut tomber
        // dans deux pages successives et une autre disparaître entre les deux.
        .order('note_number').order('note_key').range(debut, fin), { vague: 2 }),
      chargerPagesEnParallele<AnchorRow>((debut, fin) => supabase.from('texte_note_ancres')
        .select(COLONNES_ANCRES)
        .eq('id_texte', idTexte).order('note_key').order('segment_key')
        .order('segment_offset_unicode').range(debut, fin), { vague: 2 }),
      // ⛔ PAR TRANCHES DE CLÉ, jamais par décalage : un décalage fait décompresser à la
      // base le jsonb de chaque ligne SAUTÉE, huit fois (une par clé extraite). Voir
      // `chargerParTranchesDeCle`.
      chargerParTranchesDeCle<BlockRowBrute>((depuis, taille) => {
        let q = supabase.from('texte_note_blocs').select(COLONNES_BLOCS).eq('id_texte', idTexte)
        if (depuis !== null) q = q.gte('note_key', depuis)
        return q.order('note_key').order('rank').range(0, taille - 1)
      }, ligne => ligne.note_key).then(l => l.map(versBlockRow)),
      chargerToutesPagesSupabase<RelationRow>((debut, fin) => supabase.from('texte_note_relations')
        .select(COLONNES_RELATIONS)
        .eq('id_texte', idTexte).order('note_key').order('source_block_id')
        .order('relation_kind').range(debut, fin)),
    ])
  } catch (error) {
    console.error(`Chargement des notes structurées impossible (${idTexte}) :`, error)
    throw new Error(`Impossible de charger les notes structurées de ${idTexte}.`, { cause: error })
  }
  const [notesRows, anchorsRows, blocksRows, relationsRows] = rows
  const { parNote, notesParSegment, ancresParSegment, ancresIncompletes } = assemblerNotesStructurees({
    notes: notesRows, ancres: anchorsRows, blocs: blocksRows, relations: relationsRows,
  })
  if (ancresIncompletes.length > 0) {
    noterDegradation(degradations, {
      quoi: 'quelques appels de note',
      detail: `${idTexte} : ${ancresIncompletes.length} ancre(s) incomplète(s), laissée(s) de côté : ${apercu(ancresIncompletes)}`,
      publique: true,
    })
  }
  // ── LE NUMÉRO AFFICHÉ ─────────────────────────────────────────────────────
  // Charte § 13.8 : il repart à 1 à chaque division de NIVEAU 1, et l'apparat
  // critique tient sa PROPRE série. Le calcul lui-même est pur et testé
  // (`numerosAffiches`) ; tout ce qui suit ne fait que lui apporter la division
  // de chaque note.
  //
  // ⚠️ La division ne se lit PAS dans `texte_notes.book`, qui la porte pourtant.
  // Mesuré le 5 septembre 2026 : sur les 1 830 notes d'`A0044O0003TFR-V11`,
  // `book` et le `ref_niv1` du segment ancré diffèrent SANS EXCEPTION ; sur la
  // Cité de Dieu française, sur 1 595 des 1 804. `book` est une métadonnée
  // d'import ; la division est une propriété du texte SERVI. C'est l'ancre qui
  // fait foi.
  //
  // ⛔ La requête est GARDÉE, et ne part qu'après les autres : elle pagine par
  // mille, et un texte de dix mille segments sans une seule note paierait onze
  // allers-retours pour rien. Les quarante-sept textes qui portent des notes
  // vont de un à huit lots.
  if (notesRows.length > 0) {
    type DivisionRow = { segment_key: string | null; ref_niv1: string | null; espace_textuel: string | null }
    // Sans division, les notes se numérotent en une seule série : une dégradation
    // que seul l'administrateur a besoin de voir.
    const divisionsRows = await tolerer(
      degradations,
      { quoi: 'la numérotation des notes par division', publique: false },
      // Par vagues parallèles : sept pages SÉQUENTIELLES sur les Homélies sur la Genèse
      // (6 931 segments), une par aller-retour, avant que la page puisse numéroter.
      () => chargerPagesEnParallele<DivisionRow>((debut, fin) =>
        supabase.from('segments').select('segment_key,ref_niv1,espace_textuel')
          .eq('id_texte', idTexte).order('segment_numero').range(debut, fin)),
      () => [] as DivisionRow[],
    )
    // ⛔ UNE SEULE RÈGLE DE NUMÉROTATION. Le contexte que construisent aussi les renvois de
    // note à note (`renvoisNotesChargement.ts`) numérote ici la page : la division d'une
    // note est celle de sa PREMIÈRE ancre (`divisionsDesNotes`), et un renvoi qui dit
    // « Voir note 12 » ne peut pas nommer un autre numéro que l'appel du texte.
    const contexte = construireContexteNumerotation(idTexte, {
      notes: notesRows,
      ancres: anchorsRows,
      segments: divisionsRows,
      apparat: cle => estNoteApparatCritique(parNote.get(cle) ?? { blocks: [] }),
    })
    for (const [cle, note] of parNote) note.displayNumber = contexte.notes.get(cle)?.numeroAffiche ?? null

    // ── LES RENVOIS DE NOTE À NOTE ─────────────────────────────────────────────
    // ⛔ La relation ne porte que l'identité de la note visée ; sa tête — numéro affiché,
    // titre de niveau 1 — se résout ici, sur le texte tel qu'il est servi. Le contexte du
    // texte lu est déjà construit ; celui d'un autre texte visé se lit une fois.
    // ⚠️ Couche secondaire : sans elle, la note se lit avec sa forme imprimée.
    const lignesRenvois = await tolerer(
      degradations,
      { quoi: 'les renvois entre notes', publique: false },
      () => chargerRenvoisDuTexte(supabase, idTexte),
      () => [] as LigneRenvoi[],
    )
    if (lignesRenvois.length > 0) {
      const { renvois, orphelins } = attacherRenvois(parNote, lignesRenvois)
      if (orphelins.length > 0) {
        noterDegradation(degradations, {
          quoi: 'quelques renvois entre notes',
          detail: `${idTexte} : ${orphelins.length} renvoi(s) sans bloc source chargé : ${apercu(orphelins)}`,
          publique: false,
        })
      }
      const contextes: ContextesDeNumerotation = new Map([[idTexte, Promise.resolve(contexte)]])
      await resoudreTetesDesRenvois(supabase, renvois, contextes, degradations)
    }
  }

  return { notesParSegment, ancresParSegment }
}

// ── LES NOTES DE QUELQUES SEGMENTS : le volet patristique ─────────────────────
//
// ⛔ Le volet de droite de la page Bible ne lisait que `segments.notes`, le champ
// hérité : 6 751 extraits dont les notes ne vivent QUE dans les tables structurées
// s'y montraient sans aucun appel, et 1 685 ancres positionnelles n'étaient jamais
// projetées (relevé du 2026-09-11). Il lit désormais les mêmes notes que la page de
// l'œuvre, par les mêmes tables et le même assemblage.
//
// ⚠️ Ce qu'il NE fait PAS, et c'est une limite connue : le numéro affiché
// (`displayNumber`), qui repart à 1 par division, demande toutes les notes du texte et
// toutes ses divisions — dix mille lignes pour montrer vingt extraits. L'appel du volet
// garde donc le numéro interne (`noteNumber`), c'est-à-dire exactement le chiffre que
// porte le marqueur, comme il le faisait déjà pour les notes héritées.

/** Ce que le volet retient d'un segment : ses notes par marqueur, et les ancres qui
 *  posent leurs appels dans son texte. */
export type NotesDuSegment = {
  notes: Record<string, NoteStructuree>
  ancres: AncreNoteStructureeProjection[]
}

/** La clé d'un segment dans ce qui a été chargé. ⛔ `segment_key` n'est unique que DANS
 *  un texte : deux textes d'une même œuvre peuvent porter la même. */
export function cleNotesDuSegment(idTexte: string, segmentKey: string): string {
  return `${idTexte}|${segmentKey}`
}

/**
 * Charge les notes structurées de QUELQUES segments, pris dans des textes différents.
 *
 * ⚠️ Chaque segment demandé reçoit une entrée, vide s'il ne porte aucune note : c'est
 * ce qui permet à l'appelant de distinguer « chargé, rien » de « pas encore chargé ».
 * ⛔ Il LÈVE sur une requête en échec ; l'appelant retombe alors sur les notes héritées.
 *
 * Les ancres se lisent d'abord, par texte et par lots de clés de segment ; les notes,
 * leurs blocs et leurs relations ensuite, par lots de clés de note, en parallèle. Toutes
 * les clauses `in` passent par `lotsPourClauseIn` : une clé de segment pèse jusqu'à
 * quatre-vingts signes, et la passerelle refuse une adresse au-delà de 25 000 octets.
 */
export async function chargerNotesDesSegments(
  supabase: ClientLecture,
  segments: readonly { idTexte: string; segmentKey: string }[],
): Promise<Map<string, NotesDuSegment>> {
  const clesParTexte = new Map<string, Set<string>>()
  for (const { idTexte, segmentKey } of segments) {
    if (!idTexte || !segmentKey) continue
    let cles = clesParTexte.get(idTexte)
    if (!cles) { cles = new Set(); clesParTexte.set(idTexte, cles) }
    cles.add(segmentKey)
  }
  const resultat = new Map<string, NotesDuSegment>()
  await Promise.all([...clesParTexte].map(async ([idTexte, cles]) => {
    const segmentKeys = [...cles]
    const ancres = (await Promise.all(lotsPourClauseIn(segmentKeys).map(lot =>
      chargerToutesPagesSupabase<AnchorRow>((debut, fin) => supabase.from('texte_note_ancres')
        .select(COLONNES_ANCRES)
        .eq('id_texte', idTexte).in('segment_key', lot)
        .order('note_key').order('segment_key').order('segment_offset_unicode').range(debut, fin)),
    ))).flat()
    const noteKeys = [...new Set(ancres.map(a => a.note_key))]
    let notes: NoteRow[] = []
    let blocs: BlockRow[] = []
    let relations: RelationRow[] = []
    if (noteKeys.length > 0) {
      const lots = lotsPourClauseIn(noteKeys)
      ;[notes, blocs, relations] = await Promise.all([
        Promise.all(lots.map(lot => chargerToutesPagesSupabase<NoteRow>((debut, fin) => supabase.from('texte_notes')
          .select(COLONNES_NOTES).eq('id_texte', idTexte).in('note_key', lot)
          .order('note_number').order('note_key').range(debut, fin)))).then(l => l.flat()),
        Promise.all(lots.map(lot => chargerToutesPagesSupabase<BlockRowBrute>((debut, fin) => supabase.from('texte_note_blocs')
          .select(COLONNES_BLOCS).eq('id_texte', idTexte).in('note_key', lot)
          .order('note_key').order('rank').range(debut, fin)))).then(l => l.flat().map(versBlockRow)),
        Promise.all(lots.map(lot => chargerToutesPagesSupabase<RelationRow>((debut, fin) => supabase.from('texte_note_relations')
          .select(COLONNES_RELATIONS).eq('id_texte', idTexte).in('note_key', lot)
          .order('note_key').order('source_block_id').order('relation_kind').range(debut, fin)))).then(l => l.flat()),
      ])
    }
    const { parNote, notesParSegment, ancresParSegment, ancresIncompletes } = assemblerNotesStructurees({ notes, ancres, blocs, relations })
    // Les renvois de note à note se posent sur leurs blocs, SANS tête : le volet ne porte ni
    // le contexte de numérotation d'un texte ni celui des textes visés, et la tête se
    // demande à la route au rendu. ⚠️ Un échec ne ferme pas le volet : la note garde sa
    // forme imprimée.
    if (noteKeys.length > 0) {
      try {
        attacherRenvois(parNote, await chargerRenvoisDesNotes(supabase, idTexte, noteKeys))
      } catch (erreur) {
        console.error(`[volet] ${idTexte} : renvois entre notes illisibles : ${messageDErreur(erreur)}`)
      }
    }
    // Le volet n'a pas de bandeau de dégradation : l'ancre laissée de côté part au journal.
    if (ancresIncompletes.length > 0) {
      console.error(`[volet] ${idTexte} : ${ancresIncompletes.length} ancre(s) incomplète(s), laissée(s) de côté : ${apercu(ancresIncompletes)}`)
    }
    for (const segmentKey of segmentKeys) {
      resultat.set(cleNotesDuSegment(idTexte, segmentKey), {
        notes: notesParSegment[segmentKey] ?? {},
        ancres: ancresParSegment[segmentKey] ?? [],
      })
    }
  }))
  return resultat
}

// ── UNE NOTE PAR SON IDENTITÉ : la note visée par un renvoi ────────────────────
//
// ⛔ Chargée par `(id_texte, note_key)`, et par rien d'autre : ni numéro, ni lettre, ni
// page. Ses blocs viennent dans leur ordre ACTUEL, ses propres renvois avec leur tête, si
// bien qu'une note visée qui renvoie à son tour se déplie comme la première.

/** La tête de la note visée et son contenu. `note` vaut `null` quand elle n'existe pas,
 *  ou quand ce lecteur ne peut pas la lire. ⛔ Il LÈVE sur une requête en échec. */
export async function chargerNotePourRenvoi(
  supabase: ClientLecture,
  cible: IdentiteNote,
  contextes: ContextesDeNumerotation,
): Promise<{ tete: TeteRenvoi; note: NoteStructuree | null }> {
  if (!contextes.has(cible.idTexte)) {
    contextes.set(cible.idTexte, chargerContexteNumerotation(supabase, cible.idTexte).catch(erreur => {
      console.error(`[renvois] contexte de numérotation illisible (${cible.idTexte}) : ${messageDErreur(erreur)}`)
      return null
    }))
  }
  const [notesLues, blocs, relations, lignesRenvois, contexte] = await Promise.all([
    chargerToutesPagesSupabase<NoteRow>((debut, fin) => supabase.from('texte_notes')
      .select(COLONNES_NOTES).eq('id_texte', cible.idTexte).eq('note_key', cible.noteKey)
      .order('note_key').range(debut, fin)),
    chargerToutesPagesSupabase<BlockRowBrute>((debut, fin) => supabase.from('texte_note_blocs')
      .select(COLONNES_BLOCS).eq('id_texte', cible.idTexte).eq('note_key', cible.noteKey)
      .order('rank').range(debut, fin)).then(l => l.map(versBlockRow)),
    chargerToutesPagesSupabase<RelationRow>((debut, fin) => supabase.from('texte_note_relations')
      .select(COLONNES_RELATIONS).eq('id_texte', cible.idTexte).eq('note_key', cible.noteKey)
      .order('source_block_id').order('relation_kind').range(debut, fin)),
    chargerRenvoisDesNotes(supabase, cible.idTexte, [cible.noteKey]),
    contextes.get(cible.idTexte)!,
  ])
  const tete = resoudreTete(contexte, cible.noteKey)
  const { parNote } = assemblerNotesStructurees({ notes: notesLues, ancres: [], blocs, relations })
  const note = parNote.get(cible.noteKey) ?? null
  if (note) {
    note.displayNumber = contexte?.notes.get(cible.noteKey)?.numeroAffiche ?? null
    const { renvois } = attacherRenvois(parNote, lignesRenvois)
    if (renvois.length > 0) await resoudreTetesDesRenvois(supabase, renvois, contextes)
  }
  return { tete, note }
}
