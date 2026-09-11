/**
 * CE QU'ON LIT D'UN EXTRAIT DU VOLET PATRISTIQUE, et les notes que ses appels ouvrent.
 *
 * Un extrait du volet de droite de la page Bible est un GROUPE de segments d'un même
 * texte (`regrouperCitations`) : un seul segment le plus souvent, parfois plusieurs qui se
 * suivent, ou que sépare une courte élision. Ce module en compose le texte lu et la banque
 * de notes, et il est PUR : ni React, ni requête, rien qu'on ne puisse éprouver seul.
 *
 * ⛔ LA RÈGLE DES NOTES EST CELLE DE LA PAGE D'ŒUVRE (`pipelineSegments`) : un segment qui
 * porte des notes STRUCTURÉES les emploie ; sinon, ses notes héritées (`segments.notes`).
 * Le volet ne lisait que les secondes, si bien que 6 751 extraits dont les notes ne vivent
 * que dans les tables structurées s'y montraient sans un seul appel (relevé du
 * 2026-09-11).
 *
 * ⛔ LES APPELS POSITIONNELS SE PROJETTENT, segment par segment : les 1 685 ancres qui ne
 * portent pas leur marqueur dans le texte n'y paraissaient jamais. La projection compte
 * ses offsets en points de code dans le texte de SON segment ; elle se fait donc AVANT la
 * jonction du groupe, jamais sur le texte joint.
 *
 * ⛔ ET UN EMPAN FRANÇAIS SE COMPOSE MORCEAU PAR MORCEAU. Un lien posé sur un latin se lit
 * dans sa contrepartie française, et quand le groupe d'alignement est aux effectifs
 * inégaux, cette contrepartie réunit TOUS les paragraphes français du groupe
 * (`chargerContrepartiesFrancaises`) — La Cité de Dieu en compte 802 sur 1 039. Le texte
 * réuni ne portait plus que la clé du premier : ses notes seules se trouvaient, et les
 * appels des suivants s'ouvraient sur « Note indisponible » (relevé du 2026-09-11 sur
 * 1 Co 1, six appels du livre XVI). Chaque morceau garde donc sa clé, ses notes et ses
 * ancres.
 */
import { capitaliserInitiale } from '@/app/lib/citation'
import { parseNotes } from '@/app/lib/notes'
import { texteDuGroupe } from '@/app/lib/regrouperCitations'
import { projeterAppelsNotesStructureesEnSignalant } from '@/app/lib/appelsNotesStructurees'
import { cleNotesDuSegment, type NotesDuSegment } from '@/app/lib/notesStructureesChargement'
import type { NoteAffichee } from '@/app/oeuvre/[id]/oeuvreTypes'

/** Un segment tel qu'il porte ses notes : sa clé, son texte, ses notes héritées. */
type Morceau = {
  id_texte: string
  segment_key?: string | null
  segment_texte: string
  notes?: string | null
}

/** Ce que le module lit d'un segment du volet : la forme de sa ligne dans `segments`. */
export type SegmentDuVolet = Morceau & {
  id_oeuvre: string
  segment_numero: number
  /** Les segments français d'un EMPAN, quand la contrepartie d'un segment latin en réunit
   *  plusieurs : son texte est alors leur jonction, et chacun porte ses notes. */
  parties?: readonly Morceau[] | null
}

export type ExtraitCompose = {
  /** Le texte lu : l'initiale capitalisée, les appels structurés projetés, les segments
   *  joints (et l'élision marquée d'un « […] »). */
  texte: string
  /** Les notes que ses appels ouvrent, par marqueur. */
  notes: Record<string, NoteAffichee>
  /** Au moins un segment attend encore ses notes structurées. */
  enAttente: boolean
}

/** Les morceaux qui portent des notes : les parties d'un empan, sinon le segment. */
const morceauxDe = (seg: SegmentDuVolet): readonly Morceau[] =>
  seg.parties && seg.parties.length > 0 ? seg.parties : [seg]

/**
 * Compose un extrait à partir de ses segments et des notes déjà chargées.
 *
 * `charges` : pour chaque segment (`cleNotesDuSegment`), ses notes structurées ;
 * `undefined` s'il n'a pas encore été demandé, `null` si la lecture a échoué — il retombe
 * alors sur ses notes héritées, comme un segment qui n'a pas de clé.
 */
export function composerExtrait(
  groupe: readonly { seg: SegmentDuVolet }[],
  charges: ReadonlyMap<string, NotesDuSegment | null>,
): ExtraitCompose {
  let enAttente = false
  const notes: Record<string, NoteAffichee> = {}
  const textes = groupe.map(({ seg }, rang) => morceauxDe(seg).map((morceau, i) => {
    const cle = morceau.segment_key ? cleNotesDuSegment(morceau.id_texte, morceau.segment_key) : null
    const charge = cle === null ? null : charges.get(cle)
    if (cle !== null && charge === undefined) enAttente = true
    const structurees = charge && Object.keys(charge.notes).length > 0 ? charge.notes : null
    const propres: Record<string, NoteAffichee> = structurees ?? parseNotes(morceau.notes)
    // ⚠️ Un marqueur déjà servi par un morceau précédent garde sa note : dans un même
    // texte, deux segments voisins ne portent pas deux notes sous le même numéro.
    for (const [marqueur, contenu] of Object.entries(propres)) {
      if (!(marqueur in notes)) notes[marqueur] = contenu
    }
    // ⚠️ L'INITIALE SE CAPITALISE AVANT LA PROJECTION (demande de l'auteur, 2026-09-04 :
    // un extrait commence souvent au milieu d'une phrase de l'édition). `capitaliserInitiale`
    // ne change jamais la longueur du texte, et les offsets des ancres restent justes.
    const brut = rang === 0 && i === 0 ? capitaliserInitiale(morceau.segment_texte) : morceau.segment_texte
    return charge && charge.ancres.length > 0 ? projeterAppelsNotesStructureesEnSignalant(brut, charge.ancres) : brut
  // ⚠️ Les morceaux d'un empan se joignent comme `chargerContrepartiesFrancaises` les joint.
  }).join(' '))
  const texte = texteDuGroupe(
    groupe.map(({ seg }, rang) => ({ seg, texte: textes[rang] })),
    ({ seg, texte: t }) => ({ idOeuvre: seg.id_oeuvre, idTexte: seg.id_texte, numero: seg.segment_numero, texte: t }),
  )
  return { texte, notes, enAttente }
}

/** Les clés des segments d'une page d'extraits, parties d'empan comprises, sans doublon :
 *  celles dont on charge les notes. Un segment sans clé n'a pas de notes structurées. */
export function clesDesExtraits(groupes: readonly (readonly { seg: SegmentDuVolet }[])[]): string[] {
  const cles = new Set<string>()
  for (const groupe of groupes) {
    for (const { seg } of groupe) {
      for (const morceau of morceauxDe(seg)) {
        if (morceau.id_texte && morceau.segment_key) cles.add(cleNotesDuSegment(morceau.id_texte, morceau.segment_key))
      }
    }
  }
  return [...cles]
}

/** L'inverse de `cleNotesDuSegment`. ⚠️ On coupe au PREMIER trait vertical : un
 *  identifiant de texte n'en porte jamais, une clé de segment pourrait en porter un. */
export function segmentDeLaCle(cle: string): { idTexte: string; segmentKey: string } {
  const i = cle.indexOf('|')
  return { idTexte: cle.slice(0, i), segmentKey: cle.slice(i + 1) }
}
