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
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { chargerToutesPagesSupabase } from '@/app/lib/paginationSupabase'
import { estNoteApparatCritique, lireMetadonneesBlocNote } from '@/app/lib/apparatCritique'
import { natureBlocNoteSur } from '@/app/lib/naturesNote'
import { numerosAffiches } from '@/app/lib/numerotationNotes'
import { noterDegradation, tolerer, type DegradationChargement } from '@/app/lib/chargementTolerant'
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

export async function chargerNotesStructurees(
  supabase: ClientLecture,
  idTexte: string | null,
  degradations: DegradationChargement[],
): Promise<NotesStructureesChargees> {
  if (!idTexte) return { notesParSegment: {}, ancresParSegment: {} }
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
    // Le jsonb entier est lu ici, mais N'EST PAS transmis au client : seuls les
    // cinq scalaires de `lireMetadonneesBlocNote` passent dans les props, et le
    // reste (pdf_page, apparatus_editor…) reste au serveur. Sur les 7 266 blocs de
    // l'apparat de Knöll, la différence de charge n'est pas théorique.
    metadata: Record<string, unknown> | null
  }
  type RelationRow = {
    note_key: string
    relation_kind: string
    source_block_id: string
    target_block_id: string | null
  }
  let rows: [NoteRow[], AnchorRow[], BlockRow[], RelationRow[]]
  try {
    rows = await Promise.all([
      chargerToutesPagesSupabase<NoteRow>((debut, fin) => supabase.from('texte_notes')
        .select('note_key,note_number').eq('id_texte', idTexte)
        // Le numéro recommence à 1 dans chaque division. Il ne suffit donc plus
        // à stabiliser une pagination : sans ce départage, une note peut tomber
        // dans deux pages successives et une autre disparaître entre les deux.
        .order('note_number').order('note_key').range(debut, fin)),
      chargerToutesPagesSupabase<AnchorRow>((debut, fin) => supabase.from('texte_note_ancres')
        .select('note_key,marker,segment_key,source_target,segment_offset_unicode')
        .eq('id_texte', idTexte).order('note_key').order('segment_key')
        .order('segment_offset_unicode').range(debut, fin)),
      chargerToutesPagesSupabase<BlockRow>((debut, fin) => supabase.from('texte_note_blocs')
        .select('note_key,block_id,rank,kind,form,language,text,rendering,needs_review,metadata')
        .eq('id_texte', idTexte).order('note_key').order('rank').range(debut, fin)),
      chargerToutesPagesSupabase<RelationRow>((debut, fin) => supabase.from('texte_note_relations')
        .select('note_key,relation_kind,source_block_id,target_block_id')
        .eq('id_texte', idTexte).order('note_key').order('source_block_id')
        .order('relation_kind').range(debut, fin)),
    ])
  } catch (error) {
    console.error(`Chargement des notes structurées impossible (${idTexte}) :`, error)
    throw new Error(`Impossible de charger les notes structurées de ${idTexte}.`, { cause: error })
  }
  const [notesRows, anchorsRows, blocksRows, relationsRows] = rows
  const relations = new Map<string, Record<string, string | null>>()
  const numeros = new Map(notesRows.map(note => [note.note_key, note.note_number]))
  for (const relation of relationsRows) {
    const key = `${relation.note_key}:${relation.source_block_id}`
    relations.set(key, { ...(relations.get(key) ?? {}), [relation.relation_kind]: relation.target_block_id })
  }
  const parNote = new Map<string, NoteStructuree>()
  for (const block of blocksRows) {
    const noteNumber = numeros.get(block.note_key)
    if (typeof noteNumber !== 'number') continue
    if (!parNote.has(block.note_key)) parNote.set(block.note_key, { noteKey: block.note_key, noteNumber, blocks: [] })
    const relation = relations.get(`${block.note_key}:${block.block_id}`) ?? {}
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
  for (const anchor of anchorsRows) {
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
    type DivisionRow = { segment_key: string | null; ref_niv1: string | null }
    // Sans division, les notes se numérotent en une seule série : une dégradation
    // que seul l'administrateur a besoin de voir.
    const divisionsRows = await tolerer(
      degradations,
      { quoi: 'la numérotation des notes par division', publique: false },
      () => chargerToutesPagesSupabase<DivisionRow>((debut, fin) =>
        supabase.from('segments').select('segment_key,ref_niv1')
          .eq('id_texte', idTexte).order('segment_numero').range(debut, fin)),
      () => [] as DivisionRow[],
    )
    const divisionParSegment = new Map<string, string>()
    for (const ligne of divisionsRows) {
      // Une division absente vaut la chaîne vide, exactement comme dans
      // `numerotationLocale` : les liminaires forment une série, ils n'en sont
      // pas privés.
      if (ligne.segment_key) divisionParSegment.set(ligne.segment_key, ligne.ref_niv1 ?? '')
    }
    // La division d'une note est celle de sa PREMIÈRE ancre : une note rappelée
    // d'une division à l'autre appartient à celle où le lecteur la rencontre
    // d'abord, et garde ce numéro à ses deux appels.
    const divisionParNote = new Map<string, string>()
    for (const anchor of anchorsRows) {
      if (divisionParNote.has(anchor.note_key) || !anchor.segment_key) continue
      divisionParNote.set(anchor.note_key, divisionParSegment.get(anchor.segment_key) ?? '')
    }
    const affiches = numerosAffiches(notesRows.map(ligne => ({
      noteKey: ligne.note_key,
      division: divisionParNote.get(ligne.note_key) ?? '',
      apparat: estNoteApparatCritique(parNote.get(ligne.note_key) ?? { blocks: [] }),
    })))
    for (const [cle, note] of parNote) note.displayNumber = affiches.get(cle) ?? null
  }

  return { notesParSegment, ancresParSegment }
}
