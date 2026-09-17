/**
 * L'INVENTAIRE DES NOTES D'UNE BIBLE — l'onglet d'administration du volet de droite de la
 * page Bible, sur le modèle de celui d'une œuvre (`app/oeuvre/[id]/notesInventaire.ts`).
 *
 * Demande de l'auteur (2026-09-16) : « en mode admin, je veux pouvoir voir les notes
 * associées à une bible dans le volet de droite, comme pour les œuvres ».
 *
 * ⛔ IL PORTE SUR LE LIVRE QU'ON LIT, non sur la bible entière. La traduction moderne du
 * témoin de 1260 compte plus de neuf mille notes et deux millions de signes : les charger
 * d'un coup coûterait une dizaine de pages de mille lignes, quand le Psautier, le livre le
 * plus annoté, en rend 1 716 en un tiers de seconde. Le volet des livres fait le reste.
 *
 * Il réunit les DEUX appareils d'une édition :
 *  - les notes de VERSET (`v_bible_verse_notes`), rattachées à un créneau canonique ;
 *  - les notes des BLOCS éditoriaux (`v_bible_editorial_body_block_notes`) — introductions,
 *    commentaires, notices —, qui paraissent là où leur bloc paraît.
 *
 * ⛔ UN BLOC NE PARAÎT PAS PARTOUT OÙ IL EST RANGÉ, et l'inventaire le DIT au lieu de le
 * taire, comme celui d'une œuvre dit les ancres orphelines. La règle est celle de la page,
 * rejouée sur les lignes brutes et jamais réécrite : `blocSansAncreVisibleDansChapitre`
 * pour le chargement, `resoudreStyleSemantique` pour le rendu (`BlocEditorialBible`),
 * `estPieceGenerale` et le sommaire pour les pièces liminaires.
 *
 * ⚠️ Une note NON PUBLIQUE n'y paraît pas : la politique de lecture des notes bibliques n'a
 * pas de branche d'administration, et l'inventaire lit sous la session, comme la page. Il
 * montre donc ce que la page peut ouvrir.
 *
 * Module PUR : ni requête, ni rendu.
 */
import { replier } from '@/app/lib/bibleBibliographieOuvrages'
import {
  blocSansAncreVisibleDansChapitre, type BibleEditorialPlacement, type BibleEditorialScopeKind,
} from '@/app/lib/bibleEdition'
import { resoudreStyleSemantique } from '@/app/lib/bibleHierarchieSemantique'
import { estPieceGenerale } from '@/app/lib/bibleSommaireEdition'
import { LONGUEUR_APERCU, sansMarqueOuverte } from '@/app/oeuvre/[id]/notesInventaire'

// ── Ce que la page donne au volet ────────────────────────────────────────────

/** Une bible lue : son code, et le mot qui la désigne dans l'inventaire. */
export type BibleLue = { trad: string; libelle: string }

/**
 * LA LECTURE EN COURS, telle que l'onglet en a besoin. `BibleLayout` la compose.
 *
 * ⚠️ Les ADRESSES sont données par la page : c'est elle qui sait la manière de lire
 * (graphie, lecture en regard), et une adresse recomposée ici la perdrait.
 */
export type ContexteNotesBible = {
  familleId: string
  livre: string
  nomLivre: string
  /** Les bibles lues, dans l'ordre des colonnes : une, ou deux en regard. */
  bibles: readonly BibleLue[]
  chapitre: number
  /** La pièce liminaire affichée à la place du texte, s'il y en a une. */
  pieceCle: string | null
  /** L'appareil est composé. En « texte seul », une note ne s'ouvre qu'en le rétablissant. */
  appareilAffiche: boolean
  adresseDuChapitre: (chapitre: number) => string
  adresseDeLaPiece: (cle: string) => string
}

/** La clé d'un inventaire : ce qui, en changeant, demande un autre relevé. */
export function cleInventaireNotesBible(contexte: Pick<ContexteNotesBible, 'familleId' | 'livre' | 'bibles'>): string {
  return [contexte.familleId, contexte.livre, contexte.bibles.map(b => b.trad).join('+')].join('|')
}

// ── Les lignes lues en base ──────────────────────────────────────────────────

type Applicabilite = {
  applies_to: 'family' | 'member'
  applies_to_member_id: string | null
}

/** Un bloc de note, tel que les vues le rendent. Seul ce que l'inventaire lit est typé. */
export type BlocDeNoteLu = {
  rank: number
  text: string | null
  needs_review: boolean | null
}

export type LigneNoteVerset = Applicabilite & {
  id: string
  note_subtype: string
  canon_id: string
  display_number: number
  material_order: number
  blocks: readonly BlocDeNoteLu[] | null
}

export type LigneBlocEditorial = Applicabilite & {
  id: string
  block_key: string
  scope_kind: BibleEditorialScopeKind
  placement: BibleEditorialPlacement
  heading: string | null
  canon_id_start: string | null
  canon_id_end: string | null
  material_order: number
  semantic_style_code: string
  semantic_level: string | null
  embedded_title_level: string | null
}

export type LigneNoteDeBloc = {
  id: string
  body_block_id: string
  display_number: number
  material_order: number
  blocks: readonly BlocDeNoteLu[] | null
}

/** La pièce liminaire où un bloc se lit, et son rang au sommaire de l'édition. */
export type PieceDuBloc = { cle: string; titre: string; rang: number }

/** Un membre lu : son identifiant, et le mot qui le désigne. */
export type MembreLu = { id: string; libelle: string }

// ── Ce que l'inventaire en fait ──────────────────────────────────────────────

/** Où une note se lit. ⚠️ `absent` : nulle part, et `raison` dit pourquoi. */
export type LieuNoteBible =
  | { genre: 'piece'; cle: string; titre: string; rang: number }
  | { genre: 'chapitre'; chapitre: number; canonId: string | null }
  | { genre: 'absent'; raison: string }

export type NoteBibleRecensee = {
  /** L'identifiant de la note : c'est lui que porte son appel dans la page. */
  cle: string
  origine: 'verset' | 'bloc'
  /** Le numéro que le lecteur voit à l'appel. */
  numero: number
  intitule: string
  /** « 3, 12 » pour une note de verset ; l'intitulé de son bloc pour une note d'apparat. */
  reperes: string | null
  /** Le verset annoté, ou celui qui ancre le bloc ; `null` hors de tout verset. */
  verset: number | null
  /** Le membre qui porte la note, quand elle n'est pas commune à toute l'édition. */
  membre: MembreLu | null
  aRelire: boolean
  apercu: string
  lieu: LieuNoteBible
  /** Le rang de lecture, comparé terme à terme. */
  rang: readonly number[]
}

/** Les sous-types d'une note de verset, en français. ⚠️ Vocabulaire relevé en base le
 *  16 septembre 2026 ; une valeur inconnue se dit « Autre », jamais par son code. */
const INTITULES_NOTE_VERSET: Readonly<Record<string, string>> = {
  textual: 'Critique textuelle',
  philological: 'Philologie',
  translation: 'Traduction',
  exegetical: 'Exégèse',
}

export const INTITULE_NOTE_AUTRE = 'Autre'
export const INTITULE_APPARAT_EDITORIAL = 'Apparat éditorial'

export function intituleNoteVerset(sousType: string): string {
  return INTITULES_NOTE_VERSET[sousType] ?? INTITULE_NOTE_AUTRE
}

/** Pourquoi une note ne paraît nulle part. Des phrases : elles se lisent en infobulle. */
export const RAISONS_ABSENCE = {
  nonCompose: 'Son bloc n’est composé nulle part : le registre des styles ne le rend pas.',
  sansAncre: 'Son bloc n’a pas d’ancrage canonique : aucune page ne le charge.',
  finDeLivre: 'Son bloc ferme le livre : la page ne charge pas cette matière.',
  pieceIntrouvable: 'Sa pièce liminaire n’est pas au sommaire de l’édition.',
} as const

/** Le chapitre et le verset d'un créneau canonique (`GEN.3.12`). */
export function pointDuCanon(canonId: string | null): { chapitre: number; verset: number } | null {
  if (!canonId) return null
  const [, chapitre, verset] = canonId.split('.')
  const ch = Number.parseInt(chapitre ?? '', 10)
  if (!Number.isFinite(ch)) return null
  const v = Number.parseInt(verset ?? '', 10)
  return { chapitre: ch, verset: Number.isFinite(v) ? v : 0 }
}

/**
 * LE LIEU OÙ UN BLOC SE LIT, et sa place autour de son verset.
 *
 * ⚠️ `cote` range un bloc avant (0) ou après (2) les notes du verset qui l'ancre, qui
 * prennent le rang 1 ; `verset` vaut -1 pour la matière d'ouverture d'un livre.
 */
export function lieuDuBloc(
  bloc: LigneBlocEditorial,
  pieces: ReadonlyMap<string, PieceDuBloc>,
): { lieu: LieuNoteBible; verset: number; cote: number } {
  const absent = (raison: string) => ({ lieu: { genre: 'absent', raison } as LieuNoteBible, verset: 0, cote: 0 })
  // ⛔ Le rendu ne compose pas ce que le registre refuse, ni ce qui redit la navigation.
  const resolu = resoudreStyleSemantique(bloc.semantic_style_code, {
    niveau: bloc.semantic_level, titre: bloc.embedded_title_level,
  })
  if (!resolu || !resolu.bodyBlock || resolu.redondantAvecNavigation) return absent(RAISONS_ABSENCE.nonCompose)

  if (estPieceGenerale(bloc.scope_kind)) {
    const piece = pieces.get(bloc.id)
    return piece
      ? { lieu: { genre: 'piece', ...piece }, verset: 0, cote: 0 }
      : absent(RAISONS_ABSENCE.pieceIntrouvable)
  }

  if (bloc.canon_id_start !== null) {
    // Un bloc « après » se pose à la fin de son empan, les autres à son début.
    const ancre = bloc.placement === 'after' ? (bloc.canon_id_end ?? bloc.canon_id_start) : bloc.canon_id_start
    const point = pointDuCanon(ancre)
    if (!point) return absent(RAISONS_ABSENCE.sansAncre)
    return {
      lieu: { genre: 'chapitre', chapitre: point.chapitre, canonId: ancre },
      verset: point.verset,
      cote: bloc.placement === 'after' ? 2 : 0,
    }
  }

  // ⛔ Sans ancre, la page ne charge que l'ouverture d'un livre, et seulement au premier
  // chapitre ; la fin d'un livre, elle ne la demande jamais.
  if (blocSansAncreVisibleDansChapitre(bloc.scope_kind, bloc.placement, true, false)) {
    return { lieu: { genre: 'chapitre', chapitre: 1, canonId: null }, verset: -1, cote: 0 }
  }
  if (blocSansAncreVisibleDansChapitre(bloc.scope_kind, bloc.placement, false, true)) {
    return absent(RAISONS_ABSENCE.finDeLivre)
  }
  return absent(RAISONS_ABSENCE.sansAncre)
}

/** Ce qu'un aperçu montre au plus, la règle de l'inventaire d'une œuvre. */
export function apercuNoteBible(blocs: readonly BlocDeNoteLu[] | null, longueur = LONGUEUR_APERCU): string {
  // ⚠️ On ne resserre que les blancs ORDINAIRES : les insécables que la donnée porte
  // sont la typographie de la note, et `rendreTexteEnrichi` les garde au rendu.
  const texte = [...(blocs ?? [])]
    .sort((a, b) => a.rank - b.rank)
    .map(bloc => (bloc.text ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/[ \t\r\n]+/g, ' ')
    .trim()
  if (texte.length <= longueur) return texte
  const coupe = texte.slice(0, longueur)
  const espace = coupe.lastIndexOf(' ')
  const auMot = (espace > longueur * 0.6 ? coupe.slice(0, espace) : coupe).trimEnd()
  return (sansMarqueOuverte(auMot) || auMot) + '…'
}

/** Un intitulé de bloc ramené à une ligne d'inventaire. */
export function repereDuBloc(heading: string | null, longueur = 60): string | null {
  const propre = (heading ?? '').replace(/[ \t\r\n]+/g, ' ').trim()
  if (!propre) return null
  if (propre.length <= longueur) return propre
  const coupe = propre.slice(0, longueur)
  const espace = coupe.lastIndexOf(' ')
  return (espace > longueur * 0.6 ? coupe.slice(0, espace) : coupe).trimEnd() + '…'
}

const RANG_LIEU = { piece: 0, chapitre: 1, absent: 2 } as const

function comparerRangs(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const d = (a[i] ?? 0) - (b[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

/**
 * LE RECENSEMENT, dans l'ordre où le livre se lit : les pièces liminaires, puis les
 * chapitres, puis ce qui ne paraît nulle part.
 *
 * ⛔ Une note propre à une AUTRE bible de la famille n'est pas recensée : la page ne la
 * montre pas à côté de celle qu'on lit. Une note commune à l'édition l'est toujours.
 */
export function recenserNotesBible({ notesVersets, blocs, notesDeBlocs, pieces, membres }: {
  notesVersets: readonly LigneNoteVerset[]
  blocs: readonly LigneBlocEditorial[]
  notesDeBlocs: readonly LigneNoteDeBloc[]
  pieces: ReadonlyMap<string, PieceDuBloc>
  membres: readonly MembreLu[]
}): NoteBibleRecensee[] {
  const membreParId = new Map(membres.map(m => [m.id, m]))
  const lue = (ligne: Applicabilite) => ligne.applies_to === 'family'
    || (ligne.applies_to_member_id !== null && membreParId.has(ligne.applies_to_member_id))
  const membreDe = (ligne: Applicabilite) => (ligne.applies_to === 'member' && ligne.applies_to_member_id
    ? membreParId.get(ligne.applies_to_member_id) ?? null
    : null)
  const aRelire = (blocsNote: readonly BlocDeNoteLu[] | null) => (blocsNote ?? []).some(b => b.needs_review === true)

  const recensees: NoteBibleRecensee[] = []

  for (const note of notesVersets) {
    if (!lue(note)) continue
    const point = pointDuCanon(note.canon_id)
    const lieu: LieuNoteBible = point
      ? { genre: 'chapitre', chapitre: point.chapitre, canonId: note.canon_id }
      : { genre: 'absent', raison: RAISONS_ABSENCE.sansAncre }
    recensees.push({
      cle: note.id,
      origine: 'verset',
      numero: note.display_number,
      intitule: intituleNoteVerset(note.note_subtype),
      reperes: point ? `${point.chapitre}, ${point.verset}` : null,
      verset: point?.verset ?? null,
      membre: membreDe(note),
      aRelire: aRelire(note.blocks),
      apercu: apercuNoteBible(note.blocks),
      lieu,
      rang: point
        ? [RANG_LIEU.chapitre, point.chapitre, point.verset, 1, note.display_number, note.material_order]
        : [RANG_LIEU.absent, 0, 0, 1, note.display_number, note.material_order],
    })
  }

  const blocParId = new Map(blocs.filter(lue).map(b => [b.id, b]))
  for (const note of notesDeBlocs) {
    const bloc = blocParId.get(note.body_block_id)
    if (!bloc) continue
    const { lieu, verset, cote } = lieuDuBloc(bloc, pieces)
    const rang = lieu.genre === 'piece'
      ? [RANG_LIEU.piece, lieu.rang, 0, 0, bloc.material_order, note.display_number]
      : lieu.genre === 'chapitre'
        ? [RANG_LIEU.chapitre, lieu.chapitre, verset, cote, bloc.material_order, note.display_number]
        : [RANG_LIEU.absent, 0, 0, 0, bloc.material_order, note.display_number]
    recensees.push({
      cle: note.id,
      origine: 'bloc',
      numero: note.display_number,
      intitule: INTITULE_APPARAT_EDITORIAL,
      reperes: repereDuBloc(bloc.heading),
      verset: lieu.genre === 'chapitre' && verset >= 0 ? verset : null,
      membre: membreDe(bloc),
      aRelire: aRelire(note.blocks),
      apercu: apercuNoteBible(note.blocks),
      lieu,
      rang,
    })
  }

  return recensees.sort((a, b) => comparerRangs(a.rang, b.rang) || a.cle.localeCompare(b.cle))
}

/** Ce que les filtres de l'onglet retiennent. */
export type FiltreNotesBible = {
  texte?: string
  /** `null` = tous les intitulés. */
  intitule?: string | null
  aRelire?: boolean
  /** Seulement les notes qui ne paraissent nulle part. */
  absentes?: boolean
  /** `null` = toutes les bibles lues ; sinon l'identifiant d'un membre. */
  membre?: string | null
}

export function filtrerNotesBible(notes: readonly NoteBibleRecensee[], filtre: FiltreNotesBible): NoteBibleRecensee[] {
  const brut = (filtre.texte ?? '').trim()
  const q = replier(brut)
  // ⚠️ « 3, 12 » cherche le verset annoté, « 3, » tout un chapitre : une RÉFÉRENCE ne se
  // cherche pas dans le texte des notes, où « 2 » se trouverait partout.
  const reference = brut.match(/^(\d+)\s*[,.:]\s*(\d*)$/)
  return notes.filter(note => {
    if (filtre.intitule != null && note.intitule !== filtre.intitule) return false
    if (filtre.aRelire && !note.aRelire) return false
    if (filtre.absentes && note.lieu.genre !== 'absent') return false
    // ⚠️ Une note commune à l'édition se lit dans les deux colonnes : elle répond à
    // chacune des deux bibles.
    if (filtre.membre != null && note.membre !== null && note.membre.id !== filtre.membre) return false
    if (!q) return true
    if (reference) {
      if (note.lieu.genre !== 'chapitre' || note.lieu.chapitre !== Number(reference[1])) return false
      return reference[2] === '' || note.verset === Number(reference[2])
    }
    // Par ce que la note dit, par son numéro, ou par l'intitulé de son bloc.
    return replier(note.apercu).includes(q)
      || String(note.numero) === q
      || (note.origine === 'bloc' && replier(note.reperes ?? '').includes(q))
  })
}

/** Les intitulés présents, avec leur compte. ⚠️ Comptés sur le recensement entier :
 *  une facette dit ce qu'elle ajouterait, non ce qui reste. */
export function comptesParIntituleBible(notes: readonly NoteBibleRecensee[]): { intitule: string; n: number }[] {
  const comptes = new Map<string, number>()
  for (const note of notes) comptes.set(note.intitule, (comptes.get(note.intitule) ?? 0) + 1)
  return [...comptes.entries()]
    .map(([intitule, n]) => ({ intitule, n }))
    .sort((a, b) => b.n - a.n || a.intitule.localeCompare(b.intitule, 'fr'))
}

export type GroupeNotesBible = {
  cle: string
  titre: string
  genre: LieuNoteBible['genre']
  notes: NoteBibleRecensee[]
}

/** Les notes rangées par lieu, dans l'ordre du recensement. */
export function grouperNotesBible(notes: readonly NoteBibleRecensee[]): GroupeNotesBible[] {
  const groupes: GroupeNotesBible[] = []
  for (const note of notes) {
    const { lieu } = note
    const cle = lieu.genre === 'piece' ? `piece|${lieu.cle}`
      : lieu.genre === 'chapitre' ? `chapitre|${lieu.chapitre}`
      : 'absent'
    const titre = lieu.genre === 'piece' ? lieu.titre
      : lieu.genre === 'chapitre' ? `Chapitre ${lieu.chapitre}`
      : 'Ne paraissent pas'
    const dernier = groupes[groupes.length - 1]
    if (dernier && dernier.cle === cle) dernier.notes.push(note)
    else groupes.push({ cle, titre, genre: lieu.genre, notes: [note] })
  }
  return groupes
}

/**
 * LA NOTE SE LIT-ELLE DANS CE QUE LA PAGE MONTRE ? Sinon il faut y aller d'abord.
 *
 * ⚠️ En « texte seul », l'appareil n'est pas composé : aucune note ne s'y ouvre.
 */
export function noteSurPlace(lieu: LieuNoteBible, contexte: Pick<ContexteNotesBible, 'chapitre' | 'pieceCle' | 'appareilAffiche'>): boolean {
  if (lieu.genre === 'absent') return false
  if (lieu.genre === 'piece') return contexte.pieceCle === lieu.cle
  return contexte.pieceCle === null && contexte.appareilAffiche && contexte.chapitre === lieu.chapitre
}
