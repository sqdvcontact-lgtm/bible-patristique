/**
 * LES RENVOIS DE NOTE À NOTE — ce qui se décide sans rien lire ni rien rendre.
 *
 * Un renvoi est une RELATION (`texte_note_renvois`) : un bloc source, un rang, une note
 * visée par son identité stable `(id_texte, note_key)`, et la forme imprimée qu'il
 * remplace (`source_citation`). ⛔ La relation ne porte ni le numéro affiché, ni le titre
 * de niveau 1, ni le contenu de la note visée : les trois se résolvent AU RENDU
 * (`renvoisNotesChargement.ts` pour la tête, le chargement de la note pour le contenu),
 * si bien qu'une renumérotation, un titre corrigé ou une note reprise se voient d'eux-mêmes.
 *
 * Forme publique (charte § 8.1) :
 *   « Voir note {numéro affiché} de {titre de niveau 1} : » puis « Afficher la note visée ».
 *
 * ⛔ Module PUR : ni React, ni Supabase. Le composant (`app/oeuvre/[id]/RenvoiNote.tsx`),
 * l'extraction en document Word et l'aperçu de l'inventaire le partagent.
 */

import { deTitre } from '@/app/lib/intituleNiveau1'

/** `note_preview` : la citation est une INJONCTION (« voir la note B de la Seconde
 *  catéchèse, 4 ») ; le renvoi la remplace sur place. `inline_mention` : la citation est
 *  un complément de phrase (« dans la note JJ de la Catéchèse VI que… ») ; la phrase
 *  garde une mention dynamique et le renvoi se pose sous le bloc. */
export type ModeRenvoi = 'note_preview' | 'inline_mention'

export function lireModeRenvoi(valeur: unknown): ModeRenvoi {
  return valeur === 'inline_mention' ? 'inline_mention' : 'note_preview'
}

/** L'identité stable d'une note. ⛔ Jamais un numéro, une lettre, une page ni un tome. */
export type IdentiteNote = { idTexte: string; noteKey: string }

export function cleIdentiteNote(note: IdentiteNote): string {
  return `${note.idTexte}|${note.noteKey}`
}

/** L'identité d'un RENVOI : la clé primaire de sa relation, jamais sa cible — deux renvois
 *  d'une même note peuvent viser la même note, et chacun s'ouvre pour son compte. */
export function cleDuRenvoi(renvoi: Pick<RenvoiNoteData, 'source' | 'blocId' | 'rang'>): string {
  return `${cleIdentiteNote(renvoi.source)}|${renvoi.blocId}|${renvoi.rang}`
}

/**
 * La TÊTE d'un renvoi, résolue au rendu.
 *
 * ⚠️ `ambigu` n'est pas un titre au hasard : une note visée dont les ancres mènent à des
 * divisions de niveau 1 DIFFÉRENTES ne se rattache à aucune, et on le dit plutôt que de
 * prendre la première. `sans_titre` : la division n'a pas de titre déterminable.
 * `introuvable` : la note visée n'existe plus, ou n'est pas lisible par ce lecteur.
 * `erreur` : le contexte de numérotation n'a pas pu se charger.
 */
export type TeteRenvoi =
  | { etat: 'resolu'; numero: number; titre: string }
  | { etat: 'ambigu'; numero: number; titres: string[] }
  | { etat: 'sans_titre'; numero: number }
  | { etat: 'introuvable' }
  | { etat: 'erreur' }

export type RenvoiNoteData = {
  /** `source_block_id` : le bloc qui porte la citation. ⚠️ Le rang n'est unique que DANS
   *  son bloc : deux blocs d'une même note ont chacun leur renvoi de rang 1. */
  blocId: string
  /** `relation_rank` : l'ordre de lecture dans le bloc source. */
  rang: number
  /** `source_citation` : la sous-chaîne exacte du bloc que le renvoi remplace. */
  citation: string
  mode: ModeRenvoi
  source: IdentiteNote
  cible: IdentiteNote
  /** Absente : la tête se résout au rendu (le volet patristique la demande à la route). */
  tete?: TeteRenvoi
}

/** Au-delà, une note ouverte dans une note ouverte ne s'ouvre plus. ⛔ Ce n'est PAS la
 *  garde contre les boucles, qui est le chemin des notes déjà ouvertes : c'est une
 *  sécurité de plus, contre une chaîne très longue et sans retour. */
export const PROFONDEUR_MAX_RENVOIS = 4

export const LIBELLE_AFFICHER_NOTE_VISEE = 'Afficher la note visée'
export const LIBELLE_MASQUER_NOTE_VISEE = 'Masquer la note visée'

const INSECABLE = String.fromCharCode(0xa0)

// ── OÙ SE TIENNENT LES CITATIONS ──────────────────────────────────────────────

/** Une citation imprimée et les renvois qui la remplacent : « les notes V et X de la
 *  Seizième catéchèse » en porte DEUX, de rangs consécutifs. */
export type GroupeDeRenvois = {
  debut: number
  fin: number
  citation: string
  mode: ModeRenvoi
  renvois: RenvoiNoteData[]
}

/**
 * Les citations d'un bloc, dans l'ordre de lecture.
 *
 * ⛔ Aucune reconnaissance : chaque citation est cherchée TELLE QUELLE, à partir de la fin
 * de la précédente. Deux renvois consécutifs de même citation partagent son occurrence.
 * Une citation absente rend `null` : le contrat de la relation est rompu (le texte du bloc
 * a changé depuis), et l'appelant retombe sur le texte source, renvois posés sous le bloc.
 */
export function positionsDesRenvois(texte: string, renvois: readonly RenvoiNoteData[]): GroupeDeRenvois[] | null {
  const ordonnes = [...renvois].sort((a, b) => a.rang - b.rang)
  const groupes: GroupeDeRenvois[] = []
  let curseur = 0
  for (const renvoi of ordonnes) {
    if (!renvoi.citation) return null
    const dernier = groupes.at(-1)
    if (dernier && dernier.citation === renvoi.citation) {
      dernier.renvois.push(renvoi)
      continue
    }
    const debut = texte.indexOf(renvoi.citation, curseur)
    if (debut < 0) return null
    groupes.push({ debut, fin: debut + renvoi.citation.length, citation: renvoi.citation, mode: renvoi.mode, renvois: [renvoi] })
    curseur = debut + renvoi.citation.length
  }
  return groupes
}

// ── CE QUE LE RENVOI DIT ──────────────────────────────────────────────────────

export type Verbe = 'Voir' | 'voir'

/** La casse du verbe. En TÊTE de bloc, une capitale : la tête ouvre un paragraphe, quoi
 *  que la transcription ait gardé (« voir Catéchèse XIV, note N. », seul dans son bloc).
 *  Ailleurs, celle que la citation imprimée porte, et sinon celle que la phrase demande —
 *  une capitale après une ponctuation forte. */
export function verbeDuRenvoi(texte: string, debut: number, citation: string): Verbe {
  const avant = texte.slice(0, debut).trimEnd()
  if (avant === '') return 'Voir'
  if (/^Voir(?![\p{L}])/u.test(citation)) return 'Voir'
  if (/^voir(?![\p{L}])/u.test(citation)) return 'voir'
  return /[.!?…]$/u.test(avant) ? 'Voir' : 'voir'
}

function capitale(mot: string, verbe: Verbe): string {
  return verbe === 'Voir' ? mot.charAt(0).toUpperCase() + mot.slice(1) : mot
}

/** Les morceaux de la tête, pour que le composant compose le titre enrichi et que le
 *  texte nu le lise en clair. ⛔ `titre` est le titre BRUT ; à l'appelant de le rendre. */
export type MorceauxTete = {
  avantTitre: string
  titre: string | null
  apresTitre: string
}

/** La tête d'un renvoi : « Voir note 73 de Seconde catéchèse : ». L'insécable colle le
 *  numéro à « note » et le deux-points à ce qui le précède (charte § 3.2). */
export function morceauxDeTete(tete: TeteRenvoi | undefined, verbe: Verbe, deuxPoints = true): MorceauxTete {
  const fin = deuxPoints ? `${INSECABLE}:` : ''
  if (!tete || tete.etat === 'erreur') return { avantTitre: `${verbe} la note visée${fin}`, titre: null, apresTitre: '' }
  switch (tete.etat) {
    case 'resolu':
      return { avantTitre: `${verbe} note${INSECABLE}${tete.numero} ${deTitre(tete.titre)}`, titre: tete.titre, apresTitre: fin }
    case 'ambigu':
      return { avantTitre: `${verbe} note${INSECABLE}${tete.numero} (division ambiguë)${fin}`, titre: null, apresTitre: '' }
    case 'sans_titre':
      return { avantTitre: `${verbe} note${INSECABLE}${tete.numero}${fin}`, titre: null, apresTitre: '' }
    case 'introuvable':
      return { avantTitre: capitale('note visée introuvable', verbe), titre: null, apresTitre: '' }
  }
}

/** La mention qui reste DANS la phrase d'un `inline_mention` : « note 405 de Sixième
 *  catéchèse ». L'article, s'il y en a un, appartient au texte qui la précède. */
export function morceauxDeMention(tete: TeteRenvoi | undefined): MorceauxTete {
  if (!tete || tete.etat === 'erreur' || tete.etat === 'introuvable') return { avantTitre: 'note visée', titre: null, apresTitre: '' }
  if (tete.etat === 'resolu') return { avantTitre: `note${INSECABLE}${tete.numero} ${deTitre(tete.titre)}`, titre: tete.titre, apresTitre: '' }
  return { avantTitre: `note${INSECABLE}${tete.numero}`, titre: null, apresTitre: '' }
}

export function morceauxEnTexte(morceaux: MorceauxTete, intituleNu: (titre: string) => string): string {
  return `${morceaux.avantTitre}${morceaux.titre === null ? '' : intituleNu(morceaux.titre)}${morceaux.apresTitre}`
}

// ── LES BOUCLES ───────────────────────────────────────────────────────────────

export type EtatDeploiement = 'libre' | 'cycle' | 'profondeur'

/**
 * Peut-on ouvrir la note visée ici ?
 *
 * ⛔ `chemin` porte les notes DÉJÀ OUVERTES au-dessus de la note source, jamais la note
 * source elle-même, que l'on ajoute ici : A → B → A se reconnaît dès le second renvoi,
 * et A → A ne s'ouvre jamais. La profondeur n'est qu'une sécurité de plus.
 */
export function etatDuDeploiement(chemin: readonly string[], renvoi: Pick<RenvoiNoteData, 'source' | 'cible'>): EtatDeploiement {
  const ouvertes = new Set([...chemin, cleIdentiteNote(renvoi.source)])
  if (ouvertes.has(cleIdentiteNote(renvoi.cible))) return 'cycle'
  if (chemin.length >= PROFONDEUR_MAX_RENVOIS) return 'profondeur'
  return 'libre'
}

// ── LE TEXTE EN CLAIR : l'extraction et les aperçus ──────────────────────────

/**
 * Le texte d'un bloc, ses citations remplacées par la forme dynamique, SANS contrôle :
 * « voir note 73 de Seconde catéchèse ». C'est ce que lit un document extrait, et
 * l'aperçu d'une ligne d'inventaire.
 *
 * ⚠️ Une citation introuvable rend le texte source intact : on ne coupe pas une phrase
 * dont on ne sait plus où passe la citation.
 */
export function texteAvecRenvoisEnClair(
  texte: string,
  renvois: readonly RenvoiNoteData[] | undefined,
  intituleNu: (titre: string) => string,
): string {
  if (!renvois || renvois.length === 0) return texte
  const groupes = positionsDesRenvois(texte, renvois)
  if (!groupes) return texte
  let sortie = ''
  let curseur = 0
  for (const groupe of groupes) {
    sortie += texte.slice(curseur, groupe.debut)
    const verbe = verbeDuRenvoi(texte, groupe.debut, groupe.citation)
    const morceaux = groupe.renvois.map((renvoi, i) => groupe.mode === 'inline_mention'
      ? morceauxEnTexte(morceauxDeMention(renvoi.tete), intituleNu)
      : morceauxEnTexte(morceauxDeTete(renvoi.tete, i === 0 ? verbe : 'voir', false), intituleNu))
    sortie += morceaux.join(groupe.mode === 'inline_mention' ? ' et ' : ' ; ')
    curseur = groupe.fin
  }
  return sortie + texte.slice(curseur)
}
