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
 * ⛔ UN SEUL MODE (décision de l'auteur, 2026-09-22). `texte_original` a été lu en REPLI
 * tant que des œuvres n'avaient pas d'original propre. Toutes l'ont reçu, et les
 * 1 135 segments qui portaient encore la copie avaient chacun leur vis-à-vis dans les
 * tables. Le repli est retiré : sans alignement, rien ne se met en regard.
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
  /** Rang du segment dans SON texte, d'un bout à l'autre (unique par `id_texte`). Il
   *  sert à retrouver la place d'un passage que l'alignement ne met en face de rien. */
  segment_numero?: number | null
  /** L’espace textuel (`corps`, `introduction`, `apparat_critique`). */
  espace_textuel?: string | null
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

// ── LE TEXTE ORIGINAL QUE L'ALIGNEMENT NE MET EN FACE DE RIEN ─────────────────────
//
// ⛔ Un passage de l'original n'est jamais TU. La lecture en regard part des segments
// TRADUITS et remonte à leurs groupes : un segment de l'original qu'aucun groupe ne met
// en face d'un segment traduit n'y paraissait donc pas, et le lecteur lisait un latin
// troué sans le savoir. Relevé sur la Consolation de Boèce en regard de Ceriziers, qui a
// sauté six vers de Migne (II, m. 4 ; III, m. 6 et 12 ; IV, m. 3).
//
// La règle est générale : un segment de l'original est NON ALIGNÉ quand, dans l'ensemble
// retenu, aucun groupe ne le met en face d'un segment traduit, soit qu'il n'appartienne
// à aucun groupe, soit que son groupe n'ait pas de membre traduit (cardinalité 0:n). Il
// se compose À SA PLACE, à la suite de l'original du groupe qui le PRÉCÈDE dans l'ordre
// du texte original, et en tête du suivant quand rien ne le précède. Il est GRISÉ par une
// encre de rôle, `--cs-original-non-aligne`, jamais par une opacité, et il porte une
// indication lisible par la synthèse vocale.
//
// ⚠️ Seul le CORPS lisible s'y prête : un titre, une signature, une préface d'éditeur ou
// une ligne d'apparat que l'alignement laisse de côté n'ont rien à faire dans la colonne.

/** L'indication que porte un passage grisé, en infobulle et pour la synthèse vocale. */
export const LIBELLE_NON_ALIGNE = 'Passage sans correspondance dans la traduction'

// Deux caractères d'usage privé bornent, dans `texteAffichage`, ce qui est à griser.
// ⚠️ Écrits par leur point de code : un `\u` dans ce fichier se ferait réinterpréter par
// les outils d'édition. Ils ne quittent jamais la page, voir `sansMarqueNonAligne`.
const MARQUE_DEBUT = String.fromCharCode(0xe000)
const MARQUE_FIN = String.fromCharCode(0xe001)

/**
 * Borne un texte à griser. ⛔ LIGNE PAR LIGNE : la colonne recompose un poème vers à vers
 * (`lignesDeVers`), et une borne ouverte sur un vers et fermée trois vers plus bas
 * laisserait chaque ligne avec une moitié de marque.
 */
export function marquerNonAligne(texte: string): string {
  // Les blancs de bord restent HORS des bornes : `lignesDeVers` rogne chaque ligne, et
  // une borne posée devant une espace la protégerait du rognage.
  return texte.split('\n').map(l => {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(l)
    return m && m[2] ? m[1] + MARQUE_DEBUT + m[2] + MARQUE_FIN + m[3] : l
  }).join('\n')
}

/** Le texte découpé en passages alignés et non alignés, dans l'ordre. */
export function partiesNonAlignees(texte: string): { texte: string; nonAligne: boolean }[] {
  const parties: { texte: string; nonAligne: boolean }[] = []
  let courant = ''
  let dedans = false
  const pousser = () => {
    if (courant) parties.push({ texte: courant, nonAligne: dedans })
    courant = ''
  }
  for (const c of texte) {
    if (c === MARQUE_DEBUT) { pousser(); dedans = true }
    else if (c === MARQUE_FIN) { pousser(); dedans = false }
    else courant += c
  }
  pousser()
  return parties
}

/** Retire les bornes : pour tout texte qui QUITTE la page (export, copie). */
export function sansMarqueNonAligne(texte: string): string {
  return texte.split(MARQUE_DEBUT).join('').split(MARQUE_FIN).join('')
}

/** Les natures du corps qu'un lecteur lit : le texte, et ce que l'auteur y a écrit. */
const NATURES_LISIBLES = new Set(['texte', 'dialogue', 'citation', 'lemme', 'apparat_auteur'])

/** Le segment appartient au corps lisible, seul à pouvoir paraître grisé. */
export function estCorpsLisible(s: { espace_textuel?: string | null; nature?: string | null }): boolean {
  const espace = (s.espace_textuel ?? 'corps').trim() || 'corps'
  const nature = (s.nature ?? 'texte').trim() || 'texte'
  return espace === 'corps' && NATURES_LISIBLES.has(nature)
}

/** Un segment du voisinage : ce qu'il faut pour le ranger, sans son texte. */
export type SegmentVoisin = {
  segment_key: string
  segment_numero: number
  nature?: string | null
  espace_textuel?: string | null
}

/** Joint au bloc d'un groupe les segments non alignés qui le suivent ou le précèdent. */
function adjoindreNonAlignes(
  bloc: BlocOriginal,
  segments: readonly SegmentOriginal[],
  position: 'apres' | 'avant',
  notesOriginales: Record<string, Record<string, NoteStructuree>>,
  ancresOriginales: Record<string, AncreNoteStructureeProjection[]>,
): BlocOriginal {
  const enVers = estBlocDeVers(segments)
  const toutVers = bloc.toutVers && enVers
  const texte = joindreSegmentsOriginaux(segments.map(s => ({
    texte: s.segment_texte, joinBefore: s.join_before, estVers: enVers,
  })))
  const affichage = marquerNonAligne(joindreSegmentsOriginaux(segments.map(s => ({
    texte: projeterAppelsNotesStructurees(s.segment_texte, ancresOriginales[s.segment_key]),
    joinBefore: s.join_before,
    estVers: enVers,
  }))))
  const notes: Record<string, NoteStructuree> = { ...bloc.notes }
  for (const s of segments) Object.assign(notes, notesOriginales[s.segment_key] ?? {})
  if (position === 'apres') {
    const liant = toutVers ? '\n' : liantAvantSegment(segments[0].join_before)
    return {
      ...bloc,
      texte: bloc.texte + liant + texte,
      texteAffichage: bloc.texteAffichage + liant + affichage,
      notes,
      toutVers,
    }
  }
  const liant = toutVers ? '\n' : liantAvantSegment(bloc.joinBefore)
  return {
    ...bloc,
    texte: texte + liant + bloc.texte,
    texteAffichage: affichage + liant + bloc.texteAffichage,
    notes,
    toutVers,
    joinBefore: segments[0].join_before,
  }
}

/**
 * Range les segments NON ALIGNÉS du voisinage dans le bloc du groupe qui les précède
 * dans l'ordre du texte original, grisés.
 *
 * - `voisinage` : les segments de l'original autour de ce qui est chargé, sans texte,
 *   dans n'importe quel ordre ; ils sont triés sur `segment_numero`.
 * - `groupeAligneDe` : clé de l'original → groupe qui la met en face d'un segment
 *   traduit. Une clé absente est non alignée.
 * - `nonAlignes` : le texte des segments non alignés, par clé.
 * - `debutDuTexte` : le voisinage part du premier segment du texte. Ce qui précède alors
 *   le premier segment aligné se compose en TÊTE de son groupe ; sinon il appartient au
 *   groupe d'avant, qui n'est pas à l'écran, et il s'y composera.
 *
 * ⚠️ Un passage dont le groupe d'accueil n'est pas chargé est laissé de côté, sans
 * erreur : il paraîtra avec son groupe, sur la page qui le porte.
 */
export function rattacherNonAlignes(params: {
  blocParGroupe: ReadonlyMap<string, BlocOriginal>
  voisinage: readonly SegmentVoisin[]
  groupeAligneDe: ReadonlyMap<string, string>
  nonAlignes: ReadonlyMap<string, SegmentOriginal>
  debutDuTexte: boolean
  notesOriginales?: Record<string, Record<string, NoteStructuree>>
  ancresOriginales?: Record<string, AncreNoteStructureeProjection[]>
}): Map<string, BlocOriginal> {
  const notesOriginales = params.notesOriginales ?? {}
  const ancresOriginales = params.ancresOriginales ?? {}
  const sortie = new Map(params.blocParGroupe)
  const ordonnes = [...params.voisinage].sort((a, b) => a.segment_numero - b.segment_numero)

  let groupeCourant: string | null = null
  let enAttente: SegmentOriginal[] = []
  const deposer = (groupe: string, position: 'apres' | 'avant') => {
    const bloc = sortie.get(groupe)
    if (bloc && enAttente.length > 0) {
      sortie.set(groupe, adjoindreNonAlignes(bloc, enAttente, position, notesOriginales, ancresOriginales))
    }
    enAttente = []
  }

  for (const s of ordonnes) {
    const groupe = params.groupeAligneDe.get(s.segment_key)
    if (groupe) {
      if (enAttente.length > 0) {
        if (groupeCourant) deposer(groupeCourant, 'apres')
        else if (params.debutDuTexte) deposer(groupe, 'avant')
        else enAttente = []
      }
      groupeCourant = groupe
      continue
    }
    if (!estCorpsLisible(s)) continue
    const complet = params.nonAlignes.get(s.segment_key)
    if (complet) enAttente.push(complet)
  }
  if (enAttente.length > 0 && groupeCourant) deposer(groupeCourant, 'apres')
  return sortie
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
  toutVers: boolean
}

/**
 * L'original mis en regard d'un bloc de lecture : celui de l'ALIGNEMENT, et lui seul.
 *
 * Rend `null` quand il n'y a rien à mettre en regard — aucun groupe, ou un empan déjà
 * composé par un bloc précédent : le bloc se compose alors seul, ou garde sa grille,
 * colonne de droite vide (voir `BlocEnRegard.couvert`).
 */
export function originalEnRegard<N>(params: {
  /** Les groupes que CE bloc compose, dans l'ordre de lecture — ceux dont il est le
   *  premier à porter l'empan. Leurs originaux se suivent dans une seule colonne, et
   *  s'y joignent comme le paragraphe d'en face (voir `fondreOriginaux`). */
  groupes: readonly string[]
  blocs: Record<string, BlocOriginal>
}): OriginalEnRegard<N> | null {
  const { groupes, blocs } = params
  const fondu = groupes.length > 0 ? fondreOriginaux(groupes, blocs) : null
  if (!fondu) return null
  return {
    texte: fondu.texte,
    affichage: fondu.texteAffichage,
    notes: fondu.notes as N,
    toutVers: fondu.toutVers,
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
  // ⚠️ `error` est FACULTATIF : les appelants historiques ne le lisent pas, et le
  // déclarer ne les oblige à rien. Il est là pour que ce qui le lit puisse distinguer
  // « l'alignement ne dit rien » d'« la base a refusé », qui ne se répondent pas pareil.
  in: (colonne: string, valeurs: readonly string[]) => PromiseLike<{ data: unknown[] | null; error?: { message: string } | null }>
}

/** Une lecture du voisinage : bornes et tri sur `segment_numero`, puis `await`. */
type RequeteVoisinage = PromiseLike<{ data: unknown[] | null; error?: { message: string } | null }> & {
  select: (colonnes: string) => RequeteVoisinage
  eq: (colonne: string, valeur: string) => RequeteVoisinage
  gte: (colonne: string, valeur: number) => RequeteVoisinage
  lte: (colonne: string, valeur: number) => RequeteVoisinage
  gt: (colonne: string, valeur: number) => RequeteVoisinage
  lt: (colonne: string, valeur: number) => RequeteVoisinage
  order: (colonne: string, options: { ascending: boolean }) => RequeteVoisinage
  limit: (n: number) => RequeteVoisinage
  range: (de: number, a: number) => RequeteVoisinage
}

/** Segments lus AVANT et APRÈS ce qui est chargé, pour trouver les non-alignés du bord. */
const VOISINAGE = 40
/** Taille d'une page PostgREST (`max-rows`) : au-delà, la réponse est tronquée. */
const PAGE_LIGNES = 1000

/**
 * Charge les segments non alignés de l'original autour des groupes chargés, et les range
 * dans leurs blocs (voir `rattacherNonAlignes`).
 *
 * ⚠️ Rien ne se paie d'avance : trois lectures légères (clé, rang, nature) sur l'empan
 * chargé et ses deux bords, puis les membres des clés inconnues. Le TEXTE n'est lu que
 * pour les segments effectivement non alignés, c'est-à-dire presque jamais.
 * ⚠️ Toute erreur rend la projection intacte : un passage grisé qui manque vaut mieux
 * qu'une colonne originale qui tombe.
 */
async function completerNonAlignes(
  client: ClientLecture,
  params: {
    alignmentSetId: string
    idTexteTraduit: string
    idTexteOriginal: string
    notesOriginales?: Record<string, Record<string, NoteStructuree>>
    ancresOriginales?: Record<string, AncreNoteStructureeProjection[]>
  },
  projection: ProjectionBilingue,
  segmentsCharges: readonly SegmentOriginal[],
  membresOriginaux: readonly MembreAlignement[],
): Promise<ProjectionBilingue> {
  // Le voisinage se borne au CORPS chargé : un groupe d’apparat aligné, loin dans le
  // texte, étendrait sinon l’empan à tout le texte.
  const numeros = segmentsCharges
    .filter(s => estCorpsLisible(s))
    .map(s => s.segment_numero)
    .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
  if (numeros.length === 0 || projection.blocParGroupe.size === 0) return projection
  const min = Math.min(...numeros)
  const max = Math.max(...numeros)

  const segments = () => (client.from('segments') as RequeteVoisinage)
    .select('segment_key,segment_numero,nature,espace_textuel')
    .eq('id_texte', params.idTexteOriginal)
  const lire = async (requete: RequeteVoisinage) => {
    const { data, error } = await requete
    if (error) throw new Error(error.message)
    return (data ?? []) as SegmentVoisin[]
  }
  const lireEmpan = async () => {
    const lignes: SegmentVoisin[] = []
    for (let de = 0; ; de += PAGE_LIGNES) {
      const page = await lire(segments().gte('segment_numero', min).lte('segment_numero', max)
        .order('segment_numero', { ascending: true }).range(de, de + PAGE_LIGNES - 1))
      lignes.push(...page)
      if (page.length < PAGE_LIGNES) return lignes
    }
  }
  const [empan, avant, apres] = await Promise.all([
    lireEmpan(),
    lire(segments().lt('segment_numero', min).order('segment_numero', { ascending: false }).limit(VOISINAGE)),
    lire(segments().gt('segment_numero', max).order('segment_numero', { ascending: true }).limit(VOISINAGE)),
  ])
  const voisinage = [...avant, ...empan, ...apres]

  // Les clés chargées appartiennent à des groupes qui ont un membre traduit : c'est par
  // eux que la projection les a trouvées.
  const groupeAligneDe = new Map<string, string>()
  for (const m of membresOriginaux) {
    if (projection.blocParGroupe.has(m.alignment_id) && !groupeAligneDe.has(m.segment_key)) {
      groupeAligneDe.set(m.segment_key, m.alignment_id)
    }
  }
  const inconnues = voisinage.map(s => s.segment_key).filter(cle => !groupeAligneDe.has(cle))
  if (inconnues.length === 0) return projection

  const table = (nom: string) => client.from(nom) as RequeteLecture
  const lireMembres = async (idTexte: string, colonne: 'segment_key' | 'alignment_id', valeurs: readonly string[]) => {
    const pages = await Promise.all(lots(valeurs).map(lot =>
      table('texte_alignement_membres').select('alignment_id,segment_key')
        .eq('alignment_set_id', params.alignmentSetId)
        .eq('id_texte', idTexte)
        .in(colonne, lot)))
    return pages.flatMap(({ data, error }) => {
      if (error) throw new Error(error.message)
      return (data ?? []) as Pick<MembreAlignement, 'alignment_id' | 'segment_key'>[]
    })
  }
  const membresInconnus = await lireMembres(params.idTexteOriginal, 'segment_key', inconnues)
  const groupesInconnus = [...new Set(membresInconnus.map(m => m.alignment_id))]
  const traduits = groupesInconnus.length > 0
    ? new Set((await lireMembres(params.idTexteTraduit, 'alignment_id', groupesInconnus)).map(m => m.alignment_id))
    : new Set<string>()
  for (const m of membresInconnus) {
    if (traduits.has(m.alignment_id) && !groupeAligneDe.has(m.segment_key)) {
      groupeAligneDe.set(m.segment_key, m.alignment_id)
    }
  }

  const aLire = voisinage
    .filter(s => !groupeAligneDe.has(s.segment_key) && estCorpsLisible(s))
    .map(s => s.segment_key)
  if (aLire.length === 0) return projection
  const pagesTexte = await Promise.all(lots(aLire).map(lot =>
    table('segments').select('segment_key,segment_texte,nature,join_before,forme:segment_metadata->>forme,segment_numero')
      .eq('id_texte', params.idTexteOriginal)
      .in('segment_key', lot)))
  const nonAlignes = new Map<string, SegmentOriginal>()
  for (const { data, error } of pagesTexte) {
    if (error) throw new Error(error.message)
    for (const s of (data ?? []) as SegmentOriginal[]) nonAlignes.set(s.segment_key, s)
  }

  return {
    groupeParCle: projection.groupeParCle,
    blocParGroupe: rattacherNonAlignes({
      blocParGroupe: projection.blocParGroupe,
      voisinage,
      groupeAligneDe,
      nonAlignes,
      // Le bord d'avant n'a pas rempli sa mesure : il a touché le début du texte.
      debutDuTexte: avant.length < VOISINAGE,
      notesOriginales: params.notesOriginales,
      ancresOriginales: params.ancresOriginales,
    }),
  }
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
    table('segments').select('segment_key,segment_texte,nature,join_before,forme:segment_metadata->>forme,segment_numero,espace_textuel')
      .eq('id_texte', params.idTexteOriginal)
      .in('segment_key', lot)))
  const segmentsOriginaux = pagesSegments.flatMap(r => (r.data ?? []) as SegmentOriginal[])

  const projection = projeterBilingue({
    membres: [...membresTraduits, ...membresOriginaux],
    idTexteTraduit: params.idTexteTraduit,
    idTexteOriginal: params.idTexteOriginal,
    segmentsOriginaux,
    notesOriginales: params.notesOriginales,
    ancresOriginales: params.ancresOriginales,
  })
  // ⛔ Le texte original que l'alignement ne met en face de rien paraît quand même, grisé.
  try {
    return await completerNonAlignes(client, params, projection, segmentsOriginaux, membresOriginaux)
  } catch {
    return projection
  }
}

/** Ce qu'on sait, dans le texte LU, de l'endroit qui fait face à un segment original. */
export type PlaceEnRegard = {
  id: number
  segmentKey: string
  division: string
  segmentNumero: number
}

type LigneSegmentEnRegard = { id: number; segment_key: string; ref_niv1: string | null; segment_numero: number }

/**
 * LA PLACE, DANS LE TEXTE LU, DE CE QUI FAIT FACE À UN SEGMENT DE L'ORIGINAL.
 *
 * C'est `chargerProjectionBilingue` pris par l'autre bout : on part d'une clé de
 * l'original, on remonte à son groupe d'alignement, on redescend sur la traduction.
 * L'inventaire des notes en a besoin pour qu'une note du latin s'ouvre comme une note
 * du français — la navigation de la page se fait par les divisions du texte LU, et le
 * latin ne les nomme pas de la même façon.
 *
 * ⛔ AUCUN REPLI PAR RANG. Faute d'alignement, on rend `null` : deviner que la
 * quatrième division du latin répond à la quatrième du français tomberait à côté sans
 * le dire, et un lecteur qu'on envoie au mauvais endroit est pire qu'un bouton qui ne
 * fait rien.
 *
 * ⚠️ On ne charge RIEN d'avance : trois requêtes minuscules, au clic, pour une seule
 * clé. Le pont de tout un texte coûterait, sur les Confessions, onze mille membres à
 * l'ouverture d'un volet qu'on n'ouvre parfois que pour chercher un mot.
 *
 * ⚠️ Une erreur de la base LÈVE, quand une absence d'alignement rend `null` : les deux
 * ne se répondent pas de la même façon, et les confondre ferait passer une panne pour
 * un silence de la donnée.
 */
export async function chargerPlaceEnRegard(
  client: ClientLecture,
  params: {
    alignmentSetId: string
    idTexteTraduit: string
    idTexteOriginal: string
    cleOriginale: string
  },
): Promise<PlaceEnRegard | null> {
  const table = (nom: string) => client.from(nom) as RequeteLecture
  const lire = async (requete: PromiseLike<{ data: unknown[] | null; error?: { message: string } | null }>, quoi: string) => {
    const { data, error } = await requete
    if (error) throw new Error(`${quoi} : ${error.message}`)
    return data ?? []
  }
  const membres = (idTexte: string, colonne: 'segment_key' | 'alignment_id', valeurs: readonly string[]) =>
    lire(
      table('texte_alignement_membres').select('alignment_id,member_order,segment_key')
        .eq('alignment_set_id', params.alignmentSetId)
        .eq('id_texte', idTexte)
        .in(colonne, valeurs),
      `membres d’alignement de ${idTexte}`,
    ) as Promise<MembreAlignement[]>

  const cotesOriginaux = await membres(params.idTexteOriginal, 'segment_key', [params.cleOriginale])
  const groupes = [...new Set(cotesOriginaux.map(m => m.alignment_id))]
  if (groupes.length === 0) return null

  const cotesTraduits = await membres(params.idTexteTraduit, 'alignment_id', groupes)
  const cles = [...new Set([...cotesTraduits].sort((a, b) => a.member_order - b.member_order).map(m => m.segment_key))]
  if (cles.length === 0) return null

  const lignes = await lire(
    table('segments').select('id,segment_key,ref_niv1,segment_numero')
      .eq('id_texte', params.idTexteTraduit)
      .in('segment_key', cles),
    `segments de ${params.idTexteTraduit}`,
  ) as LigneSegmentEnRegard[]
  // ⚠️ Le PREMIER de l'empan dans l'ordre de lecture : c'est là que le regard se pose,
  // et c'est le seul rang que `segment_numero` garantisse d'un bout à l'autre du texte.
  const premier = [...lignes].sort((a, b) => a.segment_numero - b.segment_numero)[0]
  if (!premier) return null
  return {
    id: premier.id,
    segmentKey: premier.segment_key,
    division: (premier.ref_niv1 ?? '').trim(),
    segmentNumero: premier.segment_numero,
  }
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
